import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { PatientReport, ReferringDoctor, ReportStatus } from '../types/lab';
import { downloadReportPdf } from '../utils/pdfGenerator';
import {
  Search,
  Printer,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  PlusCircle,
  Stethoscope,
  ShieldAlert,
  ShieldCheck,
  Download,
  FileText,
  AlertCircle,
  IndianRupee,
  Loader2,
  Eye,
  Check,
} from 'lucide-react';

interface ReportsHistoryViewProps {
  reports: PatientReport[];
  doctors: ReferringDoctor[];
  onSelectReportToPrint: (report: PatientReport) => void;
  onEditReport: (report: PatientReport) => void;
  onDeleteReport: (reportId: string) => void;
  onNavigate: (view: string) => void;
  onUpdateReportStatus?: (reportId: string, newStatus: ReportStatus) => void;
}

export const ReportsHistoryView: React.FC<ReportsHistoryViewProps> = ({
  reports,
  doctors,
  onSelectReportToPrint,
  onEditReport,
  onDeleteReport,
  onNavigate,
  onUpdateReportStatus,
}) => {
  const { hasPermission, currentUser, labProfile } = useAuth();
  const canDelete = hasPermission('DELETE_REPORT');
  const isOwner = currentUser?.role === 'owner';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('ALL');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filter reports
  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        rep.patientName.toLowerCase().includes(q) ||
        rep.reportNo.toLowerCase().includes(q) ||
        rep.phone.toLowerCase().includes(q) ||
        rep.testName.toLowerCase().includes(q) ||
        rep.referringDoctorName.toLowerCase().includes(q);

      // Doctor match
      const matchesDoctor =
        selectedDoctorFilter === 'ALL' || rep.referringDoctorId === selectedDoctorFilter;

      // Investigation Status match
      const matchesStatus =
        selectedStatusFilter === 'ALL' || rep.status === selectedStatusFilter;

      // Payment Status match
      const repPaymentStatus =
        rep.paymentStatus ||
        ((rep.dueAmount ?? 0) === 0 ? 'PAID' : (rep.amountPaid ?? 0) > 0 ? 'PARTIAL' : 'UNPAID');

      const matchesPayment =
        selectedPaymentFilter === 'ALL' || repPaymentStatus === selectedPaymentFilter;

      return matchesSearch && matchesDoctor && matchesStatus && matchesPayment;
    });
  }, [reports, searchQuery, selectedDoctorFilter, selectedStatusFilter, selectedPaymentFilter]);

  const handleDeleteClick = (report: PatientReport) => {
    if (!canDelete) {
      alert(
        `Permission Denied: Staff Account (${currentUser?.name || 'Staff'}) ke paas patient report delete karne ki permission nahi hai. Yeh permission sirf Lab Owner ke paas hoti hai.`
      );
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to permanently delete Report #${report.reportNo} for ${report.patientName}?`
      )
    ) {
      onDeleteReport(report.id);
    }
  };

  // Direct PDF Download Handler
  const handleDirectPdfDownload = async (report: PatientReport) => {
    setDownloadingId(report.id);
    try {
      await downloadReportPdf(report, labProfile);
    } catch (err) {
      console.error('Direct PDF download error:', err);
      alert('PDF download karne me problem aayi. Kripya View/Print option se try karein.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Status Change Handler with Owner-Only Verification Enforcement
  const handleQuickStatusChange = (report: PatientReport, newStatus: ReportStatus) => {
    if (newStatus === 'VERIFIED' && !isOwner) {
      alert(
        'Permission Restricted: Sirf Lab Owner / Chief Pathologist hi report ko "VERIFIED" mark kar sakte hain. Staff sirf "Sample Collected" ya "Ready to Approve" mark kar sakte hain.'
      );
      return;
    }

    if (onUpdateReportStatus) {
      onUpdateReportStatus(report.id, newStatus);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-heading text-slate-900 tracking-tight">
            Patient Reports & Investigation History
          </h1>
          <p className="text-xs text-slate-500">
            Search records, track sample collection & verification workflows, download PDFs, and monitor payments & dues.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('new-report')}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Fill New Report</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Patient, Report No, Phone, Test, Doctor..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Doctor Filter */}
          <div>
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500 bg-white cursor-pointer"
            >
              <option value="ALL">All Referring Doctors</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} ({doc.totalReferred})
                </option>
              ))}
            </select>
          </div>

          {/* Investigation Status Filter */}
          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500 bg-white cursor-pointer"
            >
              <option value="ALL">All Report Statuses</option>
              <option value="SAMPLE_COLLECTED">1. Sample Collected</option>
              <option value="READY_TO_APPROVE">2. Ready to Approve</option>
              <option value="VERIFIED">3. Verified by Owner</option>
              <option value="DELIVERED">4. Delivered to Patient</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={selectedPaymentFilter}
              onChange={(e) => setSelectedPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500 bg-white cursor-pointer"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">Full Payment Done (PAID)</option>
              <option value="PARTIAL">Partial Balance Due (PARTIAL)</option>
              <option value="UNPAID">Pending Dues (UNPAID)</option>
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <div className="flex items-center gap-2">
            <span>Showing {filteredReports.length} of {reports.length} reports</span>
            {(searchQuery || selectedDoctorFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || selectedPaymentFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDoctorFilter('ALL');
                  setSelectedStatusFilter('ALL');
                  setSelectedPaymentFilter('ALL');
                }}
                className="text-cyan-700 font-semibold hover:underline cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>
          {!canDelete && (
            <div className="flex items-center gap-1 text-slate-400">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>Staff Mode: Report deletion is restricted to Lab Owner</span>
            </div>
          )}
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No matching patient reports found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Search filters me koi record match nahi hua, ya abhi tak koi test fill nahi kiya gaya hai.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('new-report')}
              className="mt-4 px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Fill New Test Report</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Report & Token</th>
                  <th className="py-3 px-4">Patient Profile</th>
                  <th className="py-3 px-4">Investigation Test</th>
                  <th className="py-3 px-4">Referring Doctor</th>
                  <th className="py-3 px-4">Payment & Dues</th>
                  <th className="py-3 px-4">Investigation Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((report) => {
                  const hasAbnormal = report.parameters?.some(
                    (p) => p.flag === 'HIGH' || p.flag === 'LOW'
                  );

                  const discountVal = report.discountAmount || 0;
                  const netPayableVal = report.netPayable ?? (report.testPrice - discountVal);
                  const paidVal = report.amountPaid ?? 0;
                  const dueVal = report.dueAmount ?? Math.max(0, netPayableVal - paidVal);

                  const isDownloading = downloadingId === report.id;

                  return (
                    <tr key={report.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Report & Token */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {report.reportNo}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Token #{report.tokenNo}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {report.sampleCollectedAt?.split(' ')[0] || ''}
                        </span>
                      </td>

                      {/* 2. Patient Profile */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">
                          {report.patientName}
                        </span>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span>{report.age} Y / {report.gender}</span>
                          <span>·</span>
                          <span>{report.phone}</span>
                        </div>
                      </td>

                      {/* 3. Investigation Test Panel */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 block">{report.testName}</span>
                        <span className="text-[10px] text-slate-400 block">{report.testCategory}</span>
                        {hasAbnormal && (
                          <span className="inline-block mt-0.5 text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.2 rounded border border-red-200">
                            Out of Range Flag
                          </span>
                        )}
                      </td>

                      {/* 4. Referring Doctor */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                          <span className="text-slate-700 truncate max-w-[150px]">
                            {report.referringDoctorName}
                          </span>
                        </div>
                      </td>

                      {/* 5. Payment Details, Discount & Balance Due */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-mono font-bold text-slate-900">
                              ₹{netPayableVal}
                            </span>
                            {discountVal > 0 && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded border border-amber-200" title={report.discountApprovedBy ? `Approved by: ${report.discountApprovedBy}` : 'Discount'}>
                                Disc -₹{discountVal}
                              </span>
                            )}
                          </div>

                          <div>
                            {dueVal === 0 ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Paid Full (₹{paidVal})</span>
                              </span>
                            ) : paidVal > 0 ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                <span>Paid ₹{paidVal} · Due: ₹{dueVal}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <span>Unpaid (Due: ₹{dueVal})</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 6. Investigation Workflow Status */}
                      <td className="py-3 px-4">
                        <div className="space-y-1.5">
                          {report.status === 'VERIFIED' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Verified by Pathologist</span>
                            </span>
                          ) : report.status === 'DELIVERED' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                              <span>Delivered</span>
                            </span>
                          ) : report.status === 'READY_TO_APPROVE' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                              <Eye className="w-3.5 h-3.5 text-purple-600" />
                              <span>Ready to Approve</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Sample Collected</span>
                            </span>
                          )}

                          {/* Fast Action for Owner: Verify with 1-click */}
                          {isOwner && report.status !== 'VERIFIED' && report.status !== 'DELIVERED' && (
                            <div>
                              <button
                                type="button"
                                onClick={() => handleQuickStatusChange(report, 'VERIFIED')}
                                title="Click to verify as Lab Owner / Chief Pathologist"
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors cursor-pointer shadow-2xs"
                              >
                                <ShieldCheck className="w-3 h-3" />
                                <span>Verify Report</span>
                              </button>
                            </div>
                          )}

                          {/* Fast Action for Staff: Toggle between Sample Collected and Ready to Approve */}
                          {!isOwner && (report.status === 'SAMPLE_COLLECTED' || report.status === 'READY_TO_APPROVE') && (
                            <div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickStatusChange(
                                    report,
                                    report.status === 'SAMPLE_COLLECTED' ? 'READY_TO_APPROVE' : 'SAMPLE_COLLECTED'
                                  )
                                }
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors cursor-pointer"
                              >
                                <span>Mark {report.status === 'SAMPLE_COLLECTED' ? 'Ready to Approve' : 'Sample Collected'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 7. Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Direct PDF Download Button */}
                          <button
                            type="button"
                            onClick={() => handleDirectPdfDownload(report)}
                            disabled={isDownloading}
                            title="Direct Download A4 PDF Document"
                            className="p-1.5 text-cyan-700 hover:text-cyan-900 bg-cyan-50 hover:bg-cyan-100 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isDownloading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-cyan-700" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>

                          {/* Print / Preview Modal Button */}
                          <button
                            type="button"
                            onClick={() => onSelectReportToPrint(report)}
                            title="View & Print A4 Report (with Letterhead / Margin adjustments)"
                            className="p-1.5 text-slate-600 hover:text-cyan-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Edit Report Results */}
                          <button
                            type="button"
                            onClick={() => onEditReport(report)}
                            title="Edit Report Results & Payment"
                            className="p-1.5 text-slate-600 hover:text-cyan-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete Report (Owner Only) */}
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(report)}
                            title={canDelete ? 'Delete Report (Owner)' : 'Delete Disabled for Staff'}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              canDelete
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-300 cursor-not-allowed opacity-50'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
