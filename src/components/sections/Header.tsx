'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { SiteMark } from '@/components/brand/SiteLogo';
import Magnetic from '@/components/ui/Magnetic';
import { SpringButton } from '@jacxishippingorg/jx-ui-react';

const navigation = [
  { name: 'Services', href: '/services' },
  { name: 'Routes', href: '/#route' },
  { name: 'Process', href: '/#process' },
  { name: 'Tracking', href: '/tracking' },
  { name: 'About', href: '/#about' },
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
      setIsScrolled(window.scrollY > 20);
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
      <motion.header
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
        className={`fixed inset-x-0 top-0 z-[100] border-b transition-all duration-300 ease-in-out ${
          isScrolled
            ? 'border-black/5 bg-white/90 backdrop-blur-2xl py-3 shadow-[0_4px_24px_rgba(15,23,42,0.06)]'
            : 'border-transparent bg-transparent py-5'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex shrink-0 items-center">
            <Magnetic strength={0.4} intensity={0.2}>
              <Link
                href="/"
                className="group relative flex items-center gap-3 transition-opacity hover:opacity-85 outline-none"
              >
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-black/10 shadow-sm overflow-hidden">
                  <div className="absolute inset-0 bg-[#D4AF37] translate-y-full transition-transform duration-500 group-hover:translate-y-0" />
                  <SiteMark className="relative z-10 h-6 w-6 text-[#1C1C1E] transition-colors duration-500" />
                </div>
                <span className="text-xl font-bold tracking-tight text-[#1C1C1E] hidden sm:block">
                  JACXI
                </span>
              </Link>
            </Magnetic>
          </div>

          {/* Desktop Nav */}
          <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-1 rounded-full border border-black/10 bg-white/85 shadow-sm px-2 py-1.5 backdrop-blur-md">
            {navigation.map((item) => (
              <Magnetic key={item.name} strength={0.2} intensity={0.1}>
                <Link
                  href={item.href}
                  className="group relative px-5 py-2 text-sm font-semibold text-[#1C1C1E]/80 transition-colors hover:text-[#1C1C1E]"
                >
                  {item.name}
                  <span className="pointer-events-none absolute inset-x-4 bottom-1 h-0.5 scale-x-0 bg-[#D4AF37] transition-transform duration-300 origin-center group-hover:scale-x-100" />
                </Link>
              </Magnetic>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4">
              <Magnetic>
                <Link
                  href={isAuthenticated ? '/dashboard' : '/auth/signin'}
                  className="text-sm font-bold text-[#1C1C1E] transition-colors hover:text-[#6B5C17]"
                >
                  {isAuthenticated ? 'Dashboard' : 'Sign in'}
                </Link>
              </Magnetic>
            </div>

            {/* Mobile menu trigger */}
            <SpringButton
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              className="lg:hidden relative flex h-12 w-12 items-center justify-center rounded-full bg-white/90 border border-black/10 shadow-sm text-[#1C1C1E] backdrop-blur-md transition-colors hover:bg-white outline-none"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </SpringButton>
          </div>
        </div>
      </motion.header>

      {/* Fullscreen Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-[200] flex flex-col bg-slate-950 text-white overflow-y-auto"
          >
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none" />
            <div className="absolute top-0 right-0 h-72 w-72 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex min-h-full flex-col justify-between px-6 py-6 sm:px-8">
              <div className="flex items-center justify-between pb-6 border-b border-white/10">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#D4AF37]/40">
                    <SiteMark className="h-6 w-6" />
                  </div>
                  <span className="text-xl font-extrabold tracking-tight text-white">JACXI</span>
                </Link>
                <SpringButton
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white bg-white/10 hover:bg-white/20 transition-colors outline-none"
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </SpringButton>
              </div>

              <nav aria-label="Mobile navigation" className="my-8 flex flex-col gap-4">
                {navigation.map((item, i) => (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 + i * 0.04, duration: 0.35, ease: 'easeOut' }}
                    key={item.name}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="group flex items-center justify-between py-2 text-2xl sm:text-3xl font-bold tracking-tight text-white/95 hover:text-[#D4AF37] transition-colors"
                    >
                      <span className="relative">
                        {item.name}
                        <span className="absolute -bottom-1 left-0 h-0.5 w-full scale-x-0 bg-[#D4AF37] transition-transform duration-300 origin-left group-hover:scale-x-100" />
                      </span>
                      <span className="text-xs font-mono text-white/50 group-hover:text-[#D4AF37] transition-colors">0{i + 1}</span>
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.35 }}
                className="grid gap-3 pt-6 border-t border-white/10"
              >
                <Link
                  href={isAuthenticated ? '/dashboard' : '/auth/signin'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center h-12 rounded-xl border border-white/20 bg-white/10 font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  {isAuthenticated ? 'Go to Dashboard' : 'Sign In'}
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
