import { Suspense } from 'react';
import { TelegramAppClient } from '@/components/telegram/TelegramAppClient';

export const dynamic = 'force-dynamic';

export default function TelegramAliasPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{ minHeight: '100vh', backgroundColor: '#0a0d14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent" />
        </div>
      }
    >
      <TelegramAppClient />
    </Suspense>
  );
}
