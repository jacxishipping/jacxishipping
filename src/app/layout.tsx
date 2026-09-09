import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./print.css";
import ConditionalLayout from "@/components/layout/ConditionalLayout";
import { Providers } from "@/components/providers/Providers";
import { Toaster } from "@/components/design-system";
import Script from "next/script";
import PWARegister from "@/components/pwa/PWARegister";
import OfflineStatusBanner from "@/components/pwa/OfflineStatusBanner";
import SmoothScrolling from "@/components/ui/SmoothScrolling";
import { LenisWrapperProvider } from "@/components/providers/LenisWrapperProvider";

// Use system fonts as fallback when Google Fonts aren't available
const fontVariables = '';

export const metadata: Metadata = {
  title: "JACXI Shipping - Vehicle Shipping from USA & Canada to Afghanistan",
  description: "Professional vehicle shipping from anywhere in the USA and Canada to Afghanistan through either the Mersin route or the UAE route. Complete service with customs clearance, insurance, and tracking for all Afghan provinces.",
  keywords: "vehicle shipping USA to Afghanistan, car shipping Canada to Afghanistan, USA Canada car shipping Afghanistan, Mersin route car shipping, UAE route car shipping, vehicle transport Kabul, Jacxi Shipping, Afghanistan car import",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/icon', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: ['/favicon.png'],
    apple: [{ url: '/apple-icon', type: 'image/png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JACXI",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#DAA520",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
		<html lang="en" className={fontVariables} dir="ltr" data-scroll-behavior="smooth">
      <body className="min-h-screen bg-background antialiased" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
          <Script id="ux-sniff" strategy="afterInteractive">
            {`(function(u,x,s,n,i,f){
  u.ux=u.ux||function(){(u.ux.q=u.ux.q||[]).push(arguments)};
  i=x.getElementsByTagName('head')[0]; f=x.createElement('script');f.async=1; f.src=s+n;
  i.appendChild(f);
})(window,document,'https://api.uxsniff.com/cdn/js/uxsnf_track','.js');`}
          </Script>
        <Providers>
          <PWARegister />
          <OfflineStatusBanner />
          <LenisWrapperProvider>
            <SmoothScrolling>
            <div className="relative flex min-h-screen flex-col">
              <ConditionalLayout>
                {children}
              </ConditionalLayout>
            </div>
              <Toaster />
            </SmoothScrolling>
          </LenisWrapperProvider>
        </Providers>
      </body>
    </html>
  );
}
