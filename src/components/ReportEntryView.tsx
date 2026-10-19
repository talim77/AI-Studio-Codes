import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  PatientReport,
  ReferringDoctor,
  TestTemplate,
  ParameterResult,
  TestGroupResult,
} from '../types/lab';
import { StorageService } from '../services/storage';
import {
  FlaskConical,
  User,
  Stethoscope,
  Save,
  Printer,
  Plus,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  X,
  Layers,
  Check,
} from 'lucide-react';

interface ReportEntryViewProps {
  initialReport?: PatientReport | null;
  doctors: ReferringDoctor[];
  testTemplates: TestTemplate[];
  onSaveReport: (report: PatientReport, shouldPrint?: boolean) => void;
  onCancel: () => void;
  onAddNewDoctor: (doc: Omit<ReferringDoctor, 'id' | 'totalReferred'>) => ReferringDoctor;
}

export const ReportEntryView: React.FC<ReportEntryViewProps> = ({
  initialReport,
  doctors,
  testTemplates,
  onSaveReport,
  onCancel,
  onAddNewDoctor,
}) => {
  const { currentUser, labProfile } = useAuth();

  // Patient Info
  const [patientName, setPatientName] = useState(initialReport?.patientName || '');
  const [age, setAge] = useState<number | string>(initialReport?.age || 32);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(initialReport?.gender || 'Male');
  const [phone, setPhone] = useState(initialReport?.phone || '');
  const [address, setAddress] = useState(initialReport?.address || '');

  // Referring Doctor
  const [selectedDoctorId, setSelectedDoctorId] = useState(
    initialReport?.referringDoctorId || (doctors[0]?.id || '')
  );

  // Quick Add Doctor modal
  const [showQuickAddDoc, setShowQuickAddDoc] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocClinic, setNewDocClinic] = useState('');
  const [newDocPhone, setNewDocPhone] = useState('');
  const [newDocSpecialty, setNewDocSpecialty] = useState('General Medicine');
  const [newDocCommissionRate, setNewDocCommissionRate] = useState(15);

  // Multi-Test Selection: Set of template IDs
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(() => {
    if (initialReport) {
      if (initialReport.testTemplateIds && initialReport.testTemplateIds.length > 0) {
        return initialReport.testTemplateIds;
      }
      if (initialReport.testGroups && initialReport.testGroups.length > 0) {
        return initialReport.testGroups.map((g) => g.templateId);
      }
      if (initialReport.testTemplateId) {
        return initialReport.testTemplateId.split(',').map((s) => s.trim());
      }
    }
    return [testTemplates[0]?.id || 'test-cbc'];
  });

  // Grouped parameters by test template
  const [testGroups, setTestGroups] = useState<TestGroupResult[]>([]);

  // Clinical impression / remarks
  const [clinicalImpression, setClinicalImpression] = useState(
    initialReport?.clinicalImpression || ''
  );

  // Financial & Status
  const [status, setStatus] = useState<'PENDING' | 'COMPLETED' | 'DELIVERED'>(
    initialReport?.status || 'COMPLETED'
  );
  const [totalPrice, setTotalPrice] = useState<number>(initialReport?.testPrice || 350);
  const [amountPaid, setAmountPaid] = useState<number>(initialReport?.amountPaid || 350);
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PARTIAL' | 'UNPAID'>(
    initialReport?.paymentStatus || 'PAID'
  );

  // Synchronize test groups whenever selected templates, gender, or age change
  useEffect(() => {
    // If editing existing report and template IDs haven't changed, retain existing values
    if (initialReport && initialReport.testGroups && initialReport.testGroups.length > 0) {
      const matchExisting =
        selectedTemplateIds.length === initialReport.testGroups.length &&
        selectedTemplateIds.every((id) => initialReport.testGroups.some((g) => g.templateId === id));
      if (matchExisting) {
        setTestGroups(initialReport.testGroups);
        return;
      }
    }

    let calculatedTotal = 0;
    const newGroups: TestGroupResult[] = [];

    selectedTemplateIds.forEach((templateId) => {
      const template = testTemplates.find((t) => t.id === templateId);
      if (!template) return;

      calculatedTotal += template.price;

      // Look if we already had entered values in previous state for this template
      const existingGroup = testGroups.find((g) => g.templateId === templateId);

      const params: ParameterResult[] = template.parameters.map((param) => {
        const existingParam = existingGroup?.parameters.find((p) => p.name === param.name);

        let refRange = param.maleRange;
        if (gender === 'Female' && param.femaleRange) {
          refRange = param.femaleRange;
        } else if (Number(age) < 14 && param.childRange) {
          refRange = param.childRange;
        } else if (param.generalRange) {
          refRange = param.generalRange;
        }

        const value = existingParam?.value || '';
        const flag = StorageService.evaluateFlag(value, param.minNormal, param.maxNormal, refRange);

        return {
          name: param.name,
          value,
          unit: param.unit,
          referenceRange: refRange,
          flag,
        };
      });

      newGroups.push({
        templateId: template.id,
        testName: template.name,
        category: template.category,
        price: template.price,
        sampleType: template.sampleType,
        parameters: params,
      });
    });

    setTestGroups(newGroups);
    setTotalPrice(calculatedTotal);
    setAmountPaid(calculatedTotal);
  }, [selectedTemplateIds, gender, age, testTemplates]);

  // Toggle test template selection
  const handleToggleTemplate = (templateId: string) => {
    setSelectedTemplateIds((prev) => {
      if (prev.includes(templateId)) {
        if (prev.length === 1) {
          alert('Kam se kam ek test select rehna zaroori hai.');
          return prev;
        }
        return prev.filter((id) => id !== templateId);
      } else {
        return [...prev, templateId];
      }
    });
  };

  // Handle parameter value change & auto-flag evaluation
  const handleParamValueChange = (
    groupIndex: number,
    paramIndex: number,
    val: string
  ) => {
    const group = testGroups[groupIndex];
    const template = testTemplates.find((t) => t.id === group.templateId);
    const paramDef = template?.parameters[paramIndex];

    const flag = StorageService.evaluateFlag(val, paramDef?.minNormal, paramDef?.maxNormal);

    setTestGroups((prev) => {
      const next = [...prev];
      const targetGroup = { ...next[groupIndex] };
      const targetParams = [...targetGroup.parameters];

      targetParams[paramIndex] = {
        ...targetParams[paramIndex],
        value: val,
        flag: flag,
      };

      targetGroup.parameters = targetParams;
      next[groupIndex] = targetGroup;
      return next;
    });
  };

  const handleQuickAddDoctorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;

    const created = onAddNewDoctor({
      labId: labProfile.uniqueLabId,
      name: newDocName.trim().startsWith('Dr.') ? newDocName.trim() : `Dr. ${newDocName.trim()}`,
      clinicHospital: newDocClinic.trim() || 'Private Clinic',
      phone: newDocPhone.trim() || '-',
      specialty: newDocSpecialty.trim(),
      qualification: 'MBBS',
      commissionRate: Number(newDocCommissionRate) || 15,
    });

    setSelectedDoctorId(created.id);
    setShowQuickAddDoc(false);
    setNewDocName('');
    setNewDocClinic('');
    setNewDocPhone('');
  };

  const handleSave = (shouldPrint: boolean) => {
    if (!patientName.trim()) {
      alert('Kripya Patient ka Naam enter karein.');
      return;
    }

    if (testGroups.length === 0) {
      alert('Kripya kam se kam ek test panel select karein.');
      return;
    }

    const doctor = doctors.find((d) => d.id === selectedDoctorId);
    const nextNums = StorageService.getNextReportNumber();
    const now = new Date();
    const formattedDate = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    // Flatten all parameters for backwards compatibility
    const allFlatParams: ParameterResult[] = testGroups.flatMap((g) => g.parameters);
    const combinedTestName = testGroups.map((g) => g.testName).join(' + ');
    const combinedCategory =
      testGroups.length > 1
        ? 'Multi-Investigation Profile'
        : testGroups[0]?.category || 'General Pathology';

    const reportData: PatientReport = {
      id: initialReport?.id || `rep-${Date.now()}`,
      reportNo: initialReport?.reportNo || nextNums.reportNo,
      tokenNo: initialReport?.tokenNo || nextNums.tokenNo,
      labId: labProfile.uniqueLabId,
      patientName: patientName.trim(),
      age: Number(age) || 0,
      gender,
      phone: phone.trim() || 'N/A',
      address: address.trim() || 'Local',
      sampleCollectedAt: initialReport?.sampleCollectedAt || formattedDate,
      reportedAt: status === 'COMPLETED' ? formattedDate : '-',
      referringDoctorId: doctor?.id || 'doc-self',
      referringDoctorName: doctor?.name || 'Self / Direct Walk-In',
      referringDoctorCommissionRate: doctor?.commissionRate ?? 15,
      testTemplateId: selectedTemplateIds.join(','),
      testTemplateIds: selectedTemplateIds,
      testName: combinedTestName,
      testCategory: combinedCategory,
      testPrice: Number(totalPrice) || 0,
      testGroups,
      parameters: allFlatParams,
      clinicalImpression: clinicalImpression.trim() || 'Findings to be correlated clinically.',
      status,
      paymentStatus,
      amountPaid: Number(amountPaid) || 0,
      createdByStaffId: currentUser?.staffUserId || 'OWNER-01',
      createdByName: currentUser?.name || 'Staff User',
      createdAt: initialReport?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveReport(reportData, shouldPrint);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold font-heading text-slate-900">
              {initialReport ? `Edit Report #${initialReport.reportNo}` : 'New Patient Lab Test Entry'}
            </h1>
            <p className="text-xs text-slate-500">
              Select multiple tests simultaneously (e.g. CBC + RBS + Urine RM + LFT), fill results with auto-red abnormal flags.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Report</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Save & Print Report</span>
          </button>
        </div>
      </div>

      {/* Patient & Doctor Information Box */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
          <User className="w-4 h-4 text-cyan-700" />
          <span>1. Patient & Referring Doctor Details</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Patient Full Name *
            </label>
            <input
              type="text"
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="e.g. Rajesh Kumar"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Age (Years) *</label>
            <input
              type="number"
              min="0"
              max="120"
              required
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500 bg-white cursor-pointer"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Area</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Sector 14, Civil Lines"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Referring Doctor Dropdown with + Add New */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5 text-cyan-700" />
                <span>Referring Doctor *</span>
              </label>
              <button
                type="button"
                onClick={() => setShowQuickAddDoc(true)}
                className="text-[11px] font-semibold text-cyan-700 hover:text-cyan-800 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Register New Doctor</span>
              </button>
            </div>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500 bg-white cursor-pointer"
            >
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} — {doc.clinicHospital} ({doc.specialty} · {doc.commissionRate || 15}% Ref Rate)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Multi-Test Selector */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-cyan-700" />
            <span>2. Select Tests Advised by Doctor (Multi-Select Allowed)</span>
          </div>

          <span className="text-xs font-semibold text-slate-600">
            Selected: <strong className="text-cyan-800">{selectedTemplateIds.length} Tests</strong> · Total:{' '}
            <strong className="text-slate-900 font-mono text-sm">₹{totalPrice}</strong>
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Click below to select one or multiple tests at once (e.g. CBC, RBS, Urine RM, LFT, Surgical Profile):
        </p>

        {/* Test selection chips / badges */}
        <div className="flex flex-wrap gap-2">
          {testTemplates.map((t) => {
            const isSelected = selectedTemplateIds.includes(t.id);

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleToggleTemplate(t.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-700 text-white border-cyan-800 shadow-xs ring-2 ring-cyan-200'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {isSelected ? (
                  <Check className="w-3.5 h-3.5 text-white shrink-0" />
                ) : (
                  <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span>{t.name}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-cyan-900/60 text-cyan-100' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  ₹{t.price}
                </span>
                {t.isPackage && (
                  <span
                    className={`text-[9px] uppercase font-bold px-1 rounded ${
                      isSelected ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    Profile
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Investigation Parameter Tables Grouped by Selected Tests */}
      <div className="space-y-6">
        {testGroups.map((group, gIdx) => (
          <div
            key={group.templateId + gIdx}
            className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
          >
            {/* Group Banner */}
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-cyan-400" />
                <h3 className="font-heading font-bold text-xs uppercase tracking-wider">
                  {group.testName}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span>{group.category}</span>
                <span>·</span>
                <span className="font-mono font-bold text-cyan-300">₹{group.price}</span>
              </div>
            </div>

            {/* Parameters Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-4 w-1/3">Investigation Parameter</th>
                    <th className="py-2.5 px-4 w-1/4">Observed Value</th>
                    <th className="py-2.5 px-4 w-1/6">Unit</th>
                    <th className="py-2.5 px-4">Standard Reference Interval</th>
                    <th className="py-2.5 px-4 text-center">Status Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {group.parameters.map((param, pIdx) => {
                    const isAbnormal = param.flag === 'HIGH' || param.flag === 'LOW';

                    return (
                      <tr
                        key={param.name + pIdx}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          isAbnormal ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        {/* Parameter Name: RED & BOLD if out of normal range! */}
                        <td
                          className={`py-2.5 px-4 font-medium ${
                            isAbnormal ? 'text-red-600 font-bold' : 'text-slate-800'
                          }`}
                        >
                          {param.name}
                        </td>

                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={param.value}
                            onChange={(e) =>
                              handleParamValueChange(gIdx, pIdx, e.target.value)
                            }
                            placeholder="Enter value"
                            className={`w-full px-2.5 py-1.5 text-xs font-mono border rounded-md focus:outline-hidden focus:ring-2 focus:ring-cyan-500 bg-white ${
                              isAbnormal
                                ? 'border-red-400 text-red-700 font-bold bg-red-50/20'
                                : 'border-slate-300 text-slate-900 font-medium'
                            }`}
                          />
                        </td>

                        <td className="py-2.5 px-4 text-slate-500 font-mono">
                          {param.unit || '-'}
                        </td>

                        <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">
                          {param.referenceRange}
                        </td>

                        {/* Status Flag */}
                        <td className="py-2.5 px-4 text-center">
                          {param.flag === 'HIGH' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-red-700 border border-red-200">
                              <AlertCircle className="w-3 h-3" />
                              <span>HIGH</span>
                            </span>
                          ) : param.flag === 'LOW' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertCircle className="w-3 h-3" />
                              <span>LOW</span>
                            </span>
                          ) : param.value ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Normal</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Impression & Financials */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Pathologist Clinical Impression / Remarks
          </label>
          <textarea
            rows={2}
            value={clinicalImpression}
            onChange={(e) => setClinicalImpression(e.target.value)}
            placeholder="e.g. Findings indicate mild microcytic hypochromic anemia. Findings to be correlated clinically."
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Total Tests Bill Amount (₹)
            </label>
            <input
              type="number"
              value={totalPrice}
              onChange={(e) => setTotalPrice(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Payment Status
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white cursor-pointer"
            >
              <option value="PAID">Paid in Full</option>
              <option value="PARTIAL">Partial Payment</option>
              <option value="UNPAID">Pending / Due</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Investigation Report Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white cursor-pointer"
            >
              <option value="COMPLETED">Completed (Verified & Ready)</option>
              <option value="PENDING">Pending (Sample in Lab)</option>
              <option value="DELIVERED">Delivered to Patient</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="text-xs text-slate-500">
          Operator: <span className="font-semibold text-slate-800">{currentUser?.name}</span> (
          {currentUser?.role === 'owner' ? 'Owner' : `Staff ID: ${currentUser?.staffUserId}`})
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Report</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="flex items-center gap-2 px-5 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Save & Print Official Report</span>
          </button>
        </div>
      </div>

      {/* Quick Add Doctor Modal */}
      {showQuickAddDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold font-heading text-slate-900">
                + Register New Referring Doctor
              </h3>
              <button
                onClick={() => setShowQuickAddDoc(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddDoctorSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Doctor Name *
                </label>
                <input
                  type="text"
                  required
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="e.g. Dr. Ramesh Verma"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinic / Hospital Name *
                </label>
                <input
                  type="text"
                  required
                  value={newDocClinic}
                  onChange={(e) => setNewDocClinic(e.target.value)}
                  placeholder="e.g. LifeCare Hospital"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Specialty
                  </label>
                  <input
                    type="text"
                    value={newDocSpecialty}
                    onChange={(e) => setNewDocSpecialty(e.target.value)}
                    placeholder="e.g. Physician"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Referral Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newDocCommissionRate}
                    onChange={(e) => setNewDocCommissionRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddDoc(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg cursor-pointer"
                >
                  Save & Select Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
