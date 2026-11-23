import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'Which route does JACXI use for Afghanistan vehicle shipping?',
    answer:
      'JACXI coordinates vehicle shipping from across the USA and Canada to Afghanistan using one of two route options: through Mersin, Turkey or through UAE. Our team handles final customs and delivery inside Afghanistan.',
  },
  {
    question: 'Can you deliver outside Herat or Kabul?',
    answer:
      'Yes. Herat is a primary hub, and we coordinate delivery across all 34 Afghan provinces including Kabul, Kandahar, Mazar-i-Sharif, Jalalabad, and Kunduz.',
  },
  {
    question: 'What details are needed for an accurate quote?',
    answer:
      'Vehicle year, make, model, pickup location, destination province, title or auction details, and running condition help us confirm the most accurate corridor and price.',
  },
  {
    question: 'Does the quote form create a shipment or charge my account?',
    answer:
      'No. Submitting the public quote form only sends an inquiry to our dispatch team so we can price your lane. It does not open a shipment record, create an invoice, or charge your account.',
  },
  {
    question: 'Can I track a shipment after it is active?',
    answer:
      'Yes. You can look up any active container on our public tracking page, and registered clients receive milestone updates and documents in the customer portal.',
  },
];

export default function FAQSection() {
  return (
    <section id="faq" className="border-t border-[#E5E7EB] bg-[#F9FAFB] py-20 sm:py-24 scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.42fr_0.58fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5C17]">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-[#1C1C1E] sm:text-4xl">
              Common questions.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#5F6368]">
              Clear answers before you ship from North America to Afghanistan.
            </p>
          </div>

          <div className="divide-y divide-[#E5E7EB] border-y border-[#E5E7EB]">
            {faqs.map((faq, index) => (
              <details
                key={faq.question}
                className="group py-5"
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-medium text-[#1C1C1E] transition-colors hover:text-[#6B5C17]">
                  <span>{faq.question}</span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-[#5F6368] transition-transform duration-200 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-3 pr-8 text-sm leading-relaxed text-[#5F6368] sm:text-base">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
