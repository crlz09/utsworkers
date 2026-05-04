import React from "react";
import { LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";
import utsLogo from "../assets/uts-logo.png";

export default function UtsClientTopBar() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <>
      <style>{`
        .uts-client-topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          padding-top: env(safe-area-inset-top);
          background: linear-gradient(180deg, #1f2c40 0%, #1b2738 100%);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
        }

        .uts-client-topbar-inner {
          width: min(1480px, calc(100% - 48px));
          margin: 0 auto;
          min-height: 74px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .uts-client-logo {
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
        }

        .uts-client-logo img {
          height: 56px;
          width: auto;
          display: block;
        }

        .uts-client-logout {
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.06);
          color: #ffffff;
          border-radius: 12px;
          min-height: 44px;
          padding: 11px 14px;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: 0.18s ease;
        }

        .uts-client-logout:hover {
          background: rgba(255,255,255,0.12);
        }

        @media (max-width: 760px) {
          .uts-client-topbar-inner {
            width: min(100%, calc(100% - 28px));
            min-height: 64px;
          }

          .uts-client-logo img {
            height: 42px;
          }

          .uts-client-logout span {
            display: none;
          }

          .uts-client-logout {
            width: 44px;
            padding: 0;
          }
        }
      `}</style>

      <div className="uts-client-topbar">
        <div className="uts-client-topbar-inner">
          <a
            className="uts-client-logo"
            href="https://www.universaltalentsource.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Universal Talent Source"
          >
            <img src={utsLogo} alt="UTS" />
          </a>

          <button className="uts-client-logout" type="button" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}
