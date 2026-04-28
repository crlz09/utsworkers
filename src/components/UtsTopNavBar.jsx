import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UserPlus,
  History,
  ClipboardList,
  LogOut,
  Briefcase,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import utsLogo from "../assets/uts-logo.png";

export default function UtsTopNavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const routeFlags = {
    isAdmin: location.pathname === "/admin",
    isRegister: location.pathname.startsWith("/register"),
    isInterviews: location.pathname.startsWith("/interviews"),
    isCtsJobs: location.pathname.startsWith("/cts-jobs"),
  };

  const navItems = [
    {
      label: "Admin",
      path: "/admin",
      icon: LayoutDashboard,
      match: (pathname) => pathname === "/admin",
    },
    {
      label: "Register",
      path: "/register",
      icon: UserPlus,
      match: (pathname) => pathname.startsWith("/register"),
      openInNewTab: true,
    },
    {
      label: "Interviews",
      path: "/interviews",
      icon: History,
      match: (pathname) => pathname === "/interviews",
    },
    
    {
      label: "Jobs",
      path: "/cts-jobs",
      icon: Briefcase,
      match: (pathname) => pathname.startsWith("/cts-jobs"),
    },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleNavClick = (item) => {
    if (item.openInNewTab) {
      window.open(item.path, "_blank", "noopener,noreferrer");
      return;
    }

    navigate(item.path);
  };

  return (
    <>
      <style>{`
        .uts-topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          background: linear-gradient(180deg, #1f2c40 0%, #1b2738 100%);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
        }

        .uts-topbar-inner {
          max-width: 1280px;
          margin: 0 auto;
          min-height: 74px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 0 24px;
        }

        .uts-brand {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
          cursor: pointer;
        }

        .uts-brand img {
          height: 56px;
          width: auto;
          object-fit: contain;
          display: block;
        }

        .uts-nav {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
          flex: 1;
          min-width: 0;
        }

        .uts-nav-btn {
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.82);
          padding: 12px 14px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 15px;
          cursor: pointer;
          transition: 0.18s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .uts-nav-btn:hover {
          background: rgba(255,255,255,0.08);
          color: #ffffff;
        }

        .uts-nav-btn.active {
          background: rgba(255,255,255,0.12);
          color: #ffffff;
        }

        .uts-topbar-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .uts-logout-btn {
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.04);
          color: #ffffff;
          border-radius: 10px;
          padding: 11px 15px;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: 0.18s ease;
        }

        .uts-logout-btn:hover {
          background: rgba(255,255,255,0.1);
        }

        @media (max-width: 1100px) {
          .uts-topbar-inner {
            align-items: flex-start;
            flex-direction: column;
            padding-top: 12px;
            padding-bottom: 12px;
          }

          .uts-nav {
            width: 100%;
            justify-content: flex-start;
            flex-wrap: wrap;
          }

          .uts-topbar-right {
            width: 100%;
            justify-content: flex-start;
          }
        }

        @media (max-width: 640px) {
          .uts-topbar-inner {
            gap: 12px;
            padding-inline: 16px;
          }

          .uts-brand img {
            height: 48px;
          }

          .uts-nav-btn,
          .uts-logout-btn {
            font-size: 14px;
            white-space: nowrap;
            padding: 10px 12px;
          }
        }
      `}</style>

      <div className="uts-topbar">
        <div className="uts-topbar-inner">
          <div className="uts-brand" onClick={() => navigate("/admin")}>
            <img src={utsLogo} alt="UTS" />
          </div>

          {!routeFlags.isRegister && (
            <div className="uts-nav">
              {navItems
                .filter((item) => !item.visibleWhen || item.visibleWhen())
                .map((item) => {
                  const Icon = item.icon;
                  const active = item.match(location.pathname);

                  return (
                    <button
                      key={item.path}
                      type="button"
                      className={`uts-nav-btn ${active ? "active" : ""}`}
                      onClick={() => handleNavClick(item)}
                    >
                      <Icon size={16} />
                      {item.label}
                    </button>
                  );
                })}
            </div>
          )}

          <div className="uts-topbar-right">
            {routeFlags.isAdmin && (
              <button
                type="button"
                className="uts-logout-btn"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
