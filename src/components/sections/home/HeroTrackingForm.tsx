'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search } from 'lucide-react';

export default function HeroTrackingForm() {
  const [trackingInput, setTrackingInput] = useState('');
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const container = trackingInput.trim();
    if (!container) {
      router.push('/tracking');
      return;
    }

    const params = new URLSearchParams({ container });
    router.push(`/tracking?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg">
      <div className="flex items-center rounded-xl border border-[#E5E7EB] bg-white p-1.5 transition-colors focus-within:border-[#1C1C1E] focus-within:ring-2 focus-within:ring-[#D4AF37]/25">
        <div className="pl-3 text-[#5F6368]" aria-hidden="true">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={trackingInput}
          onChange={(event) => setTrackingInput(event.target.value)}
          placeholder="Container # (e.g., UETU6059142)"
          aria-label="Container number"
          className="w-full min-w-0 bg-transparent px-3 py-2.5 text-base text-[#1C1C1E] outline-none placeholder:text-[#5F6368]/75"
        />
        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#1C1C1E] px-4 text-sm font-medium text-white transition-colors hover:bg-[#333336] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
        >
          <span>Track</span>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}