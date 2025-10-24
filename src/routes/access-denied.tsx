import { AlertCircle, Mail } from 'react-feather';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';

/**
 * Access Denied page for users whose email is not whitelisted
 */
export default function AccessDenied() {
	const navigate = useNavigate();

	return (
		<div className="flex items-center justify-center min-h-screen px-4">
			{/* Dotted background pattern */}
			<div className="fixed inset-0 text-accent z-0 opacity-20 pointer-events-none">
				<svg width="100%" height="100%">
					<defs>
						<pattern
							id="access-denied-pattern"
							viewBox="-6 -6 12 12"
							patternUnits="userSpaceOnUse"
							width="12"
							height="12"
						>
							<circle
								cx="0"
								cy="0"
								r="1"
								fill="currentColor"
							></circle>
						</pattern>
					</defs>
					<rect
						width="100%"
						height="100%"
						fill="url(#access-denied-pattern)"
					></rect>
				</svg>
			</div>

			<div className="relative z-10 max-w-md w-full">
				<div className="bg-bg-4 dark:bg-bg-2 border border-accent/30 dark:border-accent/50 rounded-2xl shadow-xl p-8">
					{/* Icon */}
					<div className="flex justify-center mb-6">
						<div className="bg-amber-100 dark:bg-amber-900/30 p-4 rounded-full">
							<AlertCircle className="size-12 text-amber-600 dark:text-amber-500" />
						</div>
					</div>

					{/* Content */}
					<div className="text-center space-y-4">
						<h1 className="text-2xl font-semibold text-text-primary">
							Access Restricted
						</h1>
						
						<p className="text-text-secondary leading-relaxed">
							Your email address is not authorized to access this application. 
							This platform is currently available only to whitelisted users.
						</p>

						<div className="bg-accent/5 dark:bg-accent/10 border border-accent/20 rounded-lg p-4 mt-6">
							<p className="text-sm text-text-secondary">
								To request access, please contact <strong>Crowdin Support</strong> and 
								provide your email address to be added to the whitelist.
							</p>
						</div>

						{/* Actions */}
						<div className="flex flex-col gap-3 mt-8">
							<a
								href="https://crowdin.com/contacts"
								target="_blank"
								rel="noopener noreferrer"
								className="w-full"
							>
								<Button 
									className="w-full bg-accent hover:bg-accent/90 text-white"
									size="lg"
								>
									<Mail className="size-4 mr-2" />
									Contact Crowdin Support
								</Button>
							</a>

							<Button
								variant="outline"
								size="lg"
								onClick={() => navigate('/')}
								className="w-full"
							>
								Return to Home
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

