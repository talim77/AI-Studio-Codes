import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PatientReport, ReferringDoctor } from '../types/lab';
import {
  Activity,
  FileText,
  Clock,
  CheckCircle2,
  Stethoscope,
  PlusCircle,
  Eye,
  Printer,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Building2,
  Users,
} from 'lucide-react';

interface DashboardViewProps {
  reports: PatientReport[];
  doctors: ReferringDoctor[];
  onNavigate: (view: string) => void;
  onSelectReportToPrint: (report: PatientReport) => void;
  onEditReport: (report: PatientReport) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reports,
  doctors,
  onNavigate,
  onSelectReportToPrint,
  onEditReport,
}) => {
  const { currentUser, labProfile } = useAuth();
  const isOwner = currentUser?.role === 'owner';

  const totalReports = reports.length;
  const completedReports = reports.filter((r) => r.status === 'COMPLETED' || r.status === 'DELIVERED').length;
  const pendingReports = reports.filter((r) => r.status === 'PENDING').length;
  const totalDoctors = doctors.length;

  const totalRevenue = reports.reduce((sum, r) => sum + (r.amountPaid || 0), 0);

  const recentReports = reports.slice(0, 5);
  const topDoctors = [...doctors].sort((a, b) => b.totalReferred - a.totalReferred).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Diagnostic Laboratory Operations</span>
            <span>·</span>
            <span className="text-cyan-700 font-mono">{labProfile.uniqueLabId}</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
            Welcome back, {currentUser?.name}
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            {isOwner
              ? 'Aap Owner mode mein hain. Yahan se patient reports create karein, referring doctors ka record dekhein aur staff PINs manage karein.'
              : 'Aap Staff Terminal mode mein hain. Nayi test reports fill karein, results verify karein aur patient reports print karein.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('new-report')}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Fill New Report</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>All Reports</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Patient Tests</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-slate-900 mt-3 font-mono-numbers">
            {totalReports}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
            <span className="text-emerald-700 font-semibold">{completedReports} completed</span>
            <span>·</span>
            <span>All time logs</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Lab Analysis</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-slate-900 mt-3 font-mono-numbers">
            {pendingReports}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
            <span>Awaiting test result entry</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Referring Doctors</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Stethoscope className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-slate-900 mt-3 font-mono-numbers">
            {totalDoctors}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
            <span>Affiliated clinics & hospitals</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {isOwner ? 'Lab Revenue Collected' : 'Handled Patients'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              {isOwner ? <TrendingUp className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-slate-900 mt-3 font-mono-numbers">
            {isOwner ? `₹${totalRevenue.toLocaleString('en-IN')}` : `${completedReports} Processed`}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
            <span>{isOwner ? 'Gross billed collection' : 'Verified by pathologist'}</span>
          </div>
        </div>
      </div>

      {/* Main 2-column Grid: Recent Reports & Doctor Referral Leaders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reports Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold font-heading text-slate-900">Recent Patient Reports</h2>
              <p className="text-[11px] text-slate-500">Recent test orders, status & clinical reports</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 flex items-center gap-1"
            >
              <span>View All ({totalReports})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 px-4">Report No.</th>
                  <th className="py-2.5 px-4">Patient</th>
                  <th className="py-2.5 px-4">Test Name</th>
                  <th className="py-2.5 px-4">Referring Doctor</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {report.reportNo}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{report.patientName}</div>
                      <div className="text-[11px] text-slate-500">
                        {report.age} Y · {report.gender}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-800">
                      <div className="truncate max-w-[160px]">{report.testName}</div>
                      <div className="text-[10px] text-slate-400">{report.testCategory}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-[160px]">
                      {report.referringDoctorName}
                    </td>
                    <td className="py-3 px-4">
                      {report.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Ready</span>
                        </span>
                      ) : report.status === 'DELIVERED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          <span>Delivered</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>In Analysis</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectReportToPrint(report)}
                          title="View & Print Official Report"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditReport(report)}
                          title="Edit Test Results"
                          className="p-1.5 text-slate-500 hover:text-cyan-700 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Referring Doctors Summary (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold font-heading text-slate-900">Referring Doctors</h2>
                <p className="text-[11px] text-slate-500">Top referral sources & case counts</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('doctors')}
                className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
              >
                All Doctors
              </button>
            </div>

            <div className="p-4 divide-y divide-slate-100">
              {topDoctors.map((doc) => (
                <div key={doc.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">{doc.name}</h3>
                    <p className="text-[11px] text-slate-500 truncate max-w-[180px]">{doc.clinicHospital}</p>
                    <p className="text-[10px] text-slate-400">{doc.specialty}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold font-mono text-slate-900">
                      {doc.totalReferred}
                    </span>
                    <span className="block text-[10px] text-slate-400">cases</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-xl">
            <button
              type="button"
              onClick={() => onNavigate('doctors')}
              className="w-full py-2 px-3 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors shadow-2xs"
            >
              + Register New Referring Doctor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
