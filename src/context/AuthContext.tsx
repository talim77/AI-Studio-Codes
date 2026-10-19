import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserSession,
  Role,
  LabProfile,
  StaffMember,
  StaffPermissions,
  DEFAULT_OWNER_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
} from '../types/lab';
import { StorageService } from '../services/storage';

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
  labProfile: LabProfile;
  loginWithGoogle: (email?: string, name?: string) => Promise<{ success: boolean; message?: string }>;
  loginWithLabCredentials: (
    labId: string,
    staffUserId: string,
    pin: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  quickSwitchUser: (preset: 'owner' | 'staff') => void;
  hasPermission: (permission: AppPermission) => boolean;
  updateLabProfile: (profile: LabProfile) => void;
  refreshLabProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'pathocare_active_session_user_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [labProfile, setLabProfile] = useState<LabProfile>(() => StorageService.getLabProfile());
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    const lab = StorageService.getLabProfile();
    return {
      id: 'staff-owner-01',
      name: lab.pathologistName || 'Dr. A. K. Sharma',
      email: lab.email || 'dr.sharma@apexdiagnosticlab.com',
      role: 'owner',
      labId: lab.uniqueLabId,
      staffUserId: 'OWNER-01',
      designation: 'Chief Pathologist & Lab Director',
      loginType: 'google',
      permissions: DEFAULT_OWNER_PERMISSIONS,
    };
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [currentUser]);

  const refreshLabProfile = () => {
    const updated = StorageService.getLabProfile();
    setLabProfile(updated);
  };

  const loginWithGoogle = async (email?: string, name?: string): Promise<{ success: boolean; message?: string }> => {
    const lab = StorageService.getLabProfile();
    const resolvedName = name || lab.pathologistName || 'Lab Owner';
    const resolvedEmail = email || lab.email || 'owner@lab.com';

    const session: UserSession = {
      id: `google-${Date.now()}`,
      name: resolvedName,
      email: resolvedEmail,
      role: 'owner',
      labId: lab.uniqueLabId,
      designation: 'Owner & Chief Pathologist',
      loginType: 'google',
      permissions: DEFAULT_OWNER_PERMISSIONS,
    };

    setCurrentUser(session);
    return { success: true };
  };

  const loginWithLabCredentials = async (
    labIdInput: string,
    staffUserIdInput: string,
    pinInput: string
  ): Promise<{ success: boolean; message?: string }> => {
    const currentLab = StorageService.getLabProfile();
    const trimmedLabId = (labIdInput || '').trim().toUpperCase();
    const targetLabId = (currentLab.uniqueLabId || '').trim().toUpperCase();

    // Check Lab ID
    if (trimmedLabId !== targetLabId) {
      return {
        success: false,
        message: `Galat Lab ID! Aapka registered Lab ID "${targetLabId}" hai. Kripya "${targetLabId}" enter karein.`,
      };
    }

    // Check staff members
    const staffMembers = StorageService.getStaffMembers();
    const trimmedStaffId = (staffUserIdInput || '').trim().toUpperCase();
    const staff = staffMembers.find(
      (s) => s.staffUserId.trim().toUpperCase() === trimmedStaffId
    );

    if (!staff) {
      return {
        success: false,
        message: `Staff User ID "${staffUserIdInput}" nahi mila. Kripya check karein ya Owner se contact karein.`,
      };
    }

    if (!staff.isActive) {
      return {
        success: false,
        message: 'Yeh Staff Account inactive/disabled hai. Kripya Lab Owner se contact karein.',
      };
    }

    if (staff.pin.trim() !== (pinInput || '').trim()) {
      return {
        success: false,
        message: 'Galat Security PIN! Kripya apna 4-digit PIN dobara check karein.',
      };
    }

    const session: UserSession = {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      labId: currentLab.uniqueLabId,
      staffUserId: staff.staffUserId,
      designation: staff.designation,
      loginType: 'pin',
      permissions: staff.permissions || (staff.role === 'owner' ? DEFAULT_OWNER_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS),
    };

    setCurrentUser(session);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const quickSwitchUser = (preset: 'owner' | 'staff') => {
    const currentLab = StorageService.getLabProfile();
    const staffList = StorageService.getStaffMembers();

    if (preset === 'owner') {
      const ownerStaff = staffList.find((s) => s.role === 'owner');
      setCurrentUser({
        id: ownerStaff?.id || 'staff-owner-01',
        name: ownerStaff?.name || currentLab.pathologistName || 'Dr. A. K. Sharma',
        email: currentLab.email || 'dr.sharma@apexdiagnosticlab.com',
        role: 'owner',
        labId: currentLab.uniqueLabId,
        staffUserId: ownerStaff?.staffUserId || 'OWNER-01',
        designation: ownerStaff?.designation || 'Chief Pathologist & Lab Director',
        loginType: 'google',
        permissions: DEFAULT_OWNER_PERMISSIONS,
      });
    } else {
      const tech = staffList.find((s) => s.role === 'staff' && s.isActive) || {
        id: 'staff-tech-01',
        name: 'Rahul Verma',
        role: 'staff' as Role,
        staffUserId: 'TECH-01',
        designation: 'Senior Medical Lab Technician (DMLT)',
        permissions: DEFAULT_STAFF_PERMISSIONS,
      };

      setCurrentUser({
        id: tech.id,
        name: tech.name,
        role: 'staff',
        labId: currentLab.uniqueLabId,
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

    // Staff granular permissions configured by Owner
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
        return false; // Managing staff is strictly Owner only
      default:
        return false;
    }
  };

  const updateLabProfile = (profile: LabProfile) => {
    StorageService.saveLabProfile(profile);
    setLabProfile(profile);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        labProfile,
        loginWithGoogle,
        loginWithLabCredentials,
        logout,
        quickSwitchUser,
        hasPermission,
        updateLabProfile,
        refreshLabProfile,
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
