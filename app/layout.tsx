import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Space Grotesk is the app face (display numerals, headings, body), exposed as
// --font-grotesk and wired into the Tailwind --font-sans stack in globals.css.
// Its variable axis covers the 400/500/700 weights the dashboard uses.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-grotesk",
});

// Mono stays the selective signature: small-caps stat labels, microcopy, and
// numeric chips.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "The Comeback · Training Tracker",
  description:
    "Rebuilding from injury to a Boston Qualifier (BQ) marathon time. In public. A one-page, open-source training dashboard.",
};

export const viewport: Viewport = {
  themeColor: "#1c1e28",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
