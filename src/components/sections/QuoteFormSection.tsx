'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRight, CheckCircle, ShieldCheck, Ship } from 'lucide-react';
import { motion } from 'framer-motion';
import { SpringButton } from '@jacxishippingorg/jx-ui-react';
import { JacxiButton } from '@/components/design-system/JacxiButton';

const quoteSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name (at least 2 characters)'),
  email: z.string().trim().email('Please enter a valid email address'),
  phone: z.string().trim().min(7, 'Please enter a valid phone number (at least 7 digits)'),
  vehicleMake: z.string().trim().min(2, 'Vehicle make is required (e.g., Toyota)'),
  vehicleModel: z.string().trim().min(1, 'Vehicle model is required (e.g., Land Cruiser)'),
  vehicleYear: z.string().trim().regex(/^\d{4}$/, 'Enter a 4-digit year (e.g., 2024)'),
  pickupLocation: z.string().trim().min(2, 'Origin city or state is required'),
  destinationProvince: z.string().trim().min(2, 'Destination province is required'),
  additionalNotes: z.string().optional(),
  website: z.string().optional(),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

export interface QuotePrefillDetail {
  pickupLocation?: string;
  destinationProvince?: string;
  vehicleClass?: string;
}

const fieldClassName =
  'peer w-full rounded-none border-0 border-b border-black/20 bg-transparent px-0 py-3 text-base sm:text-lg text-[#1C1C1E] shadow-none outline-none focus-visible:outline-none transition-all duration-300 focus:border-b-2 focus:border-[#D4AF37] focus:ring-0 placeholder:text-transparent';
const labelClassName =
  'pointer-events-none absolute left-0 top-3 text-sm sm:text-base text-[#5F6368] transition-all duration-300 peer-focus:-translate-y-5 peer-focus:text-xs peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-[#6B5C17] peer-[:not(:placeholder-shown)]:-translate-y-5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-widest peer-[:not(:placeholder-shown)]:text-[#5F6368]';

export default function QuoteFormSection() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
  });

  // Pre-fill origin/destination/class when triggered from PublicRateCalculatorSection
  useEffect(() => {
    const handlePrefill = (event: Event) => {
      const customEvent = event as CustomEvent<QuotePrefillDetail>;
      const detail = customEvent.detail;
      if (!detail) return;
      setSubmitted(false);
      if (detail.pickupLocation) {
        setValue('pickupLocation', detail.pickupLocation, { shouldValidate: true, shouldDirty: true });
      }
      if (detail.destinationProvince) {
        setValue('destinationProvince', detail.destinationProvince, { shouldValidate: true, shouldDirty: true });
      }
      if (detail.vehicleClass) {
        setValue('additionalNotes', `Vehicle class: ${detail.vehicleClass}`, { shouldDirty: true });
      }
    };

    window.addEventListener('jacxi:prefill-quote', handlePrefill);
    return () => window.removeEventListener('jacxi:prefill-quote', handlePrefill);
  }, [setValue]);

  const onSubmit = async (data: QuoteFormData) => {
    try {
      setSubmitError('');
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.fullName,
          email: data.email,
          phone: data.phone,
          website: data.website || '',
          message: [
            'Vehicle quote request',
            `Vehicle: ${data.vehicleYear} ${data.vehicleMake} ${data.vehicleModel}`,
            `Origin: ${data.pickupLocation}`,
            `Destination: ${data.destinationProvince}`,
            data.additionalNotes ? `Notes: ${data.additionalNotes}` : '',
          ].filter(Boolean).join('\n'),
        }),
      });

      if (!response.ok) {
        throw new Error('We could not send your request. Please try again or contact us directly.');
      }
      setSubmitted(true);
      reset();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'We could not send your request. Please try again.');
    }
  };

  if (submitted) {
    return (
      <section id="quote" className="relative flex min-h-[60vh] items-center justify-center bg-[#F9FAFB] py-16 px-4 scroll-mt-20">
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
          role="status"
          aria-live="polite"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h2 className="mb-3 text-3xl sm:text-4xl font-bold tracking-tight text-[#1C1C1E]">Quote requested.</h2>
          <p className="text-base sm:text-lg text-[#5F6368] max-w-lg mx-auto">
            Our logistics team is analyzing the lane. We will contact you shortly with accurate pricing and routing options.
          </p>
          <JacxiButton
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-8 rounded-xl bg-[#D4AF37] px-6 py-3 font-bold uppercase tracking-widest text-xs text-[#1C1C1E] hover:brightness-95 transition-all"
          >
            Request another quote
          </JacxiButton>
        </motion.div>
      </section>
    );
  }

  return (
    <section id="quote" className="relative flex items-center justify-center bg-white py-16 sm:py-20 lg:py-24 scroll-mt-20">
      <div className="absolute inset-0 bg-[#F9FAFB] [clip-path:polygon(0_0,100%_0,100%_80%,0_100%)] pointer-events-none" />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:gap-16 lg:grid-cols-[1.1fr_1.1fr] items-start">

          {/* Left Text Block */}
          <div className="lg:pr-8">
            <div>
              <div className="inline-flex items-center gap-3 mb-4 sm:mb-6">
                <span className="h-px w-8 bg-black/25" />
                <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#5F6368] font-semibold">Initiate shipment</span>
              </div>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#1C1C1E] leading-[1.05]">
                Precision pricing.<br />
                <span className="italic font-serif font-light text-[#5F6368]">Guaranteed lanes.</span>
              </h2>
              <p className="mt-4 sm:mt-6 text-base sm:text-lg leading-relaxed text-[#5F6368] max-w-lg">
                Enter your vehicle and origin details. We analyze the current corridor conditions to provide a firm, accurate quote for North America to Afghanistan delivery.
              </p>

              <div className="mt-8 sm:mt-12 grid gap-4 sm:grid-cols-2">
                {[
                  { title: 'Direct Hubs', sub: 'Mersin & UAE Options', icon: Ship },
                  { title: 'Clear Customs', sub: 'No hidden fees', icon: ShieldCheck },
                ].map((feature, i) => (
                  <div key={i} className="flex gap-3.5 items-start p-3.5 rounded-2xl bg-slate-50 border border-[#E5E7EB]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#1C1C1E]">{feature.title}</h3>
                      <p className="text-xs text-[#5F6368]">{feature.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Form Block */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.55 }}
            className="rounded-2xl sm:rounded-3xl bg-white p-5 sm:p-8 md:p-10 shadow-xl border border-[#E5E7EB]"
          >
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
              {/* Hidden honeypot for automated bots */}
              <input
                {...register('website')}
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="relative">
                  <input
                    {...register('fullName')}
                    id="quote-fullName"
                    placeholder=" "
                    aria-invalid={Boolean(errors.fullName)}
                    aria-describedby={errors.fullName ? 'quote-fullName-error' : undefined}
                    className={`${fieldClassName} ${errors.fullName ? 'border-[var(--error)]' : ''}`}
                  />
                  <label htmlFor="quote-fullName" className={labelClassName}>Full name</label>
                  {errors.fullName && (
                    <p id="quote-fullName-error" role="alert" className="mt-1.5 text-xs font-medium text-[var(--error)]">
                      {errors.fullName.message}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <input
                    {...register('email')}
                    id="quote-email"
                    type="email"
                    placeholder=" "
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'quote-email-error' : undefined}
                    className={`${fieldClassName} ${errors.email ? 'border-[var(--error)]' : ''}`}
                  />
                  <label htmlFor="quote-email" className={labelClassName}>Email address</label>
                  {errors.email && (
                    <p id="quote-email-error" role="alert" className="mt-1.5 text-xs font-medium text-[var(--error)]">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="relative">
                <input
                  {...register('phone')}
                  id="quote-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder=" "
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? 'quote-phone-error' : undefined}
                  className={`${fieldClassName} ${errors.phone ? 'border-[var(--error)]' : ''}`}
                />
                <label htmlFor="quote-phone" className={labelClassName}>Phone or WhatsApp number</label>
                {errors.phone && (
                  <p id="quote-phone-error" role="alert" className="mt-1.5 text-xs font-medium text-[var(--error)]">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="pt-3 pb-1">
                <h3 className="text-xs font-mono font-semibold uppercase tracking-[0.2em] text-[#5F6368]">Vehicle Data</h3>
              </div>

              <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
                <div className="relative">
                  <input
                    {...register('vehicleYear')}
                    id="quote-vehicleYear"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder=" "
                    aria-invalid={Boolean(errors.vehicleYear)}
                    aria-describedby={errors.vehicleYear ? 'quote-vehicleYear-error' : undefined}
                    className={`${fieldClassName} ${errors.vehicleYear ? 'border-[var(--error)]' : ''}`}
                  />
                  <label htmlFor="quote-vehicleYear" className={labelClassName}>Year (e.g. 2024)</label>
                  {errors.vehicleYear && (
                    <p id="quote-vehicleYear-error" role="alert" className="mt-1.5 text-xs font-medium text-[var(--error)]">
                      {errors.vehicleYear.message}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <input
                    {...register('vehicleMake')}
                    id="quote-vehicleMake"
                    placeholder=" "
                    aria-invalid={Boolean(errors.vehicleMake)}
                    aria-describedby={errors.vehicleMake ? 'quote-vehicleMake-error' : undefined}
                    className={`${fieldClassName} ${errors.vehicleMake ? 'border-[var(--error)]' : ''}`}
                  />
                  <label htmlFor="quote-vehicleMake" className={labelClassName}>Make</label>
                  {errors.vehicleMake && (
                    <p id="quote-vehicleMake-error" role="alert" className="mt-1.5 text-xs font-medium text-[var(--error)]">
                      {errors.vehicleMake.message}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <input
                    {...register('vehicleModel')}
                    id="quote-vehicleModel"
                    placeholder=" "
                    aria-invalid={Boolean(errors.vehicleModel)}
                    aria-describedby={errors.vehicleModel ? 'quote-vehicleModel-error' : undefined}
                    className={`${fieldClassName} ${errors.vehicleModel ? 'border-[var(--error)]' : ''}`}
                  />
                  <label htmlFor="quote-vehicleModel" className={labelClassName}>Model</label>
                  {errors.vehicleModel && (
                    <p id="quote-vehicleModel-error" role="alert" className="mt-1.5 text-xs font-medium text-[var(--error)]">
                      {errors.vehicleModel.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 pb-1">
                <h3 className="text-xs font-mono font-semibold uppercase tracking-[0.2em] text-[#5F6368]">Routing Requirements</h3>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="relative">
                  <input
                    {...register('pickupLocation')}
                    id="quote-pickupLocation"
                    placeholder=" "
                    aria-invalid={Boolean(errors.pickupLocation)}
                    aria-describedby={errors.pickupLocation ? 'quote-pickupLocation-error' : undefined}
                    className={`${fieldClassName} ${errors.pickupLocation ? 'border-[var(--error)]' : ''}`}
                  />
                  <label htmlFor="quote-pickupLocation" className={labelClassName}>Origin (City/State)</label>
                  {errors.pickupLocation && (
                    <p id="quote-pickupLocation-error" role="alert" className="mt-1.5 text-xs font-medium text-[var(--error)]">
                      {errors.pickupLocation.message}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <input
                    {...register('destinationProvince')}
                    id="quote-destinationProvince"
                    placeholder=" "
                    aria-invalid={Boolean(errors.destinationProvince)}
                    aria-describedby={errors.destinationProvince ? 'quote-destinationProvince-error' : undefined}
                    className={`${fieldClassName} ${errors.destinationProvince ? 'border-[var(--error)]' : ''}`}
                  />
                  <label htmlFor="quote-destinationProvince" className={labelClassName}>Dest. Province</label>
                  {errors.destinationProvince && (
                    <p id="quote-destinationProvince-error" role="alert" className="mt-1.5 text-xs font-medium text-[var(--error)]">
                      {errors.destinationProvince.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="relative pt-2">
                <textarea
                  {...register('additionalNotes')}
                  id="quote-additionalNotes"
                  placeholder=" "
                  rows={3}
                  className={`${fieldClassName} resize-none`}
                />
                <label htmlFor="quote-additionalNotes" className={labelClassName}>
                  Additional details (Auction Lot # / VIN, condition)
                </label>
              </div>

              <div className="pt-4 flex justify-end">
                <SpringButton
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative inline-flex h-14 w-full sm:w-auto items-center justify-center gap-3 overflow-hidden rounded-xl bg-slate-950 px-8 text-base font-bold text-white shadow-lg transition-all duration-300 hover:brightness-110 disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-[#D4AF37] translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0" />
                  <span className="relative z-10 group-hover:text-slate-950 transition-colors duration-300">
                    {isSubmitting ? 'Processing...' : 'Request firm quote'}
                  </span>
                  {!isSubmitting && (
                    <ArrowRight className="relative z-10 h-5 w-5 -rotate-45 transition-transform duration-300 group-hover:rotate-0 group-hover:text-slate-950" />
                  )}
                </SpringButton>
              </div>
              {submitError ? (
                <p className="text-sm font-medium text-[var(--error)]" role="alert">{submitError}</p>
              ) : null}
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
