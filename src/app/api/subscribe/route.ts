import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawEmail = typeof body?.email === "string" ? body.email : "";
    const email = rawEmail.trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 },
      );
    }

    // Insert into the subscribers table (id, email unique, status, subscribed_at)
    const { error } = await supabaseAdmin
      .from("subscribers")
      .insert([{ email }])
      .select();

    if (error) {
      // Unique constraint violation — email already exists.
      if (error.code === "23505") {
        const { data: existing } = await supabaseAdmin
          .from("subscribers")
          .select("status")
          .eq("email", email)
          .maybeSingle();

        // Re-activate a previously unsubscribed email instead of blocking it.
        // Keep the original subscribed_at date so the admin list stays stable.
        if (existing?.status === "unsubscribed") {
          const { error: updateError } = await supabaseAdmin
            .from("subscribers")
            .update({ status: "active" })
            .eq("email", email);

          if (updateError) {
            console.error("Re-subscribe error:", updateError);
            return NextResponse.json(
              { error: "Failed to subscribe. Please try again later." },
              { status: 500 },
            );
          }

          return NextResponse.json(
            { message: "Welcome back! You've been re-subscribed." },
            { status: 200 },
          );
        }

        return NextResponse.json(
          { error: "This email is already subscribed!" },
          { status: 409 },
        );
      }

      console.error("Subscription error:", error);
      return NextResponse.json(
        { error: "Failed to subscribe. Please try again later." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "Successfully subscribed!" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Subscription API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
