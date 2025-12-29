import { useRef, useEffect, useState } from 'react';
import { Button } from '../../../components/primitives/button';
import { Loader, ExternalLink, Zap, Check, Globe, Lock, Share2 } from 'lucide-react';
import clsx from 'clsx';
import { apiClient } from '../../../lib/api-client';
import { toast } from 'sonner';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

interface DeploymentControlsProps {
	// Deployment state
	isPhase1Complete: boolean;
	isDeploying: boolean;
	deploymentUrl?: string;
	instanceId: string;
	isRedeployReady: boolean;
	deploymentError?: string;
	
	// App state
	appId?: string;
	appVisibility?: 'public' | 'private';
	
	// Generation state (kept for compatibility but pause button will not be rendered)
	isGenerating: boolean;
	isPaused: boolean;
	
	// Actions
	onDeploy: (instanceId: string) => void;
	onStopGeneration: () => void;
	onResumeGeneration: () => void;
	onVisibilityUpdate?: (newVisibility: 'public' | 'private') => void;
}

// Deployment state enum for better state management
enum DeploymentState {
	WAITING_PHASE1 = 'waiting_phase1',
	READY_TO_DEPLOY = 'ready_to_deploy',
	DEPLOYING = 'deploying',
	DEPLOYED = 'deployed',
	REDEPLOYING = 'redeploying',
	ERROR = 'error'
}

export function DeploymentControls({
	isPhase1Complete,
	isDeploying,
	deploymentUrl,
	instanceId,
	isRedeployReady,
	deploymentError,
	appId,
	appVisibility = 'private',
	onDeploy,
	onVisibilityUpdate,
}: DeploymentControlsProps) {
	const [isDeployButtonClicked, setIsDeployButtonClicked] = useState(false);
	const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
	const [localVisibility, setLocalVisibility] = useState(appVisibility);
	const deploymentRef = useRef<HTMLDivElement>(null);

	const { copied: urlCopied, copy: copyUrl } = useCopyToClipboard();
	const { copied: linkCopied, copy: copyLink } = useCopyToClipboard();

	// Reset deployment button state when deployment completes (success or failure)
	useEffect(() => {
		if (!isDeploying) {
			setIsDeployButtonClicked(false);
		}
	}, [isDeploying]);

	// Sync local visibility with prop
	useEffect(() => {
		setLocalVisibility(appVisibility);
	}, [appVisibility]);

	// Determine current deployment state with proper logic
	const getCurrentDeploymentState = (): DeploymentState => {
		if (deploymentError && !isDeploying) {
			return DeploymentState.ERROR;
		}
		
		if (isDeploying) {
			if (deploymentUrl) {
				return DeploymentState.REDEPLOYING;
			} else {
				return DeploymentState.DEPLOYING;
			}
		}
		
		if (deploymentUrl && !isDeploying) {
			return DeploymentState.DEPLOYED;
		}
		
		if (isPhase1Complete) {
			return DeploymentState.READY_TO_DEPLOY;
		}
		
		return DeploymentState.WAITING_PHASE1;
	};

	const currentState = getCurrentDeploymentState();

	const handleDeploy = () => {
		setIsDeployButtonClicked(true);
		
		// Smooth scroll animation to deployment section
		if (deploymentRef.current) {
			deploymentRef.current.scrollIntoView({ 
				behavior: 'smooth', 
				block: 'center' 
			});
		}
		
		onDeploy(instanceId);
	};

	const handleToggleVisibility = async () => {
		if (!appId) {
			toast.error('App ID not found');
			return;
		}

		try {
			setIsUpdatingVisibility(true);
			const newVisibility = localVisibility === 'private' ? 'public' : 'private';

			const response = await apiClient.updateAppVisibility(appId, newVisibility);

			if (response.success && response.data) {
				setLocalVisibility(newVisibility);
				onVisibilityUpdate?.(newVisibility);
				
				if (newVisibility === 'public') {
					toast.success('🎉 Your app is now public! Share the link with anyone.');
				} else {
					toast.success('App is now private');
				}
			} else {
				throw new Error(response.error?.message || 'Failed to update visibility');
			}
		} catch (error) {
			console.error('Error updating app visibility:', error);
			toast.error('Failed to update visibility');
		} finally {
			setIsUpdatingVisibility(false);
		}
	};

	// State-based styling and content
	const getStateConfig = (state: DeploymentState) => {
		switch (state) {
			case DeploymentState.WAITING_PHASE1:
				return {
					panelClass: "bg-bg-3/30 dark:bg-bg-3/20 border-border-primary/50 dark:border-border-primary/40",
					iconClass: "bg-bg-3-foreground/40 dark:bg-bg-3-foreground/30 border-muted-foreground/40 dark:border-muted-foreground/30",
					icon: null,
					titleColor: "text-muted-foreground/80 dark:text-muted-foreground/70",
					subtitleColor: "text-muted-foreground/80 dark:text-muted-foreground/70",
					title: "Deploy to Cloudflare",
					subtitle: "Deploy will be enabled after Phase 1 is implemented",
					buttonDisabled: true,
					buttonVariant: "outline" as const,
					buttonClass: "bg-bg-1 dark:bg-bg-3 text-muted-foreground/80 dark:text-muted-foreground/70 border-muted dark:border-muted cursor-not-allowed"
				};
			
			case DeploymentState.READY_TO_DEPLOY:
				return {
					panelClass: "border rounded-lg p-4 bg-gradient-to-r from-green-50/40 to-emerald-50/40 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/60 dark:border-green-800/30 shadow-sm dark:shadow-green-900/2",
					iconClass: "bg-brand/10 border-brand/10",
					icon: <Zap className="w-4 h-4 text-brand" />,
					titleColor: "text-green-900 dark:text-green-100",
					subtitleColor: "text-green-700 dark:text-green-300",
					title: "Ready to Deploy",
					subtitle: "It's Free!<br /> Deploys to Cloudflare Workers for Platform",
					buttonDisabled: false,
					buttonVariant: "primary" as const,
					buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90"
				};
			
			case DeploymentState.DEPLOYING:
				return {
					panelClass: "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-800/30 shadow-sm dark:shadow-blue-900/20",
					iconClass: "bg-blue-500 dark:bg-blue-600 border-blue-500 dark:border-blue-600 animate-pulse",
					icon: <Loader className="w-2.5 h-2.5 text-white animate-spin" />,
					titleColor: "text-blue-900 dark:text-blue-100",
					subtitleColor: "text-blue-600 dark:text-blue-300",
					title: "Deploying to Cloudflare",
					subtitle: "Please wait while your application is being deployed...",
					buttonDisabled: true,
					buttonVariant: "default" as const,
					buttonClass: "bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white border-blue-500 dark:border-blue-600 scale-105 shadow-lg dark:shadow-blue-900/50"
				};
			
			case DeploymentState.REDEPLOYING:
				return {
					panelClass: "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-800/30 shadow-sm dark:shadow-blue-900/20",
					iconClass: "bg-blue-500 dark:bg-blue-600 border-blue-500 dark:border-blue-600 animate-pulse",
					icon: <Loader className="w-2.5 h-2.5 text-white animate-spin" />,
					titleColor: "text-blue-900 dark:text-blue-100",
					subtitleColor: "text-blue-600 dark:text-blue-300",
					title: "Redeploying to Cloudflare",
					subtitle: "Please wait while your application is being redeployed...",
					buttonDisabled: true,
					buttonVariant: "default" as const,
					buttonClass: "bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white border-blue-500 dark:border-blue-600 scale-105 shadow-lg dark:shadow-blue-900/50"
				};
			
			case DeploymentState.ERROR:
				return {
					panelClass: "bg-red-300/10 dark:bg-red-950/20 border-red-200/60 dark:border-red-800/30 dark:shadow-red-900/20",
					iconClass: "bg-red-300/10 border-red-300/20 dark:border-red-300/10 text-red-700 dark:text-red-500",
					icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>,
					titleColor: "text-red-700 dark:text-red-500",
					subtitleColor: "text-red-500/80 dark:text-red-400/80",
					title: "Deployment Failed",
					subtitle: "Error in deployment, please try again",
					buttonDisabled: !isPhase1Complete,
					buttonVariant: "default" as const,
					buttonClass: isPhase1Complete 
						? "bg-primary text-primary-foreground hover:bg-primary/90"
						: "bg-bg-3 dark:bg-bg-3 text-muted-foreground/80 dark:text-muted-foreground/70 border-muted dark:border-muted cursor-not-allowed"
				};
			
			default:
				return getStateConfig(DeploymentState.WAITING_PHASE1);
		}
	};

	const stateConfig = getStateConfig(currentState);
	const isCurrentlyDeploying = currentState === DeploymentState.DEPLOYING || currentState === DeploymentState.REDEPLOYING;

	return (
		<div className="space-y-3 deployment-controls">
			{/* Main Deployment Panel - Always visible, changes based on state */}
			{currentState !== DeploymentState.DEPLOYED && (
				<div 
					ref={deploymentRef}
					className={clsx(
						"border rounded-lg p-3 transition-all duration-500 mt-2",
						stateConfig.panelClass
					)}
				>
					<div className="flex items-center gap-3">
						{/* Enhanced Status Icon with deployment state */}
						<div className={clsx(
							"flex-shrink-0 w-6 h-6 rounded border-1 flex items-center justify-center transition-all duration-500",
							stateConfig.iconClass
						)}>
							{stateConfig.icon}
						</div>
						
						{/* Enhanced Deployment Section Content */}
						<div className="flex-1">
							<div className={clsx(
								"text-sm font-medium transition-colors duration-300",
								stateConfig.titleColor
							)}>
								{stateConfig.title}
							</div>
							<div className={clsx(
								"text-xs mt-0.5 transition-colors duration-300",
								stateConfig.subtitleColor
							)}>
								<div dangerouslySetInnerHTML={{ __html: stateConfig.subtitle }} />
							</div>
						</div>
						
						{/* Enhanced Deploy Button - Always visible, state-aware */}
						<Button
							onClick={handleDeploy}
							disabled={stateConfig.buttonDisabled || isCurrentlyDeploying || isDeployButtonClicked}
							className={clsx(
								"h-8 px-4 text-sm font-medium transition-all duration-300 transform rounded-sm",
								stateConfig.buttonClass
							)}
						>
							{isCurrentlyDeploying ? (
								<>
									<Loader className="w-4 h-4 animate-spin" />
									{currentState === DeploymentState.REDEPLOYING ? 'Redeploying...' : 'Deploying...'}
								</>
							) : (
								<>
									<Zap className="w-4 h-4" />
									Deploy to Cloudflare
								</>
							)}
						</Button>
					</div>
				</div>
			)}

			{/* Deployed Success State - Enhanced with Visibility Toggle */}
			{currentState === DeploymentState.DEPLOYED && (
				<div 
					ref={deploymentRef}
					className="border rounded-lg p-4 bg-gradient-to-r from-green-50/40 to-emerald-50/40 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/60 dark:border-green-800/30 transition-all duration-700 mt-2 animate-in slide-in-from-top-2 shadow-sm dark:shadow-green-900/20"
				>
					<div className="flex items-center gap-3 mb-3">
						{/* Success Icon with animation */}
						<div className="flex-shrink-0 w-5 h-5 bg-green-500 border-2 border-green-500 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-500">
							<Check className="w-3 h-3 text-white" />
						</div>
						
						{/* Success Header */}
						<div className="flex-1">
							<div className="text-sm font-semibold text-green-900 dark:text-green-100">
								🎉 Successfully Deployed!
							</div>
							<div className="text-xs text-green-700 dark:text-green-300 mt-0.5">
								Your application is now live on Cloudflare Workers
							</div>
						</div>
					</div>
					
					{/* Elegant URL Display */}
					<div className="bg-foreground/5 border border-foreground/10 rounded-md p-3 mb-3">
						<div className="text-xs text-muted-foreground font-medium mb-1">Live URL:</div>
						<div className="flex items-center gap-2">
							<code className="flex-1 text-sm font-mono text-muted-foreground bg-foreground/5 px-2 py-1 rounded text-ellipsis overflow-hidden">
								{deploymentUrl}
							</code>
							<Button
								onClick={() => deploymentUrl && copyUrl(deploymentUrl)}
								variant="secondary"
								className="h-8 px-4 rounded-md text-sm border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 flex-shrink-0"
							>
								{urlCopied ? 'Copied!' : 'Copy'}
							</Button>
						</div>
					</div>

					{/* Shareable Link - Only shown when app is public */}
					{localVisibility === 'public' && appId && (
						<div className="bg-foreground/5 border border-foreground/10 rounded-md p-3 mb-3">
							<div className="text-xs text-foreground font-medium mb-1 flex items-center gap-1">
								<Share2 className="w-3 h-3" />
								Shareable Link:
							</div>
							<div className="flex items-center gap-2">
								<code className="flex-1 text-sm font-mono text-muted-foreground bg-foreground/5 px-2 py-1 rounded text-ellipsis overflow-hidden">
									{window.location.origin}/app/{appId}
								</code>
								<Button
									onClick={() => copyLink(`${window.location.origin}/app/${appId}`)}
									variant="secondary"
									className="h-8 px-2 text-sm rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/5 flex-shrink-0"
								>
									{linkCopied ? 'Copied!' : 'Copy Link'}
								</Button>
							</div>
						</div>
					)}
					
					{/* Action Buttons - Enhanced with visibility toggle */}
					<div className={clsx(
						"grid gap-3",
						isRedeployReady ? "grid-cols-3" : "grid-cols-2"
					)}>
						{/* View Live Site Button */}
						<Button
							onClick={() => deploymentUrl && window.open(deploymentUrl, '_blank')}
							variant="secondary"
							className="justify-center gap-1 px-2 h-8 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 h-8 px-4 rounded-md text-sm border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 flex-shrink-0"
						>
							<ExternalLink className="w-4 h-4" />
							View Live
						</Button>
						
						{/* Make Public/Private Button - Always visible after deployment */}
						{appId && (
							<Button
								onClick={handleToggleVisibility}
								disabled={isUpdatingVisibility}
								variant="secondary"
								className={clsx(
									"h-8 rounded-md px-4 text-sm font-medium transition-all duration-200 shadow-sm text-center justify-center border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
								)}
							>
								{isUpdatingVisibility ? (
									<>
										<Loader className="w-4 h-4 animate-spin" />
										Updating...
									</>
								) : localVisibility === 'private' ? (
									<>
										<Globe className="w-4 h-4" />
										Make Public
									</>
								) : (
									<>
										<Lock className="w-4 h-4" />
										Make Private
									</>
								)}
							</Button>
						)}
						
						{/* Redeploy Button - Only shown when changes are made */}
						{isRedeployReady && (
							<Button
								onClick={handleDeploy}
								disabled={isDeploying || isDeployButtonClicked}
								variant="secondary"
								className={clsx(
									"h-8 rounded-md px-4 text-sm font-medium transition-all duration-200 shadow-sm transition-all duration-300 text-center justify-center",
									!isDeploying
										? "bg-primary text-primary-foreground hover:bg-primary/90" 
										: "bg-bg-3 dark:bg-bg-3 text-muted-foreground/50 border-muted dark:border-muted cursor-not-allowed"
								)}
							>
								{isDeploying ? (
									<>
										<Loader className="w-4 h-4 animate-spin" />
										Redeploying...
									</>
								) : (
									<>
										<Zap className="w-4 h-4" />
										Redeploy
									</>
								)}
							</Button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
