import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserSession,
  Role,
  LabProfile,
  StaffMember,
  StaffPermissions,
  LabAccount,
  DEFAULT_OWNER_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
} from '../types/lab';
import { StorageService } from '../services/storage';
import { FirestoreService } from '../services/firestoreService';
import { AuthApiService } from '../services/authApi';
import { ApiSyncService } from '../services/apiSync';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export type AppPermission =
  | 'DELETE_REPORT'
  | 'MANAGE_STAFF'
  | 'MANAGE_SETTINGS'
  | 'EDIT_TEST_PRICES'
  | 'EDIT_TEST_CATALOG'
  | 'VIEW_DOCTOR_COMMISSIONS'
  | 'MANAGE_DOCTORS'
  | 'CREATE_REPORT'
  | 'EDIT_REPORT'
  | 'PRINT_REPORT';

interface AuthContextType {
  currentUser: UserSession | null;
  firebaseUser: FirebaseUser | null;
  labProfile: LabProfile;
  activeLabId: string;
  isCloudConnected: boolean;
  loginWithGoogle: () => Promise<{ success: boolean; message?: string }>;
  loginAsOwner: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginAsOwnerWithOtp: (identifier: string, otp: string) => Promise<{ success: boolean; message?: string }>;
  loginAsStaff: (
    labId: string,
    staffUserId: string,
    pin: string
  ) => Promise<{ success: boolean; message?: string }>;
  registerNewLab: (details: {
    uniqueLabId: string;
    labName: string;
    ownerName: string;
    ownerEmail: string;
    password: string;
    phone: string;
    address?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  quickSwitchRole: (role: 'owner' | 'staff') => void;
  quickSwitchUser: (role: 'owner' | 'staff') => void;
  hasPermission: (permission: AppPermission) => boolean;
  updateLabProfile: (profile: LabProfile) => void;
  switchActiveLab: (labId: string) => void;
  changeCurrentStaffPin: (
    oldPin: string,
    newPin: string
  ) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'pathocare_auth_session_v5';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);

  // Default initial session is NULL: public use requires explicit login
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  const activeLabId = currentUser?.labId || '';
  const [labProfile, setLabProfile] = useState<LabProfile>(() => {
    if (currentUser?.labId) {
      return StorageService.getLabProfile(currentUser.labId);
    }
    return {
      id: 'profile-public',
      uniqueLabId: 'PATHOCARE',
      name: 'PathoCare Diagnostic System',
      tagline: 'Clinical Pathology & Diagnostic LIS',
      address: 'Central Diagnostic Network',
      phone: '+91 98765 00000',
      email: 'support@pathocare.com',
      nablRegNo: 'NABL-ISO-15189',
      isoCertNo: 'ISO 15189:2022 Certified',
      pathologistName: 'Chief Pathologist',
      pathologistDegrees: 'MBBS, MD Pathology',
      pathologistRegistration: 'MCI Reg. 10001',
      footerNotice: 'Computer-generated diagnostic report. For clinical correlation only.',
    };
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsCloudConnected(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Cross-device sync: fetch all registered labs from backend database on mount
    ApiSyncService.syncAllLabs().then(() => {
      if (currentUser?.labId) {
        ApiSyncService.fetchLabDetails(currentUser.labId);
      }
    });
  }, [currentUser?.labId]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
      setLabProfile(StorageService.getLabProfile(currentUser.labId));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [currentUser]);

  // Google Sign-In for Owner
  const loginWithGoogle = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const user = cred.user;
      if (!user || !user.email) {
        return { success: false, message: 'Google authentication cancel hua ya email nahi mili.' };
      }

      const email = user.email.toLowerCase();
      // Check if lab exists for this email
      let lab = StorageService.findLabByEmail(email);

      // If still not found, check Firestore cloud
      if (!lab) {
        const cloudLabs = await FirestoreService.getAllLabs();
        const found = cloudLabs.find(
          (l) => l.ownerEmail.toLowerCase() === email || (l.ownerUid && l.ownerUid === user.uid)
        );
        if (found) {
          lab = found;
        }
      }

      if (!lab) {
        // Auto-register lab for this Google owner
        const uniqueLabId =
          (user.displayName || 'LAB')
            .replace(/[^a-zA-Z0-9]/g, '')
            .toUpperCase()
            .slice(0, 6) + Math.floor(100 + Math.random() * 900);

        const regRes = StorageService.registerNewLab({
          uniqueLabId,
          labName: `${user.displayName || 'Diagnostic'} Pathology Lab`,
          ownerName: user.displayName || 'Lab Owner',
          ownerEmail: email,
          password: 'google-oauth-session',
          phone: user.phoneNumber || '+91 98765 00000',
        });
        lab = regRes.labAccount;
      }

      if (!lab) {
        return { success: false, message: 'Lab account link nahi ho paya.' };
      }

      lab.ownerUid = user.uid;
      FirestoreService.saveLabAccount(lab).catch(() => {});

      const session: UserSession = {
        id: `owner-${lab.id}`,
        name: user.displayName || lab.ownerName,
        email: user.email,
        role: 'owner',
        labId: lab.uniqueLabId,
        staffUserId: 'OWNER-01',
        designation: 'Owner & Chief Pathologist',
        loginType: 'password',
        permissions: DEFAULT_OWNER_PERMISSIONS,
      };

      setCurrentUser(session);
      setLabProfile(lab.profile);
      return { success: true };
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      return {
        success: false,
        message: err.message?.includes('popup-closed-by-user')
          ? 'Login window band kar di gayi.'
          : `Google sign-in error: ${err.message || 'Punah prayas karein.'}`,
      };
    }
  };

  // Login as Lab Owner using Lab ID or Email + Password (with cloud fallback for other devices)
  const loginAsOwner = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanId = (identifier || '').trim();
    if (!cleanId || !password) {
      return { success: false, message: 'Kripya Lab ID / Email aur Password enter karein.' };
    }

    // Try finding by Lab ID first, then by Email
    let lab = StorageService.findLabByUniqueId(cleanId) || StorageService.findLabByEmail(cleanId);

    // Cross-device cloud fallback: If not in local storage, fetch from Firestore
    if (!lab) {
      const cloudLab = await FirestoreService.getLabAccount(cleanId.toUpperCase());
      if (cloudLab) {
        lab = cloudLab;
        const labs = StorageService.getRegisteredLabs();
        labs.push(cloudLab);
        StorageService.saveRegisteredLabs(labs);
      }
    }

    if (!lab) {
      return {
        success: false,
        message: `Koi bhi Lab "${cleanId}" ke sath registered nahi mili. Kripya check karein ya "Register New Lab" par click karke naya account banayein.`,
      };
    }

    if (lab.passwordHash && lab.passwordHash !== password.trim()) {
      return {
        success: false,
        message: 'Galat Password! Kripya sahi password enter karein.',
      };
    }

    const session: UserSession = {
      id: `owner-${lab.id}`,
      name: lab.ownerName,
      email: lab.ownerEmail,
      role: 'owner',
      labId: lab.uniqueLabId,
      staffUserId: 'OWNER-01',
      designation: 'Owner & Chief Pathologist',
      loginType: 'password',
      permissions: DEFAULT_OWNER_PERMISSIONS,
    };

    setCurrentUser(session);
    setLabProfile(lab.profile);
    return { success: true };
  };

  // Login as Lab Owner using 6-Digit OTP sent to Gmail
  const loginAsOwnerWithOtp = async (
    identifier: string,
    otp: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanId = (identifier || '').trim();
    const cleanOtp = (otp || '').trim().replace(/\D/g, '');

    if (!cleanId || !cleanOtp) {
      return { success: false, message: 'Lab ID / Gmail aur 6-digit OTP code enter karein.' };
    }

    // Try finding by Lab ID first, then by Email
    let lab = StorageService.findLabByUniqueId(cleanId) || StorageService.findLabByEmail(cleanId);

    // Cross-device cloud fallback: If not in local storage, fetch from Firestore
    if (!lab) {
      const cloudLab = await FirestoreService.getLabAccount(cleanId.toUpperCase());
      if (cloudLab) {
        lab = cloudLab;
      }
    }

    if (!lab) {
      const allLabs = await FirestoreService.getAllLabs();
      const found = allLabs.find(
        (l) => l.ownerEmail.toLowerCase() === cleanId.toLowerCase() || l.uniqueLabId === cleanId.toUpperCase()
      );
      if (found) {
        lab = found;
      }
    }

    if (!lab) {
      return {
        success: false,
        message: `Koi bhi Lab "${cleanId}" ke sath registered nahi mili. Kripya check karein.`,
      };
    }

    // Verify 6-digit code against server
    const verifyRes = await AuthApiService.verifyOtp(lab.ownerEmail, cleanOtp);
    if (!verifyRes.success) {
      return { success: false, message: verifyRes.message };
    }

    const session: UserSession = {
      id: `owner-${lab.id}`,
      name: lab.ownerName,
      email: lab.ownerEmail,
      role: 'owner',
      labId: lab.uniqueLabId,
      staffUserId: 'OWNER-01',
      designation: 'Owner & Chief Pathologist',
      loginType: 'password',
      permissions: DEFAULT_OWNER_PERMISSIONS,
    };

    setCurrentUser(session);
    setLabProfile(lab.profile);
    return { success: true };
  };

  // Login as Staff using Lab ID + Staff User ID + PIN (Instant Cross-Device Server Validation)
  const loginAsStaff = async (
    labIdInput: string,
    staffUserIdInput: string,
    pinInput: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanLabId = (labIdInput || '').trim().toUpperCase();
    const cleanStaffId = (staffUserIdInput || '').trim().toUpperCase();
    const cleanPin = (pinInput || '').trim();

    if (!cleanLabId || !cleanStaffId || !cleanPin) {
      return { success: false, message: 'Lab ID, Staff User ID aur 4-digit PIN sabhi zaroori hain.' };
    }

    // 1. Authenticate with backend server first (instant cross-device access for any phone/PC/tab)
    const serverAuth = await ApiSyncService.staffLoginOnServer(cleanLabId, cleanStaffId, cleanPin);
    if (serverAuth.success && serverAuth.staff && serverAuth.lab) {
      // Cache lab & staff locally in StorageService
      const labs = StorageService.getRegisteredLabs();
      if (!labs.some((l) => l.uniqueLabId.toUpperCase() === cleanLabId)) {
        labs.push(serverAuth.lab);
        StorageService.saveRegisteredLabs(labs);
      }
      const existingStaff = StorageService.getStaffMembers(cleanLabId);
      if (!existingStaff.some((s) => s.staffUserId.toUpperCase() === cleanStaffId)) {
        existingStaff.push(serverAuth.staff);
        StorageService.saveStaffMembers(cleanLabId, existingStaff);
      }

      const session: UserSession = {
        id: serverAuth.staff.id,
        name: serverAuth.staff.name,
        role: serverAuth.staff.role,
        labId: cleanLabId,
        staffUserId: serverAuth.staff.staffUserId,
        designation: serverAuth.staff.designation,
        loginType: 'pin',
        permissions:
          serverAuth.staff.permissions ||
          (serverAuth.staff.role === 'owner' ? DEFAULT_OWNER_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS),
      };

      setCurrentUser(session);
      setLabProfile(serverAuth.profile || serverAuth.lab.profile);
      return { success: true };
    } else if (serverAuth.message && !serverAuth.message.includes('Server unreachable')) {
      return { success: false, message: serverAuth.message };
    }

    let lab = StorageService.findLabByUniqueId(cleanLabId);
    if (!lab) {
      const cloudLab = await FirestoreService.getLabAccount(cleanLabId);
      if (cloudLab) {
        lab = cloudLab;
        const labs = StorageService.getRegisteredLabs();
        labs.push(cloudLab);
        StorageService.saveRegisteredLabs(labs);
      }
    }

    if (!lab) {
      return {
        success: false,
        message: `Lab Unique ID "${cleanLabId}" exist nahi karti. Kripya apne Lab Owner se sahi Lab ID lein.`,
      };
    }

    const staffList = StorageService.getStaffMembers(cleanLabId);
    const staff = staffList.find((s) => s.staffUserId.trim().toUpperCase() === cleanStaffId);

    if (!staff) {
      return {
        success: false,
        message: `Staff User ID "${cleanStaffId}" Lab "${cleanLabId}" mein nahi mila. Kripya Lab Owner se apna Staff ID confirm karein.`,
      };
    }

    if (!staff.isActive) {
      return {
        success: false,
        message: 'Yeh Staff Account inactive hai. Kripya Lab Owner se sampark karein.',
      };
    }

    if (staff.pin.trim() !== cleanPin) {
      return {
        success: false,
        message: 'Galat Security PIN! Kripya apna sahi 4-digit PIN enter karein.',
      };
    }

    const session: UserSession = {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      labId: cleanLabId,
      staffUserId: staff.staffUserId,
      designation: staff.designation,
      loginType: 'pin',
      permissions: staff.permissions || (staff.role === 'owner' ? DEFAULT_OWNER_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS),
    };

    setCurrentUser(session);
    setLabProfile(lab.profile);
    return { success: true };
  };

  // Register New Lab (Saves to backend server database AND local storage)
  const registerNewLab = async (details: {
    uniqueLabId: string;
    labName: string;
    ownerName: string;
    ownerEmail: string;
    password: string;
    phone: string;
    address?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    // 1. Save in backend database (data/labs_db.json)
    const serverRes = await ApiSyncService.registerLabOnServer(details);
    if (!serverRes.success && serverRes.message?.includes('already registered')) {
      return { success: false, message: serverRes.message };
    }

    // 2. Save in local storage
    const res = StorageService.registerNewLab(details);
    if (!res.success || !res.labAccount) {
      return { success: false, message: res.message || 'Registration fail hua.' };
    }

    const lab = res.labAccount;
    const session: UserSession = {
      id: `owner-${lab.id}`,
      name: lab.ownerName,
      email: lab.ownerEmail,
      role: 'owner',
      labId: lab.uniqueLabId,
      staffUserId: 'OWNER-01',
      designation: 'Owner & Chief Pathologist',
      loginType: 'password',
      permissions: DEFAULT_OWNER_PERMISSIONS,
    };

    setCurrentUser(session);
    setLabProfile(lab.profile);

    // Sync all labs across system
    ApiSyncService.syncAllLabs().catch(() => {});

    return { success: true };
  };

  const logout = () => {
    signOut(auth).catch(() => {});
    setCurrentUser(null);
  };

  const switchActiveLab = (targetLabId: string) => {
    const lab = StorageService.findLabByUniqueId(targetLabId);
    if (!lab) return;
    setCurrentUser({
      id: `owner-${lab.id}`,
      name: lab.ownerName,
      email: lab.ownerEmail,
      role: 'owner',
      labId: lab.uniqueLabId,
      staffUserId: 'OWNER-01',
      designation: 'Owner & Chief Pathologist',
      loginType: 'password',
      permissions: DEFAULT_OWNER_PERMISSIONS,
    });
    setLabProfile(lab.profile);
  };

  const quickSwitchRole = (targetRole: 'owner' | 'staff') => {
    const currentLabId = activeLabId;
    const staffList = StorageService.getStaffMembers(currentLabId);
    const lab = StorageService.findLabByUniqueId(currentLabId);

    if (targetRole === 'owner') {
      setCurrentUser({
        id: `owner-${currentLabId}`,
        name: lab?.ownerName || 'Lab Owner',
        email: lab?.ownerEmail,
        role: 'owner',
        labId: currentLabId,
        staffUserId: 'OWNER-01',
        designation: 'Chief Pathologist & Lab Director',
        loginType: 'password',
        permissions: DEFAULT_OWNER_PERMISSIONS,
      });
    } else {
      const tech = staffList.find((s) => s.role === 'staff' && s.isActive) || {
        id: `staff-${currentLabId}-default`,
        name: 'Aftab (Staff)',
        role: 'staff' as Role,
        staffUserId: 'AFTB03',
        designation: 'Medical Lab Technician (MLT)',
        permissions: DEFAULT_STAFF_PERMISSIONS,
      };

      setCurrentUser({
        id: tech.id,
        name: tech.name,
        role: 'staff',
        labId: currentLabId,
        staffUserId: tech.staffUserId,
        designation: tech.designation,
        loginType: 'pin',
        permissions: tech.permissions || DEFAULT_STAFF_PERMISSIONS,
      });
    }
  };

  const hasPermission = (permission: AppPermission): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'owner') return true;

    const p = currentUser.permissions || DEFAULT_STAFF_PERMISSIONS;

    switch (permission) {
      case 'CREATE_REPORT':
      case 'EDIT_REPORT':
      case 'PRINT_REPORT':
        return true;
      case 'EDIT_TEST_CATALOG':
      case 'EDIT_TEST_PRICES':
        return !!p.canEditTestCatalog;
      case 'DELETE_REPORT':
        return !!p.canDeleteReports;
      case 'MANAGE_DOCTORS':
        return !!p.canManageDoctors;
      case 'VIEW_DOCTOR_COMMISSIONS':
        return !!p.canViewFinancials;
      case 'MANAGE_SETTINGS':
        return !!p.canEditLabProfile;
      case 'MANAGE_STAFF':
        return false;
      default:
        return false;
    }
  };

  const updateLabProfile = (profile: LabProfile) => {
    StorageService.saveLabProfile(activeLabId, profile);
    setLabProfile(profile);
  };

  const changeCurrentStaffPin = async (
    oldPin: string,
    newPin: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser || currentUser.role !== 'staff' || !currentUser.staffUserId) {
      return { success: false, message: 'Sirf logged in Staff member hi apna PIN change kar sakte hain.' };
    }

    const staffList = StorageService.getStaffMembers(currentUser.labId);
    const staff = staffList.find(
      (s) => s.staffUserId.toUpperCase() === currentUser.staffUserId?.toUpperCase()
    );
    if (!staff) {
      return { success: false, message: 'Staff account nahi mila.' };
    }

    if (staff.pin.trim() !== oldPin.trim()) {
      return { success: false, message: 'Current Security PIN galat hai. Kripya apna sahi PIN daalein.' };
    }

    const cleanNewPin = newPin.trim();
    if (cleanNewPin.length !== 4 || !/^\d{4}$/.test(cleanNewPin)) {
      return { success: false, message: 'Naya PIN theek 4 digits ka numeric code hona chahiye (e.g. 5678).' };
    }

    const ok = StorageService.updateStaffPin(currentUser.labId, currentUser.staffUserId, cleanNewPin);
    if (ok) {
      return { success: true };
    }
    return { success: false, message: 'PIN update karne me problem aayi. Kripya punah prayas karein.' };
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        labProfile,
        activeLabId,
        isCloudConnected,
        loginWithGoogle,
        loginAsOwner,
        loginAsOwnerWithOtp,
        loginAsStaff,
        registerNewLab,
        logout,
        quickSwitchRole,
        quickSwitchUser: quickSwitchRole,
        hasPermission,
        updateLabProfile,
        switchActiveLab,
        changeCurrentStaffPin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
