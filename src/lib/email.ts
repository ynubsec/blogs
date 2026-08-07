import supabaseAdmin from "@/lib/supabaseAdmin";

/**
 * Sender + brand info in a single site_config query (used by email broadcasts).
 * Sender resolution: 1) Admin Settings → Email (site_config.email.from_address)
 *  2) RESEND_FROM_EMAIL env  3) Resend's test sender (only reaches account owner).
 */
export async function getSenderInfo(): Promise<{ from: string; siteName: string }> {
  try {
    const { data } = await supabaseAdmin
      .from("site_config")
      .select("email, person")
      .eq("id", 1)
      .maybeSingle();
    const row = data as {
      email?: { from_address?: string };
      person?: { name?: string };
    } | null;

    const from =
      row?.email?.from_address?.trim() ||
      process.env.RESEND_FROM_EMAIL?.trim() ||
      "onboarding@resend.dev";
    const siteName = row?.person?.name?.trim() || "Blog";
    return { from, siteName };
  } catch {
    return {
      from: process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev",
      siteName: "Blog",
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Wraps broadcast content in a clean, branded email template (email-client safe, inline styles only). */
export function buildBroadcastHtml(subject: string, bodyHtml: string, siteName = "Blog"): string {
  const safeBody = typeof bodyHtml === "string" ? bodyHtml : "";
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #eeeeee;">
              <div style="font-size:13px;font-weight:700;color:#0a84ff;letter-spacing:0.5px;text-transform:uppercase;">${escapeHtml(siteName)}</div>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;color:#1c1c1e;">${escapeHtml(subject)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;font-size:16px;line-height:1.7;color:#3a3a3c;">${safeBody}</td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #eeeeee;font-size:12px;line-height:1.6;color:#8e8e93;">
              You're receiving this email because you subscribed to updates from ${escapeHtml(siteName)}.<br/>
              If you'd like to stop receiving these emails, please unsubscribe from the blog.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
