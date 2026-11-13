'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import Magnetic from '@/components/ui/Magnetic';
import { SpringButton } from '@jacxishippingorg/jx-ui-react';

interface ContactSectionProps {
  isAuthenticated?: boolean;
}

const socialLinks = [
  { label: 'FB', href: 'https://facebook.com/' },
  { label: 'IG', href: 'https://instagram.com/' },
  { label: 'WA', href: 'https://wa.me/93704117413' },
];

const contactNumbers = [
  { href: 'tel:+19252008927', label: '+1 (925) 200-8927' },
  { href: 'tel:+93704117413', label: '+93 704 117 413' },
];

const inputClassName = 'w-full rounded-lg border border-black/10 bg-[#F9FAFB] px-4 py-3 text-base text-black outline-none transition placeholder:text-black/60 focus:border-[#D4AF37] focus:ring-4 focus:ring-[rgba(var(--accent-gold-rgb),0.16)]';

export default function ContactSection({ isAuthenticated = false }: ContactSectionProps) {
  const [formState, setFormState] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

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
          message: `General inquiry:\n${formState.message}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setSubmitted(true);
      setFormState({ name: '', email: '', phone: '', message: '' });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="relative bg-[#F9FAFB] py-16 sm:py-24 lg:py-32 text-gray-900 overflow-hidden scroll-mt-20">
      <div id="contact-us" className="absolute -top-20" aria-hidden="true" />
      {/* Background Graphic */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.06)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
           <div className="inline-flex items-center gap-3 justify-center mb-4 sm:mb-6">
              <span className="h-px w-6 bg-[#D4AF37]" />
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#D4AF37]">Contact</span>
              <span className="h-px w-6 bg-[#D4AF37]" />
           </div>
          <h2 className="landing-reveal text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-gray-900 mb-4 sm:mb-6">
            Talk to a shipping coordinator.
          </h2>
          <p className="landing-reveal text-base sm:text-xl text-black/60">
            Ready to ship your vehicle or need route clarity? Reach the team by phone, WhatsApp, email, or the message form.
          </p>
        </div>

        <div className="grid gap-8 lg:gap-12 lg:grid-cols-[1fr_1.5fr] items-start">
          <div className="space-y-6 sm:space-y-8">
            <div className="landing-reveal grid gap-3">
              <div className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex gap-4">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-[#D4AF37]" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">Address</p>
                    <p className="mt-1 text-xs sm:text-sm leading-relaxed text-black/60">Herat Customs Department, Herat, Afghanistan</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex gap-4">
                  <Phone className="mt-1 h-5 w-5 shrink-0 text-[#D4AF37]" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">Phone</p>
                    <div className="mt-1 space-y-1">
                      {contactNumbers.map((number) => (
                        <a key={number.href} href={number.href} className="block text-xs sm:text-sm font-bold text-black hover:text-[#D4AF37]">
                          {number.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex gap-4">
                  <Mail className="mt-1 h-5 w-5 shrink-0 text-[#D4AF37]" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">Email</p>
                    <a href="mailto:info@jacxi.com" className="mt-1 block text-xs sm:text-sm font-semibold text-gray-900 hover:text-[#D4AF37]">info@jacxi.com</a>
                  </div>
                </div>
              </div>
            </div>

            <div className="landing-reveal flex flex-wrap gap-2.5">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-black/10 bg-white px-4 text-xs font-bold text-black shadow-sm transition hover:border-[#D4AF37] hover:text-[#D4AF37]"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href={isAuthenticated ? '/dashboard' : '/auth/signin'}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#D4AF37] px-4 text-xs font-bold text-white shadow-sm transition hover:brightness-105"
              >
                {isAuthenticated ? 'Open dashboard' : 'Customer portal'}
              </Link>
            </div>
          </div>

          <div className="landing-reveal rounded-2xl sm:rounded-3xl border border-black/5 bg-white p-5 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 to-transparent pointer-events-none" />
            <div className="relative mb-6">
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#D4AF37] mb-1">Send a message</h3>
                <p className="text-xs sm:text-sm text-black/60">We usually respond within one business day.</p>
              </div>
            </div>

            <div className="relative">
              {submitted ? (
                <div className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 p-5 text-sm text-black" role="status">
                  Your message has been sent. Our team will respond shortly.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      aria-label="Your name"
                      value={formState.name}
                      onChange={(event) => handleChange('name', event.target.value)}
                      placeholder="Your name"
                      className={inputClassName}
                      required
                    />
                    <input
                      aria-label="Email address"
                      value={formState.email}
                      onChange={(event) => handleChange('email', event.target.value)}
                      placeholder="Email address"
                      type="email"
                      className={inputClassName}
                      required
                    />
                  </div>
                  <input
                    aria-label="Phone number"
                    value={formState.phone}
                    onChange={(event) => handleChange('phone', event.target.value)}
                    placeholder="Phone number"
                    type="tel"
                    autoComplete="tel"
                    className={inputClassName}
                    required
                  />
                  <textarea
                    aria-label="Message"
                    value={formState.message}
                    onChange={(event) => handleChange('message', event.target.value)}
                    placeholder="Message"
                    rows={4}
                    className={`${inputClassName} resize-none`}
                    required
                  />
                  {error ? <p className="text-sm text-[var(--error)]">{error}</p> : null}
                  <SpringButton
                    type="submit"
                    disabled={submitting}
                    className="group relative flex w-full h-13 sm:h-14 items-center justify-center overflow-hidden rounded-full bg-slate-950 font-bold text-white shadow-lg transition-transform hover:brightness-110 disabled:opacity-60"
                  >
                    <div className="absolute inset-0 bg-[#D4AF37] translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0" />
                    <span className="relative z-10 flex items-center gap-2 text-white transition-colors duration-300 group-hover:text-slate-950 text-sm sm:text-base">
                      {submitting ? 'Sending...' : 'Send message'}
                      {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
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
