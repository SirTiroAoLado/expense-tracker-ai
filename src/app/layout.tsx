import type { Metadata, Viewport } from "next";
import { Navbar } from "@/components/Navbar";
import { ErrorBanner } from "@/components/States";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "Spendwise — Expense Tracker", template: "%s · Spendwise" },
  description: "Track, filter and understand your personal spending.",
};

export const viewport: Viewport = {
  themeColor: "#2a78d6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 md:pb-12">
            <ErrorBanner />
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
