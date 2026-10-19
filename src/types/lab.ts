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

export interface LabAccount {
  id: string;
  uniqueLabId: string; // e.g. "LARI786"
  ownerName: string;
  ownerEmail: string;
  passwordHash: string; // stored credentials
  phone: string;
  isEmailVerified: boolean;
  createdAt: string;
  ownerUid?: string;
  profile: LabProfile;
}

export interface UserSession {
  id: string;
  name: string;
  email?: string;
  role: Role;
  labId: string; // The tenant's uniqueLabId
  staffUserId?: string;
  designation?: string;
  loginType: 'password' | 'pin';
  permissions: StaffPermissions;
}

export interface LabProfile {
  id: string;
  uniqueLabId: string; // e.g. "LARI786"
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
  staffUserId: string; // e.g. "AFTB03" or "TECH-01"
  name: string;
  role: Role;
  pin: string; // 4-digit PIN
  designation: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  permissions: StaffPermissions;
  isPinCustomized?: boolean; // True when staff updates their own secret PIN
  pinUpdatedAt?: string;
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
  commissionRate: number; // percentage (e.g. 15 for 15%)
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
  labId?: string; // Tenant specific
  code: string;
  name: string;
  category: string;
  price: number;
  turnaroundHours: number;
  sampleType: string;
  parameters: TestParameterDefinition[];
  isPackage?: boolean;
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

export type ReportStatus =
  | 'SAMPLE_COLLECTED'
  | 'READY_TO_APPROVE'
  | 'VERIFIED'
  | 'DELIVERED'
  | 'PENDING'
  | 'COMPLETED';

export interface PatientReport {
  id: string;
  reportNo: string; // e.g. "REP-2026-0104"
  tokenNo: number;
  labId: string; // Tenant ID
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  address?: string;
  sampleCollectedAt: string;
  reportedAt: string;
  referringDoctorId: string;
  referringDoctorName: string;
  referringDoctorCommissionRate?: number;
  testTemplateId: string;
  testTemplateIds?: string[];
  testName: string;
  testCategory: string;
  testPrice: number; // Gross total test billing
  discountAmount?: number; // Discount given
  discountApprovedBy?: string; // Discount authorized by (Doctor, Owner, Welfare)
  netPayable?: number; // testPrice - discountAmount
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  amountPaid: number;
  dueAmount?: number; // netPayable - amountPaid
  testGroups: TestGroupResult[];
  parameters: ParameterResult[];
  clinicalImpression: string;
  status: ReportStatus;
  verifiedBy?: string; // Chief Pathologist who verified
  verifiedAt?: string; // Timestamp of verification
  createdByStaffId: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export type PrintPaperMode = 'letterhead' | 'preprinted';

export interface PrintSettings {
  paperMode: PrintPaperMode; // 'letterhead' (full) or 'preprinted' (doctor stationery)
  topMarginMm: number; // default 50mm, adjustable (20-90mm)
  leftMarginMm: number; // default 12mm, adjustable (5-30mm)
  rightMarginMm: number; // default 12mm, adjustable (5-30mm)
  bottomMarginMm: number; // default 15mm
}

