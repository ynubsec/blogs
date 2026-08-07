import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const { data: subscribers, error } = await supabaseAdmin
      .from("subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch subscribers:", error);
      return NextResponse.json(
        { error: "Failed to fetch subscribers from database." },
        { status: 500 },
      );
    }

    return NextResponse.json(subscribers, { status: 200 });
  } catch (error) {
    console.error("Fetch subscribers API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH: unsubscribe a subscriber by email
export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as { email?: string };
    const email = body?.email?.trim().toLowerCase() || "";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("subscribers")
      .update({ status: "unsubscribed" })
      .eq("email", email);

    if (error) {
      console.error("Unsubscribe error:", error);
      return NextResponse.json({ error: "Failed to unsubscribe." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Subscriber unsubscribed." });
  } catch (error) {
    console.error("Unsubscribe API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: remove a subscriber entirely
export async function DELETE(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase() || "";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("subscribers")
      .delete()
      .eq("email", email);

    if (error) {
      console.error("Delete subscriber error:", error);
      return NextResponse.json({ error: "Failed to delete subscriber." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Subscriber deleted." });
  } catch (error) {
    console.error("Delete subscriber API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
