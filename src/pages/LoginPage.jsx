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
              Admin Login
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
                className="login-input"
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
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
      </div>
    </>
  );
}
