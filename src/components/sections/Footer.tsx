import Link from 'next/link';
import { SiteMark } from '@/components/brand/SiteLogo';

const footerNavigation = {
  solutions: [
    { name: 'Vehicle sourcing', href: '/services' },
    { name: 'Ocean freight', href: '/services' },
    { name: 'Customs clearance', href: '/services' },
    { name: 'Secure storage', href: '/services' },
  ],
  support: [
    { name: 'FAQ', href: '/#faq' },
    { name: 'Contact us', href: '/#contact' },
    { name: 'Get a quote', href: '/#quote' },
    { name: 'Customer portal', href: '/auth/signin' },
  ],
  company: [
    { name: 'About JACXI', href: '/#about' },
    { name: 'Our process', href: '/#process' },
    { name: 'Corridor routes', href: '/#route' },
  ],
  legal: [
    { name: 'Privacy policy', href: '/legal/app-privacy-policy' },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-white text-[#1C1C1E]" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr] lg:gap-12">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <SiteMark size={28} className="h-7 w-7 shrink-0" />
              <span className="text-base font-semibold tracking-tight text-[#1C1C1E]">JACXI Shipping</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-[#5F6368]">
              Vehicle logistics from the USA and Canada to Afghanistan via Mersin and UAE corridors.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1C1C1E]">Solutions</h3>
              <ul role="list" className="mt-4 space-y-2.5">
                {footerNavigation.solutions.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="inline-flex min-h-[28px] items-center text-sm text-[#5F6368] transition-colors hover:text-[#1C1C1E]"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1C1C1E]">Support</h3>
              <ul role="list" className="mt-4 space-y-2.5">
                {footerNavigation.support.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="inline-flex min-h-[28px] items-center text-sm text-[#5F6368] transition-colors hover:text-[#1C1C1E]"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1C1C1E]">Company</h3>
              <ul role="list" className="mt-4 space-y-2.5">
                {footerNavigation.company.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="inline-flex min-h-[28px] items-center text-sm text-[#5F6368] transition-colors hover:text-[#1C1C1E]"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1C1C1E]">Legal</h3>
              <ul role="list" className="mt-4 space-y-2.5">
                {footerNavigation.legal.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="inline-flex min-h-[28px] items-center text-sm text-[#5F6368] transition-colors hover:text-[#1C1C1E]"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-[#E5E7EB] pt-6 text-xs text-[#5F6368] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} JACXI Shipping. All rights reserved.</p>
          <p>Herat Customs Department · USA & Canada Export Operations</p>
        </div>
      </div>
    </footer>
  );
}
