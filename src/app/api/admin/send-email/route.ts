import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { Resend } from "resend";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/adminAuth";
import { getSenderInfo, buildBroadcastHtml } from "@/lib/email";

/** Resend caps a single message at 50 recipients (to + cc + bcc) — the
 *  required `to` address counts toward the limit, so batch BCC at 49. */
const BCC_BATCH_SIZE = 49;

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const { subject, message, test } = await request.json();

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required." },
        { status: 400 },
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured in the environment variables." },
        { status: 500 },
      );
    }

    const { from, siteName } = await getSenderInfo();
    const html = buildBroadcastHtml(subject, message, siteName);

    const resend = new Resend(apiKey);

    // Test mode: send a single preview to the sender's own address so the admin
    // can verify the from-address, template and API key before a real broadcast.
    if (test) {
      const { error: resendError } = await resend.emails.send({
        from,
        to: from,
        subject: `[Test] ${subject}`,
        html,
      });
      if (resendError) {
        console.error("Resend test error:", resendError);
        return NextResponse.json({ error: resendError.message }, { status: 500 });
      }
      return NextResponse.json({
        message: `Test email sent to ${from}. Check your inbox!`,
        test: true,
      });
    }

    // Fetch all active subscribers
    const { data: subscribers, error } = await supabaseAdmin
      .from("subscribers")
      .select("email")
      .eq("status", "active");

    if (error) {
      console.error("Failed to fetch subscribers:", error);
      return NextResponse.json(
        { error: "Failed to fetch subscribers from database." },
        { status: 500 },
      );
    }

    const bccEmails = (subscribers || []).map((sub: { email: string }) => sub.email);
    if (bccEmails.length === 0) {
      return NextResponse.json({ error: "No active subscribers found." }, { status: 404 });
    }

    const batches: string[][] = [];
    for (let i = 0; i < bccEmails.length; i += BCC_BATCH_SIZE) {
      batches.push(bccEmails.slice(i, i + BCC_BATCH_SIZE));
    }

    const failures: string[] = [];
    let sent = 0;

    for (const batch of batches) {
      const { error: resendError } = await resend.emails.send({
        from,
        to: from,
        bcc: batch,
        subject,
        html,
      });
      if (resendError) {
        console.error("Resend error:", resendError);
        failures.push(resendError.message);
      } else {
        sent += batch.length;
      }
    }

    if (sent === 0) {
      return NextResponse.json(
        { error: failures[0] || "Failed to send email." },
        { status: 500 },
      );
    }

    const partial = failures.length > 0;
    return NextResponse.json({
      message: `Email sent to ${sent} subscriber${sent === 1 ? "" : "s"}${
        partial ? ` (${batches.length - failures.length} of ${batches.length} batch(es) failed)` : ""
      }.`,
      sent,
      total: bccEmails.length,
      ...(partial ? { errors: failures } : {}),
    });
  } catch (error) {
    console.error("Send email API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
