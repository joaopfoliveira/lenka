import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lenka - Price Guessing Game",
  description: "Multiplayer browser game inspired by The Price Is Right",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

