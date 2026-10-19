import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LabProfile } from '../types/lab';
import { StorageService } from '../services/storage';
import {
  Settings,
  Building2,
  Save,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

interface LabSettingsViewProps {
  onRefreshAllData: () => void;
}

export const LabSettingsView: React.FC<LabSettingsViewProps> = ({ onRefreshAllData }) => {
  const { labProfile, updateLabProfile, currentUser, quickSwitchUser } = useAuth();
  const isOwner = currentUser?.role === 'owner';

  const [form, setForm] = useState<LabProfile>({ ...labProfile });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = (field: keyof LabProfile, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.uniqueLabId.trim()) {
      alert('Lab Name aur Unique Lab ID mandatory hain.');
      return;
    }
    updateLabProfile({
      ...form,
      uniqueLabId: form.uniqueLabId.trim().toUpperCase(),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExportBackup = () => {
    const json = StorageService.exportFullBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PathoCare_Lab_Backup_${labProfile.uniqueLabId}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = StorageService.restoreBackup(content);
      if (success) {
        alert('Lab database successfully restored!');
        onRefreshAllData();
      } else {
        alert('Backup file invalid thi. Kripya valid PathoCare JSON file upload karein.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetFactory = () => {
    if (
      window.confirm(
        'Warning: Kya aap sach mein default demo database reset karna chahte hain? Sabhi added reports clear ho jayengi.'
      )
    ) {
      StorageService.resetToFactoryDemo();
      onRefreshAllData();
    }
  };

  if (!isOwner) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs max-w-xl mx-auto text-center space-y-4 my-8">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold font-heading text-slate-900">
          Lab Profile & Letterhead Settings Restricted
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Lab ki information, address, Unique Lab ID aur report letterhead customize karne ke liye <strong>Owner</strong> account chahiye.
        </p>
        <button
          type="button"
          onClick={() => quickSwitchUser('owner')}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          Switch to Owner Account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-heading text-slate-900 tracking-tight">
            Laboratory Profile & Official Letterhead Settings
          </h1>
          <p className="text-xs text-slate-500">
            Configure your clinic name, Unique Lab ID, contact numbers, NABL registration, and Chief Pathologist signature.
          </p>
        </div>

        {saveSuccess && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profile Saved!</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Lab Identity */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold font-heading text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-700" />
            <span>Laboratory Legal Identity & Direct Access ID</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Laboratory Full Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Unique Lab ID (Used by staff to login) *
              </label>
              <input
                type="text"
                required
                value={form.uniqueLabId}
                onChange={(e) => handleChange('uniqueLabId', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-mono uppercase tracking-wider text-xs"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Staff login ke waqt yeh ID aur apna Staff ID + PIN use karte hain.
              </span>
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Laboratory Tagline / Subtitle
              </label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Complete Clinic / Hospital Address *
              </label>
              <input
                type="text"
                required
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Phone Contact Numbers
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Accreditations & Chief Pathologist */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold font-heading text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-700" />
            <span>Accreditations & Chief Pathologist Authorization</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                NABL / Government License Number
              </label>
              <input
                type="text"
                value={form.nablRegNo}
                onChange={(e) => handleChange('nablRegNo', e.target.value)}
                placeholder="NABL-MC-2024-9481"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ISO Certification Details
              </label>
              <input
                type="text"
                value={form.isoCertNo || ''}
                onChange={(e) => handleChange('isoCertNo', e.target.value)}
                placeholder="ISO 15189:2022 Certified"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Chief Pathologist Full Name *
              </label>
              <input
                type="text"
                required
                value={form.pathologistName}
                onChange={(e) => handleChange('pathologistName', e.target.value)}
                placeholder="Dr. A. K. Sharma"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Degrees & Qualifications
              </label>
              <input
                type="text"
                value={form.pathologistDegrees}
                onChange={(e) => handleChange('pathologistDegrees', e.target.value)}
                placeholder="MBBS, MD (Pathology)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Medical Council Registration Number (MCI / State Council)
              </label>
              <input
                type="text"
                value={form.pathologistRegistration}
                onChange={(e) => handleChange('pathologistRegistration', e.target.value)}
                placeholder="MCI Reg. No: 58291"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-xs font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Report Legal Disclaimer / Footer Notice
              </label>
              <textarea
                rows={2}
                value={form.footerNotice}
                onChange={(e) => handleChange('footerNotice', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Lab Profile & Letterhead</span>
            </button>
          </div>
        </div>
      </form>

      {/* Data Backup & Disaster Recovery */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold font-heading text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
          <Download className="w-4 h-4 text-cyan-700" />
          <span>Database Backup & Restore</span>
        </h3>
        <p className="text-xs text-slate-500">
          Save an offline JSON snapshot of all patient reports, doctors, test catalogs, and staff accounts, or restore from a previous backup.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Full JSON Backup</span>
          </button>

          <label className="flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Restore from JSON File</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleResetFactory}
            className="flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold transition-colors ml-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Factory Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
