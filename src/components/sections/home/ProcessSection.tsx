'use client';

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { FileText, PackageCheck, Anchor, Route, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    number: '01',
    location: 'USA / Canada',
    title: 'Lane Quote & Review',
    description: 'Share pickup city, auction details, condition, and destination province so the lane is priced accurately.',
    checkpoint: 'Pickup city + province',
    icon: FileText,
  },
  {
    number: '02',
    location: 'Origin pickup',
    title: 'Pickup & Title Check',
    description: 'Vehicle is collected, photographed, inspected, and prepared for export based on strict requirements.',
    checkpoint: 'VIN, title, condition',
    icon: PackageCheck,
  },
  {
    number: '03',
    location: 'Export port',
    title: 'Container Loading',
    description: 'Loading, port handoff, and ocean freight coordination are tracked before entering the transit corridor.',
    checkpoint: 'Container + BOL',
    icon: Anchor,
  },
  {
    number: '04',
    location: 'Route choice',
    title: 'Mersin or UAE Route',
    description: 'Shipment is planned through Mersin (Turkey) or UAE based on logistics, timing, and lane cost.',
    checkpoint: 'Selected corridor',
    icon: Route,
  },
  {
    number: '05',
    location: 'Afghanistan',
    title: 'Customs & Delivery',
    description: 'Final import support and delivery coordination to Herat, Kabul, Kandahar, Mazar-i-Sharif.',
    checkpoint: 'Customs + final mile',
    icon: CheckCircle2,
  },
];

export default function ProcessSection() {
  const targetRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  // Translate far enough that Step 05 is completely visible even on 1024px–1280px laptops
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-58%']);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.5, 1, 1, 0.5]);

  return (
    <div id="process" className="scroll-mt-20">
      {/* Mobile & Tablet Flow (Clean Vertical Timeline) */}
      <section className="block lg:hidden bg-[#F9FAFB] py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10 text-center sm:text-left">
            <div className="inline-flex items-center gap-2">
              <span className="h-px w-6 bg-black/25" />
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#5F6368] font-semibold">Execution</span>
              <span className="h-px w-6 bg-black/25 sm:hidden" />
            </div>
            <h2 className="mt-4 text-3xl font-bold text-[#1C1C1E] tracking-tight leading-[1.1]">
              Five milestones. <br />
              <span className="text-[#5F6368] italic font-serif font-light">Zero friction.</span>
            </h2>
          </div>

          <div className="space-y-4">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={`m-${step.number}`}
                  className="relative rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[#1C1C1E] shadow-inner">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="inline-block font-mono text-xs uppercase tracking-widest text-[#5F6368] font-bold">
                          {step.location}
                        </span>
                        <h3 className="text-lg font-bold text-[#1C1C1E] leading-tight">
                          {step.title}
                        </h3>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-black/15 font-mono" aria-hidden="true">{step.number}</span>
                  </div>

                  <p className="mt-3 text-sm text-[#5F6368] leading-relaxed">
                    {step.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                    <span className="shrink-0 text-[#5F6368] font-mono uppercase tracking-wider">Checkpoint:</span>
                    <span className="min-w-0 break-words text-right font-semibold text-[#1C1C1E]">{step.checkpoint}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Desktop Horizontal Scrolling Section (falls back to clean wrap grid if reduced-motion enabled) */}
      {prefersReducedMotion ? (
        <section className="hidden lg:block bg-[#F9FAFB] py-20 px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12">
              <div className="inline-flex items-center gap-3">
                <span className="h-px w-6 bg-black/25" />
                <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#5F6368] font-semibold">Execution</span>
              </div>
              <h2 className="mt-4 text-5xl font-bold text-[#1C1C1E] tracking-tight leading-[1.08]">
                Five milestones. <span className="text-[#5F6368] italic font-serif font-light">Zero friction.</span>
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3 xl:grid-cols-5">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.number} className="flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                        <Icon className="h-5 w-5 text-[#1C1C1E]" />
                      </div>
                      <span className="font-mono text-xl font-bold text-black/15" aria-hidden="true">{step.number}</span>
                    </div>
                    <span className="inline-block w-fit rounded-full bg-black/5 px-2.5 py-0.5 font-mono text-xs uppercase tracking-wider text-[#5F6368] mb-2">
                      {step.location}
                    </span>
                    <h3 className="text-lg font-bold text-[#1C1C1E] mb-2">{step.title}</h3>
                    <p className="text-sm text-[#5F6368] leading-relaxed mb-6">{step.description}</p>
                    <div className="mt-auto border-t border-[#E5E7EB] pt-3 text-xs">
                      <p className="font-mono uppercase tracking-wider text-[#5F6368]">Key checkpoint</p>
                      <p className="font-bold text-[#1C1C1E] mt-0.5">{step.checkpoint}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        <section ref={targetRef} className="relative hidden lg:block h-[260vh] bg-[#F9FAFB]">
          <div className="sticky top-0 flex h-screen items-center overflow-hidden bg-[#F9FAFB]">
            <motion.div style={{ opacity: bgOpacity }} className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
            </motion.div>

            <div className="relative z-10 w-full pl-6 lg:pl-16 flex flex-col justify-center h-full">
              <div className="mb-10 lg:mb-14">
                <div className="inline-flex items-center gap-3">
                  <span className="h-px w-6 bg-black/25" />
                  <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#5F6368] font-semibold">Execution</span>
                </div>
                <h2 className="mt-5 text-4xl font-bold text-[#1C1C1E] sm:text-5xl lg:text-6xl max-w-4xl tracking-tight leading-[1.05]">
                  Five milestones. <br />
                  <span className="text-[#5F6368] italic font-serif font-light">Zero friction.</span>
                </h2>
                <div className="mt-6 flex items-center gap-4">
                  <span className="text-xs font-mono uppercase tracking-widest text-[#5F6368]">Scroll to follow the route</span>
                  <div className="h-0.5 w-40 overflow-hidden rounded-full bg-black/10">
                    <motion.div style={{ scaleX: scrollYProgress }} className="h-full w-full origin-left bg-[#D4AF37]" />
                  </div>
                  <span className="text-xs font-bold text-[#5F6368]">01 — 05</span>
                </div>
              </div>

              <motion.div
                style={{ x }}
                className="flex gap-6 pr-24"
              >
                {steps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.number}
                      className="group relative flex w-[340px] xl:w-[390px] shrink-0 flex-col rounded-2xl border border-[#E5E7EB] bg-white p-7 transition-all hover:border-[#D4AF37]/60 shadow-sm"
                    >
                      <div className="absolute top-8 right-8 text-[5.5rem] font-bold text-gray-900/[0.06] leading-none transition-colors group-hover:text-black/10" aria-hidden="true">
                        {step.number}
                      </div>

                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] shadow-sm">
                        <Icon className="h-6 w-6 text-[#1C1C1E]" />
                      </div>

                      <div className="mt-6 flex flex-1 flex-col">
                        <span className="inline-block w-fit rounded-full bg-black/5 px-3 py-1 font-mono text-xs uppercase tracking-widest text-[#5F6368] mb-3">
                          {step.location}
                        </span>
                        <h3 className="text-2xl font-bold text-[#1C1C1E] mb-3">
                          {step.title}
                        </h3>
                        <p className="text-base text-[#5F6368] leading-relaxed font-medium mb-8 min-h-[76px]">
                          {step.description}
                        </p>

                        <div className="mt-auto border-t border-[#E5E7EB] pt-5">
                          <p className="text-xs uppercase tracking-widest text-[#5F6368] font-mono mb-1.5">Key checkpoint</p>
                          <p className="text-sm font-bold text-[#1C1C1E]">{step.checkpoint}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
