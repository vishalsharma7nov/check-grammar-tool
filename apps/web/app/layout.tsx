import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Check Grammar",
  description: "Local-first writing assistant. Original software, Apache-2.0.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className="banner">
          <span className="banner-icon" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          Default mode is privacy — your text stays in this browser. Not affiliated with Grammarly.
        </div>
        <header className="app">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden>CG</span>
            Check Grammar
          </Link>
          <nav>
            <Link href="/">Editor</Link>
            <Link href="/live">Live pad</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/pricing">Pricing</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
