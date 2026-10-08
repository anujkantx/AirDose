import type { Metadata } from "next";
import React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AirDose | Personal Inhaled Pollution & Commute Decision Engine",
  description: "Calculate estimated personal inhaled particulate burden (µg of PM2.5) and evaluate transit trade-offs for Bharat Builds / AWS Hackathon.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <head>
        <meta name="theme-color" content="#020617" />
      </head>
      <body className="min-h-full bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}
