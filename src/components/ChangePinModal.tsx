import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, ShieldCheck, AlertCircle, Eye, EyeOff, X, CheckCircle2 } from 'lucide-react';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, changeCurrentStaffPin } = useAuth();

  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPin.trim().length !== 4 || !/^\d{4}$/.test(newPin.trim())) {
      setErrorMsg('Naya PIN theek 4 digits ka hona chahiye (e.g. 5678).');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMsg('New PIN aur Confirm PIN match nahi ho rahe hain.');
      return;
    }

    if (newPin === oldPin) {
      setErrorMsg('Naya PIN purane PIN se alag hona chahiye.');
      return;
    }

    setLoading(true);
    try {
      const res = await changeCurrentStaffPin(oldPin, newPin);
      if (res.success) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setOldPin('');
          setNewPin('');
          setConfirmPin('');
          onClose();
        }, 2200);
      } else {
        setErrorMsg(res.message || 'PIN change nahi ho saka.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold font-heading">Staff Security PIN Update</h2>
              <p className="text-[11px] text-slate-400">
                Staff ID: <span className="font-mono text-cyan-300 font-semibold">{currentUser?.staffUserId}</span> ({currentUser?.name})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="bg-amber-50 border-b border-amber-100 p-3 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Anti-Fraud Security:</strong> Apna default PIN turant change karein taaki koi bhi vyakti ya owner aapke behalf par bina aapki permission ke login ya koi report action perform na kar sake.
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {isSuccess ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-heading">
                PIN Successfully Updated!
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Aapka naya security PIN save ho chuka hai. Next time login ke liye yahi PIN use karein.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Current PIN (Owner dwara diya gaya ya purana PIN) *
                </label>
                <div className="relative">
                  <input
                    type={showPins ? 'text' : 'password'}
                    required
                    maxLength={4}
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value)}
                    placeholder="4-digit PIN"
                    className="w-full px-3 py-2 font-mono text-center tracking-widest text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Naya 4-Digit PIN *
                  </label>
                  <input
                    type={showPins ? 'text' : 'password'}
                    required
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="New PIN"
                    className="w-full px-3 py-2 font-mono text-center tracking-widest text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Confirm Naya PIN *
                  </label>
                  <input
                    type={showPins ? 'text' : 'password'}
                    required
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Confirm PIN"
                    className="w-full px-3 py-2 font-mono text-center tracking-widest text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPins(!showPins)}
                  className="inline-flex items-center gap-1 hover:text-slate-800 cursor-pointer"
                >
                  {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPins ? 'Hide PINs' : 'Show PINs'}</span>
                </button>
                <span>Exactly 4 digits</span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-2 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 py-2 px-3 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{loading ? 'Updating...' : 'Update My Security PIN'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
