'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Car, ExternalLink, ShieldCheck, Ship, Warehouse } from 'lucide-react';
import Link from 'next/link';

interface ServiceItem {
  icon: ReactNode;
  title: string;
  description: string;
  svgPath: string;
}

const services: ServiceItem[] = [
  {
    icon: <Car className="h-6 w-6" />,
    title: 'Vehicle sourcing & transport',
    description: 'We handle everything from auction acquisitions to domestic transport and port delivery.',
    svgPath: '/capability-vehicle.svg',
  },
  {
    icon: <Ship className="h-6 w-6" />,
    title: 'Ocean freight & RORO',
    description: 'Secure transatlantic vessel booking with confirmed space and consistent sailing schedules.',
    svgPath: '/capability-ocean.svg',
  },
  {
    icon: <ShieldCheck className="h-6 w-6" />,
    title: 'Customs clearance',
    description: 'Expert documentation handling for export clearing and smooth import procedures.',
    svgPath: '/capability-customs.svg',
  },
  {
    icon: <Warehouse className="h-6 w-6" />,
    title: 'Secure storage & staging',
    description: 'Short and long-term staging at major ports and hubs to consolidate vehicle shipments.',
    svgPath: '/capability-storage.svg',
  },
];

export default function ServicesPreviewSection() {
  return (
    <section className="relative bg-[#F9FAFB] text-[#1C1C1E] py-16 sm:py-20 lg:py-24">
      {/* Header Section — non-overlapping static header with clear breathing room below fixed navbar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-3">
            <div className="h-px w-6 sm:w-8 bg-black/25" />
            <span className="text-xs font-mono uppercase tracking-widest text-[#6B5C17] font-semibold">Capabilities</span>
          </div>
          <h2 className="mt-4 sm:mt-6 text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-[#1C1C1E]">
            End-to-end logistics.<br />
            <span className="text-[#5F6368] italic font-serif font-light tracking-normal">Simplified.</span>
          </h2>
        </motion.div>
      </div>

      {/* Spaced out scrolling content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-14 sm:space-y-20 lg:space-y-24">
        {services.map((service, index) => (
          <ServiceCard key={service.title} service={service} index={index} />
        ))}
      </div>
    </section>
  );
}

function ServiceCard({ service, index }: { service: ServiceItem; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'start 20%'],
  });

  const springProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 20 });
  const yImage = useTransform(springProgress, [0, 1], [-80, 0]);
  const scaleImage = useTransform(springProgress, [0, 1], [1.14, 1]);

  return (
    <motion.div
      ref={cardRef}
      className="grid gap-10 lg:gap-12 lg:grid-cols-[1fr_1.2fr] items-center"
    >
      {/* Text Column */}
      <div className={`flex flex-col justify-center ${index % 2 === 1 ? 'lg:order-2 lg:pl-16' : 'lg:pr-16'}`}>
        <div className="mb-6 sm:mb-8 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white border border-[#E5E7EB] text-[#1C1C1E] shadow-sm">
          {service.icon}
        </div>

        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5 text-[#1C1C1E]">{service.title}</h3>

        <div className="h-px w-full bg-[#E5E7EB] mb-5" />

        <p className="text-base sm:text-lg text-[#5F6368] leading-relaxed font-medium">
          {service.description}
        </p>

        <Link
          href="/services"
          className="mt-8 group inline-flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-[#1C1C1E] hover:text-[#6B5C17] transition-colors w-fit"
        >
          Explore service
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-[#E5E7EB] shadow-sm group-hover:bg-slate-900 group-hover:border-slate-900 group-hover:text-white transition-all">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </Link>
      </div>

      {/* Capability Graphic Parallax Frame */}
      <div
        role="img"
        aria-label={`${service.title} illustration`}
        className={`relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white pointer-events-none ${index % 2 === 1 ? 'lg:order-1' : ''}`}
      >
        <motion.div
          style={{ y: yImage, scale: scaleImage }}
          className="absolute inset-0 h-[116%]"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${service.svgPath}')` }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
