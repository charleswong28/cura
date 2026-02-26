import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import GradientBackground from "@/components/GradientBackground";
import NavBar from "@/components/NavBar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://cura.com";

export const metadata: Metadata = {
  title: "Cura — AI-First Recruitment CRM",
  description:
    "Stop Clicking. Start Connecting. Cura handles the heavy lifting admin work so you can focus on the only thing that closes deals: human connection.",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    type: "website",
    siteName: "Cura",
    title: "Cura — AI-First Recruitment CRM",
    description:
      "Stop Clicking. Start Connecting. Cura handles the heavy lifting admin work so you can focus on the only thing that closes deals: human connection.",
    url: BASE_URL,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cura — AI-First Recruitment CRM",
    description:
      "Stop Clicking. Start Connecting. Cura handles the heavy lifting admin work so you can focus on the only thing that closes deals: human connection.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${instrumentSerif.variable}`}>
      <body suppressHydrationWarning className="overflow-x-hidden">
        <GradientBackground />
        <NavBar />
        {children}
      </body>
    </html>
  );
}
