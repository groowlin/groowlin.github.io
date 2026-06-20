"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function HistoryBackToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldResetScrollRef = useRef(false);

  useEffect(() => {
    const markHistoryNavigation = () => {
      shouldResetScrollRef.current = true;
    };

    window.addEventListener("popstate", markHistoryNavigation);

    return () => {
      window.removeEventListener("popstate", markHistoryNavigation);
    };
  }, []);

  useEffect(() => {
    if (!shouldResetScrollRef.current) {
      return;
    }

    shouldResetScrollRef.current = false;
    window.scrollTo(0, 0);
  }, [pathname, searchParams]);

  return null;
}
