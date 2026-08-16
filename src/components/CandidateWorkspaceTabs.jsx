import React, { useEffect, useState } from "react";
import { ExternalLink, FilePenLine, FileText, IdCard, UserRound, ClipboardList, LayoutDashboard } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getWorkerDocumentStatus } from "../lib/workerDocuments";

export default function CandidateWorkspaceTabs() {
  const { workerId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);

  useEffect(() => {
    if (!workerId) return undefined;
    let active = true;
    const loadCandidate = async () => {
      const { data } = await supabase
        .from("workers")
        .select("id,name,public_profile_slug,worker_documents(document_type)")
        .eq("id", workerId)
        .maybeSingle();
      if (active) setCandidate(data || null);
    };
    void loadCandidate();
    return () => { active = false; };
  }, [workerId]);

  const tabs = [
    { label: "Details", path: `/admin/workers/${workerId}/details`, icon: LayoutDashboard },
    { label: "Profile", path: `/admin/workers/${workerId}/profile`, icon: UserRound },
    { label: "Documents", path: `/admin/workers/${workerId}/documents`, icon: FileText },
    { label: "Bio", path: `/admin/workers/${workerId}/bio`, icon: FilePenLine },
    { label: "Public Profile", path: `/admin/workers/${workerId}/public-profile`, icon: IdCard },
    { label: "CTS JotForm", path: `/admin/workers/${workerId}/cts-form`, icon: ClipboardList },
  ];
  const documents = candidate?.worker_documents || [];
  const documentAlerts = candidate ? [
    !getWorkerDocumentStatus(documents, "state_id_or_driver_license").complete ? "Missing ID" : "",
    !getWorkerDocumentStatus(documents, "social_security_card").complete ? "Missing Social Security" : "",
  ].filter(Boolean) : [];

  return (
    <>
      <style>{`
        .candidate-workspace-head { position: sticky; top: 68px; z-index: 35; background: rgba(255,255,255,.97); border-bottom: 1px solid #dfe4ea; backdrop-filter: blur(12px); }
        .candidate-workspace-head-inner { width: min(100% - 40px, 1380px); margin: 0 auto; }
        .candidate-workspace-title { min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .candidate-workspace-name { min-width: 0; }
        .candidate-workspace-name strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #172033; font-size: 17px; }
        .candidate-workspace-name span { color: #76869a; font-size: 12px; }
        .candidate-workspace-identity { min-width: 0; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .candidate-workspace-alerts { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
        .candidate-workspace-alert { padding: 5px 8px; border: 1px solid #fdba74; border-radius: 999px; background: #fff7ed; color: #9a3412; font-size: 11px; font-weight: 850; white-space: nowrap; }
        .candidate-workspace-public { border: 1px solid #d6dde6; border-radius: 8px; padding: 8px 11px; display: inline-flex; align-items: center; gap: 7px; color: #425267; background: white; font-weight: 750; cursor: pointer; }
        .candidate-workspace-tabs { display: flex; gap: 24px; overflow-x: auto; scrollbar-width: thin; }
        .candidate-workspace-tab { position: relative; min-height: 48px; padding: 0 2px; border: 0; background: transparent; color: #69798d; display: inline-flex; align-items: center; gap: 8px; font-weight: 800; white-space: nowrap; cursor: pointer; }
        .candidate-workspace-tab.active { color: #225fce; }
        .candidate-workspace-tab.active::after { content: ""; position: absolute; height: 3px; left: 0; right: 0; bottom: 0; border-radius: 3px 3px 0 0; background: #2f6fed; }
        @media(max-width:820px) { .candidate-workspace-head { top: var(--uts-header-total, calc(68px + env(safe-area-inset-top, 0px))); } .candidate-workspace-head-inner { width: min(100% - 24px, 1380px); } .candidate-workspace-title { min-height: 50px; } .candidate-workspace-tabs { gap: 18px; } }
      `}</style>
      <section className="candidate-workspace-head">
        <div className="candidate-workspace-head-inner">
          <div className="candidate-workspace-title">
            <div className="candidate-workspace-identity">
              <div className="candidate-workspace-name">
                <strong>{candidate?.name || "Candidate workspace"}</strong>
                <span>Candidate record</span>
              </div>
              {documentAlerts.length ? <div className="candidate-workspace-alerts" aria-label="Pending candidate items">{documentAlerts.map((alert) => <span className="candidate-workspace-alert" key={alert}>{alert}</span>)}</div> : null}
            </div>
            {candidate?.public_profile_slug ? (
              <button className="candidate-workspace-public" type="button" onClick={() => window.open(`/profile/${candidate.public_profile_slug}`, "_blank", "noopener,noreferrer")}>
                <ExternalLink size={15} /> Open public link
              </button>
            ) : null}
          </div>
          <nav className="candidate-workspace-tabs" aria-label="Candidate record sections">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = location.pathname === tab.path;
              return (
                <button key={tab.path} type="button" className={`candidate-workspace-tab${active ? " active" : ""}`} onClick={() => navigate(tab.path)}>
                  <Icon size={17} /> {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </section>
    </>
  );
}
