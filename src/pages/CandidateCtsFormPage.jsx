import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";
import CandidateWorkspaceTabs from "../components/CandidateWorkspaceTabs";
import { sanitizeDownloadName } from "../lib/candidateDocumentBundle";
import { downloadBlob } from "../lib/candidateDocumentPdf";
import { CTS_FORM_URL, fillCtsContactPdf } from "../lib/ctsForm";
import contactTemplateUrl from "../lib/ctsContactTemplate.pdf?url";
import { buildCtsJotformPrefillUrl } from "../lib/ctsJotform";
import { supabase } from "../lib/supabase";

export default function CandidateCtsFormPage() {
  const { workerId = "" } = useParams();
  return <CandidateCtsForm key={workerId} workerId={workerId} />;
}

function CandidateCtsForm({ workerId }) {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submission, setSubmission] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

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

  const backupUrl = useMemo(() => candidate ? buildCtsJotformPrefillUrl({
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

  const downloadContactPdf = async () => {
    setDownloading(true);
    setDownloadError("");
    try {
      const response = await fetch(contactTemplateUrl);
      if (!response.ok) throw new Error("Could not load the CTS template.");
      const bytes = await fillCtsContactPdf(await response.arrayBuffer(), candidate);
      const name = sanitizeDownloadName(candidate.name, "Candidate");
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), `CTS Contact Information - ${name}.pdf`);
    } catch {
      setDownloadError("Could not prepare the contact PDF. Try again or enter the candidate’s details directly in Avionté.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8", fontFamily: "var(--uts-font-family)" }}>
      <CandidateWorkspaceTabs />
      <main style={{ width: "min(100% - 40px, 1380px)", margin: "0 auto", padding: "22px 0 42px" }}>
        <section style={{ background: "white", border: "1px solid #dfe4ea", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 18px rgba(15,23,42,.05)" }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid #dfe4ea" }}>
            <h1 style={{ margin: 0, fontSize: 20, color: "#172033" }}>CTS Form</h1>
            {candidate && (
              <>
                <p style={{ margin: "8px 0 12px", color: "#526176", fontSize: 14 }}>
                  In Avionté, select <strong>UTS</strong> as the branch. Use <strong>Upload Resume</strong> to load the candidate’s resume or the prefilled contact PDF. Verify the imported details and complete any missing fields. Use <strong>Upload Documents</strong> for bios, certifications, and other supporting files.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                  <button type="button" onClick={downloadContactPdf} disabled={downloading} style={{ border: 0, borderRadius: 8, padding: "10px 13px", background: "#2f6fed", color: "white", fontWeight: 800, cursor: "pointer" }}>
                    {downloading ? "Preparing contact PDF…" : "Download prefilled contact PDF"}
                  </button>
                  <a href={CTS_FORM_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><ExternalLink size={15} /> Open Avionté</a>
                  <a href={backupUrl} target="_blank" rel="noopener noreferrer">Open JotForm backup</a>
                </div>
                {downloadError && <p role="alert" style={{ margin: "10px 0 0", color: "#b91c1c" }}>{downloadError}</p>}
              </>
            )}
          </div>
          {submission ? <div role="status" style={{ margin: "14px 18px", padding: "12px 14px", border: "1px solid #bbf7d0", borderRadius: 10, background: "#f0fdf4", color: "#166534", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontWeight: 800 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={18}/> Last JotForm submission · {new Date(submission.submitted_at).toLocaleString()}</span><button type="button" onClick={() => window.open(`https://www.jotform.com/submission/${submission.submission_id}`, "_blank", "noopener,noreferrer")} style={{ border: "1px solid #86efac", borderRadius: 8, padding: "7px 10px", background: "white", color: "#166534", fontWeight: 800, cursor: "pointer" }}>View submission</button></div> : null}
          {loading ? <div style={{ minHeight: 320, display: "grid", placeItems: "center", color: "#64748b" }}><Loader2 className="spin" /></div> : error || !candidate ? <div role="alert" style={{ minHeight: 320, display: "grid", placeItems: "center", padding: 30, color: "#b91c1c", fontWeight: 750 }}>{error || "Candidate information is unavailable."}</div> : <iframe title="CTS Form in Avionté" src={CTS_FORM_URL} referrerPolicy="no-referrer" style={{ display: "block", width: "100%", height: "calc(100vh - 250px)", minHeight: 760, border: 0, background: "white" }} />}
        </section>
      </main>
    </div>
  );
}
