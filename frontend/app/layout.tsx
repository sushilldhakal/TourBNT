import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "tui-image-editor/dist/tui-image-editor.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { LayoutProvider } from "@/providers/LayoutProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "@/components/ui/toaster";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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
