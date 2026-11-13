"use client";


import { Suspense, useEffect, useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import SiteLogo from '@/components/brand/SiteLogo';
import { Alert, Button as DSButton } from '@/components/design-system';
import { Eye as Visibility, EyeOff as VisibilityOff, Mail as Email, Lock, ArrowRight as ArrowForward, KeyRound as VpnKey } from 'lucide-react';

// Shared styling for the native email/password inputs (mirrors the old MUI
// TextField look: --background surface, gold focus ring). Worker C's
// migration referenced INPUT_CLS but never defined it.
const INPUT_CLS =
  'w-full rounded-lg border border-[rgba(var(--border-rgb),0.9)] bg-[var(--background)] px-3 py-2 text-[0.875rem] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]';


function SignInPageContent() {
	const { t } = useTranslation();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const callbackUrl = searchParams.get('callbackUrl');
	const portalId = searchParams.get('portalId');
	const redirectTarget = callbackUrl || (portalId ? `/portal/${portalId}` : '/dashboard');
	const simpleLoginHref = useMemo(() => {
		const nextSearchParams = new URLSearchParams();
		if (callbackUrl) {
			nextSearchParams.set('callbackUrl', callbackUrl);
		}
		if (portalId) {
			nextSearchParams.set('portalId', portalId);
		}

		return `/auth/simple-login${nextSearchParams.size ? `?${nextSearchParams.toString()}` : ''}`;
	}, [callbackUrl, portalId]);

	// Auto-detect if running inside Telegram Mini App / WebApp
	useEffect(() => {
		const tg = typeof window !== 'undefined' ? (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp : undefined;
		const hasTgHash = typeof window !== 'undefined' && window.location.hash.includes('tgWebAppData=');
		if (tg?.initData || hasTgHash) {
			const target = callbackUrl || '/dashboard';
			router.replace(`/telegram-app?target=${encodeURIComponent(target)}`);
		}
	}, [callbackUrl, router]);

	const cleanCode = useMemo(() => {
		return email.trim().replace(/[\s\-_]/g, '').toUpperCase();
	}, [email]);

	const isAccessCode = useMemo(() => {
		return cleanCode.length === 8 && /^[A-Z0-9]{8}$/.test(cleanCode);
	}, [cleanCode]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');

		try {
			// If input looks like an 8-character access code
			if (isAccessCode) {
				const codeResult = await signIn('credentials', {
					loginCode: cleanCode,
					redirect: false,
					callbackUrl: redirectTarget,
				});

				if (codeResult?.ok && !codeResult.error) {
					router.replace(codeResult?.url || redirectTarget);
					router.refresh();
					return;
				} else {
					setError('Invalid login code. Please check your 8-character code and try again.');
					return;
				}
			}

			const trimmedEmail = email.trim();
			if (!trimmedEmail) {
				setError('Please enter your email address or 8-character access code');
				return;
			}

			if (!password) {
				setError('Please enter your password');
				return;
			}

			// Normalize email to lowercase for consistent matching
			const normalizedEmail = trimmedEmail.toLowerCase();
			
			const result = await signIn('credentials', {
				email: normalizedEmail,
				password,
				redirect: false,
				callbackUrl: redirectTarget,
			});

			if (result?.error || !result?.ok) {
				setError('Invalid email or password');
			} else {
				router.replace(result?.url || redirectTarget);
				router.refresh();
			}
		} catch {
			setError('An error occurred. Please try again.');
		} finally {
			setIsLoading(false);
		}
	};


	return (
		<div
			className="py-12 px-4 sm:py-20 sm:px-6 lg:px-8"
			style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}
		>
			<motion.div
				initial={{ opacity: 1 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 1.2 }}
				style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
			>
				<div
					style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(var(--accent-gold-rgb), 0.08) 0%, transparent 60%)' }}
				/>
				<div
					style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 45% at 100% 100%, rgba(var(--accent-gold-rgb), 0.04) 0%, transparent 70%)' }}
				/>
			</motion.div>

			{/* Main Content */}
			<motion.div
				// Start visible so SSR HTML is never blank; animation only from a small offset
				initial={{ opacity: 1, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				style={{ maxWidth: 448, width: '100%', position: 'relative', zIndex: 10 }}
			>
				{/* Glass Card */}
				<div
					className="relative overflow-hidden rounded-[32px] border border-[rgba(var(--accent-gold-rgb),0.15)] p-8 shadow-[0_32px_80px_rgba(var(--text-primary-rgb),0.16),0_0_0_1px_rgba(var(--accent-gold-rgb),0.08)] sm:p-10"
					style={{ position: 'relative', backdropFilter: 'blur(20px)', background: 'rgba(var(--panel-rgb), 0.92)', overflow: 'hidden' }}
				>
					<div style={{ position: 'relative', zIndex: 1 }}>
						{/* Header */}
						<div style={{ textAlign: 'center', marginBottom: 24 }}>
							<div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
								<SiteLogo variant="dashboard" className="w-[120px]" priority />
							</div>
							<h3
								
								className="text-[1.875rem] sm:text-4xl"
									style={{ fontWeight: 700, background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent-gold) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}
							>
								{t('auth.signIn')}
							</h3>
							<p
								
								style={{ color: 'var(--text-secondary)' }}
							>
								{t('auth.signInSubtitle')}
							</p>
						</div>

						{/* Error Message */}
						{error && (
							<Alert severity="error" className="mb-4">
								{error}
							</Alert>
						)}

						{/* Form */}
						<form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
							{/* Email or Access Code Field */}
							<div>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
									<label
										
										htmlFor="email"
										style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}
									>
										{isAccessCode ? '8-Character Access Code' : `${t('auth.email')} or Access Code`}
									</label>
									{isAccessCode && (
										<p
											style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8D7A1F', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.12)', paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2, borderRadius: 8 }}
										>
											Access code detected
										</p>
									)}
								</div>
							<div className="relative">
								<span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2">
									{isAccessCode ? (
										<VpnKey size={20} style={{ color: 'var(--accent-gold)' }} />
									) : (
										<Email size={20} style={{ color: 'var(--text-secondary)' }} />
									)}
								</span>
								<input
									id="email"
									type="text"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									placeholder="Enter email or 8-character code (e.g. C24FBSUX)"
									autoComplete="username"
									className={INPUT_CLS + " pl-9"}
									style={isAccessCode ? { letterSpacing: '0.18em', fontWeight: 700 } : undefined}
								/>
							</div>
							</div>

							{/* Password Field - Hidden/not required when entering an 8-character access code */}
							{!isAccessCode && (
								<div>
									<label
										
										htmlFor="password"
										style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}
									>
										{t('auth.password')}
									</label>
							<div className="relative">
								<span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2">
									<Lock size={20} style={{ color: 'var(--text-secondary)' }} />
								</span>
								<input
									id="password"
									type={showPassword ? 'text' : 'password'}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="Enter your password"
									autoComplete="current-password"
									className={INPUT_CLS + " pl-9 pr-12"}
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									aria-label={showPassword ? 'Hide password' : 'Show password'}
									className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[#8D7A1F] hover:text-[#6B5C17]"
								>
									{showPassword ? (
										<VisibilityOff size={20} />
									) : (
										<Visibility size={20} />
									)}
								</button>
							</div>
								</div>
							)}

							{/* Submit Button */}
						<button
							type="submit"
							disabled={isLoading}
							className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-base font-semibold text-[var(--text-primary)] shadow-[0_4px_14px_rgba(var(--accent-gold-rgb),0.25)] transition-all hover:shadow-[0_4px_14px_rgba(var(--accent-gold-rgb),0.35)] disabled:opacity-60"
							style={{ background: 'linear-gradient(135deg, var(--accent-gold) 0%, #B8960C 100%)' }}
						>
							{isLoading ? (
								<span className="flex items-center gap-2">
									<span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
									<span>{t('auth.signingIn')}</span>
								</span>
							) : (
								<span className="flex items-center gap-2">
									<span>{isAccessCode ? 'Login with Access Code' : t('auth.signIn')}</span>
									<ArrowForward className="h-5 w-5" />
								</span>
							)}
						</button>
						</form>

						{/* Sign Up Link */}
						<div style={{ textAlign: 'center', paddingTop: 16 }}>
							<p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
								{t('auth.dontHaveAccount')}{' '}
								<button
									
									type="button"
									onClick={() => router.push('/auth/signup')}
									className="hover:text-[#6B5C17]"
										style={{ background: 'none', border: 'none', // Gold-800 from the design token scale: passes AA on white panels (gold-500 is too light for text)
										color: '#8D7A1F', fontWeight: 600, minHeight: 36, paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 4, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', transition: 'color 0.2s ease' }}
								>
									{t('auth.signUp')}
								</button>
							</p>
						</div>

						{/* Short Code Login Link */}
						<div style={{ textAlign: 'center', paddingTop: 16, marginTop: 16, borderTop: '1px solid var(--border)' }}>
							<p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
								Have a login code?
							</p>
							<DSButton
								variant="outline"
								size="sm"
								onClick={() => router.push(simpleLoginHref)}
								sx={{
									borderColor: 'rgba(var(--accent-gold-rgb), 0.22)',
									color: 'var(--text-primary)',
									'&:hover': {
										borderColor: 'var(--accent-gold)',
										bgcolor: 'rgba(var(--accent-gold-rgb), 0.06)',
									},
								}}
							>
								Login with 8-character code
							</DSButton>
						</div>
					</div>
				</div>
			</motion.div>
		</div>
	);
}

// useSearchParams() must sit under a Suspense boundary or static
// prerendering fails (missing-suspense-with-csr-bailout).
export default function SignInPage() {
  return (
    <Suspense fallback={<div aria-busy="true" style={{ minHeight: '50vh' }} />}>
      <SignInPageContent />
    </Suspense>
  );
}
