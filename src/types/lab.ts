export type Role = 'owner' | 'staff';

export interface StaffPermissions {
  canEditTestCatalog: boolean; // Edit test names, prices, parameters, normal ranges, add custom tests
  canDeleteReports: boolean;   // Delete patient reports
  canManageDoctors: boolean;   // Register/edit doctors & referral commission rates
  canViewFinancials: boolean;   // View revenue & doctor referral commissions
  canEditLabProfile: boolean;   // Edit lab settings & letterhead
}

export const DEFAULT_OWNER_PERMISSIONS: StaffPermissions = {
  canEditTestCatalog: true,
  canDeleteReports: true,
  canManageDoctors: true,
  canViewFinancials: true,
  canEditLabProfile: true,
};

export const DEFAULT_STAFF_PERMISSIONS: StaffPermissions = {
  canEditTestCatalog: false,
  canDeleteReports: false,
  canManageDoctors: false,
  canViewFinancials: false,
  canEditLabProfile: false,
};

export interface UserSession {
  id: string;
  name: string;
  email?: string;
  role: Role;
  labId: string;
  staffUserId?: string;
  designation?: string;
  loginType: 'google' | 'pin';
  permissions: StaffPermissions;
}

export interface LabProfile {
  id: string;
  uniqueLabId: string; // e.g. "APEX-LAB-101" or "LARI786"
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  nablRegNo: string;
  isoCertNo?: string;
  pathologistName: string;
  pathologistDegrees: string;
  pathologistRegistration: string;
  footerNotice: string;
}

export interface StaffMember {
  id: string;
  labId: string;
  staffUserId: string; // e.g. "TECH-01" or "AFTB03"
  name: string;
  role: Role;
  pin: string; // 4-digit PIN
  designation: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  permissions: StaffPermissions;
}

export interface ReferringDoctor {
  id: string;
  labId: string;
  name: string;
  qualification: string;
  clinicHospital: string;
  phone: string;
  email?: string;
  specialty: string;
  commissionRate: number; // percentage (e.g. 15 for 15%), editable by Owner / authorized staff
  totalReferred: number;
}

export interface TestParameterDefinition {
  name: string;
  unit: string;
  maleRange: string;
  femaleRange: string;
  childRange?: string;
  generalRange?: string;
  minNormal?: number;
  maxNormal?: number;
}

export interface TestTemplate {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  turnaroundHours: number;
  sampleType: string;
  parameters: TestParameterDefinition[];
  isPackage?: boolean; // Profile/Package like "Surgical Profile" or "Fever Panel"
  bundledTemplateIds?: string[];
}

export interface ParameterResult {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: 'NORMAL' | 'HIGH' | 'LOW';
}

export interface TestGroupResult {
  templateId: string;
  testName: string;
  category: string;
  price: number;
  sampleType?: string;
  parameters: ParameterResult[];
}

export interface PatientReport {
  id: string;
  reportNo: string; // e.g. "REP-2026-0104"
  tokenNo: number;
  labId: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  address?: string;
  sampleCollectedAt: string;
  reportedAt: string;
  referringDoctorId: string;
  referringDoctorName: string;
  referringDoctorCommissionRate?: number; // snapshot of rate at time of test
  testTemplateId: string; // comma separated or primary
  testTemplateIds?: string[]; // array of selected template IDs
  testName: string; // e.g. "Complete Blood Count (CBC), Blood Sugar, Urine R/M"
  testCategory: string;
  testPrice: number; // total bill
  testGroups: TestGroupResult[]; // structured groups for multi-test input and smart A4 pagination
  parameters: ParameterResult[]; // flat list for backwards compatibility
  clinicalImpression: string;
  status: 'PENDING' | 'COMPLETED' | 'DELIVERED';
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  amountPaid: number;
  createdByStaffId: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}
