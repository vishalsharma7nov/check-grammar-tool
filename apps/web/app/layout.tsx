import type { ReactNode } from "react";
import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Check Grammar",
  description: "Local-first writing assistant. Original software, Apache-2.0.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="banner">
          Default mode is privacy: text stays in this browser. Not affiliated with Grammarly.
        </div>
        <header className="app">
          <Link className="brand" href="/">
            Check Grammar
          </Link>
          <nav>
            <Link href="/">Editor</Link>
            <Link href="/live">Live pad</Link>
            <Link href="/privacy">Where text goes</Link>
            <Link href="/pricing">Pricing</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
