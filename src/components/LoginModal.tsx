import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StorageService } from '../services/storage';
import { Shield, Lock, KeyRound, AlertCircle, Building2, UserCheck, Sparkles } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { loginWithGoogle, loginWithLabCredentials, labProfile, refreshLabProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'google' | 'pin'>('pin'); // Default to PIN tab since user is testing staff login

  // Live updated lab profile from storage
  const [currentLab, setCurrentLab] = useState(labProfile);
  const [registeredStaff, setRegisteredStaff] = useState(() => StorageService.getStaffMembers());

  // Google login state
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  // PIN login state
  const [labId, setLabId] = useState('');
  const [staffUserId, setStaffUserId] = useState('');
  const [pin, setPin] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      refreshLabProfile();
      const latestLab = StorageService.getLabProfile();
      const latestStaff = StorageService.getStaffMembers();
      setCurrentLab(latestLab);
      setRegisteredStaff(latestStaff);
      setLabId(latestLab.uniqueLabId); // Automatically pre-fill the correct registered Lab ID!
      setGoogleEmail(latestLab.email || 'owner@lab.com');
      setGoogleName(latestLab.pathologistName || 'Lab Owner');

      // Pre-fill first non-owner staff if available
      const firstStaff = latestStaff.find((s) => s.role === 'staff' && s.isActive);
      if (firstStaff) {
        setStaffUserId(firstStaff.staffUserId);
        setPin(firstStaff.pin);
      } else {
        setStaffUserId('TECH-01');
        setPin('1234');
      }
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await loginWithGoogle(googleEmail, googleName);
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.message || 'Google Login fail hua.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await loginWithLabCredentials(labId, staffUserId, pin);
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.message || 'Login fail hua.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="text-xs uppercase tracking-wider font-semibold text-cyan-300">
              PathoCare Authentication
            </span>
          </div>
          <h2 className="text-xl font-bold font-heading">{currentLab.name}</h2>
          <p className="text-xs text-slate-400 mt-1">
            Registered Lab Unique ID:{' '}
            <button
              type="button"
              onClick={() => setLabId(currentLab.uniqueLabId)}
              className="font-mono text-cyan-300 font-bold bg-slate-800 px-2 py-0.5 rounded hover:bg-slate-700 cursor-pointer"
              title="Click to insert this Lab ID"
            >
              {currentLab.uniqueLabId}
            </button>
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              setActiveTab('pin');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 px-4 text-xs font-semibold text-center border-b-2 transition-colors cursor-pointer ${
              activeTab === 'pin'
                ? 'border-cyan-600 text-cyan-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Option 2: Staff ID & PIN
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('google');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 px-4 text-xs font-semibold text-center border-b-2 transition-colors cursor-pointer ${
              activeTab === 'google'
                ? 'border-cyan-600 text-cyan-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Option 1: Google Account (Owner)
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'pin' ? (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 leading-relaxed">
                <strong>Staff Terminal Login:</strong> Technicians aur staff members apne Lab Unique ID (<strong>{currentLab.uniqueLabId}</strong>), Staff User ID, aur 4-digit PIN se login kar sakte hain.
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    1. Lab Unique ID *
                  </label>
                  <button
                    type="button"
                    onClick={() => setLabId(currentLab.uniqueLabId)}
                    className="text-[11px] text-cyan-700 hover:underline font-mono font-medium cursor-pointer"
                  >
                    Set to {currentLab.uniqueLabId}
                  </button>
                </div>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={labId}
                    onChange={(e) => setLabId(e.target.value.toUpperCase())}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono uppercase tracking-wider border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    placeholder={`e.g. ${currentLab.uniqueLabId}`}
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Aapke Lab ka registered ID: <strong className="text-slate-800 font-mono">{currentLab.uniqueLabId}</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. Staff User ID *
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={staffUserId}
                    onChange={(e) => setStaffUserId(e.target.value.toUpperCase())}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono uppercase tracking-wider border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    placeholder="e.g. AFTB03 or TECH-01"
                  />
                </div>
                {/* Registered staff quick pick chips */}
                {registeredStaff.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                    <span>Registered:</span>
                    {registeredStaff.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setStaffUserId(s.staffUserId);
                          setPin(s.pin);
                        }}
                        className="font-mono bg-slate-100 hover:bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                        title={`Click to fill ${s.name} (${s.staffUserId})`}
                      >
                        {s.staffUserId} ({s.name.split(' ')[0]})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3. 4-Digit Security PIN *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm tracking-widest font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    placeholder="••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-sm font-medium transition-colors shadow-xs cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Verify & Login Staff Terminal</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleGoogleSubmit} className="space-y-4">
              <div className="bg-cyan-50/70 border border-cyan-100 rounded-lg p-3 text-xs text-cyan-900 leading-relaxed">
                <strong>Owner / Pathologist Portal:</strong> Google account se direct sign-in karke sabhi financial, staff management aur settings ke complete rights milte hain.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Account Name
                </label>
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  placeholder="e.g. Dr. A. K. Sharma"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Email Address
                </label>
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  placeholder="owner@yourlab.com"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-xs cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google (Owner Sign-In)</span>
              </button>
            </form>
          )}

          {/* Quick preset switchers */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 text-center mb-2 font-medium">
              Demo Fast Access (Click to test roles instantly):
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  loginWithGoogle(currentLab.email, currentLab.pathologistName || 'Owner');
                  onClose();
                }}
                className="p-2 border border-slate-200 hover:border-slate-400 rounded-lg text-left text-xs bg-slate-50 hover:bg-white transition-colors cursor-pointer"
              >
                <span className="block font-semibold text-slate-800">Owner Demo</span>
                <span className="text-[10px] text-slate-500 truncate block">All Admin Rights</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const tech = registeredStaff.find((s) => s.role === 'staff' && s.isActive);
                  if (tech) {
                    loginWithLabCredentials(currentLab.uniqueLabId, tech.staffUserId, tech.pin);
                  } else {
                    loginWithLabCredentials(currentLab.uniqueLabId, 'TECH-01', '1234');
                  }
                  onClose();
                }}
                className="p-2 border border-slate-200 hover:border-slate-400 rounded-lg text-left text-xs bg-slate-50 hover:bg-white transition-colors cursor-pointer"
              >
                <span className="block font-semibold text-slate-800">Staff Demo</span>
                <span className="text-[10px] text-slate-500 truncate block">Staff PIN Verified</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
