import Link from 'next/link';
import { ArrowRight, Bell, MapPin, Receipt } from 'lucide-react';

const portalHighlights = [
  {
    icon: MapPin,
    title: 'Live shipment tracking',
    description: 'Follow container milestones across pickup, port loading, transit, customs, and delivery.',
  },
  {
    icon: Receipt,
    title: 'Invoices & documents',
    description: 'View bills of lading, inspection photos, balances, and payment receipts in one browser portal.',
  },
  {
    icon: Bell,
    title: 'Milestone notifications',
    description: 'Automatic status alerts when container handoffs, customs clearances, or deliveries post.',
  },
];

export default function AboutMiniSection() {
  return (
    <section id="about" className="relative border-t border-[#E5E7EB] bg-white py-20 sm:py-24 scroll-mt-16">
      <div id="about-us" className="absolute -top-16" aria-hidden="true" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5C17]">
              About JACXI &amp; Portal
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-[#1C1C1E] sm:text-4xl">
              Over a decade moving vehicles into Afghanistan.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#5F6368]">
              JACXI Shipping specializes exclusively in North America to Afghanistan vehicle
              logistics. Every shipment is backed by licensed export handling, direct corridor
              coordination, and a web customer portal—no separate app required.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                href="/auth/signin"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-5 text-sm font-medium text-[#1C1C1E] transition-colors hover:border-[#1C1C1E]/30 hover:bg-[#F9FAFB]"
              >
                <span>Open customer portal</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/tracking"
                className="inline-flex h-11 items-center px-2 text-sm font-medium text-[#5F6368] transition-colors hover:text-[#1C1C1E]"
              >
                Public container lookup
              </Link>
            </div>
          </div>

          <div className="divide-y divide-[#E5E7EB] rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB]/60">
            {portalHighlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-4 p-5 sm:p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#1C1C1E]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#1C1C1E]">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#5F6368]">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
