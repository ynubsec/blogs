import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

async function unsubscribe(rawEmail: unknown) {
  const normalized = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("subscribers")
    .update({ status: "unsubscribed" })
    .eq("email", normalized)
    .select();

  if (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe. Please try again." },
      { status: 500 },
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "This email is not in our subscriber list." },
      { status: 404 },
    );
  }

  return NextResponse.json({ message: "You've been unsubscribed." }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    return await unsubscribe(body?.email);
  } catch (error) {
    console.error("Unsubscribe API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return await unsubscribe(url.searchParams.get("email"));
  } catch (error) {
    console.error("Unsubscribe API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
