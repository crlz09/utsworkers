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
      <Route path="/interviews/new" element={<InterviewMiniApp />} />
      <Route path="/interviews" element={<InterviewsPage />} />
      <Route path="/profile/:slug" element={<WorkerProfilePage />} />
      <Route path="/cts-jobs" element={<CtsJobsPage />} />
      <Route path="/cts-jobs/:jobId" element={<CtsJobDetailPage />} />
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