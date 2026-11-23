'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Bell, ChevronRight, MapPin, Receipt, ShieldCheck, Smartphone } from 'lucide-react';
import Link from 'next/link';

const features = [
  { icon: <MapPin className="h-5 w-5" aria-hidden="true" />, title: 'Live tracking', description: 'Follow active shipments as they move through pickup, port, transit, customs, and final delivery.' },
  { icon: <Receipt className="h-5 w-5" aria-hidden="true" />, title: 'Invoices & receipts', description: 'Review balances, documents, and payment details from the customer portal.' },
  { icon: <Bell className="h-5 w-5" aria-hidden="true" />, title: 'Milestone alerts', description: 'Receive status updates when important shipment or document events are posted.' },
];

export default function MobileAppPromoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const springScroll = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const yPhone = useTransform(springScroll, [0, 1], [60, -60]);
  const rotatePhone = useTransform(springScroll, [0.2, 0.8], [1.5, -1.5]);
  const yWidget = useTransform(springScroll, [0, 1], [-30, 30]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-white py-16 sm:py-20 lg:py-24 text-[#1C1C1E]">
      <div
        className="absolute inset-0 bg-[#f8f8f8] opacity-50 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        {/* Left Content */}
        <div className="max-w-2xl relative z-10 lg:pl-6">
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: 'circOut' }}
            className="mb-6 h-1 w-20 bg-[#D4AF37] origin-left rounded-full"
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[#5F6368] font-mono">Customer portal</p>
            <h2 className="mt-4 text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-tight text-[#1C1C1E]">
              Shipment visibility <br /> from the browser in your pocket.
            </h2>
            <p className="mt-6 text-base sm:text-xl leading-relaxed text-[#5F6368] font-medium max-w-lg">
              Access shipment updates, invoices, receipts, and documents directly from your browser without installing a separate app.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="group flex gap-4 sm:gap-5 rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-inner">
                  {feature.icon}
                </div>
                <div>
                  <p className="font-bold text-[#1C1C1E] text-base sm:text-lg">{feature.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#5F6368]">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45 }}
            className="mt-10"
          >
            <Link
              href="/auth/signin"
              className="group relative inline-flex h-14 sm:h-16 items-center gap-3 overflow-hidden rounded-xl bg-[#1C1C1E] px-8 sm:px-10 text-base font-bold text-white shadow-lg transition-all"
            >
              <div className="absolute inset-0 bg-[#D4AF37] translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0" />
              <span className="relative z-10 group-hover:text-[#1C1C1E] transition-colors duration-300">Access portal</span>
              <ChevronRight className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#1C1C1E]" aria-hidden="true" />
            </Link>
          </motion.div>
        </div>

        {/* Right Content — Responsive Phone Preview (visible on mobile, tablet, and desktop) */}
        <div className="relative mx-auto w-full max-w-[340px] lg:max-w-[400px] py-6 lg:py-0 lg:h-[720px] flex items-center justify-center perspective-1000">
          {/* Floating Milestone Widget */}
          <motion.div
            style={prefersReducedMotion ? undefined : { y: yWidget }}
            className="hidden sm:flex absolute -left-4 bottom-16 z-30 items-center gap-3.5 rounded-2xl border border-[#E5E7EB] bg-white/95 p-4 text-[#1C1C1E] shadow-lg backdrop-blur-xl"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#D1FAE5] text-[#047857]">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold">Cleared customs</p>
              <p className="text-xs font-semibold text-[#5F6368]">Transit milestone</p>
            </div>
          </motion.div>

          {/* Phone Mockup Frame */}
          <motion.div
            style={prefersReducedMotion ? undefined : { y: yPhone, rotateZ: rotatePhone }}
            className="relative z-20 aspect-[9/17] lg:aspect-[9/18] w-full overflow-hidden rounded-[2.5rem] border-[10px] border-[#1C1C1E] bg-white shadow-xl shadow-black/15"
            aria-label="JACXI Customer Portal mobile interface preview"
          >
            <div className="absolute left-1/2 top-0 z-30 h-6 w-1/3 -translate-x-1/2 rounded-b-2xl bg-[#1C1C1E]" />

            <div className="flex h-full flex-col bg-[#F9FAFB] pt-12 text-[#1C1C1E]">
              <div className="px-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#5F6368] uppercase tracking-wider">Welcome back</p>
                    <p className="text-xl font-bold tracking-tight">Ahmad Logistics</p>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-black/5 flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-[#1C1C1E]" aria-hidden="true" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 px-5">
                <div className="rounded-2xl bg-[#1C1C1E] p-4 text-white relative overflow-hidden shadow-md">
                  <div className="absolute -right-4 -top-4 h-14 w-14 rounded-full bg-white/10" />
                  <p className="text-xs font-bold uppercase tracking-wider text-white/75">Active</p>
                  <p className="mt-1.5 text-3xl font-bold tabular-nums">12</p>
                </div>
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5F6368]">Balance</p>
                  <p className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums">$4.2K</p>
                </div>
              </div>

              <div className="mt-4 flex-1 px-5 pb-5">
                <div className="h-full rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">Live route</p>
                    <span className="rounded-lg bg-[#D1FAE5] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#047857]">In transit</span>
                  </div>

                  <div className="relative mt-4 flex-1 min-h-[120px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
                    <div className="absolute inset-0 bg-[url('/world-map.svg')] bg-cover bg-center bg-no-repeat opacity-[0.22]" />

                    {/* GPU-composited progress bar (scaleX instead of width layout thrashing) */}
                    <div className="absolute left-5 right-5 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-black/10 overflow-hidden">
                      <motion.div
                        className="h-full w-full origin-left rounded-full bg-[#D4AF37]"
                        animate={prefersReducedMotion ? { scaleX: 0.65 } : { scaleX: [0.15, 0.92, 0.15] }}
                        transition={{ duration: 4.5, repeat: prefersReducedMotion ? 0 : Infinity, ease: 'easeInOut' }}
                      />
                    </div>

                    <div className="absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-[#1C1C1E] shadow" />
                    <div className="absolute right-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-[#D4AF37] shadow" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
