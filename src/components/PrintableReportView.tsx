import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PatientReport, TestGroupResult } from '../types/lab';
import { Printer, X, CheckCircle2, ShieldCheck, Building2, Stethoscope } from 'lucide-react';

interface PrintableReportViewProps {
  report: PatientReport;
  onClose: () => void;
  onMarkDelivered: (reportId: string) => void;
}

export const PrintableReportView: React.FC<PrintableReportViewProps> = ({
  report,
  onClose,
  onMarkDelivered,
}) => {
  const { labProfile } = useAuth();

  const handlePrint = () => {
    window.print();
  };

  // Resolve test groups: if report has testGroups use them, else fallback to single test
  const groupsToRender: TestGroupResult[] =
    report.testGroups && report.testGroups.length > 0
      ? report.testGroups
      : [
          {
            templateId: report.testTemplateId || 'single',
            testName: report.testName,
            category: report.testCategory,
            price: report.testPrice,
            parameters: report.parameters || [],
          },
        ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col my-auto border border-slate-200">
        {/* Modal Top Control Bar (Hidden during print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold">Official Clinical Diagnostic Report Preview</span>
            <span className="text-slate-500">·</span>
            <span className="font-mono text-xs text-cyan-300">{report.reportNo}</span>
          </div>

          <div className="flex items-center gap-2">
            {report.status !== 'DELIVERED' && (
              <button
                type="button"
                onClick={() => onMarkDelivered(report.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Delivered</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 Report</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The Printable A4 Medical Lab Document */}
        <div className="print-only p-6 sm:p-10 bg-white text-slate-900 text-xs leading-relaxed max-w-[210mm] mx-auto w-full">
          {/* 1. Header / Letterhead */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    P+
                  </span>
                  <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 uppercase tracking-tight">
                    {labProfile.name}
                  </h1>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-0.5">{labProfile.tagline}</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xl">{labProfile.address}</p>
                <p className="text-[11px] text-slate-500">
                  Phone: <span className="font-medium text-slate-700">{labProfile.phone}</span> · Email:{' '}
                  <span className="font-medium text-slate-700">{labProfile.email}</span>
                </p>
              </div>

              {/* Lab Accreditation & Barcode Graphic */}
              <div className="text-right shrink-0">
                <div className="inline-block bg-slate-50 border border-slate-200 px-3 py-1.5 rounded text-right">
                  <span className="block text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                    {labProfile.nablRegNo}
                  </span>
                  <span className="block text-[9px] text-slate-500">{labProfile.isoCertNo}</span>
                  <span className="block font-mono text-[10px] text-cyan-800 font-semibold mt-0.5">
                    LAB ID: {labProfile.uniqueLabId}
                  </span>
                </div>

                {/* Simulated Barcode */}
                <div className="mt-2 text-right">
                  <div className="inline-flex items-center gap-[2px] h-6 px-1 bg-slate-100 rounded">
                    <div className="w-[1px] h-full bg-slate-800" />
                    <div className="w-[2px] h-full bg-slate-800" />
                    <div className="w-[1px] h-full bg-slate-800" />
                    <div className="w-[3px] h-full bg-slate-800" />
                    <div className="w-[1px] h-full bg-slate-800" />
                    <div className="w-[2px] h-full bg-slate-800" />
                    <div className="w-[1px] h-full bg-slate-800" />
                    <div className="w-[4px] h-full bg-slate-800" />
                    <div className="w-[1px] h-full bg-slate-800" />
                  </div>
                  <span className="block font-mono text-[9px] text-slate-500 tracking-wider">
                    *{report.reportNo}*
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Patient & Referring Doctor Info Box */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3.5 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Patient Name</span>
              <span className="font-bold text-slate-900 text-xs">{report.patientName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Age / Gender</span>
              <span className="font-semibold text-slate-800">
                {report.age} Years / {report.gender}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Report Number</span>
              <span className="font-mono font-bold text-slate-900">{report.reportNo}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Token / Sample No.</span>
              <span className="font-mono font-semibold text-slate-800">#{report.tokenNo}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Referred By Doctor</span>
              <span className="font-bold text-slate-900">{report.referringDoctorName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Contact / Phone</span>
              <span className="font-medium text-slate-800">{report.phone}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Sample Collected</span>
              <span className="text-slate-700">{report.sampleCollectedAt}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Report Generated</span>
              <span className="text-slate-700">{report.reportedAt || 'Under Verification'}</span>
            </div>
          </div>

          {/* 3. Grouped Test Panels with Smart Page-Break Rules */}
          {groupsToRender.map((group, gIdx) => (
            <div
              key={group.templateId + gIdx}
              className="test-panel-print-block mb-6 border border-slate-200 rounded-lg overflow-hidden"
              style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
            >
              {/* Test Panel Heading */}
              <div className="bg-slate-900 text-white px-4 py-1.5 font-semibold flex items-center justify-between text-xs">
                <span className="uppercase tracking-wider font-heading">{group.testName}</span>
                <span className="text-[10px] text-cyan-300 font-mono uppercase">
                  {group.category}
                </span>
              </div>

              {/* Tabular Results */}
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                    <th className="py-2 px-3 border-r border-slate-200">Investigation / Parameter</th>
                    <th className="py-2 px-3 border-r border-slate-200 text-center w-28">Observed Value</th>
                    <th className="py-2 px-3 border-r border-slate-200 text-center w-24">Unit</th>
                    <th className="py-2 px-3 border-r border-slate-200">Biological Reference Interval</th>
                    <th className="py-2 px-3 text-center w-20">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {group.parameters?.map((p, idx) => {
                    const isAbnormal = p.flag === 'HIGH' || p.flag === 'LOW';

                    return (
                      <tr
                        key={p.name + idx}
                        className={
                          isAbnormal
                            ? 'bg-red-50/50'
                            : idx % 2 === 0
                            ? 'bg-white'
                            : 'bg-slate-50/40'
                        }
                      >
                        {/* Parameter Name: RED & BOLD if out of normal range! */}
                        <td
                          className={`py-1.5 px-3 border-r border-slate-200 ${
                            isAbnormal ? 'text-red-600 font-bold' : 'font-medium text-slate-900'
                          }`}
                        >
                          {p.name}
                        </td>

                        <td
                          className={`py-1.5 px-3 border-r border-slate-200 text-center font-mono font-semibold ${
                            isAbnormal ? 'text-red-600 font-bold text-sm' : 'text-slate-800'
                          }`}
                        >
                          {p.value || '-'}
                        </td>

                        <td className="py-1.5 px-3 border-r border-slate-200 text-center text-slate-500 font-mono text-[11px]">
                          {p.unit || '-'}
                        </td>

                        <td className="py-1.5 px-3 border-r border-slate-200 text-slate-600 font-mono text-[11px]">
                          {p.referenceRange}
                        </td>

                        <td className="py-1.5 px-3 text-center">
                          {p.flag === 'HIGH' ? (
                            <span className="font-bold text-red-600 text-[10px]">HIGH (H)</span>
                          ) : p.flag === 'LOW' ? (
                            <span className="font-bold text-red-600 text-[10px]">LOW (L)</span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Normal</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {/* 4. Clinical Impression Box */}
          <div className="test-panel-print-block border border-slate-200 rounded p-3 mb-6 bg-slate-50/50" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Pathologist Impression & Clinical Remarks:
            </span>
            <p className="text-[11px] text-slate-800 leading-relaxed font-medium">
              {report.clinicalImpression ||
                'Test results to be interpreted in conjunction with patient clinical findings.'}
            </p>
          </div>

          {/* 5. Signatures and Authorizations Block */}
          <div className="test-panel-print-block grid grid-cols-2 gap-8 pt-4 border-t border-slate-300 mt-4" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Analyzed & Prepared By:</p>
              <div className="h-10 flex items-end">
                <span className="font-mono text-xs text-slate-600 italic">
                  [Verified Signature - {report.createdByName}]
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800">{report.createdByName}</p>
              <p className="text-[10px] text-slate-500">Medical Lab Technician (MLT / DMLT)</p>
            </div>

            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Reviewed & Authorized By:</p>
              <div className="h-10 flex items-end justify-end">
                <div className="inline-flex items-center gap-1 border border-emerald-300 bg-emerald-50 px-2 py-0.5 rounded text-[10px] text-emerald-800 font-semibold">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Digitally Verified & Signed</span>
                </div>
              </div>
              <p className="text-xs font-bold text-slate-900">{labProfile.pathologistName}</p>
              <p className="text-[10px] text-slate-600">{labProfile.pathologistDegrees}</p>
              <p className="text-[9px] text-slate-500 font-mono">{labProfile.pathologistRegistration}</p>
            </div>
          </div>

          {/* 6. Footer Disclaimer */}
          <div className="border-t border-slate-200 mt-6 pt-3 text-[9px] text-slate-400 text-center leading-normal">
            <p>{labProfile.footerNotice}</p>
            <p className="mt-1 font-mono">
              *** END OF EXAMINATION REPORT · PRINTED ON {new Date().toLocaleString()} ***
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
