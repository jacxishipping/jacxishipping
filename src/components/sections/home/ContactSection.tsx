'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';

interface ContactSectionProps {
  isAuthenticated?: boolean;
}

const contactNumbers = [
  { href: 'tel:+19252008927', label: '+1 (925) 200-8927' },
  { href: 'tel:+93704117413', label: '+93 704 117 413' },
];

export default function ContactSection({ isAuthenticated: isAuthenticatedProp }: ContactSectionProps) {
  const [clientAuthenticated, setClientAuthenticated] = useState(false);
  const isAuthenticated = isAuthenticatedProp ?? clientAuthenticated;

  useEffect(() => {
    if (isAuthenticatedProp !== undefined) return;
    const controller = new AbortController();
    fetch('/api/auth/session', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setClientAuthenticated(true);
      })
      .catch(() => {
        // Ignore session lookup errors on public pages
      });
    return () => controller.abort();
  }, [isAuthenticatedProp]);

  return (
    <section id="contact" className="relative border-t border-[#E5E7EB] bg-[#F9FAFB] py-16 sm:py-20 scroll-mt-16">
      <div id="contact-us" className="absolute -top-16" aria-hidden="true" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5C17]">
              Direct contact
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-[#1C1C1E] sm:text-3xl">
              Speak with a shipping coordinator.
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://wa.me/93704117413"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#1C1C1E] transition-colors hover:border-[#1C1C1E]/30"
            >
              <MessageCircle className="h-4 w-4 text-[#047857]" aria-hidden="true" />
              <span>Chat on WhatsApp</span>
            </a>

            <Link
              href={isAuthenticated ? '/dashboard' : '/auth/signin'}
              className="inline-flex h-11 items-center rounded-lg bg-[#1C1C1E] px-5 text-sm font-medium text-white transition-colors hover:bg-[#333336]"
            >
              {isAuthenticated ? 'Open dashboard' : 'Customer portal'}
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
            <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-[#5F6368]">
              <Phone className="h-4 w-4 text-[#6B5C17]" aria-hidden="true" />
              <span>Phone</span>
            </div>
            <div className="mt-3 space-y-1">
              {contactNumbers.map((number) => (
                <a
                  key={number.href}
                  href={number.href}
                  className="block text-sm font-medium text-[#1C1C1E] transition-colors hover:text-[#6B5C17]"
                >
                  {number.label}
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
            <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-[#5F6368]">
              <Mail className="h-4 w-4 text-[#6B5C17]" aria-hidden="true" />
              <span>Email</span>
            </div>
            <a
              href="mailto:info@jacxi.com"
              className="mt-3 block text-sm font-medium text-[#1C1C1E] transition-colors hover:text-[#6B5C17]"
            >
              info@jacxi.com
            </a>
            <p className="mt-1 text-xs text-[#5F6368]">Responses within one business day</p>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
            <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-[#5F6368]">
              <MapPin className="h-4 w-4 text-[#6B5C17]" aria-hidden="true" />
              <span>Herat office</span>
            </div>
            <p className="mt-3 text-sm font-medium text-[#1C1C1E]">
              Herat Customs Department
            </p>
            <p className="mt-1 text-xs text-[#5F6368]">Herat, Afghanistan</p>
          </div>
        </div>
      </div>
    </section>
  );
}
