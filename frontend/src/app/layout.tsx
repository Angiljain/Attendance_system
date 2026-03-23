import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proof of Presence — Decentralized Attendance System",
  description:
    "Secure, tamper-proof attendance system using Dynamic QR codes, GPS geofencing, and blockchain proof.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="bg-mesh" />
        {children}
      </body>
    </html>
  );
}
