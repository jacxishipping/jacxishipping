'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useSpring, useInView, type Variants } from 'framer-motion';
import {
  ArrowRight,
  CirclePlay,
  FileCheck,
  ShieldCheck,
  Ship,
  Truck,
  CheckCircle,
} from 'lucide-react';
import gsap from 'gsap';
import Magnetic from '@/components/ui/Magnetic';
import HeroTrackingForm from '@/components/sections/home/HeroTrackingForm';
import { TiltCard } from '@jacxishippingorg/jx-ui-react';

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
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.12 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: "easeOut" },
  },
};

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  
  const smoothYProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const videoScale = useTransform(smoothYProgress, [0, 1], [1.05, 1.25]);
  const contentY = useTransform(smoothYProgress, [0, 1], ['0%', '40%']);
  const contentOpacity = useTransform(smoothYProgress, [0, 0.6], [1, 0]);
  const wordsBlur = useTransform(smoothYProgress, [0, 0.5], ['blur(0px)', 'blur(10px)']);
  
  const card1Y = useTransform(smoothYProgress, [0, 1], [0, -150]);
  const card2Y = useTransform(smoothYProgress, [0, 1], [0, -80]);

  const titleText = "Ship your vehicle with confidence to Afghanistan";
  const titleWords = titleText.split(" ");
  
  const wordVariants: Variants = {
    hidden: { opacity: 0, y: 30, rotateX: -40, filter: 'blur(10px)' },
    visible: { 
      opacity: 1, 
      y: 0, 
      rotateX: 0, 
      filter: 'blur(0px)',
      transition: { duration: 0.8, ease: 'easeOut' as const } 
    }
  };

  return (
    <section ref={sectionRef} className="relative isolate box-border min-h-[100svh] overflow-hidden bg-[#F9FAFB] px-4 pb-12 pt-28 text-gray-900 sm:px-6 lg:px-8 xl:min-h-[100svh] flex flex-col justify-center perspective-[1000px]">
      {/* Full Background Video */}
      <motion.div 
        style={{ scale: videoScale }}
        className="absolute inset-0 -z-30 h-full w-full overflow-hidden"
      >
        <video
          className="h-full w-full object-cover object-center"
          poster="/hero-shipping.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          aria-label="Vehicle shipping hero preview"
        >
          <source src="/Pull-back_to_wide_shot_202607030933.mp4" media="(min-width: 768px)" type="video/mp4" />
        </video>
      </motion.div>

      {/* High-end cinematic overlays */}
      <div className="pointer-events-none absolute inset-0 -z-20 bg-gradient-to-b from-white/60 via-white/20 to-white/90" />
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_center,transparent_0%,white_100%)] opacity-70" />
      
      {/* Noise filter overlay for premium feel */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03] mix-blend-overlay" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")'}}></div>

      {/* Grid texture for technical feel */}
      <motion.div 
        style={{ 
          opacity: useTransform(smoothYProgress, [0, 1], [0.15, 0]),
          maskImage: 'linear-gradient(to bottom, black 20%, transparent 80%)', 
          WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 80%)'
        }}
        className="absolute inset-0 -z-10 bg-[url('/grid.svg')] bg-[length:40px_40px]" 
      />

      <motion.div 
        style={{ y: contentY, opacity: contentOpacity, filter: wordsBlur }}
        className="mx-auto grid h-full w-full max-w-7xl gap-8 lg:grid-cols-[1.3fr_0.7fr] xl:grid-cols-[1.3fr_0.7fr] lg:items-center relative z-10"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col justify-center pt-8 sm:pt-24 lg:pt-0"
        >
          {/* Trust Badge */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-3 rounded-full border border-black/10 bg-white/80 px-2.5 py-1.5 pr-4 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.1)] backdrop-blur-xl self-start overflow-hidden relative group">
            <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-white shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <span className="relative z-10 text-xs font-bold uppercase tracking-[0.12em] text-slate-900">
              #1 N.A. to Afghanistan
            </span>
          </motion.div>

          {/* Headline - Word by Word Reveal */}
          <motion.h1 
            className="mt-6 sm:mt-10 max-w-4xl text-3xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl xl:text-7xl"
          >
            {titleWords.slice(0, 3).map((word, i) => (
              <motion.span key={i} className="inline-block mr-2 sm:mr-3 lg:mr-4 origin-bottom-left" variants={wordVariants}>{word}</motion.span>
            ))}
            <br className="hidden sm:block"/>
            <span className="relative inline-block mt-1 sm:mt-2">
              <motion.span className="relative z-10 text-slate-900 px-1 pl-0 inline-flex flex-wrap" variants={wordVariants}>
                {titleWords.slice(3, 5).map((word, i) => (
                   <span key={i} className="mr-2 sm:mr-3 lg:mr-4">{word}</span>
                ))}
              </motion.span>
              <motion.span 
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 0.8, ease: "circOut" }}
                style={{ originX: 0 }}
                className="absolute bottom-1 left-0 right-0 h-3 sm:h-5 bg-[#D4AF37]/30 -z-10 transform -rotate-1 rounded"
              ></motion.span>
            </span>
            <br className="hidden sm:block"/>
            <motion.span className="block mt-4 sm:mt-6 text-xs sm:text-sm font-extrabold leading-[1.3] text-[#8D7A1F] uppercase tracking-[0.25em] font-mono" variants={wordVariants}>
              TO AFGHANISTAN
            </motion.span>
          </motion.h1>

          {/* Value Prop text */}
          <motion.p variants={itemVariants} className="mt-6 sm:mt-8 max-w-xl text-base sm:text-lg leading-relaxed text-slate-600 sm:text-xl font-medium">
            Premium vehicle logistics from <span className="text-slate-900 font-semibold">USA and Canada</span> directly to{' '}
            <span className="text-slate-900 font-semibold">Afghanistan</span>. Flawless handling through <span className="text-[#8D7A1F] font-semibold underline decoration-[#D4AF37]/50 underline-offset-4 decoration-2">Mersin</span> or <span className="text-[#8D7A1F] font-semibold underline decoration-[#D4AF37]/50 underline-offset-4 decoration-2">UAE</span>.
          </motion.p>

          {/* Call to Actions */}
          <motion.div variants={itemVariants} className="mt-8 sm:mt-12 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Magnetic>
              <Link
                href="/#quote"
                className="group relative inline-flex h-14 sm:h-16 w-full sm:w-auto min-w-[200px] items-center justify-center gap-3 overflow-hidden rounded-full bg-slate-950 px-8 text-base font-bold text-white shadow-xl transition-all duration-300 hover:brightness-110"
              >
                <div className="absolute inset-0 h-full w-full bg-[#D4AF37] translate-y-full transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0" />
                <span className="relative z-10 group-hover:text-slate-950 transition-colors duration-500">Get a free quote</span>
                <ArrowRight className="relative z-10 h-5 w-5 -rotate-45 transition-transform duration-500 group-hover:rotate-0 group-hover:text-slate-950 group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            
            <Magnetic>
              <Link
                href="/#process"
                className="group relative inline-flex h-14 sm:h-16 w-full sm:w-auto items-center justify-center gap-3 rounded-full border border-slate-200 bg-white/80 px-8 text-base font-semibold text-slate-900 backdrop-blur-md transition-all duration-300 hover:bg-white hover:border-[#D4AF37]"
              >
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-slate-100 text-slate-900 group-hover:bg-[#D4AF37] group-hover:text-slate-950 transition-colors duration-300">
                  <CirclePlay className="h-4 w-4 fill-current" />
                </div>
                How it works
              </Link>
            </Magnetic>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-6 max-w-xl">
            <p className="mb-2 text-xs sm:text-sm font-semibold text-slate-600">Already shipping with us? Track your container.</p>
            <HeroTrackingForm />
          </motion.div>

          {/* Corridor Features */}
          <motion.div variants={itemVariants} className="mt-14 hidden md:flex items-center gap-6 pt-8 border-t border-black/5">
            {corridorCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="flex items-start gap-4 flex-1 group">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm border border-black/10 group-hover:border-[var(--accent-gold)] group-hover:bg-[rgba(var(--accent-gold-rgb),0.1)] transition-all duration-300">
                    <Icon className="h-4 w-4 text-[var(--accent-gold)]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-black/90">{card.title}</h2>
                    <p className="mt-1 text-xs text-black/60 leading-snug">{card.detail}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </motion.div>

        {/* Floating Info Cards - Right Side (Parallax) */}
        <motion.div
           style={{ y: card1Y }}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:flex flex-col justify-end items-end h-full pb-32 relative"
        >
          {/* Floating Info Card 1 */}
          <motion.div 
            className="mb-8 transform perspective-1000"
            whileHover={{ scale: 1.05, rotateX: 10, rotateY: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="rounded-3xl border border-black/10 bg-white/90 p-6 backdrop-blur-2xl shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] w-80 relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
               <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-1000 group-hover:translate-x-full" />
              <div className="flex items-center gap-5 relative z-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-[#D4AF37] shadow-lg">
                  <Ship className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-black/60 uppercase tracking-[0.2em] mb-1.5 font-mono">Operations</p>
                  <div className="flex items-center gap-2.5 text-[0.95rem] tracking-tight text-gray-900 font-bold">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 relative">
                      <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-70" />
                    </span>
                    Live routes active
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Floating Info Card 2 */}
          <motion.div 
            style={{ y: card2Y }}
            className="mr-16 transform perspective-1000 mt-4"
            whileHover={{ scale: 1.05, rotateX: -10, rotateY: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="rounded-3xl border border-black/10 bg-white/90 p-6 backdrop-blur-2xl shadow-[0_24px_50px_-12px_rgba(15,23,42,0.14)] w-72 group relative overflow-hidden">
               <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-black/5 group-hover:ring-[#D4AF37]/40 transition-all duration-500" />
              <div className="flex flex-col relative z-10">
                 <div className="flex items-center justify-between mb-3 border-b border-black/5 pb-4">
                   <span className="text-4xl font-black text-gray-900 leading-none tracking-tighter">100%</span>
                   <div className="h-12 w-12 rounded-full bg-[#F9FAFB] border border-black/5 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
                     <CheckCircle className="h-6 w-6 text-emerald-600" />
                   </div>
                 </div>
                 <span className="text-[11px] text-black/60 font-bold uppercase tracking-[0.1em]">Delivery Success to Herat</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

    </section>
  );
}
