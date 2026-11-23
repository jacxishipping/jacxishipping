'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform, useSpring, type Variants } from 'framer-motion';
import {
  ArrowRight,
  CirclePlay,
  FileCheck,
  ShieldCheck,
  Ship,
  Truck,
  CheckCircle,
} from 'lucide-react';
import Magnetic from '@/components/ui/Magnetic';
import HeroTrackingForm from '@/components/sections/home/HeroTrackingForm';

const corridorCards = [
  {
    title: 'Origin intake',
    detail: 'USA and Canada pickups',
    icon: Truck,
  },
  {
    title: 'Route choice',
    detail: 'Mersin or UAE options',
    icon: Ship,
  },
  {
    title: 'Import support',
    detail: 'Afghanistan customs delivery',
    icon: FileCheck,
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });

  const smoothYProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const videoScale = useTransform(smoothYProgress, [0, 1], [1.05, 1.2]);
  const card1Y = useTransform(smoothYProgress, [0, 1], [0, -120]);
  const card2Y = useTransform(smoothYProgress, [0, 1], [0, -60]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate box-border min-h-[100svh] overflow-hidden bg-[#F9FAFB] px-4 pb-12 pt-28 text-[#1C1C1E] sm:px-6 lg:px-8 xl:min-h-[100svh] flex flex-col justify-center perspective-[1000px]"
    >
      {/* Full Background Video / Reduced-Motion Poster */}
      <motion.div
        style={prefersReducedMotion ? undefined : { scale: videoScale }}
        className="absolute inset-0 -z-30 h-full w-full overflow-hidden"
      >
        {prefersReducedMotion ? (
          <img
            src="/hero-shipping.jpg"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <video
            className="h-full w-full object-cover object-center"
            poster="/hero-shipping.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Vehicle shipping hero preview"
          >
            <source src="/Pull-back_to_wide_shot_202607030933.mp4" type="video/mp4" />
          </video>
        )}
      </motion.div>

      {/* High-end cinematic overlays */}
      <div className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-b from-white/70 via-white/55 to-white/95" />
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_center,transparent_0%,white_100%)] opacity-75" />

      {/* Grid texture for technical feel */}
      <motion.div
        style={{
          opacity: useTransform(smoothYProgress, [0, 1], [0.14, 0]),
          maskImage: 'linear-gradient(to bottom, black 20%, transparent 80%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 80%)',
        }}
        className="absolute inset-0 -z-10 bg-[url('/grid.svg')] bg-[length:40px_40px]"
      />

      <div className="mx-auto grid h-full w-full max-w-7xl gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center relative z-10">
        <motion.div
          variants={containerVariants}
          initial={prefersReducedMotion ? false : 'hidden'}
          animate="visible"
          className="relative z-10 flex flex-col justify-center pt-4 sm:pt-16 lg:pt-0"
        >
          {/* Trust Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-3 rounded-full border border-black/10 bg-white/90 px-2.5 py-1.5 pr-4 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] backdrop-blur-xl self-start overflow-hidden relative"
          >
            <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-white shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="relative z-10 text-xs font-bold uppercase tracking-[0.12em] text-[#1C1C1E]">
              #1 North America to Afghanistan
            </span>
          </motion.div>

          {/* Headline — Immediate LCP paint with animated gold highlighter */}
          <motion.h1
            variants={itemVariants}
            className="mt-6 sm:mt-8 max-w-4xl text-4xl font-extrabold leading-[1.06] tracking-tight text-[#1C1C1E] sm:text-5xl lg:text-6xl xl:text-7xl"
          >
            Ship your vehicle
            <br />
            <span className="relative inline-block mt-1 sm:mt-2">
              <span className="relative z-10 text-[#1C1C1E]">with confidence</span>
              <motion.span
                initial={prefersReducedMotion ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.65, delay: 0.15, ease: 'circOut' }}
                style={{ originX: 0 }}
                className="absolute bottom-1 left-0 right-0 h-3 sm:h-5 bg-[#D4AF37]/30 -z-0 transform -rotate-1 rounded"
              />
            </span>
            <span className="block mt-4 sm:mt-5 text-xs sm:text-sm font-extrabold leading-[1.3] text-[#6B5C17] uppercase tracking-[0.25em] font-mono">
              TO AFGHANISTAN
            </span>
          </motion.h1>

          {/* Value Prop text */}
          <motion.p variants={itemVariants} className="mt-6 sm:mt-8 max-w-xl text-base sm:text-lg leading-relaxed text-[#374151] sm:text-xl font-medium">
            Premium vehicle logistics from <span className="text-[#1C1C1E] font-semibold">USA and Canada</span> directly to{' '}
            <span className="text-[#1C1C1E] font-semibold">Afghanistan</span>. Flawless handling through{' '}
            <span className="text-[#6B5C17] font-semibold underline decoration-[#D4AF37]/60 underline-offset-4 decoration-2">Mersin</span> or{' '}
            <span className="text-[#6B5C17] font-semibold underline decoration-[#D4AF37]/60 underline-offset-4 decoration-2">UAE</span>.
          </motion.p>

          {/* Call to Actions */}
          <motion.div variants={itemVariants} className="mt-8 sm:mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Magnetic>
              <Link
                href="/#quote"
                className="group relative inline-flex h-14 sm:h-16 w-full sm:w-auto min-w-[200px] items-center justify-center gap-3 overflow-hidden rounded-full bg-slate-950 px-8 text-base font-bold text-white shadow-xl transition-all duration-300 hover:brightness-110"
              >
                <div className="absolute inset-0 h-full w-full bg-[#D4AF37] translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0" />
                <span className="relative z-10 group-hover:text-slate-950 transition-colors duration-500">Get a free quote</span>
                <ArrowRight className="relative z-10 h-5 w-5 -rotate-45 transition-transform duration-500 group-hover:rotate-0 group-hover:text-slate-950 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </Magnetic>

            <Magnetic>
              <Link
                href="/#process"
                className="group relative inline-flex h-14 sm:h-16 w-full sm:w-auto items-center justify-center gap-3 rounded-full border border-slate-200 bg-white/85 px-8 text-base font-semibold text-[#1C1C1E] backdrop-blur-md transition-all duration-300 hover:bg-white hover:border-[#D4AF37]"
              >
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-slate-100 text-[#1C1C1E] group-hover:bg-[#D4AF37] group-hover:text-white transition-colors duration-300">
                  <CirclePlay className="h-4 w-4 fill-current" aria-hidden="true" />
                </div>
                How it works
              </Link>
            </Magnetic>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-6 max-w-xl">
            <p className="mb-2 text-xs sm:text-sm font-semibold text-[#374151]">Already shipping with us? Track your container.</p>
            <HeroTrackingForm />
          </motion.div>

          {/* Corridor Features */}
          <motion.div variants={itemVariants} className="mt-12 hidden md:flex items-center gap-6 pt-8 border-t border-black/5">
            {corridorCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="flex items-start gap-3.5 flex-1 group">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm border border-black/10 group-hover:border-[#D4AF37] group-hover:bg-[rgba(212,175,55,0.1)] transition-all duration-300">
                    <Icon className="h-4 w-4 text-[#6B5C17]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1C1C1E]">{card.title}</p>
                    <p className="mt-0.5 text-xs text-[#5F6368] leading-snug">{card.detail}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </motion.div>

        {/* Floating Info Cards - Right Side (Parallax) */}
        <motion.div
          style={prefersReducedMotion ? undefined : { y: card1Y }}
          initial={prefersReducedMotion ? false : { opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.75, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:flex flex-col justify-end items-end h-full pb-28 relative"
        >
          <motion.div
            className="mb-8 transform perspective-1000"
            whileHover={prefersReducedMotion ? undefined : { scale: 1.04, rotateX: 8, rotateY: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="rounded-3xl border border-black/10 bg-white/95 p-6 backdrop-blur-2xl shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] w-80 relative overflow-hidden group">
              <div className="flex items-center gap-5 relative z-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-[#D4AF37] shadow-lg">
                  <Ship className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#5F6368] uppercase tracking-[0.16em] mb-1 font-mono">Operations</p>
                  <div className="flex items-center gap-2.5 text-[0.95rem] tracking-tight text-[#1C1C1E] font-bold">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 relative">
                      <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-70" />
                    </span>
                    Live routes active
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            style={prefersReducedMotion ? undefined : { y: card2Y }}
            className="mr-12 transform perspective-1000 mt-4"
            whileHover={prefersReducedMotion ? undefined : { scale: 1.04, rotateX: -8, rotateY: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="rounded-3xl border border-black/10 bg-white/95 p-6 backdrop-blur-2xl shadow-[0_24px_50px_-12px_rgba(15,23,42,0.14)] w-72 group relative overflow-hidden">
              <div className="flex flex-col relative z-10">
                <div className="flex items-center justify-between mb-3 border-b border-black/5 pb-4">
                  <span className="text-4xl font-black text-[#1C1C1E] leading-none tracking-tighter">100%</span>
                  <div className="h-12 w-12 rounded-full bg-[#F9FAFB] border border-black/5 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
                    <CheckCircle className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                  </div>
                </div>
                <span className="text-xs text-[#5F6368] font-bold uppercase tracking-[0.1em]">Delivery Success to Herat</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
