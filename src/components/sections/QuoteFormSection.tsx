'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

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

const inputBaseClass =
  'w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-2.5 text-base text-[#1C1C1E] outline-none transition-colors placeholder:text-[#5F6368]/65 focus:border-[#1C1C1E] focus:bg-white focus:ring-2 focus:ring-[#D4AF37]/25';

const labelBaseClass = 'mb-1.5 block text-xs font-medium text-[#374151]';

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
          ]
            .filter(Boolean)
            .join('\n'),
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

  return (
    <section id="quote" className="border-t border-[#E5E7EB] bg-white py-20 sm:py-24 scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5C17]">
              Request a quote
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-[#1C1C1E] sm:text-4xl">
              Get a firm lane quote.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#5F6368]">
              Share your vehicle and origin details. Our dispatch team reviews current sailing
              schedules and replies with an itemized quote—no obligation or account charge.
            </p>

            <ul className="mt-8 space-y-3 border-t border-[#E5E7EB] pt-6 text-sm text-[#5F6368]">
              <li className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" aria-hidden="true" />
                <span>Mersin &amp; UAE corridor options priced side-by-side</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" aria-hidden="true" />
                <span>Includes export paperwork &amp; customs guidance</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" aria-hidden="true" />
                <span>Typical response within one business day</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 sm:p-8">
            {submitted ? (
              <div className="py-10 text-center" role="status" aria-live="polite">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F9FAFB] border border-[#E5E7EB] text-[#047857]">
                  <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-[#1C1C1E]">Quote request received.</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#5F6368]">
                  Our dispatch team is reviewing your corridor and will reach out shortly with accurate pricing and route options.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-5 text-sm font-medium text-[#1C1C1E] transition-colors hover:bg-[#F9FAFB]"
                >
                  Request another quote
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                {/* Hidden honeypot for automated bots */}
                <input
                  {...register('website')}
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="quote-fullName" className={labelBaseClass}>
                      Full name
                    </label>
                    <input
                      {...register('fullName')}
                      id="quote-fullName"
                      placeholder="Your name"
                      autoComplete="name"
                      aria-invalid={Boolean(errors.fullName)}
                      aria-describedby={errors.fullName ? 'quote-fullName-error' : undefined}
                      className={`${inputBaseClass} ${errors.fullName ? 'border-[#DC2626]' : ''}`}
                    />
                    {errors.fullName && (
                      <p id="quote-fullName-error" role="alert" className="mt-1 text-xs font-medium text-[#DC2626]">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="quote-email" className={labelBaseClass}>
                      Email address
                    </label>
                    <input
                      {...register('email')}
                      id="quote-email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'quote-email-error' : undefined}
                      className={`${inputBaseClass} ${errors.email ? 'border-[#DC2626]' : ''}`}
                    />
                    {errors.email && (
                      <p id="quote-email-error" role="alert" className="mt-1 text-xs font-medium text-[#DC2626]">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="quote-phone" className={labelBaseClass}>
                    Phone or WhatsApp number
                  </label>
                  <input
                    {...register('phone')}
                    id="quote-phone"
                    type="tel"
                    placeholder="+1 (925) 000-0000"
                    autoComplete="tel"
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? 'quote-phone-error' : undefined}
                    className={`${inputBaseClass} ${errors.phone ? 'border-[#DC2626]' : ''}`}
                  />
                  {errors.phone && (
                    <p id="quote-phone-error" role="alert" className="mt-1 text-xs font-medium text-[#DC2626]">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="quote-vehicleYear" className={labelBaseClass}>
                      Vehicle year
                    </label>
                    <input
                      {...register('vehicleYear')}
                      id="quote-vehicleYear"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="2024"
                      aria-invalid={Boolean(errors.vehicleYear)}
                      aria-describedby={errors.vehicleYear ? 'quote-vehicleYear-error' : undefined}
                      className={`${inputBaseClass} ${errors.vehicleYear ? 'border-[#DC2626]' : ''}`}
                    />
                    {errors.vehicleYear && (
                      <p id="quote-vehicleYear-error" role="alert" className="mt-1 text-xs font-medium text-[#DC2626]">
                        {errors.vehicleYear.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="quote-vehicleMake" className={labelBaseClass}>
                      Make
                    </label>
                    <input
                      {...register('vehicleMake')}
                      id="quote-vehicleMake"
                      placeholder="Toyota"
                      aria-invalid={Boolean(errors.vehicleMake)}
                      aria-describedby={errors.vehicleMake ? 'quote-vehicleMake-error' : undefined}
                      className={`${inputBaseClass} ${errors.vehicleMake ? 'border-[#DC2626]' : ''}`}
                    />
                    {errors.vehicleMake && (
                      <p id="quote-vehicleMake-error" role="alert" className="mt-1 text-xs font-medium text-[#DC2626]">
                        {errors.vehicleMake.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="quote-vehicleModel" className={labelBaseClass}>
                      Model
                    </label>
                    <input
                      {...register('vehicleModel')}
                      id="quote-vehicleModel"
                      placeholder="Land Cruiser"
                      aria-invalid={Boolean(errors.vehicleModel)}
                      aria-describedby={errors.vehicleModel ? 'quote-vehicleModel-error' : undefined}
                      className={`${inputBaseClass} ${errors.vehicleModel ? 'border-[#DC2626]' : ''}`}
                    />
                    {errors.vehicleModel && (
                      <p id="quote-vehicleModel-error" role="alert" className="mt-1 text-xs font-medium text-[#DC2626]">
                        {errors.vehicleModel.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="quote-pickupLocation" className={labelBaseClass}>
                      Origin (City / State)
                    </label>
                    <input
                      {...register('pickupLocation')}
                      id="quote-pickupLocation"
                      placeholder="Newark, NJ"
                      aria-invalid={Boolean(errors.pickupLocation)}
                      aria-describedby={errors.pickupLocation ? 'quote-pickupLocation-error' : undefined}
                      className={`${inputBaseClass} ${errors.pickupLocation ? 'border-[#DC2626]' : ''}`}
                    />
                    {errors.pickupLocation && (
                      <p id="quote-pickupLocation-error" role="alert" className="mt-1 text-xs font-medium text-[#DC2626]">
                        {errors.pickupLocation.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="quote-destinationProvince" className={labelBaseClass}>
                      Destination province
                    </label>
                    <input
                      {...register('destinationProvince')}
                      id="quote-destinationProvince"
                      placeholder="Herat or Kabul"
                      aria-invalid={Boolean(errors.destinationProvince)}
                      aria-describedby={errors.destinationProvince ? 'quote-destinationProvince-error' : undefined}
                      className={`${inputBaseClass} ${errors.destinationProvince ? 'border-[#DC2626]' : ''}`}
                    />
                    {errors.destinationProvince && (
                      <p id="quote-destinationProvince-error" role="alert" className="mt-1 text-xs font-medium text-[#DC2626]">
                        {errors.destinationProvince.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="quote-additionalNotes" className={labelBaseClass}>
                    Additional details (optional)
                  </label>
                  <textarea
                    {...register('additionalNotes')}
                    id="quote-additionalNotes"
                    placeholder="Auction lot #, VIN, running condition, or timing notes"
                    rows={3}
                    className={`${inputBaseClass} resize-none`}
                  />
                </div>

                {submitError && (
                  <p className="text-sm font-medium text-[#DC2626]" role="alert">
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1C1C1E] px-6 text-sm font-medium text-white transition-colors hover:bg-[#333336] disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Sending request…' : 'Request firm quote'}</span>
                  {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
