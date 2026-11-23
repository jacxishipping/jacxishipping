'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

const origins = [
  { id: 'ca-east', name: 'East Coast (NY / NJ / PA)', stateCode: 'NJ' },
  { id: 'ca-west', name: 'West Coast (CA / WA)', stateCode: 'CA' },
  { id: 'canada', name: 'Canada (Toronto / Montreal)', stateCode: null },
  { id: 'tx', name: 'South (TX / FL)', stateCode: 'TX' },
];

const destinations = [
  { id: 'kbl', name: 'Kabul via Mersin', province: 'Kabul', price: 4500, time: '35–45d' },
  { id: 'hrt', name: 'Herat via UAE', province: 'Herat', price: 4200, time: '30–40d' },
  { id: 'kdh', name: 'Kandahar via UAE', province: 'Kandahar', price: 4400, time: '30–42d' },
  { id: 'mez', name: 'Mazar-i-Sharif via Mersin', province: 'Mazar-i-Sharif', price: 4600, time: '38–48d' },
];

const vehicleTypes = [
  { id: 'sedan', name: 'Sedan', multiplier: 1 },
  { id: 'suv', name: 'SUV / Truck', multiplier: 1.25 },
  { id: 'van', name: 'Van / Cargo', multiplier: 1.5 },
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
    const timeout = setTimeout(() => {
      controller.abort();
      setOriginRate(null);
      setRateStatus('unavailable');
    }, 10000);

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

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [origin.stateCode]);

  const basePrice = originRate === null ? null : (originRate + dest.price) * vType.multiplier;

  const handleRequestQuote = () => {
    window.dispatchEvent(
      new CustomEvent('jacxi:prefill-quote', {
        detail: {
          pickupLocation: origin.name,
          destinationProvince: dest.province,
          vehicleClass: vType.name,
        },
      }),
    );
    document.getElementById('quote')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="calculator" className="border-t border-[#E5E7EB] bg-white py-20 sm:py-24 scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5C17]">
            Rate estimator
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-[#1C1C1E] sm:text-4xl">
            Instant lane pricing.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#5F6368]">
            Estimates use active origin rate tables where available. Request a firm quote to lock exact pickup and vehicle details.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          <div className="space-y-7">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#5F6368]">
                1. Origin zone
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {origins.map((o) => {
                  const selected = origin.id === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOrigin(o)}
                      aria-pressed={selected}
                      className={`flex min-h-[46px] items-center rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                        selected
                          ? 'border-[#1C1C1E] bg-[#1C1C1E] text-white'
                          : 'border-[#E5E7EB] bg-white text-[#1C1C1E] hover:border-[#1C1C1E]/30 hover:bg-[#F9FAFB]'
                      }`}
                    >
                      {o.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#5F6368]">
                2. Destination route
              </p>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {destinations.map((d) => {
                  const selected = dest.id === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDest(d)}
                      aria-pressed={selected}
                      className={`flex min-h-[46px] items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                        selected
                          ? 'border-[#1C1C1E] bg-[#1C1C1E] text-white'
                          : 'border-[#E5E7EB] bg-white text-[#1C1C1E] hover:border-[#1C1C1E]/30 hover:bg-[#F9FAFB]'
                      }`}
                    >
                      <span>{d.name}</span>
                      <span
                        className={`text-xs tabular-nums ${
                          selected ? 'text-white/75' : 'text-[#5F6368]'
                        }`}
                      >
                        {d.time}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#5F6368]">
                3. Vehicle class
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {vehicleTypes.map((v) => {
                  const selected = vType.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVType(v)}
                      aria-pressed={selected}
                      className={`flex min-h-[44px] items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors ${
                        selected
                          ? 'border-[#1C1C1E] bg-[#1C1C1E] text-white'
                          : 'border-[#E5E7EB] bg-white text-[#1C1C1E] hover:border-[#1C1C1E]/30 hover:bg-[#F9FAFB]'
                      }`}
                    >
                      {v.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5F6368]">
              Estimated subtotal
            </p>

            <div className="mt-3 flex items-baseline text-[#1C1C1E]" role="status">
              {rateStatus === 'loading' ? (
                <span
                  className="inline-block h-11 w-40 animate-pulse rounded-lg bg-[#E5E7EB]"
                  aria-label="Checking current origin pricing"
                />
              ) : basePrice === null ? (
                <span className="text-3xl font-semibold tracking-tight">Price on request</span>
              ) : (
                <span className="text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
                  ${basePrice.toLocaleString()}
                </span>
              )}
            </div>

            <dl className="mt-6 space-y-3 border-t border-[#E5E7EB] pt-5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#5F6368]">Origin transport</dt>
                <dd className="font-medium text-[#1C1C1E] tabular-nums">
                  {originRate === null ? 'Custom quote' : `$${(originRate * vType.multiplier).toLocaleString()}`}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#5F6368]">Ocean & export transit</dt>
                <dd className="font-medium text-[#1C1C1E] tabular-nums">
                  {originRate === null ? 'Included in firm quote' : `$${(dest.price * vType.multiplier).toLocaleString()}`}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#5F6368]">Est. transit</dt>
                <dd className="font-medium text-[#1C1C1E] tabular-nums">{dest.time}</dd>
              </div>
            </dl>

            <p className="mt-5 text-xs leading-relaxed text-[#5F6368]" role="status">
              {rateStatus === 'loading' && 'Checking current origin pricing…'}
              {rateStatus === 'available' && 'Based on active origin pricing; destination transit is an estimate.'}
              {rateStatus === 'unavailable' && 'This corridor is priced directly by dispatch. Click below to pre-fill your quote.'}
            </p>

            <button
              type="button"
              onClick={handleRequestQuote}
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1C1C1E] px-5 text-sm font-medium text-white transition-colors hover:bg-[#333336]"
            >
              <span>Request exact quote</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
