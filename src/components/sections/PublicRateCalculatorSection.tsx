'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, ChevronRight, DollarSign, MapPin, Truck } from 'lucide-react';
import Magnetic from '@/components/ui/Magnetic';
import { SpringButton } from '@jacxishippingorg/jx-ui-react';

const origins = [
  { id: 'ca-east', name: 'East Coast (NY/NJ/PA)', stateCode: 'NJ' },
  { id: 'ca-west', name: 'West Coast (CA/WA)', stateCode: 'CA' },
  { id: 'canada', name: 'Canada (Toronto/Montreal)', stateCode: null },
  { id: 'tx', name: 'South (TX/FL)', stateCode: 'TX' },
];

const destinations = [
  { id: 'kbl', name: 'Kabul via Mersin', price: 4500, time: '35-45 days' },
  { id: 'hrt', name: 'Herat via UAE', price: 4200, time: '30-40 days' },
  { id: 'kdh', name: 'Kandahar via UAE', price: 4400, time: '30-42 days' },
  { id: 'mez', name: 'Mazar-i-Sharif via Mersin', price: 4600, time: '38-48 days' },
];

const vehicleTypes = [
  { id: 'sedan', name: 'Standard Sedan', multiplier: 1 },
  { id: 'suv', name: 'SUV / Truck', multiplier: 1.25 },
  { id: 'van', name: 'Van / Large Cargo', multiplier: 1.5 },
];

export default function PublicRateCalculatorSection() {
  const [origin, setOrigin] = useState(origins[0]);
  const [dest, setDest] = useState(destinations[0]);
  const [vType, setVType] = useState(vehicleTypes[1]);
  const [originRate, setOriginRate] = useState<number | null>(null);
  const [rateStatus, setRateStatus] = useState<'loading' | 'available' | 'unavailable'>('loading');

  useEffect(() => {
    if (!origin.stateCode) {
      setOriginRate(null);
      setRateStatus('unavailable');
      return;
    }

    const controller = new AbortController();
    setRateStatus('loading');
    fetch(`/api/public/shipping-rate-estimate?originState=${origin.stateCode}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Rate unavailable');
        return response.json();
      })
      .then((data) => {
        const rate = data?.estimate?.averageBaseRate;
        if (typeof rate !== 'number' || rate <= 0) throw new Error('Rate unavailable');
        setOriginRate(rate);
        setRateStatus('available');
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== 'AbortError') {
          setOriginRate(null);
          setRateStatus('unavailable');
        }
      });

    return () => controller.abort();
  }, [origin.stateCode]);

  const basePrice = originRate === null ? null : (originRate + dest.price) * vType.multiplier;

  return (
    <section className="relative bg-[#F9FAFB] py-16 sm:py-24 lg:py-32 text-gray-900 overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.06)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-3 justify-center mb-4 sm:mb-6">
            <span className="h-px w-6 bg-[#D4AF37]" />
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#D4AF37]">Estimator</span>
            <span className="h-px w-6 bg-[#D4AF37]" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-gray-900 mb-4 sm:mb-6">
            Instant lane pricing.
          </h2>
          <p className="text-base sm:text-xl text-black/60">
            Estimates use active shipping price lists where available. A firm quote confirms vehicle, pickup, and destination details.
          </p>
        </div>

        <div className="grid gap-8 lg:gap-12 lg:grid-cols-[1.4fr_1fr] items-start">
          
          <div className="space-y-8 sm:space-y-10">
            
            {/* Origin Selection */}
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#D4AF37] mb-3">01. Origin Zone</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {origins.map((o) => (
                  <SpringButton
                    key={o.id}
                    onClick={() => setOrigin(o)}
                    aria-pressed={origin.id === o.id}
                    className={`flex items-center p-3.5 sm:p-4 rounded-2xl border text-left transition-all ${
                      origin.id === o.id 
                        ? 'border-[#D4AF37] bg-white shadow-[0_4px_20px_rgba(212,175,55,0.15)] ring-1 ring-[#D4AF37]'
                        : 'border-black/5 bg-white/60 hover:bg-white'
                    }`}
                  >
                    <MapPin className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 mr-3 ${origin.id === o.id ? 'text-[#D4AF37]' : 'text-black/40'}`} />
                    <span className={`text-sm sm:text-base font-semibold ${origin.id === o.id ? 'text-gray-900' : 'text-black/70'}`}>{o.name}</span>
                  </SpringButton>
                ))}
              </div>
            </div>

            {/* Destination Selection */}
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#D4AF37] mb-3">02. Destination Route</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {destinations.map((d) => (
                  <SpringButton
                    key={d.id}
                    onClick={() => setDest(d)}
                    aria-pressed={dest.id === d.id}
                    className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border text-left transition-all ${
                      dest.id === d.id 
                        ? 'border-[#D4AF37] bg-white shadow-[0_4px_20px_rgba(212,175,55,0.15)] ring-1 ring-[#D4AF37]'
                        : 'border-black/5 bg-white/60 hover:bg-white'
                    }`}
                  >
                    <span className={`text-sm sm:text-base font-semibold ${dest.id === d.id ? 'text-gray-900' : 'text-black/70'}`}>{d.name}</span>
                    <span className={`text-[10px] sm:text-[11px] font-mono shrink-0 ml-2 px-2 py-1 rounded-full ${dest.id === d.id ? 'bg-[#D4AF37]/20 text-[#D4AF37] font-bold' : 'bg-black/5 text-black/50'}`}>
                      {d.time}
                    </span>
                  </SpringButton>
                ))}
              </div>
            </div>

            {/* Vehicle Type Selection */}
            <div>
               <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#D4AF37] mb-3">03. Vehicle Class</p>
               <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {vehicleTypes.map((v) => (
                    <SpringButton
                      key={v.id}
                      onClick={() => setVType(v)}
                      aria-pressed={vType.id === v.id}
                      className={`flex justify-center items-center py-3 px-2 rounded-xl sm:rounded-full border text-center transition-all text-xs sm:text-sm ${
                        vType.id === v.id
                           ? 'border-[#D4AF37] !bg-[#D4AF37] !text-slate-950 font-bold shadow-md shadow-[#D4AF37]/20'
                           : 'border-black/5 bg-white/60 text-black/70 hover:bg-white font-medium'
                      }`}
                    >
                      {v.name}
                    </SpringButton>
                  ))}
               </div>
            </div>

          </div>

          <motion.div 
            className="lg:sticky lg:top-32 rounded-3xl border border-black/5 bg-white p-6 sm:p-8 shadow-xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 to-transparent pointer-events-none" />
            
            <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-4">Estimated Subtotal</p>
            
            <div className="flex items-baseline text-slate-900 mb-6">
              <span className="text-2xl sm:text-3xl text-slate-400 font-light mr-1">$</span>
              <AnimatePresence mode='popLayout'>
                <motion.span 
                  key={basePrice}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10, position: 'absolute' }}
                  transition={{ duration: 0.3 }}
                  className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none"
                >
                  {basePrice === null ? '—' : basePrice.toLocaleString()}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="space-y-3 mb-6 border-t border-slate-100 pt-4">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-slate-500">Origin transport</span>
                <span className="font-mono font-semibold text-slate-800">
                  {originRate === null ? 'Request quote' : `$${(originRate * vType.multiplier).toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-slate-500">Ocean / Export Transit</span>
                <span className="font-mono font-semibold text-slate-800">${(dest.price * vType.multiplier).toLocaleString()}</span>
              </div>
            </div>
            <p className="mb-6 text-xs sm:text-sm text-slate-500 leading-relaxed" role="status">
              {rateStatus === 'loading' && 'Checking current origin pricing…'}
              {rateStatus === 'available' && 'Based on active origin pricing; destination transit is an estimate.'}
              {rateStatus === 'unavailable' && 'A live rate is not available for this origin. Request a firm quote.'}
            </p>

            <SpringButton 
              type="button"
              onClick={() => {
                document.getElementById('quote')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group relative flex w-full h-13 sm:h-14 items-center justify-center overflow-hidden rounded-full bg-slate-950 font-bold text-white shadow-lg transition-transform hover:brightness-110"
            >
              <div className="absolute inset-0 bg-[#D4AF37] translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0" />
              <span className="relative z-10 text-white transition-colors duration-300 group-hover:text-slate-950 text-sm sm:text-base">Request exact quote</span>
            </SpringButton>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
