import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Copy, Check, LogOut, ArrowLeftRight, KeyRound, PlusCircle } from 'lucide-react';
import { ChangePinModal } from './ChangePinModal';

interface NavbarProps {
  onOpenLogin: () => void;
  onOpenRegister?: () => void;
  onNavigate: (view: string) => void;
  activeView: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLogin, onOpenRegister, onNavigate, activeView }) => {
  const { currentUser, labProfile, logout, quickSwitchUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);

  const handleCopyLabId = () => {
    if (!labProfile?.uniqueLabId) return;
    navigator.clipboard.writeText(labProfile.uniqueLabId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Wordmark & Lab Name */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-cyan-400 flex items-center justify-center font-bold text-base shadow-xs">
              P+
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-slate-900 tracking-tight text-base">
                  PathoCare
                </span>
                <span className="text-slate-300">/</span>
                <span className="text-xs font-medium text-slate-700 truncate max-w-[200px] sm:max-w-[320px]">
                  {currentUser ? labProfile.name : 'Pathology Laboratory System'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>Clinical Diagnostics LIS</span>
                {currentUser && labProfile.uniqueLabId && (
                  <>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={handleCopyLabId}
                      className="hover:text-cyan-700 inline-flex items-center gap-1 font-mono font-medium text-slate-600 hover:underline cursor-pointer"
                      title="Click to copy Lab Unique ID for staff login"
                    >
                      <span>Lab ID: {labProfile.uniqueLabId}</span>
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                    </button>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Cloud Sync Active
                    </span>
                  </>
                )}
                {!currentUser && (
                  <>
                    <span>·</span>
                    <span className="text-emerald-700 font-medium text-[10px]">Production Public Portal</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Zone 2: Navigation Links for Desktop (When Logged In) */}
          {currentUser ? (
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onNavigate('dashboard')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeView === 'dashboard'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => onNavigate('reports')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeView === 'reports'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Reports & History
              </button>
              <button
                onClick={() => onNavigate('new-report')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeView === 'new-report'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                + Fill Report
              </button>
              <button
                onClick={() => onNavigate('doctors')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeView === 'doctors'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Referring Doctors
              </button>
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-4 text-xs text-slate-500">
              <span>Public Patient Report Verification & Lab Management</span>
            </div>
          )}

          {/* Zone 3: Active User & Role Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-semibold text-slate-900 leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    {currentUser.role === 'owner' ? (
                      <span className="font-medium text-emerald-700">Owner (Full Permissions)</span>
                    ) : (
                      <span className="font-medium text-cyan-700">Staff ({currentUser.staffUserId || 'Limited'})</span>
                    )}
                    <span>·</span>
                    <span className="capitalize">{currentUser.loginType === 'password' ? 'Password' : 'PIN'}</span>
                  </span>
                </div>

                {/* Staff Self-Service PIN Change Button */}
                {currentUser.role === 'staff' && (
                  <button
                    type="button"
                    onClick={() => setIsChangePinOpen(true)}
                    title="Change my personal 4-digit Security PIN"
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                    <span className="hidden sm:inline">Change PIN</span>
                  </button>
                )}

                {/* Fast role switcher for instant verification */}
                <button
                  type="button"
                  onClick={() => quickSwitchUser(currentUser.role === 'owner' ? 'staff' : 'owner')}
                  title={`Click to quickly switch to ${currentUser.role === 'owner' ? 'Staff' : 'Owner'} mode`}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden lg:inline">Switch to:</span>
                  <span className="font-semibold text-slate-900">
                    {currentUser.role === 'owner' ? 'Staff Role' : 'Owner Role'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={logout}
                  title="Sign out session"
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {onOpenRegister && (
                  <button
                    type="button"
                    onClick={onOpenRegister}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Register New Lab</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Login Terminal</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Staff Self-Service PIN Change Modal */}
      <ChangePinModal
        isOpen={isChangePinOpen}
        onClose={() => setIsChangePinOpen(false)}
      />
    </>
  );
};

