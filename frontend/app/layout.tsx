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
  title: "TourBnT - Explore Amazing Destinations",
  description: "Discover and book amazing travel tours around the world",
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
            <LayoutProvider>
              <AuthBootstrap />
              <AuthRedirect />
              <WebVitalsReporter />
              {children}
              <Toaster />
            </LayoutProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
