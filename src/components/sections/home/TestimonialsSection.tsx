const testimonials = [
  {
    quote:
      'JACXI handled my Toyota Land Cruiser with complete professionalism. It arrived in Herat in great condition, and customs clearance was straightforward from start to finish.',
    name: 'Ahmed R.',
    role: 'Herat, Afghanistan',
  },
  {
    quote:
      'I was cautious about shipping a car internationally, but the team kept me updated at every milestone. Transparent, responsive, and dependable.',
    name: 'Khalid M.',
    role: 'Kabul, Afghanistan',
  },
  {
    quote:
      'Best pricing I found for USA to Afghanistan vehicle shipping. Honest communication, careful handling, and clear portal tracking throughout.',
    name: 'Farida N.',
    role: 'Kandahar, Afghanistan',
  },
  {
    quote:
      'They coordinated our multi-vehicle shipment from pickup to handover without surprises. The corridor visibility made a real difference for our planning.',
    name: 'Sarah Jenkins',
    role: 'Fleet client',
  },
];

export default function TestimonialsSection() {
  return (
    <section className="border-t border-[#E5E7EB] bg-[#F9FAFB] py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5C17]">
            Client feedback
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-[#1C1C1E] sm:text-4xl">
            Trusted by families and fleet importers.
          </h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {testimonials.map((item) => (
            <article
              key={item.name}
              className="flex flex-col justify-between rounded-xl border border-[#E5E7EB] bg-white p-6 sm:p-7"
            >
              <p className="text-sm leading-relaxed text-[#1C1C1E] sm:text-base">
                &ldquo;{item.quote}&rdquo;
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-[#E5E7EB] pt-4">
                <p className="text-sm font-semibold text-[#1C1C1E]">{item.name}</p>
                <p className="text-xs text-[#5F6368]">{item.role}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
