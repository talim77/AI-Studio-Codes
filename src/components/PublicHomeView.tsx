import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  Building2,
  Lock,
  PlusCircle,
  FileText,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Printer,
  Clock,
  FlaskConical,
  Phone,
  Calendar,
} from 'lucide-react';
import { PatientReport } from '../types/lab';
import { StorageService } from '../services/storage';

interface PublicHomeViewProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onSelectReportToPrint: (report: PatientReport) => void;
}

export const PublicHomeView: React.FC<PublicHomeViewProps> = ({
  onOpenLogin,
  onOpenRegister,
  onSelectReportToPrint,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedReport, setSearchedReport] = useState<PatientReport | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toUpperCase();
    if (!query) {
      setSearchError('Kripya valid Report No ya Patient Phone Number enter karein.');
      setSearchedReport(null);
      setHasSearched(true);
      return;
    }

    setSearchError(null);
    setHasSearched(true);

    // Search across registered labs in StorageService
    const labs = StorageService.getRegisteredLabs();
    let found: PatientReport | null = null;

    for (const lab of labs) {
      const reports = StorageService.getPatientReports(lab.uniqueLabId);
      const match = reports.find(
        (r) =>
          r.reportNo.trim().toUpperCase() === query ||
          (r.tokenNo && String(r.tokenNo) === query) ||
          (r.phone && r.phone.replace(/\D/g, '').includes(query.replace(/\D/g, '')))
      );
      if (match) {
        found = match;
        break;
      }
    }

    if (found) {
      setSearchedReport(found);
      setSearchError(null);
    } else {
      setSearchedReport(null);
      setSearchError(`Report "${searchQuery}" nahi mili. Kripya Report No (jaise LARI-2026-001) verify karein.`);
    }
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white p-8 sm:p-12 border border-slate-800 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-800/80 text-cyan-300 text-xs font-semibold tracking-wide">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>NABL & ISO 15189 Standard Compliant · Multi-Tenant Cloud LIS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold font-heading tracking-tight text-white leading-tight">
            PathoCare Diagnostic & Clinical LIS
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            Automated pathology reporting system with real-time Firebase cloud backup, 
            doctor referral accounting, customized test catalogs, and secure 4-digit PIN authentication for laboratory technicians.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenLogin}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm shadow-lg shadow-cyan-950 transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Login to Laboratory Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenRegister}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Register New Lab</span>
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      </section>

      {/* Patient Public Report Lookup Portal */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-700 uppercase tracking-wider mb-1">
              <Search className="w-4 h-4 text-cyan-600" />
              <span>Public Patient Portal</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 tracking-tight">
              Verify & Download Clinical Test Report
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Patients and referring doctors can search using their Report No (e.g. LARI-2026-001) or registered contact number.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter Report Number (e.g. LARI-2026-001) or Phone Number..."
              className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4 text-cyan-400" />
            <span>Search Report</span>
          </button>
        </form>

        {/* Search Results Display */}
        {hasSearched && searchedReport && (
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 sm:p-6 space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/60 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900 text-base">{searchedReport.reportNo}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                    {searchedReport.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Registered under Lab: <span className="font-semibold text-slate-800">{searchedReport.labId}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSelectReportToPrint(searchedReport)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>View & Print Official Report</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Patient Name:</span>
                <span className="font-semibold text-slate-900 font-heading">{searchedReport.patientName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Age / Gender:</span>
                <span className="font-medium text-slate-800">
                  {searchedReport.age} Yrs / {searchedReport.gender}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Referred By:</span>
                <span className="font-medium text-slate-800">{searchedReport.referringDoctorName || 'Direct / Walk-In'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Reported At:</span>
                <span className="font-medium text-slate-800">{searchedReport.reportedAt || searchedReport.sampleCollectedAt || 'N/A'}</span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-slate-500 text-[11px] block mb-1">Included Investigations:</span>
              <div className="flex flex-wrap gap-1.5">
                {searchedReport.testGroups && searchedReport.testGroups.length > 0 ? (
                  searchedReport.testGroups.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-900 rounded-md text-xs font-medium"
                    >
                      {t.testName}
                    </span>
                  ))
                ) : (
                  <span className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-900 rounded-md text-xs font-medium">
                    {searchedReport.testName || 'Diagnostic Profile'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {hasSearched && searchError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs">
            {searchError}
          </div>
        )}
      </section>

      {/* Production Onboarding & Access Portal */}
      <section className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Laboratory Management Operations</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold font-heading text-white">
              Cloud LIS Enterprise Terminal
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Strict multi-tenant role isolation. Direct patient entry, automated clinical range calculation, referring doctor ledgers, and secure staff authentication.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: New Registration */}
          <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700/80 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-heading">Register New Laboratory</span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full font-semibold">
                  Fast 1-Min Setup
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Choose a unique Lab ID handle, verify via Gmail security OTP, and configure your clinic in the cloud.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenRegister}
              className="w-full mt-2 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register Diagnostic Laboratory</span>
            </button>
          </div>

          {/* Card 2: Authorized Login */}
          <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700/80 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-heading">Authorized Terminal Login</span>
                <span className="text-[10px] px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-full font-semibold">
                  Dual-Factor & PIN
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Log in as Lab Owner / Director (Master Password or Gmail OTP) or as Staff Technician (Lab ID + Staff ID + 4-Digit PIN).
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenLogin}
              className="w-full mt-2 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <Lock className="w-4 h-4 text-cyan-700" />
              <span>Login to Laboratory Terminal</span>
            </button>
          </div>
        </div>
      </section>

      {/* Production Highlights Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center">
            <FlaskConical className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 font-heading">Complete Diagnostic Catalog</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Pre-configured test templates including Complete Blood Count (CBC), Lipid Profile, Liver Function Test (LFT), Kidney Function Test (KFT), and Widal.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 font-heading">Cloud & Tenant Isolation</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Every registered laboratory is allocated a unique tenant workspace. Reports, staff PINs, and finances remain strictly isolated.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Printer className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 font-heading">Clinical Print & Delivery</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Print standard NABL laboratory headers or plain-paper formats. Immediate WhatsApp sharing and report status tracking.
          </p>
        </div>
      </section>
    </div>
  );
};
