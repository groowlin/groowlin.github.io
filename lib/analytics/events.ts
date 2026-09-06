type PageParams = { page_path: string };
type CaseParams = PageParams & { case_slug: string; case_title: string };
type PreviewParams = PageParams & { case_slug: string | null; case_title: string };

/** Stable public names preserve existing Metrica goals. */
export type AnalyticsEventMap = {
  view_home: PageParams;
  view_about: PageParams;
  view_case: CaseParams;
  view_second_case: PageParams & { case_slug: string; previous_case_slug: string };
  case_scroll_90: CaseParams;
  // Case context identifies where the cumulative threshold was reached.
  case_read_120s: CaseParams;
  home_preview_open: PreviewParams;
  home_preview_change: PreviewParams & { previous_case_slug: string | null };
  click_case_card: PreviewParams & { section_title?: string };
  short_mode_toggle_on: PageParams;
  short_mode_toggle_off: PageParams;
  image_fullscreen_open: PageParams & {
    image_index: number;
    media_kind: string;
    gallery_variant: string;
  };
};
