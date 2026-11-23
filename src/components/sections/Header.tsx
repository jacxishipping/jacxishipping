'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { SiteMark } from '@/components/brand/SiteLogo';

const navigation = [
  { name: 'Services', href: '/services' },
  { name: 'Routes', href: '/#route' },
  { name: 'Process', href: '/#process' },
  { name: 'Estimator', href: '/#calculator' },
  { name: 'Tracking', href: '/tracking' },
  { name: 'Contact', href: '/#contact' },
];

export default function Header({ isAuthenticated: isAuthenticatedProp }: { isAuthenticated?: boolean }) {
  const [clientAuthenticated, setClientAuthenticated] = useState(false);
  const isAuthenticated = isAuthenticatedProp ?? clientAuthenticated;
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticatedProp !== undefined) return;
    const controller = new AbortController();
    fetch('/api/auth/session', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setClientAuthenticated(true);
      })
      .catch(() => {
        // Ignore session lookup errors on public pages
      });
    return () => controller.abort();
  }, [isAuthenticatedProp]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll and support Escape dismissal when mobile drawer is open
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-[100] h-16 border-b transition-colors duration-200 ${
          isScrolled
            ? 'border-[#E5E7EB] bg-white/95 backdrop-blur-md'
            : 'border-transparent bg-white/80 backdrop-blur-sm'
        }`}
      >
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[#1C1C1E] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 rounded-md"
          >
            <SiteMark size={28} className="h-7 w-7 shrink-0" />
            <span className="text-base font-semibold tracking-tight text-[#1C1C1E]">
              JACXI
            </span>
          </Link>

          <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-7">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-[#5F6368] transition-colors hover:text-[#1C1C1E]"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={isAuthenticated ? '/dashboard' : '/auth/signin'}
              className="hidden sm:inline-flex h-9 items-center px-3 text-sm font-medium text-[#5F6368] transition-colors hover:text-[#1C1C1E]"
            >
              {isAuthenticated ? 'Dashboard' : 'Sign in'}
            </Link>

            <Link
              href="/#quote"
              className="hidden sm:inline-flex h-9 items-center justify-center rounded-lg bg-[#1C1C1E] px-4 text-sm font-medium text-white transition-colors hover:bg-[#333336]"
            >
              Get a quote
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#1C1C1E] transition-colors hover:bg-[#F9FAFB]"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          className="fixed inset-0 z-[200] flex flex-col bg-white text-[#1C1C1E] overflow-y-auto"
        >
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between border-b border-[#E5E7EB] px-4 h-16 sm:px-6">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2.5"
            >
              <SiteMark size={28} className="h-7 w-7 shrink-0" />
              <span className="text-base font-semibold tracking-tight text-[#1C1C1E]">JACXI</span>
            </Link>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#1C1C1E] transition-colors hover:bg-[#F9FAFB]"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-1 flex-col justify-between px-4 py-8 sm:px-6">
            <nav aria-label="Mobile navigation" className="divide-y divide-[#E5E7EB] border-b border-[#E5E7EB]">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex min-h-[52px] items-center justify-between text-lg font-medium text-[#1C1C1E] transition-colors hover:text-[#6B5C17]"
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="mt-8 grid gap-3">
              <Link
                href="/#quote"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-12 items-center justify-center rounded-lg bg-[#1C1C1E] text-sm font-medium text-white transition-colors hover:bg-[#333336]"
              >
                Get a free quote
              </Link>
              <Link
                href={isAuthenticated ? '/dashboard' : '/auth/signin'}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-12 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-[#1C1C1E] transition-colors hover:bg-[#F9FAFB]"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Sign in'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
