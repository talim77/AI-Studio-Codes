import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PatientReport, LabProfile, PrintSettings } from '../types/lab';

/**
 * Generates and downloads a clean, multi-page vector-resolution A4 PDF for any PatientReport.
 * Handles both letterhead and doctor pre-printed stationery offsets with adjustable margins.
 */
export async function downloadReportPdf(
  report: PatientReport,
  labProfile: LabProfile,
  settings?: Partial<PrintSettings>
): Promise<void> {
  const paperMode = settings?.paperMode || 'letterhead';
  const topMarginMm = settings?.topMarginMm ?? (paperMode === 'preprinted' ? 50 : 0);
  const leftMarginMm = settings?.leftMarginMm ?? 12;
  const rightMarginMm = settings?.rightMarginMm ?? 12;

  // Resolve test groups: if report has testGroups use them, else fallback to single test
  const groupsToRender =
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

  // Create an off-screen container for rendering
  const container = document.createElement('div');
  container.id = 'temp-pdf-render-container';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // ~210mm at 96 DPI
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.fontSize = '12px';
  container.style.lineHeight = '1.4';
  container.style.padding = `20px ${rightMarginMm * 3.78}px 24px ${leftMarginMm * 3.78}px`;
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-1000';

  // Build the HTML content
  let headerHtml = '';
  if (paperMode === 'letterhead') {
    headerHtml = `
      <div style="border-bottom: 2px solid #0891b2; padding-bottom: 12px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1 style="font-size: 20px; font-weight: 800; color: #0e7490; margin: 0; text-transform: uppercase; letter-spacing: -0.5px;">
              ${labProfile.name}
            </h1>
            <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0; font-weight: 600;">
              ${labProfile.tagline}
            </p>
            <p style="font-size: 10px; color: #475569; margin: 4px 0 0 0;">
              ${labProfile.address} · Phone: ${labProfile.phone}
            </p>
          </div>
          <div style="text-align: right; font-size: 10px; color: #475569;">
            <p style="margin: 0; font-weight: 700; color: #0891b2;">Govt / NABL Reg: ${labProfile.nablRegNo}</p>
            <p style="margin: 2px 0 0 0;">Email: ${labProfile.email}</p>
            ${isVerified ? '<span style="display: inline-block; margin-top: 4px; padding: 2px 8px; background: #ecfdf5; border: 1px solid #10b981; color: #065f46; font-weight: 700; font-size: 10px; border-radius: 4px;">DIGITALLY VERIFIED REPORT</span>' : '<span style="display: inline-block; margin-top: 4px; padding: 2px 8px; background: #fffbeb; border: 1px solid #f59e0b; color: #92400e; font-weight: 600; font-size: 10px; border-radius: 4px;">PROVISIONAL / READY</span>'}
          </div>
        </div>
      </div>
    `;
  } else {
    // Pre-printed offset spacer
    headerHtml = `
      <div style="height: ${topMarginMm * 3.78}px; width: 100%;"></div>
    `;
  }

  // Patient Demographics Table
  const demographicsHtml = `
    <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; background-color: #f8fafc; font-size: 11px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 3px 0; width: 50%;">
            <strong style="color: #64748b;">Patient Name:</strong> <span style="font-weight: 800; font-size: 12px; color: #0f172a;">${report.patientName}</span>
          </td>
          <td style="padding: 3px 0; width: 50%;">
            <strong style="color: #64748b;">Report No:</strong> <span style="font-family: monospace; font-weight: 700; color: #0891b2;">${report.reportNo}</span> (Token #${report.tokenNo})
          </td>
        </tr>
        <tr>
          <td style="padding: 3px 0;">
            <strong style="color: #64748b;">Age / Gender:</strong> ${report.age} Y / ${report.gender} · <strong>Phone:</strong> ${report.phone}
          </td>
          <td style="padding: 3px 0;">
            <strong style="color: #64748b;">Sample Collected:</strong> ${report.sampleCollectedAt}
          </td>
        </tr>
        <tr>
          <td style="padding: 3px 0;">
            <strong style="color: #64748b;">Ref Doctor:</strong> <span style="font-weight: 700; color: #0f172a;">${report.referringDoctorName}</span>
          </td>
          <td style="padding: 3px 0;">
            <strong style="color: #64748b;">Reported Date:</strong> ${report.reportedAt || 'Same Day'}
          </td>
        </tr>
      </table>
    </div>
  `;

  // Test Panels & Parameters
  let testPanelsHtml = '';
  groupsToRender.forEach((group) => {
    let rowsHtml = '';
    group.parameters?.forEach((p, idx) => {
      const isAbnormal = p.flag === 'HIGH' || p.flag === 'LOW';
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const valStyle = isAbnormal
        ? 'color: #dc2626; font-weight: 800; font-size: 13px; font-family: monospace;'
        : 'color: #1e293b; font-weight: 600; font-family: monospace;';
      const flagText = isAbnormal ? `<span style="color: #dc2626; font-weight: 800;">${p.flag}</span>` : '<span style="color: #94a3b8;">Normal</span>';

      rowsHtml += `
        <tr style="background-color: ${bg}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 6px 10px; font-weight: 500; color: #0f172a; border-right: 1px solid #e2e8f0;">${p.name}</td>
          <td style="padding: 6px 10px; text-align: center; border-right: 1px solid #e2e8f0; ${valStyle}">${p.value || '-'}</td>
          <td style="padding: 6px 10px; text-align: center; border-right: 1px solid #e2e8f0; color: #64748b; font-size: 10px; font-family: monospace;">${p.unit || '-'}</td>
          <td style="padding: 6px 10px; border-right: 1px solid #e2e8f0; color: #475569; font-size: 10px; font-family: monospace;">${p.referenceRange}</td>
          <td style="padding: 6px 10px; text-align: center; font-size: 10px;">${flagText}</td>
        </tr>
      `;
    });

    testPanelsHtml += `
      <div style="margin-bottom: 14px; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; page-break-inside: avoid;">
        <div style="background-color: #0f172a; color: #ffffff; padding: 6px 12px; font-weight: 700; font-size: 11px; display: flex; justify-content: space-between; text-transform: uppercase;">
          <span>${group.testName}</span>
          <span style="color: #67e8f9; font-size: 9px;">${group.category}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background-color: #f1f5f9; color: #334155; font-weight: 700; font-size: 10px; border-bottom: 1px solid #cbd5e1;">
              <th style="padding: 6px 10px; text-align: left; border-right: 1px solid #cbd5e1;">Investigation / Parameter</th>
              <th style="padding: 6px 10px; text-align: center; width: 110px; border-right: 1px solid #cbd5e1;">Observed Value</th>
              <th style="padding: 6px 10px; text-align: center; width: 80px; border-right: 1px solid #cbd5e1;">Unit</th>
              <th style="padding: 6px 10px; text-align: left; border-right: 1px solid #cbd5e1;">Reference Interval</th>
              <th style="padding: 6px 10px; text-align: center; width: 70px;">Flag</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  });

  // Clinical Impression & Remarks
  const impressionHtml = `
    <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px 12px; margin-bottom: 12px; background-color: #f8fafc; page-break-inside: avoid;">
      <span style="display: block; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">
        Clinical Remarks / Impression:
      </span>
      <p style="margin: 0; font-size: 11px; color: #1e293b; font-weight: 500;">
        ${report.clinicalImpression || 'Findings to be correlated clinically with patient symptoms.'}
      </p>
    </div>
  `;

  // Billing & Payment Summary Receipt Box
  const discountVal = report.discountAmount || 0;
  const netPayableVal = report.netPayable ?? (report.testPrice - discountVal);
  const paidVal = report.amountPaid ?? 0;
  const dueVal = report.dueAmount ?? Math.max(0, netPayableVal - paidVal);

  const billingHtml = `
    <div style="border: 1px dashed #cbd5e1; border-radius: 4px; padding: 6px 12px; margin-bottom: 14px; background-color: #fafafa; font-size: 10px; display: flex; justify-content: space-between; align-items: center; page-break-inside: avoid;">
      <div>
        <strong style="color: #475569;">Billing Summary:</strong>
        <span style="margin-left: 8px; color: #334155;">Test Gross: ₹${report.testPrice}</span>
        ${discountVal > 0 ? `<span style="margin-left: 8px; color: #d97706;">Discount: -₹${discountVal} ${report.discountApprovedBy ? `(${report.discountApprovedBy})` : ''}</span>` : ''}
        <span style="margin-left: 8px; font-weight: 700; color: #0f172a;">Net: ₹${netPayableVal}</span>
      </div>
      <div>
        <span style="color: #047857; font-weight: 700;">Paid: ₹${paidVal}</span>
        ${dueVal > 0 ? `<span style="margin-left: 8px; color: #b91c1c; font-weight: 800; background: #fee2e2; padding: 2px 6px; border-radius: 3px;">Balance Due: ₹${dueVal}</span>` : '<span style="margin-left: 8px; color: #047857; font-weight: 700; background: #d1fae5; padding: 2px 6px; border-radius: 3px;">No Dues</span>'}
      </div>
    </div>
  `;

  // Signatures
  const signaturesHtml = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 10px; border-top: 1px solid #cbd5e1; page-break-inside: avoid;">
      <div>
        <p style="margin: 0; font-size: 9px; color: #64748b; font-weight: 600; text-transform: uppercase;">Sample Analyzed By:</p>
        <p style="margin: 18px 0 2px 0; font-size: 11px; font-weight: 700; color: #0f172a;">${report.createdByName}</p>
        <p style="margin: 0; font-size: 10px; color: #64748b;">Medical Lab Technician</p>
      </div>
      <div style="text-align: right;">
        <p style="margin: 0; font-size: 9px; color: #64748b; font-weight: 600; text-transform: uppercase;">Checked & Authorized By:</p>
        ${isVerified ? '<div style="margin: 6px 0; display: inline-block; padding: 2px 8px; background: #ecfdf5; border: 1px solid #10b981; color: #065f46; font-size: 10px; font-weight: 700; border-radius: 4px;">✓ DIGITALLY VERIFIED BY PATHOLOGIST</div>' : '<div style="margin: 6px 0; display: inline-block; padding: 2px 8px; background: #fffbeb; border: 1px solid #f59e0b; color: #92400e; font-size: 10px; font-weight: 600; border-radius: 4px;">PENDING VERIFICATION</div>'}
        <p style="margin: 4px 0 2px 0; font-size: 11px; font-weight: 800; color: #0f172a;">${labProfile.pathologistName}</p>
        <p style="margin: 0; font-size: 10px; color: #475569;">${labProfile.pathologistDegrees}</p>
        <p style="margin: 0; font-size: 9px; color: #64748b; font-family: monospace;">${labProfile.pathologistRegistration}</p>
      </div>
    </div>
  `;

  // Footer disclaimer
  const footerHtml = paperMode === 'letterhead' ? `
    <div style="margin-top: 14px; padding-top: 8px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 9px; color: #94a3b8; page-break-inside: avoid;">
      <p style="margin: 0;">${labProfile.footerNotice || 'Strictly for diagnostic purposes. Not for medico-legal use.'}</p>
      <p style="margin: 2px 0 0 0; font-family: monospace;">*** END OF EXAMINATION REPORT · GENERATED ON ${new Date().toLocaleDateString()} ***</p>
    </div>
  ` : '';

  container.innerHTML = `
    ${headerHtml}
    ${demographicsHtml}
    ${testPanelsHtml}
    ${impressionHtml}
    ${billingHtml}
    ${signaturesHtml}
    ${footerHtml}
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
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

    // Additional pages if needed
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Report_${report.reportNo}.pdf`);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
