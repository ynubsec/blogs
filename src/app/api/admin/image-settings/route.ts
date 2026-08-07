import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";
import {
  getBlogImageSettingsUncached,
  DEFAULT_IMAGE_SETTINGS,
  type BlogImageSettings,
} from "@/lib/imageSettings";

const TABLE_NAME = "site_settings";
const SETTINGS_KEY = "image_styling";

// GET: Merged blog image settings (defaults + saved overrides) — public, used by
// the blog renderer (client) and the admin page.
export async function GET() {
  try {
    const settings = await getBlogImageSettingsUncached();
    return NextResponse.json(settings ?? DEFAULT_IMAGE_SETTINGS);
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Save image settings
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return unauthorizedResponse();
    }

    const body = (await request.json()) as Partial<BlogImageSettings>;

    // Validate core fields
    if (
      typeof body.darkThemeBackground !== "string" ||
      !body.darkThemeBackground ||
      typeof body.borderRadius !== "string" ||
      !body.borderRadius ||
      typeof body.padding !== "string" ||
      !body.padding ||
      typeof body.imageBackground !== "string" ||
      !body.imageBackground
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const merged: BlogImageSettings = { ...DEFAULT_IMAGE_SETTINGS, ...body };

    // Upsert (delete + insert keeps the table simple)
    const { error: deleteError } = await supabaseAdmin
      .from(TABLE_NAME)
      .delete()
      .eq("key", SETTINGS_KEY);

    if (deleteError && deleteError.code !== "PGRST116") {
      console.error("Delete error:", deleteError);
    }

    const { error: insertError } = await supabaseAdmin
      .from(TABLE_NAME)
      .insert({
        key: SETTINGS_KEY,
        value: merged,
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save settings" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, settings: merged });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
