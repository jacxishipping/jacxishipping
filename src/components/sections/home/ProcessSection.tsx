const steps = [
  {
    number: '01',
    title: 'Lane quote',
    description: 'Share pickup city, vehicle details, and destination province for firm corridor pricing.',
    checkpoint: 'Confirmed lane rate',
  },
  {
    number: '02',
    title: 'Pickup & title check',
    description: 'Vehicle is collected, photographed, inspected, and cleared for export documentation.',
    checkpoint: 'VIN & title verified',
  },
  {
    number: '03',
    title: 'Container loading',
    description: 'Export port handoff, container loading, and bill of lading issuance.',
    checkpoint: 'Container & BOL',
  },
  {
    number: '04',
    title: 'Corridor transit',
    description: 'Ocean and overland movement routed via Mersin (Turkey) or UAE.',
    checkpoint: 'Live milestone updates',
  },
  {
    number: '05',
    title: 'Customs & delivery',
    description: 'Import clearance in Afghanistan and final handover in Herat or your province.',
    checkpoint: 'Final-mile release',
  },
];

export default function ProcessSection() {
  return (
    <section id="process" className="border-t border-[#E5E7EB] bg-[#F9FAFB] py-20 sm:py-24 scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5C17]">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-[#1C1C1E] sm:text-4xl">
            Five steps from pickup to handover.
          </h2>
        </div>

        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step) => (
            <li
              key={step.number}
              className="flex flex-col rounded-xl border border-[#E5E7EB] bg-white p-5"
            >
              <span className="text-xs font-semibold tracking-wider text-[#6B5C17] tabular-nums">
                {step.number}
              </span>
              <h3 className="mt-3 text-base font-semibold text-[#1C1C1E]">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5F6368]">
                {step.description}
              </p>
              <p className="mt-auto border-t border-[#E5E7EB] pt-3 text-xs font-medium text-[#1C1C1E]">
                {step.checkpoint}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
