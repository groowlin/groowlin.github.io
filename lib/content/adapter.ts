import { localCmsAdapter } from "@/lib/content/schema";
import type { CmsContentAdapter } from "@/lib/content/types";

let adapter: CmsContentAdapter = localCmsAdapter;

export function getCmsAdapter() {
  return adapter;
}

export function setCmsAdapter(nextAdapter: CmsContentAdapter) {
  adapter = nextAdapter;
}
