'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { SpringButton } from '@jacxishippingorg/jx-ui-react';

interface ContactSectionProps {
  isAuthenticated?: boolean;
}

const contactNumbers = [
  { href: 'tel:+19252008927', label: '+1 (925) 200-8927' },
  { href: 'tel:+93704117413', label: '+93 704 117 413' },
];

const inputClassName =
  'w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-base text-[#1C1C1E] outline-none transition placeholder:text-[#5F6368] focus:border-[#D4AF37] focus:ring-4 focus:ring-[rgba(212,175,55,0.16)]';

export default function ContactSection({ isAuthenticated: isAuthenticatedProp }: ContactSectionProps) {
  const [clientAuthenticated, setClientAuthenticated] = useState(false);
  const isAuthenticated = isAuthenticatedProp ?? clientAuthenticated;
  const [formState, setFormState] = useState({ name: '', email: '', phone: '', message: '', website: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

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

  const handleChange = (field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formState.name,
          email: formState.email,
          phone: formState.phone,
          website: formState.website,
          message: `General inquiry:\n${formState.message}`,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'Failed to send message');
      }

      setSubmitted(true);
      setFormState({ name: '', email: '', phone: '', message: '', website: '' });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="relative bg-[#F9FAFB] py-16 sm:py-20 lg:py-24 text-[#1C1C1E] overflow-hidden scroll-mt-20">
      <div id="contact-us" className="absolute -top-20" aria-hidden="true" />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.06)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-3 justify-center mb-4 sm:mb-6">
            <span className="h-px w-6 bg-black/25" />
            <span className="text-xs font-mono font-semibold uppercase tracking-[0.2em] text-[#5F6368]">Contact</span>
            <span className="h-px w-6 bg-black/25" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-[#1C1C1E] mb-4 sm:mb-6">
            Talk to a shipping coordinator.
          </h2>
          <p className="text-base sm:text-xl text-[#5F6368]">
            Ready to ship your vehicle or need route clarity? Reach the team by phone, WhatsApp, email, or the message form.
          </p>
        </div>

        <div className="grid gap-8 lg:gap-12 lg:grid-cols-[1fr_1.5fr] items-start">
          <div className="space-y-6 sm:space-y-8">
            <div className="grid gap-3">
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex gap-4">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-[#6B5C17]" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-[#1C1C1E] text-sm sm:text-base">Address</p>
                    <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[#5F6368]">Herat Customs Department, Herat, Afghanistan</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex gap-4">
                  <Phone className="mt-1 h-5 w-5 shrink-0 text-[#6B5C17]" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-[#1C1C1E] text-sm sm:text-base">Phone</p>
                    <div className="mt-1 space-y-1">
                      {contactNumbers.map((number) => (
                        <a key={number.href} href={number.href} className="block text-xs sm:text-sm font-bold text-[#1C1C1E] hover:text-[#6B5C17] transition-colors">
                          {number.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex gap-4">
                  <Mail className="mt-1 h-5 w-5 shrink-0 text-[#6B5C17]" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-[#1C1C1E] text-sm sm:text-base">Email</p>
                    <a href="mailto:info@jacxi.com" className="mt-1 block text-xs sm:text-sm font-semibold text-[#1C1C1E] hover:text-[#6B5C17] transition-colors">
                      info@jacxi.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <a
                href="https://wa.me/93704117413"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 text-xs font-bold text-[#1C1C1E] shadow-sm transition hover:border-[#D4AF37] hover:text-[#6B5C17]"
              >
                <MessageCircle className="h-4 w-4 text-[#047857]" aria-hidden="true" />
                Chat on WhatsApp
              </a>
              <Link
                href={isAuthenticated ? '/dashboard' : '/auth/signin'}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[#D4AF37] px-5 text-xs font-bold text-[#1C1C1E] shadow-sm transition hover:bg-[#B89428] hover:text-white"
              >
                {isAuthenticated ? 'Open dashboard' : 'Customer portal'}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-8 shadow-lg relative overflow-hidden">
            <div className="relative mb-6">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#5F6368] mb-1">Send a message</h3>
              <p className="text-xs sm:text-sm text-[#5F6368]">We usually respond within one business day.</p>
            </div>

            <div className="relative">
              {submitted ? (
                <div className="rounded-xl border border-[#10B981]/30 bg-[#D1FAE5]/40 p-5 text-sm font-medium text-[#047857]" role="status" aria-live="polite">
                  Your message has been sent. Our team will respond shortly.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={formState.website}
                    onChange={(event) => handleChange('website', event.target.value)}
                    className="hidden"
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="contact-name" className="block text-xs font-semibold text-[#1C1C1E] mb-1.5">
                        Your name
                      </label>
                      <input
                        id="contact-name"
                        value={formState.name}
                        onChange={(event) => handleChange('name', event.target.value)}
                        placeholder="Full name"
                        autoComplete="name"
                        className={inputClassName}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="block text-xs font-semibold text-[#1C1C1E] mb-1.5">
                        Email address
                      </label>
                      <input
                        id="contact-email"
                        value={formState.email}
                        onChange={(event) => handleChange('email', event.target.value)}
                        placeholder="you@example.com"
                        type="email"
                        autoComplete="email"
                        className={inputClassName}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-phone" className="block text-xs font-semibold text-[#1C1C1E] mb-1.5">
                      Phone or WhatsApp number
                    </label>
                    <input
                      id="contact-phone"
                      value={formState.phone}
                      onChange={(event) => handleChange('phone', event.target.value)}
                      placeholder="+1 (925) 000-0000"
                      type="tel"
                      autoComplete="tel"
                      className={inputClassName}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="block text-xs font-semibold text-[#1C1C1E] mb-1.5">
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      value={formState.message}
                      onChange={(event) => handleChange('message', event.target.value)}
                      placeholder="Tell us about your vehicle, origin city, and destination province..."
                      rows={4}
                      className={`${inputClassName} resize-none`}
                      required
                    />
                  </div>

                  {error ? <p className="text-sm font-medium text-[var(--error)]" role="alert">{error}</p> : null}

                  <SpringButton
                    type="submit"
                    disabled={submitting}
                    className="group relative flex w-full h-12 sm:h-14 items-center justify-center overflow-hidden rounded-xl bg-slate-950 font-bold text-white shadow-lg transition-transform hover:brightness-110 disabled:opacity-60"
                  >
                    <div className="absolute inset-0 bg-[#D4AF37] translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0" />
                    <span className="relative z-10 flex items-center gap-2 text-white transition-colors duration-300 group-hover:text-slate-950 text-sm sm:text-base">
                      {submitting ? 'Sending...' : 'Send message'}
                      {!submitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
                    </span>
                  </SpringButton>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
