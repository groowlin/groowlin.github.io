import type { Metadata } from "next";
import localFont from "next/font/local";
import { getSiteMetadataSettingsContent } from "@/lib/content/site.server";
import "./globals.css";

const inter = localFont({
  src: [
    {
      path: "./fonts/inter/Inter-Variable.ttf",
      weight: "100 900",
      style: "normal"
    }
  ],
  display: "swap",
  variable: "--font-inter"
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteMetadataSettingsContent();
  const siteUrl = settings.siteUrl.endsWith("/") ? settings.siteUrl : `${settings.siteUrl}/`;
  const robots = settings.robotsIndexByDefault
    ? undefined
    : {
        index: false,
        follow: false
      };

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: settings.defaultTitle,
      template: settings.titleTemplate
    },
    description: settings.defaultDescription,
    robots,
    openGraph: {
      title: settings.defaultTitle,
      siteName: settings.siteName,
      description: settings.defaultDescription,
      type: "website",
      url: siteUrl,
      images: settings.defaultOgImage ? [settings.defaultOgImage] : undefined
    }
  };
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
