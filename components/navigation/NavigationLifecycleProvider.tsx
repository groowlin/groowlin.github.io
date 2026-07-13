"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";

export type NavigationAnimationKind = "initial" | "route";

interface NavigationLifecycleContextValue {
  classifyPathname: (pathname: string) => NavigationAnimationKind;
  routeKey: string;
}

const NavigationLifecycleContext = createContext<NavigationLifecycleContextValue | null>(null);

interface NavigationLifecycleProviderProps {
  children: React.ReactNode;
}

export function NavigationLifecycleProvider({ children }: NavigationLifecycleProviderProps) {
  const pathname = usePathname();
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
      routeKey: pathname
    }),
    [classifyPathname, pathname]
  );

  useLayoutEffect(() => {
    if (previousPathname.current !== null && previousPathname.current !== pathname) {
      hasNavigated.current = true;
    }

    previousPathname.current = pathname;
  }, [pathname]);

  return <NavigationLifecycleContext.Provider value={contextValue}>{children}</NavigationLifecycleContext.Provider>;
}

export function useNavigationLifecycle() {
  const lifecycle = useContext(NavigationLifecycleContext);

  if (lifecycle === null) {
    throw new Error("useNavigationLifecycle must be used within NavigationLifecycleProvider");
  }

  return lifecycle;
}
