import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StorageService } from './services/storage';
import {
  PatientReport,
  ReferringDoctor,
  TestTemplate,
  StaffMember,
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

const MainAppContent: React.FC = () => {
  const { currentUser, labProfile } = useAuth();

  // Navigation State
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Data Store State
  const [reports, setReports] = useState<PatientReport[]>([]);
  const [doctors, setDoctors] = useState<ReferringDoctor[]>([]);
  const [testTemplates, setTestTemplates] = useState<TestTemplate[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  // Active Modals & Selected Objects
  const [reportToPrint, setReportToPrint] = useState<PatientReport | null>(null);
  const [editingReport, setEditingReport] = useState<PatientReport | null>(null);

  // Load / Reload all data from Storage
  const loadAllData = useCallback(() => {
    setReports(StorageService.getPatientReports());
    setDoctors(StorageService.getDoctors());
    setTestTemplates(StorageService.getTestTemplates());
    setStaffMembers(StorageService.getStaffMembers());
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Report Save / Update Handler
  const handleSaveReport = (report: PatientReport, shouldPrint = false) => {
    const isExisting = reports.some((r) => r.id === report.id);
    if (isExisting) {
      StorageService.updatePatientReport(report.id, report);
    } else {
      StorageService.addPatientReport(report);
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
    StorageService.deletePatientReport(reportId);
    loadAllData();
  };

  // Doctor Registration & Update Handlers
  const handleAddNewDoctor = (doc: Omit<ReferringDoctor, 'id' | 'totalReferred'>) => {
    const created = StorageService.addDoctor(doc);
    loadAllData();
    return created;
  };

  const handleUpdateDoctor = (id: string, updates: Partial<ReferringDoctor>) => {
    StorageService.updateDoctor(id, updates);
    loadAllData();
  };

  // Staff Management Handlers
  const handleAddStaff = (member: Omit<StaffMember, 'id' | 'createdAt'>) => {
    StorageService.addStaffMember(member);
    loadAllData();
  };

  const handleUpdateStaff = (id: string, updates: Partial<StaffMember>) => {
    StorageService.updateStaffMember(id, updates);
    loadAllData();
  };

  const handleDeleteStaff = (id: string) => {
    StorageService.deleteStaffMember(id);
    loadAllData();
  };

  // Template Pricing & Custom Catalog Handlers
  const handleUpdateTemplate = (id: string, updates: Partial<TestTemplate>) => {
    StorageService.updateTestTemplate(id, updates);
    loadAllData();
  };

  const handleAddTemplate = (template: Omit<TestTemplate, 'id'>) => {
    StorageService.addTestTemplate(template);
    loadAllData();
  };

  const handleDeleteTemplate = (id: string) => {
    StorageService.deleteTestTemplate(id);
    loadAllData();
  };

  // Mark Report Delivered Handler
  const handleMarkDelivered = (reportId: string) => {
    StorageService.updatePatientReport(reportId, { status: 'DELIVERED' });
    loadAllData();
    if (reportToPrint && reportToPrint.id === reportId) {
      setReportToPrint((prev) => (prev ? { ...prev, status: 'DELIVERED' } : null));
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
        onNavigate={(view) => {
          if (view === 'new-report') {
            setEditingReport(null);
          }
          setActiveView(view);
        }}
        activeView={activeView}
      />

      <div className="flex-1 flex">
        {/* Collateral Desktop Sidebar */}
        <Sidebar
          activeView={activeView}
          onNavigate={(view) => {
            if (view === 'new-report') {
              setEditingReport(null);
            }
            setActiveView(view);
          }}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
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
        </main>
      </div>

      {/* Printable Clinical Report View Modal */}
      {reportToPrint && (
        <PrintableReportView
          report={reportToPrint}
          onClose={() => setReportToPrint(null)}
          onMarkDelivered={handleMarkDelivered}
        />
      )}

      {/* Dual Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
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
