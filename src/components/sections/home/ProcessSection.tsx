'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
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
  
  // Create a timeline animation tied to scroll over a tall container on desktop
  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-65%"]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.5, 1, 1, 0.5]);

  return (
    <>
      {/* Mobile & Tablet Flow (Clean Vertical Timeline) */}
      <section id="process-mobile" className="block lg:hidden bg-[#F9FAFB] py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10 text-center sm:text-left">
            <div className="inline-flex items-center gap-2">
              <span className="h-px w-6 bg-black/25" />
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-black/50">Execution</span>
              <span className="h-px w-6 bg-black/25 sm:hidden" />
            </div>
            <h2 className="mt-4 text-3xl font-bold text-gray-900 tracking-tight leading-[1.1]">
              Five milestones. <br/>
              <span className="text-black/50 italic font-serif font-light">Zero friction.</span>
            </h2>
          </div>

          <div className="space-y-4">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div 
                  key={`m-${step.number}`}
                  className="relative rounded-2xl border border-black/5 bg-white p-6 shadow-sm overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F9FAFB] border border-black/5 text-slate-900 shadow-inner">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="inline-block font-mono text-[10px] uppercase tracking-widest text-black/50 font-bold">
                          {step.location}
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 leading-tight">
                          {step.title}
                        </h3>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-black/10 font-mono">{step.number}</span>
                  </div>

                  <p className="mt-3 text-sm text-black/65 leading-relaxed">
                    {step.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-xs">
                    <span className="text-black/40 font-mono uppercase tracking-wider">Checkpoint:</span>
                    <span className="font-semibold text-slate-800">{step.checkpoint}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Desktop Horizontal Scrolling Section */}
      <section ref={targetRef} id="process" className="relative hidden lg:block h-[300vh] bg-[#F9FAFB]">
        <div className="sticky top-0 flex h-screen items-center overflow-hidden bg-[#F9FAFB]">
          <motion.div style={{ opacity: bgOpacity }} className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
          </motion.div>

          <div className="relative z-10 w-full pl-6 lg:pl-16 flex flex-col justify-center h-full">
            <div className="mb-10 lg:mb-16">
              <div className="inline-flex items-center gap-3">
                <span className="h-px w-6 bg-black/25" />
                <span className="text-xs font-mono uppercase tracking-[0.2em] text-black/50">Execution</span>
              </div>
              <h2 className="mt-6 text-4xl font-bold text-gray-900 sm:text-5xl lg:text-6xl max-w-4xl tracking-tight leading-[1.05]">
                Five milestones. <br/>
                <span className="text-black/50 italic font-serif font-light">Zero friction.</span>
              </h2>
            </div>

            <motion.div 
              style={{ x }} 
              className="flex gap-8"
            >
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div 
                    key={step.number}
                    className="group relative flex w-[350px] sm:w-[420px] shrink-0 flex-col rounded-2xl border border-black/[0.03] bg-white p-10 transition-all hover:bg-white hover:border-black/10 shadow-sm"
                  >
                    <div className="absolute top-10 right-10 text-[6rem] font-bold text-gray-900/5 leading-none transition-colors group-hover:text-black/10">
                      {step.number}
                    </div>

                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-black/10 transition-colors shadow-sm">
                      <Icon className="h-7 w-7 text-gray-900 transition-colors" />
                    </div>

                    <div className="mt-20">
                      <span className="inline-block rounded-full bg-black/5 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-black/60 mb-4">
                        {step.location}
                      </span>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">
                        {step.title}
                      </h3>
                      <p className="text-base text-black/60 leading-relaxed font-medium mb-10 min-h-[80px]">
                        {step.description}
                      </p>
                      
                      <div className="mt-auto border-t border-black/5 pt-6">
                        <p className="text-xs uppercase tracking-widest text-black/60 font-mono mb-2">Key checkpoint</p>
                        <p className="text-sm font-bold text-black/80">{step.checkpoint}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex w-[200px] shrink-0 items-center justify-center text-black/20 px-10 border-l border-dashed border-black/5">
                <span className="text-sm font-mono tracking-widest uppercase rotate-[-90deg] whitespace-nowrap">End of process</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}
