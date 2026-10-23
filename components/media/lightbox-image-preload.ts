const preloadedImageSources = new Set<string>();
const pendingImagePreloads = new Map<string, Promise<boolean>>();

export function isImageSourceReady(src?: string) {
  return Boolean(src && preloadedImageSources.has(src));
}

export function preloadImageSource(src?: string) {
  if (!src || typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (preloadedImageSources.has(src)) {
    return Promise.resolve(true);
  }

  if (pendingImagePreloads.has(src)) {
    return pendingImagePreloads.get(src) ?? Promise.resolve(false);
  }

  const preloadPromise = new Promise<boolean>((resolve) => {
    const image = new window.Image();
    image.decoding = "async";
    let settled = false;

    const finish = (ready: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      pendingImagePreloads.delete(src);
      if (ready) {
        preloadedImageSources.add(src);
      }
      resolve(ready);
    };

    const decode = async () => {
      if (image.naturalWidth <= 0) {
        finish(false);
        return;
      }

      if (typeof image.decode !== "function") {
        finish(true);
        return;
      }

      try {
        await image.decode();
        finish(image.naturalWidth > 0);
      } catch {
        finish(false);
      }
    };

    image.onload = () => void decode();
    image.onerror = () => finish(false);

    image.src = src;

    if (image.complete) {
      window.queueMicrotask(() => {
        if (image.naturalWidth > 0) {
          void decode();
        } else {
          finish(false);
        }
      });
    }
  });

  pendingImagePreloads.set(src, preloadPromise);
  return preloadPromise;
}

