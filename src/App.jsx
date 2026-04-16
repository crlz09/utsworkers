import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RegisterPage from "./pages/RegisterPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import InterviewMiniApp from "./pages/InterviewMiniApp";
import WorkerProfilePage from "./pages/WorkerProfilePage";
import ProtectedRoute from "./components/ProtectedRoute";
import InterviewsPage from "./pages/InterviewsPage";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/register" replace />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/interviews/new" element={<InterviewMiniApp />} />
      <Route path="/interviews" element={<InterviewsPage />} />
      
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />

      <Route path="/profile/:slug" element={<WorkerProfilePage />} />
    </Routes>
  );
}