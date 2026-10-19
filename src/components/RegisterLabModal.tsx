import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthApiService } from '../services/authApi';
import {
  Building2,
  Mail,
  Lock,
  User,
  Phone,
  CheckCircle2,
  Shield,
  X,
  ArrowRight,
  KeyRound,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

interface RegisterLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RegisterLabModal: React.FC<RegisterLabModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { registerNewLab } = useAuth();

  // 3-Stage Pipeline: 'details' -> 'otp' -> 'password'
  const [step, setStep] = useState<'details' | 'otp' | 'password'>('details');

  // Form State
  const [labName, setLabName] = useState('');
  const [uniqueLabId, setUniqueLabId] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Password Setup State (Step 3)
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Live Availability Check State (Instagram Handle Style)
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  }>({ checking: false });

  // 6-Digit OTP State
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Debounced Handle Availability Check
  useEffect(() => {
    const cleanId = uniqueLabId.trim().toUpperCase();
    if (!cleanId || cleanId.length < 3) {
      setAvailabilityStatus({ checking: false });
      return;
    }

    setAvailabilityStatus({ checking: true });
    const timer = setTimeout(async () => {
      const res = await AuthApiService.checkLabIdAvailability(cleanId);
      setAvailabilityStatus({
        checking: false,
        available: res.available,
        message: res.message,
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [uniqueLabId]);

  // Resend Countdown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Auto-generate suggested Lab ID when user types Lab Name (if not manually entered)
  const handleLabNameChange = (val: string) => {
    setLabName(val);
    if (!uniqueLabId || uniqueLabId.startsWith('LAB')) {
      const cleanWords = val.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/);
      const initials = cleanWords
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 4);
      const randomNum = Math.floor(100 + Math.random() * 900);
      setUniqueLabId(initials && initials.length >= 2 ? `${initials}${randomNum}` : `LAB${randomNum}`);
    }
  };

  // -------------------------------------------------------------
  // STEP 1: Submit Details & Dispatch Real Gmail OTP
  // -------------------------------------------------------------
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanId = uniqueLabId.trim().toUpperCase();
    if (cleanId.length < 3) {
      setErrorMessage('Lab ID kam se kam 3 characters ka hona chahiye.');
      return;
    }

    if (availabilityStatus.available === false) {
      setErrorMessage(`Lab ID "${cleanId}" already registered hai. Kripya dusra unique ID chunein.`);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(ownerEmail.trim())) {
      setErrorMessage('Kripya valid Gmail address enter karein.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await AuthApiService.sendOtpToGmail(ownerEmail.trim(), 'REGISTER', labName.trim());
      if (res.success) {
        setStep('otp');
        setResendCooldown(30);
        setSuccessNotice(res.message);
      } else {
        setErrorMessage(res.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // STEP 2: Verify Real 6-Digit OTP from Gmail
  // -------------------------------------------------------------
  const handleOtpChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = char;
    setOtpDigits(updated);

    // Auto advance focus
    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const arr = pasted.split('');
      setOtpDigits(arr);
      otpInputRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const fullCode = otpDigits.join('');
    if (fullCode.length !== 6) {
      setErrorMessage('Kripya pura 6-digit verification code enter karein jo aapke Gmail par bheja gaya hai.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await AuthApiService.verifyOtp(ownerEmail.trim(), fullCode);
      if (res.success) {
        setVerificationToken(res.verificationToken || 'verified');
        setStep('password');
        setSuccessNotice('Gmail verify ho gaya! Ab apna master password set karein.');
      } else {
        setErrorMessage(res.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setErrorMessage(null);
    setSuccessNotice(null);
    setIsLoading(true);
    try {
      const res = await AuthApiService.sendOtpToGmail(ownerEmail.trim(), 'REGISTER', labName.trim());
      if (res.success) {
        setResendCooldown(30);
        setSuccessNotice(`Naya OTP code ${ownerEmail} par send kar diya gaya hai.`);
        setOtpDigits(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
      } else {
        setErrorMessage(res.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // STEP 3: Password Creation & Final Registration
  // -------------------------------------------------------------
  const handleFinalRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage('Password kam se kam 6 characters ka hona chahiye.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Password aur Confirm Password match nahi kar rahe.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerNewLab({
        labName: labName.trim(),
        uniqueLabId: uniqueLabId.trim().toUpperCase(),
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        password,
        phone: phone.trim(),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.message || 'Lab registration failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading">Register New Diagnostic Laboratory</h2>
              <p className="text-xs text-cyan-200 mt-0.5">
                Multi-Tenant Cloud LIS · Instagram-Style Security & Verification
              </p>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t border-slate-700/60 text-xs">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  step === 'details'
                    ? 'bg-cyan-400 text-slate-900 ring-2 ring-cyan-300'
                    : 'bg-emerald-500 text-white'
                }`}
              >
                {step === 'details' ? '1' : '✓'}
              </span>
              <span className={step === 'details' ? 'font-semibold text-white' : 'text-slate-400'}>
                Lab Details
              </span>
            </div>

            <div className="h-0.5 flex-1 bg-slate-700" />

            <div className="flex items-center gap-1.5">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  step === 'otp'
                    ? 'bg-cyan-400 text-slate-900 ring-2 ring-cyan-300'
                    : step === 'password'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {step === 'password' ? '✓' : '2'}
              </span>
              <span className={step === 'otp' ? 'font-semibold text-white' : 'text-slate-400'}>
                Gmail OTP
              </span>
            </div>

            <div className="h-0.5 flex-1 bg-slate-700" />

            <div className="flex items-center gap-1.5">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  step === 'password'
                    ? 'bg-cyan-400 text-slate-900 ring-2 ring-cyan-300'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                3
              </span>
              <span className={step === 'password' ? 'font-semibold text-white' : 'text-slate-400'}>
                Set Password
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 1: Basic Lab Details & Unique Handle Availability        */}
          {/* ------------------------------------------------------------- */}
          {step === 'details' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Laboratory / Diagnostic Center Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={labName}
                    onChange={(e) => handleLabNameChange(e.target.value)}
                    placeholder="e.g. City Life Diagnostic Pathology Center"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 font-medium"
                  />
                </div>
              </div>

              {/* Instagram-Style Unique Lab ID / Handle Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Unique Lab ID / Handle (User ID) *
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Used for all Admin & Staff logins
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-3 font-mono font-bold text-slate-400 text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    value={uniqueLabId}
                    onChange={(e) =>
                      setUniqueLabId(
                        e.target.value
                          .replace(/[^a-zA-Z0-9_-]/g, '')
                          .toUpperCase()
                          .slice(0, 20)
                      )
                    }
                    placeholder="e.g. CITYLAB786"
                    className={`w-full pl-8 pr-10 py-2.5 text-sm font-mono font-bold border rounded-xl focus:ring-2 focus:outline-none uppercase ${
                      availabilityStatus.available === true
                        ? 'border-emerald-500 focus:ring-emerald-500 bg-emerald-50/30 text-emerald-950'
                        : availabilityStatus.available === false
                        ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30 text-rose-950'
                        : 'border-slate-300 focus:ring-cyan-500 text-slate-900'
                    }`}
                  />
                  <div className="absolute right-3 top-3">
                    {availabilityStatus.checking ? (
                      <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    ) : availabilityStatus.available === true ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : availabilityStatus.available === false ? (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    ) : null}
                  </div>
                </div>

                {/* Live Availability Feedback Message */}
                {availabilityStatus.message && (
                  <p
                    className={`text-[11px] mt-1 font-medium ${
                      availabilityStatus.available === true ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {availabilityStatus.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lab Director / Owner Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Dr. Rajesh Sharma, MD"
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gmail / Email Address (OTP will be sent here) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="e.g. labdirector@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 font-medium"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Real security: Ek 6-digit verification code aapke is Gmail address par send hoga.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || availabilityStatus.available === false}
                  className="w-full py-3 bg-cyan-700 hover:bg-cyan-800 disabled:bg-slate-300 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending OTP to Gmail...</span>
                    </>
                  ) : (
                    <>
                      <span>Send 6-Digit Verification Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 2: Enter Real 6-Digit Gmail OTP Code                    */}
          {/* ------------------------------------------------------------- */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center mx-auto mb-2 border border-cyan-200">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Check your Gmail Inbox
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Humne 6-digit security code <strong>{ownerEmail}</strong> par send kar diya hai.
                </p>

                <div className="bg-amber-50 border border-amber-200/80 text-amber-900 rounded-xl p-2.5 text-xs text-left flex items-start gap-2 mt-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-amber-900 text-[11px]">Primary Inbox me nahi dikh raha?</p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Resend test domain (<code>onboarding@resend.dev</code>) hone ki wajah se Gmail isse <strong>Spam</strong> ya <strong>Promotions</strong> folder me daal deta hai. Kripya apna <strong>Spam Folder</strong> zaroor check karein.
                    </p>
                  </div>
                </div>
              </div>

              {/* 6 Individual Digit Inputs */}
              <div>
                <label className="block text-center text-xs font-semibold text-slate-700 mb-2">
                  Enter 6-Digit Verification Code
                </label>
                <div className="flex justify-center items-center gap-2 sm:gap-3">
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
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono border-2 border-slate-300 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20 rounded-xl bg-slate-50 focus:bg-white transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* Countdown & Resend Option */}
              <div className="flex items-center justify-between text-xs pt-1 px-1">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  ← Change Email
                </button>

                <div className="flex items-center gap-1">
                  {resendCooldown > 0 ? (
                    <span className="text-slate-400 font-mono">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="text-cyan-700 hover:text-cyan-900 font-semibold cursor-pointer inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Resend OTP</span>
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || otpDigits.join('').length !== 6}
                className="w-full py-3 bg-cyan-700 hover:bg-cyan-800 disabled:bg-slate-300 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify Code & Continue</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ------------------------------------------------------------- */}
          {/* STEP 3: Create Master Password & Finalize Account             */}
          {/* ------------------------------------------------------------- */}
          {step === 'password' && (
            <form onSubmit={handleFinalRegistration} className="space-y-4">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Gmail verified: <strong>{ownerEmail}</strong>. Ab apna secure login password create karein.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Create Master Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 font-medium"
                  />
                </div>
              </div>

              {/* Account Summary Confirmation Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Registered Lab ID:</span>
                  <strong className="font-mono text-slate-900 font-bold">@{uniqueLabId}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Lab Name:</span>
                  <span className="font-semibold text-slate-900 truncate max-w-[200px]">{labName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Director / Owner:</span>
                  <span className="font-medium text-slate-900">{ownerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Role:</span>
                  <span className="text-emerald-700 font-semibold">Super Admin (Full Access)</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account in Cloud...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Complete Registration & Open Lab</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
