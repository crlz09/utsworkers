import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const inputWrapperStyle = {
    position: "relative",
    width: "100%",
  };

  const inputIconStyle = {
    position: "absolute",
    left: 15,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#64748b",
    pointerEvents: "none",
  };

  const inputStyle = {
    width: "100%",
    padding: "14px 44px",
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: 15,
    boxSizing: "border-box",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    background: "#ffffff",
  };

  if (checkingSession) {
    return (
      <div
  style={{
    minHeight: "100dvh",
    width: "100vw",
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle at top, rgba(255,255,255,0.08) 0%, rgba(21,40,55,0) 34%), #152837",
    padding: 24,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  }}
>
        Checking session...
      </div>
    );
  }

  return (
    <div
  style={{
    position: "fixed",
    inset: 0,
    width: "100vw",
    height: "100dvh",
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle at top, rgba(255,255,255,0.08) 0%, rgba(21,40,55,0) 34%), #152837",
    padding: 24,
    overflow: "auto",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  }}
>
      <div
        style={{
          display: "grid",
          gap: 28,
          justifyItems: "center",
          width: "100%",
        }}
      >
        <img
          src="/logo.png"
          alt="UTS Logo"
          style={{
            width: 300,
            maxWidth: "90%",
            filter: "drop-shadow(0 18px 35px rgba(0,0,0,0.25))",
          }}
        />

        <div
          style={{
            width: "100%",
            maxWidth: 430,
            background: "#ffffff",
            borderRadius: 30,
            padding: 34,
            boxShadow: "0 30px 90px rgba(0,0,0,0.36)",
            display: "grid",
            gap: 20,
            boxSizing: "border-box",
            border: "1px solid rgba(255,255,255,0.65)",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                padding: "7px 15px",
                borderRadius: 999,
                background: "#0f172a",
                color: "#ffffff",
                fontWeight: 800,
                marginBottom: 13,
                fontSize: 13,
              }}
            >
              Universal Talent Source
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 34,
                lineHeight: 1.05,
                letterSpacing: "-0.035em",
                color: "#0f172a",
              }}
            >
              Admin Login
            </h1>

            <p
              style={{
                color: "#475569",
                marginTop: 10,
                marginBottom: 0,
                lineHeight: 1.6,
              }}
            >
              Sign in to access the admin dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "grid", gap: 14 }}>
            <div style={inputWrapperStyle}>
              <Mail size={18} style={inputIconStyle} />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                onFocus={(e) => {
                  e.target.style.borderColor = "#152837";
                  e.target.style.boxShadow =
                    "0 0 0 4px rgba(21, 40, 55, 0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#cbd5e1";
                  e.target.style.boxShadow = "none";
                }}
                style={inputStyle}
              />
            </div>

            <div style={inputWrapperStyle}>
              <Lock size={18} style={inputIconStyle} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                onFocus={(e) => {
                  e.target.style.borderColor = "#152837";
                  e.target.style.boxShadow =
                    "0 0 0 4px rgba(21, 40, 55, 0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#cbd5e1";
                  e.target.style.boxShadow = "none";
                }}
                style={{
                  ...inputStyle,
                  paddingRight: 48,
                }}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: 4,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            {error ? (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#b91c1c",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 24px rgba(15, 23, 42, 0.22)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
              style={{
                border: "none",
                background: loading ? "#94a3b8" : "#0f172a",
                color: "#ffffff",
                borderRadius: 14,
                padding: "14px",
                fontWeight: 900,
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 15,
                marginTop: 4,
                transition:
                  "transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease",
              }}
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}