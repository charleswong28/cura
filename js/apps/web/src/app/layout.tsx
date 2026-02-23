import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cura CRM",
  description: "Recruitment platform for headhunting teams",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
