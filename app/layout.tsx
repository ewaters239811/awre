import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AmbientNoise } from "@/components/ambient-noise";
import { AccountSync } from "@/components/account-sync";
import { Navigation } from "@/components/navigation";
import { PasswordRecoveryRedirect } from "@/components/password-recovery-redirect";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "ClearPth | Close The Gap",
  description:
    "A self-reflection app for aligning your current state with the life you want.",
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
        <PasswordRecoveryRedirect />
        <AmbientNoise />
      </body>
    </html>
  );
}
