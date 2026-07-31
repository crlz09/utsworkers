import React from "react";
import { Clock3, FileText, LogOut, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const items = [
  { label: "Profile", path: "/worker/profile", icon: UserRound },
  { label: "Documents", path: "/worker/documents", icon: FileText },
  { label: "Hours", path: "/worker/hours", icon: Clock3 },
];

export default function CandidateTopBar({ workerName = "Candidate portal" }) {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <>
      <style>{`
        .candidate-bar { position: sticky; top: 0; z-index: 40; background: linear-gradient(180deg,#1f2c40,#1b2738); box-shadow: 0 8px 24px rgba(15,23,42,.18); }
        .candidate-bar-inner { width: min(100% - 32px,1080px); min-height: 76px; margin: 0 auto; display: grid; grid-template-columns: minmax(190px,1fr) auto minmax(120px,1fr); align-items: center; gap: 18px; }
        .candidate-brand { display: flex; align-items: center; gap: 12px; color: white; min-width: 0; cursor: pointer; }
        .candidate-brand img { height: 52px; width: auto; }
        .candidate-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 850; }
        .candidate-nav { display: flex; gap: 6px; align-items: center; }
        .candidate-nav-button,.candidate-logout { border: 0; border-radius: 11px; padding: 10px 12px; color: rgba(255,255,255,.78); background: transparent; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; }
        .candidate-nav-button.active { color: white; background: rgba(255,255,255,.12); }
        .candidate-logout { justify-self: end; color: white; border: 1px solid rgba(255,255,255,.18); }
        @media(max-width:760px){
          .candidate-bar-inner { width: min(100% - 20px,1080px); min-height: 68px; grid-template-columns: 1fr auto; gap: 8px; }
          .candidate-brand img { height: 42px; }
          .candidate-brand-copy { display:none; }
          .candidate-nav { order: 3; grid-column: 1 / -1; justify-content: center; padding-bottom: 9px; }
          .candidate-nav-button { flex:1; justify-content:center; padding:9px 8px; font-size:13px; }
          .candidate-logout span { display:none; }
        }
      `}</style>
      <header className="candidate-bar">
        <div className="candidate-bar-inner">
          <div className="candidate-brand" onClick={() => navigate("/worker/profile")} role="button" tabIndex={0}>
            <img src="/logo.png" alt="UTS" />
            <div className="candidate-brand-copy" style={{ minWidth: 0 }}>
              <div style={{ color: "#bfdbfe", fontSize: 10, fontWeight: 850, letterSpacing: ".1em" }}>CANDIDATE PORTAL</div>
              <div className="candidate-name">{workerName}</div>
            </div>
          </div>
          <nav className="candidate-nav" aria-label="Candidate portal">
            {items.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <button key={item.path} type="button" className={`candidate-nav-button${active ? " active" : ""}`} onClick={() => navigate(item.path)}>
                  <Icon size={16} /> {item.label}
                </button>
              );
            })}
          </nav>
          <button className="candidate-logout" type="button" onClick={logout}>
            <LogOut size={16} /> <span>Sign out</span>
          </button>
        </div>
      </header>
    </>
  );
}
