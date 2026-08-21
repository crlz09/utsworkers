import React, { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";
import CandidateWorkspaceTabs from "../components/CandidateWorkspaceTabs";
import UtsTopNavBar from "../components/UtsTopNavBar";
import { supabase } from "../lib/supabase";

export default function CandidatePublicProfilePage() {
  const { workerId = "" } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("workers").select("id,name,public_profile_slug").eq("id", workerId).maybeSingle();
      if (active) { setCandidate(data || null); setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [workerId]);

  const publicUrl = candidate?.public_profile_slug ? `/profile/${candidate.public_profile_slug}` : "";
  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8", fontFamily: "var(--uts-font-family)" }}>
      <UtsTopNavBar />
      <CandidateWorkspaceTabs />
      <main style={{ width: "min(100% - 40px, 1380px)", margin: "0 auto", padding: "22px 0 42px" }}>
        <section style={{ background: "white", border: "1px solid #dfe4ea", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 18px rgba(15,23,42,.05)" }}>
          <div style={{ minHeight: 64, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, borderBottom: "1px solid #dfe4ea" }}>
            <div><strong style={{ display: "block", color: "#172033" }}>Public profile preview</strong><span style={{ color: "#76869a", fontSize: 13 }}>This is what clients see when they open the shared profile.</span></div>
            {publicUrl ? <button type="button" onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")} style={{ border: 0, borderRadius: 8, padding: "10px 13px", background: "#2f6fed", color: "white", fontWeight: 800, cursor: "pointer", display: "inline-flex", gap: 7, alignItems: "center" }}><ExternalLink size={16} /> Open in new tab</button> : null}
          </div>
          {loading ? <div style={{ minHeight: 320, display: "grid", placeItems: "center", color: "#64748b" }}><Loader2 className="spin" /></div> : publicUrl ? <iframe title={`${candidate?.name || "Candidate"} public profile`} src={publicUrl} style={{ width: "100%", height: "calc(100vh - 250px)", minHeight: 680, border: 0, background: "white" }} /> : <div style={{ minHeight: 320, display: "grid", placeItems: "center", padding: 30, color: "#9a3412", fontWeight: 750 }}>This candidate does not have a public profile link yet.</div>}
        </section>
      </main>
    </div>
  );
}
