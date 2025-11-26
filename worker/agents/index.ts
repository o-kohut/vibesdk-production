
import { SmartCodeGeneratorAgent } from './core/smartGeneratorAgent';
import { getAgentByName } from 'agents';
import { CodeGenState } from './core/state';
import { generateId } from '../utils/idGenerator';
import { StructuredLogger } from '../logger';
import { InferenceContext, ModelConfig } from './inferutils/config.types';
import { SandboxSdkClient } from '../services/sandbox/sandboxSdkClient';
import { selectTemplate } from './planning/templateSelector';
import { TemplateDetails } from '../services/sandbox/sandboxTypes';
import { TemplateSelection } from './schemas';
import type { ImageAttachment } from '../types/image-attachment';
import { BaseSandboxService } from 'worker/services/sandbox/BaseSandboxService';
import { ModelConfigService } from '../database/services/ModelConfigService';

export async function getAgentStub(env: Env, agentId: string) : Promise<DurableObjectStub<SmartCodeGeneratorAgent>> {
    return getAgentByName<Env, SmartCodeGeneratorAgent>(env.CodeGenObject, agentId);
}

export async function getAgentStubLightweight(env: Env, agentId: string) : Promise<DurableObjectStub<SmartCodeGeneratorAgent>> {
    return getAgentByName<Env, SmartCodeGeneratorAgent>(env.CodeGenObject, agentId, {
        // props: { readOnlyMode: true }
    });
}

export async function getAgentState(env: Env, agentId: string) : Promise<CodeGenState> {
    const agentInstance = await getAgentStub(env, agentId);
    return await agentInstance.getFullState() as CodeGenState;
}

export async function cloneAgent(env: Env, agentId: string, newUserId: string) : Promise<{newAgentId: string, newAgent: DurableObjectStub<SmartCodeGeneratorAgent>}> {
    const agentInstance = await getAgentStub(env, agentId);
    if (!agentInstance || !await agentInstance.isInitialized()) {
        throw new Error(`Agent ${agentId} not found`);
    }
    const newAgentId = generateId();

    // Fetch user model configs for the new user (same as in startCodeGeneration)
    const modelConfigService = new ModelConfigService(env);

    // Fetch all user model configs, api keys and agent instance at once
    const [userConfigsRecord, newAgent] = await Promise.all([
        modelConfigService.getUserModelConfigs(newUserId),
        getAgentStub(env, newAgentId)
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
        agentId: newAgentId,
        userId: newUserId,
        enableRealtimeCodeFix: false, // This costs us too much, so disabled it for now
        enableFastSmartCodeFix: false,
    };

    const originalState = await agentInstance.getFullState() as CodeGenState;
    const newState = {
        ...originalState,
        sessionId: newAgentId,
        sandboxInstanceId: undefined,
        pendingUserInputs: [],
        currentDevState: 0,
        generationPromise: undefined,
        shouldBeGenerating: false,
        // latestScreenshot: undefined,
        clientReportedErrors: [],
        inferenceContext: newInferenceContext,
    };

    await newAgent.setState(newState);
    return {newAgentId, newAgent};
}

export async function getTemplateForQuery(
    env: Env,
    inferenceContext: InferenceContext,
    query: string,
    images: ImageAttachment[] | undefined,
    logger: StructuredLogger,
) : Promise<{templateDetails: TemplateDetails, selection: TemplateSelection}> {
    // Fetch available templates
    const templatesResponse = await SandboxSdkClient.listTemplates();
    if (!templatesResponse || !templatesResponse.success) {
        throw new Error(`Failed to fetch templates from sandbox service, ${templatesResponse.error}`);
    }

    const analyzeQueryResponse = await selectTemplate({
        env,
        inferenceContext,
        query,
        availableTemplates: templatesResponse.templates,
        images,
    });

    logger.info('Selected template', { selectedTemplate: analyzeQueryResponse });

    if (!analyzeQueryResponse.selectedTemplateName) {
        logger.error('No suitable template found for code generation');
        throw new Error('No suitable template found for code generation');
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
    return { templateDetails, selection: analyzeQueryResponse };
}
