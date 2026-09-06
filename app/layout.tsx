import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "LLMS.TXT Checker — Audit Your Site's AI Discoverability",
  description:
    "Check whether your site's /llms.txt file exists, is valid, and helps AI systems discover your documentation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative overflow-x-hidden bg-[var(--background)]">
        {/* Radiating Dark Mode Glows */}
        <div className="pointer-events-none fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-[var(--accent)]/15 blur-[120px] mix-blend-screen animate-pulse-glow" />
        <div className="pointer-events-none fixed bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-500/10 blur-[120px] mix-blend-screen" />
        
        <div className="relative z-10 flex flex-col flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
