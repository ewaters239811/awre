import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            try {
              if (!window.queueMicrotask) {
                window.queueMicrotask = function(callback) {
                  Promise.resolve()
                    .then(callback)
                    .catch(function(error) {
                      setTimeout(function() { throw error; });
                    });
                };
              }
              var theme = localStorage.getItem("clearpth.theme") || "light";
              document.documentElement.classList.toggle("light", theme === "light");
              document.documentElement.classList.toggle("dark", theme !== "light");
            } catch {}
          `}
        </Script>
      </head>
      <body className={`${geist.variable} ${geistMono.variable}`}>
        <Navigation />
        {children}
        <AccountSync />
        <AmbientNoise />
      </body>
    </html>
  );
}
