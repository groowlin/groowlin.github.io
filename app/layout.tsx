import type { Metadata } from "next";
import localFont from "next/font/local";
import { YandexMetrica } from "@/components/analytics/YandexMetrica";
import { getLinkPreviewMetadataContent, getSiteMetadataSettingsContent } from "@/lib/content/site.server";
import { scrollRestorationScript } from "@/app/scroll-restoration-script";
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
  const [settings, preview] = await Promise.all([getSiteMetadataSettingsContent(), getLinkPreviewMetadataContent()]);
  const siteUrl = settings.siteUrl.endsWith("/") ? settings.siteUrl : `${settings.siteUrl}/`;
  const robots = settings.robotsIndexByDefault
    ? undefined
    : {
        index: false,
        follow: false
      };

  return {
    metadataBase: new URL(siteUrl),
    title: settings.defaultTitle,
    description: settings.defaultDescription,
    robots,
    openGraph: {
      title: preview.title,
      siteName: settings.siteName,
      description: preview.description,
      type: preview.type,
      url: preview.url,
      images: preview.image ? [preview.image] : undefined
    },
    twitter: {
      card: preview.image ? "summary_large_image" : "summary",
      title: preview.title,
      description: preview.description,
      images: preview.image ? [preview.image] : undefined
    }
  };
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={inter.variable} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: scrollRestorationScript }} />
        <YandexMetrica />
        {children}
      </body>
    </html>
  );
}
