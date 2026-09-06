"use client";

import { Suspense, useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import {
  flushQueuedMetricaCalls,
  getYandexMetricaCounterId,
  isAnalyticsDisabled,
  setAnalyticsDisabled,
  trackMetricaHit,
  ANALYTICS_DISABLE_STORAGE_KEY
} from "@/lib/analytics/yandex-metrica";

function RouteHitTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    if (lastTrackedPath.current === path) {
      return;
    }

    // defer: true disables Metrica's automatic initial pageview as well.
    const isRouteChange = lastTrackedPath.current !== null;
    lastTrackedPath.current = path;
    trackMetricaHit(path, document.title, { route_change: isRouteChange });
  }, [pathname, searchParams]);

  return null;
}

export function YandexMetrica() {
  const counterId = getYandexMetricaCounterId();

  useEffect(() => {
    if (!counterId) {
      return;
    }

    const onReady = () => {
      flushQueuedMetricaCalls();
    };

    window.addEventListener("portfolio:analytics-ready", onReady);
    window.portfolioAnalytics = {
      disable: () => {
        setAnalyticsDisabled(true);
      },
      enable: () => {
        setAnalyticsDisabled(false);
      },
      isDisabled: isAnalyticsDisabled
    };

    return () => {
      window.removeEventListener("portfolio:analytics-ready", onReady);
    };
  }, [counterId]);

  if (!counterId) {
    return null;
  }

  return (
    <>
      <Script id="yandex-metrica-init" strategy="afterInteractive">
        {`
          (function() {
            var storageKey = "${ANALYTICS_DISABLE_STORAGE_KEY}";
            var hostname = window.location.hostname;
            var isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
            var isDisabled = false;

            try {
              isDisabled = window.localStorage.getItem(storageKey) === "1";
            } catch (error) {
              isDisabled = document.cookie.indexOf("portfolio_analytics_disabled=1") !== -1;
            }

            if (isLocalhost || isDisabled) {
              return;
            }

            (function(m,e,t,r,i,k,a){
              m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for (var j = 0; j < document.scripts.length; j++) {
                if (document.scripts[j].src === r) { return; }
              }
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a);
            })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

            ym(${counterId}, "init", {
              defer: true,
              clickmap: false,
              trackLinks: true,
              accurateTrackBounce: true,
              webvisor: false
            });

            window.dispatchEvent(new Event("portfolio:analytics-ready"));
          })();
        `}
      </Script>
      <Suspense fallback={null}>
        <RouteHitTracker />
      </Suspense>
    </>
  );
}
