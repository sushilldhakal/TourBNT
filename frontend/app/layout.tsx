import type { Metadata } from "next";
import { Fraunces, Geist_Mono, Nunito_Sans } from "next/font/google";
import "./globals-optimized.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { LayoutProvider } from "@/providers/LayoutProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "@/components/ui/toaster";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";
import { AuthRedirect } from "@/components/auth/AuthRedirect";
import AuthBootstrap from "@/providers/AuthBootstrap";
import { Suspense } from "react";
import { CookieConsent } from "@/components/consent/CookieConsent";
import { Analytics } from "@/components/consent/Analytics";
import { SITE_URL } from "@/lib/seo";
import { CurrencyProvider } from "@/providers/CurrencyProvider";


const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Makes every relative canonical / Open Graph URL absolute.
  metadataBase: new URL(SITE_URL),
  title: { default: "TourBNT - Explore Amazing Destinations", template: "%s" },
  description: "Discover and book guided tours, treks and cultural trips from trusted local operators.",
  applicationName: "TourBNT",
  openGraph: { siteName: "TourBNT", type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${nunitoSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased data-[scroll-locked]:!overflow-visible`}
        suppressHydrationWarning={true}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <CurrencyProvider>
            <LayoutProvider>
              <AuthBootstrap />
              <AuthRedirect />
              <WebVitalsReporter />
              {children}
              <Toaster />
              <CookieConsent />
              <Suspense fallback={null}><Analytics /></Suspense>
            </LayoutProvider>
            </CurrencyProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
