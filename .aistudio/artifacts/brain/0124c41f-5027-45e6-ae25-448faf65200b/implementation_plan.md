# Gmail SMTP App Password Setup & Universal OTP Delivery Plan

Transition the email verification engine from Resend's domain-restricted sandbox to **Google Gmail SMTP with App Password**. This allows the application to deliver real 6-digit verification codes to **any user's Gmail address** for 100% free without requiring a custom domain.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Because you do not own a custom domain, Resend restricts delivery to only the account owner (`talim10725@gmail.com`). 
> **Google Gmail App Password is the optimal, 100% free solution** to send OTP emails directly to **any customer or lab owner's Gmail inbox**.

* **Confirmed Delivery Method**: Gmail SMTP via Google App Password (`smtp.gmail.com`).
* **Cost & Domain Requirement**: Completely free, ₹0, No custom domain or DNS setup needed.
* **Recipient Scope**: Any valid Gmail or email address worldwide can receive OTP codes.
* **OTP Display Policy**: Inboxes only (no helper code on screen), with 30s cooldown and 5-minute expiry.

---

## How to Get Your 16-Digit Google App Password (2 Minutes)

Follow these simple steps on your Google account:

1. **Open Google Security**:
   Visit [myaccount.google.com/security](https://myaccount.google.com/security).
2. **Ensure 2-Step Verification is ON**:
   If 2-Step Verification is not yet enabled, turn it ON using your phone number or Google Authenticator.
3. **Generate App Password**:
   * In the top search bar of your Google Account, search for **"App passwords"** (or open [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
   * Under "App name", enter `PathoCare LIS` and click **Create**.
   * Google will display a **16-character yellow box password** (e.g. `abcd efgh ijkl mnop`).
   * Copy this 16-digit code.
4. **Environment Variables to Set**:
   In AI Studio / `.env`:
   * `SMTP_HOST`: `smtp.gmail.com`
   * `SMTP_PORT`: `587`
   * `SMTP_USER`: `talim10725@gmail.com` (your Gmail address)
   * `SMTP_PASS`: `abcdefghijklmnop` (the 16-digit App Password without spaces)
   * `RESEND_API_KEY`: *Leave empty / blank* so the app routes through your unrestricted Gmail SMTP.

---

## Technical Architecture & Delivery Flow

```
┌────────────────────────────────────────────────────────┐
│                   User Action Flow                     │
│  Registration or Login -> Enter User's Gmail Address   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Node.js Backend Server                 │
│                 (/api/auth/send-otp)                   │
│                                                        │
│  1. Check Database: Verify account existence (Login)   │
│  2. Enforce 30s Cooldown & Generate 6-Digit Code       │
│  3. Detect SMTP Credentials: smtp.gmail.com            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            Google Gmail SMTP Engine (Port 587)         │
│         Sender: talim10725@gmail.com                   │
│         Delivery: Sent to ANY recipient's Gmail inbox  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             Recipient's Gmail Inbox                    │
│    Receives professional HTML email with 6-digit OTP   │
└────────────────────────────────────────────────────────┘
```

---

## Key Backend Enhancements in `server.ts`

1. **SMTP Prioritization & Direct Dispatch**:
   * Prioritize `process.env.SMTP_USER` and `process.env.SMTP_PASS` over Resend when custom SMTP is configured, ensuring seamless direct Gmail delivery.
   * Provide an informative error logger and fallback if Google SMTP authentication encounters incorrect credentials.
2. **Sender Display**:
   * Professional sender header: `"PathoCare LIS Security" <talim10725@gmail.com>`.
3. **Strict Security Verification**:
   * 30-second resend cooldown enforced on both client and server.
   * 5-minute strict OTP expiration.
   * Max 3 invalid code attempts before invalidation.
   * Pre-check in Firestore / LocalStorage to verify registered accounts during login.

---

## Verification Plan

### Automated Verification
* Run `compile_applet` to ensure clean TypeScript compilation.
* Run `lint_applet` to confirm zero lint errors.
* Restart development server using `restart_dev_server`.

### Functional Verification
* Send an OTP to a different test email address and verify that Gmail SMTP successfully dispatches the email to that recipient.
* Verify that login blocks unregistered email addresses and registration permits new account creation.
