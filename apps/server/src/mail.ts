/**
 * mail.ts — Email delivery wrapper.
 *
 * Falls back to structured console.log when RESEND_API_KEY is absent.
 * Swap the provider by replacing the `sendViaProvider` call — the public
 * interface (sendMail) and environment variables stay the same.
 *
 * Required env vars:
 *   RESEND_API_KEY  — Resend API key (empty → stub mode)
 *   EMAIL_FROM      — From address, e.g. "Wokwi <noreply@wokwi-cn.example.com>"
 *   EMAIL_REPLY_TO  — Reply-to address (optional)
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'noreply@wokwi-cn.example.com';
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO ?? EMAIL_FROM;

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  /** Override the reply-to address (default: EMAIL_REPLY_TO env var) */
  replyTo?: string;
}

/** Returns true if the provider is configured (not stub mode). */
export function isEmailConfigured(): boolean {
  return RESEND_API_KEY.length > 0;
}

/**
 * Send an email. In stub mode this logs the payload and returns true
 * so callers don't need to branch on configuration.
 */
export async function sendMail(opts: SendMailOptions): Promise<{ ok: boolean; error?: string }> {
  const { to, subject, html, replyTo = EMAIL_REPLY_TO } = opts;

  if (!isEmailConfigured()) {
    console.info('[mail:stub]', {
      ts: new Date().toISOString(),
      from: EMAIL_FROM,
      to,
      replyTo,
      subject,
      preview: html.replace(/<[^>]+>/g, '').slice(0, 80),
    });
    return { ok: true };
  }

  return sendViaProvider({ to, subject, html, from: EMAIL_FROM, replyTo });
}

// ── Provider stub — replace this function to switch to SendGrid / SES / … ───────

async function sendViaProvider(opts: {
  to: string;
  subject: string;
  html: string;
  from: string;
  replyTo: string;
}): Promise<{ ok: boolean; error?: string }> {
  // Dynamic import keeps Resend out of the bundle when the env var is absent.
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: opts.from,
      to: opts.to,
      replyTo: opts.replyTo,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) {
      console.error('[mail:resend:error]', error);
      return { ok: false, error: error.message };
    }
    console.info('[mail:resend:ok]', { to: opts.to, subject: opts.subject });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[mail:resend:exception]', msg);
    return { ok: false, error: msg };
  }
}
