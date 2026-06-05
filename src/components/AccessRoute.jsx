import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getCurrentUserAccess } from "../lib/userAccess";

function CheckingAccess() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontWeight: 800,
        color: "#0f172a",
      }}
    >
      Checking access...
    </div>
  );
}

export function AdminRoute({ children }) {
  const [state, setState] = useState({ checking: true, access: null });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const access = await getCurrentUserAccess();
      if (mounted) setState({ checking: false, access });
    };

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (state.checking) return <CheckingAccess />;
  if (!state.access?.user) return <Navigate to="/login" replace />;
  if (state.access.isClient && !state.access.isAdmin) {
    return <Navigate to="/client/cts-jobs" replace />;
  }
  if (!state.access.isAdmin) return <Navigate to="/login" replace />;

  return children;
}

export function ClientRoute({ children }) {
  const [state, setState] = useState({ checking: true, access: null });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const access = await getCurrentUserAccess();
      if (mounted) setState({ checking: false, access });
    };

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (state.checking) return <CheckingAccess />;
  if (!state.access?.user) return <Navigate to="/login" replace />;
  if (!state.access.isClient) return <Navigate to="/admin" replace />;

  return children;
}

export function WorkerRoute({ children }) {
  const [state, setState] = useState({ checking: true, access: null });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const access = await getCurrentUserAccess();
      if (mounted) setState({ checking: false, access });
    };

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (state.checking) return <CheckingAccess />;
  if (!state.access?.user) return <Navigate to="/login" replace />;
  if (state.access.isAdmin) return <Navigate to="/admin" replace />;
  if (state.access.isClient) return <Navigate to="/client/cts-jobs" replace />;
  if (!state.access.isWorker) return <Navigate to="/login" replace />;

  return children;
}
