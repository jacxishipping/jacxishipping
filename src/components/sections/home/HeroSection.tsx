import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import AfghanistanHeroMap from '@/components/sections/home/AfghanistanHeroMap';
import HeroTrackingForm from '@/components/sections/home/HeroTrackingForm';

const keyMetrics = [
  { value: '30–45 days', label: 'Avg. transit time' },
  { value: 'Mersin & UAE', label: 'Corridor options' },
  { value: '34 provinces', label: 'Afghanistan coverage' },
];

export default function HeroSection() {
  return (
    <section className="bg-white pt-28 pb-16 sm:pt-32 sm:pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5C17]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" aria-hidden="true" />
              North America to Afghanistan
            </p>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.03em] leading-[1.08] text-[#1C1C1E] sm:text-5xl lg:text-[3.5rem]">
              Vehicle shipping, handled with clarity.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#5F6368] sm:text-lg">
              Direct vehicle logistics from the USA and Canada to Afghanistan via{' '}
              <span className="font-medium text-[#1C1C1E]">Mersin</span> or{' '}
              <span className="font-medium text-[#1C1C1E]">UAE</span>—with origin pickup, export
              loading, customs clearance, and delivery to all 34 provinces.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/#quote"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1C1C1E] px-6 text-sm font-medium text-white transition-colors hover:bg-[#333336]"
              >
                <span>Get a free quote</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>

              <Link
                href="/#calculator"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-6 text-sm font-medium text-[#1C1C1E] transition-colors hover:border-[#1C1C1E]/30 hover:bg-[#F9FAFB]"
              >
                Estimate shipping rate
              </Link>
            </div>

            <div className="mt-9 pt-8 border-t border-[#E5E7EB]">
              <p className="mb-2.5 text-xs font-medium text-[#5F6368]">
                Already shipping with JACXI? Track your container.
              </p>
              <HeroTrackingForm />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB]">
            <AfghanistanHeroMap />

            <dl className="grid grid-cols-3 divide-x divide-[#E5E7EB] border-t border-[#E5E7EB] bg-white">
              {keyMetrics.map((metric) => (
                <div key={metric.label} className="px-3 py-4 sm:px-4">
                  <dt className="text-[11px] font-medium text-[#5F6368]">{metric.label}</dt>
                  <dd className="mt-1 text-sm font-semibold tracking-tight text-[#1C1C1E] tabular-nums sm:text-base">
                    {metric.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
