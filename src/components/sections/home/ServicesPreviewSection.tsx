import Link from 'next/link';
import { ArrowRight, Car, ShieldCheck, Ship, Warehouse } from 'lucide-react';

const services = [
  {
    icon: Car,
    title: 'Vehicle sourcing & pickup',
    description: 'Auction acquisition support, inland towing, and port intake from across the USA and Canada.',
  },
  {
    icon: Ship,
    title: 'Ocean freight & RORO',
    description: 'Confirmed container space and scheduled transatlantic sailings via Mersin or UAE.',
  },
  {
    icon: ShieldCheck,
    title: 'Customs clearance',
    description: 'Export title verification, bill of lading preparation, and Afghanistan import clearance.',
  },
  {
    icon: Warehouse,
    title: 'Secure port staging',
    description: 'Protected yard inspection, photo documentation, and vehicle consolidation prior to loading.',
  },
];

export default function ServicesPreviewSection() {
  return (
    <section className="border-t border-[#E5E7EB] bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5C17]">
              Capabilities
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-[#1C1C1E] sm:text-4xl">
              End-to-end vehicle logistics.
            </h2>
          </div>

          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1C1C1E] transition-colors hover:text-[#6B5C17] w-fit"
          >
            <span>View all services</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.title}
                className="flex flex-col rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]/60 p-6 transition-colors hover:border-[#D4AF37]/60 hover:bg-white"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#1C1C1E]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-[#1C1C1E]">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5F6368]">
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
