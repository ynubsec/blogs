import { unstable_cache } from "next/cache";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { DATA_REVALIDATE_SECONDS } from "@/lib/cache";

export interface BlogImageSettings {
  darkThemeBackground: string;
  borderRadius: string;
  padding: string;
  boxShadow: string;
  hoverScale: number;
  margin: string;
  imageBackground: string;
  /** Cover hero aspect ratio, e.g. "16/9", "21/9", "2/1", "3/2", or "auto" (original). */
  coverAspectRatio: string;
  /** Cover hero width preset: "wide" (bigger than text), "full" (edge to edge), "standard" (text width). */
  coverWidth: "wide" | "full" | "standard";
  /** Max height cap for inline body images ("auto" disables the cap). */
  inlineImageMaxHeight: string;
  /** Max width cap for inline body images (e.g. "100%" or "85%"). */
  inlineImageMaxWidth: string;
}

export const DEFAULT_IMAGE_SETTINGS: BlogImageSettings = {
  darkThemeBackground: "white",
  borderRadius: "8px",
  padding: "0px",
  boxShadow: "none",
  hoverScale: 1.01,
  margin: "0px",
  imageBackground: "white",
  coverAspectRatio: "16/9",
  coverWidth: "wide",
  inlineImageMaxHeight: "480px",
  inlineImageMaxWidth: "100%",
};

const TABLE_NAME = "site_settings";
const SETTINGS_KEY = "image_styling";

async function fetchImageSettings(): Promise<BlogImageSettings> {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE_NAME)
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    if (error) {
      console.error("Failed to load image settings:", error);
    } else if (data?.value && typeof data.value === "object") {
      return { ...DEFAULT_IMAGE_SETTINGS, ...(data.value as Partial<BlogImageSettings>) };
    }
  } catch (err) {
    console.error("Failed to load image settings:", err);
  }
  return { ...DEFAULT_IMAGE_SETTINGS };
}

/** Uncached fetch — used by API route handlers. */
export async function getBlogImageSettingsUncached(): Promise<BlogImageSettings> {
  return fetchImageSettings();
}

const getCachedImageSettings = unstable_cache(fetchImageSettings, ["image-settings"], {
  revalidate: DATA_REVALIDATE_SECONDS,
  tags: ["image-settings"],
});

/** Cached fetch — used by server components (blog post pages). */
export const getBlogImageSettings = getCachedImageSettings;
