import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthApiService } from '../services/authApi';
import { StorageService } from '../services/storage';
import { FirestoreService } from '../services/firestoreService';
import { ApiSyncService } from '../services/apiSync';
import {
  Shield,
  Lock,
  KeyRound,
  AlertCircle,
  Building2,
  Mail,
  ArrowRight,
  LogIn,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  User,
  Users,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegister: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onOpenRegister,
}) => {
  const {
    loginAsOwner,
    loginAsOwnerWithOtp,
    loginAsStaff,
    loginWithGoogle,
    activeLabId,
  } = useAuth();

  // Role Level: 'owner' (Admin/User) vs 'staff' (Subordinate Staff)
  const [roleMode, setRoleMode] = useState<'owner' | 'staff'>('owner');

  // Owner Authentication Method: 'password' vs 'otp'
  const [ownerAuthMethod, setOwnerAuthMethod] = useState<'password' | 'otp'>('password');

  // Owner Password Form State
  const [ownerIdentifier, setOwnerIdentifier] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Owner OTP Form State
  const [ownerOtpIdentifier, setOwnerOtpIdentifier] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [targetEmail, setTargetEmail] = useState('');

  // Staff Login State (Strictly 3 Fields: Lab ID + Staff User ID + 4-digit PIN)
  const [staffLabId, setStaffLabId] = useState(activeLabId || '');
  const [staffUserId, setStaffUserId] = useState('');
  const [staffPin, setStaffPin] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend Countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // Owner Password Login
  // -------------------------------------------------------------
  const handleOwnerPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const res = await loginAsOwner(ownerIdentifier.trim(), ownerPassword.trim());
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Owner OTP Login: Step 1 (Send Code to Gmail after verifying account exists in DB)
  // -------------------------------------------------------------
  const handleSendOwnerOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanIdentifier = ownerOtpIdentifier.trim();
    if (!cleanIdentifier) {
      setErrorMessage('Kripya apna registered Lab ID ya Gmail address enter karein.');
      return;
    }

    setIsLoading(true);
    try {
      const isEmail = cleanIdentifier.includes('@');

      // 1. Check in local storage database
      let lab = isEmail
        ? StorageService.findLabByEmail(cleanIdentifier)
        : StorageService.findLabByUniqueId(cleanIdentifier);

      // 2. Cross-device check in server database if not found locally
      if (!lab) {
        const serverLabs = await ApiSyncService.syncAllLabs();
        lab = isEmail
          ? serverLabs.find((l) => l.ownerEmail.toLowerCase() === cleanIdentifier.toLowerCase())
          : serverLabs.find((l) => l.uniqueLabId.toUpperCase() === cleanIdentifier.toUpperCase());
      }

      // 3. Fallback check in Firestore
      if (!lab) {
        if (!isEmail) {
          lab = (await FirestoreService.getLabAccount(cleanIdentifier.toUpperCase())) || undefined;
        }
        if (!lab) {
          const allLabs = await FirestoreService.getAllLabs();
          lab = allLabs.find(
            (l) =>
              l.ownerEmail.toLowerCase() === cleanIdentifier.toLowerCase() ||
              l.uniqueLabId.toUpperCase() === cleanIdentifier.toUpperCase()
          );
        }
      }

      // If account does NOT exist in the database, prevent sending OTP!
      if (!lab) {
        setErrorMessage(
          `Is ${isEmail ? 'Gmail' : 'Lab ID'} ("${cleanIdentifier}") se koi registered account nahi mila. Kripya pehle "Register New Lab" par click karke naya account banayein.`
        );
        return;
      }

      // Account verified! Send real 6-digit OTP to the registered owner's Gmail
      const recipientEmail = lab.ownerEmail;
      const res = await AuthApiService.sendOtpToGmail(recipientEmail, 'LOGIN', lab.profile?.name);
      if (res.success) {
        setOtpSent(true);
        setTargetEmail(recipientEmail);
        setResendCooldown(30);
        setSuccessMessage(`6-Digit security code aapke registered Gmail (${recipientEmail}) par bhej diya gaya hai.`);
      } else {
        setErrorMessage(res.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Owner OTP Login: Step 2 (Verify Code & Complete Login)
  // -------------------------------------------------------------
  const handleOwnerOtpDigitChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = char;
    setOtpDigits(updated);

    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOwnerOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOwnerOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(''));
      otpInputRefs.current[5]?.focus();
    }
  };

  const handleOwnerOtpLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Kripya Gmail par aaya hua pura 6-digit code enter karein.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginAsOwnerWithOtp(targetEmail, fullOtp);
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.message || 'OTP verification failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Staff 3-Field Login (Lab ID + Staff ID + 4-Digit PIN)
  // -------------------------------------------------------------
  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const res = await loginAsStaff(staffLabId.trim(), staffUserId.trim(), staffPin.trim());
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.message || 'Staff login failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth Login
  const handleGoogleSubmit = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.message || 'Google sign-in fail hua.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center font-bold text-sm">
                P+
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-white">
                  PathoCare Terminal Login
                </h3>
                <p className="text-[11px] text-cyan-200">
                  Select your role to access your laboratory workspace
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Primary Role Switcher: Admin/User vs Staff */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-800/80 rounded-xl mt-4 border border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setRoleMode('owner');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                roleMode === 'owner'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Lab Owner / Admin</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRoleMode('staff');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                roleMode === 'staff'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Staff Terminal</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* A. LAB OWNER / ADMIN LOGIN (User = Admin)                     */}
          {/* ------------------------------------------------------------- */}
          {roleMode === 'owner' && (
            <div className="space-y-4">
              {/* Dual Subtabs: Password vs OTP */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setOwnerAuthMethod('password');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`flex-1 pb-2.5 text-xs font-bold border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    ownerAuthMethod === 'password'
                      ? 'border-cyan-600 text-cyan-700'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Login with Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOwnerAuthMethod('otp');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`flex-1 pb-2.5 text-xs font-bold border-b-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    ownerAuthMethod === 'otp'
                      ? 'border-cyan-600 text-cyan-700'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Login with Gmail OTP</span>
                </button>
              </div>

              {/* Subtab 1: Password Login Form */}
              {ownerAuthMethod === 'password' && (
                <form onSubmit={handleOwnerPasswordSubmit} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lab ID or Registered Gmail *
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={ownerIdentifier}
                        onChange={(e) => setOwnerIdentifier(e.target.value)}
                        placeholder="e.g. CITYLAB101 or director@gmail.com"
                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Master Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                        <span>Verifying credentials...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 text-cyan-400" />
                        <span>Login as Lab Director</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Subtab 2: OTP Login Form (Real Gmail) */}
              {ownerAuthMethod === 'otp' && (
                <div className="space-y-4 pt-1">
                  {!otpSent ? (
                    <form onSubmit={handleSendOwnerOtp} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Lab ID or Registered Gmail Address *
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={ownerOtpIdentifier}
                            onChange={(e) => setOwnerOtpIdentifier(e.target.value)}
                            placeholder="Enter your registered Lab ID or Gmail..."
                            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 font-medium"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Aapke registered Gmail par turant real 6-digit login code bheja jayega.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-cyan-700 hover:bg-cyan-800 disabled:bg-slate-400 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sending code to Gmail...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4" />
                            <span>Send 6-Digit OTP to Gmail</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleOwnerOtpLoginSubmit} className="space-y-4">
                      <div className="text-center space-y-2">
                        <p className="text-xs text-slate-600">
                          Gmail par bheja gaya 6-digit code enter karein:
                        </p>
                        <strong className="text-xs text-slate-900 font-semibold block">{targetEmail}</strong>

                        <div className="bg-amber-50 border border-amber-200/80 text-amber-900 rounded-xl p-2.5 text-xs text-left flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="font-semibold text-amber-900 text-[11px]">Primary Inbox me nahi dikha?</p>
                            <p className="text-[11px] text-amber-800 leading-relaxed">
                              Kripya Gmail ka <strong>Spam</strong> ya <strong>Promotions</strong> folder check karein (Sender: <code>onboarding@resend.dev</code>).
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center items-center gap-2">
                        {otpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => {
                              otpInputRefs.current[idx] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOwnerOtpDigitChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOwnerOtpKeyDown(idx, e)}
                            onPaste={handleOwnerOtpPaste}
                            className="w-10 h-12 text-center text-lg font-bold font-mono border-2 border-slate-300 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20 rounded-xl bg-slate-50 focus:bg-white"
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs px-1">
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
                        >
                          ← Change Email/ID
                        </button>

                        {resendCooldown > 0 ? (
                          <span className="text-slate-400 font-mono">
                            Resend in {resendCooldown}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendOwnerOtp}
                            disabled={isLoading}
                            className="text-cyan-700 font-semibold cursor-pointer inline-flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Resend Code</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || otpDigits.join('').length !== 6}
                        className="w-full py-3 bg-cyan-700 hover:bg-cyan-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verifying & Logging in...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Verify Code & Open Dashboard</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Google Sign-In Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400 font-medium">Or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSubmit}
                disabled={isLoading}
                className="w-full py-2.5 px-4 border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Sign in with Google Account</span>
              </button>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* B. STAFF TERMINAL LOGIN (Staff < Admin/User)                  */}
          {/* ------------------------------------------------------------- */}
          {roleMode === 'staff' && (
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div className="bg-cyan-50/80 border border-cyan-200/80 rounded-xl p-3 text-xs text-cyan-900 leading-relaxed">
                <strong>Staff Terminal:</strong> Staff login ke liye apne parent Lab ka ID, apna Staff ID, aur 4-digit PIN enter karein.
              </div>

              {/* Field 1: Lab Unique ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Laboratory Unique ID *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={staffLabId}
                    onChange={(e) => setStaffLabId(e.target.value.toUpperCase())}
                    placeholder="e.g. LARI786 or CITYLAB101"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 font-mono font-bold uppercase"
                  />
                </div>
              </div>

              {/* Field 2: Staff User ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. Staff User ID *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={staffUserId}
                    onChange={(e) => setStaffUserId(e.target.value.toUpperCase())}
                    placeholder="e.g. TECH-01 or AFTB03"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 font-mono font-bold uppercase"
                  />
                </div>
              </div>

              {/* Field 3: 4-Digit Security PIN */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3. Secret 4-Digit Security PIN *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    value={staffPin}
                    onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 font-mono font-extrabold tracking-widest text-base"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Staff apna secret PIN login ke baad profile menu se change kar sakta hai.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-cyan-700 hover:bg-cyan-800 disabled:bg-slate-400 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Staff Credentials...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-cyan-300" />
                    <span>Login to Staff Terminal</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Registration Callout */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              New diagnostic center or pathology clinic?{' '}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRegister();
                }}
                className="text-cyan-700 hover:text-cyan-900 font-bold underline cursor-pointer"
              >
                Register New Lab
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
