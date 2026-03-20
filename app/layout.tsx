import type { Metadata } from "next";
import { getSiteMetadataSettingsContent } from "@/lib/content/site.server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteMetadataSettingsContent();
  const siteUrl = settings.siteUrl.endsWith("/") ? settings.siteUrl : `${settings.siteUrl}/`;
  const faviconUrl = settings.faviconUrl?.trim();
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
    icons: faviconUrl
      ? {
          icon: faviconUrl,
          shortcut: faviconUrl
        }
      : undefined,
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
