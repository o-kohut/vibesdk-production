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
import { Button } from '@/components/ui/button.tsx';
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
						<div className="bg-background backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
							{/* Header */}
							<div className="relative p-6 pb-0">
								{showCloseButton && (
									<Button
										onClick={handleClose}
										className="absolute right-4 top-4 p-2"
										variant="ghost"
									>
										<X className="h-4 w-4" />
									</Button>
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
							<div className={clsx('p-6 space-y-5 pt-8')}>
								{/* Crowdin */}
								{showCrowdin && (
									<motion.button
										whileTap={{ scale: 0.98 }}
										onClick={() => handleOAuthClick('crowdin')}
										className="w-full group relative overflow-hidden rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 p-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<div className="relative z-10 flex items-center justify-center gap-3">
											<div className="w-6 h-6 text-background">
												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
													<g clipPath="url(#clip0_16230_3343)">
														<path d="M17 0C18.1097 0 19.1174 0.184561 20 0.535156C20.8097 0.856826 21.5139 1.31867 22.0957 1.9043C22.693 2.50553 23.1627 3.23232 23.4863 4.06836C23.8214 4.93431 24 5.91735 24 7V17C24 18.1097 23.8154 19.1174 23.4648 20C23.1431 20.8097 22.6813 21.5139 22.0957 22.0957C21.5108 22.6768 20.8075 23.1376 20 23.46C19.1176 23.8124 18.1112 24 17 24H7C5.88564 24 4.87442 23.8134 3.98926 23.46C3.18418 23.1386 2.48348 22.6787 1.9043 22.0957C1.32324 21.5108 0.862517 20.8075 0.540039 20C0.187654 19.1176 0 18.1112 0 17V6.91992C8.6652e-06 5.87475 0.173869 4.91647 0.5 4.06836C0.822883 3.22883 1.29559 2.49737 1.89648 1.89648C2.47565 1.31731 3.1759 0.856749 3.97754 0.535156C4.8478 0.186081 5.83733 8.97537e-06 6.91992 0H17ZM5.02441 13.0234C3.92872 12.9515 3.98362 13.8637 4.01562 14.3438C4.11963 16.3516 5.00787 18.0478 6.47168 19.0078C7.07956 19.4077 7.79968 19.6798 8.64746 19.8398C8.84746 19.8798 9.56022 20.024 10.2803 20C11.3914 19.952 11.5038 19.632 11.5039 19.5039C11.5037 19.3362 11.3837 19.2559 11.1279 19.2559V19.248C9.99985 19.248 7.63184 17.4394 7.63184 14.6074C7.63157 14.1117 7.32771 13.6078 6.7041 13.4238C6.20027 13.2719 5.48041 13.0476 5.02441 13.0234ZM9.96777 13.8232C9.62396 13.7914 9.36834 13.9922 9.4082 14.5918C9.48022 15.5037 9.84803 16.216 10.4639 16.9199C11.1918 17.7518 12.1519 18.232 13.1758 18.208C14.303 18.184 14.3835 17.984 14.3916 17.832C14.3915 17.6803 14.3193 17.5915 14.1914 17.5596V17.5674C13.4633 17.3991 12.2399 16.607 11.96 14.5996C11.9039 14.2239 11.6958 14.0396 11.376 13.9756C10.952 13.8876 10.2077 13.8472 9.96777 13.8232ZM13.8154 14.2793C13.8025 14.2794 13.52 14.2866 13.5195 14.5674C13.5275 15.1273 13.8483 15.6077 14.2402 15.9277C14.5682 16.1996 14.968 16.3437 15.4238 16.3438C15.8238 16.3357 15.8717 16.048 15.6797 15.96C15.3597 15.8079 14.9435 15.4716 14.8555 14.7119H14.8477C14.8395 14.6234 14.7676 14.2875 14.5361 14.2793H13.8154ZM17.8721 9.62402C14.6244 9.62402 13.7762 11.2558 13.5361 12.3438C13.4242 12.8717 13.7441 12.9118 14.04 12.9678C14.456 13.0397 14.7923 12.9752 14.9443 12.5752C15.4003 11.3355 16.0245 10.1201 18 10.1201C18.1998 10.1201 18.3756 9.99195 18.376 9.87207C18.3757 9.75218 18.2475 9.62402 17.8799 9.62402H17.8721ZM17 7C15.9686 7 14.9371 7.12758 14 7.3584C13.1057 7.57868 12.2969 7.89264 11.6562 8.2793C10.9524 8.7032 10.4082 9.21578 10.0322 9.80762C9.72828 10.2876 9.52809 10.8083 9.45605 11.3682C9.43209 11.5526 9.41699 12.1274 10.0244 12.2793C10.4004 12.3752 10.9919 12.4159 11.3838 12.4639C12.0231 12.5358 12.1997 11.8252 12.2559 11.7041C12.7599 10.3123 13.5121 9.37572 14.584 8.75977C15.2379 8.3848 16.0277 8.13098 17 7.98828C17.6456 7.89354 18.372 7.84766 19.1924 7.84766C19.4646 7.84769 20.0957 7.87923 20.0957 7.56738C20.0948 7.32834 19.5982 7.19068 19 7.1123C18.1985 7.00728 17.2152 7.00781 17 7.00781V7ZM17 4.3623C15.344 4.16626 13.6642 4.15784 12.0322 4.32812C10.5939 4.48097 8.98789 4.83842 7.58984 5.5752C6.13428 6.34233 4.90391 7.52068 4.32031 9.30371C4.20032 9.6637 3.98414 10.9837 5.24805 11.3037C5.65599 11.4077 6.07197 11.5919 6.50391 11.6719C7.73536 11.8958 8.00013 10.7288 8.07227 10.4961C8.14422 10.2723 8.22439 10.0558 8.32031 9.83203C8.71231 8.99216 9.29604 8.27947 9.95996 7.72754C11.3359 6.5757 13.048 6.03157 14.7119 5.76758C15.6799 5.61558 16.6482 5.5512 17.6162 5.5752C18.163 5.58712 18.6192 5.60555 19 5.62402C19.4164 5.64421 19.743 5.665 20 5.68164C20.7697 5.7315 20.916 5.73904 20.9844 5.54395C21.0959 5.22422 20.568 5.08804 20.376 5.04004C19.9227 4.9092 19.4634 4.79399 19 4.69434C18.3404 4.55252 17.6721 4.44187 17 4.3623Z" fill="currentColor"/>
													</g>
													<defs>
														<clipPath id="clip0_16230_3343">
															<rect width="24" height="24" fill="white"/>
														</clipPath>
													</defs>
												</svg>
											</div>
											<span className="font-medium">
												Continue with Crowdin
											</span>
										</div>
										<div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gray-100/10 dark:via-white to-transparent group-hover:translate-x-full transition-transform duration-700" />
									</motion.button>
								)}

								{/* GitHub */}
								{showGitHub && (
									<motion.button
										whileTap={{ scale: 0.98 }}
										onClick={() => handleOAuthClick('github')}
										// disabled={isLoading}
										className="w-full group relative overflow-hidden rounded-lg bg-gray-900 dark:bg-bg-1 p-4 text-white transition-all hover:bg-gray-800 dark:hover:bg-[#1a1e22] border border-gray-800 dark:border-bg-4 disabled:opacity-50 disabled:cursor-not-allowed"
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
									className="w-full group relative overflow-hidden rounded-lg bg-white dark:bg-bg-4 p-4 text-gray-800 dark:text-text-primary transition-all hover:bg-gray-50 dark:hover:bg-bg-4/80 border border-gray-200 dark:border-border-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
									<div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-600 to-transparent group-hover:translate-x-full transition-transform duration-700" />
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
