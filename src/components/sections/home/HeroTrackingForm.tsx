'use client';

import { JacxiButton } from '@/components/design-system/JacxiButton';
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
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto relative group">
      <div className="relative flex items-center rounded-xl border border-[var(--border)] bg-white p-2 shadow-lg shadow-slate-900/5 focus-within:border-[var(--accent-gold)] focus-within:ring-2 focus-within:ring-[rgba(var(--accent-gold-rgb),0.2)]">
        <div className="pl-4 text-[var(--text-secondary)]">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={trackingInput}
          onChange={(event) => setTrackingInput(event.target.value)}
          placeholder="Enter container number (e.g., UETU6059142)"
          aria-label="Container number"
          className="w-full bg-transparent px-4 py-3 text-base font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
        />
        <JacxiButton
          type="submit"
          className="shrink-0 whitespace-nowrap rounded-xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#1C1C1E] shadow-md shadow-[#D4AF37]/25 hover:bg-[#B89428] hover:text-white transition-colors"
        >
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span>Track</span>
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </span>
        </JacxiButton>
      </div>
    </form>
  );
}