# PathoCare Lab - Diagnostic Pathology & Lab Management Web Application

A full-featured diagnostic laboratory management system (LIS) tailored for medical pathology labs. It empowers lab owners to manage their laboratory profile, configure staff accounts with secure PINs, track referring doctor records and commissions, register patients, input multi-parameter lab test reports with automated normal-range checks, and print hospital-grade clinical test reports.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your requirements, here are the core architectural and design decisions confirmed for your Pathology Lab System:
> - **Dual Login Architecture**:
>   1. **Google Account Sign-In**: Quick 1-click access for the Lab Owner / Chief Pathologist.
>   2. **Lab ID + Staff ID + 4-Digit PIN**: Dedicated login flow for lab technicians and desk operators using the Lab's unique identifier, their assigned Staff ID, and a secure PIN without requiring personal Google accounts.
> - **Role-Based Access Control (RBAC)**:
>   - **Owner / Administrator**: Complete access to all features (Financial analytics, referral doctor fee/incentive tracking, staff management, test catalog pricing, delete/edit rights, lab letterhead settings).
>   - **Staff / Technician**: Restricted access (Patient registration, entering test results, updating report status, viewing and printing test reports; strictly blocked from deleting historical reports, modifying test base prices, viewing net financial ledgers, or altering staff accounts).
> - **Desktop-First Layout**: High-density desktop workspace featuring a clean collateral sidebar, streamlined multi-field test entry tables, patient search & filter bar, and a dedicated pixel-perfect A4 printable medical lab report view.
> - **Referring Doctor Directory**: Dedicated tracking of referring physicians, their clinic/hospital affiliations, contact numbers, referral volume, and associated patient test logs.
> - **Persistent Data Storage**: Robust structured client-side local database (with JSON backup/restore and sample pathology data) ensuring zero data loss across page refreshes and offline resilience.

---

## 1. Overview & Core Concept

- **What It Does**: PathoCare is an end-to-end web application for diagnostic pathology clinics. It manages the complete patient journey from intake and sample collection to multi-parameter result entry (e.g., Complete Blood Count, Lipid Profile, Liver Function Test, Blood Glucose, Urine Routine), automated out-of-range flag highlighting (High/Low/Critical), doctor referral tracking, and official PDF/Print report generation with lab header, barcode, and digital signature stamps.
- **Target Audience / Persona**: Pathology lab owners, senior pathologists, lab technicians, front-desk receptionists, and referring medical practitioners.
- **Key Value**: Eliminates manual paper logbooks, prevents transcription errors with automated normal range flags, securely isolates staff actions from administrative financial controls, and streamlines doctor referral tracking.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Authentication & Session Initiation**:
   - The user opens the app and selects either **"Login with Google (Owner)"** or **"Staff Access (Lab ID + User ID + PIN)"**.
   - For demo & setup convenience, quick-switch presets are provided (`Owner Demo`, `Technician Demo`) along with custom registration to create a new unique Lab ID (e.g., `LAB-7842`).
2. **Dashboard & Operational Overview**:
   - High-level KPI metrics: Today's Patients, Pending Test Results, Completed Reports, and Total Referring Doctors.
   - Quick action bar: "Register New Patient", "New Test Report", "Add Referring Doctor".
3. **Patient Registration & Test Assignment**:
   - Front-desk or staff enters Patient Name, Age, Gender, Phone, and selects the Referring Doctor from an autocomplete dropdown.
   - Selects one or multiple test panels (e.g. CBC, Lipid Profile, Thyroid Panel). The system calculates billing total and sample token ID.
4. **Report Filling & Normal Range Analysis**:
   - The technician opens the test entry console.
   - Parameter values are entered (e.g. Hemoglobin, RBC, WBC, Platelets).
   - The system automatically compares observed values against age/gender-specific biological reference intervals and highlights values as `Normal`, `Low (L)`, or `High (H)`.
   - Technicians can add clinical impressions or notes.
5. **Printable Medical Lab Report**:
   - Standard clinical A4 layout with Lab Name, Address, Contact, NABL/ISO license number, Patient details, Referring Doctor, tabular parameter breakdown with units and reference ranges, and Pathologist signature stamp.
   - Direct `window.print()` / PDF export formatting with print-optimized CSS hiding navigation and chrome.
6. **Referring Doctor Management & Analytics**:
   - Doctor directory listing specialty, clinic, phone, total referred cases, and referral history with instant filter by doctor.
7. **Staff & Lab Administration (Owner Only)**:
   - Create staff credentials (Staff Name, Role, User ID, 4-digit PIN, active status).
   - Customize Lab profile (Lab Name, Logo, Address, Phone, Report Header & Footer text, Pathologist signature).

### Visual Identity & Theme

- **Aesthetic Direction**: Professional clinical healthcare workspace. Crisp, high-contrast, distraction-free, and engineered for long working hours with optimal legibility.
- **Color Palette & Mood**:
  - Dominant Neutral Canvas (60%): Clean clinical off-white / light slate (`#F8FAFC`), crisp white content cards (`#FFFFFF`).
  - Structural Surfaces (30%): Deep medical navy (`#0F172A`) for sidebar navigation, subtle hairline borders (`#E2E8F0`), slate typography (`#1E293B`, `#64748B`).
  - Medical Accent Budget (10%): Clinical Cyan & Teal (`#0284C7` / `#0D9488`) for primary CTAs and active states; semantic alerts in Crimson (`#DC2626` for High), Amber (`#D97706` for Low), and Emerald (`#16A34A` for Normal).
- **Typography & Hierarchy**:
  - Headings & Navigation: `Plus Jakarta Sans` for clean, contemporary professional authority.
  - Body & Form Controls: `DM Sans` or `Plus Jakarta Sans` at 14px–15px for high scannability.
  - Test Parameters, Units & Reference Ranges: `font-mono tabular-nums` for precise vertical decimal alignment in lab tables.
- **Component Styling & Layout**:
  - Fixed 260px left collateral navigation sidebar with collapsible mobile toggle.
  - Top breadcrumb and active user/role indicator with 1-click logout or switch profile.
  - Dense, compact data tables with subtle hover states and non-pill metadata tags.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Dual Login System (Google Auth + Lab ID/User ID/PIN)
- *Chosen Approach*: Provide a unified authentication modal with tabbed selection: (1) Google Account Sign-In (with real profile capture and session token simulation) and (2) Lab Credentials Login (Lab Unique ID + Staff User ID + 4-Digit Security PIN).
- *Why*: In diagnostic laboratories, lab owners often use their personal/business Google account on their office PC, whereas technicians and phlebotomists on shared terminal computers log in quickly using a physical terminal ID and 4-digit numeric PIN without needing individual Google accounts.

### Decision 2: Strict Owner vs. Staff Role-Based Access Control (RBAC)
- *Chosen Approach*: Enforce permission guards on UI routes and mutation actions.
- *Why*: Staff must not be able to alter historical lab pricing, delete archived patient reports, access gross revenue figures, or alter staff accounts. If a staff member attempts an unauthorized action, a clear security alert is displayed.

### Decision 3: Clinical Test Catalog with Pre-Populated Panels
- *Chosen Approach*: Built-in standard diagnostic pathology test templates (Complete Blood Count / CBC, Lipid Profile, Liver Function Test / LFT, Blood Glucose Fasting & PP, Kidney Function Test / KFT, Thyroid Profile T3/T4/TSH, Urine Routine).
- *Why*: Technicians should not have to manually retype 15 parameter names and reference ranges every time a CBC is ordered. Custom test creation is also supported for lab owners.

### Decision 4: A4 Clinical Report Print Engine
- *Chosen Approach*: Clean CSS `@media print` layout styled as an authentic medical laboratory report document (complete with lab header, patient barcode graphic, tabular findings, flagged abnormal values, pathologist verification stamp, and footer disclaimer).
- *Why*: Eliminates the need for external expensive PDF generation libraries; works natively with the browser's print-to-PDF engine with zero latency.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PathoCare Web Application                       │
├────────────────────────────────────────────────────────────────────────┤
│                           Authentication Layer                         │
│   ┌───────────────────────────────┐  ┌──────────────────────────────┐  │
│   │     Google Sign-In (Owner)    │  │  Lab ID + Staff ID + PIN     │  │
│   └───────────────┬───────────────┘  └──────────────┬───────────────┘  │
│                   └───────────────┬─────────────────┘                  │
│                                   ▼                                    │
│                     Session & RBAC Context Provider                    │
│            (Owner: All Permissions | Staff: Restricted Access)         │
├────────────────────────────────────────────────────────────────────────┤
│                       Navigation & Workspace Shell                     │
│  ┌───────────────────────┐ ┌────────────────────────────────────────┐  │
│  │   Collapsible Sidebar │ │ Top Bar: Lab ID, Breadcrumb & User Tag │  │
│  │   • Dashboard Overview│ └────────────────────────────────────────┘  │
│  │   • Patient Records   │ ┌────────────────────────────────────────┐  │
│  │   • Report Entry      │ │           Main Active View             │  │
│  │   • Referring Doctors │ │   • High-density Data Tables           │  │
│  │   • Test Catalog      │ │   • Interactive Form Parameter Inputs  │  │
│  │   • Staff Management  │ │   • Printable A4 Clinical Report Modal │  │
│  │   • Lab Settings      │ │   • Referring Doctor Tracker & Filters │  │
│  └───────────────────────┘ └────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│                           Data & State Layer                           │
│   ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐  │
│   │  Lab & Staff Store │ │ Patient & Reports  │ │  Doctor Directory  │  │
│   └────────────────────┘ └────────────────────┘ └────────────────────┘  │
│             LocalStorage Engine with JSON Seed & Backup/Export          │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Models

- **LabProfile**: `id`, `name`, `uniqueLabId` (e.g. `LAB-8921`), `address`, `phone`, `email`, `nablNumber`, `headerText`, `pathologistName`, `pathologistDegree`.
- **StaffUser**: `id`, `labId`, `userId`, `name`, `role` (`'owner'` | `'staff'`), `pin` (4 digits), `phone`, `createdAt`, `isActive`.
- **ReferringDoctor**: `id`, `labId`, `name`, `hospitalOrClinic`, `phone`, `specialty`, `commissionPercent` (optional, owner only), `totalPatientsReferred`.
- **TestPanelTemplate**: `id`, `name`, `category`, `code`, `price`, `parameters: [{ name, unit, standardRangeMale, standardRangeFemale, standardRangeChild }]`.
- **PatientReport**: `id`, `reportNumber` (e.g. `REP-2026-0042`), `labId`, `patientName`, `age`, `gender`, `phone`, `referringDoctorId`, `referringDoctorName`, `sampleCollectedAt`, `reportedAt`, `status` (`'pending'` | `'completed'` | `'delivered'`), `panelName`, `parameters: [{ name, value, unit, referenceRange, flag: 'normal'|'high'|'low' }]`, `clinicalNotes`, `createdByStaffId`, `createdByName`.

---

## 5. Verification & Implementation Sequence

1. **Phase 1: Foundation & Authentication Engine**:
   - Establish type interfaces, RBAC permission helper functions, and local database store with pre-seeded realistic diagnostic data.
   - Implement the Dual Login modal (Google Sign-In + Lab ID/Staff ID/PIN login with easy switcher).
2. **Phase 2: Core Workspace & Dashboard**:
   - Construct responsive desktop-priority layout (Sidebar, Top Bar, Metric widgets, recent patient list).
3. **Phase 3: Patient Intake & Multi-Parameter Report Entry**:
   - Build patient entry dialog with referring doctor selection.
   - Build diagnostic parameter editor with automated real-time High/Low reference range flags.
4. **Phase 4: Clinical Printable A4 Report**:
   - Pixel-perfect printable pathology report view with lab letterhead, patient QR/barcode, tabular parameters, pathologist signature block, and print trigger.
5. **Phase 5: Referring Doctor Directory & Staff RBAC Admin**:
   - Referring doctor management with case counts and filtering.
   - Owner-only staff management panel (add/edit staff, set PINs, toggle permissions) and lab settings.
6. **Phase 6: Verification**:
   - Run compilation and verify complete, error-free interactive behavior across both Owner and Staff roles.
