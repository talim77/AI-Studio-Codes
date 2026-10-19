import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ReferringDoctor, PatientReport } from '../types/lab';
import {
  Stethoscope,
  Plus,
  Search,
  Building2,
  Phone,
  Printer,
  X,
  Edit2,
  Calendar,
  Check,
  ShieldAlert,
  Percent,
  Receipt,
} from 'lucide-react';

interface DoctorDirectoryViewProps {
  doctors: ReferringDoctor[];
  reports: PatientReport[];
  onAddNewDoctor: (doc: Omit<ReferringDoctor, 'id' | 'totalReferred'>) => ReferringDoctor;
  onUpdateDoctor: (id: string, updates: Partial<ReferringDoctor>) => void;
  onSelectReportToPrint: (report: PatientReport) => void;
}

export const DoctorDirectoryView: React.FC<DoctorDirectoryViewProps> = ({
  doctors,
  reports,
  onAddNewDoctor,
  onUpdateDoctor,
  onSelectReportToPrint,
}) => {
  const { currentUser, labProfile, hasPermission } = useAuth();
  const canManageDoctors = hasPermission('MANAGE_DOCTORS');
  const canViewFinancials = hasPermission('VIEW_DOCTOR_COMMISSIONS');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(
    doctors[1]?.id || doctors[0]?.id || null
  );

  // Time filter: 'ALL' | 'WEEK' | 'MONTH'
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'WEEK' | 'MONTH'>('ALL');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRateDoctorId, setEditingRateDoctorId] = useState<string | null>(null);
  const [editedRate, setEditedRate] = useState<number>(15);

  // Printable Referral Statement modal
  const [showPrintStatement, setShowPrintStatement] = useState(false);

  // Form State for new doctor
  const [name, setName] = useState('');
  const [qualification, setQualification] = useState('MBBS, MD');
  const [clinicHospital, setClinicHospital] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('General Medicine');
  const [commissionRate, setCommissionRate] = useState(15);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  // Filter doctor directory
  const filteredDoctors = doctors.filter((doc) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      doc.name.toLowerCase().includes(q) ||
      doc.clinicHospital.toLowerCase().includes(q) ||
      doc.specialty.toLowerCase().includes(q) ||
      doc.phone.toLowerCase().includes(q)
    );
  });

  // Calculate doctor patient reports with time filtering
  const doctorReferredReports = useMemo(() => {
    if (!selectedDoctorId) return [];

    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return reports.filter((r) => {
      if (r.referringDoctorId !== selectedDoctorId) return false;

      const reportDate = new Date(r.createdAt || r.sampleCollectedAt);
      if (timeFilter === 'WEEK') {
        return reportDate >= oneWeekAgo;
      }
      if (timeFilter === 'MONTH') {
        return reportDate >= startOfMonth;
      }
      return true;
    });
  }, [reports, selectedDoctorId, timeFilter]);

  // Financial aggregates
  const totalDoctorVolume = doctorReferredReports.reduce(
    (sum, r) => sum + (r.amountPaid || r.testPrice || 0),
    0
  );

  const currentRate = selectedDoctor?.commissionRate ?? 15;
  const totalCommissionEarned = Math.round((totalDoctorVolume * currentRate) / 100);

  const handleSaveRate = (doctorId: string) => {
    onUpdateDoctor(doctorId, { commissionRate: Number(editedRate) });
    setEditingRateDoctorId(null);
  };

  const handleCreateDoctorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const created = onAddNewDoctor({
      labId: labProfile.uniqueLabId,
      name: name.trim().startsWith('Dr.') ? name.trim() : `Dr. ${name.trim()}`,
      qualification: qualification.trim() || 'MBBS',
      clinicHospital: clinicHospital.trim() || 'Private Clinic',
      phone: phone.trim() || '-',
      email: email.trim() || undefined,
      specialty: specialty.trim() || 'Physician',
      commissionRate: Number(commissionRate) || 15,
    });

    setSelectedDoctorId(created.id);
    setShowAddModal(false);
    setName('');
    setQualification('MBBS, MD');
    setClinicHospital('');
    setPhone('');
    setEmail('');
  };

  const getPeriodLabel = () => {
    if (timeFilter === 'WEEK') return 'Weekly (Last 7 Days)';
    if (timeFilter === 'MONTH') return 'Monthly (Current Calendar Month)';
    return 'All Time History';
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-heading text-slate-900 tracking-tight">
            Referring Doctors Registry & Referral Logs
          </h1>
          <p className="text-xs text-slate-500">
            Track which doctors refer patients, total billing amounts, edit referral rates (%), and print weekly/monthly referral statements.
          </p>
        </div>

        {canManageDoctors && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Register New Doctor</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search doctors by name, clinic, hospital, or specialty..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Time Period Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setTimeFilter('ALL')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              timeFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Time
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('MONTH')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              timeFilter === 'MONTH'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('WEEK')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              timeFilter === 'WEEK'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            This Week
          </button>
        </div>
      </div>

      {/* Main Grid: Doctors List (Left) and Detailed Ledger (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctors Directory Cards */}
        <div className="lg:col-span-1 space-y-3 max-h-[750px] overflow-y-auto pr-1">
          {filteredDoctors.map((doc) => {
            const isSelected = selectedDoctorId === doc.id;
            const docPatientsCount = reports.filter((r) => r.referringDoctorId === doc.id).length;
            const isEditingRate = editingRateDoctorId === doc.id;

            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDoctorId(doc.id)}
                className={`p-4 bg-white rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-cyan-600 ring-2 ring-cyan-100 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold font-heading text-slate-900 leading-snug">
                        {doc.name}
                      </h3>
                      <p className="text-[11px] text-slate-500">{doc.qualification}</p>
                      <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px]">{doc.clinicHospital}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-slate-900 text-sm block">
                      {docPatientsCount}
                    </span>
                    <span className="text-[10px] text-slate-400">Patients</span>
                  </div>
                </div>

                {/* Referral Rate Badge & Quick Edit */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1 text-slate-600">
                    <Percent className="w-3 h-3 text-cyan-700" />
                    <span>Referral Rate:</span>
                  </div>

                  {isEditingRate ? (
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editedRate}
                        onChange={(e) => setEditedRate(Number(e.target.value))}
                        className="w-14 px-1.5 py-0.5 text-xs font-mono font-bold border border-cyan-500 rounded bg-white"
                        autoFocus
                      />
                      <span className="text-xs font-bold">%</span>
                      <button
                        type="button"
                        onClick={() => handleSaveRate(doc.id)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRateDoctorId(null)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                        {doc.commissionRate ?? 15}%
                      </span>
                      {canManageDoctors && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingRateDoctorId(doc.id);
                            setEditedRate(doc.commissionRate ?? 15);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                          title="Edit referral rate percentage"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Doctor Ledger & Itemized Patient Breakdown (Right, 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
          {selectedDoctor ? (
            <>
              {/* Doctor Dossier Top Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-cyan-800 tracking-wider">
                    Referring Doctor Dossier · {getPeriodLabel()}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h2 className="text-lg font-bold font-heading text-slate-900">
                      {selectedDoctor.name}
                    </h2>
                    <span className="text-xs text-slate-500">({selectedDoctor.qualification})</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {selectedDoctor.clinicHospital} · {selectedDoctor.specialty} · Phone: {selectedDoctor.phone}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPrintStatement(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Receipt className="w-4 h-4 text-cyan-300" />
                    <span>Print Referral Statement</span>
                  </button>
                </div>
              </div>

              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Referred Patients ({timeFilter})</span>
                  <strong className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                    {doctorReferredReports.length}
                  </strong>
                  <span className="text-[10px] text-slate-400">Total cases in period</span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Total Tests Value / Bill</span>
                  <strong className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                    ₹{totalDoctorVolume.toLocaleString('en-IN')}
                  </strong>
                  <span className="text-[10px] text-slate-400">Gross patient billing</span>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[11px] text-emerald-800 font-semibold block">
                    Referral Commission ({selectedDoctor.commissionRate ?? 15}%)
                  </span>
                  <strong className="text-xl font-bold font-mono text-emerald-900 mt-1 block">
                    ₹{totalCommissionEarned.toLocaleString('en-IN')}
                  </strong>
                  <span className="text-[10px] text-emerald-700">Calculated payout share</span>
                </div>
              </div>

              {/* Patient-by-Patient Itemized Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                  Itemized Patient Test Records ({doctorReferredReports.length})
                </h4>

                {doctorReferredReports.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                    <span>Is period ({getPeriodLabel()}) mein is doctor ka koi referral record nahi mila.</span>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                          <th className="py-2.5 px-3">Date / Report #</th>
                          <th className="py-2.5 px-3">Patient Name</th>
                          <th className="py-2.5 px-3">Test(s) Done</th>
                          <th className="py-2.5 px-3 text-right">Test Bill (₹)</th>
                          <th className="py-2.5 px-3 text-right">Referral Share</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {doctorReferredReports.map((rep) => {
                          const bill = rep.amountPaid || rep.testPrice || 0;
                          const rate = rep.referringDoctorCommissionRate ?? selectedDoctor.commissionRate ?? 15;
                          const commission = Math.round((bill * rate) / 100);

                          return (
                            <tr key={rep.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3">
                                <span className="font-mono font-bold text-slate-800 block">
                                  {rep.reportNo}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {rep.sampleCollectedAt}
                                </span>
                              </td>

                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-slate-900 block">
                                  {rep.patientName}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {rep.age} Y / {rep.gender}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-slate-700">
                                <span className="truncate max-w-[200px] block">{rep.testName}</span>
                              </td>

                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                ₹{bill}
                              </td>

                              <td className="py-2.5 px-3 text-right">
                                <span className="font-mono font-bold text-emerald-800 block">
                                  ₹{commission}
                                </span>
                                <span className="text-[9px] text-slate-400">({rate}%)</span>
                              </td>

                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => onSelectReportToPrint(rep)}
                                  className="p-1 text-slate-500 hover:text-cyan-800 hover:bg-slate-100 rounded cursor-pointer"
                                  title="View & Print Patient Report"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-slate-400 text-xs">
              <Stethoscope className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <span>Kripya kisi referring doctor ko select karein unka detailed ledger dekhne ke liye.</span>
            </div>
          )}
        </div>
      </div>

      {/* Printable Referral Statement / Voucher Modal */}
      {showPrintStatement && selectedDoctor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col my-auto border border-slate-200">
            {/* Modal Control Bar (Hidden on print) */}
            <div className="no-print bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold">
                  Official Doctor Referral Statement & Payout Slip
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-xs font-mono text-cyan-300">{selectedDoctor.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Statement (A4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintStatement(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Referral Document (A4) */}
            <div className="print-only p-8 sm:p-10 bg-white text-slate-900 text-xs leading-relaxed max-w-[210mm] mx-auto w-full">
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-4 mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-bold font-heading text-slate-900 uppercase">
                      {labProfile.name}
                    </h1>
                    <p className="text-xs text-slate-600 font-medium">{labProfile.tagline}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{labProfile.address}</p>
                    <p className="text-[11px] text-slate-500">Phone: {labProfile.phone}</p>
                  </div>

                  <div className="text-right">
                    <span className="inline-block bg-slate-100 border border-slate-300 px-3 py-1 font-bold font-mono text-xs text-slate-800">
                      REFERRAL STATEMENT
                    </span>
                    <span className="block font-mono text-[10px] text-slate-500 mt-1">
                      Date: {new Date().toLocaleDateString('en-IN')}
                    </span>
                    <span className="block font-mono text-[10px] text-cyan-800">
                      LAB ID: {labProfile.uniqueLabId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Statement Target Info Box */}
              <div className="bg-slate-50 border border-slate-200 rounded p-4 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Doctor Name</span>
                  <span className="font-bold text-slate-900 text-xs">{selectedDoctor.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Clinic / Hospital</span>
                  <span className="font-semibold text-slate-800">{selectedDoctor.clinicHospital}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Specialty & Phone</span>
                  <span className="text-slate-800">{selectedDoctor.specialty} ({selectedDoctor.phone})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Statement Period</span>
                  <span className="font-bold text-cyan-900 font-mono">{getPeriodLabel()}</span>
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-left border-collapse border border-slate-200 text-xs mb-6">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                    <th className="py-2 px-3 border-r border-slate-200 w-12 text-center">S.No</th>
                    <th className="py-2 px-3 border-r border-slate-200 w-28">Report Date & ID</th>
                    <th className="py-2 px-3 border-r border-slate-200">Patient Details</th>
                    <th className="py-2 px-3 border-r border-slate-200">Investigation Test(s)</th>
                    <th className="py-2 px-3 border-r border-slate-200 text-right w-24">Test Bill (₹)</th>
                    <th className="py-2 px-3 border-r border-slate-200 text-right w-16">Rate (%)</th>
                    <th className="py-2 px-3 text-right w-24">Referral Share (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {doctorReferredReports.map((rep, idx) => {
                    const bill = rep.amountPaid || rep.testPrice || 0;
                    const rate = rep.referringDoctorCommissionRate ?? selectedDoctor.commissionRate ?? 15;
                    const commission = Math.round((bill * rate) / 100);

                    return (
                      <tr key={rep.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-mono text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-mono">
                          <span className="font-semibold block">{rep.reportNo}</span>
                          <span className="text-[10px] text-slate-400">{rep.sampleCollectedAt}</span>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-900">
                          {rep.patientName} ({rep.age}Y/{rep.gender})
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-700">
                          {rep.testName}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-medium">
                          ₹{bill}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-mono text-slate-600">
                          {rate}%
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{commission}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                    <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-xs">
                      Grand Total ({doctorReferredReports.length} Patients):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-sm border-r border-slate-300">
                      ₹{totalDoctorVolume.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono text-xs">
                      {selectedDoctor.commissionRate}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-sm text-emerald-900">
                      ₹{totalCommissionEarned.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Settlement Summary Box */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded mb-8 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Net Referral Share Payable / Accounted:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Calculated in accordance with agreed referral incentive rate of {selectedDoctor.commissionRate}%.
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xl font-bold text-emerald-800">
                    ₹{totalCommissionEarned.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 mt-8">
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Authorized Lab Signatory:</p>
                  <div className="h-12 flex items-end">
                    <span className="font-mono text-xs text-slate-600 italic">
                      [Verified for {labProfile.name}]
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">{labProfile.pathologistName}</p>
                  <p className="text-[10px] text-slate-500">Director / Chief Pathologist</p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Doctor Receipt Acknowledgment:</p>
                  <div className="h-12 flex items-end justify-end">
                    <span className="font-mono text-xs text-slate-400 italic">
                      [Signature / Stamp]
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900">{selectedDoctor.name}</p>
                  <p className="text-[10px] text-slate-500">{selectedDoctor.clinicHospital}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold font-heading text-slate-900">
                + Register New Referring Doctor
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDoctorSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Doctor Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Mehra"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Qualifications
                  </label>
                  <input
                    type="text"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder="MBBS, MD"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Medical Specialty
                  </label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="e.g. Cardiology"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinic or Hospital Affiliation *
                </label>
                <input
                  type="text"
                  required
                  value={clinicHospital}
                  onChange={(e) => setClinicHospital(e.target.value)}
                  placeholder="e.g. City Care Hospital / Self Clinic"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Contact
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Referral Rate (%) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg font-semibold cursor-pointer shadow-xs"
                >
                  Register Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
