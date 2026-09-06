import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "../styles/leaflet-overrides.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for headings and the wordmark.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KelanaAI - AI-Powered Travel Planning",
  description:
    "Plan your next adventure with KelanaAI: pick a destination on the map, set your budget, and get an AI-generated travel itinerary.",
};

/**
 * The app shell lives here so every route gets the same chrome. Pages render
 * only their own content.
 *
 * Note this file is a Server Component: it may render the client Navbar/Footer,
 * but must never import anything using `next/dynamic` with `ssr: false` (not
 * supported in Server Components) — that stays inside client children.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
        >
          Skip to main content
        </a>

        <QueryProvider>
          <AuthProvider>
            <Navbar />

            <main id="main-content" className="flex-1">
              {children}
            </main>

            <Footer />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
