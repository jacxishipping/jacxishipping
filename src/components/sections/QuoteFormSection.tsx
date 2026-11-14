'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRight, CheckCircle, PackageCheck, ShieldCheck, Ship } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Magnetic from '@/components/ui/Magnetic';
import { SpringButton } from '@jacxishippingorg/jx-ui-react';
import { JacxiButton } from '@/components/design-system/JacxiButton';

const quoteSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  vehicleMake: z.string().min(2, 'Vehicle make is required'),
  vehicleModel: z.string().min(1, 'Vehicle model is required'),
  vehicleYear: z.string().min(4, 'Vehicle year is required'),
  pickupLocation: z.string().min(2, 'Pickup location is required'),
  destinationProvince: z.string().min(2, 'Destination province is required'),
  additionalNotes: z.string().optional(),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

const fieldClassName = 'peer w-full rounded-none border-0 border-b border-black/20 bg-transparent px-0 py-3 text-base sm:text-lg text-black shadow-none outline-none transition-all duration-300 focus:border-[#D4AF37] focus:ring-0 placeholder:text-transparent';
const labelClassName = 'pointer-events-none absolute left-0 top-3 text-sm sm:text-base text-black/50 transition-all duration-300 peer-focus:-translate-y-5 peer-focus:text-xs peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-[#D4AF37] peer-[:not(:placeholder-shown)]:-translate-y-5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-widest peer-[:not(:placeholder-shown)]:text-black/50';

export default function QuoteFormSection() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"]
  });

  const headingY = useTransform(scrollYProgress, [0, 1], [100, 0]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
  });

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
      <section className="relative flex min-h-[60vh] items-center justify-center bg-[#F9FAFB] py-16 px-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h2 className="mb-3 text-3xl sm:text-4xl font-bold tracking-tight text-black">Quote requested.</h2>
          <p className="text-base sm:text-lg text-black/60 max-w-lg mx-auto">
            Our logistics team is analyzing the lane. We will contact you shortly with accurate pricing and routing options.
          </p>
          <JacxiButton type="button" onClick={() => setSubmitted(false)} className="mt-8 font-bold uppercase tracking-widest text-sm text-[#D4AF37] hover:text-black transition-colors">
            Request another quote
          </JacxiButton>
        </motion.div>
      </section>
    );
  }

  return (
    <section ref={containerRef} id="quote" className="relative flex items-center justify-center bg-white py-16 sm:py-20 lg:py-24">
      <div className="absolute inset-0 bg-[#F9FAFB] [clip-path:polygon(0_0,100%_0,100%_80%,0_100%)] pointer-events-none" />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:gap-16 lg:grid-cols-[1.1fr_1.1fr] items-start">
          
          {/* Left Text Block */}
          <div className="lg:pr-8">
            <div>
              <div className="inline-flex items-center gap-3 mb-4 sm:mb-6">
                <span className="h-px w-8 bg-black/25" />
                <span className="text-xs font-mono uppercase tracking-[0.2em] text-black/50">Initiate shipment</span>
              </div>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.05]">
                Precision pricing.<br/>
                <span className="italic font-serif font-light text-slate-400">Guaranteed lanes.</span>
              </h2>
              <p className="mt-4 sm:mt-6 text-base sm:text-lg leading-relaxed text-slate-600 max-w-lg">
                Enter your vehicle and origin details. We analyze the current corridor conditions to provide a firm, accurate quote for North America to Afghanistan delivery.
              </p>

              <div className="mt-8 sm:mt-12 grid gap-4 sm:grid-cols-2">
                {[
                  { title: "Direct Hubs", sub: "Mersin & UAE Options", icon: Ship },
                  { title: "Clear Customs", sub: "No hidden fees", icon: ShieldCheck }
                ].map((feature, i) => (
                  <div key={i} className="flex gap-3.5 items-start p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                       <feature.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{feature.title}</h4>
                      <p className="text-xs text-slate-500">{feature.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Form Block */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl sm:rounded-3xl bg-white p-5 sm:p-8 md:p-10 shadow-xl border border-black/5"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="relative">
                  <input {...register('fullName')} id="fullName" placeholder=" " className={`${fieldClassName} ${errors.fullName ? 'border-red-500' : ''}`} />
                  <label htmlFor="fullName" className={labelClassName}>Full name</label>
                </div>
                <div className="relative">
                  <input {...register('email')} id="email" type="email" placeholder=" " className={`${fieldClassName} ${errors.email ? 'border-red-500' : ''}`} />
                  <label htmlFor="email" className={labelClassName}>Email address</label>
                </div>
              </div>

              <div className="relative">
                <input {...register('phone')} id="phone" type="tel" placeholder=" " className={`${fieldClassName} ${errors.phone ? 'border-red-500' : ''}`} />
                <label htmlFor="phone" className={labelClassName}>Phone number</label>
              </div>

              <div className="pt-3 pb-1">
                <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-black/50">Vehicle Data</h3>
              </div>

              <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
                <div className="relative">
                  <input {...register('vehicleYear')} id="vehicleYear" placeholder=" " className={`${fieldClassName} ${errors.vehicleYear ? 'border-red-500' : ''}`} />
                  <label htmlFor="vehicleYear" className={labelClassName}>Year (e.g. 2024)</label>
                </div>
                <div className="relative">
                  <input {...register('vehicleMake')} id="vehicleMake" placeholder=" " className={`${fieldClassName} ${errors.vehicleMake ? 'border-red-500' : ''}`} />
                  <label htmlFor="vehicleMake" className={labelClassName}>Make</label>
                </div>
                <div className="relative">
                  <input {...register('vehicleModel')} id="vehicleModel" placeholder=" " className={`${fieldClassName} ${errors.vehicleModel ? 'border-red-500' : ''}`} />
                  <label htmlFor="vehicleModel" className={labelClassName}>Model</label>
                </div>
              </div>

              <div className="pt-3 pb-1">
                <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-black/50">Routing Requirements</h3>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="relative">
                  <input {...register('pickupLocation')} id="pickupLocation" placeholder=" " className={`${fieldClassName} ${errors.pickupLocation ? 'border-red-500' : ''}`} />
                  <label htmlFor="pickupLocation" className={labelClassName}>Origin (City/State)</label>
                </div>
                <div className="relative">
                  <input {...register('destinationProvince')} id="destinationProvince" placeholder=" " className={`${fieldClassName} ${errors.destinationProvince ? 'border-red-500' : ''}`} />
                  <label htmlFor="destinationProvince" className={labelClassName}>Dest. Province</label>
                </div>
              </div>

              <div className="relative pt-2">
                <textarea {...register('additionalNotes')} id="additionalNotes" placeholder=" " rows={3} className={`${fieldClassName} resize-none`} />
                <label htmlFor="additionalNotes" className={labelClassName}>Additional details (Auction PIN, condition)</label>
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
                  {!isSubmitting && <ArrowRight className="relative z-10 h-5 w-5 -rotate-45 transition-transform duration-300 group-hover:rotate-0 group-hover:text-slate-950" />}
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
