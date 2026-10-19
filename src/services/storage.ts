import {
  LabProfile,
  StaffMember,
  ReferringDoctor,
  TestTemplate,
  PatientReport,
  ParameterResult,
  DEFAULT_OWNER_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
} from '../types/lab';
import {
  DEFAULT_LAB_PROFILE,
  DEFAULT_STAFF_MEMBERS,
  DEFAULT_DOCTORS,
  DEFAULT_TEST_TEMPLATES,
  DEFAULT_PATIENT_REPORTS,
} from '../data/defaultData';

const KEYS = {
  LAB_PROFILE: 'pathocare_lab_profile_v2',
  STAFF_MEMBERS: 'pathocare_staff_members_v2',
  DOCTORS: 'pathocare_doctors_v2',
  TEST_TEMPLATES: 'pathocare_test_templates_v2',
  PATIENT_REPORTS: 'pathocare_patient_reports_v2',
};

// Generic safe loader
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Check v1 migration if exists
      const v1Key = key.replace('_v2', '_v1');
      const oldRaw = localStorage.getItem(v1Key);
      if (oldRaw) {
        return JSON.parse(oldRaw);
      }
      return fallback;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error loading ${key} from storage:`, e);
    return fallback;
  }
}

// Generic safe saver
function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
}

export const StorageService = {
  getLabProfile(): LabProfile {
    return loadFromStorage<LabProfile>(KEYS.LAB_PROFILE, DEFAULT_LAB_PROFILE);
  },

  saveLabProfile(profile: LabProfile): void {
    saveToStorage(KEYS.LAB_PROFILE, profile);
  },

  getStaffMembers(): StaffMember[] {
    const list = loadFromStorage<StaffMember[]>(KEYS.STAFF_MEMBERS, DEFAULT_STAFF_MEMBERS);
    // Ensure permissions exist on all staff
    return list.map((s) => ({
      ...s,
      permissions: s.permissions || (s.role === 'owner' ? DEFAULT_OWNER_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS),
    }));
  },

  saveStaffMembers(staff: StaffMember[]): void {
    saveToStorage(KEYS.STAFF_MEMBERS, staff);
  },

  addStaffMember(member: Omit<StaffMember, 'id' | 'createdAt'>): StaffMember {
    const current = this.getStaffMembers();
    const newMember: StaffMember = {
      ...member,
      id: `staff-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      permissions: member.permissions || (member.role === 'owner' ? DEFAULT_OWNER_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS),
    };
    current.push(newMember);
    this.saveStaffMembers(current);
    return newMember;
  },

  updateStaffMember(id: string, updates: Partial<StaffMember>): void {
    const current = this.getStaffMembers();
    const index = current.findIndex((s) => s.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      this.saveStaffMembers(current);
    }
  },

  deleteStaffMember(id: string): void {
    const current = this.getStaffMembers().filter((s) => s.id !== id);
    this.saveStaffMembers(current);
  },

  getDoctors(): ReferringDoctor[] {
    return loadFromStorage<ReferringDoctor[]>(KEYS.DOCTORS, DEFAULT_DOCTORS);
  },

  saveDoctors(doctors: ReferringDoctor[]): void {
    saveToStorage(KEYS.DOCTORS, doctors);
  },

  addDoctor(doc: Omit<ReferringDoctor, 'id' | 'totalReferred'>): ReferringDoctor {
    const current = this.getDoctors();
    const newDoc: ReferringDoctor = {
      ...doc,
      id: `doc-${Date.now()}`,
      totalReferred: 0,
      commissionRate: doc.commissionRate ?? 15,
    };
    current.push(newDoc);
    this.saveDoctors(current);
    return newDoc;
  },

  updateDoctor(id: string, updates: Partial<ReferringDoctor>): void {
    const current = this.getDoctors();
    const index = current.findIndex((d) => d.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      this.saveDoctors(current);
    }
  },

  incrementDoctorReferredCount(doctorId: string): void {
    const current = this.getDoctors();
    const doc = current.find((d) => d.id === doctorId);
    if (doc) {
      doc.totalReferred = (doc.totalReferred || 0) + 1;
      this.saveDoctors(current);
    }
  },

  getTestTemplates(): TestTemplate[] {
    const templates = loadFromStorage<TestTemplate[]>(KEYS.TEST_TEMPLATES, DEFAULT_TEST_TEMPLATES);
    // If user has existing templates but no packages, merge default packages in
    const hasSurgical = templates.some((t) => t.id === 'package-surgical-profile');
    if (!hasSurgical) {
      const defaultSurgical = DEFAULT_TEST_TEMPLATES.find((t) => t.id === 'package-surgical-profile');
      const defaultFever = DEFAULT_TEST_TEMPLATES.find((t) => t.id === 'package-fever-profile');
      if (defaultSurgical) templates.push(defaultSurgical);
      if (defaultFever) templates.push(defaultFever);
    }
    return templates;
  },

  saveTestTemplates(templates: TestTemplate[]): void {
    saveToStorage(KEYS.TEST_TEMPLATES, templates);
  },

  addTestTemplate(template: Omit<TestTemplate, 'id'>): TestTemplate {
    const current = this.getTestTemplates();
    const newT: TestTemplate = {
      ...template,
      id: `test-${Date.now()}`,
    };
    current.push(newT);
    this.saveTestTemplates(current);
    return newT;
  },

  updateTestTemplate(id: string, updates: Partial<TestTemplate>): void {
    const current = this.getTestTemplates();
    const index = current.findIndex((t) => t.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      this.saveTestTemplates(current);
    }
  },

  deleteTestTemplate(id: string): void {
    const current = this.getTestTemplates().filter((t) => t.id !== id);
    this.saveTestTemplates(current);
  },

  getPatientReports(): PatientReport[] {
    return loadFromStorage<PatientReport[]>(KEYS.PATIENT_REPORTS, DEFAULT_PATIENT_REPORTS);
  },

  savePatientReports(reports: PatientReport[]): void {
    saveToStorage(KEYS.PATIENT_REPORTS, reports);
  },

  getNextReportNumber(): { reportNo: string; tokenNo: number } {
    const reports = this.getPatientReports();
    const maxToken = reports.reduce((max, r) => (r.tokenNo > max ? r.tokenNo : max), 100);
    const nextToken = maxToken + 1;
    const year = new Date().getFullYear();
    const formattedToken = String(nextToken).padStart(4, '0');
    return {
      reportNo: `REP-${year}-${formattedToken}`,
      tokenNo: nextToken,
    };
  },

  addPatientReport(report: Omit<PatientReport, 'id' | 'createdAt' | 'updatedAt'>): PatientReport {
    const current = this.getPatientReports();
    const now = new Date().toISOString();
    const newReport: PatientReport = {
      ...report,
      id: `rep-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    current.unshift(newReport);
    this.savePatientReports(current);
    if (report.referringDoctorId) {
      this.incrementDoctorReferredCount(report.referringDoctorId);
    }
    return newReport;
  },

  updatePatientReport(id: string, updates: Partial<PatientReport>): void {
    const current = this.getPatientReports();
    const index = current.findIndex((r) => r.id === id);
    if (index !== -1) {
      current[index] = {
        ...current[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.savePatientReports(current);
    }
  },

  deletePatientReport(id: string): void {
    const current = this.getPatientReports().filter((r) => r.id !== id);
    this.savePatientReports(current);
  },

  // Evaluate parameter value against standard min and max or string patterns
  evaluateFlag(valueStr: string, minNormal?: number, maxNormal?: number, refRangeText?: string): 'NORMAL' | 'HIGH' | 'LOW' {
    if (!valueStr || valueStr.trim() === '') return 'NORMAL';
    const cleanVal = valueStr.trim();
    const num = parseFloat(cleanVal);

    if (!isNaN(num)) {
      if (minNormal !== undefined && num < minNormal) return 'LOW';
      if (maxNormal !== undefined && num > maxNormal) return 'HIGH';
      return 'NORMAL';
    }

    // String based abnormal flags (e.g. Urine / Serology / Rapid Tests)
    const upper = cleanVal.toUpperCase();
    if (upper === 'POSITIVE' || upper === 'REACTIVE' || upper === 'PRESENT' || upper === 'TRACE' || upper.startsWith('+') || upper === 'HIGH' || upper === 'TURBID') {
      return 'HIGH';
    }
    if (upper === 'DEFICIENT' || upper === 'LOW') {
      return 'LOW';
    }

    return 'NORMAL';
  },

  // Reset database back to default factory demo
  resetToFactoryDemo(): void {
    localStorage.removeItem(KEYS.LAB_PROFILE);
    localStorage.removeItem(KEYS.STAFF_MEMBERS);
    localStorage.removeItem(KEYS.DOCTORS);
    localStorage.removeItem(KEYS.TEST_TEMPLATES);
    localStorage.removeItem(KEYS.PATIENT_REPORTS);
  },

  // Export full JSON backup
  exportFullBackup(): string {
    const payload = {
      labProfile: this.getLabProfile(),
      staffMembers: this.getStaffMembers(),
      doctors: this.getDoctors(),
      testTemplates: this.getTestTemplates(),
      patientReports: this.getPatientReports(),
      exportedAt: new Date().toISOString(),
      version: '2.0',
    };
    return JSON.stringify(payload, null, 2);
  },

  // Restore JSON backup
  restoreBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.labProfile) this.saveLabProfile(data.labProfile);
      if (data.staffMembers) this.saveStaffMembers(data.staffMembers);
      if (data.doctors) this.saveDoctors(data.doctors);
      if (data.testTemplates) this.saveTestTemplates(data.testTemplates);
      if (data.patientReports) this.savePatientReports(data.patientReports);
      return true;
    } catch (e) {
      console.error('Backup restoration failed:', e);
      return false;
    }
  },
};
