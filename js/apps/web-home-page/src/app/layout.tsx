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

export const metadata: Metadata = {
  title: "Cura — AI-First Recruitment CRM",
  description: "Stop Clicking. Start Connecting. The AI-first recruitment platform that moves the deal — from first signal to signed offer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${instrumentSerif.variable}`}>
      <body>
        <GradientBackground />
        <NavBar />
        {children}
      </body>
    </html>
  );
}
