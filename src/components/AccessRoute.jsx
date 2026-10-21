import { Navigate } from "react-router-dom";
import { useAccess } from "../lib/accessContext";

function AccessGate({ children, role }) {
  const { checking, access, error, refresh } = useAccess();
  if (checking) return <div role="status" className="access-status">Checking access…</div>;
  if (error && !access) return <div role="alert" className="access-status">{error} <button onClick={refresh}>Retry</button></div>;
  if (!access?.user) return <Navigate to="/login" replace />;
  if (role === "admin" && !access.isAdmin)
    return <Navigate to={access.isClient ? "/client/cts-jobs" : "/login"} replace />;
  if (role === "client" && !access.isClient) return <Navigate to="/admin/candidate" replace />;
  if (role === "worker") {
    if (access.isAdmin) return <Navigate to="/admin/candidate" replace />;
    if (access.isClient) return <Navigate to="/client/cts-jobs" replace />;
    if (!access.isWorker) return <Navigate to="/login" replace />;
  }
  return children;
}
export function AdminRoute({ children }) { return <AccessGate role="admin">{children}</AccessGate>; }
export function ClientRoute({ children }) { return <AccessGate role="client">{children}</AccessGate>; }
export function WorkerRoute({ children }) { return <AccessGate role="worker">{children}</AccessGate>; }
