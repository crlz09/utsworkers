import React, { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getCurrentUserAccess } from "../lib/userAccess";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState(
    () => new URLSearchParams(window.location.search).get("email") || "",
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("candidate");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const routeCurrentUser = useCallback(async () => {
    const access = await getCurrentUserAccess();
    const nextPath = access.isAdmin
      ? "/admin"
      : access.isClient
        ? "/client/cts-jobs"
        : access.isWorker
          ? "/worker/profile"
          : "/login";
    if (!access.isAdmin && !access.isClient && !access.isWorker) {
      await supabase.auth.signOut();
      setError("No candidate profile is registered with this email address.");
      return;
    }
    navigate(nextPath, { replace: true });
  }, [navigate]);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await routeCurrentUser();
        return;
      }

      setCheckingSession(false);
    };

    checkSession();
  }, [routeCurrentUser]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError) {
      setError(loginError.message || "Login failed.");
      setLoading(false);
      return;
    }

    setLoading(false);
    await routeCurrentUser();
  };

  const sendCandidateOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (otpError) { setError(otpError.message || "Could not send the access code."); return; }
    setOtpSent(true);
  };

  const verifyCandidateOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(), token: otp.trim(), type: "email",
    });
    setLoading(false);
    if (verifyError) { setError(verifyError.message || "The code is invalid or expired."); return; }
    await routeCurrentUser();
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
    borderRadius: 10,
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
    <>
      <style>{`
        .login-page {
          position: fixed;
          inset: 0;
          min-height: 100dvh;
          min-height: 100svh;
          width: auto;
          max-width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at top, rgba(255,255,255,0.08) 0%, rgba(21,40,55,0) 34%), #152837;
          padding: max(18px, env(safe-area-inset-top)) 18px max(18px, env(safe-area-inset-bottom));
          overflow: auto;
          overflow-x: hidden;
          overscroll-behavior: none;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .login-content {
          display: grid;
          gap: 24px;
          justify-items: center;
          width: 100%;
          max-width: 390px;
          margin: 0 auto;
        }

        .login-logo {
          width: min(240px, 62vw);
          filter: drop-shadow(0 18px 35px rgba(0,0,0,0.25));
        }

        .login-card {
          width: 100%;
          max-width: 100%;
          background: #ffffff;
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 30px 90px rgba(0,0,0,0.36);
          display: grid;
          gap: 20px;
          box-sizing: border-box;
          border: 1px solid rgba(255,255,255,0.65);
        }

        @media (display-mode: standalone) {
          .login-page {
            min-height: 100vh;
          }
        }

        @media (max-width: 640px) {
          .login-page {
            align-items: center;
            padding-inline: 14px;
          }

          .login-content {
            gap: 18px !important;
            width: 100% !important;
            max-width: 390px !important;
          }

          .login-logo {
            width: min(210px, 54vw) !important;
          }

          .login-card {
            max-width: 100% !important;
            padding: 22px !important;
            border-radius: 20px !important;
            gap: 16px !important;
          }

          .login-kicker {
            font-size: 12px !important;
            padding: 7px 12px !important;
          }

          .login-title {
            font-size: 28px !important;
          }

          .login-subtitle {
            font-size: 15px !important;
            line-height: 1.45 !important;
          }

          .login-input {
            min-height: 52px;
            font-size: 16px !important;
          }

          .login-submit {
            min-height: 52px;
            font-size: 16px !important;
          }
        }

        @media (max-height: 720px) and (max-width: 640px) {
          .login-page {
            align-items: flex-start;
          }

          .login-logo {
            width: min(170px, 46vw) !important;
          }
        }
      `}</style>

      <div className="login-page">
      <div
        className="login-content"
        style={{
          display: "grid",
          gap: 28,
          justifyItems: "center",
          width: "100%",
          maxWidth: 390,
          margin: "0 auto",
        }}
      >
        <img
          className="login-logo"
          src="/logo.png"
          alt="UTS Logo"
          style={{
            width: "min(240px, 62vw)",
            maxWidth: "100%",
            filter: "drop-shadow(0 18px 35px rgba(0,0,0,0.25))",
          }}
        />

        <div
          className="login-card"
          style={{
            width: "100%",
            maxWidth: "100%",
            background: "#ffffff",
            borderRadius: 20,
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
              className="login-kicker"
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
              className="login-title"
              style={{
                margin: 0,
                fontSize: 34,
                lineHeight: 1.08,
                letterSpacing: 0,
                color: "#0f172a",
              }}
            >
              {mode === "candidate" ? "Candidate Portal" : "Team Login"}
            </h1>

            <p
              className="login-subtitle"
              style={{
                color: "#475569",
                marginTop: 10,
                marginBottom: 0,
                lineHeight: 1.6,
              }}
            >
              {mode === "candidate"
                ? "Use the code sent to your registered email to manage your profile, documents, and hours."
                : "Administrators and clients can sign in with their password."}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, padding: 5, borderRadius: 13, background: "#f1f5f9" }}>
            {[{ value: "candidate", label: "Candidate" }, { value: "team", label: "Admin / Client" }].map((option) => (
              <button key={option.value} type="button" onClick={() => { setMode(option.value); setError(""); setOtpSent(false); setOtp(""); }} style={{ border: 0, borderRadius: 10, padding: "10px 8px", fontWeight: 850, cursor: "pointer", background: mode === option.value ? "#ffffff" : "transparent", color: mode === option.value ? "#0f172a" : "#64748b", boxShadow: mode === option.value ? "0 2px 8px rgba(15,23,42,.08)" : "none" }}>
                {option.label}
              </button>
            ))}
          </div>

          <form onSubmit={mode === "candidate" ? (otpSent ? verifyCandidateOtp : sendCandidateOtp) : handleLogin} style={{ display: "grid", gap: 14 }}>
            {(mode === "team" || (mode === "candidate" && !otpSent)) ? <div style={inputWrapperStyle}>
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
                className="login-input"
              />
            </div> : null}

            {mode === "candidate" && otpSent ? (
              <div style={inputWrapperStyle}>
                <KeyRound size={18} style={inputIconStyle} />
                <input className="login-input" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit access code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} required minLength={6} maxLength={6} style={{ ...inputStyle, letterSpacing: ".22em", fontWeight: 850 }} />
              </div>
            ) : null}

            {mode === "candidate" && otpSent ? <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.5 }}>We sent a one-time code to <strong>{email}</strong>. It may take a minute to arrive.</div> : null}

            {mode === "team" ? <div style={inputWrapperStyle}>
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
                className="login-input"
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
            </div> : null}

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
              className="login-submit"
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
              {loading ? "Please wait..." : mode === "team" ? "Login" : otpSent ? "Verify and enter" : "Send access code"}
            </button>
            {mode === "candidate" && otpSent ? <button type="button" onClick={() => { setOtpSent(false); setOtp(""); setError(""); }} style={{ border: 0, background: "transparent", color: "#2563eb", fontWeight: 800, cursor: "pointer" }}>Use a different email</button> : null}
          </form>
        </div>
      </div>
      </div>
    </>
  );
}
