import React, { useEffect, useState } from "react";
import { Download, FilePenLine, Loader2, Save, Sparkles, X } from "lucide-react";
import { useParams } from "react-router-dom";
import CandidateWorkspaceTabs from "../components/CandidateWorkspaceTabs";
import UtsTopNavBar from "../components/UtsTopNavBar";
import { createInitialCtsBio } from "../lib/ctsBio";
import { downloadStoredCtsBio, findStoredCtsBio, replaceStoredCtsBio } from "../lib/ctsBioStorage";
import { supabase } from "../lib/supabase";

const BIO_FIELDS = [
  ["name", "Name"], ["phone", "Phone"], ["email", "Email"], ["location", "Location"],
  ["trade", "Trade"], ["totalExperience", "Total experience in trade (years)"],
  ["commercialExperience", "Commercial experience (%)"],
  ["industrialExperience", "Industrial experience (%)"],
  ["residentialExperience", "Residential experience (%)"],
];

export default function CandidateBioPage() {
  const { workerId = "" } = useParams();
  const [worker, setWorker] = useState(null);
  const [bio, setBio] = useState(null);
  const [storedDocument, setStoredDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [feedback, setFeedback] = useState({ error: "", success: "" });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("*,trades(name),locations(name),worker_projects(*),worker_certifications(certifications(name)),worker_languages(language_name,proficiency_percent),worker_documents(*)")
        .eq("id", workerId)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        setFeedback({ error: error?.message || "Could not load candidate BIO data.", success: "" });
      } else {
        const existing = findStoredCtsBio(data.worker_documents);
        setWorker(data);
        setStoredDocument(existing);
        setBio(existing?.bio_data || createInitialCtsBio(data));
      }
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [workerId]);

  const update = (field, value) => {
    setBio((current) => ({ ...current, [field]: value }));
    setDirty(true);
    setFeedback({ error: "", success: "" });
  };

  const validate = (source) => {
    if (!source?.name?.trim()) return "Candidate name is required.";
    const total = [source.commercialExperience, source.industrialExperience, source.residentialExperience]
      .reduce((sum, value) => sum + Number(value || 0), 0);
    return total === 100 ? "" : `Experience distribution must total 100%. Current total: ${total}%.`;
  };

  const saveBio = async ({ automatic = false } = {}) => {
    if (!worker || !bio || saving) return false;
    const validationError = validate(bio);
    if (validationError) {
      setFeedback({ error: validationError, success: "" });
      return false;
    }
    setSaving(true);
    setFeedback({ error: "", success: "" });
    try {
      const nextDocument = await replaceStoredCtsBio({ workerId: worker.id, bio, existingDocument: storedDocument });
      setStoredDocument(nextDocument);
      setDirty(false);
      setFeedback({ error: "", success: automatic ? "Changes saved automatically." : "BIO generated and stored." });
      return true;
    } catch (error) {
      setFeedback({ error: error.message || "Could not save the BIO.", success: "" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const autoSave = () => {
    if (storedDocument && dirty) void saveBio({ automatic: true });
  };

  const downloadBio = async () => {
    if (!storedDocument) return;
    setFeedback({ error: "", success: "" });
    try {
      await downloadStoredCtsBio(storedDocument);
    } catch (error) {
      setFeedback({ error: error.message || "Could not download the BIO.", success: "" });
    }
  };

  const percentageTotal = bio ? [bio.commercialExperience, bio.industrialExperience, bio.residentialExperience]
    .reduce((sum, value) => sum + Number(value || 0), 0) : 0;

  return (
    <div className="candidate-bio-page">
      <style>{`
        .candidate-bio-page { min-height: 100vh; background: #f4f6f8; color: #172033; font-family: Inter,ui-sans-serif,system-ui,sans-serif; }
        .candidate-bio-shell { width: min(100% - 40px,1120px); margin: 0 auto; padding: 26px 0 52px; }
        .candidate-bio-card { padding: 24px; border: 1px solid #dfe4ea; border-radius: 12px; background: white; box-shadow: 0 4px 18px rgba(15,23,42,.05); }
        .candidate-bio-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding-bottom: 20px; border-bottom: 1px solid #e4e8ed; }
        .candidate-bio-head h1 { margin: 5px 0; font-size: 28px; letter-spacing: -.025em; }
        .candidate-bio-kicker { color: #2f6fed; font-size: 11px; font-weight: 900; letter-spacing: .11em; }
        .candidate-bio-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .candidate-bio-button { min-height: 42px; padding: 9px 13px; border: 1px solid #d6dde6; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; background: white; color: #425267; font-weight: 800; cursor: pointer; }
        .candidate-bio-button.primary { border-color: #2f6fed; background: #2f6fed; color: white; }
        .candidate-bio-button:disabled { opacity: .55; cursor: not-allowed; }
        .candidate-bio-empty { min-height: 360px; display: grid; place-items: center; text-align: center; padding: 38px; }
        .candidate-bio-empty-icon { width: 70px; height: 70px; margin: 0 auto 16px; border-radius: 18px; display: grid; place-items: center; background: #eaf1ff; color: #2f6fed; }
        .candidate-bio-form { padding-top: 22px; display: grid; gap: 16px; }
        .candidate-bio-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; }
        .candidate-bio-field { display: grid; gap: 7px; }
        .candidate-bio-field span { color: #526277; font-size: 11px; font-weight: 850; letter-spacing: .07em; text-transform: uppercase; }
        .candidate-bio-input { width: 100%; min-height: 46px; padding: 10px 12px; border: 1px solid #cfd7e2; border-radius: 8px; background: #fff; color: #172033; outline: none; font: inherit; }
        .candidate-bio-input:focus { border-color: #2f6fed; box-shadow: 0 0 0 3px rgba(47,111,237,.12); }
        textarea.candidate-bio-input { min-height: 100px; resize: vertical; line-height: 1.5; }
        .candidate-bio-distribution { padding: 10px 12px; border-radius: 8px; font-size: 13px; font-weight: 800; }
        .candidate-bio-feedback { margin-top: 16px; padding: 11px 13px; border-radius: 8px; font-weight: 750; }
        .candidate-bio-modal-backdrop { position: fixed; inset: 0; z-index: 120; padding: 18px; display: grid; place-items: center; background: rgba(15,23,42,.58); }
        .candidate-bio-modal { width: min(940px,100%); max-height: 94dvh; overflow: auto; padding: 22px; border-radius: 14px; background: white; box-shadow: 0 28px 90px rgba(15,23,42,.3); }
        .candidate-bio-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding-bottom: 18px; border-bottom: 1px solid #e4e8ed; }
        .candidate-bio-modal-close { width: 38px; height: 38px; padding: 0; border: 1px solid #d6dde6; border-radius: 8px; display: grid; place-items: center; background: white; color: #526277; cursor: pointer; }
        @media(max-width:720px){.candidate-bio-shell{width:min(100% - 24px,1120px);padding-top:18px}.candidate-bio-card{padding:18px}.candidate-bio-head{flex-direction:column}.candidate-bio-actions{width:100%;justify-content:stretch}.candidate-bio-button{flex:1}.candidate-bio-grid{grid-template-columns:1fr}}
      `}</style>
      <UtsTopNavBar />
      <CandidateWorkspaceTabs />
      <main className="candidate-bio-shell">
        <section className="candidate-bio-card">
          <div className="candidate-bio-head">
            <div><div className="candidate-bio-kicker">CTS CANDIDATE BIO</div><h1>{storedDocument ? "Edit stored BIO" : "Candidate BIO"}</h1><div style={{ color: "#6b7b8f", lineHeight: 1.5 }}>{storedDocument ? "Changes are saved and the DOCX is replaced automatically when you leave a field." : "Generate an editable BIO from the candidate's current profile."}</div></div>
            {storedDocument ? <div className="candidate-bio-actions"><button className="candidate-bio-button" type="button" onClick={downloadBio}><Download size={16} /> Download</button><button className="candidate-bio-button primary" type="button" disabled={!dirty || saving} onClick={() => void saveBio({ automatic: true })}>{saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}{saving ? "Saving..." : dirty ? "Save now" : "Saved"}</button></div> : null}
          </div>

          {loading ? <div className="candidate-bio-empty"><span><Loader2 className="spin" size={26} /><br />Loading BIO...</span></div> : !bio ? <div className="candidate-bio-empty">Candidate data is unavailable.</div> : !storedDocument ? (
            <div className="candidate-bio-empty"><div><div className="candidate-bio-empty-icon"><FilePenLine size={34} /></div><h2 style={{ margin: "0 0 8px" }}>No BIO stored</h2><p style={{ margin: "0 auto 20px", maxWidth: 520, color: "#6b7b8f", lineHeight: 1.6 }}>Review the information imported from this candidate's profile and complete anything missing before generating the document.</p><button className="candidate-bio-button primary" type="button" disabled={saving} onClick={() => { setFeedback({ error: "", success: "" }); setEditorOpen(true); }}><Sparkles size={17} /> Generate BIO</button></div></div>
          ) : (
            <div className="candidate-bio-form">
              <div className="candidate-bio-grid">{BIO_FIELDS.map(([field, label]) => <label className="candidate-bio-field" key={field}><span>{label}</span><input className="candidate-bio-input" type={field.includes("Experience") ? "number" : "text"} value={bio[field] || ""} onChange={(event) => update(field, event.target.value)} onBlur={autoSave} /></label>)}</div>
              <div className="candidate-bio-distribution" style={{ background: percentageTotal === 100 ? "#ecfdf3" : "#fff7ed", border: `1px solid ${percentageTotal === 100 ? "#bbf7d0" : "#fed7aa"}`, color: percentageTotal === 100 ? "#166534" : "#9a3412" }}>Experience distribution: {percentageTotal}% {percentageTotal === 100 ? "✓" : "— must total 100%"}</div>
              {[['projects','Project history — one project per line'],['strengths','Strengths — one per line'],['certifications','Certifications'],['languages','Languages'],['notes','Closing note']].map(([field,label]) => <label className="candidate-bio-field" key={field}><span>{label}</span><textarea className="candidate-bio-input" value={bio[field] || ""} onChange={(event) => update(field, event.target.value)} onBlur={autoSave} /></label>)}
            </div>
          )}
          {feedback.error ? <div className="candidate-bio-feedback" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}>{feedback.error}</div> : null}
          {feedback.success ? <div className="candidate-bio-feedback" style={{ background: "#ecfdf3", border: "1px solid #bbf7d0", color: "#166534" }}>{feedback.success}</div> : null}
        </section>
      </main>
      {editorOpen && bio && !storedDocument ? (
        <div className="candidate-bio-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="candidate-bio-editor-title">
          <div className="candidate-bio-modal">
            <div className="candidate-bio-modal-head">
              <div><div className="candidate-bio-kicker">CTS CANDIDATE BIO</div><h2 id="candidate-bio-editor-title" style={{ margin: "5px 0", fontSize: 27 }}>Review before generating</h2><div style={{ color: "#6b7b8f", lineHeight: 1.5 }}>Confirm every field and complete any information that is missing.</div></div>
              <button className="candidate-bio-modal-close" type="button" onClick={() => setEditorOpen(false)} aria-label="Close BIO editor"><X size={18} /></button>
            </div>
            <div className="candidate-bio-form">
              <div className="candidate-bio-grid">{BIO_FIELDS.map(([field, label]) => <label className="candidate-bio-field" key={field}><span>{label}</span><input className="candidate-bio-input" type={field.includes("Experience") ? "number" : "text"} value={bio[field] || ""} onChange={(event) => update(field, event.target.value)} /></label>)}</div>
              <div className="candidate-bio-distribution" style={{ background: percentageTotal === 100 ? "#ecfdf3" : "#fff7ed", border: `1px solid ${percentageTotal === 100 ? "#bbf7d0" : "#fed7aa"}`, color: percentageTotal === 100 ? "#166534" : "#9a3412" }}>Experience distribution: {percentageTotal}% {percentageTotal === 100 ? "✓" : "— must total 100%"}</div>
              {[['projects','Project history — one project per line'],['strengths','Strengths — one per line'],['certifications','Certifications'],['languages','Languages'],['notes','Closing note']].map(([field,label]) => <label className="candidate-bio-field" key={field}><span>{label}</span><textarea className="candidate-bio-input" value={bio[field] || ""} onChange={(event) => update(field, event.target.value)} /></label>)}
              {feedback.error ? <div className="candidate-bio-feedback" style={{ marginTop: 0, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}>{feedback.error}</div> : null}
              <div className="candidate-bio-actions"><button className="candidate-bio-button" type="button" disabled={saving} onClick={() => setEditorOpen(false)}>Cancel</button><button className="candidate-bio-button primary" type="button" disabled={saving} onClick={async () => { if (await saveBio()) setEditorOpen(false); }}>{saving ? <Loader2 className="spin" size={17} /> : <FilePenLine size={17} />}{saving ? "Generating..." : "Generate and save BIO"}</button></div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
