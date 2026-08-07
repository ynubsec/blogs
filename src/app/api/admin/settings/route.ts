import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";
import { getSiteConfig } from "@/lib/config";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const config = await getSiteConfig();
    // Include the admin email settings (from-address for Resend broadcasts).
    const { data: row } = await supabaseAdmin
      .from("site_config")
      .select("email")
      .eq("id", 1)
      .maybeSingle();
    const email = (row as { email?: unknown } | null)?.email ?? null;
    return NextResponse.json({ ...config, email });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const data = await request.json();

    // Check if row exists
    const { data: existing } = await supabaseAdmin.from("site_config").select("id").eq("id", 1).single();

    let res;
    if (existing) {
      res = await supabaseAdmin.from("site_config").update({
        person: data.person,
        newsletter: data.newsletter,
        social_links: data.social,
        home: data.home,
        about: data.about,
        blog: data.blog,
        work: data.work,
        gallery: data.gallery,
        email: data.email ?? null,
        updated_at: new Date().toISOString()
      }).eq("id", 1);
    } else {
      res = await supabaseAdmin.from("site_config").insert({
        id: 1,
        person: data.person,
        newsletter: data.newsletter,
        social_links: data.social,
        home: data.home,
        about: data.about,
        blog: data.blog,
        work: data.work,
        gallery: data.gallery,
        email: data.email ?? null,
      });
    }

    if (res.error) {
      console.error("Supabase settings save error:", res.error);
      return NextResponse.json({ error: res.error.message }, { status: 500 });
    }

    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Settings save error:", error);
    return NextResponse.json({ error: error.message || "An error occurred" }, { status: 500 });
  }
}
