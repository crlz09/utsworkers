import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        navigate("/admin", { replace: true });
        return;
      }

      setCheckingSession(false);
    };

    checkSession();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message || "Login failed.");
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/admin", { replace: true });
  };

  if (checkingSession) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ fontWeight: 800, color: "#0f172a" }}>Checking session...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)",
        padding: 24,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#ffffff",
          borderRadius: 28,
          padding: 32,
          border: "1px solid #dbeafe",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
          display: "grid",
          gap: 18,
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              padding: "8px 16px",
              borderRadius: 999,
              background: "#0f172a",
              color: "#ffffff",
              fontWeight: 800,
              marginBottom: 14,
            }}
          >
            Universal Talent Source
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 34,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#0f172a",
            }}
          >
            Admin Login
          </h1>

          <p style={{ color: "#475569", marginTop: 10, lineHeight: 1.7 }}>
            Sign in to access the admin dashboard.
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "grid", gap: 14 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "13px 14px",
              borderRadius: 14,
              border: "1px solid #cbd5e1",
              outline: "none",
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "13px 14px",
              borderRadius: 14,
              border: "1px solid #cbd5e1",
              outline: "none",
            }}
          />

          {error ? (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              border: "none",
              background: loading ? "#94a3b8" : "#0f172a",
              color: "#ffffff",
              borderRadius: 14,
              padding: "13px 18px",
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}