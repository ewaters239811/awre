import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { AmbientNoise } from "@/components/ambient-noise";
import { Navigation } from "@/components/navigation";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AWRE | Alignment Check-In",
  description:
    "A self-reflection app for inner order, clear action, and embodied presence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${cormorant.variable}`}>
        <Navigation />
        {children}
        <AmbientNoise />
      </body>
    </html>
  );
}
