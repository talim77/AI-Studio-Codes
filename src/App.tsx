import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StorageService } from './services/storage';
import { FirestoreService } from './services/firestoreService';
import { auth } from './firebase';
import {
  PatientReport,
  ReferringDoctor,
  TestTemplate,
  StaffMember,
  ReportStatus,
} from './types/lab';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './components/DashboardView';
import { ReportsHistoryView } from './components/ReportsHistoryView';
import { ReportEntryView } from './components/ReportEntryView';
import { DoctorDirectoryView } from './components/DoctorDirectoryView';
import { TestCatalogView } from './components/TestCatalogView';
import { StaffManagementView } from './components/StaffManagementView';
import { LabSettingsView } from './components/LabSettingsView';
import { PrintableReportView } from './components/PrintableReportView';
import { RegisterLabModal } from './components/RegisterLabModal';
import { PublicHomeView } from './components/PublicHomeView';

const MainAppContent: React.FC = () => {
  const { currentUser, labProfile, activeLabId, loginAsOwner, loginAsStaff } = useAuth();

  // Navigation State
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Data Store State
  const [reports, setReports] = useState<PatientReport[]>([]);
  const [doctors, setDoctors] = useState<ReferringDoctor[]>([]);
  const [testTemplates, setTestTemplates] = useState<TestTemplate[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  // Active Modals & Selected Objects
  const [reportToPrint, setReportToPrint] = useState<PatientReport | null>(null);
  const [editingReport, setEditingReport] = useState<PatientReport | null>(null);

  // Load / Reload all data for active tenant Lab from Storage
  const loadAllData = useCallback(() => {
    if (!activeLabId) {
      setReports([]);
      setDoctors([]);
      setTestTemplates([]);
      setStaffMembers([]);
      return;
    }
    setReports(StorageService.getPatientReports(activeLabId));
    setDoctors(StorageService.getDoctors(activeLabId));
    setTestTemplates(StorageService.getTestTemplates(activeLabId));
    setStaffMembers(StorageService.getStaffMembers(activeLabId));
  }, [activeLabId]);

  useEffect(() => {
    loadAllData();

    // Attach real-time cloud listeners ONLY when user is logged in AND Firebase has authenticated user
    if (!currentUser || !auth.currentUser || !activeLabId) {
      return;
    }

    const unsubReports = FirestoreService.subscribeReports(
      activeLabId,
      (liveReports) => {
        if (liveReports && liveReports.length > 0) {
          setReports(liveReports);
          StorageService.savePatientReports(activeLabId, liveReports);
        }
      },
      () => {}
    );

    const unsubStaff = FirestoreService.subscribeStaff(
      activeLabId,
      (liveStaff) => {
        if (liveStaff && liveStaff.length > 0) {
          setStaffMembers(liveStaff);
          StorageService.saveStaffMembers(activeLabId, liveStaff);
        }
      },
      () => {}
    );

    const unsubDoctors = FirestoreService.subscribeDoctors(
      activeLabId,
      (liveDocs) => {
        if (liveDocs && liveDocs.length > 0) {
          setDoctors(liveDocs);
          StorageService.saveDoctors(activeLabId, liveDocs);
        }
      },
      () => {}
    );

    return () => {
      unsubReports();
      unsubStaff();
      unsubDoctors();
    };
  }, [activeLabId, currentUser, loadAllData]);

  // Report Save / Update Handler
  const handleSaveReport = (report: PatientReport, shouldPrint = false) => {
    const isExisting = reports.some((r) => r.id === report.id);
    if (isExisting) {
      StorageService.updatePatientReport(activeLabId, report.id, report);
    } else {
      StorageService.addPatientReport(activeLabId, report);
    }
    loadAllData();
    setEditingReport(null);

    if (shouldPrint) {
      setReportToPrint(report);
      setActiveView('reports');
    } else {
      setActiveView('reports');
    }
  };

  // Report Delete Handler
  const handleDeleteReport = (reportId: string) => {
    StorageService.deletePatientReport(activeLabId, reportId);
    loadAllData();
  };

  // Doctor Registration & Update Handlers
  const handleAddNewDoctor = (doc: Omit<ReferringDoctor, 'id' | 'totalReferred'>) => {
    const created = StorageService.addDoctor(activeLabId, doc);
    loadAllData();
    return created;
  };

  const handleUpdateDoctor = (id: string, updates: Partial<ReferringDoctor>) => {
    StorageService.updateDoctor(activeLabId, id, updates);
    loadAllData();
  };

  // Staff Management Handlers
  const handleAddStaff = (member: Omit<StaffMember, 'id' | 'createdAt'>) => {
    StorageService.addStaffMember(activeLabId, member);
    loadAllData();
  };

  const handleUpdateStaff = (id: string, updates: Partial<StaffMember>) => {
    StorageService.updateStaffMember(activeLabId, id, updates);
    loadAllData();
  };

  const handleDeleteStaff = (id: string) => {
    StorageService.deleteStaffMember(activeLabId, id);
    loadAllData();
  };

  // Template Pricing & Custom Catalog Handlers
  const handleUpdateTemplate = (id: string, updates: Partial<TestTemplate>) => {
    StorageService.updateTestTemplate(activeLabId, id, updates);
    loadAllData();
  };

  const handleAddTemplate = (template: Omit<TestTemplate, 'id'>) => {
    StorageService.addTestTemplate(activeLabId, template);
    loadAllData();
  };

  const handleDeleteTemplate = (id: string) => {
    StorageService.deleteTestTemplate(activeLabId, id);
    loadAllData();
  };

  // Mark Report Delivered Handler
  const handleMarkDelivered = (reportId: string) => {
    StorageService.updatePatientReport(activeLabId, reportId, { status: 'DELIVERED' });
    loadAllData();
    if (reportToPrint && reportToPrint.id === reportId) {
      setReportToPrint((prev) => (prev ? { ...prev, status: 'DELIVERED' } : null));
    }
  };

  // Update Report Status Handler (Sample Collected, Ready to Approve, Verified)
  const handleUpdateReportStatus = (reportId: string, newStatus: ReportStatus) => {
    if (!currentUser) return;
    const res = StorageService.updateReportStatus(
      activeLabId,
      reportId,
      newStatus,
      { role: currentUser.role, name: currentUser.name }
    );
    if (!res.success) {
      alert(res.message || 'Status update fail hua.');
      return;
    }
    loadAllData();
    if (reportToPrint && reportToPrint.id === reportId) {
      setReportToPrint((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              verifiedBy: newStatus === 'VERIFIED' ? labProfile.pathologistName : prev.verifiedBy,
            }
          : null
      );
    }
  };

  // Open Edit Report
  const handleOpenEditReport = (report: PatientReport) => {
    setEditingReport(report);
    setActiveView('new-report');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Bar */}
      <Navbar
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenRegister={() => setIsRegisterModalOpen(true)}
        onNavigate={(view) => {
          if (view === 'new-report') {
            setEditingReport(null);
          }
          setActiveView(view);
        }}
        activeView={activeView}
      />

      <div className="flex-1 flex">
        {/* Desktop Sidebar only when logged in */}
        {currentUser && (
          <Sidebar
            activeView={activeView}
            onNavigate={(view) => {
              if (view === 'new-report') {
                setEditingReport(null);
              }
              setActiveView(view);
            }}
          />
        )}

        {/* Main Content Area */}
        <main
          className={`flex-1 p-4 sm:p-6 lg:p-8 ${
            currentUser ? 'max-w-7xl' : 'max-w-5xl'
          } w-full mx-auto overflow-y-auto`}
        >
          {!currentUser ? (
            <PublicHomeView
              onOpenLogin={() => setIsLoginModalOpen(true)}
              onOpenRegister={() => setIsRegisterModalOpen(true)}
              onSelectReportToPrint={(r) => setReportToPrint(r)}
            />
          ) : (
            <>
              {activeView === 'dashboard' && (
                <DashboardView
                  reports={reports}
                  doctors={doctors}
                  onNavigate={(v) => {
                    if (v === 'new-report') setEditingReport(null);
                    setActiveView(v);
                  }}
                  onSelectReportToPrint={(r) => setReportToPrint(r)}
                  onEditReport={handleOpenEditReport}
                />
              )}

          {activeView === 'reports' && (
            <ReportsHistoryView
              reports={reports}
              doctors={doctors}
              onSelectReportToPrint={(r) => setReportToPrint(r)}
              onEditReport={handleOpenEditReport}
              onDeleteReport={handleDeleteReport}
              onNavigate={(v) => {
                if (v === 'new-report') setEditingReport(null);
                setActiveView(v);
              }}
              onUpdateReportStatus={handleUpdateReportStatus}
            />
          )}

          {activeView === 'new-report' && (
            <ReportEntryView
              initialReport={editingReport}
              doctors={doctors}
              testTemplates={testTemplates}
              onSaveReport={handleSaveReport}
              onCancel={() => {
                setEditingReport(null);
                setActiveView('reports');
              }}
              onAddNewDoctor={handleAddNewDoctor}
            />
          )}

          {activeView === 'doctors' && (
            <DoctorDirectoryView
              doctors={doctors}
              reports={reports}
              onAddNewDoctor={handleAddNewDoctor}
              onUpdateDoctor={handleUpdateDoctor}
              onSelectReportToPrint={(r) => setReportToPrint(r)}
            />
          )}

          {activeView === 'catalog' && (
            <TestCatalogView
              testTemplates={testTemplates}
              onUpdateTemplate={handleUpdateTemplate}
              onAddTemplate={handleAddTemplate}
              onDeleteTemplate={handleDeleteTemplate}
            />
          )}

          {activeView === 'staff' && (
            <StaffManagementView
              staffMembers={staffMembers}
              onAddStaff={handleAddStaff}
              onUpdateStaff={handleUpdateStaff}
              onDeleteStaff={handleDeleteStaff}
            />
          )}

          {activeView === 'settings' && (
            <LabSettingsView onRefreshAllData={loadAllData} />
          )}
            </>
          )}
        </main>
      </div>

      {/* Printable Clinical Report View Modal */}
      {reportToPrint && (
        <PrintableReportView
          report={reportToPrint}
          onClose={() => setReportToPrint(null)}
          onMarkDelivered={handleMarkDelivered}
          onVerifyReport={(id) => handleUpdateReportStatus(id, 'VERIFIED')}
        />
      )}

      {/* Dual Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onOpenRegister={() => {
          setIsLoginModalOpen(false);
          setIsRegisterModalOpen(true);
        }}
      />

      {/* Register New Lab Modal */}
      <RegisterLabModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={() => {
          setIsRegisterModalOpen(false);
          loadAllData();
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
