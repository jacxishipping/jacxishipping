'use client';

import { motion } from 'framer-motion';
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
  return (
    <section className="relative overflow-hidden bg-[#F9FAFB] py-16 sm:py-20 lg:py-24 text-[#1C1C1E]">
      {/* Decorative Background Typography (non-heading for clean document outline) */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none opacity-[0.04] select-none"
      >
        <span className="block text-[20vw] font-black tracking-tighter leading-none whitespace-nowrap">
          TRUSTED
        </span>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 sm:mb-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-3 justify-center mb-4 sm:mb-6">
              <span className="h-px w-6 bg-black/25" />
              <span className="text-xs font-mono font-semibold uppercase tracking-[0.2em] text-[#5F6368]">Verified clients</span>
              <span className="h-px w-6 bg-black/25" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl max-w-3xl mx-auto text-[#1C1C1E]">
              Reputation built on <br />
              <span className="italic font-serif font-light text-[#5F6368]">flawless delivery.</span>
            </h2>
          </motion.div>
        </div>

        {/* Responsive 2-column grid so all four verified quotes remain readable on mobile, tablet, and desktop */}
        <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
          {testimonials.map((item, idx) => (
            <motion.article
              key={item.name}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.45, delay: idx * 0.06 }}
              className="group relative flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8 shadow-sm transition-all hover:shadow-md hover:border-[#D4AF37]/50"
            >
              <div className="absolute top-6 right-6 text-black/10 group-hover:text-[#D4AF37]/40 transition-colors" aria-hidden="true">
                <Quote className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>

              <p className="text-sm sm:text-base font-medium leading-relaxed pr-8 text-[#1C1C1E]">
                &ldquo;{item.quote}&rdquo;
              </p>

              <div className="mt-6 pt-4 flex items-center gap-4 border-t border-[#E5E7EB]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-base shadow-sm" aria-hidden="true">
                  {item.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold tracking-tight text-sm sm:text-base text-[#1C1C1E]">{item.name}</p>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#5F6368] font-mono mt-0.5">{item.role}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
