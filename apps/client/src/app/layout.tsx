import { PostHogProvider } from "@/components/PostHogProvider";
import TQProvider from "@/components/TQProvider";
import { Toaster } from "@/components/ui/sonner";
import { IS_DEMO_MODE } from "@/lib/demo";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VFX SYNC",
  description:
    "VFX SYNC — turn your devices into a synchronized sound system. Create a room, invite friends, and listen together with tightly synchronized multi-device audio.",
  applicationName: "VFX SYNC",
  keywords: ["VFX SYNC", "music", "sync", "audio", "listening party", "real-time"],
  authors: [{ name: "Sourajit VFX" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VFX SYNC",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          inter.variable,
          "antialiased font-sans selection:bg-primary-800 selection:text-white"
        )}
      >
        <PostHogProvider>
          <TQProvider>
            {children}
            <Toaster />
            {!IS_DEMO_MODE && <Analytics />}
          </TQProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
