import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PatientReport, TestGroupResult, PrintPaperMode, PrintSettings } from '../types/lab';
import { StorageService } from '../services/storage';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Printer,
  Download,
  X,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface PrintableReportViewProps {
  report: PatientReport;
  onClose: () => void;
  onMarkDelivered: (reportId: string) => void;
  onVerifyReport?: (reportId: string) => void;
}

export const PrintableReportView: React.FC<PrintableReportViewProps> = ({
  report,
  onClose,
  onMarkDelivered,
  onVerifyReport,
}) => {
  const { labProfile, currentUser } = useAuth();

  // Load saved print preferences (top, left, right margins)
  const savedSettings = StorageService.getPrintSettings();
  const [paperMode, setPaperMode] = useState<PrintPaperMode>(savedSettings.paperMode || 'letterhead');
  const [topMarginMm, setTopMarginMm] = useState<number>(savedSettings.topMarginMm || 50);
  const [leftMarginMm, setLeftMarginMm] = useState<number>(savedSettings.leftMarginMm || 12);
  const [rightMarginMm, setRightMarginMm] = useState<number>(savedSettings.rightMarginMm || 12);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const savePreferences = (overrides?: Partial<PrintSettings>) => {
    StorageService.savePrintSettings({
      paperMode: overrides?.paperMode ?? paperMode,
      topMarginMm: overrides?.topMarginMm ?? topMarginMm,
      leftMarginMm: overrides?.leftMarginMm ?? leftMarginMm,
      rightMarginMm: overrides?.rightMarginMm ?? rightMarginMm,
      bottomMarginMm: 15,
    });
  };

  const handlePrint = () => {
    savePreferences();
    window.print();
  };

  // Direct PDF Download Generation
  const handleDownloadPdf = async () => {
    savePreferences();
    const element = document.getElementById('printable-lab-report-sheet');
    if (!element) return;

    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;

      // Additional pages if content exceeds 1 page
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`PathoCare_Report_${report.reportNo}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('PDF generate karne me problem aayi. Kripya browser ke Print option se Save as PDF karein.');
    } finally {
      setIsGeneratingPdf(false);
    }
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

  const isVerified = report.status === 'VERIFIED' || report.status === 'DELIVERED';
  const isOwner = currentUser?.role === 'owner';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6">
      {/* Dynamic Print CSS for A4 margins and doctor pre-printed stationery offset */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: ${paperMode === 'preprinted' ? '6mm' : '8mm'} ${rightMarginMm}mm 8mm ${leftMarginMm}mm;
          }
          .stationery-spacer {
            height: ${topMarginMm}mm !important;
            display: block !important;
          }
          .test-panel-print-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 1.2rem !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col my-auto border border-slate-200">
        {/* Modal Top Control Bar (Hidden during print) */}
        <div className="no-print bg-slate-900 text-white px-4 sm:px-6 py-3 border-b border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold">Official Diagnostic Report Preview</span>
              <span className="text-slate-500">·</span>
              <span className="font-mono text-xs text-cyan-300 font-bold">{report.reportNo}</span>
              <span className="text-slate-500">·</span>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Verified</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                  <Clock className="w-3 h-3 text-amber-300" />
                  <span>{report.status === 'SAMPLE_COLLECTED' ? 'Sample Collected' : 'Ready to Approve'}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Owner Action: Verify Report */}
              {isOwner && !isVerified && onVerifyReport && (
                <button
                  type="button"
                  onClick={() => onVerifyReport(report.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorize & Mark Verified</span>
                </button>
              )}

              {/* Mark Delivered */}
              {report.status !== 'DELIVERED' && (
                <button
                  type="button"
                  onClick={() => onMarkDelivered(report.id)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-md text-xs font-medium transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Delivered</span>
                </button>
              )}

              {/* Direct Download PDF Button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded-md text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
              </button>

              {/* Print Document Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-md text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
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

          {/* Print & Margin Customizer Toolbar */}
          <div className="pt-2 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            {/* Paper Type Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px] font-medium">Paper Mode:</span>
              <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setPaperMode('letterhead');
                    savePreferences({ paperMode: 'letterhead' });
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    paperMode === 'letterhead'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  1. Blank A4 (Full Letterhead)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaperMode('preprinted');
                    savePreferences({ paperMode: 'preprinted' });
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    paperMode === 'preprinted'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  2. Doctor Pre-Printed Stationery
                </button>
              </div>
            </div>

            {/* Adjustable Margins Controls (Top, Left, Right) */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700 text-[11px]">
              {paperMode === 'preprinted' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-300 font-medium">Top Offset:</span>
                  <input
                    type="range"
                    min="20"
                    max="90"
                    step="5"
                    value={topMarginMm}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTopMarginMm(val);
                      savePreferences({ topMarginMm: val });
                    }}
                    className="w-20 accent-cyan-500 cursor-pointer"
                  />
                  <span className="font-mono text-cyan-300 font-bold w-11 text-right">
                    {topMarginMm}mm
                  </span>
                </div>
              )}

              {/* Left Margin Slider */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300 font-medium">Left Margin:</span>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={leftMarginMm}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLeftMarginMm(val);
                    savePreferences({ leftMarginMm: val });
                  }}
                  className="w-20 accent-cyan-500 cursor-pointer"
                />
                <span className="font-mono text-cyan-300 font-bold w-9 text-right">
                  {leftMarginMm}mm
                </span>
              </div>

              {/* Right Margin Slider */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300 font-medium">Right Margin:</span>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={rightMarginMm}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setRightMarginMm(val);
                    savePreferences({ rightMarginMm: val });
                  }}
                  className="w-20 accent-cyan-500 cursor-pointer"
                />
                <span className="font-mono text-cyan-300 font-bold w-9 text-right">
                  {rightMarginMm}mm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* The Printable A4 Medical Lab Document */}
        <div
          id="printable-lab-report-sheet"
          className="print-only p-6 sm:p-10 bg-white text-slate-900 text-xs leading-relaxed max-w-[210mm] mx-auto w-full transition-all"
          style={{
            paddingLeft: `${leftMarginMm}mm`,
            paddingRight: `${rightMarginMm}mm`,
          }}
        >
          {/* Pre-Printed Stationery Header Offset Spacer */}
          {paperMode === 'preprinted' ? (
            <div
              className="stationery-spacer transition-all"
              style={{ height: `${topMarginMm}mm` }}
            >
              {/* Visual guidance for screen view only */}
              <div className="no-print border border-dashed border-cyan-400 bg-cyan-50/50 rounded flex items-center justify-center text-[11px] text-cyan-800 font-medium h-full">
                <span>
                  [Doctor Pre-Printed Letterhead Blank Header Area: {topMarginMm}mm (approx {(topMarginMm / 25.4).toFixed(1)} inches)]
                </span>
              </div>
            </div>
          ) : (
            /* 1. Standard Official Lab Header / Letterhead */
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

                {/* Lab Accreditation & Barcode Graphic (Internal Lab ID removed) */}
                <div className="text-right shrink-0">
                  <div className="inline-block bg-slate-50 border border-slate-200 px-3 py-1.5 rounded text-right">
                    <span className="block text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                      {labProfile.nablRegNo}
                    </span>
                    <span className="block text-[9px] text-slate-500">{labProfile.isoCertNo}</span>
                  </div>

                  {/* Barcode Graphic */}
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
          )}

          {/* 2. Patient & Referring Doctor Info Box */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3.5 mb-5 text-[11px]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4">
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

            {/* Financial Ledger Summary Line if Discount or Balance Due exists */}
            {((report.discountAmount && report.discountAmount > 0) || (report.dueAmount && report.dueAmount > 0)) && (
              <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-600 font-medium">
                <div className="flex items-center gap-3">
                  <span>Gross: <strong className="text-slate-800 font-mono">₹{report.testPrice}</strong></span>
                  {report.discountAmount && report.discountAmount > 0 && (
                    <span>Discount: <strong className="text-amber-800 font-mono">₹{report.discountAmount}</strong> ({report.discountApprovedBy || 'Authorized'})</span>
                  )}
                  <span>Net Payable: <strong className="text-slate-900 font-mono">₹{report.netPayable ?? (report.testPrice - (report.discountAmount || 0))}</strong></span>
                  <span>Paid: <strong className="text-emerald-700 font-mono">₹{report.amountPaid}</strong></span>
                </div>
                {report.dueAmount && report.dueAmount > 0 ? (
                  <span className="font-mono font-bold text-amber-700">Due Balance: ₹{report.dueAmount}</span>
                ) : (
                  <span className="font-mono font-semibold text-emerald-700">Payment Completed</span>
                )}
              </div>
            )}
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
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                      >
                        {/* Parameter Name: Keep standard black/slate font as requested */}
                        <td className="py-1.5 px-3 border-r border-slate-200 font-medium text-slate-900">
                          {p.name}
                        </td>

                        {/* Observed Value: ONLY the value is RED and BOLD when out of range! */}
                        <td
                          className={`py-1.5 px-3 border-r border-slate-200 text-center font-mono ${
                            isAbnormal
                              ? 'text-red-600 font-bold text-sm'
                              : 'font-semibold text-slate-800'
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
          <div
            className="test-panel-print-block border border-slate-200 rounded p-3 mb-4 bg-slate-50/50"
            style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Pathologist Impression & Clinical Remarks:
            </span>
            <p className="text-[11px] text-slate-800 leading-relaxed font-medium">
              {report.clinicalImpression ||
                'Test results to be interpreted in conjunction with patient clinical findings.'}
            </p>
          </div>

          {/* 4.5 Payment & Billing Receipt Summary */}
          <div
            className="test-panel-print-block border border-slate-300 border-dashed rounded p-2.5 mb-4 bg-slate-50/60 text-xs flex flex-wrap items-center justify-between gap-2"
            style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <span className="text-[9px] text-slate-500 font-semibold uppercase block">Test Gross:</span>
                <span className="font-mono font-bold text-slate-800">₹{report.testPrice}</span>
              </div>
              {(report.discountAmount ?? 0) > 0 && (
                <div>
                  <span className="text-[9px] text-amber-700 font-semibold uppercase block">Discount Given:</span>
                  <span className="font-mono font-bold text-amber-700">
                    -₹{report.discountAmount} {report.discountApprovedBy ? `(${report.discountApprovedBy})` : ''}
                  </span>
                </div>
              )}
              <div>
                <span className="text-[9px] text-slate-500 font-semibold uppercase block">Net Amount:</span>
                <span className="font-mono font-extrabold text-slate-900">
                  ₹{report.netPayable ?? (report.testPrice - (report.discountAmount || 0))}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <span className="text-[9px] text-slate-500 font-semibold uppercase block">Amount Paid:</span>
                <span className="font-mono font-bold text-emerald-700">₹{report.amountPaid}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-500 font-semibold uppercase block">Balance Due:</span>
                <span
                  className={`font-mono font-extrabold px-1.5 py-0.5 rounded text-[11px] ${
                    (report.dueAmount ?? 0) > 0
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {(report.dueAmount ?? 0) > 0 ? `₹${report.dueAmount} (DUE)` : '₹0 (CLEARED)'}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Signatures and Authorizations Block */}
          <div
            className="test-panel-print-block grid grid-cols-2 gap-8 pt-4 border-t border-slate-300 mt-4"
            style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
          >
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Analyzed & Prepared By:</p>
              <div className="h-10 flex items-end">
                <span className="font-mono text-xs text-slate-600 italic">
                  [Verified Technician Signature - {report.createdByName}]
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800">{report.createdByName}</p>
              <p className="text-[10px] text-slate-500">Medical Lab Technician (MLT / DMLT)</p>
            </div>

            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Reviewed & Authorized By:</p>
              <div className="h-10 flex items-end justify-end">
                {isVerified ? (
                  <div className="inline-flex items-center gap-1 border border-emerald-300 bg-emerald-50 px-2 py-0.5 rounded text-[10px] text-emerald-800 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Digitally Verified & Authorized</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 border border-amber-300 bg-amber-50 px-2 py-0.5 rounded text-[10px] text-amber-800 font-medium">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Awaiting Pathologist Verification</span>
                  </div>
                )}
              </div>
              <p className="text-xs font-bold text-slate-900">{labProfile.pathologistName}</p>
              <p className="text-[10px] text-slate-600">{labProfile.pathologistDegrees}</p>
              <p className="text-[9px] text-slate-500 font-mono">{labProfile.pathologistRegistration}</p>
            </div>
          </div>

          {/* 6. Footer Disclaimer (Hidden in pre-printed stationery mode) */}
          {paperMode === 'letterhead' && (
            <div className="border-t border-slate-200 mt-6 pt-3 text-[9px] text-slate-400 text-center leading-normal">
              <p>{labProfile.footerNotice}</p>
              <p className="mt-1 font-mono">
                *** END OF EXAMINATION REPORT · PRINTED ON {new Date().toLocaleString()} ***
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
