import {
  LabAccount,
  LabProfile,
  StaffMember,
  ReferringDoctor,
  TestTemplate,
  PatientReport,
  PrintSettings,
  DEFAULT_OWNER_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
  Role,
  ReportStatus,
} from '../types/lab';
import { DEFAULT_TEST_TEMPLATES } from '../data/defaultData';
import { FirestoreService } from './firestoreService';
import { ApiSyncService } from './apiSync';

const KEYS = {
  REGISTERED_LABS: 'pathocare_registered_labs_v3',
  TENANT_PREFIX: 'pathocare_tenant_data_v3_',
  ACTIVE_SESSION: 'pathocare_active_session_v3',
  GLOBAL_PRINT_SETTINGS: 'pathocare_print_settings_v3',
};

// Clean Slate: No pre-added accounts. Accounts are ONLY created when a user registers!
const INITIAL_LABS: LabAccount[] = [];

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error loading key ${key}:`, e);
    return fallback;
  }
}

function saveJson<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving key ${key}:`, e);
  }
}

export const StorageService = {
  // Multi-Tenant Lab Accounts Management
  getRegisteredLabs(): LabAccount[] {
    return loadJson<LabAccount[]>(KEYS.REGISTERED_LABS, INITIAL_LABS);
  },

  saveRegisteredLabs(labs: LabAccount[]): void {
    saveJson(KEYS.REGISTERED_LABS, labs);
  },

  findLabByUniqueId(uniqueLabId: string): LabAccount | undefined {
    const labs = this.getRegisteredLabs();
    const clean = (uniqueLabId || '').trim().toUpperCase();
    return labs.find((l) => l.uniqueLabId.trim().toUpperCase() === clean);
  },

  findLabByEmail(email: string): LabAccount | undefined {
    const labs = this.getRegisteredLabs();
    const clean = (email || '').trim().toLowerCase();
    return labs.find((l) => l.ownerEmail.trim().toLowerCase() === clean);
  },

  registerNewLab(newLab: {
    uniqueLabId: string;
    labName: string;
    ownerName: string;
    ownerEmail: string;
    password: string;
    phone: string;
    address?: string;
  }): { success: boolean; message?: string; labAccount?: LabAccount } {
    const cleanLabId = newLab.uniqueLabId.trim().toUpperCase();
    const cleanEmail = newLab.ownerEmail.trim().toLowerCase();

    // Check uniqueness
    if (this.findLabByUniqueId(cleanLabId)) {
      return {
        success: false,
        message: `Lab Unique ID "${cleanLabId}" already registered hai. Kripya doosra unique ID chunein (jaise ${cleanLabId}101).`,
      };
    }

    if (this.findLabByEmail(cleanEmail)) {
      return {
        success: false,
        message: `Email "${cleanEmail}" se already ek lab registered hai. Kripya login karein ya doosra email use karein.`,
      };
    }

    const labProfile: LabProfile = {
      id: `profile-${Date.now()}`,
      uniqueLabId: cleanLabId,
      name: newLab.labName.trim(),
      tagline: 'Clinical Pathology & Diagnostic Testing',
      address: newLab.address?.trim() || 'Laboratory Address',
      phone: newLab.phone.trim(),
      email: cleanEmail,
      nablRegNo: `NABL-${cleanLabId}-2026`,
      isoCertNo: 'ISO 15189:2022 Certified',
      pathologistName: newLab.ownerName.trim(),
      pathologistDegrees: 'MBBS, MD (Pathology)',
      pathologistRegistration: 'Reg. No: 12345',
      footerNotice: 'Computer-generated diagnostic report. For clinical correlation only.',
    };

    const labAccount: LabAccount = {
      id: `lab-${Date.now()}`,
      uniqueLabId: cleanLabId,
      ownerName: newLab.ownerName.trim(),
      ownerEmail: cleanEmail,
      passwordHash: newLab.password,
      phone: newLab.phone.trim(),
      isEmailVerified: true,
      createdAt: new Date().toISOString().split('T')[0],
      profile: labProfile,
    };

    const currentLabs = this.getRegisteredLabs();
    currentLabs.push(labAccount);
    this.saveRegisteredLabs(currentLabs);

    // Initialize clean slate tenant data (0 patients, 0 doctors, standard test catalog, owner staff)
    const initialStaff: StaffMember = {
      id: `staff-${Date.now()}`,
      labId: cleanLabId,
      staffUserId: 'OWNER-01',
      name: newLab.ownerName.trim(),
      role: 'owner',
      pin: '9999',
      designation: 'Lab Director & Chief Pathologist',
      phone: newLab.phone.trim(),
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
      permissions: DEFAULT_OWNER_PERMISSIONS,
    };

    this.saveStaffMembers(cleanLabId, [initialStaff]);
    this.saveDoctors(cleanLabId, [
      {
        id: `doc-${Date.now()}-self`,
        labId: cleanLabId,
        name: 'Self / Direct Walk-In',
        qualification: 'N/A',
        clinicHospital: 'Direct Patient Intake',
        phone: '-',
        specialty: 'General Screening',
        commissionRate: 0,
        totalReferred: 0,
      },
    ]);
    this.saveTestTemplates(cleanLabId, DEFAULT_TEST_TEMPLATES);
    this.savePatientReports(cleanLabId, []); // CLEAN SLATE: 0 dummy patient reports!

    // Async sync to Firestore Cloud Database
    FirestoreService.saveLabAccount(labAccount).catch((err) =>
      console.warn('Firestore cloud lab sync:', err)
    );
    FirestoreService.saveStaffMember(cleanLabId, initialStaff).catch((err) =>
      console.warn('Firestore cloud staff sync:', err)
    );

    return { success: true, labAccount };
  },

  // Tenant-Scoped Data Methods
  getLabProfile(labId?: string): LabProfile {
    const cleanId = (labId || '').trim().toUpperCase();
    const lab = this.findLabByUniqueId(cleanId);
    if (lab) return lab.profile;
    return {
      id: 'profile-default',
      uniqueLabId: cleanId || 'PATHOCARE',
      name: 'PathoCare Diagnostic System',
      tagline: 'Clinical Pathology & Diagnostic Testing',
      address: 'Central Diagnostic Network',
      phone: '',
      email: '',
      nablRegNo: '',
      pathologistName: 'Chief Pathologist',
      pathologistDegrees: 'MBBS, MD',
      pathologistRegistration: '',
      footerNotice: 'Computer-generated diagnostic report.',
    };
  },

  saveLabProfile(labId: string, profile: LabProfile): void {
    const cleanId = (labId || profile.uniqueLabId).trim().toUpperCase();
    const labs = this.getRegisteredLabs();
    const index = labs.findIndex((l) => l.uniqueLabId.trim().toUpperCase() === cleanId);
    if (index !== -1) {
      labs[index].profile = profile;
      this.saveRegisteredLabs(labs);
    }
  },

  getStaffMembers(labId?: string): StaffMember[] {
    const cleanId = (labId || '').trim().toUpperCase();
    if (!cleanId) return [];
    const key = `${KEYS.TENANT_PREFIX}${cleanId}_staff`;
    return loadJson<StaffMember[]>(key, []);
  },

  saveStaffMembers(labId: string, staff: StaffMember[]): void {
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const key = `${KEYS.TENANT_PREFIX}${cleanId}_staff`;
    saveJson(key, staff);
  },

  addStaffMember(labId: string, member: Omit<StaffMember, 'id' | 'createdAt'>): StaffMember {
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const current = this.getStaffMembers(cleanId);
    const newMember: StaffMember = {
      ...member,
      id: `staff-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      permissions:
        member.permissions ||
        (member.role === 'owner' ? DEFAULT_OWNER_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS),
    };
    current.push(newMember);
    this.saveStaffMembers(cleanId, current);

    // Sync to backend database & cloud
    ApiSyncService.saveStaffMember(cleanId, newMember).catch(() => {});
    FirestoreService.saveStaffMember(cleanId, newMember).catch((err) =>
      console.warn('Firestore cloud add staff:', err)
    );
    return newMember;
  },

  updateStaffMember(labId: string, id: string, updates: Partial<StaffMember>): void {
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const current = this.getStaffMembers(cleanId);
    const index = current.findIndex((s) => s.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      this.saveStaffMembers(cleanId, current);

      // Sync to backend database & cloud
      ApiSyncService.saveStaffMember(cleanId, current[index]).catch(() => {});
      FirestoreService.updateStaffMember(cleanId, id, updates).catch((err) =>
        console.warn('Firestore cloud update staff:', err)
      );
    }
  },

  deleteStaffMember(labId: string, id: string): void {
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const current = this.getStaffMembers(cleanId).filter((s) => s.id !== id);
    this.saveStaffMembers(cleanId, current);
    FirestoreService.deleteStaffMember(cleanId, id).catch((err) =>
      console.warn('Firestore cloud delete staff:', err)
    );
  },

  updateStaffPin(
    labId: string,
    staffUserId: string,
    newPin: string,
    isCustomized: boolean = true
  ): boolean {
    const cleanLabId = (labId || 'LARI786').trim().toUpperCase();
    const cleanStaffId = staffUserId.trim().toUpperCase();
    const current = this.getStaffMembers(cleanLabId);
    const index = current.findIndex(
      (s) => s.staffUserId.trim().toUpperCase() === cleanStaffId
    );
    if (index !== -1) {
      current[index] = {
        ...current[index],
        pin: newPin.trim(),
        isPinCustomized: isCustomized,
        pinUpdatedAt: new Date().toISOString(),
      };
      this.saveStaffMembers(cleanLabId, current);
      FirestoreService.updateStaffMember(cleanLabId, current[index].id, {
        pin: newPin.trim(),
        isPinCustomized: isCustomized,
        pinUpdatedAt: current[index].pinUpdatedAt,
      }).catch((err) => console.warn('Firestore cloud update staff PIN:', err));
      return true;
    }
    return false;
  },

  resetStaffPinToDefault(labId: string, staffUserId: string, defaultPin: string): boolean {
    return this.updateStaffPin(labId, staffUserId, defaultPin, false);
  },

  getDoctors(labId?: string): ReferringDoctor[] {
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const key = `${KEYS.TENANT_PREFIX}${cleanId}_doctors`;
    const fallback = [
      {
        id: `doc-${cleanId}-self`,
        labId: cleanId,
        name: 'Self / Direct Walk-In',
        qualification: 'N/A',
        clinicHospital: 'Direct Patient Intake',
        phone: '-',
        specialty: 'General Screening',
        commissionRate: 0,
        totalReferred: 0,
      },
    ];
    return loadJson<ReferringDoctor[]>(key, fallback);
  },

  saveDoctors(labId: string, doctors: ReferringDoctor[]): void {
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const key = `${KEYS.TENANT_PREFIX}${cleanId}_doctors`;
    saveJson(key, doctors);
  },

  addDoctor(labId: string, doc: Omit<ReferringDoctor, 'id' | 'totalReferred'>): ReferringDoctor {
    const current = this.getDoctors(labId);
    const newDoc: ReferringDoctor = {
      ...doc,
      id: `doc-${Date.now()}`,
      labId,
      totalReferred: 0,
      commissionRate: doc.commissionRate ?? 15,
    };
    current.push(newDoc);
    this.saveDoctors(labId, current);
    return newDoc;
  },

  updateDoctor(labId: string, id: string, updates: Partial<ReferringDoctor>): void {
    const current = this.getDoctors(labId);
    const index = current.findIndex((d) => d.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      this.saveDoctors(labId, current);
    }
  },

  getTestTemplates(labId?: string): TestTemplate[] {
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const key = `${KEYS.TENANT_PREFIX}${cleanId}_templates`;
    return loadJson<TestTemplate[]>(key, DEFAULT_TEST_TEMPLATES);
  },

  saveTestTemplates(labId: string, templates: TestTemplate[]): void {
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const key = `${KEYS.TENANT_PREFIX}${cleanId}_templates`;
    saveJson(key, templates);
  },

  addTestTemplate(labId: string, template: Omit<TestTemplate, 'id'>): TestTemplate {
    const current = this.getTestTemplates(labId);
    const newT: TestTemplate = {
      ...template,
      id: `test-${Date.now()}`,
      labId,
    };
    current.push(newT);
    this.saveTestTemplates(labId, current);
    return newT;
  },

  updateTestTemplate(labId: string, id: string, updates: Partial<TestTemplate>): void {
    const current = this.getTestTemplates(labId);
    const index = current.findIndex((t) => t.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      this.saveTestTemplates(labId, current);
    }
  },

  deleteTestTemplate(labId: string, id: string): void {
    const current = this.getTestTemplates(labId).filter((t) => t.id !== id);
    this.saveTestTemplates(labId, current);
  },

  getPatientReports(labId?: string): PatientReport[] {
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const key = `${KEYS.TENANT_PREFIX}${cleanId}_reports`;
    return loadJson<PatientReport[]>(key, []); // CLEAN: 0 fake patient reports by default!
  },

  savePatientReports(labId: string, reports: PatientReport[]): void {
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const key = `${KEYS.TENANT_PREFIX}${cleanId}_reports`;
    saveJson(key, reports);
  },

  getNextReportNumber(labId?: string): { reportNo: string; tokenNo: number } {
    const reports = this.getPatientReports(labId);
    const maxToken = reports.reduce((max, r) => (r.tokenNo > max ? r.tokenNo : max), 100);
    const nextToken = maxToken + 1;
    const year = new Date().getFullYear();
    const formattedToken = String(nextToken).padStart(4, '0');
    return {
      reportNo: `REP-${year}-${formattedToken}`,
      tokenNo: nextToken,
    };
  },

  addPatientReport(labId: string, report: Omit<PatientReport, 'id' | 'createdAt' | 'updatedAt'>): PatientReport {
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const current = this.getPatientReports(cleanId);
    const now = new Date().toISOString();
    const newReport: PatientReport = {
      ...report,
      id: `rep-${Date.now()}`,
      labId: cleanId,
      createdAt: now,
      updatedAt: now,
    };
    current.unshift(newReport);
    this.savePatientReports(cleanId, current);

    // Increment doctor referred count
    if (report.referringDoctorId) {
      const doctors = this.getDoctors(cleanId);
      const doc = doctors.find((d) => d.id === report.referringDoctorId);
      if (doc) {
        doc.totalReferred = (doc.totalReferred || 0) + 1;
        this.saveDoctors(cleanId, doctors);
        FirestoreService.saveDoctor(cleanId, doc).catch((err) =>
          console.warn('Firestore doctor sync:', err)
        );
      }
    }

    // Sync to backend server & Firestore Cloud Database
    ApiSyncService.savePatientReport(cleanId, newReport).catch(() => {});
    FirestoreService.saveReport(cleanId, newReport).catch((err) =>
      console.warn('Firestore cloud add report:', err)
    );

    return newReport;
  },

  updatePatientReport(labId: string, id: string, updates: Partial<PatientReport>): void {
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const current = this.getPatientReports(cleanId);
    const index = current.findIndex((r) => r.id === id);
    if (index !== -1) {
      current[index] = {
        ...current[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.savePatientReports(cleanId, current);
      ApiSyncService.savePatientReport(cleanId, current[index]).catch(() => {});
      FirestoreService.updateReport(cleanId, id, updates).catch((err) =>
        console.warn('Firestore cloud update report:', err)
      );
    }
  },

  updateReportStatus(
    labId: string,
    reportId: string,
    newStatus: ReportStatus,
    user: { role: Role; name: string }
  ): { success: boolean; message?: string } {
    if (newStatus === 'VERIFIED' && user.role !== 'owner') {
      return {
        success: false,
        message: 'Sirf Lab Owner / Chief Pathologist hi report ko VERIFIED mark kar sakte hain.',
      };
    }

    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const current = this.getPatientReports(cleanId);
    const index = current.findIndex((r) => r.id === reportId);
    if (index === -1) {
      return { success: false, message: 'Report nahi mili.' };
    }

    const rep = current[index];
    const now = new Date();
    const formattedDate = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const updates: Partial<PatientReport> = {
      status: newStatus,
      updatedAt: now.toISOString(),
    };

    if (newStatus === 'VERIFIED') {
      updates.verifiedBy = user.name;
      updates.verifiedAt = formattedDate;
      if (!rep.reportedAt || rep.reportedAt === '-') {
        updates.reportedAt = formattedDate;
      }
    }

    current[index] = {
      ...rep,
      ...updates,
    };

    this.savePatientReports(cleanId, current);
    FirestoreService.updateReport(cleanId, reportId, updates).catch((err) =>
      console.warn('Firestore cloud update status:', err)
    );
    return { success: true };
  },

  deletePatientReport(labId: string, id: string): void {
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const current = this.getPatientReports(cleanId).filter((r) => r.id !== id);
    this.savePatientReports(cleanId, current);
    ApiSyncService.deletePatientReport(cleanId, id).catch(() => {});
    FirestoreService.deleteReport(cleanId, id).catch((err) =>
      console.warn('Firestore cloud delete report:', err)
    );
  },

  // Evaluate parameter value against standard min and max
  evaluateFlag(valueStr: string, minNormal?: number, maxNormal?: number, refRangeText?: string): 'NORMAL' | 'HIGH' | 'LOW' {
    if (!valueStr || valueStr.trim() === '') return 'NORMAL';
    const cleanVal = valueStr.trim();
    const num = parseFloat(cleanVal);

    if (!isNaN(num)) {
      if (minNormal !== undefined && num < minNormal) return 'LOW';
      if (maxNormal !== undefined && num > maxNormal) return 'HIGH';
      return 'NORMAL';
    }

    const upper = cleanVal.toUpperCase();
    if (
      upper === 'POSITIVE' ||
      upper === 'REACTIVE' ||
      upper === 'PRESENT' ||
      upper === 'TRACE' ||
      upper.startsWith('+') ||
      upper === 'HIGH' ||
      upper === 'TURBID'
    ) {
      return 'HIGH';
    }
    if (upper === 'DEFICIENT' || upper === 'LOW') {
      return 'LOW';
    }

    return 'NORMAL';
  },

  // Print settings (paperMode, topMarginMm, leftMarginMm, rightMarginMm)
  getPrintSettings(): PrintSettings {
    return loadJson<PrintSettings>(KEYS.GLOBAL_PRINT_SETTINGS, {
      paperMode: 'letterhead',
      topMarginMm: 50,
      leftMarginMm: 12,
      rightMarginMm: 12,
      bottomMarginMm: 15,
    });
  },

  savePrintSettings(settings: PrintSettings): void {
    saveJson(KEYS.GLOBAL_PRINT_SETTINGS, settings);
  },

  // Backup and Restore
  exportFullBackup(labId?: string): string {
    const currentLabs = this.getRegisteredLabs();
    const currentLabId = (labId || 'LARI786').trim().toUpperCase();
    const data = {
      version: 4,
      exportedAt: new Date().toISOString(),
      labId: currentLabId,
      labs: currentLabs,
      profile: this.getLabProfile(currentLabId),
      staff: this.getStaffMembers(currentLabId),
      doctors: this.getDoctors(currentLabId),
      templates: this.getTestTemplates(currentLabId),
      reports: this.getPatientReports(currentLabId),
    };
    return JSON.stringify(data, null, 2);
  },

  restoreBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (!data || !data.labId) return false;
      const labId = data.labId.trim().toUpperCase();
      if (data.profile) this.saveLabProfile(labId, data.profile);
      if (data.staff) this.saveStaffMembers(labId, data.staff);
      if (data.doctors) this.saveDoctors(labId, data.doctors);
      if (data.templates) this.saveTestTemplates(labId, data.templates);
      if (data.reports) this.savePatientReports(labId, data.reports);
      if (data.labs && Array.isArray(data.labs)) this.saveRegisteredLabs(data.labs);
      return true;
    } catch (e) {
      console.error('Failed to restore backup:', e);
      return false;
    }
  },

  resetToFactoryDemo(): void {
    // Reset to clean slate (0 patient reports)
    this.saveRegisteredLabs(INITIAL_LABS);
    this.savePatientReports('LARI786', []);
    this.savePatientReports('APEX-LAB-101', []);
  },
};

