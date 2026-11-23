'use client';

import { motion, useReducedMotion } from 'framer-motion';

const provinces = [
  'Herat', 'Kabul', 'Kandahar', 'Mazar-i-Sharif', 'Jalalabad', 'Kunduz', 'Ghazni', 'Balkh', 'Nimruz', 'Khost',
];

export default function ProvinceCoverageSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="bg-[#F9FAFB] py-16 sm:py-20 lg:py-24 overflow-hidden border-t border-black/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center mb-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-[#1C1C1E] tracking-tight sm:text-5xl">
            Serving all major hubs
          </h2>
        </motion.div>
      </div>

      {prefersReducedMotion ? (
        <div className="mx-auto max-w-5xl px-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 py-6">
          {provinces.map((prov) => (
            <span key={prov} className="text-2xl sm:text-3xl font-bold text-[#1C1C1E]/60 tracking-tight">
              {prov}
            </span>
          ))}
        </div>
      ) : (
        <div className="relative flex whitespace-nowrap [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)] overflow-hidden py-8">
          <motion.div
            className="flex items-center gap-14 px-8"
            animate={{ x: ['0%', '-33.333%'] }}
            transition={{ duration: 40, ease: 'linear', repeat: Infinity }}
          >
            {[...provinces, ...provinces, ...provinces].map((prov, i) => (
              <div key={i} className="flex items-center gap-14">
                <span className="text-4xl md:text-5xl font-bold text-[#1C1C1E]/40 tracking-tight">{prov}</span>
                <span className="text-2xl text-[#D4AF37] font-serif" aria-hidden="true">+</span>
              </div>
            ))}
          </motion.div>
        </div>
      )}
    </section>
  );
}