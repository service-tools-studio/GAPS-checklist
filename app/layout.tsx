import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import GateGuard from "./GateGuard";
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
  title: "GAPS Daily Checklist",
  description:
    "GAPS daily checklist for Jasmin and Kelsey",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GateGuard>{children}</GateGuard>
      </body>
    </html>
  );
}
