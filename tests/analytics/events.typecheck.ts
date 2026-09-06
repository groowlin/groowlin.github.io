import { trackMetricaGoal } from "../../lib/analytics/yandex-metrica";

// Compile-only contract checks; never executed or bundled into the site.
function checkEventContract() {
  trackMetricaGoal("view_case", { page_path: "/work/a/", case_slug: "a", case_title: "A" });
  trackMetricaGoal("short_mode_toggle_on", { page_path: "/work/a/" });
  // @ts-expect-error misspelled event
  trackMetricaGoal("view_csae", { page_path: "/" });
  // @ts-expect-error case context is required
  trackMetricaGoal("view_case", { page_path: "/work/a/" });
  // @ts-expect-error the second-case event must identify the preceding case
  trackMetricaGoal("view_second_case", { page_path: "/work/b/", case_slug: "b" });
  // @ts-expect-error required payload cannot be omitted
  trackMetricaGoal("view_about");
  // @ts-expect-error image indices are numbers
  trackMetricaGoal("image_fullscreen_open", { page_path: "/", image_index: "1", media_kind: "image", gallery_variant: "default" });
}

void checkEventContract;
