import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const InterviewMiniApp = lazy(() => import("./pages/InterviewMiniApp"));
const InterviewsPage = lazy(() => import("./pages/InterviewsPage"));
const WorkerProfilePage = lazy(() => import("./pages/WorkerProfilePage"));
const CtsJobsPage = lazy(() => import("./pages/CtsJobsPage"));
const CtsJobDetailPage = lazy(() => import("./pages/CtsJobDetailPage"));

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
        <Route path="/" element={<Navigate to="/register" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/interviews/new"
          element={
            <ProtectedRoute>
              <InterviewMiniApp />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interviews"
          element={
            <ProtectedRoute>
              <InterviewsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/profile/:slug" element={<WorkerProfilePage />} />
        <Route
          path="/cts-jobs"
          element={
            <ProtectedRoute>
              <CtsJobsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cts-jobs/:jobId"
          element={
            <ProtectedRoute>
              <CtsJobDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}
