import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Dynalabs AquaDiag v1",
  description:
    "Aquarienwerte verstehen. Probleme früh erkennen. Minimaler Diagnose-MVP (V1).",
  applicationName: "Dynalabs AquaDiag v1",
  icons: {
    icon: "/logos/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  );
}
