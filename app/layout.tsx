import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AmbientNoise } from "@/components/ambient-noise";
import { AccountSync } from "@/components/account-sync";
import { Navigation } from "@/components/navigation";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "ClearPth | Alignment Check-In",
  description:
    "A self-reflection app for inner order, clear action, and embodied presence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable}`}>
        <div className="aura-animated-backdrop" aria-hidden />
        <Navigation />
        {children}
        <AccountSync />
        <AmbientNoise />
      </body>
    </html>
  );
}
