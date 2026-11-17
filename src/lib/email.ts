import "server-only";

// Sends the sign-in code through Resend's HTTP API (https://resend.com/docs),
// with plain fetch so no SDK is needed. Configure on the server:
//
//   RESEND_API_KEY  an API key with sending access
//   EMAIL_FROM      a sender on a domain verified in Resend, for example
//                   "APEL.Q Tracker <no-reply@your-verified-domain>"
//
// Without them, development prints the code to the dev-server console so the
// login can be tried locally; production refuses with a clear error instead
// (it must never log codes).

export type SendResult = { ok: true } | { ok: false; error: string };

export async function sendLoginCode(
  to: string,
  code: string,
  minutesValid: number
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[auth] Sign-in code for ${to}: ${code} (not emailed: RESEND_API_KEY / EMAIL_FROM are not set)`
      );
      return { ok: true };
    }
    console.error("[auth] RESEND_API_KEY / EMAIL_FROM are not set — cannot send sign-in codes.");
    return {
      ok: false,
      error: "Sign-in emails are not set up yet. Please contact the tracker administrator.",
    };
  }

  const text = [
    `Your UNITAR APEL.Q Tracker sign-in code is: ${code}`,
    "",
    `It expires in ${minutesValid} minutes and can be used once.`,
    "If you didn't try to sign in, you can ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827">
      <p>Your UNITAR APEL.Q Tracker sign-in code is:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:16px 0">${code}</p>
      <p>It expires in ${minutesValid} minutes and can be used once.</p>
      <p style="color:#6b7280">If you didn't try to sign in, you can ignore this email.</p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `${code} is your APEL.Q Tracker sign-in code`,
        text,
        html,
      }),
    });
    if (!res.ok) {
      console.error("[auth] Resend rejected the email:", res.status, await res.text());
      return { ok: false, error: "We couldn't send the email. Please try again shortly." };
    }
    return { ok: true };
  } catch (err) {
    console.error("[auth] Could not reach Resend:", err);
    return { ok: false, error: "We couldn't send the email. Please try again shortly." };
  }
}
