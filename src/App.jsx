import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AccessProvider from "./components/AccessProvider";
import OperationsLayout from "./components/OperationsLayout";
import GlobalQuickNotes from "./components/GlobalQuickNotes";
import { AdminRoute, ClientRoute, WorkerRoute } from "./components/AccessRoute";

const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const PlannerPage = lazy(() => import("./pages/PlannerPage"));
const ActivityLogPage = lazy(() => import("./pages/ActivityLogPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const WorkerProfilePage = lazy(() => import("./pages/WorkerProfilePage"));
const JobsPageTest = lazy(() => import("./pages/JobsPageTest"));
const CtsJobDetailPage = lazy(() => import("./pages/CtsJobDetailPage"));
const ClientCtsJobDetailPage = lazy(() => import("./pages/ClientCtsJobDetailPage"));
const HoursTrackerPage = lazy(() => import("./pages/HoursTrackerPage"));
const CtsWeeklyPage = lazy(() => import("./pages/CtsWeeklyPage"));
const InvoicePage = lazy(() => import("./pages/InvoicePage"));
const WorkerHoursPage = lazy(() => import("./pages/WorkerHoursPage"));
const BreakdownPage = lazy(() => import("./pages/BreakdownPage"));
const WorkerDocumentsPage = lazy(() => import("./pages/WorkerDocumentsPage"));
const CandidateProfilePage = lazy(() => import("./pages/CandidateProfilePage"));
const CandidatePublicProfilePage = lazy(() => import("./pages/CandidatePublicProfilePage"));
const CandidateCtsFormPage = lazy(() => import("./pages/CandidateCtsFormPage"));
const CandidatesHomePage = lazy(() => import("./pages/CandidatesHomePage"));
const CandidateBioPage = lazy(() => import("./pages/CandidateBioPage"));
const CandidateDetailsPage = lazy(() => import("./pages/CandidateDetailsPage"));
const AdminDocsPage = lazy(() => import("./pages/AdminDocsPage"));
const OnboardingCertsPage = lazy(() => import("./pages/OnboardingCertsPage"));
const ScreeningOnboardingPage = lazy(() => import("./pages/ScreeningOnboardingPage"));

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)",
        color: "#0f172a",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontWeight: 800,
      }}
    >
      Loading...
    </div>
  );
}

function PlannerRedirect() {
  const location = useLocation();
  return <Navigate to={`/admin/onboarding/planner${location.search}`} replace />;
}

function CandidatesRedirect() {
  const location = useLocation();
  return <Navigate to={`/admin/candidate${location.search}${location.hash}`} replace />;
}

export default function App() {
  return (
    <AccessProvider>
      <GlobalQuickNotes />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<AdminRoute><OperationsLayout /></AdminRoute>}>
            <Route path="/admin" element={<CandidatesRedirect />} />
            <Route path="/admin/overview" element={<AdminPage />} />
            <Route path="/admin/candidate" element={<CandidatesHomePage />} />
            <Route path="/admin/candidates" element={<CandidatesRedirect />} />
            <Route path="/admin/docs" element={<AdminDocsPage />} />
            <Route path="/admin/onboarding/planner" element={<PlannerPage />} />
            <Route path="/admin/onboarding" element={<ScreeningOnboardingPage />} />
            <Route path="/admin/onboarding/certs" element={<OnboardingCertsPage />} />
            <Route path="/admin/workers/:workerId/onboarding" element={<ScreeningOnboardingPage />} />
            <Route path="/admin/workers/:workerId/onboarding/certs" element={<OnboardingCertsPage />} />
            <Route path="/admin/workers/:workerId/details" element={<CandidateDetailsPage />} />
            <Route path="/admin/workers/:workerId/profile" element={<CandidateProfilePage adminMode />} />
            <Route path="/admin/workers/:workerId/documents" element={<WorkerDocumentsPage adminMode />} />
            <Route path="/admin/workers/:workerId/bio" element={<CandidateBioPage />} />
            <Route path="/admin/workers/:workerId/public-profile" element={<CandidatePublicProfilePage />} />
            <Route path="/admin/workers/:workerId/cts-form" element={<CandidateCtsFormPage />} />
            <Route path="/admin/activity" element={<ActivityLogPage />} />
            <Route path="/cts-jobs" element={<JobsPageTest />} />
            <Route path="/cts-jobs/:jobId" element={<CtsJobDetailPage />} />
            <Route path="/hours" element={<HoursTrackerPage mode="admin" />} />
            <Route path="/invoice" element={<InvoicePage />} />
            <Route path="/hours/cts-weekly" element={<CtsWeeklyPage />} />
            <Route path="/invoice/cts-weekly" element={<CtsWeeklyPage />} />
            <Route path="/breakdown" element={<BreakdownPage />} />
          </Route>
          <Route path="/admin/legacy" element={<Navigate to="/admin/candidate" replace />} />
          <Route path="/worker/profile" element={<WorkerRoute><CandidateProfilePage /></WorkerRoute>} />
          <Route path="/worker/documents" element={<WorkerRoute><WorkerDocumentsPage /></WorkerRoute>} />
          <Route path="/worker/hours" element={<WorkerRoute><Navigate to="/worker/profile" replace /></WorkerRoute>} />
          <Route path="/client/cts-jobs" element={<ClientRoute><JobsPageTest mode="client" /></ClientRoute>} />
          <Route path="/client/cts-jobs/:jobId" element={<ClientRoute><ClientCtsJobDetailPage /></ClientRoute>} />
          <Route path="/profile/:slug" element={<WorkerProfilePage />} />
          <Route path="/worker/hours/:token" element={<WorkerHoursPage />} />
          <Route path="/workers/hours/:token" element={<WorkerHoursPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/interviews/*" element={<Navigate to="/admin/candidate" replace />} />
          <Route path="/cts-jobs-test" element={<Navigate to="/cts-jobs" replace />} />
          <Route path="/admin/planner" element={<PlannerRedirect />} />
          <Route path="/admin/notifications" element={<Navigate to="/admin/onboarding/planner" replace />} />
        </Routes>
      </Suspense>
    </AccessProvider>
  );
}
