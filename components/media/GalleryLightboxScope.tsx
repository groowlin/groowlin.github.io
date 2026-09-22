"use client";

import { createContext, type MutableRefObject, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { MediaPlaceholder } from "@/lib/content/types";

export interface ScopedGalleryItem extends MediaPlaceholder {
  openable?: boolean;
}

export interface GalleryRegistration {
  id: string;
  items: ScopedGalleryItem[];
  triggerRefs: MutableRefObject<Map<number, HTMLButtonElement | null>>;
  mediaRefs: MutableRefObject<Map<number, HTMLDivElement | null>>;
}

interface GalleryScopeValue {
  registrations: Array<Pick<GalleryRegistration, "id" | "items">>;
  getRegistration: (id: string) => GalleryRegistration | null;
  register: (registration: GalleryRegistration) => () => void;
}

const GalleryScopeContext = createContext<GalleryScopeValue | null>(null);

export function GalleryLightboxScope({ children }: { children: ReactNode }) {
  const [registrations, setRegistrations] = useState<Array<Pick<GalleryRegistration, "id" | "items">>>([]);
  const registrationRefs = useRef(new Map<string, GalleryRegistration>());
  const register = useCallback((registration: GalleryRegistration) => {
    registrationRefs.current.set(registration.id, registration);
    setRegistrations((current) => [...current.filter((entry) => entry.id !== registration.id), {
      id: registration.id,
      items: registration.items
    }]);
    return () => {
      registrationRefs.current.delete(registration.id);
      setRegistrations((current) => current.filter((entry) => entry.id !== registration.id));
    };
  }, []);
  const getRegistration = useCallback((id: string) => registrationRefs.current.get(id) ?? null, []);

  const value = useMemo<GalleryScopeValue>(() => ({ getRegistration, registrations, register }), [getRegistration, register, registrations]);

  return <GalleryScopeContext.Provider value={value}>{children}</GalleryScopeContext.Provider>;
}

export function useGalleryLightboxScope() {
  return useContext(GalleryScopeContext);
}
