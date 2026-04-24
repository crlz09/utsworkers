import { Navigate, Route, Routes } from "react-router-dom";
import RegisterPage from "./pages/RegisterPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import InterviewMiniApp from "./pages/InterviewMiniApp";
import InterviewsPage from "./pages/InterviewsPage";
import WorkerProfilePage from "./pages/WorkerProfilePage";
import ProtectedRoute from "./components/ProtectedRoute";
import CtsJobsPage from "./pages/CtsJobsPage";
import CtsJobDetailPage from "./pages/CtsJobDetailPage";

export default function App() {
  return (
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
      <Route
        path="/profile/:slug"
        element={
          <ProtectedRoute>
            <WorkerProfilePage />
          </ProtectedRoute>
        }
      />
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
  );
}
