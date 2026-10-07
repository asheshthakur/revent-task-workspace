# VEYA — Google Apps Script Outbound Email Relay Setup

This document outlines the setup process for configuring the zero-paid-infrastructure email relay for **VEYA** using Google Workspace and Google Apps Script.

---

## 1. Create Google Apps Script Project

1. Log into your **Google Workspace** account (e.g., admin or notifications sender account).
2. Go to [https://script.google.com](https://script.google.com) and click **New Project**.
3. Rename the project to `VEYA Email Relay`.

---

## 2. Add Relay Code

1. In the Apps Script code editor, delete any existing code in `Code.gs`.
2. Copy and paste the entire contents of [`email-relay/Code.gs`](../email-relay/Code.gs) into `Code.gs`.
3. Save the project (`Ctrl+S` or `Cmd+S`).

---

## 3. Set Script Properties (Shared Secret)

1. In the left navigation bar of Apps Script, click the **Project Settings** gear icon (⚙️).
2. Scroll down to **Script Properties** and click **Edit script properties** -> **Add script property**.
3. Add:
   - **Property**: `EMAIL_RELAY_SECRET`
   - **Value**: A strong, high-entropy random secret (e.g., generated with `openssl rand -hex 32`).
4. Click **Save script properties**.

---

## 4. Deploy as Web App

1. Click **Deploy** -> **New deployment** (top right).
2. Click the gear icon next to "Select type" and select **Web app**.
3. Configure the settings:
   - **Description**: `VEYA Outbound Email Relay v1`
   - **Execute as**: `Me (<your-google-workspace-email>)`
   - **Who has access**: `Anyone` *(Note: HMAC signature and timestamp verification prevent unauthorized access).*
4. Click **Deploy**.
5. Grant necessary permissions when prompted to authorize `MailApp.sendEmail`.
6. Copy the generated **Web App URL** (e.g., `https://script.google.com/macros/s/AKfycb.../exec`).

---

## 5. Configure Cloudflare Worker Secrets

In your terminal or CI environment, set the secrets in your Cloudflare Worker:

```bash
# 1. Set the Google Apps Script Web App URL
npx wrangler secret put EMAIL_RELAY_URL
# When prompted, paste: https://script.google.com/macros/s/.../exec

# 2. Set the matching shared secret
npx wrangler secret put EMAIL_RELAY_SECRET
# When prompted, paste the exact secret configured in Script Properties
```

---

## 6. How it Works

1. **Server-Side Only**: VEYA Cloudflare Worker constructs email payloads (`WELCOME` or `PASSWORD_RESET`).
2. **HMAC Signature**: The Worker signs `timestamp:data` with `EMAIL_RELAY_SECRET` via SHA-256.
3. **Delivery**: The Google Apps Script verifies the timestamp and signature, applies the approved VEYA HTML template, and delivers the email through Google Workspace `MailApp`.
4. **Security**:
   - Arbitrary content/HTML injection is blocked.
   - Non-matching reset origins are rejected (must match `https://app.lucidmediax.in/reset-password?token=...`).
   - Plaintext passwords and reset tokens are never logged or emailed.
