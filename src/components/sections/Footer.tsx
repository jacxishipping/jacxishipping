'use client';

import { motion } from 'framer-motion';
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
    // Terms of service / Cookie policy pages do not exist yet — no link
    // is shown for them rather than pointing both at the privacy policy.
  ],
};

export default function Footer() {
  return (
    <footer className="relative bg-[#F9FAFB] pt-16 sm:pt-24 lg:pt-32 pb-12 overflow-hidden selection:bg-[#D4AF37] selection:text-gray-900" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>
      
      {/* Abstract Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Giant Typographic CTA */}
        <div className="mb-16 sm:mb-28 flex flex-col items-center justify-center text-center">
           <motion.h3 
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.6, ease: "easeOut" }}
             className="text-4xl font-bold leading-none tracking-tight text-gray-900 sm:text-7xl md:text-8xl lg:text-9xl"
           >
             READY TO <br/>
             <span className="text-[#D4AF37] font-serif font-light italic tracking-normal">SHIP?</span>
           </motion.h3>
           
           <motion.div
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             viewport={{ once: true }}
             transition={{ duration: 0.5, delay: 0.2 }}
             className="mt-8 sm:mt-10 relative z-10"
           >
            <Link
              href="/#quote"
              className="group relative flex h-24 w-24 sm:h-36 sm:w-36 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg transition-transform hover:scale-105"
            >
              <div className="absolute inset-0 rounded-full border border-[#D4AF37] scale-150 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500 ease-out" />
              <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#D4AF37] group-hover:text-white transition-colors">Start now</span>
            </Link>
          </motion.div>
        </div>

        <div className="grid border-t border-black/5 pt-12 sm:pt-16 xl:grid-cols-3 xl:gap-8">
          <div className="space-y-6 sm:space-y-8 xl:col-span-1">
            <SiteMark size={56} className="h-14 w-14 text-gray-900 relative z-10" />
            <p className="max-w-xs text-sm leading-relaxed text-black/60">
              Premium vehicle logistics from North America to Afghanistan. Flawless handling through trusted corridors.
            </p>
            <div className="flex gap-x-6">
               <span className="text-xs font-mono uppercase tracking-widest text-[#8D7A1F] font-semibold">© 2026 JACXI SHIPPING</span>
            </div>
          </div>
          
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-bold text-gray-900 tracking-widest uppercase">Solutions</h3>
                <ul role="list" className="mt-6 space-y-3">
                  {footerNavigation.solutions.map((item) => (
                    <li key={item.name}>
                      <Link href={item.href} className="inline-flex min-h-[28px] items-center py-1 text-sm text-black/60 hover:text-gray-900 transition-colors">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-bold text-gray-900 tracking-widest uppercase">Support</h3>
                <ul role="list" className="mt-6 space-y-3">
                  {footerNavigation.support.map((item) => (
                    <li key={item.name}>
                      <Link href={item.href} className="inline-flex min-h-[28px] items-center py-1 text-sm text-black/60 hover:text-gray-900 transition-colors">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-bold text-gray-900 tracking-widest uppercase">Company</h3>
                <ul role="list" className="mt-6 space-y-3">
                  {footerNavigation.company.map((item) => (
                    <li key={item.name}>
                      <Link href={item.href} className="inline-flex min-h-[28px] items-center py-1 text-sm text-black/60 hover:text-gray-900 transition-colors">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-bold text-gray-900 tracking-widest uppercase">Legal</h3>
                <ul role="list" className="mt-6 space-y-3">
                  {footerNavigation.legal.map((item) => (
                    <li key={item.name}>
                      <Link href={item.href} className="inline-flex min-h-[28px] items-center py-1 text-sm text-black/60 hover:text-gray-900 transition-colors">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
