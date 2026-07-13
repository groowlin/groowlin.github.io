import type { Metadata } from "next";
import localFont from "next/font/local";
import { YandexMetrica } from "@/components/analytics/YandexMetrica";
import { NavigationLifecycleProvider } from "@/components/navigation/NavigationLifecycleProvider";
import { AssetInteractionGuard } from "@/components/shell/AssetInteractionGuard";
import { PersistentSiteFrame } from "@/components/shell/PersistentSiteFrame";
import { getLinkPreviewMetadataContent, getSiteMetadataSettingsContent, getTopCardContent } from "@/lib/content/site.server";
import type { TopCardContent, TopCardVariant } from "@/lib/content/types";
import { getWorkSlugs } from "@/lib/content/work.server";
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

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [defaultTopCard, profileTopCard, homeTopCard, workSlugs] = await Promise.all([
    getTopCardContent("default"),
    getTopCardContent("to-profile"),
    getTopCardContent("to-home"),
    getWorkSlugs()
  ]);
  const topCards = {
    default: defaultTopCard,
    "to-profile": profileTopCard,
    "to-home": homeTopCard
  } satisfies Record<TopCardVariant, TopCardContent>;

  return (
    <html lang="ru" className={inter.variable} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: scrollRestorationScript }} />
        <YandexMetrica />
        <AssetInteractionGuard />
        <NavigationLifecycleProvider>
          <PersistentSiteFrame topCards={topCards} workSlugs={workSlugs}>
            {children}
          </PersistentSiteFrame>
        </NavigationLifecycleProvider>
      </body>
    </html>
  );
}
