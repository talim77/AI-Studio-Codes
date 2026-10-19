import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { PatientReport, ReferringDoctor } from '../types/lab';
import {
  Search,
  Filter,
  Printer,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  PlusCircle,
  Stethoscope,
  ShieldAlert,
  ArrowUpDown,
  FileText,
} from 'lucide-react';

interface ReportsHistoryViewProps {
  reports: PatientReport[];
  doctors: ReferringDoctor[];
  onSelectReportToPrint: (report: PatientReport) => void;
  onEditReport: (report: PatientReport) => void;
  onDeleteReport: (reportId: string) => void;
  onNavigate: (view: string) => void;
}

export const ReportsHistoryView: React.FC<ReportsHistoryViewProps> = ({
  reports,
  doctors,
  onSelectReportToPrint,
  onEditReport,
  onDeleteReport,
  onNavigate,
}) => {
  const { hasPermission, currentUser } = useAuth();
  const canDelete = hasPermission('DELETE_REPORT');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

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

      // Status match
      const matchesStatus =
        selectedStatusFilter === 'ALL' || rep.status === selectedStatusFilter;

      return matchesSearch && matchesDoctor && matchesStatus;
    });
  }, [reports, searchQuery, selectedDoctorFilter, selectedStatusFilter]);

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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-heading text-slate-900 tracking-tight">
            Patient Reports & Investigation History
          </h1>
          <p className="text-xs text-slate-500">
            Search patient records, track reporting progress, and print clinical pathology reports.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('new-report')}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Fill New Report</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Patient name, Report No., Phone, or Test..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Doctor Filter */}
          <div>
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500 bg-white"
            >
              <option value="ALL">All Referring Doctors</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} ({doc.totalReferred})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed (Ready)</option>
              <option value="PENDING">Pending (In Lab)</option>
              <option value="DELIVERED">Delivered to Patient</option>
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <div className="flex items-center gap-2">
            <span>Showing {filteredReports.length} of {reports.length} reports</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-cyan-700 font-semibold hover:underline"
              >
                Clear Search
              </button>
            )}
          </div>
          {!canDelete && (
            <div className="flex items-center gap-1 text-slate-400">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>Staff Mode: Report deletion is disabled for staff</span>
            </div>
          )}
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No matching reports found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search filters or click below to fill a new report.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('new-report')}
              className="mt-4 px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2"
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
                  <th className="py-3 px-4">Sample Date</th>
                  <th className="py-3 px-4">Status & Flags</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((report) => {
                  const hasAbnormal = report.parameters?.some(
                    (p) => p.flag === 'HIGH' || p.flag === 'LOW'
                  );

                  return (
                    <tr key={report.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {report.reportNo}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Token #{report.tokenNo}
                        </span>
                      </td>

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

                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 block">{report.testName}</span>
                        <span className="text-[10px] text-slate-400">{report.testCategory}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                          <span className="text-slate-700 truncate max-w-[180px]">
                            {report.referringDoctorName}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {report.sampleCollectedAt}
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {report.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Ready</span>
                            </span>
                          ) : report.status === 'DELIVERED' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                              <span>Delivered</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Pending</span>
                            </span>
                          )}

                          {hasAbnormal && (
                            <span className="block text-[10px] text-rose-600 font-semibold">
                              Out of Range Flags Detected
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectReportToPrint(report)}
                            title="View & Print A4 Report"
                            className="p-1.5 text-slate-600 hover:text-cyan-800 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditReport(report)}
                            title="Edit Report Results"
                            className="p-1.5 text-slate-600 hover:text-cyan-800 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(report)}
                            title={canDelete ? 'Delete Report (Owner)' : 'Delete Disabled for Staff'}
                            className={`p-1.5 rounded-md transition-colors ${
                              canDelete
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-300 cursor-not-allowed'
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
