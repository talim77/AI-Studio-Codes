import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import {
  LabAccount,
  StaffMember,
  ReferringDoctor,
  TestTemplate,
  PatientReport,
  LabProfile,
  DEFAULT_OWNER_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
} from '../types/lab';

export const FirestoreService = {
  // Sync Lab Account & Profile
  async saveLabAccount(lab: LabAccount): Promise<void> {
    if (!auth.currentUser) return;
    const path = `labs/${lab.uniqueLabId}`;
    try {
      const labRef = doc(db, 'labs', lab.uniqueLabId);
      await setDoc(
        labRef,
        {
          id: lab.id,
          uniqueLabId: lab.uniqueLabId,
          ownerName: lab.ownerName,
          ownerEmail: lab.ownerEmail,
          ownerUid: lab.ownerUid || auth.currentUser?.uid || 'guest-owner',
          phone: lab.phone,
          passwordHash: lab.passwordHash || '',
          isEmailVerified: lab.isEmailVerified ?? true,
          createdAt: lab.createdAt || new Date().toISOString(),
          profile: lab.profile,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getLabAccount(labId: string): Promise<LabAccount | null> {
    if (!auth.currentUser) return null;
    const cleanId = (labId || '').trim().toUpperCase();
    const path = `labs/${cleanId}`;
    try {
      const snap = await getDoc(doc(db, 'labs', cleanId));
      if (snap.exists()) {
        return snap.data() as LabAccount;
      }
      return null;
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch {
        // Prevent crash on fallback lookup
      }
      return null;
    }
  },

  async getAllLabs(): Promise<LabAccount[]> {
    if (!auth.currentUser) return [];
    const path = 'labs';
    try {
      const snap = await getDocs(collection(db, 'labs'));
      const labs: LabAccount[] = [];
      snap.forEach((d) => {
        labs.push(d.data() as LabAccount);
      });
      return labs;
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch {
        // Prevent crash
      }
      return [];
    }
  },

  // Real-time listener for Reports
  subscribeReports(
    labId: string,
    callback: (reports: PatientReport[]) => void,
    onError?: (err: unknown) => void
  ) {
    if (!auth.currentUser) return () => {};
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const path = `labs/${cleanId}/reports`;
    const colRef = collection(db, 'labs', cleanId, 'reports');

    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: PatientReport[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as PatientReport);
        });
        // Sort descending by tokenNo or createdAt
        list.sort((a, b) => (b.tokenNo || 0) - (a.tokenNo || 0));
        callback(list);
      },
      (error) => {
        if (onError) onError(error);
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch {
          // Diagnostic logged, prevented uncaught runtime error
        }
      }
    );
  },

  // Save or update Patient Report
  async saveReport(labId: string, report: PatientReport): Promise<void> {
    const cleanId = (labId || report.labId || 'LARI786').trim().toUpperCase();
    const path = `labs/${cleanId}/reports/${report.id}`;
    try {
      const ref = doc(db, 'labs', cleanId, 'reports', report.id);
      await setDoc(ref, report, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateReport(
    labId: string,
    reportId: string,
    updates: Partial<PatientReport>
  ): Promise<void> {
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const path = `labs/${cleanId}/reports/${reportId}`;
    try {
      const ref = doc(db, 'labs', cleanId, 'reports', reportId);
      await updateDoc(ref, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteReport(labId: string, reportId: string): Promise<void> {
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const path = `labs/${cleanId}/reports/${reportId}`;
    try {
      const ref = doc(db, 'labs', cleanId, 'reports', reportId);
      await deleteDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Staff subscriptions and updates
  subscribeStaff(
    labId: string,
    callback: (staff: StaffMember[]) => void,
    onError?: (err: unknown) => void
  ) {
    if (!auth.currentUser) return () => {};
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const path = `labs/${cleanId}/staff`;
    const colRef = collection(db, 'labs', cleanId, 'staff');

    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: StaffMember[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as StaffMember);
        });
        callback(list);
      },
      (error) => {
        if (onError) onError(error);
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch {
          // Diagnostic logged, prevented uncaught runtime error
        }
      }
    );
  },

  async saveStaffMember(labId: string, staff: StaffMember): Promise<void> {
    if (!auth.currentUser) return;
    const cleanId = (labId || staff.labId || 'LARI786').trim().toUpperCase();
    const path = `labs/${cleanId}/staff/${staff.id}`;
    try {
      const ref = doc(db, 'labs', cleanId, 'staff', staff.id);
      await setDoc(ref, staff, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateStaffMember(
    labId: string,
    staffId: string,
    updates: Partial<StaffMember>
  ): Promise<void> {
    if (!auth.currentUser) return;
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const path = `labs/${cleanId}/staff/${staffId}`;
    try {
      const ref = doc(db, 'labs', cleanId, 'staff', staffId);
      await updateDoc(ref, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteStaffMember(labId: string, staffId: string): Promise<void> {
    if (!auth.currentUser) return;
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const path = `labs/${cleanId}/staff/${staffId}`;
    try {
      const ref = doc(db, 'labs', cleanId, 'staff', staffId);
      await deleteDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Doctors
  subscribeDoctors(
    labId: string,
    callback: (doctors: ReferringDoctor[]) => void,
    onError?: (err: unknown) => void
  ) {
    if (!auth.currentUser) return () => {};
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const path = `labs/${cleanId}/doctors`;
    const colRef = collection(db, 'labs', cleanId, 'doctors');

    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: ReferringDoctor[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as ReferringDoctor);
        });
        callback(list);
      },
      (error) => {
        if (onError) onError(error);
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch {
          // Diagnostic logged, prevented uncaught runtime error
        }
      }
    );
  },

  async saveDoctor(labId: string, doctor: ReferringDoctor): Promise<void> {
    if (!auth.currentUser) return;
    const cleanId = (labId || doctor.labId || 'LARI786').trim().toUpperCase();
    const path = `labs/${cleanId}/doctors/${doctor.id}`;
    try {
      const ref = doc(db, 'labs', cleanId, 'doctors', doctor.id);
      await setDoc(ref, doctor, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteDoctor(labId: string, docId: string): Promise<void> {
    if (!auth.currentUser) return;
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const path = `labs/${cleanId}/doctors/${docId}`;
    try {
      const ref = doc(db, 'labs', cleanId, 'doctors', docId);
      await deleteDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Test Templates
  subscribeTemplates(
    labId: string,
    callback: (templates: TestTemplate[]) => void,
    onError?: (err: unknown) => void
  ) {
    if (!auth.currentUser) return () => {};
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const path = `labs/${cleanId}/templates`;
    const colRef = collection(db, 'labs', cleanId, 'templates');

    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: TestTemplate[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as TestTemplate);
        });
        callback(list);
      },
      (error) => {
        if (onError) onError(error);
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch {
          // Diagnostic logged, prevented uncaught runtime error
        }
      }
    );
  },

  async saveTemplate(labId: string, template: TestTemplate): Promise<void> {
    const cleanId = (labId || template.labId || 'LARI786').trim().toUpperCase();
    const path = `labs/${cleanId}/templates/${template.id}`;
    try {
      const ref = doc(db, 'labs', cleanId, 'templates', template.id);
      await setDoc(ref, template, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteTemplate(labId: string, templateId: string): Promise<void> {
    const cleanId = (labId || 'LARI786').trim().toUpperCase();
    const path = `labs/${cleanId}/templates/${templateId}`;
    try {
      const ref = doc(db, 'labs', cleanId, 'templates', templateId);
      await deleteDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};
