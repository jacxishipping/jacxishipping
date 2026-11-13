'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Quote } from 'lucide-react';

const testimonials = [
  {
    quote: 'JACXI handled my Toyota Land Cruiser with absolute professionalism. It arrived in Herat in perfect condition, and the customs process was incredibly clear from start to finish.',
    name: 'Ahmed R.',
    role: 'Herat, Afghanistan',
  },
  {
    quote: 'I was nervous about shipping my car internationally, but the JACXI team kept me updated at every stage. Reliable, responsive, and completely transparent operations.',
    name: 'Khalid M.',
    role: 'Kabul, Afghanistan',
  },
  {
    quote: 'Best price I found for USA to Afghanistan shipping. The team is honest, direct, and careful with the details. The tracking portal gave me total peace of mind.',
    name: 'Farida N.',
    role: 'Kandahar, Afghanistan',
  },
  {
    quote: 'They handled our fleet shipment with strong coordination from pickup through final destination. The route visibility made a real difference for our operational planning.',
    name: 'Sarah Jenkins',
    role: 'Fleet client',
  },
];

export default function TestimonialsSection() {
  const containerRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const x1 = useTransform(scrollYProgress, [0, 1], [0, -400]);
  const x2 = useTransform(scrollYProgress, [0, 1], [-400, 0]);

  return (
    <section ref={containerRef} className="relative overflow-hidden bg-[#F9FAFB] py-16 sm:py-20 lg:py-24 text-black">
      
      {/* Absolute Background Typography */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none opacity-5">
        <h2 className="text-[20vw] font-black tracking-tighter leading-none whitespace-nowrap">
          TRUSTED
        </h2>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-10 sm:mb-16 text-center">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-3 justify-center mb-4 sm:mb-6">
            <span className="h-px w-6 bg-black/25" />
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-black/50">Verified clients</span>
            <span className="h-px w-6 bg-black/25" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl max-w-3xl mx-auto">
            Reputation built on <br/>
            <span className="italic font-serif font-light text-black/40">flawless delivery.</span>
          </h2>
        </motion.div>
      </div>

      {/* Marquee Row 1 */}
      <div className="relative flex whitespace-nowrap mb-6 [mask-image:linear-gradient(to_right,black,black_90%,transparent)]">
        <motion.div style={{ x: x1 }} className="flex gap-4 sm:gap-8 px-6 sm:px-8">
          {[...testimonials, ...testimonials].slice(0, 4).map((item, idx) => (
             <TestimonialCard key={`row1-${idx}`} item={item} />
          ))}
        </motion.div>
      </div>

      {/* Marquee Row 2 */}
      <div className="relative flex whitespace-nowrap [mask-image:linear-gradient(to_right,black,black_90%,transparent)]">
        <motion.div style={{ x: x2 }} className="flex gap-4 sm:gap-8 px-6 sm:px-8">
          {[...testimonials, ...testimonials].slice(4, 8).map((item, idx) => (
             <TestimonialCard key={`row2-${idx}`} item={item} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function TestimonialCard({ item }: { item: any }) {
  return (
    <div className="group relative flex w-[85vw] max-w-[360px] sm:w-[480px] shrink-0 flex-col rounded-xl border border-black/5 bg-white p-6 sm:p-8 shadow-sm transition-all hover:shadow-md hover:border-black/10 cursor-grab active:cursor-grabbing">
      <div className="absolute top-6 right-6 text-black/10 group-hover:text-black/20 transition-opacity">
        <Quote className="h-8 w-8 sm:h-10 sm:w-10" />
      </div>
      
      <p className="text-sm sm:text-base font-medium leading-relaxed whitespace-normal min-h-[72px] sm:min-h-[88px] pr-6 text-slate-700">
        "{item.quote}"
      </p>
      
      <div className="mt-auto flex items-center gap-4 border-t border-black/5 pt-4 transition-colors">
        <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-base shadow-sm">
          {item.name.charAt(0)}
        </div>
        <div>
          <p className="font-bold tracking-tight text-sm sm:text-base text-slate-900">{item.name}</p>
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 font-mono mt-0.5">{item.role}</p>
        </div>
      </div>
    </div>
  );
}
