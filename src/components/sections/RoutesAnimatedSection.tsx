'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { CheckCircle2, Clock, Container, Ship, Truck } from 'lucide-react';

const journeySteps = [
  { step: '01', icon: Truck, location: 'USA / Canada', title: 'Pickup & Export Prep', description: 'Vehicle intake, inspection, auction or home pickup, title checks, and port loading.', duration: '1–5 days' },
  { step: '02', icon: Ship, location: 'Route option A', title: 'Mersin, Turkey Route', description: 'Moves through Mersin with Turkey port handoff visibility for streamlined logistics.', duration: '35–45 days' },
  { step: '03', icon: Container, location: 'Route option B', title: 'UAE Route', description: 'Alternate route through UAE with precise transit control and onward shipment planning.', duration: '30–40 days' },
  { step: '04', icon: CheckCircle2, location: 'Afghanistan', title: 'Customs & Delivery', description: 'Final customs support and delivery to Herat, Kabul, Kandahar, Mazar, and beyond.', duration: '2–6 days' },
];

const nodes = [
  { id: 'canada', x: 250, y: 168, label: 'Canada' },
  { id: 'usa', x: 230, y: 222, label: 'USA' },
  { id: 'mersin', x: 555, y: 230, label: 'Mersin' },
  { id: 'uae', x: 604, y: 306, label: 'UAE' },
  { id: 'afghanistan', x: 632, y: 250, label: 'Afghanistan' },
];

const paths = [
  { path: 'M 250 168 Q 390 92 555 230 Q 600 220 632 250' },
  { path: 'M 230 222 Q 398 150 555 230 Q 600 220 632 250' },
  { path: 'M 250 168 Q 430 178 604 306 Q 632 290 632 250' },
  { path: 'M 230 222 Q 430 230 604 306 Q 632 290 632 250' },
];

export default function RoutesAnimatedSection() {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 70%', 'end 50%'],
  });

  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section ref={containerRef} id="route" className="relative overflow-hidden bg-[#F9FAFB] py-16 sm:py-20 lg:py-24 selection:bg-[#D4AF37] selection:text-[#1C1C1E] scroll-mt-20">
      <div id="routes" className="absolute -top-20" aria-hidden="true" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:gap-16 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-white/90 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-widest text-[#5F6368] backdrop-blur-md shadow-sm">
              <span className="mr-2 h-1.5 w-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
              Global routing
            </div>

            <h2 className="mt-6 text-3xl font-bold leading-[1.1] tracking-tight text-[#1C1C1E] sm:text-5xl lg:text-6xl">
              Precision paths to <br />
              <span className="text-[#5F6368] italic font-serif font-light">Afghanistan.</span>
            </h2>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg leading-relaxed text-[#5F6368]">
              Your vehicle moves from <span className="text-[#1C1C1E] font-semibold">North America</span> to <span className="text-[#1C1C1E] font-semibold">Afghanistan</span> through carefully optimized corridors: the <span className="text-[#1C1C1E] font-semibold">Mersin Route</span> or the <span className="text-[#1C1C1E] font-semibold">UAE Route</span>. Clear visibility at every nautical mile.
            </p>

            <div className="mt-10 flex flex-col gap-5 relative">
              <div className="absolute left-[19px] top-4 bottom-4 w-px bg-gradient-to-b from-black/20 via-black/10 to-transparent" />
              {[
                { label: 'Origin', value: 'USA & Canada' },
                { label: 'Hubs', value: 'Turkey or UAE' },
                { label: 'Final', value: 'Afghan Provinces' },
              ].map((item, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.45 }}
                  key={item.label}
                  className="flex items-center gap-5"
                >
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-[#E5E7EB] shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-[#1C1C1E]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#5F6368] font-mono font-semibold">{item.label}</p>
                    <p className="text-base font-semibold text-[#1C1C1E]">{item.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="relative w-full rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-lg"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#F9FAFB]">
              <div className="absolute inset-0 bg-[url('/world-map.svg')] bg-cover bg-center bg-no-repeat opacity-20" />

              <svg
                viewBox="0 0 950 620"
                className="absolute inset-0 h-full w-full"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label="Shipping corridors from USA and Canada via Mersin and UAE to Afghanistan"
              >
                <defs>
                  <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="#D4AF37" />
                    <stop offset="100%" stopColor="#B89428" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {paths.map((p, i) => (
                  <path key={`base-${i}`} d={p.path} fill="none" stroke="rgba(28,28,30,0.16)" strokeWidth="2" strokeDasharray="4 8" />
                ))}

                {paths.map((p, i) => (
                  <motion.path
                    key={`active-${i}`}
                    d={p.path}
                    fill="none"
                    stroke="url(#gold-gradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    filter="url(#glow)"
                    style={{ pathLength }}
                  />
                ))}

                {nodes.map((node) => (
                  <g key={node.id}>
                    <circle cx={node.x} cy={node.y} r="6" fill="#D4AF37" className="animate-pulse" />
                    <circle cx={node.x} cy={node.y} r="14" fill="none" stroke="rgba(212,175,55,0.45)" strokeWidth="1.5" />
                    <text
                      x={node.x}
                      y={node.y - 20}
                      fill="#1C1C1E"
                      fontSize="14"
                      fontWeight="700"
                      textAnchor="middle"
                      style={{ textShadow: '0px 1px 3px rgba(255,255,255,0.95)' }}
                    >
                      {node.label}
                    </text>
                  </g>
                ))}
              </svg>

              <motion.div
                style={{ y: useTransform(scrollYProgress, [0, 1], [30, -10]) }}
                className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 rounded-2xl border border-[#E5E7EB] bg-white/95 p-3.5 sm:p-5 backdrop-blur-xl shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-[#FBF7E8] p-2 text-[#6B5C17]">
                    <Clock className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-mono font-semibold uppercase text-[#5F6368]">Avg Transit Time</p>
                    <p className="text-lg sm:text-xl font-bold text-[#1C1C1E]">30–45 Days</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {journeySteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: 'easeOut' }}
                whileHover={{ y: -4, transition: { duration: 0.25 } }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition-all duration-300 hover:border-[#D4AF37]/60 hover:shadow-lg"
              >
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB]">
                    <Icon className="h-5 w-5 text-[#1C1C1E]" aria-hidden="true" />
                  </div>
                  <span className="text-4xl font-bold text-gray-900/[0.07]" aria-hidden="true">{step.step}</span>
                </div>

                <div>
                  <div className="mb-2.5 flex flex-wrap items-center gap-2">
                    <span className="inline-block rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#5F6368]">
                      {step.location}
                    </span>
                    <span className="inline-block rounded-full bg-[#FBF7E8] border border-[#D4AF37]/40 px-2.5 py-0.5 text-xs font-mono font-semibold text-[#5C4F14]">
                      {step.duration}
                    </span>
                  </div>
                  <h3 className="mb-2.5 text-xl font-semibold text-[#1C1C1E]">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-[#5F6368]">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}