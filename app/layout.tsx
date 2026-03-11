import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://example.com"),
  title: {
    default: "Gavin Nelson, Designer",
    template: "%s | Gavin Nelson"
  },
  description:
    "A pixel-accurate React clone of the Nelson portfolio with motion-rich interactions and editorial case study layouts.",
  openGraph: {
    title: "Gavin Nelson, Designer",
    description:
      "A pixel-accurate React clone of the Nelson portfolio with motion-rich interactions and editorial case study layouts.",
    type: "website",
    url: "https://example.com/"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
