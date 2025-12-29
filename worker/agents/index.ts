import { getAgentByName } from 'agents';
import { generateId, generateNanoId } from '../utils/idGenerator';
import { StructuredLogger } from '../logger';
import { InferenceContext, ModelConfig } from './inferutils/config.types';
import { SandboxSdkClient } from '../services/sandbox/sandboxSdkClient';
import { selectTemplate } from './planning/templateSelector';
import { TemplateDetails } from '../services/sandbox/sandboxTypes';
import { createScratchTemplateDetails } from './utils/templates';
import { TemplateSelection } from './schemas';
import type { ImageAttachment } from '../types/image-attachment';
import { BaseSandboxService } from 'worker/services/sandbox/BaseSandboxService';
import { AgentState, CurrentDevState } from './core/state';
import { CodeGeneratorAgent } from './core/codingAgent';
import { BehaviorType, ProjectType } from './core/types';
import { ModelConfigService } from '../database/services/ModelConfigService';
import { generateProjectName } from './utils/templateCustomizer';

type AgentStubProps = {
    behaviorType?: BehaviorType;
    projectType?: ProjectType;
};

export async function getAgentStub(
    env: Env,
    agentId: string,
    props?: AgentStubProps
) : Promise<DurableObjectStub<CodeGeneratorAgent>> {
    const options = props ? { props } : undefined;
    return getAgentByName<Env, CodeGeneratorAgent>(env.CodeGenObject, agentId, options);
}

export async function getAgentStubLightweight(env: Env, agentId: string) : Promise<DurableObjectStub<CodeGeneratorAgent>> {
    return getAgentByName<Env, CodeGeneratorAgent>(env.CodeGenObject, agentId, {
        // props: { readOnlyMode: true }
    });
}

export async function getAgentState(env: Env, agentId: string) : Promise<AgentState> {
    const agentInstance = await getAgentStub(env, agentId);
    return await agentInstance.getFullState() as AgentState;
}

export async function cloneAgent(env: Env, agentId: string, newUserId: string) : Promise<{newAgentId: string, newAgent: DurableObjectStub<CodeGeneratorAgent>}> {
    const agentInstance = await getAgentStub(env, agentId);
    if (!agentInstance || !await agentInstance.isInitialized()) {
        throw new Error(`Agent ${agentId} not found`);
    }
    const newAgentId = generateId();

	const originalState = await agentInstance.getFullState();

	// Fetch user model configs for the new user (same as in startCodeGeneration)
	const modelConfigService = new ModelConfigService(env);

	// Fetch all user model configs, api keys and agent instance at once
	const [userConfigsRecord, newAgent] = await Promise.all([
		modelConfigService.getUserModelConfigs(newUserId),
		getAgentStub(env, newAgentId, {
			behaviorType: originalState.behaviorType,
			projectType: originalState.projectType,
		})
	]);

	// Convert Record to Map and extract only ModelConfig properties
	const userModelConfigs = new Map();
	for (const [actionKey, mergedConfig] of Object.entries(userConfigsRecord)) {
		if (mergedConfig.isUserOverride) {
			const modelConfig: ModelConfig = {
				name: mergedConfig.name,
				max_tokens: mergedConfig.max_tokens,
				temperature: mergedConfig.temperature,
				reasoning_effort: mergedConfig.reasoning_effort,
				fallbackModel: mergedConfig.fallbackModel
			};
			userModelConfigs.set(actionKey, modelConfig);
		}
	}

	const newInferenceContext: InferenceContext = {
		userModelConfigs: Object.fromEntries(userModelConfigs),
		metadata: {
			agentId: newAgentId,
			userId: newUserId,
		},
		enableRealtimeCodeFix: false, // This costs us too much, so disabled it for now
		enableFastSmartCodeFix: false,
	};

	const newProjectName = generateProjectName(
		originalState.blueprint?.projectName || originalState.templateName,
		generateNanoId(),
		20
	);

    const newState: AgentState = {
        ...originalState,
        sessionId: newAgentId,
        sandboxInstanceId: undefined,
        pendingUserInputs: [],
        shouldBeGenerating: false,
        projectUpdatesAccumulator: [],
        reviewingInitiated: false,
        mvpGenerated: false,
        ...(originalState.behaviorType === 'phasic' ? {
            generatedPhases: [],
            currentDevState: CurrentDevState.IDLE,
        } : {}),
		metadata: newInferenceContext.metadata,
		projectName: newProjectName,
    } as AgentState;

    await newAgent.setState(newState);
    // await newAgent.initializeFork();

    return {newAgentId, newAgent};
}

export async function getTemplateForQuery(
    env: Env,
    inferenceContext: InferenceContext,
    query: string,
    projectType: ProjectType | 'auto',
    images: ImageAttachment[] | undefined,
    logger: StructuredLogger,
) : Promise<{templateDetails: TemplateDetails, selection: TemplateSelection, projectType: ProjectType}> {
    // In 'general' mode, we intentionally start from scratch without a real template
    if (projectType === 'general') {
        const scratch: TemplateDetails = createScratchTemplateDetails();
        const selection: TemplateSelection = {
            selectedTemplateName: null,
            reasoning: 'General (from-scratch) mode: no template selected',
            useCase: 'General',
            complexity: 'moderate',
            styleSelection: 'Custom',
            projectType: 'general',
        } as TemplateSelection; // satisfies schema shape
        return { templateDetails: scratch, selection, projectType: 'general' };
    }
    // Fetch available templates
    const templatesResponse = await SandboxSdkClient.listTemplates();
    if (!templatesResponse || !templatesResponse.success) {
        throw new Error(`Failed to fetch templates from sandbox service, ${templatesResponse.error}`);
    }

    const analyzeQueryResponse = await selectTemplate({
        env,
        inferenceContext,
        query,
        projectType,
        availableTemplates: templatesResponse.templates,
        images,
    });

    logger.info('Selected template', { selectedTemplate: analyzeQueryResponse });

    if (!analyzeQueryResponse.selectedTemplateName) {
        // For non-general requests when no template is selected, fall back to scratch
        logger.warn('No suitable template found; falling back to scratch');
        const scratch: TemplateDetails = createScratchTemplateDetails();
        return { templateDetails: scratch, selection: analyzeQueryResponse, projectType: analyzeQueryResponse.projectType };
    }

    const selectedTemplate = templatesResponse.templates.find(template => template.name === analyzeQueryResponse.selectedTemplateName);
    if (!selectedTemplate) {
        logger.error('Selected template not found');
        throw new Error('Selected template not found');
    }
    const templateDetailsResponse = await BaseSandboxService.getTemplateDetails(selectedTemplate.name);
    if (!templateDetailsResponse.success || !templateDetailsResponse.templateDetails) {
        logger.error('Failed to fetch files', { templateDetailsResponse });
        throw new Error('Failed to fetch files');
    }

    const templateDetails = templateDetailsResponse.templateDetails;
    return { templateDetails, selection: analyzeQueryResponse, projectType: analyzeQueryResponse.projectType };
}
