import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UserPlus,
  History,
  LogOut,
  Briefcase,
  Clock3,
  Bell,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import utsLogo from "../assets/uts-logo.png";
import PwaInstallButton from "./PwaInstallButton";
import { loadAdminNotificationCount } from "../lib/adminNotifications";

export default function UtsTopNavBar({ rightSlot = null }) {
  const navigate = useNavigate();
  const location = useLocation();

  const routeFlags = {
    isAdmin: location.pathname === "/admin",
    isAdminArea: location.pathname.startsWith("/admin"),
    isRegister: location.pathname.startsWith("/register"),
    isInterviews: location.pathname.startsWith("/interviews"),
    isCtsJobs: location.pathname.startsWith("/cts-jobs"),
    isHours: location.pathname.startsWith("/hours"),
  };
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    let active = true;

    const loadCount = async () => {
      if (routeFlags.isRegister) return;
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        const count = await loadAdminNotificationCount(supabase);
        if (active) setNotificationCount(count);
      } catch {
        if (active) setNotificationCount(0);
      }
    };

    void loadCount();

    return () => {
      active = false;
    };
  }, [location.pathname, routeFlags.isRegister]);

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
    {
      label: "Hours",
      path: "/hours",
      icon: Clock3,
      match: (pathname) => pathname.startsWith("/hours"),
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
          padding-top: env(safe-area-inset-top);
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
          position: relative;
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

        .uts-nav-badge {
          min-width: 20px;
          height: 20px;
          pointer-events: none;
          border-radius: 999px;
          padding: 0 6px;
          background: #ef4444;
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 950;
          line-height: 1;
        }

        .uts-topbar-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .uts-alert-btn {
          position: relative;
          min-width: 46px;
          justify-content: center;
          padding: 11px 13px;
        }

        .uts-alert-btn .uts-nav-badge {
          position: absolute;
          top: -7px;
          right: -7px;
          box-shadow: 0 0 0 2px #1f2c40;
        }

        .uts-logout-btn,
        .uts-install-btn,
        .uts-topbar-action {
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

        .uts-install-btn {
          background: rgba(255,255,255,0.12);
        }

        .uts-topbar.register-topbar .uts-topbar-inner {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }

        .uts-topbar.register-topbar .uts-topbar-right {
          width: auto;
          margin-left: auto;
          justify-content: flex-end;
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
            justify-content: flex-end;
          }

          .uts-topbar.register-topbar .uts-topbar-inner {
            align-items: center;
            flex-direction: row;
          }

          .uts-topbar.register-topbar .uts-topbar-right {
            width: auto;
            margin-left: auto;
            justify-content: flex-end;
          }
        }

        @media (max-width: 640px) {
          .uts-topbar {
            position: sticky;
          }

          .uts-topbar-inner {
            display: grid;
            grid-template-columns: auto 1fr;
            align-items: center;
            gap: 10px 12px;
            min-height: auto;
            padding: 10px 12px;
          }

          .uts-brand img {
            height: 38px;
          }

          .uts-nav {
            grid-column: 1 / -1;
            grid-row: 2;
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 6px;
            overflow: visible;
          }

          .uts-topbar-right {
            grid-column: 2;
            grid-row: 1;
            width: auto;
            justify-content: flex-end;
            justify-self: end;
            align-self: center;
            gap: 6px;
          }

          .uts-nav-btn,
          .uts-logout-btn,
          .uts-install-btn,
          .uts-topbar-action {
            min-height: 40px;
            font-size: 12px;
            white-space: nowrap;
            padding: 9px 8px;
            justify-content: center;
            border-radius: 10px;
          }

          .uts-nav-btn {
            width: 100%;
            flex-direction: column;
            gap: 4px;
            line-height: 1.05;
          }

          .uts-nav-badge {
            position: absolute;
            top: 4px;
            right: 6px;
            min-width: 17px;
            height: 17px;
            font-size: 10px;
            padding: 0 5px;
          }

          .uts-logout-btn span,
          .uts-install-btn span,
          .uts-topbar-action span {
            display: none;
          }

          .uts-alert-btn .uts-nav-badge {
            display: inline-flex;
            top: -5px;
            right: -5px;
          }

          .uts-topbar-action.register-language-btn span {
            display: inline;
          }
        }
      `}</style>

      <div className={`uts-topbar ${routeFlags.isRegister ? "register-topbar" : ""}`}>
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
            {rightSlot}
            <PwaInstallButton />

            {routeFlags.isAdminArea ? (
              <>
                <button
                  type="button"
                  className="uts-logout-btn uts-alert-btn"
                  onClick={() => navigate("/admin/notifications")}
                  title="Notifications"
                  aria-label={`Notifications${notificationCount > 0 ? `, ${notificationCount} pending` : ""}`}
                >
                  <Bell size={16} />
                  {notificationCount > 0 ? (
                    <span className="uts-nav-badge">
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  className="uts-logout-btn"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
