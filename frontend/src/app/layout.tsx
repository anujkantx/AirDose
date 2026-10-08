import type { Metadata } from "next";
import React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AirDose — Personal PM2.5 Inhalation Monitor & Telemetry",
  description: "Calculate personal inhaled PM2.5 mass, geofenced micro-environments, and air quality telemetry.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta name="theme-color" content="#f0f3f8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Chivo+Mono:ital,wght@0,300..900;1,300..900&family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[#f0f3f8] text-slate-900 font-sans flex flex-col selection:bg-blue-500/20 selection:text-blue-700 antialiased">
        {children}
      </body>
    </html>
  );
}
