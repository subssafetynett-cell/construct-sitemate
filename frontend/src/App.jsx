import { lazy } from "react";
import Home from './pages/Home'
import { Routes, Route, Navigate } from "react-router-dom";
import SignupPage from "./pages/Signup";
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/Login';
import RequireAuth from './components/RequireAuth';
import RoleGuard from './components/RoleGuard';
import AcceptViewInvite from './pages/AcceptViewInvite';
import ResetPassword from "./pages/ResetPassword";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Setup2FA from "./pages/Setup2FA";
import UnauthorizedPage from './pages/UnauthorizedPage';

import { ThemeProvider } from './context/ThemeContext';

const UsersPage = lazy(() => import('./pages/Users'));
const ClientsPage = lazy(() => import('./pages/Clients'));
const UserViewAccessPage = lazy(() => import('./pages/UserViewAccess'));
const FormBuilderPage = lazy(() => import('./pages/FormBuilderPage'));
const UserClients = lazy(() => import('./pages/UserClients'));
const ViewForms = lazy(() => import('./pages/ViewForms'));
const ViewSingleForm = lazy(() => import('./pages/ViewSingleForm'));
const UseForm = lazy(() => import('./pages/UseForm'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const GenericReportPage = lazy(() => import('./pages/GenericReportPage'));
const CreateSitesPage = lazy(() => import('./pages/CreateSitesPage'));
const SitepackManagement = lazy(() => import('./pages/SitepackManagement'));
const ConcernReportDashboard = lazy(() => import('./pages/ConcernReportDashboard'));
const MonitoringSectionDashboardPage = lazy(() => import('./pages/MonitoringSectionDashboardPage'));
const MonitoringSectionPage = lazy(() => import('./pages/MonitoringSectionPage'));
const NonconformanceDashboardPage = lazy(() => import('./pages/NonconformanceDashboardPage'));
const NonconformanceDetailPage = lazy(() => import('./pages/NonconformanceDetailPage'));
const NonconformanceCalendarPage = lazy(() => import('./pages/NonconformanceCalendarPage'));
const NonconformanceAnalyticsPage = lazy(() => import('./pages/NonconformanceAnalyticsPage'));
const NonconformanceAllPage = lazy(() => import('./pages/NonconformanceAllPage'));
const AuditReportDashboard = lazy(() => import('./pages/AuditReportDashboard'));
const GeneralFormsList = lazy(() => import('./pages/GeneralFormsList'));
const SavedSignaturesPage = lazy(() => import('./pages/SavedSignaturesPage'));
const ToolBoxTalkForm = lazy(() => import('./pages/ToolBoxTalkForm'));
const RamsBriefingForm = lazy(() => import('./pages/RamsBriefingForm'));
const SiteInductionForm = lazy(() => import('./pages/SiteInductionForm'));
const ManagementSiteInspectionForm = lazy(() => import('./pages/ManagementSiteInspectionForm'));
const DailySafeStartBriefingForm = lazy(() => import('./pages/DailySafeStartBriefingForm'));
const AuditActionForm = lazy(() => import('./pages/AuditActionForm'));
const SiteInductionRecordForm = lazy(() => import('./pages/SiteInductionRecordForm'));
const LolerInspectionForm = lazy(() => import('./pages/LolerInspectionForm'));
const PuwerInspectionForm = lazy(() => import('./pages/PuwerInspectionForm'));
const AlimakWeeklyCheckForm = lazy(() => import('./pages/AlimakWeeklyCheckForm'));
const CreateForm = lazy(() => import('./pages/CreateForm'));
const SheqInstallationForm = lazy(() => import('./pages/SheqInstallationForm'));
const SheqInspectionSelectionPage = lazy(() => import('./pages/SheqInspectionSelectionPage'));
const ShqInstallationSelectionPage = lazy(() => import('./pages/ShqInstallationSelectionPage'));

// ─── Role shorthand arrays ─────────────────────────────────────────────────────
const ADMIN_PLUS    = ["superadmin", "company_admin"];
const MANAGER_PLUS  = ["superadmin", "company_admin", "site_manager"];
const SUPERVISOR_PLUS = ["superadmin", "company_admin", "site_manager", "supervisor"];
/** Site pack, SHEQ, weekly inspections — workers may fill forms (API uses requireAuth). */
const FIELD_OPS_ROLES = [...SUPERVISOR_PLUS, "worker"];

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>

        <Routes>
          {/* ── Public routes ─────────────────────────────────────── */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/view-invite/:token" element={<AcceptViewInvite />} />
          <Route path="/setup-2fa" element={<Setup2FA />} />
          <Route path="/unauthorized" element={<RequireAuth><UnauthorizedPage /></RequireAuth>} />

          {/* ── Superadmin only ───────────────────────────────────── */}
          <Route path="/clients" element={
            <RequireAuth>
              <RoleGuard allowedRoles={["superadmin"]}>
                <ClientsPage />
              </RoleGuard>
            </RequireAuth>
          } />

          {/* ── Admin+ (superadmin, company_admin) — users only ───── */}
          <Route path="/users" element={
            <RequireAuth>
              <RoleGuard allowedRoles={ADMIN_PLUS} matchStoredRoleOnly>
                <UsersPage />
              </RoleGuard>
            </RequireAuth>
          } />
          <Route path="/clients/:id/users" element={
            <RequireAuth>
              <RoleGuard allowedRoles={["superadmin"]}>
                <UsersPage />
              </RoleGuard>
            </RequireAuth>
          } />
          <Route path="/user-view-access" element={
            <RequireAuth>
              <RoleGuard allowedRoles={ADMIN_PLUS} matchStoredRoleOnly>
                <UserViewAccessPage />
              </RoleGuard>
            </RequireAuth>
          } />
          <Route path="/enable-user" element={<Navigate to="/user-view-access" replace />} />
          {/* ── Manager+ (superadmin, company_admin, site_manager) ── */}
          <Route path="/forms" element={
            <RequireAuth>
              <RoleGuard allowedRoles={SUPERVISOR_PLUS}>
                <ViewForms />
              </RoleGuard>
            </RequireAuth>
          } />
          <Route path="/form-build" element={
            <RequireAuth>
              <RoleGuard allowedRoles={SUPERVISOR_PLUS}>
                <FormBuilderPage />
              </RoleGuard>
            </RequireAuth>
          } />
          <Route path="/forms/:id" element={
            <RequireAuth>
              <RoleGuard allowedRoles={SUPERVISOR_PLUS}>
                <ViewSingleForm />
              </RoleGuard>
            </RequireAuth>
          } />
          <Route path="/create-sites" element={
            <RequireAuth>
              <RoleGuard allowedRoles={ADMIN_PLUS}>
                <CreateSitesPage />
              </RoleGuard>
            </RequireAuth>
          } />
          <Route path="/sitepack-management" element={
            <RequireAuth>
              <RoleGuard allowedRoles={FIELD_OPS_ROLES}>
                <SitepackManagement />
              </RoleGuard>
            </RequireAuth>
          } />
          <Route path="/create-form" element={
            <RequireAuth>
              <RoleGuard allowedRoles={SUPERVISOR_PLUS}>
                <CreateForm />
              </RoleGuard>
            </RequireAuth>
          } />

          {/* ── All authenticated users ───────────────────────────── */}
          <Route path="/company" element={<UserClients />} />
          <Route path="/forms/:id/use" element={<UseForm />} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/account-settings" element={<RequireAuth><AccountSettings /></RequireAuth>} />

          {/* Report routes — all roles */}
          <Route path="/report-health-safety" element={<RequireAuth><GenericReportPage pageTitle="Health & Safety concern" /></RequireAuth>} />
          <Route path="/report-environmental" element={<RequireAuth><GenericReportPage pageTitle="Sustainability concern" /></RequireAuth>} />
          <Route path="/report-quality" element={<RequireAuth><GenericReportPage pageTitle="Quality concern" /></RequireAuth>} />
          <Route path="/report-positive" element={<RequireAuth><GenericReportPage pageTitle="Positive observation" /></RequireAuth>} />
          <Route path="/concern-positive-report" element={<RequireAuth><GenericReportPage pageTitle="Concern and positive feedback report" /></RequireAuth>} />

          {/* Supervisor+ inspection routes */}
          <Route path="/weekly-supervisor" element={<RequireAuth><RoleGuard allowedRoles={FIELD_OPS_ROLES}><GenericReportPage pageTitle="Weekly supervisor health & safety inspection" /></RoleGuard></RequireAuth>} />
          <Route path="/weekly-reports" element={<RequireAuth><RoleGuard allowedRoles={FIELD_OPS_ROLES}><GenericReportPage pageTitle="Weekly supervisor reports" /></RoleGuard></RequireAuth>} />

          {/* SHEQ / field ops — workers can submit; form builder stays supervisor+ */}
          <Route path="/sheq-report" element={<RequireAuth><RoleGuard allowedRoles={FIELD_OPS_ROLES}><GenericReportPage pageTitle="SHEQ Inspection" /></RoleGuard></RequireAuth>} />
          <Route path="/sheq-inspection" element={<RequireAuth><RoleGuard allowedRoles={FIELD_OPS_ROLES}><SheqInspectionSelectionPage /></RoleGuard></RequireAuth>} />
          <Route path="/sheq-install-form" element={<RequireAuth><RoleGuard allowedRoles={FIELD_OPS_ROLES}><SheqInstallationForm /></RoleGuard></RequireAuth>} />
          <Route path="/sheq-install-form/:id" element={<RequireAuth><RoleGuard allowedRoles={FIELD_OPS_ROLES}><SheqInstallationForm /></RoleGuard></RequireAuth>} />

          <Route path="/shq-installation" element={<RequireAuth><RoleGuard allowedRoles={FIELD_OPS_ROLES}><ShqInstallationSelectionPage /></RoleGuard></RequireAuth>} />
          
          {/* Redirects for old routes */}
          <Route path="/sheq-install" element={<Navigate to="/sheq-inspection" replace />} />
          <Route path="/sheq-install-report" element={<Navigate to="/shq-installation" replace />} />
          <Route path="/lift-sector-client" element={<RequireAuth><RoleGuard allowedRoles={ADMIN_PLUS}><GenericReportPage pageTitle="Client level analysis" /></RoleGuard></RequireAuth>} />
          <Route path="/lift-sector-site" element={<RequireAuth><RoleGuard allowedRoles={ADMIN_PLUS}><GenericReportPage pageTitle="Site level analysis" /></RoleGuard></RequireAuth>} />

          {/* General forms — all authenticated */}
          <Route path="/general-forms" element={<RequireAuth><GeneralFormsList /></RequireAuth>} />
          <Route path="/saved-signatures" element={<RequireAuth><SavedSignaturesPage /></RequireAuth>} />
          <Route path="/general-forms/tool-box-talk" element={<RequireAuth><ToolBoxTalkForm /></RequireAuth>} />
          <Route path="/general-forms/tool-box-talk/:id" element={<RequireAuth><ToolBoxTalkForm /></RequireAuth>} />
          <Route path="/general-forms/rams-briefing" element={<RequireAuth><RamsBriefingForm /></RequireAuth>} />
          <Route path="/general-forms/rams-briefing/:id" element={<RequireAuth><RamsBriefingForm /></RequireAuth>} />
          <Route path="/general-forms/site-induction" element={<RequireAuth><SiteInductionForm /></RequireAuth>} />
          <Route path="/general-forms/site-induction/:id" element={<RequireAuth><SiteInductionForm /></RequireAuth>} />
          <Route path="/general-forms/daily-safe-start-briefing" element={<RequireAuth><DailySafeStartBriefingForm /></RequireAuth>} />
          <Route path="/general-forms/daily-safe-start-briefing/:id" element={<RequireAuth><DailySafeStartBriefingForm /></RequireAuth>} />
          <Route path="/general-forms/audit-action-form" element={<RequireAuth><AuditActionForm /></RequireAuth>} />
          <Route path="/general-forms/audit-action-form/:id" element={<RequireAuth><AuditActionForm /></RequireAuth>} />
          <Route path="/general-forms/site-induction-form" element={<RequireAuth><SiteInductionRecordForm /></RequireAuth>} />
          <Route path="/general-forms/site-induction-form/:id" element={<RequireAuth><SiteInductionRecordForm /></RequireAuth>} />
          <Route path="/general-forms/management-site-inspection" element={<RequireAuth><ManagementSiteInspectionForm /></RequireAuth>} />
          <Route path="/general-forms/management-site-inspection/:id" element={<RequireAuth><ManagementSiteInspectionForm /></RequireAuth>} />
          <Route path="/general-forms/loler-inspection-form" element={<RequireAuth><LolerInspectionForm /></RequireAuth>} />
          <Route path="/general-forms/loler-inspection-form/:id" element={<RequireAuth><LolerInspectionForm /></RequireAuth>} />
          <Route path="/general-forms/puwer-inspection-form" element={<RequireAuth><PuwerInspectionForm /></RequireAuth>} />
          <Route path="/general-forms/puwer-inspection-form/:id" element={<RequireAuth><PuwerInspectionForm /></RequireAuth>} />
          <Route path="/general-forms/alimak-weekly-check" element={<RequireAuth><AlimakWeeklyCheckForm /></RequireAuth>} />
          <Route path="/general-forms/alimak-weekly-check/:id" element={<RequireAuth><AlimakWeeklyCheckForm /></RequireAuth>} />
          <Route path="/frida-forms" element={<RequireAuth><GenericReportPage pageTitle="Friday pack forms" /></RequireAuth>} />

          {/* Dashboard KPI pages */}
          <Route path="/dashboard" element={<RequireAuth><ConcernReportDashboard /></RequireAuth>} />
          <Route path="/dashboard/occupational-health-safety-kpis" element={<RequireAuth><MonitoringSectionDashboardPage section="ohs" /></RequireAuth>} />
          <Route path="/dashboard/environmental-management-kpis" element={<RequireAuth><MonitoringSectionDashboardPage section="environmental" /></RequireAuth>} />
          <Route path="/dashboard/quality-management-kpis" element={<RequireAuth><MonitoringSectionDashboardPage section="quality" /></RequireAuth>} />
          <Route path="/dashboard/food-safety-management" element={<RequireAuth><MonitoringSectionDashboardPage section="food-safety" /></RequireAuth>} />
          <Route path="/dashboard/lift-regulations-management-kpis" element={<RequireAuth><MonitoringSectionDashboardPage section="lift" /></RequireAuth>} />

          {/* Monitoring forms — sites, folders, submissions */}
          <Route path="/monitoring/ohs/site/:siteId/folder/:folderId" element={<RequireAuth><MonitoringSectionPage section="ohs" /></RequireAuth>} />
          <Route path="/monitoring/ohs/site/:siteId" element={<RequireAuth><MonitoringSectionPage section="ohs" /></RequireAuth>} />
          <Route path="/monitoring/ohs" element={<RequireAuth><MonitoringSectionPage section="ohs" /></RequireAuth>} />
          <Route path="/monitoring/environmental/site/:siteId/folder/:folderId" element={<RequireAuth><MonitoringSectionPage section="environmental" /></RequireAuth>} />
          <Route path="/monitoring/environmental/site/:siteId" element={<RequireAuth><MonitoringSectionPage section="environmental" /></RequireAuth>} />
          <Route path="/monitoring/environmental" element={<RequireAuth><MonitoringSectionPage section="environmental" /></RequireAuth>} />
          <Route path="/monitoring/quality/site/:siteId/folder/:folderId" element={<RequireAuth><MonitoringSectionPage section="quality" /></RequireAuth>} />
          <Route path="/monitoring/quality/site/:siteId" element={<RequireAuth><MonitoringSectionPage section="quality" /></RequireAuth>} />
          <Route path="/monitoring/quality" element={<RequireAuth><MonitoringSectionPage section="quality" /></RequireAuth>} />
          <Route path="/monitoring/food-safety/site/:siteId/folder/:folderId" element={<RequireAuth><MonitoringSectionPage section="food-safety" /></RequireAuth>} />
          <Route path="/monitoring/food-safety/site/:siteId" element={<RequireAuth><MonitoringSectionPage section="food-safety" /></RequireAuth>} />
          <Route path="/monitoring/food-safety" element={<RequireAuth><MonitoringSectionPage section="food-safety" /></RequireAuth>} />
          <Route path="/monitoring/lift/site/:siteId/folder/:folderId" element={<RequireAuth><MonitoringSectionPage section="lift" /></RequireAuth>} />
          <Route path="/monitoring/lift/site/:siteId" element={<RequireAuth><MonitoringSectionPage section="lift" /></RequireAuth>} />
          <Route path="/monitoring/lift" element={<RequireAuth><MonitoringSectionPage section="lift" /></RequireAuth>} />

          {/* Legacy URLs → monitoring forms */}
          <Route path="/dashboard/occupational-health-safety-kpis/site/:siteId/folder/:folderId" element={<RequireAuth><MonitoringSectionPage section="ohs" /></RequireAuth>} />
          <Route path="/dashboard/occupational-health-safety-kpis/site/:siteId" element={<RequireAuth><MonitoringSectionPage section="ohs" /></RequireAuth>} />
          <Route path="/dashboard/environmental-management-kpis/site/:siteId/folder/:folderId" element={<RequireAuth><MonitoringSectionPage section="environmental" /></RequireAuth>} />
          <Route path="/dashboard/environmental-management-kpis/site/:siteId" element={<RequireAuth><MonitoringSectionPage section="environmental" /></RequireAuth>} />
          <Route path="/dashboard/quality-management-kpis/site/:siteId/folder/:folderId" element={<RequireAuth><MonitoringSectionPage section="quality" /></RequireAuth>} />
          <Route path="/dashboard/quality-management-kpis/site/:siteId" element={<RequireAuth><MonitoringSectionPage section="quality" /></RequireAuth>} />
          <Route path="/dashboard/food-safety-management/site/:siteId/folder/:folderId" element={<RequireAuth><MonitoringSectionPage section="food-safety" /></RequireAuth>} />
          <Route path="/dashboard/food-safety-management/site/:siteId" element={<RequireAuth><MonitoringSectionPage section="food-safety" /></RequireAuth>} />
          <Route path="/nonconformance" element={<RequireAuth><NonconformanceDashboardPage /></RequireAuth>} />
          <Route path="/nonconformance/all" element={<RequireAuth><RoleGuard allowedRoles={ADMIN_PLUS}><NonconformanceAllPage /></RoleGuard></RequireAuth>} />
          <Route path="/nc/:id" element={<RequireAuth><NonconformanceDetailPage /></RequireAuth>} />
          <Route path="/nc-calendar" element={<RequireAuth><NonconformanceCalendarPage /></RequireAuth>} />
          <Route path="/nc-dashboard" element={<RequireAuth><NonconformanceAnalyticsPage /></RequireAuth>} />
          <Route path="/action-tracker" element={<Navigate to="/nonconformance" replace />} />
          <Route path="/concern-reports" element={<RequireAuth><ConcernReportDashboard /></RequireAuth>} />
          <Route path="/audit-reports" element={<RequireAuth><AuditReportDashboard /></RequireAuth>} />

        </Routes>
      </ErrorBoundary>
    </ThemeProvider>


  )
}

export default App

