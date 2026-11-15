import type { Metadata, Viewport } from "next";
import { Inter, Urbanist } from "next/font/google";
import "./globals.css";
import "./print.css";
import ConditionalLayout from "@/components/layout/ConditionalLayout";
import { Providers } from "@/components/providers/Providers";
import { Toaster } from "@/components/design-system";
import PWARegister from "@/components/pwa/PWARegister";
import OfflineStatusBanner from "@/components/pwa/OfflineStatusBanner";
import SmoothScrolling from "@/components/ui/SmoothScrolling";
import { LenisWrapperProvider } from "@/components/providers/LenisWrapperProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist",
  display: "swap",
});

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
  themeColor: "#D4AF37",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
		<html lang="en" className={`${inter.variable} ${urbanist.variable}`} dir="ltr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen bg-background antialiased" style={{ fontFamily: 'var(--font-inter), Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
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
