'use client';

import { useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { getPortalBrandIdentity } from '@/lib/partner-portal-branding';
import { SiteMark } from '@/components/brand/SiteLogo';
import { useSiteBranding } from '@/hooks/useSiteBranding';
import { KeyRound as VpnKey, ArrowRight as ArrowForward, LogIn as LoginOutlined } from 'lucide-react';
import { Alert } from '@/components/design-system';

type PortalLoginBranding = {
  id: string;
  name: string;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
};

type SimpleLoginPageClientProps = {
  portal: PortalLoginBranding | null;
};

export default function SimpleLoginPageClient({ portal }: SimpleLoginPageClientProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { branding } = useSiteBranding();
	const [loginCode, setLoginCode] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const brand = useMemo(() => getPortalBrandIdentity(portal), [portal]);
	const activeLogoUrl = brand.logoUrl || branding.logoUrl;
	const callbackUrl = searchParams.get('callbackUrl');
	const redirectTarget = callbackUrl || (portal?.id ? `/portal/${portal.id}` : '/dashboard');
	const staffLoginHref = useMemo(() => {
		const nextSearchParams = new URLSearchParams();
		if (callbackUrl) {
			nextSearchParams.set('callbackUrl', callbackUrl);
		}
		if (portal?.id) {
			nextSearchParams.set('portalId', portal.id);
		}

		return `/auth/signin${nextSearchParams.size ? `?${nextSearchParams.toString()}` : ''}`;
	}, [callbackUrl, portal?.id]);

	const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
		setLoginCode(sanitized.slice(0, 8));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError('');

		const clean = loginCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
		if (clean.length !== 8) {
			setError('Login code must be 8 characters');
			setIsLoading(false);
			return;
		}

		try {
			const result = await signIn('credentials', {
				loginCode: clean,
				redirect: false,
				callbackUrl: redirectTarget,
			});

			if (result?.error || !result?.ok) {
				setError('Invalid login code. Please check your code and try again.');
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

	if (!portal) {
		return (
			<div
				className="py-12 px-4 sm:py-20 sm:px-6 lg:px-8" style={{ minHeight: '100vh', backgroundColor: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
			>
				<motion.div
					// Start visible so SSR HTML is never blank; animation only from a small offset
					initial={{ opacity: 1, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					style={{ maxWidth: 448, width: '100%', position: 'relative', zIndex: 10 }}
				>
					<div
						className="relative overflow-hidden rounded-[32px] border border-[rgba(var(--panel-rgb),0.9)] bg-[var(--panel)] p-8 shadow-[0_25px_60px_rgba(var(--text-primary-rgb),0.12)] sm:p-10"
						style={{ position: 'relative', overflow: 'hidden' }}
					>
						<div style={{ position: 'relative', zIndex: 1 }}>
							<div style={{ textAlign: 'center', marginBottom: 24 }}>
								<div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
									{activeLogoUrl ? (
										<img src={activeLogoUrl} alt="Jacxi Shipping logo" style={{ width: 72, height: 72, borderRadius: 20, objectFit: 'contain', backgroundColor: '#ffffff', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 10px 24px rgba(15,23,42,0.10)' }} />
									) : (
										<SiteMark size={72} />
									)}
								</div>
								<h3
									
									className="text-[1.875rem] sm:text-4xl" style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}
								>
									Login with Code
								</h3>
								<p
									
									style={{ color: 'var(--text-secondary)' }}
								>
									Enter your 8-character access code to continue.
								</p>
							</div>

							{error && (
							<Alert severity="error" className="mb-4">
									{error}
								</Alert>
							)}

							<form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
								<div>
									<label
										
										htmlFor="loginCode"
										style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}
									>
										8-Character Code
									</label>
								<div className="relative">
									<span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2">
										<VpnKey size={20} style={{ color: 'var(--text-secondary)' }} />
									</span>
									<input
										id="loginCode"
										type="password"
										value={loginCode}
										onChange={handleCodeChange}
										required
										placeholder="Enter your 8-character code"
										autoComplete="off"
										autoFocus
										className="w-full rounded-2xl border border-[rgba(var(--panel-rgb),0.9)] bg-[var(--background)] py-2 pl-10 pr-10 text-center text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] placeholder:tracking-normal placeholder:font-medium hover:border-[var(--panel)] focus:border-2 focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]"
										style={{ letterSpacing: '0.28em', fontWeight: 600 }}
									/>
								</div>
								</div>

							<button
								type="submit"
								disabled={isLoading || loginCode.length !== 8}
								className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-gold)] py-3 text-base font-semibold text-[#09090B] transition-colors hover:bg-[var(--accent-gold)] hover:brightness-105 disabled:bg-[rgba(var(--accent-gold-rgb),0.5)] disabled:text-[rgba(9,9,11,0.55)]"
							>
								{isLoading ? (
									<span className="flex items-center gap-2">
										<span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" style={{ color: '#09090B' }} />
										<span>Signing in...</span>
									</span>
								) : (
									<span className="flex items-center gap-2">
										<span>Login with Code</span>
										<ArrowForward className="h-5 w-5" />
									</span>
								)}
							</button>
							</form>

							<div style={{ textAlign: 'center', paddingTop: 16, marginTop: 16, borderTop: '1px solid var(--border)' }}>
								<p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
									Prefer email and password?
								</p>
								<button
									
									type="button"
									onClick={() => router.push('/auth/signin')}
									style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline', transition: 'color 0.2s ease' }}
								>
									Back to Sign In
								</button>
							</div>
						</div>
					</div>
				</motion.div>
			</div>
		);
	}

	return (
		<div
			className="py-12 px-4 sm:py-20 sm:px-6 lg:px-8" style={{ minHeight: '100vh', background: `radial-gradient(circle at top left, rgba(${brand.accentRgb},0.22), transparent 26%), radial-gradient(circle at 82% 18%, rgba(${brand.accentRgb},0.12), transparent 22%), linear-gradient(180deg, #f8fafc 0%, #eef2f7 50%, #ffffff 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', }}
		>
			<motion.div
				// Start visible so SSR HTML is never blank; animation only from a small offset
				initial={{ opacity: 1, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				style={{ maxWidth: 560, width: '100%', position: 'relative', zIndex: 10 }}
			>
				<div
					className="relative overflow-hidden rounded-[40px] border border-[rgba(255,255,255,0.85)] bg-[rgba(255,255,255,0.9)] p-8 shadow-[0_30px_80px_rgba(var(--text-primary-rgb),0.14)] sm:p-12"
					style={{ position: 'relative', backdropFilter: 'blur(18px)', overflow: 'hidden' }}
				>
					<div style={{ position: 'absolute', inset: 'auto -10% -26% auto', width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, rgba(${brand.accentRgb},0.24), rgba(${brand.accentRgb},0.02) 70%, transparent 75%)` }} />
					<div style={{ position: 'relative', zIndex: 1 }}>
						<div style={{ textAlign: 'center', marginBottom: 36, display: 'grid', gap: 11.2 }}>
							<div style={{ display: 'flex', justifyContent: 'center' }}>
								{activeLogoUrl ? (
									<img src={activeLogoUrl} alt={`${brand.companyLabel || branding.companyName || 'Jacxi'} logo`} style={{ width: 84, height: 84, borderRadius: 32, objectFit: 'contain', backgroundColor: 'rgba(255,255,255,0.92)', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 18px 34px rgba(15,23,42,0.12)' }} />
								) : (
									<div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 84, height: 84, borderRadius: 32, backgroundColor: `rgba(${brand.accentRgb}, 0.14)`, color: brand.accentColor, boxShadow: `0 16px 32px rgba(${brand.accentRgb},0.16)` }}>
										<VpnKey size={40} style={{ color: brand.accentColor }} />
									</div>
								)}
							</div>
							<p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: brand.accentColor }}>
								{portal ? `${brand.companyLabel} Portal` : 'Customer Login'}
							</p>
							<h3
								
								className="text-[2.2rem] sm:text-[2.9rem]" style={{ fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 0.95 }}
							>
								{portal ? `Access ${brand.companyLabel}` : 'Enter Your Login Code'}
							</h3>
							<p
								
								style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', lineHeight: 1.75, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}
							>
								{portal
									? 'Use the 8-character code shared by your portal team to open your branded customer workspace.'
									: 'Enter your 8-character login code to open your customer workspace.'}
							</p>
						</div>

						{error && (
						<Alert severity="error" className="mb-6">
								{error}
							</Alert>
						)}

						<form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
							<div>
								<label htmlFor="loginCode" style={{ display: 'block', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
									Login Code
								</label>
							<div className="relative" style={{ '--portal-accent': brand.accentColor, '--portal-accent-rgb': brand.accentRgb } as React.CSSProperties}>
								<span className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2">
									<VpnKey size={24} style={{ color: brand.accentColor }} />
								</span>
								<input
									id="loginCode"
									type="password"
									value={loginCode}
									onChange={handleCodeChange}
									required
									placeholder="Enter 8-character code"
									autoComplete="off"
									autoFocus
									className="w-full rounded-[28px] border-2 border-[rgba(var(--portal-accent-rgb),0.2)] bg-[rgba(255,255,255,0.88)] py-4 pl-14 pr-14 text-center text-[1.5rem] font-bold text-[var(--text-primary)] outline-none transition-colors placeholder:text-[1rem] placeholder:font-normal placeholder:tracking-normal placeholder:opacity-70 hover:border-[var(--portal-accent)] focus:border-[3px] focus:border-[var(--portal-accent)]"
									style={{ letterSpacing: '0.3em' }}
								/>
							</div>
								<p style={{ display: 'block', marginTop: 8, color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>
									{loginCode.length}/8 characters
								</p>
							</div>

						<button
							type="submit"
							disabled={isLoading || loginCode.length !== 8}
							className="flex w-full items-center justify-center gap-2 rounded-[28px] bg-[linear-gradient(135deg,var(--portal-accent),rgba(var(--portal-accent-rgb),0.82))] py-4 text-lg font-extrabold text-white shadow-[0_18px_36px_rgba(var(--portal-accent-rgb),0.28)] transition-all hover:-translate-y-px hover:bg-[linear-gradient(135deg,var(--portal-accent),rgba(var(--portal-accent-rgb),0.88))] disabled:bg-[rgba(var(--portal-accent-rgb),0.45)] disabled:text-[rgba(255,255,255,0.88)]"
							style={{ '--portal-accent': brand.accentColor, '--portal-accent-rgb': brand.accentRgb } as React.CSSProperties}
						>
							{isLoading ? (
								<span className="flex items-center gap-2 font-extrabold">
									<span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" style={{ color: '#ffffff' }} />
									<span>Logging in...</span>
								</span>
							) : (
								<span className="flex items-center gap-2 font-extrabold">
									<span>Open Portal</span>
									<ArrowForward className="h-5 w-5" />
								</span>
							)}
						</button>
						</form>

						<div style={{ textAlign: 'center', paddingTop: 32, marginTop: 32, borderTop: `1px solid rgba(${brand.accentRgb}, 0.14)`, display: 'grid', gap: 10 }}>
							<p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
								Prefer email and password instead?
							</p>
							<button
								type="button"
								onClick={() => router.push(staffLoginHref)}
								className="inline-flex items-center gap-2 rounded-[24px] px-6 py-3 text-[0.9375rem] font-semibold transition-colors"
								style={{ border: `2px solid rgba(${brand.accentRgb}, 0.26)`, color: brand.accentColor, background: 'transparent', cursor: 'pointer' }}
								onMouseEnter={(e) => {
									e.currentTarget.style.borderColor = brand.accentColor;
									e.currentTarget.style.backgroundColor = `rgba(${brand.accentRgb},0.06)`;
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.borderColor = `rgba(${brand.accentRgb}, 0.26)`;
									e.currentTarget.style.backgroundColor = 'transparent';
								}}
							>
								<LoginOutlined size={20} />
								Sign In With Email
							</button>
						</div>
					</div>
				</div>
			</motion.div>
		</div>
	);
}