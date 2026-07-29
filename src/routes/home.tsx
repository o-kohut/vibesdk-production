import { useRef, useState, useEffect, useMemo } from 'react';
import { ArrowRight, ArrowUpRight, Info, AlertTriangle } from 'react-feather';
import { useNavigate } from 'react-router';
import { ProjectModeSelector, type ProjectModeOption } from '../components/project-mode-selector';
import { MAX_AGENT_QUERY_LENGTH, SUPPORTED_IMAGE_MIME_TYPES, type ProjectType } from '@/api-types';
import { useFeature } from '@/features';
import { useAuthGuard } from '../hooks/useAuthGuard';
import { usePaginatedApps } from '@/hooks/use-paginated-apps';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { AppCard } from '@/components/shared/AppCard';
import clsx from 'clsx';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useDragDrop } from '@/hooks/use-drag-drop';
import { ImageUploadButton } from '@/components/image-upload-button';
import { ImageAttachmentPreview } from '@/components/image-attachment-preview';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';

export default function Home() {
	const navigate = useNavigate();
	const { requireAuth } = useAuthGuard();
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [projectMode, setProjectMode] = useState<ProjectType>('app');
	const [query, setQuery] = useState('');
	const { isLoadingCapabilities, capabilities, getEnabledFeatures } = useFeature();

	const modeOptions = useMemo<ProjectModeOption[]>(() => {
		if (isLoadingCapabilities || !capabilities) return [];
		return getEnabledFeatures().map((def) => ({
			id: def.id,
			label:
				def.id === 'presentation'
					? 'Slides'
					: def.id === 'general'
						? 'General'
						: 'App',
			description: def.description,
		}));
	}, [capabilities, getEnabledFeatures, isLoadingCapabilities]);

	const showModeSelector = modeOptions.length > 1;

	useEffect(() => {
		if (isLoadingCapabilities) return;
		if (modeOptions.length === 0) {
			if (projectMode !== 'app') setProjectMode('app');
			return;
		}
		if (!modeOptions.some((m) => m.id === projectMode)) {
			setProjectMode(modeOptions[0].id);
		}
	}, [isLoadingCapabilities, modeOptions, projectMode]);

	const { images, addImages, removeImage, clearImages, isProcessing } = useImageUpload({
		onError: (error) => {
			console.error('Image upload error:', error);
			toast.error(error);
		},
	});

	const { isDragging, dragHandlers } = useDragDrop({
		onFilesDropped: addImages,
		accept: [...SUPPORTED_IMAGE_MIME_TYPES],
	});


	const placeholderPhrases = useMemo(() => [
		"custom MT engine integration",
		"translation quality checker",
		"project progress dashboard",
		"custom file format processor",
		"workflow automation tool",
		"glossary management system",
		"translation memory analyzer"
	], []);
	const [currentPlaceholderPhraseIndex, setCurrentPlaceholderPhraseIndex] = useState(0);
	const [currentPlaceholderText, setCurrentPlaceholderText] = useState("");
	const [isPlaceholderTyping, setIsPlaceholderTyping] = useState(true);

	const {
		apps,
		loading,
	} = usePaginatedApps({
		type: 'public',
		defaultSort: 'popular',
		defaultPeriod: 'week',
		limit: 6,
	});

	// Discover section should appear only when enough apps are available and loading is done
	const discoverReady = useMemo(() => !loading && (apps?.length ?? 0) > 5, [loading, apps]);

	const handleCreateApp = (query: string, mode: ProjectType) => {
		if (query.length > MAX_AGENT_QUERY_LENGTH) {
			toast.error(
				`Prompt too large (${query.length} characters). Maximum allowed is ${MAX_AGENT_QUERY_LENGTH} characters.`,
			);
			return;
		}

		const encodedQuery = encodeURIComponent(query);
		const encodedMode = encodeURIComponent(mode);

		// Encode images as JSON if present
		const imageParam = images.length > 0 ? `&images=${encodeURIComponent(JSON.stringify(images))}` : '';
		const intendedUrl = `/chat/new?query=${encodedQuery}&projectType=${encodedMode}${imageParam}`;

		if (
			!requireAuth({
				requireFullAuth: true,
				actionContext: 'to create applications',
				intendedUrl: intendedUrl,
			})
		) {
			return;
		}

		// User is already authenticated, navigate immediately
		navigate(intendedUrl);
		// Clear images after navigation
		clearImages();
	};

	// Auto-resize textarea based on content
	const adjustTextareaHeight = () => {
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto';
			const scrollHeight = textareaRef.current.scrollHeight;
			const maxHeight = 300; // Maximum height in pixels
			textareaRef.current.style.height =
				Math.min(scrollHeight, maxHeight) + 'px';
		}
	};

	useEffect(() => {
		adjustTextareaHeight();
	}, []);

	// Typewriter effect
	useEffect(() => {
		const currentPhrase = placeholderPhrases[currentPlaceholderPhraseIndex];

		if (isPlaceholderTyping) {
			if (currentPlaceholderText.length < currentPhrase.length) {
				const timeout = setTimeout(() => {
					setCurrentPlaceholderText(currentPhrase.slice(0, currentPlaceholderText.length + 1));
				}, 100); // Typing speed
				return () => clearTimeout(timeout);
			} else {
				// Pause before erasing
				const timeout = setTimeout(() => {
					setIsPlaceholderTyping(false);
				}, 2000); // Pause duration
				return () => clearTimeout(timeout);
			}
		} else {
			if (currentPlaceholderText.length > 0) {
				const timeout = setTimeout(() => {
					setCurrentPlaceholderText(currentPlaceholderText.slice(0, -1));
				}, 50); // Erasing speed
				return () => clearTimeout(timeout);
			} else {
				// Move to next phrase
				setCurrentPlaceholderPhraseIndex((prev) => (prev + 1) % placeholderPhrases.length);
				setIsPlaceholderTyping(true);
			}
		}
	}, [currentPlaceholderText, currentPlaceholderPhraseIndex, isPlaceholderTyping, placeholderPhrases]);

	const discoverLinkRef = useRef<HTMLDivElement>(null);

	return (
		<div className="relative flex flex-col items-center size-full">
			<div
				className="fixed inset-0 text-accent z-0 opacity-20 pointer-events-none bg-[var(--bg-background)] opacity-80 [background-image:linear-gradient(var(--border)_1.3px,transparent_1.3px),linear-gradient(to_right,var(--border)_1.3px,var(--background)_1.3px)] [background-size:26px_26px] mask-b-to-60%">
			</div>
			<LayoutGroup>
				<div className="rounded-md w-full max-w-2xl overflow-hidden">
					<motion.div
						layout
						transition={{ layout: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
						className={clsx(
							"px-6 p-8 flex flex-col items-center z-10 relative",
							discoverReady ? "mt-48" : "mt-[20vh] sm:mt-[24vh] md:mt-[28vh]"
						)}>
						<motion.a
							href="https://support.crowdin.com/developer/crowdin-apps-serverless/"
							target="_blank"
							rel="noopener noreferrer"
							initial={{ opacity: 0, y: -6 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3, ease: 'easeOut' }}
							className="group self-start mb-5 inline-flex items-center gap-2 rounded-full border bg-bg-4/80 dark:bg-bg-2/80 backdrop-blur px-3.5 py-1.5 text-xs shadow-sm outline-none transition-colors duration-200 hover:bg-accent/50 hover:border-foreground/20 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
						>
							<span className="size-1.5 rounded-full bg-brand shrink-0" aria-hidden="true" />
							<span className="font-medium text-text-primary">Serverless Apps</span>
							<span className="hidden sm:inline text-text-tertiary" aria-hidden="true">&middot;</span>
							<span className="hidden sm:inline text-text-secondary transition-colors duration-200 group-hover:text-text-primary">a new way to build Crowdin apps</span>
							<ArrowUpRight className="size-3.5 text-text-tertiary shrink-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-text-primary" />
						</motion.a>
						<h1 className="text-primary font-semibold font-heading leading-[1.1] tracking-tight text-5xl w-full mb-4 flex items-center gap-3">
							Build your Crowdin app
							<Badge className="text-xs font-semibold bg-foreground/5 text-foreground/70 border-border uppercase tracking-wider">
								Alpha
							</Badge>
						</h1>
						<p className="text-text-secondary text-base mb-4">
							Create custom localization tools, automate workflows, and enhance your translation projects with AI
						</p>

						<form
							method="POST"
							onSubmit={(e) => {
								e.preventDefault();
								const query = textareaRef.current!.value;
								handleCreateApp(query, projectMode);
							}}
							className="flex z-10 flex-col w-full min-h-[150px] bg-bg-3 border focus-within:border-primary/50 rounded-lg shadow-md p-5 transition-all duration-200"
						>
							<div
								className={clsx(
									"flex-1 flex flex-col relative",
									isDragging && "ring-2 ring-accent ring-offset-2 rounded-lg"
								)}
								{...dragHandlers}
							>
								{isDragging && (
									<div className="absolute inset-0 flex items-center justify-center bg-accent/10 backdrop-blur-sm rounded-lg z-30 pointer-events-none">
										<p className="text-accent font-medium">Drop images here</p>
									</div>
								)}
								<textarea
									className="w-full resize-none ring-0 z-20 outline-0 placeholder:text-muted-foreground/50 text-foreground"
									name="query"
									value={query}
									placeholder={`Build a ${currentPlaceholderText}`}
									ref={textareaRef}
									onChange={(e) => {
										setQuery(e.target.value);
										adjustTextareaHeight();
									}}
									onInput={adjustTextareaHeight}
									onKeyDown={(e) => {
										if (e.key === 'Enter' && !e.shiftKey) {
											e.preventDefault();
											const query = textareaRef.current!.value;
											handleCreateApp(query, projectMode);
										}
									}}
								/>
								{images.length > 0 && (
									<div className="mt-3">
										<ImageAttachmentPreview
											images={images}
											onRemove={removeImage}
										/>
									</div>
								)}
							</div>
							<div
								className={clsx(
									'flex items-center mt-4 pt-1',
									showModeSelector ? 'justify-between' : 'justify-end',
								)}
							>
								{showModeSelector && (
									<ProjectModeSelector
										value={projectMode}
										onChange={setProjectMode}
										modes={modeOptions}
										className="flex-1"
									/>
								)}

								<div className={clsx('flex items-center gap-2', showModeSelector && 'ml-4')}>
									<ImageUploadButton
										onFilesSelected={addImages}
										disabled={isProcessing}
									/>
									<Button
										variant="default"
										size="icon"
										type="submit"
										disabled={!query.trim()}
									>
										<ArrowRight />
									</Button>
								</div>
							</div>
						</form>
						<div className="flex items-center gap-1.5 px-1 mt-3">
							<AlertTriangle className="size-3 text-muted-foreground flex-shrink-0" />
							<p className="text-xs text-muted-foreground">
								<span className="font-medium">Alpha Software:</span> Generated apps may contain bugs or security issues.
							</p>
						</div>
					</motion.div>

				</div>

				<AnimatePresence>
					{images.length > 0 && (
						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							className="w-full max-w-2xl px-6"
						>
							<div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-bg-4/50 dark:bg-bg-2/50 border border-accent/20 dark:border-accent/30 shadow-sm">
								<Info className="size-4 text-accent flex-shrink-0 mt-0.5" />
								<p className="text-xs text-text-tertiary leading-relaxed">
									<span className="font-medium text-muted-foreground">Images Beta:</span> Images guide app layout and design but may not be replicated exactly. The coding agent cannot access images directly for app assets.
								</p>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				<AnimatePresence>
					{discoverReady && (
						<motion.section
							key="discover-section"
							layout
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
							className={clsx('w-full max-w-6xl mx-auto px-4 z-10', images.length > 0 ? 'mt-10' : 'mt-16 mb-8')}
						>
							<div className="flex items-center justify-between mb-6">
								<h2 className="text-2xl font-semibold font-heading text-foreground">Community Apps</h2>
								<div
									ref={discoverLinkRef}
									className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
									onClick={() => navigate('/discover')}
								>
									View All →
								</div>
							</div>
							<motion.div
								layout
								transition={{ duration: 0.4 }}
								className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
							>
								<AnimatePresence mode="popLayout">
									{apps.map(app => (
										<AppCard
											key={app.id}
											app={app}
											onClick={() => navigate(`/app/${app.id}`)}
											showStats={true}
											showUser={true}
											showActions={false}
										/>
									))}
								</AnimatePresence>
							</motion.div>
						</motion.section>
					)}
				</AnimatePresence>
			</LayoutGroup>
		</div>
	);
}
