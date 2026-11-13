'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import SiteLogo from '@/components/brand/SiteLogo';
import { KeyRound as VpnKey, CircleCheck as CheckCircle, CircleAlert, CircleQuestionMark as HelpOutline, ArrowRight as ArrowForward, X as Close, ExternalLink as OpenInNew } from 'lucide-react';

type TelegramUser = {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
};

export function TelegramAppClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get('token');
  const targetPath = searchParams.get('target') || '/dashboard';

  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Connecting to Jacxi Shipping...');
  const [isTelegramEnvironment, setIsTelegramEnvironment] = useState(false);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [initDataString, setInitDataString] = useState<string>('');
  const [accessCode, setAccessCode] = useState('');
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showCodeHelp, setShowCodeHelp] = useState(false);

  // Initialize Telegram WebApp or handle direct bridge token
  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      // 1. If bridge token is provided in URL, authenticate immediately
      if (urlToken) {
        setStatusMessage('Logging in securely...');
        try {
          const res = await fetch('/api/auth/telegram-bridge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: urlToken, target: targetPath }),
          });

          if (res.ok) {
            if (isMounted) {
              setStatusMessage('Success! Redirecting to dashboard...');
              window.location.href = targetPath;
            }
            return;
          }
        } catch {
          // Token error, continue to Telegram initData detection
        }
      }

      // 2. Check if running inside Telegram WebApp
      const tg = typeof window !== 'undefined' ? (window as unknown as { Telegram?: { WebApp?: { initData?: string; ready?: () => void; expand?: () => void } } }).Telegram?.WebApp : undefined;

      // Also check hash #tgWebAppData
      let rawInitData = tg?.initData || '';
      if (!rawInitData && typeof window !== 'undefined' && window.location.hash.includes('tgWebAppData=')) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
          rawInitData = hashParams.get('tgWebAppData') || '';
        } catch {
          // ignore
        }
      }

      if (tg) {
        try {
          tg.ready?.();
          tg.expand?.();
        } catch {
          // ignore
        }
      }

      if (rawInitData) {
        if (isMounted) {
          setIsTelegramEnvironment(true);
          setInitDataString(rawInitData);
          setStatusMessage('Verifying Telegram session...');
        }

        try {
          const res = await fetch('/api/auth/telegram-webapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: rawInitData }),
          });

          const data = await res.json();

          if (isMounted) {
            if (res.ok && data.linked) {
              setStatusMessage(`Welcome back, ${data.user.name || 'Customer'}! Loading your dashboard...`);
              window.location.href = targetPath;
              return;
            }

            if (res.ok && !data.linked) {
              setTelegramUser(data.telegramUser);
              setIsLoading(false);
              return;
            }

            if (!res.ok) {
              setErrorMessage(data.error || 'Failed to verify Telegram session.');
              setIsLoading(false);
            }
          }
        } catch {
          if (isMounted) {
            setErrorMessage('Unable to connect to Jacxi services. Please try again.');
            setIsLoading(false);
          }
        }
      } else {
        // Not in Telegram WebApp
        if (isMounted) {
          setIsTelegramEnvironment(false);
          setIsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, [urlToken, targetPath]);

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanCode = accessCode.replace(/[\s\-_]/g, '').trim().toUpperCase();
    if (cleanCode.length !== 8) {
      setErrorMessage('Please enter an 8-character access code (e.g. 83492019 or JACX1234)');
      return;
    }

    setIsSubmittingCode(true);

    try {
      const res = await fetch('/api/auth/telegram-webapp/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: initDataString,
          accessCode: cleanCode,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setSuccessMessage('Account linked successfully! Entering portal...');
        setTimeout(() => {
          window.location.href = targetPath;
        }, 1200);
      } else {
        setErrorMessage(data.error || 'Failed to link account. Please verify your code.');
      }
    } catch {
      setErrorMessage('Network error while linking account. Please try again.');
    } finally {
      setIsSubmittingCode(false);
    }
  };

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />

      <div
        style={{ minHeight: '100vh', backgroundColor: '#0a0d14', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 32, paddingBottom: 32, paddingLeft: 16, paddingRight: 16, position: 'relative' }}
      >
        <div className="mx-auto w-full max-w-[444px]">
          <div
            className="rounded-[32px] border border-[rgba(212,175,55,0.2)] bg-[rgba(18,24,38,0.95)] p-6 text-center shadow-[0_20px_40px_rgba(0,0,0,0.6)] sm:p-8"
            style={{ backdropFilter: 'blur(20px)' }}
          >
            {/* Logo */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <SiteLogo variant="dashboard" className="w-[130px]" priority />
            </div>

            {isLoading ? (
              <div style={{ paddingTop: 48, paddingBottom: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                <span className="inline-block h-9 w-9 animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent" />
                <p style={{ color: '#cbd5e1', fontSize: '0.95rem', fontWeight: 500 }}>
                  {statusMessage}
                </p>
              </div>
            ) : isTelegramEnvironment ? (
              <form onSubmit={handleLinkAccount}>
                <h5
                 
                  style={{ fontWeight: 700, color: '#ffffff', marginBottom: 8, fontSize: '1.25rem' }}
                >
                  Connect Jacxi Account
                </h5>

                <p
                 
                  style={{ color: '#94a3b8', marginBottom: 24, fontSize: '0.875rem', lineHeight: 1.5 }}
                >
                  {telegramUser?.firstName ? (
                    <>Hello <b>{telegramUser.firstName}</b>! </>
                  ) : null}
                  Enter your 8-digit access code to securely link your Telegram and view your shipments.
                </p>

                {errorMessage && (
                  <div
                    role="alert"
                    className="mb-5 flex items-start gap-2 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.15)] p-3 text-left text-[0.85rem] text-[#fca5a5]"
                  >
                    <CircleAlert size={20} className="mt-0.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div
                    role="alert"
                    className="mb-5 flex items-start gap-2 rounded-lg border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.15)] p-3 text-left text-[0.85rem] text-[#86efac]"
                  >
                    <CheckCircle size={20} className="mt-0.5 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2">
                      <VpnKey size={20} style={{ color: '#D4AF37' }} />
                    </span>
                    <input
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.toUpperCase().slice(0, 8))}
                      placeholder="e.g. 83492019 or JACX1234"
                      disabled={isSubmittingCode || !!successMessage}
                      autoComplete="off"
                      autoFocus
                      className="w-full rounded-[24px] border border-[rgba(212,175,55,0.3)] bg-[rgba(15,23,42,0.8)] py-3 pl-10 pr-4 text-center text-[1.1rem] font-bold uppercase text-white outline-none transition-colors placeholder:text-[var(--text-secondary)] hover:border-[rgba(212,175,55,0.6)] focus:border-2 focus:border-[#D4AF37] focus:ring-2 focus:ring-[rgba(212,175,55,0.2)] disabled:opacity-60"
                      style={{ letterSpacing: '3px' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingCode || accessCode.trim().length !== 8 || !!successMessage}
                  className="flex w-full items-center justify-center gap-2 rounded-[24px] py-3 text-[0.95rem] font-bold text-[#0a0d14] shadow-[0_4px_14px_rgba(212,175,55,0.25)] transition-all hover:brightness-110 disabled:bg-[rgba(212,175,55,0.2)] disabled:text-[rgba(255,255,255,0.3)] disabled:shadow-none"
                  style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)' }}
                >
                  {isSubmittingCode ? (
                    <span className="inline-block h-[22px] w-[22px] animate-spin rounded-full border-2 border-[#0a0d14] border-t-transparent" />
                  ) : (
                    <>
                      <span>Connect &amp; Enter Portal</span>
                      <ArrowForward className="h-5 w-5" />
                    </>
                  )}
                </button>

                {/* Help button */}
                <div style={{ marginTop: 20, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowCodeHelp(!showCodeHelp)}
                    className="inline-flex items-center gap-1.5 text-[0.8rem] text-[#94a3b8] transition-colors hover:text-[#D4AF37]"
                  >
                    <HelpOutline size={16} />
                    Where can I find my access code?
                  </button>
                </div>

                {showCodeHelp && (
                  <div
                    style={{ marginTop: 16, padding: 16, borderRadius: 20, backgroundColor: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(148, 163, 184, 0.2)', textAlign: 'left', position: 'relative' }}
                  >
                    <button
                      type="button"
                      aria-label="Close help"
                      onClick={() => setShowCodeHelp(false)}
                      className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center text-[#94a3b8] transition-colors hover:text-[#D4AF37]"
                    >
                      <Close size={16} />
                    </button>
                    <p style={{ color: '#D4AF37', fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
                      How to get your code:
                    </p>
                    <p style={{ color: '#cbd5e1', fontSize: '0.8rem', lineHeight: 1.5 }}>
                      1. Check your shipment invoice or booking PDF.<br />
                      2. Or log into the web portal at jacxishipping.com &gt; Profile.<br />
                      3. Your 8-digit code (e.g. <code>83492019</code>) is shown there.
                    </p>
                  </div>
                )}
              </form>
            ) : (
              <div>
                <h6 style={{ fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>
                  Jacxi Shipping Assistant
                </h6>
                <p style={{ color: '#94a3b8', marginBottom: 24, lineHeight: 1.6 }}>
                  This page is the dedicated launchpad for the Jacxi Shipping Telegram Bot and Mini App.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => window.open('https://t.me/jacxishippingbot', '_blank')}
                    className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-[#229ED9] py-3 font-semibold text-white transition-colors hover:bg-[#1e8bc0]"
                  >
                    <span>Open in Telegram Bot</span>
                    <OpenInNew className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/auth/signin')}
                    className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-[rgba(212,175,55,0.4)] py-3 font-semibold text-[#D4AF37] transition-colors hover:border-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)]"
                  >
                    Standard Portal Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
