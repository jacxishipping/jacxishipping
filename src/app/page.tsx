import type { CSSProperties } from 'react';
import Header from '@/components/sections/Header';
import Footer from '@/components/sections/Footer';
import AboutMiniSection from '@/components/sections/AboutMiniSection';
import QuoteFormSection from '@/components/sections/QuoteFormSection';
import ContactSection from '@/components/sections/home/ContactSection';
import FAQSection from '@/components/sections/home/FAQSection';
import HeroSection from '@/components/sections/home/HeroSection';
import ProcessSection from '@/components/sections/home/ProcessSection';
import PublicRateCalculatorSection from '@/components/sections/PublicRateCalculatorSection';
import RoutesAnimatedSection from '@/components/sections/RoutesAnimatedSection';
import ServicesPreviewSection from '@/components/sections/home/ServicesPreviewSection';
import TestimonialsSection from '@/components/sections/home/TestimonialsSection';

// Lock the public marketing landing page to JACXI's Enterprise Light tokens
// so users who toggle dark mode in the dashboard never see half-dark/half-light bands.
const landingLightTokens: CSSProperties = {
  ['--background' as string]: '#F9FAFB',
  ['--panel' as string]: '#FFFFFF',
  ['--border' as string]: '#E5E7EB',
  ['--text-primary' as string]: '#1C1C1E',
  ['--text-secondary' as string]: '#5F6368',
  ['--accent-gold-text' as string]: '#6B5C17',
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'JACXI Shipping',
      url: 'https://www.jacxishipping.com',
      logo: 'https://www.jacxishipping.com/main-logo.png',
      email: 'info@jacxi.com',
      telephone: ['+1-925-200-8927', '+93-704-117-413'],
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Herat Customs Department',
        addressLocality: 'Herat',
        addressCountry: 'AF',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Which route does JACXI use for Afghanistan vehicle shipping?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'JACXI coordinates vehicle shipping from across the USA and Canada to Afghanistan using one of two route options: through Mersin, Turkey or through UAE, followed by customs clearance and delivery inside Afghanistan.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can you deliver outside Herat or Kabul?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Herat is a primary hub, and JACXI supports delivery planning across all 34 Afghan provinces including Kabul, Kandahar, Mazar-i-Sharif, Jalalabad, and Kunduz.',
          },
        },
      ],
    },
  ],
};

export default function Home() {
  return (
    <div
      style={landingLightTokens}
      className="min-h-screen bg-white text-[#1C1C1E] font-sans selection:bg-[#D4AF37] selection:text-[#1C1C1E]"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Header />
      <main id="main-content">
        <HeroSection />
        <RoutesAnimatedSection />
        <ServicesPreviewSection />
        <ProcessSection />
        <PublicRateCalculatorSection />
        <TestimonialsSection />
        <AboutMiniSection />
        <FAQSection />
        <QuoteFormSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
