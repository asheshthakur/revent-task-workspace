import crypto from 'crypto';

export type EmailType = 'WELCOME' | 'PASSWORD_RESET';

interface BaseEmailData {
  type: EmailType;
  to: string;
  firstName: string;
}

interface WelcomeEmailData extends BaseEmailData {
  type: 'WELCOME';
}

interface PasswordResetEmailData extends BaseEmailData {
  type: 'PASSWORD_RESET';
  resetUrl: string;
}

export type EmailPayloadData = WelcomeEmailData | PasswordResetEmailData;

interface RelaySendResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Computes HMAC-SHA256 hex string for canonical message
 */
function computeHmacSha256(message: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

/**
 * Sends a transactional email through the Google Apps Script Web App relay.
 * Features:
 * - Bounded timeout (8 seconds) to avoid blocking authentication flows.
 * - HMAC-SHA256 signing for zero-trust relay authentication.
 * - Safe server-side event logging without exposing secrets or credentials.
 */
export async function sendRelayEmail(data: EmailPayloadData): Promise<RelaySendResult> {
  const relayUrl = process.env.EMAIL_RELAY_URL;
  const relaySecret = process.env.EMAIL_RELAY_SECRET;

  const eventPrefix = data.type === 'WELCOME' ? 'WELCOME_EMAIL' : 'PASSWORD_RESET_EMAIL';

  if (!relayUrl || !relaySecret) {
    console.warn(`[${eventPrefix}_SKIPPED] EMAIL_RELAY_URL or EMAIL_RELAY_SECRET is not configured on the Worker.`);
    return {
      success: false,
      error: 'Email relay configuration is missing.',
    };
  }

  const timestamp = Date.now().toString();
  const canonicalString = `${timestamp}:${JSON.stringify(data)}`;
  const signature = computeHmacSha256(canonicalString, relaySecret);

  const payload = {
    timestamp,
    signature,
    data,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second bounded timeout

  try {
    console.info(`[${eventPrefix}_REQUESTED] Attempting outbound email to ${data.to.split('@')[0]}@...`);

    const res = await fetch(relayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      console.error(`[${eventPrefix}_FAILED] Relay responded with status ${res.status}: ${errText.slice(0, 200)}`);
      return { success: false, error: `Relay error (${res.status})` };
    }

    const resJson = await res.json().catch(() => ({}));
    if (resJson.success || resJson.ok) {
      console.info(`[${eventPrefix}_ACCEPTED] Successfully accepted by Google Apps Script relay.`);
      return { success: true, message: resJson.message };
    } else {
      console.error(`[${eventPrefix}_FAILED] Relay rejected: ${resJson.error || 'Unknown relay rejection'}`);
      return { success: false, error: resJson.error || 'Relay rejected request' };
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : 'Unknown exception';
    console.error(`[${eventPrefix}_FAILED] Network or timeout error communicating with relay: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Sends a welcome email to a newly created user.
 */
export async function sendWelcomeEmail(to: string, firstName: string): Promise<RelaySendResult> {
  return await sendRelayEmail({
    type: 'WELCOME',
    to,
    firstName: firstName || 'there',
  });
}

/**
 * Sends a secure password reset link to an existing user.
 */
export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  resetUrl: string
): Promise<RelaySendResult> {
  return await sendRelayEmail({
    type: 'PASSWORD_RESET',
    to,
    firstName: firstName || 'there',
    resetUrl,
  });
}
