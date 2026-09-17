import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import { Toaster } from "@/components/ui/toast";
import { ThemeSync } from "@/hooks/use-theme";
import { THEME_SCRIPT } from "@/lib/theme";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Indah Puri Apps",
    template: "%s · Apps",
  },
  description: "Indah Puri CashFlow Management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full overflow-hidden antialiased`}
      // The inline script below sets data-theme before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex h-full flex-col overflow-hidden bg-white text-black">
        <ThemeSync />
        {children}
        {/* Reads the URL, so it may not hold up a static page's render. */}
        <Suspense>
          <Toaster />
        </Suspense>
      </body>
    </html>
  );
}
