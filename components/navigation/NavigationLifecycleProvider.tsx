"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

export type NavigationAnimationKind = "initial" | "route";

interface NavigationLifecycleContextValue {
  classifyPathname: (pathname: string) => NavigationAnimationKind;
  routeKey: string;
  registerContentRoot: (root: HTMLDivElement | null) => void;
  navigateWithContentExit: (href: string) => void;
}

const NavigationLifecycleContext = createContext<NavigationLifecycleContextValue | null>(null);

interface NavigationLifecycleProviderProps {
  children: React.ReactNode;
}

export function NavigationLifecycleProvider({ children }: NavigationLifecycleProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const contentRootRef = useRef<HTMLDivElement | null>(null);
  const exitAnimationsRef = useRef<Animation[]>([]);
  const navigationRunRef = useRef(0);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestedHrefRef = useRef<string | null>(null);
  const hasDispatchedNavigationRef = useRef(false);
  const cancelContentExit = useCallback(() => {
    navigationRunRef.current += 1;
    exitAnimationsRef.current.forEach((animation) => animation.cancel());
    exitAnimationsRef.current = [];
    if (recoveryTimerRef.current !== null) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
  }, []);
  const registerContentRoot = useCallback((root: HTMLDivElement | null) => {
    contentRootRef.current = root;
  }, []);
  const recoverNavigation = useCallback(() => {
    requestedHrefRef.current = null;
    hasDispatchedNavigationRef.current = false;
    cancelContentExit();
  }, [cancelContentExit]);
  const navigateWithContentExit = useCallback((href: string) => {
    const targets = Array.from(contentRootRef.current?.querySelectorAll<HTMLElement>("[data-page-reveal-root]") ?? [])
      .filter((element) => !element.parentElement?.closest("[data-page-reveal-root]"));
    const startingOpacity = targets.map((element) => getComputedStyle(element).opacity);
    cancelContentExit();
    const target = new URL(href, window.location.href);
    const normalize = (value: string) => value.replace(/\/+$/, "") || "/";
    if (target.origin !== window.location.origin) {
      return;
    }
    requestedHrefRef.current = href;
    if (normalize(target.pathname) === normalize(pathname)) {
      if (!hasDispatchedNavigationRef.current) requestedHrefRef.current = null;
      else recoveryTimerRef.current = setTimeout(recoverNavigation, 5000);
      return;
    }

    const run = navigationRunRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animations = reducedMotion ? [] : targets.map((element, index) => element.animate(
      [{ opacity: startingOpacity[index] }, { opacity: 0 }],
      { duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
    ));
    exitAnimationsRef.current = animations;
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (navigationRunRef.current !== run) return;
      try {
        hasDispatchedNavigationRef.current = true;
        router.push(href, { scroll: false });
        // Recover visible content if a route fails to commit.
        recoveryTimerRef.current = setTimeout(recoverNavigation, 5000);
      } catch {
        requestedHrefRef.current = null;
        hasDispatchedNavigationRef.current = false;
        cancelContentExit();
      }
    });
  }, [cancelContentExit, pathname, recoverNavigation, router]);
  const previousPathname = useRef<string | null>(null);
  const hasNavigated = useRef(false);
  const classifyPathname = useCallback(
    (currentPathname: string): NavigationAnimationKind =>
      hasNavigated.current ||
      (previousPathname.current !== null && previousPathname.current !== currentPathname)
        ? "route"
        : "initial",
    []
  );
  const contextValue = useMemo<NavigationLifecycleContextValue>(
    () => ({
      classifyPathname,
      routeKey: pathname,
      registerContentRoot,
      navigateWithContentExit
    }),
    [classifyPathname, pathname, registerContentRoot, navigateWithContentExit]
  );

  useLayoutEffect(() => {
    cancelContentExit();
    const requestedHref = requestedHrefRef.current;
    const normalize = (value: string) => value.replace(/\/+$/, "") || "/";
    if (hasDispatchedNavigationRef.current && requestedHref !== null &&
      normalize(new URL(requestedHref, window.location.href).pathname) !== normalize(pathname)) {
      // A superseded push committed: honour the most recent card click.
      try {
        router.push(requestedHref, { scroll: false });
        recoveryTimerRef.current = setTimeout(recoverNavigation, 5000);
      } catch {
        recoverNavigation();
      }
    } else {
      requestedHrefRef.current = null;
      hasDispatchedNavigationRef.current = false;
    }
    if (previousPathname.current !== null && previousPathname.current !== pathname) {
      hasNavigated.current = true;
    }

    previousPathname.current = pathname;
  }, [pathname, router, cancelContentExit, recoverNavigation]);

  useLayoutEffect(() => {
    const cancelNavigation = () => {
      requestedHrefRef.current = null;
      hasDispatchedNavigationRef.current = false;
      cancelContentExit();
    };
    window.addEventListener("popstate", cancelNavigation);
    return () => {
      window.removeEventListener("popstate", cancelNavigation);
      cancelNavigation();
    };
  }, [cancelContentExit]);

  return <NavigationLifecycleContext.Provider value={contextValue}>{children}</NavigationLifecycleContext.Provider>;
}

export function useNavigationLifecycle() {
  const lifecycle = useContext(NavigationLifecycleContext);

  if (lifecycle === null) {
    throw new Error("useNavigationLifecycle must be used within NavigationLifecycleProvider");
  }

  return lifecycle;
}
