import React, { useEffect, useState } from "react";
import {
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  FolderKanban,
  Languages,
  Loader2,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import CandidateTopBar from "../components/CandidateTopBar";
import { supabase } from "../lib/supabase";
import { findLocationIdByState, lookupUsZipCode, normalizeZipCode } from "../lib/addressLookup";

const emptyForm = {
  name: "", phone: "", email: "", address: "", zip_code: "", city: "", state: "",
  trade_id: "", location_id: "", total_experience_years: 0,
  commercial_experience_years: 0, industrial_experience_years: 0,
  residential_experience_years: 0, strengths: "", needs_improvement: "",
  available_from: "", willing_to_travel: false, skills: [], certifications: [],
  languages: [], projects: [],
};

const emptyProject = () => ({ project_name: "", project_location: "", duration: "", description: "" });
const cloneProfile = (value) => JSON.parse(JSON.stringify(value));

const normalizePhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

function Styles() {
  return <style>{`
    *{box-sizing:border-box} body{margin:0;background:#eef4ff;color:#0f172a;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    .candidate-profile-page{min-height:100dvh;background:linear-gradient(180deg,#eaf2ff 0,#f8fafc 440px)}
    .candidate-profile-shell{width:min(100% - 32px,1080px);margin:0 auto;padding:34px 0 60px;display:grid;gap:16px}
    .candidate-profile-hero,.candidate-section{background:#fff;border:1px solid #dbeafe;border-radius:23px;box-shadow:0 16px 40px rgba(30,64,175,.07)}
    .candidate-profile-hero{padding:25px;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center}
    .candidate-hero-actions{display:flex;align-items:center;gap:10px}.candidate-avatar{width:66px;height:66px;border-radius:20px;background:#eff6ff;color:#2563eb;display:grid;place-items:center}
    .candidate-edit,.candidate-save,.candidate-secondary,.candidate-add{border:0;border-radius:13px;min-height:44px;padding:10px 16px;font-weight:850;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px}
    .candidate-edit,.candidate-save{background:#1f2c40;color:#fff}.candidate-secondary{background:#e2e8f0;color:#334155}.candidate-add{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}.candidate-edit:disabled,.candidate-save:disabled,.candidate-add:disabled{opacity:.55;cursor:not-allowed}
    .candidate-editing-bar{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap}
    .candidate-section{overflow:hidden}.candidate-section-toggle{width:100%;border:0;background:#fff;padding:20px 22px;display:flex;align-items:center;gap:12px;text-align:left;cursor:pointer;color:#0f172a}
    .candidate-section-toggle:hover{background:#f8fbff}.candidate-section-icon{width:38px;height:38px;border-radius:11px;background:#eff6ff;color:#2563eb;display:grid;place-items:center;flex:0 0 auto}
    .candidate-section-heading{min-width:0;flex:1}.candidate-section-title{font-size:17px;font-weight:900}.candidate-section-summary{font-size:12px;color:#64748b;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .candidate-chevron{transition:transform .2s ease}.candidate-chevron.open{transform:rotate(180deg)}.candidate-section-body{border-top:1px solid #e2e8f0;padding:22px}
    .candidate-profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.candidate-field{display:grid;gap:7px}.candidate-field.full{grid-column:1/-1}
    .candidate-label{font-size:11px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:#475569}.candidate-input{width:100%;min-height:47px;border:1px solid #cbd5e1;border-radius:13px;padding:11px 13px;background:#fff;color:#0f172a;outline:none;font:inherit}
    textarea.candidate-input{min-height:105px;resize:vertical}.candidate-input:focus{border-color:#2563eb;box-shadow:0 0 0 4px rgba(37,99,235,.11)}.candidate-input:disabled{background:#f8fafc;color:#475569;border-color:#e2e8f0;opacity:1}
    .candidate-check-row{display:flex;align-items:center;gap:9px;min-height:47px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc}.candidate-check-row input{width:18px;height:18px}
    .candidate-option-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.candidate-option{border:1px solid #cbd5e1;border-radius:12px;background:#fff;min-height:43px;padding:9px 11px;display:flex;align-items:center;gap:8px;text-align:left;color:#334155;font-weight:750}
    button.candidate-option{cursor:pointer}.candidate-option.selected{border-color:#60a5fa;background:#eff6ff;color:#1d4ed8}.candidate-option:disabled{cursor:default;opacity:1}.candidate-option-check{margin-left:auto}
    .candidate-empty{padding:18px;border:1px dashed #cbd5e1;border-radius:14px;text-align:center;color:#64748b;background:#f8fafc}.candidate-tag-list{display:flex;flex-wrap:wrap;gap:8px}.candidate-tag{display:inline-flex;align-items:center;gap:7px;padding:8px 10px;border-radius:999px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;font-weight:800;font-size:13px}
    .candidate-tag button{border:0;background:transparent;color:inherit;display:grid;place-items:center;cursor:pointer;padding:0}.candidate-language-editor{display:grid;gap:12px}.candidate-language-row{display:grid;grid-template-columns:minmax(130px,1fr) minmax(180px,2fr) auto;gap:10px;align-items:center;padding:12px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc}
    .candidate-language-level{display:flex;align-items:center;gap:10px}.candidate-language-level input{width:100%}.candidate-project-list{display:grid;gap:13px}.candidate-project{padding:17px;border:1px solid #dbeafe;border-radius:16px;background:#fbfdff;display:grid;gap:13px}.candidate-project-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.candidate-project-title{font-weight:900}.candidate-project-copy{color:#475569;line-height:1.55;white-space:pre-wrap}.candidate-icon-button{width:38px;height:38px;border:0;border-radius:11px;background:#fee2e2;color:#b91c1c;display:grid;place-items:center;cursor:pointer}
    .candidate-feedback{padding:12px 14px;border-radius:13px;font-weight:750}.candidate-feedback.error{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}.candidate-feedback.success{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534}.spin{animation:candidate-spin 1s linear infinite}@keyframes candidate-spin{to{transform:rotate(360deg)}}
    @media(max-width:760px){.candidate-profile-shell{width:min(100% - 22px,1080px);padding-top:22px}.candidate-profile-hero{grid-template-columns:1fr;padding:20px}.candidate-hero-actions{justify-content:space-between}.candidate-avatar{width:52px;height:52px}.candidate-section-toggle{padding:16px}.candidate-section-body{padding:16px}.candidate-profile-grid,.candidate-option-grid{grid-template-columns:1fr}.candidate-field.full{grid-column:auto}.candidate-language-row{grid-template-columns:1fr auto}.candidate-language-level{grid-column:1/-1;grid-row:2}.candidate-editing-bar{position:sticky;bottom:10px;z-index:15;padding:10px;border-radius:16px;background:rgba(255,255,255,.94);box-shadow:0 10px 35px rgba(15,23,42,.18)}.candidate-editing-bar>*{flex:1}}
  `}</style>;
}

function CollapsibleSection({ icon, title, summary, open, onToggle, children }) {
  return <section className="candidate-section">
    <button className="candidate-section-toggle" type="button" onClick={onToggle} aria-expanded={open}>
      <span className="candidate-section-icon">{React.createElement(icon, { size: 19 })}</span>
      <span className="candidate-section-heading"><span className="candidate-section-title">{title}</span><span className="candidate-section-summary">{summary}</span></span>
      <ChevronDown className={`candidate-chevron${open ? " open" : ""}`} size={20} />
    </button>
    {open ? <div className="candidate-section-body">{children}</div> : null}
  </section>;
}

function CatalogOptions({ options, selectedIds, editing, onToggle }) {
  if (!options.length) return <div className="candidate-empty">No options are available yet.</div>;
  return <div className="candidate-option-grid">{options.map((option) => {
    const selected = selectedIds.includes(option.id);
    if (!editing && !selected) return null;
    return <button key={option.id} type="button" disabled={!editing} className={`candidate-option${selected ? " selected" : ""}`} onClick={() => onToggle(option)}>
      {option.name}{selected ? <Check className="candidate-option-check" size={16} /> : null}
    </button>;
  })}</div>;
}

export default function CandidateProfilePage() {
  const [form, setForm] = useState(emptyForm);
  const [savedForm, setSavedForm] = useState(emptyForm);
  const [trades, setTrades] = useState([]);
  const [locations, setLocations] = useState([]);
  const [skillOptions, setSkillOptions] = useState([]);
  const [certificationOptions, setCertificationOptions] = useState([]);
  const [openSections, setOpenSections] = useState({ personal: true, professional: false, skills: false, languages: false, certifications: false, projects: false });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [zipStatus, setZipStatus] = useState("");
  const [newLanguage, setNewLanguage] = useState("");

  const update = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));
  const toggleSection = (section) => setOpenSections((previous) => ({ ...previous, [section]: !previous[section] }));

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [profileResult, tradesResult, locationsResult, skillsResult, certificationsResult] = await Promise.all([
        supabase.rpc("get_current_worker_profile"),
        supabase.from("trades").select("id,name").order("name"),
        supabase.from("locations").select("id,name").order("name"),
        supabase.from("skills").select("id,name").order("name"),
        supabase.from("certifications").select("id,name").order("name"),
      ]);
      if (!active) return;
      if (profileResult.error || !profileResult.data) {
        setError(profileResult.error?.message || "Could not load your profile.");
      } else {
        const next = { ...emptyForm, ...profileResult.data, available_from: profileResult.data.available_from || "", skills: profileResult.data.skills || [], certifications: profileResult.data.certifications || [], languages: profileResult.data.languages || [], projects: profileResult.data.projects || [] };
        setForm(next); setSavedForm(cloneProfile(next));
      }
      setTrades(tradesResult.data || []); setLocations(locationsResult.data || []);
      setSkillOptions(skillsResult.data || []); setCertificationOptions(certificationsResult.data || []);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!editing) return undefined;
    const zip = normalizeZipCode(form.zip_code);
    if (zip.length !== 5) return undefined;
    const timer = window.setTimeout(async () => {
      setZipStatus("Looking up ZIP...");
      try {
        const result = await lookupUsZipCode(zip);
        if (!result) { setZipStatus("ZIP not found."); return; }
        const locationId = findLocationIdByState(locations, result.state);
        setForm((previous) => ({ ...previous, city: result.city || previous.city, state: result.state || previous.state, location_id: locationId || previous.location_id }));
        setZipStatus("City and state updated.");
      } catch { setZipStatus("Could not look up ZIP."); }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [editing, form.zip_code, locations]);

  const toggleCatalogItem = (field, option) => setForm((previous) => {
    const exists = previous[field].some((item) => item.id === option.id);
    return { ...previous, [field]: exists ? previous[field].filter((item) => item.id !== option.id) : [...previous[field], option] };
  });

  const addLanguage = () => {
    const name = newLanguage.trim();
    if (!name || form.languages.some((item) => item.name.toLowerCase() === name.toLowerCase())) return;
    update("languages", [...form.languages, { name, proficiency_percent: 50 }]); setNewLanguage("");
  };

  const updateLanguage = (index, patch) => update("languages", form.languages.map((language, itemIndex) => itemIndex === index ? { ...language, ...patch } : language));
  const updateProject = (index, field, value) => update("projects", form.projects.map((project, itemIndex) => itemIndex === index ? { ...project, [field]: value } : project));

  const cancelEditing = () => { setForm(cloneProfile(savedForm)); setEditing(false); setError(""); setZipStatus(""); };

  const save = async (event) => {
    event.preventDefault(); setError(""); setSuccess("");
    if (!form.name.trim() || !form.trade_id || !form.location_id) { setError("Name, trade, and location are required."); return; }
    setSaving(true);
    const { data, error: saveError } = await supabase.rpc("update_current_worker_portal_profile", {
      p_name: form.name, p_phone: form.phone, p_address: form.address, p_zip_code: form.zip_code,
      p_city: form.city, p_state: form.state, p_trade_id: form.trade_id, p_location_id: form.location_id,
      p_total_experience_years: Number(form.total_experience_years || 0),
      p_commercial_experience_years: Number(form.commercial_experience_years || 0),
      p_industrial_experience_years: Number(form.industrial_experience_years || 0),
      p_residential_experience_years: Number(form.residential_experience_years || 0),
      p_strengths: form.strengths, p_needs_improvement: form.needs_improvement,
      p_available_from: form.available_from || null, p_willing_to_travel: form.willing_to_travel,
      p_languages: form.languages, p_skill_ids: form.skills.map((item) => item.id),
      p_certification_ids: form.certifications.map((item) => item.id), p_projects: form.projects,
    });
    setSaving(false);
    if (saveError) { setError(saveError.message || "Could not update your profile."); return; }
    const next = { ...emptyForm, ...data, available_from: data.available_from || "", skills: data.skills || [], certifications: data.certifications || [], languages: data.languages || [], projects: data.projects || [] };
    setForm(next); setSavedForm(cloneProfile(next)); setEditing(false); setSuccess("Your profile was updated successfully.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectedSkillIds = form.skills.map((item) => item.id);
  const selectedCertificationIds = form.certifications.map((item) => item.id);

  return <div className="candidate-profile-page"><Styles /><CandidateTopBar workerName={form.name} />
    <main className="candidate-profile-shell">
      <section className="candidate-profile-hero">
        <div><div style={{ color: "#2563eb", fontSize: 11, fontWeight: 850, letterSpacing: ".1em" }}>MY UTS PROFILE</div><h1 style={{ margin: "7px 0", fontSize: "clamp(30px,5vw,42px)", letterSpacing: "-.04em" }}>Personal and professional details</h1><p style={{ color: "#64748b", lineHeight: 1.6, marginBottom: 0 }}>Review your information safely. Select Edit only when you need to make changes.</p></div>
        <div className="candidate-hero-actions"><div className="candidate-avatar"><UserRound size={34} /></div>{!editing ? <button className="candidate-edit" type="button" disabled={loading} onClick={() => { setEditing(true); setSuccess(""); }}><Pencil size={17} /> Edit</button> : null}</div>
      </section>
      {error ? <div className="candidate-feedback error">{error}</div> : null}
      {success ? <div className="candidate-feedback success"><CheckCircle2 size={16} style={{ verticalAlign: "middle", marginRight: 7 }} />{success}</div> : null}
      {loading ? <section className="candidate-section"><div className="candidate-section-body" style={{ display: "flex", gap: 9, alignItems: "center" }}><Loader2 className="spin" size={20} /> Loading profile...</div></section> : <form onSubmit={save} style={{ display: "grid", gap: 14 }}>
        <CollapsibleSection icon={UserRound} title="Personal information" summary={`${form.email || "Verified email"} · ${form.city || "City"}, ${form.state || "State"}`} open={openSections.personal} onToggle={() => toggleSection("personal")}>
          <div className="candidate-profile-grid">
            <label className="candidate-field"><span className="candidate-label">Full name</span><input className="candidate-input" disabled={!editing} value={form.name} onChange={(e) => update("name", e.target.value)} /></label>
            <label className="candidate-field"><span className="candidate-label">Email (verified login)</span><input className="candidate-input" value={form.email || ""} disabled /></label>
            <label className="candidate-field"><span className="candidate-label">Phone</span><input className="candidate-input" disabled={!editing} value={form.phone || ""} onChange={(e) => update("phone", normalizePhone(e.target.value))} /></label>
            <label className="candidate-field"><span className="candidate-label">Available from</span><input className="candidate-input" disabled={!editing} type="date" value={form.available_from} onChange={(e) => update("available_from", e.target.value)} /></label>
            <label className="candidate-field full"><span className="candidate-label">Street address</span><input className="candidate-input" disabled={!editing} value={form.address || ""} onChange={(e) => update("address", e.target.value)} /></label>
            <label className="candidate-field"><span className="candidate-label">ZIP code</span><input className="candidate-input" disabled={!editing} value={form.zip_code || ""} onChange={(e) => update("zip_code", normalizeZipCode(e.target.value))} />{editing && zipStatus ? <small style={{ color: "#64748b" }}>{zipStatus}</small> : null}</label>
            <label className="candidate-field"><span className="candidate-label">City</span><input className="candidate-input" disabled={!editing} value={form.city || ""} onChange={(e) => update("city", e.target.value)} /></label>
            <label className="candidate-field"><span className="candidate-label">State</span><input className="candidate-input" disabled={!editing} value={form.state || ""} onChange={(e) => { const state=e.target.value; setForm((previous)=>({...previous,state,location_id:findLocationIdByState(locations,state)||previous.location_id})); }} /></label>
            <label className="candidate-field"><span className="candidate-label">Location</span><select className="candidate-input" disabled={!editing} value={form.location_id} onChange={(e) => update("location_id", e.target.value)}><option value="">Select location</option>{locations.map((location)=><option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          </div>
        </CollapsibleSection>

        <CollapsibleSection icon={Sparkles} title="Professional profile" summary={`${form.trade_name || "Trade"} · ${form.total_experience_years || 0} years experience`} open={openSections.professional} onToggle={() => toggleSection("professional")}>
          <div className="candidate-profile-grid">
            <label className="candidate-field full"><span className="candidate-label">Trade</span><select className="candidate-input" disabled={!editing} value={form.trade_id} onChange={(e) => update("trade_id", e.target.value)}><option value="">Select trade</option>{trades.map((trade)=><option key={trade.id} value={trade.id}>{trade.name}</option>)}</select></label>
            {[["total_experience_years","Total experience"],["commercial_experience_years","Commercial"],["industrial_experience_years","Industrial"],["residential_experience_years","Residential"]].map(([field,label])=><label className="candidate-field" key={field}><span className="candidate-label">{label} (years)</span><input className="candidate-input" disabled={!editing} type="number" min="0" max="60" value={form[field]} onChange={(e)=>update(field,e.target.value)} /></label>)}
            <label className="candidate-field full"><span className="candidate-label">Travel</span><span className="candidate-check-row"><input type="checkbox" disabled={!editing} checked={!!form.willing_to_travel} onChange={(e)=>update("willing_to_travel",e.target.checked)} /><span style={{ fontWeight: 750 }}>I am willing to travel</span></span></label>
            <label className="candidate-field"><span className="candidate-label">Strengths</span><textarea className="candidate-input" disabled={!editing} value={form.strengths || ""} onChange={(e)=>update("strengths",e.target.value)} /></label>
            <label className="candidate-field"><span className="candidate-label">Needs improvement</span><textarea className="candidate-input" disabled={!editing} value={form.needs_improvement || ""} onChange={(e)=>update("needs_improvement",e.target.value)} /></label>
          </div>
        </CollapsibleSection>

        <CollapsibleSection icon={Sparkles} title="Skills" summary={`${form.skills.length} selected`} open={openSections.skills} onToggle={() => toggleSection("skills")}>
          {!editing && !form.skills.length ? <div className="candidate-empty">No skills have been added.</div> : <CatalogOptions options={skillOptions} selectedIds={selectedSkillIds} editing={editing} onToggle={(option) => toggleCatalogItem("skills", option)} />}
        </CollapsibleSection>

        <CollapsibleSection icon={Languages} title="Languages" summary={`${form.languages.length} added`} open={openSections.languages} onToggle={() => toggleSection("languages")}>
          {editing ? <div className="candidate-language-editor">
            {form.languages.map((language, index) => <div className="candidate-language-row" key={`${language.name}-${index}`}><input className="candidate-input" value={language.name} onChange={(e) => updateLanguage(index, { name: e.target.value })} /><div className="candidate-language-level"><input type="range" min="1" max="100" value={language.proficiency_percent || 50} onChange={(e) => updateLanguage(index, { proficiency_percent: Number(e.target.value) })} /><strong>{language.proficiency_percent || 50}%</strong></div><button className="candidate-icon-button" type="button" aria-label={`Remove ${language.name}`} onClick={() => update("languages", form.languages.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></div>)}
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}><input className="candidate-input" style={{ flex: "1 1 220px" }} placeholder="Add a language" value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLanguage(); } }} /><button className="candidate-add" type="button" onClick={addLanguage}><Plus size={16} /> Add language</button></div>
          </div> : form.languages.length ? <div className="candidate-tag-list">{form.languages.map((language) => <span className="candidate-tag" key={language.name}>{language.name}{language.proficiency_percent ? ` · ${language.proficiency_percent}%` : ""}</span>)}</div> : <div className="candidate-empty">No languages have been added.</div>}
        </CollapsibleSection>

        <CollapsibleSection icon={Award} title="Certifications" summary={`${form.certifications.length} selected`} open={openSections.certifications} onToggle={() => toggleSection("certifications")}>
          {!editing && !form.certifications.length ? <div className="candidate-empty">No certifications have been added.</div> : <CatalogOptions options={certificationOptions} selectedIds={selectedCertificationIds} editing={editing} onToggle={(option) => toggleCatalogItem("certifications", option)} />}
        </CollapsibleSection>

        <CollapsibleSection icon={FolderKanban} title="Project history" summary={`${form.projects.length} project${form.projects.length === 1 ? "" : "s"}`} open={openSections.projects} onToggle={() => toggleSection("projects")}>
          <div className="candidate-project-list">{form.projects.map((project, index) => <article className="candidate-project" key={project.id || index}>
            <div className="candidate-project-head"><div className="candidate-project-title">{project.project_name || `Project ${index + 1}`}</div>{editing ? <button className="candidate-icon-button" type="button" aria-label={`Remove project ${index + 1}`} onClick={() => update("projects", form.projects.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button> : null}</div>
            {editing ? <div className="candidate-profile-grid"><label className="candidate-field"><span className="candidate-label">Project name</span><input className="candidate-input" value={project.project_name || ""} onChange={(e) => updateProject(index,"project_name",e.target.value)} /></label><label className="candidate-field"><span className="candidate-label">Location</span><input className="candidate-input" value={project.project_location || ""} onChange={(e) => updateProject(index,"project_location",e.target.value)} /></label><label className="candidate-field full"><span className="candidate-label">Duration</span><input className="candidate-input" value={project.duration || ""} onChange={(e) => updateProject(index,"duration",e.target.value)} /></label><label className="candidate-field full"><span className="candidate-label">Description</span><textarea className="candidate-input" value={project.description || ""} onChange={(e) => updateProject(index,"description",e.target.value)} /></label></div> : <div><div style={{ color: "#2563eb", fontWeight: 800, fontSize: 13 }}>{[project.project_location, project.duration].filter(Boolean).join(" · ") || "No location or duration provided"}</div>{project.description ? <div className="candidate-project-copy" style={{ marginTop: 8 }}>{project.description}</div> : null}</div>}
          </article>)}{!form.projects.length ? <div className="candidate-empty">No project history has been added.</div> : null}{editing ? <button className="candidate-add" type="button" onClick={() => update("projects", [...form.projects, emptyProject()])}><Plus size={16} /> Add project</button> : null}</div>
        </CollapsibleSection>

        {editing ? <div className="candidate-editing-bar"><button className="candidate-secondary" type="button" disabled={saving} onClick={cancelEditing}><X size={17} /> Cancel</button><button className="candidate-save" disabled={saving} type="submit">{saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />}{saving ? "Saving..." : "Save changes"}</button></div> : null}
      </form>}
      <div style={{ display: "flex", gap: 8, color: "#64748b", fontSize: 13, alignItems: "center" }}><ShieldCheck size={16} /> Your profile is linked to your verified email and protected by row-level security.</div>
    </main>
  </div>;
}
