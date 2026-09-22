export type LightboxContextDestination =
  | { kind: "page-top" }
  | { kind: "element"; target: HTMLElement };

export interface LightboxContext {
  title: string;
  body: string;
  destination: LightboxContextDestination;
  href: string;
  action: boolean;
}

function plainText(element: Element | null) {
  return element?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function ensureAnchor(target: HTMLElement, base: string) {
  if (target.id) {
    return `#${encodeURIComponent(target.id)}`;
  }

  const document = target.ownerDocument;
  let id = base;
  let suffix = 2;
  while (document.getElementById(id)) {
    id = `${base}-${suffix++}`;
  }
  target.id = id;
  return `#${id}`;
}

/** Read the rendered MDX without introducing a second content contract. */
export function getLightboxContext(
  trigger: HTMLElement,
  { caption }: { caption?: string } = {}
): LightboxContext | null {
  const fullArticle = trigger.closest<HTMLElement>("[data-work-article-root]");
  const shortArticle = trigger.closest<HTMLElement>("[data-work-short-summary]");
  const root = fullArticle ?? shortArticle;
  const gallery = trigger.closest<HTMLElement>("[data-lightbox-gallery]");
  if (!root || !gallery) {
    return null;
  }

  const normalizedCaption = caption?.replace(/\s+/g, " ").trim() ?? "";
  let title = plainText(root.ownerDocument.querySelector("header h1"));
  let body = "";
  let target = trigger;
  let heading: HTMLElement | null = null;
  const action = Boolean(fullArticle);

  if (shortArticle) {
    if (!normalizedCaption) {
      return null;
    }
    title = normalizedCaption;
  }

  if (fullArticle) {
    for (const element of fullArticle.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6")) {
      if (!(element.compareDocumentPosition(gallery) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        break;
      }
      if (!element.closest("[data-lightbox-gallery],figure,figcaption")) {
        heading = element;
      }
    }

    if (heading) {
      title = plainText(heading) || title;
    }

    let content = heading?.nextElementSibling ?? fullArticle.firstElementChild;
    while (content && !/^H[1-6]$/.test(content.tagName)) {
      if (content.tagName === "P" && plainText(content)) {
        body = plainText(content);
        target = content as HTMLElement;
        break;
      }
      content = content.nextElementSibling;
    }
  }

  const galleries = Array.from(root.querySelectorAll("[data-lightbox-gallery]"));
  const galleryNumber = galleries.indexOf(gallery) + 1;
  const triggers = Array.from(gallery.querySelectorAll<HTMLElement>("button"));
  const mediaNumber = Math.max(triggers.indexOf(trigger) + 1, 1);
  const mode = fullArticle ? "full" : "short";
  const destination: LightboxContextDestination = fullArticle && !heading
    ? { kind: "page-top" }
    : { kind: "element", target };
  const href = destination.kind === "page-top"
    ? "#"
    : ensureAnchor(destination.target, `case-${mode}-media-${galleryNumber}-${mediaNumber}`);
  return { title, body, destination, href, action };
}
