/**
 * Enhanced Login Modal
 * Supports both OAuth and email/password authentication with backward compatibility
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useAuth } from '@/contexts/auth-context';
// import {
// 	validateEmail,
// 	validatePassword,
// 	validateDisplayName,
// } from '../../utils/validationUtils';

interface LoginModalProps {
	isOpen: boolean;
	onClose: () => void;

	// Original OAuth-only interface (for backward compatibility)
	onLogin: (provider: 'google' | 'github' | 'crowdin') => void;

	// New enhanced interfaces (optional)
	onEmailLogin?: (credentials: {
		email: string;
		password: string;
	}) => Promise<void>;
	onOAuthLogin?: (provider: 'google' | 'github' | 'crowdin', redirectUrl?: string) => void;
	onRegister?: (data: {
		email: string;
		password: string;
		name?: string;
	}) => Promise<void>;
	error?: string | null;
	onClearError?: () => void;
	
	// Contextual messaging
	actionContext?: string; // e.g., "to star this app", "to fork this project"
	showCloseButton?: boolean;
}

type AuthMode = 'login' | 'register';

export function LoginModal({
	isOpen,
	onClose,
	onLogin, // Original OAuth interface
	onEmailLogin,
	onOAuthLogin,
	onRegister,
	error,
	onClearError,
	actionContext,
	showCloseButton = true,
}: LoginModalProps) {
	const { authProviders, hasOAuth, requiresEmailAuth } = useAuth();
	const [mode, setMode] = useState<AuthMode>('login');
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Form state
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [name, setName] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');

	// Validation errors
	const [validationErrors, setValidationErrors] = useState<
		Record<string, string>
	>({});

	// Determine if enhanced features are available
	const hasEmailAuth = requiresEmailAuth && !!onEmailLogin;
	const hasRegistration = requiresEmailAuth && !!onRegister;
	const showCrowdin = authProviders?.crowdin && hasOAuth;
	const showGitHub = authProviders?.github && hasOAuth;
	const showGoogle = authProviders?.google && hasOAuth;

	const resetForm = () => {
		setEmail('');
		setPassword('');
		setName('');
		setConfirmPassword('');
		setValidationErrors({});
		setShowPassword(false);
		if (onClearError) onClearError();
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	const switchMode = (newMode: AuthMode) => {
		setMode(newMode);
		resetForm();
		setValidationErrors({});
		if (onClearError) onClearError();
	};

	const validateForm = (): boolean => {
		const errors: Record<string, string> = {};

		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!email.trim()) {
			errors.email = 'Email is required';
		} else if (!emailRegex.test(email)) {
			errors.email = 'Invalid email format';
		}

		// Basic password validation
		if (!password) {
			errors.password = 'Password is required';
		} else if (password.length < 8) {
			errors.password = 'Password must be at least 8 characters';
		}

		// Additional validation for registration
		if (mode === 'register') {
			// Name validation
			if (!name.trim()) {
				errors.name = 'Name is required';
			} else if (name.trim().length < 2) {
				errors.name = 'Name must be at least 2 characters';
			}

			// Confirm password validation
			if (password !== confirmPassword) {
				errors.confirmPassword = 'Passwords do not match';
			}
		}

		setValidationErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) return;

		setIsLoading(true);
		try {
			if (mode === 'login' && onEmailLogin) {
				await onEmailLogin({ email, password });
			} else if (mode === 'register' && onRegister) {
				await onRegister({ email, password, name: name.trim() });
			}
			// Don't auto-close here - let the parent handle success/error
		} catch (err) {
			// Error handling is done in the auth context
		} finally {
			setIsLoading(false);
		}
	};

	const handleOAuthClick = (provider: 'google' | 'github' | 'crowdin') => {
		// Use the new interface if available, otherwise fall back to original
		if (onOAuthLogin) {
			// Pass the current URL as redirect URL for context preservation
			onOAuthLogin(provider, window.location.pathname + window.location.search);
		} else {
			onLogin(provider);
		}
	};

	if (!isOpen) return null;

	return createPortal(
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/50 backdrop-blur-md"
						onClick={handleClose}
					/>

					{/* Modal */}
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						transition={{ type: 'spring', duration: 0.5 }}
						className="relative z-10 w-full max-w-md mx-auto my-8"
					>
						<div className="bg-bg-3/95 backdrop-blur-xl text-text-primary border border-border-primary/50 rounded-2xl shadow-2xl overflow-hidden">
							{/* Header */}
							<div className="relative p-6 pb-0">
								{showCloseButton && (
									<button
										onClick={handleClose}
										className="absolute right-4 top-4 p-2 rounded-lg hover:bg-accent transition-colors"
									>
										<X className="h-4 w-4" />
									</button>
								)}

								<div className="text-center space-y-2">
									<div className="mx-auto w-12 h-12 rounded-full bg-text-secondary/10 flex items-center justify-center mb-4">
										<svg
											className="w-6 h-6 text-text-primary"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
											/>
										</svg>
									</div>
									<h2 className="text-2xl font-semibold mb-2">
										{actionContext
											? `Sign in ${actionContext}`
											: hasEmailAuth && mode === 'register'
											? 'Create an account'
											: 'Welcome back'}
									</h2>
									<p className="text-text-tertiary">
										{actionContext
											? 'Authentication required for this action'
											: hasEmailAuth && mode === 'register'
											? 'Join to start building amazing applications'
											: 'Sign in to save your apps and access your workspace'}
									</p>
								</div>
							</div>

							{/* Error display */}
							{error && (
								<div className="mx-6 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
									<AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
									<p className="text-sm text-destructive">
										{error}
									</p>
								</div>
							)}

							{/* Authentication Options */}
							<div className={clsx('p-6 space-y-5 pt-12')}>
								{/* Crowdin */}
								{showCrowdin && (
									<motion.button
										whileTap={{ scale: 0.98 }}
										onClick={() => handleOAuthClick('crowdin')}
										className="w-full group relative overflow-hidden rounded-xl bg-white dark:bg-bg-4 p-4 text-gray-800 dark:text-text-primary transition-all hover:bg-gray-50 dark:hover:bg-bg-4/80 border border-gray-200 dark:border-border-primary disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<div className="relative z-10 flex items-center justify-center gap-3">
											<svg className="h-5 w-5" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
												<path d="M56.6667 80H23.3333C9.16667 80 0 70.8333 0 56.6667V23.0781C0 9.16667 9.16667 0 23.0781 0H56.6667C70.8333 0 80 9.16667 80 23.3333V56.6667C80 70.8333 70.8333 80 56.6667 80Z" fill="#263238"/>
												<path d="M51.3968 54.5041C49.9 54.5041 48.5662 54.0395 47.4621 53.1296C46.1432 52.0583 45.0947 50.4611 45.0576 48.5835C45.0391 47.6352 46.0357 47.6352 46.0357 47.6352C46.0357 47.6352 47.6548 47.616 48.4402 47.616C49.2257 47.6352 49.4554 48.7678 49.4924 49.052C49.7962 51.5976 51.1856 52.7072 52.2526 53.214C52.8936 53.5174 52.7342 54.4657 51.3968 54.508V54.5041Z" fill="white"/>
												<path d="M37.9552 41.5689C36.6363 41.4076 34.6801 41.2694 33.4167 40.9469C31.3679 40.4247 31.4234 38.5164 31.5124 37.8944C31.7606 36.0284 32.4201 34.3006 33.4352 32.6957C34.6986 30.7298 36.514 29.002 38.8481 27.5967C43.2274 24.9666 49.9385 23.3335 56.6667 23.3335C57.9136 23.3335 66.9908 23.3335 66.9908 25.2085C66.9908 26.2502 64.8949 26.1531 63.9824 26.1531C57.1283 26.1531 52.2489 27.1168 48.618 29.2055C45.0391 31.252 42.5456 34.3851 40.8562 39.0232C40.6784 39.4264 40.0893 41.8146 37.9552 41.5727V41.5689Z" fill="white"/>
												<path d="M43.9348 60.7086C40.5337 60.7815 37.3289 59.1881 34.9022 56.4083C32.846 54.0546 31.6085 51.6818 31.3788 48.637C31.238 46.6481 32.0865 45.9609 33.2387 46.0799C34.0352 46.1605 36.5138 46.2834 37.9328 46.5867C38.9962 46.8094 39.7038 47.4199 39.8816 48.6754C40.819 55.3716 44.8944 58.0055 47.3211 58.5738C47.7472 58.6736 48.0102 58.9578 47.9954 59.4684C47.9769 59.956 47.7064 60.6241 43.9385 60.7048L43.9348 60.7086Z" fill="white"/>
												<path d="M34.2464 66.6527C31.8345 66.7564 29.4744 66.2534 28.8001 66.1305C25.9622 65.6084 23.5836 64.7061 21.5459 63.3661C16.6665 60.1639 13.7211 54.5082 13.3691 47.812C13.2802 46.2224 13.0838 43.1853 16.7406 43.4157C18.2485 43.5002 20.6419 44.2527 22.3276 44.7557C24.4209 45.3624 25.4324 47.0364 25.4324 48.6913C25.4324 58.1327 33.3333 64.1667 37.0833 64.1667C37.9429 64.1667 38.3333 64.4452 38.3333 65C38.3333 65.4167 37.9439 66.4953 34.2501 66.6566L34.2464 66.6527Z" fill="white"/>
												<path d="M21.6602 38.9073C20.2338 38.6424 18.8408 38.0319 17.4848 37.6825C13.2908 36.6036 14.0058 32.2188 14.3986 31.017C18.2146 19.3755 30.3298 15.4822 40.1071 14.4417C49.3138 13.4626 58.9467 14.219 67.92 16.8068C68.561 16.9835 70.3282 17.425 69.9466 18.5001C69.565 19.5752 68.5017 18.8265 58.7133 18.6038C55.4863 18.5308 52.263 18.742 49.0286 19.2565C43.4786 20.1319 37.773 21.948 33.1863 25.7799C30.9744 27.6344 29.0293 29.9996 27.7289 32.7948C27.3881 33.5281 27.1213 34.2615 26.8916 34.9948C26.6582 35.7704 25.7838 39.6637 21.6639 38.9112L21.6602 38.9073Z" fill="white"/>
												<path d="M45.1315 41.1541C45.9169 37.5104 48.75 32.0831 59.5833 32.0831C60.8333 32.0831 61.25 32.4998 61.25 32.9165C61.25 33.3331 60.6669 33.7498 60 33.7498C53.4172 33.7498 51.3261 37.7906 49.8071 41.9297C49.3181 43.262 48.2029 43.4617 46.8061 43.2236C45.828 43.0432 44.7647 42.9241 45.1315 41.1541Z" fill="white"/>
											</svg>
											<span className="font-medium">
												Continue with Crowdin
											</span>
										</div>
										<div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-800 to-transparent group-hover:translate-x-full transition-transform duration-700" />
									</motion.button>
								)}

								{/* GitHub */}
								{showGitHub && (
									<motion.button
										whileTap={{ scale: 0.98 }}
										onClick={() => handleOAuthClick('github')}
										// disabled={isLoading}
										className="w-full group relative overflow-hidden rounded-xl bg-gray-900 dark:bg-bg-1 p-4 text-white transition-all hover:bg-gray-800 dark:hover:bg-[#1a1e22] border border-gray-800 dark:border-bg-4 disabled:opacity-50 disabled:cursor-not-allowed"
									>
									<div className="relative z-10 flex items-center justify-center gap-3">
										<svg
											className="h-5 w-5"
											fill="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												fillRule="evenodd"
												clipRule="evenodd"
												d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
											/>
										</svg>
										<span className="font-medium">
											Continue with GitHub
										</span>
									</div>
									<div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full transition-transform duration-700" />
								</motion.button>
								)}

								{/* Google */}
								{showGoogle && (
									<motion.button
									whileTap={{ scale: 0.98 }}
									onClick={() => handleOAuthClick('google')}
									// disabled={isLoading}
									className="w-full group relative overflow-hidden rounded-xl bg-white dark:bg-bg-4 p-4 text-gray-800 dark:text-text-primary transition-all hover:bg-gray-50 dark:hover:bg-bg-4/80 border border-gray-200 dark:border-border-primary disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<div className="relative z-10 flex items-center justify-center gap-3">
										<svg
											className="h-5 w-5"
											viewBox="0 0 24 24"
										>
											<path
												d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
												fill="#4285F4"
											/>
											<path
												d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
												fill="#34A853"
											/>
											<path
												d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
												fill="#FBBC05"
											/>
											<path
												d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
												fill="#EA4335"
											/>
										</svg>
										<span className="font-medium">
											Continue with Google
										</span>
									</div>
									<div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-800 to-transparent group-hover:translate-x-full transition-transform duration-700" />
								</motion.button>
								)}

								{/* Divider (only if both OAuth and email are available) */}
								{hasEmailAuth && hasOAuth && (
									<div className="relative">
										<div className="absolute inset-0 flex items-center">
											<div className="w-full border-t border-border" />
										</div>
										<div className="relative flex justify-center text-xs uppercase">
											<span className="bg-background px-2 text-muted-foreground">Or continue with</span>
										</div>
									</div>
								)}

								{/* Email/Password Form */}
								{hasEmailAuth && (
									<form onSubmit={handleSubmit} className="space-y-4">
										{mode === 'register' && (
											<div>
												<input
													type="text"
													placeholder="Full name"
													value={name}
													onChange={(e) => setName(e.target.value)}
													className={clsx(
														'w-full p-3 rounded-lg border bg-background transition-colors',
														validationErrors.name ? 'border-destructive' : 'border-border focus:border-primary'
													)}
													disabled={isLoading}
												/>
												{validationErrors.name && (
													<p className="mt-1 text-sm text-destructive">{validationErrors.name}</p>
												)}
											</div>
										)}

										<div>
											<input
												type="email"
												placeholder="Email address"
												value={email}
												onChange={(e) => setEmail(e.target.value)}
												className={clsx(
													'w-full p-3 rounded-lg border bg-background transition-colors',
													validationErrors.email ? 'border-destructive' : 'border-border focus:border-primary'
												)}
												disabled={isLoading}
											/>
											{validationErrors.email && (
												<p className="mt-1 text-sm text-destructive">{validationErrors.email}</p>
											)}
										</div>

										<div className="relative">
											<input
												type={showPassword ? 'text' : 'password'}
												placeholder="Password"
												value={password}
												onChange={(e) => setPassword(e.target.value)}
												className={clsx(
													'w-full p-3 pr-10 rounded-lg border bg-background transition-colors',
													validationErrors.password ? 'border-destructive' : 'border-border focus:border-primary'
												)}
												disabled={isLoading}
											/>
											<button
												type="button"
												onClick={() => setShowPassword(!showPassword)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
												disabled={isLoading}
											>
												{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
											</button>
											{validationErrors.password && (
												<p className="mt-1 text-sm text-destructive">{validationErrors.password}</p>
											)}
										</div>

										{mode === 'register' && (
											<div>
												<input
													type="password"
													placeholder="Confirm password"
													value={confirmPassword}
													onChange={(e) => setConfirmPassword(e.target.value)}
													className={clsx(
														'w-full p-3 rounded-lg border bg-background transition-colors',
														validationErrors.confirmPassword ? 'border-destructive' : 'border-border focus:border-primary'
													)}
													disabled={isLoading}
												/>
												{validationErrors.confirmPassword && (
													<p className="mt-1 text-sm text-destructive">{validationErrors.confirmPassword}</p>
												)}
											</div>
										)}

										<motion.button
											type="submit"
											whileTap={{ scale: 0.98 }}
											disabled={isLoading}
											className="w-full bg-primary hover:bg-primary/90 text-primary-foreground p-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{isLoading 
												? (mode === 'register' ? 'Creating account...' : 'Signing in...')
												: (mode === 'register' ? 'Create account' : 'Sign in')
											}
										</motion.button>
									</form>
								)}
							</div>

							{/* Footer */}
							<div className="px-6 pb-6 space-y-4">
								{/* Mode switching (only if registration is available) */}
								{hasRegistration && hasEmailAuth && (
									<div className="text-center">
										<button
											type="button"
											onClick={() =>
												switchMode(
													mode === 'login'
														? 'register'
														: 'login',
												)
											}
											className="text-sm text-text-tertiary hover:text-text-primary transition-colors"
										>
											{mode === 'login' 
												? "Don't have an account? Sign up" 
												: "Already have an account? Sign in"
											}
										</button>
									</div>
								)}

								<p className="text-center text-xs text-text-tertiary">
									By continuing, you agree to our{' '}
									<a
										href="#"
										className="underline hover:text-text-primary"
									>
										Terms of Service
									</a>{' '}
									and{' '}
									<a
										href="#"
										className="underline hover:text-text-primary"
									>
										Privacy Policy
									</a>
								</p>
							</div>
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>,
		document.body,
	);
}
