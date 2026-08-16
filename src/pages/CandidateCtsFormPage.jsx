import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";
import CandidateWorkspaceTabs from "../components/CandidateWorkspaceTabs";
import UtsTopNavBar from "../components/UtsTopNavBar";
import { buildCtsJotformPrefillUrl } from "../lib/ctsJotform";
import { supabase } from "../lib/supabase";

export default function CandidateCtsFormPage() {
  const { workerId = "" } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error: loadError } = await supabase
        .from("workers")
        .select("*,trades(name),worker_certifications(certifications(name))")
        .eq("id", workerId)
        .maybeSingle();
      if (!active) return;
      if (loadError) setError(loadError.message || "Could not load candidate data.");
      setCandidate(data || null);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [workerId]);

  useEffect(() => {
    let active = true;
    const loadSubmission = async () => {
      const { data } = await supabase
        .from("cts_jotform_submissions")
        .select("submission_id,submitted_at")
        .eq("worker_id", workerId)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) setSubmission(data || null);
    };
    void loadSubmission();
    const interval = window.setInterval(loadSubmission, 10000);
    return () => { active = false; window.clearInterval(interval); };
  }, [workerId]);

  const formUrl = useMemo(() => candidate ? buildCtsJotformPrefillUrl({
    worker_id: candidate.id,
    worker_name: candidate.name,
    worker_phone: candidate.phone,
    worker_email: candidate.email,
    worker_address: candidate.address,
    worker_city: candidate.city,
    worker_state: candidate.state,
    worker_zip_code: candidate.zip_code,
    worker_date_of_birth: candidate.date_of_birth,
    class_snapshot: candidate.trades?.name,
    worker_total_experience_years: candidate.total_experience_years,
    worker_certifications: candidate.worker_certifications,
  }) : "", [candidate]);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8" }}>
      <UtsTopNavBar />
      <CandidateWorkspaceTabs />
      <main style={{ width: "min(100% - 40px, 1380px)", margin: "0 auto", padding: "22px 0 42px" }}>
        <section style={{ background: "white", border: "1px solid #dfe4ea", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 18px rgba(15,23,42,.05)" }}>
          <div style={{ minHeight: 70, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, borderBottom: "1px solid #dfe4ea" }}>
            <div><strong style={{ display: "block", color: "#172033" }}>CTS JotForm</strong><span style={{ color: "#76869a", fontSize: 13 }}>Available candidate information is filled into the form automatically.</span></div>
            {formUrl ? <button type="button" onClick={() => window.open(formUrl, "_blank", "noopener,noreferrer")} style={{ border: 0, borderRadius: 8, padding: "10px 13px", background: "#2f6fed", color: "white", fontWeight: 800, cursor: "pointer", display: "inline-flex", gap: 7, alignItems: "center" }}><ExternalLink size={16} /> Open JotForm</button> : null}
          </div>
          {submission ? <div role="status" style={{ margin: "14px 18px 0", padding: "12px 14px", border: "1px solid #bbf7d0", borderRadius: 10, background: "#f0fdf4", color: "#166534", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontWeight: 800 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={18}/> Submitted successfully · {new Date(submission.submitted_at).toLocaleString()}</span><button type="button" onClick={() => window.open(`https://www.jotform.com/submission/${submission.submission_id}`, "_blank", "noopener,noreferrer")} style={{ border: "1px solid #86efac", borderRadius: 8, padding: "7px 10px", background: "white", color: "#166534", fontWeight: 800, cursor: "pointer" }}>View submission</button></div> : null}
          {loading ? <div style={{ minHeight: 320, display: "grid", placeItems: "center", color: "#64748b" }}><Loader2 className="spin" /></div> : error || !formUrl ? <div style={{ minHeight: 320, display: "grid", placeItems: "center", padding: 30, color: "#b91c1c", fontWeight: 750 }}>{error || "Candidate information is unavailable."}</div> : <iframe title="CTS candidate JotForm" src={formUrl} style={{ width: "100%", height: "calc(100vh - 250px)", minHeight: 760, border: 0, background: "white" }} />}
        </section>
      </main>
    </div>
  );
}
