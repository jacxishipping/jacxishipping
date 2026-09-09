'use client';

import { ReactLenis } from 'lenis/react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useLenisWrapper } from '@/components/providers/LenisWrapperProvider';

export default function SmoothScrolling({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lenisRef = useRef<any>(null);
  const { wrapperRef } = useLenisWrapper();

  // Reset scroll on route change
  useEffect(() => {
    if (lenisRef.current?.lenis) {
      lenisRef.current.lenis.scrollTo(0, { immediate: true });
    }
  }, [pathname]);

  // Use the wrapper element if available, otherwise fall back to root
  const targetElement = wrapperRef.current ?? (typeof document !== 'undefined' ? document.documentElement : undefined);

  return (
    <ReactLenis 
      root={!wrapperRef.current} // Only use root if no wrapper is provided
      ref={lenisRef}
      options={{ 
        lerp: 0.1, 
        duration: 1.2, 
        smoothWheel: true,
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        syncTouch: false,
        touchMultiplier: 2,
        // Use the wrapper element as the scroll container
        wrapper: targetElement,
      }}
    >
      {children}
    </ReactLenis>
  );
}
