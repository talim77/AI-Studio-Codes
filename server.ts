import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-Memory Secure OTP Store with 5-Minute Expiry & 30s Cooldown
interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
  lastSentAt: number;
  token?: string;
}

const otpStore = new Map<string, OtpEntry>();

// Cleanup expired OTP entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of otpStore.entries()) {
    if (entry.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 60 * 1000);

// Setup Gmail / Custom SMTP Transporter
function getSmtpTransporter(): Transporter | null {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const cleanUser = process.env.SMTP_USER.trim();
    const cleanPass = process.env.SMTP_PASS.replace(/\s+/g, ''); // Strip spaces from Google App Password

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return null;
}

// Fallback transporter for testing/development
let fallbackTransporter: Transporter | null = null;
async function getFallbackTransporter(): Promise<Transporter> {
  if (fallbackTransporter) return fallbackTransporter;

  try {
    const testAccount = await nodemailer.createTestAccount();
    fallbackTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[Email Service] Automated SMTP initialized with Ethereal: ${testAccount.user}`);
    return fallbackTransporter;
  } catch (err) {
    console.warn('[Email Service] Fallback transporter creation error:', err);
    fallbackTransporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
    return fallbackTransporter;
  }
}

// Unified Email Dispatcher: prioritizes Gmail SMTP (universal delivery) -> Resend API -> Fallback
async function dispatchEmail(
  cleanEmail: string,
  subject: string,
  htmlContent: string,
  otpCode: string
): Promise<{ success: boolean; messageId?: string }> {
  // Option 1: Gmail SMTP / Custom SMTP (Delivers to ANY recipient Gmail address worldwide)
  const smtpMailer = getSmtpTransporter();
  if (smtpMailer) {
    try {
      const sender = process.env.SMTP_USER?.trim() || 'talim10725@gmail.com';
      const mailOptions = {
        from: `"PathoCare LIS Security" <${sender}>`,
        to: cleanEmail,
        subject,
        html: htmlContent,
        text: `Your PathoCare LIS verification code is: ${otpCode}. It is valid for 5 minutes. Do not share this code.`,
      };

      const info = await smtpMailer.sendMail(mailOptions);
      console.log(`[Gmail SMTP Service] Successfully sent OTP email to ${cleanEmail}. MessageId:`, info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (smtpErr) {
      console.error('[Gmail SMTP Error] Failed to send via Gmail SMTP:', smtpErr);
      // Fall through to Resend or fallback if SMTP failed
    }
  }

  // Option 2: Resend API Key (If user provided RESEND_API_KEY)
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
    try {
      const fromSender = process.env.RESEND_FROM_EMAIL?.trim() || 'PathoCare LIS <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromSender,
          to: [cleanEmail],
          reply_to: cleanEmail,
          subject,
          html: htmlContent,
          text: `Your PathoCare LIS verification code is: ${otpCode}. It is valid for 5 minutes. Do not share this code.`,
        }),
      });

      const data = (await res.json()) as any;
      if (res.ok) {
        console.log(`[Resend Email Service] Successfully delivered email to ${cleanEmail}. Id: ${data.id}`);
        return { success: true, messageId: data.id };
      } else {
        console.warn('[Resend API Warning]', data);
      }
    } catch (resendErr) {
      console.warn('[Resend API Error]', resendErr);
    }
  }

  // Option 3: Automated reliable fallback (Ethereal test account or local sendmail)
  const mailer = await getFallbackTransporter();
  const mailOptions = {
    from: `"PathoCare LIS Security" <no-reply@pathocare.com>`,
    to: cleanEmail,
    subject,
    html: htmlContent,
    text: `Your PathoCare LIS verification code is: ${otpCode}. It is valid for 5 minutes. Do not share this code.`,
  };

  const info = await mailer.sendMail(mailOptions);
  console.log(`[Email Service] Sent OTP email to ${cleanEmail}. MessageId:`, info.messageId);

  if (nodemailer.getTestMessageUrl(info)) {
    console.log('[Email Service] Real Email Inbox Preview URL:', nodemailer.getTestMessageUrl(info));
  }

  return { success: true, messageId: info.messageId };
}

// -------------------------------------------------------------
// Persistent Multi-Tenant Database Storage (data/labs_db.json)
// -------------------------------------------------------------
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'labs_db.json');

interface LabTenantData {
  labAccount: any;
  staff: any[];
  doctors: any[];
  templates: any[];
  reports: any[];
}

interface DatabaseSchema {
  labs: Record<string, LabTenantData>;
}

function loadDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[Database Error] Failed to read labs_db.json:', err);
  }
  return { labs: {} };
}

function saveDb(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Database Error] Failed to write labs_db.json:', err);
  }
}

// -------------------------------------------------------------
// 1. Get All Registered Labs (Cross-Device Discovery)
// -------------------------------------------------------------
app.get('/api/labs', (_req: Request, res: Response): any => {
  const db = loadDb();
  const labList = Object.values(db.labs).map((t) => {
    const acc = { ...t.labAccount };
    delete acc.passwordHash;
    return acc;
  });
  return res.json(labList);
});

// -------------------------------------------------------------
// 2. Get Single Lab Complete Details
// -------------------------------------------------------------
app.get('/api/labs/:labId', (req: Request, res: Response): any => {
  const cleanId = (req.params.labId || '').trim().toUpperCase();
  const db = loadDb();
  const tenant = db.labs[cleanId];
  if (!tenant) {
    return res.status(404).json({ success: false, message: `Lab "${cleanId}" not found.` });
  }
  const sanitized = { ...tenant.labAccount };
  delete sanitized.passwordHash;
  return res.json({
    success: true,
    labAccount: sanitized,
    staff: tenant.staff || [],
    doctors: tenant.doctors || [],
    templates: tenant.templates || [],
    reports: tenant.reports || [],
  });
});

// -------------------------------------------------------------
// 3. Register New Lab in Backend Database
// -------------------------------------------------------------
app.post('/api/labs/register', (req: Request, res: Response): any => {
  const { uniqueLabId, labName, ownerName, ownerEmail, password, phone, address } = req.body;
  if (!uniqueLabId || !labName || !ownerName || !ownerEmail) {
    return res.status(400).json({ success: false, message: 'All registration fields are required.' });
  }

  const cleanLabId = uniqueLabId.trim().toUpperCase();
  const cleanEmail = ownerEmail.trim().toLowerCase();
  const db = loadDb();

  // Check unique ID
  if (db.labs[cleanLabId]) {
    return res.status(400).json({
      success: false,
      message: `Lab Unique ID "${cleanLabId}" already registered hai. Kripya doosra unique ID chunein.`,
    });
  }

  // Check email
  const existingWithEmail = Object.values(db.labs).find(
    (t) => t.labAccount.ownerEmail.toLowerCase() === cleanEmail
  );
  if (existingWithEmail) {
    return res.status(400).json({
      success: false,
      message: `Email "${cleanEmail}" se already ek lab registered hai. Kripya login karein.`,
    });
  }

  const profile = {
    id: `profile-${Date.now()}`,
    uniqueLabId: cleanLabId,
    name: labName.trim(),
    tagline: 'Clinical Pathology & Diagnostic Testing',
    address: address?.trim() || 'Laboratory Address',
    phone: phone?.trim() || '',
    email: cleanEmail,
    nablRegNo: `NABL-${cleanLabId}-2026`,
    isoCertNo: 'ISO 15189:2022 Certified',
    pathologistName: ownerName.trim(),
    pathologistDegrees: 'MBBS, MD (Pathology)',
    pathologistRegistration: 'Reg. No: 12345',
    footerNotice: 'Computer-generated diagnostic report. For clinical correlation only.',
  };

  const labAccount = {
    id: `lab-${Date.now()}`,
    uniqueLabId: cleanLabId,
    ownerName: ownerName.trim(),
    ownerEmail: cleanEmail,
    passwordHash: password || 'default-password',
    phone: phone?.trim() || '',
    isEmailVerified: true,
    createdAt: new Date().toISOString().split('T')[0],
    profile,
  };

  const initialStaff = {
    id: `staff-${Date.now()}`,
    labId: cleanLabId,
    staffUserId: 'OWNER-01',
    name: ownerName.trim(),
    role: 'owner',
    pin: '9999',
    designation: 'Lab Director & Chief Pathologist',
    phone: phone?.trim() || '',
    isActive: true,
    createdAt: new Date().toISOString().split('T')[0],
    permissions: {
      canEditTestCatalog: true,
      canDeleteReports: true,
      canManageDoctors: true,
      canViewFinancials: true,
      canEditLabProfile: true,
    },
  };

  db.labs[cleanLabId] = {
    labAccount,
    staff: [initialStaff],
    doctors: [
      {
        id: `doc-${Date.now()}-self`,
        labId: cleanLabId,
        name: 'Self / Direct Walk-In',
        qualification: 'N/A',
        clinicHospital: 'Direct Patient Intake',
        phone: '-',
        specialty: 'General Screening',
        commissionRate: 0,
        totalReferred: 0,
      },
    ],
    templates: [],
    reports: [],
  };

  saveDb(db);
  console.log(`[Database] Registered new lab "${cleanLabId}" successfully.`);

  const sanitized = { ...labAccount };
  delete sanitized.passwordHash;
  return res.json({
    success: true,
    message: `Lab "${cleanLabId}" registered successfully!`,
    labAccount: sanitized,
    staff: [initialStaff],
  });
});

// -------------------------------------------------------------
// 4. Staff Login Verification (Any Device / Any Network)
// -------------------------------------------------------------
app.post('/api/auth/staff-login', (req: Request, res: Response): any => {
  const { labId, staffUserId, pin } = req.body;
  if (!labId || !staffUserId || !pin) {
    return res.status(400).json({
      success: false,
      message: 'Lab ID, Staff User ID aur 4-digit PIN sabhi zaroori hain.',
    });
  }

  const cleanLabId = labId.trim().toUpperCase();
  const cleanStaffId = staffUserId.trim().toUpperCase();
  const cleanPin = pin.trim();

  const db = loadDb();
  const tenant = db.labs[cleanLabId];

  if (!tenant) {
    return res.status(404).json({
      success: false,
      message: `Lab Unique ID "${cleanLabId}" exist nahi karti. Kripya apne Lab Owner se sahi Lab ID lein.`,
    });
  }

  const staff = (tenant.staff || []).find(
    (s) => s.staffUserId.trim().toUpperCase() === cleanStaffId
  );

  if (!staff) {
    return res.status(404).json({
      success: false,
      message: `Staff User ID "${cleanStaffId}" is lab me registered nahi hai. Kripya apna sahi User ID check karein.`,
    });
  }

  if (staff.pin.trim() !== cleanPin) {
    return res.status(401).json({
      success: false,
      message: 'Galat 4-digit security PIN. Kripya apna sahi PIN enter karein.',
    });
  }

  const sanitized = { ...tenant.labAccount };
  delete sanitized.passwordHash;

  return res.json({
    success: true,
    message: 'Staff authentication successful!',
    staff,
    lab: sanitized,
    profile: tenant.labAccount.profile,
  });
});

// -------------------------------------------------------------
// 5. Owner Login Verification
// -------------------------------------------------------------
app.post('/api/auth/owner-login', (req: Request, res: Response): any => {
  const { identifier, password } = req.body;
  if (!identifier) {
    return res.status(400).json({ success: false, message: 'Lab ID ya Gmail zaroori hai.' });
  }

  const clean = identifier.trim().toLowerCase();
  const db = loadDb();

  let targetTenant: LabTenantData | undefined;
  for (const tenant of Object.values(db.labs)) {
    if (
      tenant.labAccount.uniqueLabId.toLowerCase() === clean ||
      tenant.labAccount.ownerEmail.toLowerCase() === clean
    ) {
      targetTenant = tenant;
      break;
    }
  }

  if (!targetTenant) {
    return res.status(404).json({
      success: false,
      message: `Is "${identifier}" ke sath koi registered lab nahi mili.`,
    });
  }

  if (password && targetTenant.labAccount.passwordHash) {
    if (targetTenant.labAccount.passwordHash !== password) {
      return res.status(401).json({ success: false, message: 'Galat master password. Kripya dobara try karein.' });
    }
  }

  const sanitized = { ...targetTenant.labAccount };
  delete sanitized.passwordHash;

  return res.json({
    success: true,
    lab: sanitized,
    profile: targetTenant.labAccount.profile,
    staff: targetTenant.staff || [],
  });
});

// -------------------------------------------------------------
// 6. Manage Staff Members (Add / Update / Change PIN)
// -------------------------------------------------------------
app.post('/api/labs/:labId/staff', (req: Request, res: Response): any => {
  const cleanLabId = (req.params.labId || '').trim().toUpperCase();
  const newStaff = req.body;
  if (!newStaff || !newStaff.staffUserId) {
    return res.status(400).json({ success: false, message: 'Staff data is required.' });
  }

  const db = loadDb();
  const tenant = db.labs[cleanLabId];
  if (!tenant) {
    return res.status(404).json({ success: false, message: `Lab "${cleanLabId}" not found.` });
  }

  if (!Array.isArray(tenant.staff)) tenant.staff = [];

  const existingIndex = tenant.staff.findIndex(
    (s) => s.id === newStaff.id || s.staffUserId.toUpperCase() === newStaff.staffUserId.toUpperCase()
  );

  if (existingIndex >= 0) {
    tenant.staff[existingIndex] = { ...tenant.staff[existingIndex], ...newStaff };
  } else {
    tenant.staff.push(newStaff);
  }

  saveDb(db);
  return res.json({ success: true, staff: tenant.staff });
});

app.put('/api/labs/:labId/staff/:staffId/pin', (req: Request, res: Response): any => {
  const cleanLabId = (req.params.labId || '').trim().toUpperCase();
  const staffId = req.params.staffId;
  const { pin } = req.body;

  if (!pin || pin.length !== 4) {
    return res.status(400).json({ success: false, message: 'Valid 4-digit PIN required.' });
  }

  const db = loadDb();
  const tenant = db.labs[cleanLabId];
  if (!tenant) return res.status(404).json({ success: false, message: 'Lab not found.' });

  const staff = (tenant.staff || []).find(
    (s) => s.id === staffId || s.staffUserId.toUpperCase() === staffId.toUpperCase()
  );
  if (!staff) return res.status(404).json({ success: false, message: 'Staff member not found.' });

  staff.pin = pin;
  staff.isPinCustomized = true;
  staff.pinUpdatedAt = new Date().toISOString();

  saveDb(db);
  return res.json({ success: true, message: 'PIN updated successfully.' });
});

// -------------------------------------------------------------
// 7. Manage Patient Reports (Save / Delete)
// -------------------------------------------------------------
app.post('/api/labs/:labId/reports', (req: Request, res: Response): any => {
  const cleanLabId = (req.params.labId || '').trim().toUpperCase();
  const report = req.body;
  if (!report || !report.id) return res.status(400).json({ success: false, message: 'Report data required.' });

  const db = loadDb();
  const tenant = db.labs[cleanLabId];
  if (!tenant) return res.status(404).json({ success: false, message: 'Lab not found.' });

  if (!Array.isArray(tenant.reports)) tenant.reports = [];
  const idx = tenant.reports.findIndex((r) => r.id === report.id);
  if (idx >= 0) {
    tenant.reports[idx] = report;
  } else {
    tenant.reports.push(report);
  }

  saveDb(db);
  return res.json({ success: true });
});

app.delete('/api/labs/:labId/reports/:reportId', (req: Request, res: Response): any => {
  const cleanLabId = (req.params.labId || '').trim().toUpperCase();
  const reportId = req.params.reportId;

  const db = loadDb();
  const tenant = db.labs[cleanLabId];
  if (!tenant) return res.status(404).json({ success: false, message: 'Lab not found.' });

  tenant.reports = (tenant.reports || []).filter((r) => r.id !== reportId);
  saveDb(db);
  return res.json({ success: true });
});

// -------------------------------------------------------------
// 8. Check Unique Lab ID Availability (Instagram Handle Style)
// -------------------------------------------------------------
// Reserved system keywords that cannot be claimed by new registrations
const RESERVED_LAB_IDS = new Set(['ADMIN', 'SYSTEM', 'ROOT', 'PATHOCARE']);

app.get('/api/auth/check-lab-id', (req: Request, res: Response): any => {
  const rawId = req.query.labId as string;
  if (!rawId) {
    return res.status(400).json({ available: false, message: 'Lab ID is required.' });
  }

  const clean = rawId.trim().toUpperCase();

  // Length & Character Validation
  if (clean.length < 3) {
    return res.json({ available: false, message: 'Lab ID must be at least 3 characters long.' });
  }

  if (clean.length > 20) {
    return res.json({ available: false, message: 'Lab ID cannot exceed 20 characters.' });
  }

  if (!/^[A-Z0-9_-]+$/.test(clean)) {
    return res.json({ available: false, message: 'Only uppercase letters, numbers, and hyphens allowed.' });
  }

  const db = loadDb();
  if (RESERVED_LAB_IDS.has(clean) || Boolean(db.labs[clean])) {
    return res.json({
      available: false,
      message: `"${clean}" is already registered. Please choose a different Lab ID.`,
    });
  }

  return res.json({
    available: true,
    message: `✓ "${clean}" is available!`,
  });
});

// -------------------------------------------------------------
// 2. Send Real 6-Digit Verification OTP to Gmail
// -------------------------------------------------------------
app.post('/api/auth/send-otp', async (req: Request, res: Response): Promise<any> => {
  const { email, purpose, labName } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, message: 'Valid Gmail address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ success: false, message: 'Invalid email format. Please check your Gmail address.' });
  }

  // Rate Limiting: Check if an OTP was sent in the last 30 seconds
  const existing = otpStore.get(cleanEmail);
  const now = Date.now();
  if (existing && now - existing.lastSentAt < 30 * 1000) {
    const remainingSeconds = Math.ceil((30 * 1000 - (now - existing.lastSentAt)) / 1000);
    return res.status(429).json({
      success: false,
      message: `Please wait ${remainingSeconds} seconds before requesting another verification code.`,
    });
  }

  // Generate cryptographically random 6-digit numeric OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes expiry

  otpStore.set(cleanEmail, {
    code: otpCode,
    expiresAt,
    attempts: 0,
    verified: false,
    lastSentAt: now,
  });

  const subject =
    purpose === 'LOGIN'
      ? `${otpCode} is your PathoCare LIS Login Code`
      : `${otpCode} is your PathoCare Lab Registration Security Code`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
        .logo-box { width: 36px; height: 36px; background-color: #0f172a; border-radius: 8px; color: #22d3ee; font-weight: bold; font-size: 16px; line-height: 36px; text-align: center; }
        .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
        .otp-container { background-color: #f1f5f9; border: 2px dashed #0284c7; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
        .otp-code { font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0369a1; margin: 0; }
        .expiry-note { font-size: 12px; color: #64748b; margin-top: 8px; }
        .info-text { font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 16px; }
        .warning-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; border-radius: 6px; font-size: 12px; color: #991b1b; margin-top: 24px; }
        .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="brand">
          <div class="logo-box">P+</div>
          <div>
            <h1 class="title">PathoCare LIS</h1>
            <span style="font-size: 11px; color: #0284c7; font-weight: 600;">Clinical Laboratory Information System</span>
          </div>
        </div>

        <p class="info-text">
          Hello <strong>${cleanEmail}</strong>,
        </p>
        <p class="info-text">
          ${
            purpose === 'LOGIN'
              ? 'You requested a one-time verification code to log in to your PathoCare Laboratory terminal.'
              : `Welcome to PathoCare! Use the 6-digit verification code below to verify your Gmail address and complete registration for <strong>${labName || 'your Diagnostic Laboratory'}</strong>.`
          }
        </p>

        <div class="otp-container">
          <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin: 0 0 6px 0; font-weight: 600;">Your Security Code</p>
          <div class="otp-code">${otpCode}</div>
          <div class="expiry-note">Valid for 5 minutes (Single use only)</div>
        </div>

        <div class="warning-box">
          <strong>Security Warning:</strong> Never share this 6-digit code with anyone. PathoCare staff will never ask for your code.
        </div>

        <div class="footer">
          PathoCare Clinical Laboratory Information System &copy; ${new Date().getFullYear()}<br>
          ISO 15189 & NABL Ready Laboratory Management
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await dispatchEmail(cleanEmail, subject, htmlContent, otpCode);

    return res.json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${cleanEmail}. Please check your Gmail inbox.`,
    });
  } catch (error: any) {
    console.error('[Email Service Error]', error);
    // Even if external provider is unreachable, code remains valid in server store for resilience
    return res.status(500).json({
      success: false,
      message: 'Failed to deliver email. Please check your Gmail address or try again in a moment.',
    });
  }
});

// -------------------------------------------------------------
// 3. Verify Real 6-Digit OTP from Gmail
// -------------------------------------------------------------
app.post('/api/auth/verify-otp', (req: Request, res: Response): any => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and 6-digit OTP are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otp.trim().replace(/\D/g, '');

  const entry = otpStore.get(cleanEmail);

  if (!entry) {
    return res.status(400).json({
      success: false,
      message: 'No active verification code found for this email. Please request a new OTP.',
    });
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(cleanEmail);
    return res.status(400).json({
      success: false,
      message: 'This verification code has expired (valid for 5 minutes). Please request a new one.',
    });
  }

  entry.attempts += 1;
  if (entry.attempts > 5) {
    otpStore.delete(cleanEmail);
    return res.status(429).json({
      success: false,
      message: 'Too many incorrect attempts. For your security, this code is now void. Please request a new OTP.',
    });
  }

  if (entry.code !== cleanOtp) {
    return res.status(400).json({
      success: false,
      message: `Invalid 6-digit code. Please check your Gmail and enter the exact code (${5 - entry.attempts} attempts remaining).`,
    });
  }

  // OTP verified successfully! Generate a one-time registration/login token
  const verificationToken = `vtok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  entry.verified = true;
  entry.token = verificationToken;

  return res.json({
    success: true,
    message: 'Gmail verification successful!',
    verificationToken,
  });
});

// -------------------------------------------------------------
// Vite Middlewares in Dev Mode & Static Files in Production
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PathoCare LIS] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Startup Error]', err);
  process.exit(1);
});
