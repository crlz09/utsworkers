import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute, ClientRoute } from "./components/AccessRoute";

const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AdminNotificationsPage = lazy(() => import("./pages/AdminNotificationsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const InterviewMiniApp = lazy(() => import("./pages/InterviewMiniApp"));
const InterviewsPage = lazy(() => import("./pages/InterviewsPage"));
const WorkerProfilePage = lazy(() => import("./pages/WorkerProfilePage"));
const JobsPageTest = lazy(() => import("./pages/JobsPageTest"));
const CtsJobDetailPage = lazy(() => import("./pages/CtsJobDetailPage"));
const ClientCtsJobDetailPage = lazy(() => import("./pages/ClientCtsJobDetailPage"));
const HoursTrackerPage = lazy(() => import("./pages/HoursTrackerPage"));
const WorkerHoursPage = lazy(() => import("./pages/WorkerHoursPage"));
const InvoicePage = lazy(() => import("./pages/InvoicePage"));

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

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/interviews/new"
          element={
            <AdminRoute>
              <InterviewMiniApp />
            </AdminRoute>
          }
        />
        <Route
          path="/interviews"
          element={
            <AdminRoute>
              <InterviewsPage />
            </AdminRoute>
          }
        />
        <Route path="/profile/:slug" element={<WorkerProfilePage />} />
        <Route path="/worker/hours" element={<Navigate to="/login" replace />} />
        <Route path="/workers/hours" element={<Navigate to="/login" replace />} />
        <Route
          path="/client/cts-jobs"
          element={
            <ClientRoute>
              <JobsPageTest mode="client" />
            </ClientRoute>
          }
        />
        <Route
          path="/client/cts-jobs/:jobId"
          element={
            <ClientRoute>
              <ClientCtsJobDetailPage />
            </ClientRoute>
          }
        />
        <Route
          path="/client/hours"
          element={
            <ClientRoute>
              <Navigate to="/client/cts-jobs" replace />
            </ClientRoute>
          }
        />
        <Route
          path="/worker/hours"
          element={<WorkerHoursPage />}
        />
        <Route
          path="/hours"
          element={
            <AdminRoute>
              <HoursTrackerPage mode="admin" />
            </AdminRoute>
          }
        />
        <Route
          path="/invoice"
          element={
            <AdminRoute>
              <InvoicePage />
            </AdminRoute>
          }
        />
        <Route
          path="/cts-jobs"
          element={
            <AdminRoute>
              <JobsPageTest />
            </AdminRoute>
          }
        />
        <Route
          path="/cts-jobs-test"
          element={
            <AdminRoute>
              <Navigate to="/cts-jobs" replace />
            </AdminRoute>
          }
        />
        <Route
          path="/cts-jobs/:jobId"
          element={
            <AdminRoute>
              <CtsJobDetailPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <AdminRoute>
              <AdminNotificationsPage />
            </AdminRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}
