import { LabAccount, StaffMember, PatientReport, LabProfile, ReferringDoctor, TestTemplate } from '../types/lab';
import { StorageService } from './storage';

export const ApiSyncService = {
  // 1. Fetch all registered labs from backend server
  async syncAllLabs(): Promise<LabAccount[]> {
    try {
      const res = await fetch('/api/labs');
      if (!res.ok) return StorageService.getRegisteredLabs();
      const labs = (await res.json()) as LabAccount[];
      if (Array.isArray(labs) && labs.length > 0) {
        // Merge with local storage
        const currentLocal = StorageService.getRegisteredLabs();
        const map = new Map<string, LabAccount>();
        currentLocal.forEach((l) => map.set(l.uniqueLabId.toUpperCase(), l));
        labs.forEach((l) => map.set(l.uniqueLabId.toUpperCase(), l));
        const merged = Array.from(map.values());
        StorageService.saveRegisteredLabs(merged);
        return merged;
      }
      return StorageService.getRegisteredLabs();
    } catch (err) {
      console.warn('[ApiSync] Failed to sync labs from backend:', err);
      return StorageService.getRegisteredLabs();
    }
  },

  // 2. Fetch complete lab data (staff, reports, doctors, templates)
  async fetchLabDetails(labId: string): Promise<{
    labAccount?: LabAccount;
    staff?: StaffMember[];
    doctors?: ReferringDoctor[];
    templates?: TestTemplate[];
    reports?: PatientReport[];
  } | null> {
    const cleanId = (labId || '').trim().toUpperCase();
    try {
      const res = await fetch(`/api/labs/${cleanId}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.labAccount) {
        // Cache to local storage
        if (data.staff && Array.isArray(data.staff)) {
          StorageService.saveStaffMembers(cleanId, data.staff);
        }
        if (data.doctors && Array.isArray(data.doctors)) {
          StorageService.saveDoctors(cleanId, data.doctors);
        }
        if (data.templates && Array.isArray(data.templates)) {
          StorageService.saveTestTemplates(cleanId, data.templates);
        }
        if (data.reports && Array.isArray(data.reports)) {
          StorageService.savePatientReports(cleanId, data.reports);
        }
        return data;
      }
      return null;
    } catch (err) {
      console.warn(`[ApiSync] Error fetching details for lab ${cleanId}:`, err);
      return null;
    }
  },

  // 3. Register a new lab on backend database
  async registerLabOnServer(details: {
    uniqueLabId: string;
    labName: string;
    ownerName: string;
    ownerEmail: string;
    password: string;
    phone: string;
    address?: string;
  }): Promise<{ success: boolean; message?: string; labAccount?: LabAccount; staff?: StaffMember[] }> {
    try {
      const res = await fetch('/api/labs/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('[ApiSync] Register lab error:', err);
      return { success: false, message: 'Server communication error while registering lab.' };
    }
  },

  // 4. Staff Login verification on backend server
  async staffLoginOnServer(
    labId: string,
    staffUserId: string,
    pin: string
  ): Promise<{
    success: boolean;
    message?: string;
    staff?: StaffMember;
    lab?: LabAccount;
    profile?: LabProfile;
  }> {
    try {
      const res = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labId, staffUserId, pin }),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('[ApiSync] Staff login error:', err);
      return { success: false, message: 'Server unreachable. Checking offline cache...' };
    }
  },

  // 5. Owner Login verification on backend server
  async ownerLoginOnServer(
    identifier: string,
    password?: string
  ): Promise<{
    success: boolean;
    message?: string;
    lab?: LabAccount;
    profile?: LabProfile;
  }> {
    try {
      const res = await fetch('/api/auth/owner-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('[ApiSync] Owner login error:', err);
      return { success: false, message: 'Server error during owner login.' };
    }
  },

  // 6. Save or update staff member on backend server
  async saveStaffMember(labId: string, member: StaffMember): Promise<void> {
    const cleanId = (labId || '').trim().toUpperCase();
    try {
      await fetch(`/api/labs/${cleanId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      });
    } catch (err) {
      console.warn('[ApiSync] Failed to sync staff to server:', err);
    }
  },

  // 7. Update staff PIN on backend server
  async updateStaffPin(labId: string, staffId: string, newPin: string): Promise<boolean> {
    const cleanId = (labId || '').trim().toUpperCase();
    try {
      const res = await fetch(`/api/labs/${cleanId}/staff/${staffId}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin }),
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch (err) {
      console.warn('[ApiSync] Failed to update staff PIN on server:', err);
      return false;
    }
  },

  // 8. Save or update patient report on backend server
  async savePatientReport(labId: string, report: PatientReport): Promise<void> {
    const cleanId = (labId || '').trim().toUpperCase();
    try {
      await fetch(`/api/labs/${cleanId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    } catch (err) {
      console.warn('[ApiSync] Failed to sync report to server:', err);
    }
  },

  // 9. Delete patient report on backend server
  async deletePatientReport(labId: string, reportId: string): Promise<void> {
    const cleanId = (labId || '').trim().toUpperCase();
    try {
      await fetch(`/api/labs/${cleanId}/reports/${reportId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('[ApiSync] Failed to delete report from server:', err);
    }
  },
};
