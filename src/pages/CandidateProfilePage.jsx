import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Save, ShieldCheck, UserRound } from "lucide-react";
import CandidateTopBar from "../components/CandidateTopBar";
import { supabase } from "../lib/supabase";
import { findLocationIdByState, lookupUsZipCode, normalizeZipCode } from "../lib/addressLookup";

const emptyForm = {
  name: "", phone: "", email: "", address: "", zip_code: "", city: "", state: "",
  trade_id: "", location_id: "", total_experience_years: 0,
  commercial_experience_years: 0, industrial_experience_years: 0,
  residential_experience_years: 0, strengths: "", needs_improvement: "",
  available_from: "", willing_to_travel: false,
};

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
    .candidate-profile-shell{width:min(100% - 32px,1080px);margin:0 auto;padding:34px 0 60px;display:grid;gap:18px}
    .candidate-profile-hero,.candidate-profile-card{background:white;border:1px solid #dbeafe;border-radius:23px;box-shadow:0 16px 40px rgba(30,64,175,.07)}
    .candidate-profile-hero{padding:25px;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center}
    .candidate-profile-card{padding:23px}.candidate-profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}
    .candidate-field{display:grid;gap:7px}.candidate-field.full{grid-column:1/-1}.candidate-label{font-size:11px;font-weight:850;letter-spacing:.08em;text-transform:uppercase;color:#475569}
    .candidate-input{width:100%;min-height:47px;border:1px solid #cbd5e1;border-radius:13px;padding:11px 13px;background:white;color:#0f172a;outline:none;font:inherit}
    textarea.candidate-input{min-height:110px;resize:vertical}.candidate-input:focus{border-color:#2563eb;box-shadow:0 0 0 4px rgba(37,99,235,.11)}.candidate-input:disabled{background:#f1f5f9;color:#64748b}
    .candidate-save{border:0;border-radius:13px;min-height:46px;padding:11px 18px;background:#1f2c40;color:white;font-weight:850;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px}.candidate-save:disabled{opacity:.55;cursor:not-allowed}
    .candidate-feedback{padding:12px 14px;border-radius:13px;font-weight:750}.candidate-feedback.error{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}.candidate-feedback.success{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534}
    .spin{animation:candidate-spin 1s linear infinite}@keyframes candidate-spin{to{transform:rotate(360deg)}}
    @media(max-width:700px){.candidate-profile-shell{width:min(100% - 24px,1080px);padding-top:24px}.candidate-profile-grid,.candidate-profile-hero{grid-template-columns:1fr}.candidate-profile-card,.candidate-profile-hero{padding:19px}.candidate-field.full{grid-column:auto}}
  `}</style>;
}

export default function CandidateProfilePage() {
  const [form, setForm] = useState(emptyForm);
  const [trades, setTrades] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [zipStatus, setZipStatus] = useState("");

  const update = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [profileResult, tradesResult, locationsResult] = await Promise.all([
        supabase.rpc("get_current_worker_profile"),
        supabase.from("trades").select("id,name").order("name"),
        supabase.from("locations").select("id,name").order("name"),
      ]);
      if (!active) return;
      if (profileResult.error || !profileResult.data) {
        setError(profileResult.error?.message || "Could not load your profile.");
      } else {
        setForm({ ...emptyForm, ...profileResult.data, available_from: profileResult.data.available_from || "" });
      }
      setTrades(tradesResult.data || []);
      setLocations(locationsResult.data || []);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
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
  }, [form.zip_code, locations]);

  const save = async (event) => {
    event.preventDefault();
    setError(""); setSuccess("");
    if (!form.name.trim() || !form.trade_id || !form.location_id) { setError("Name, trade, and location are required."); return; }
    setSaving(true);
    const { data, error: saveError } = await supabase.rpc("update_current_worker_profile", {
      p_name: form.name, p_phone: form.phone, p_address: form.address,
      p_zip_code: form.zip_code, p_city: form.city, p_state: form.state,
      p_trade_id: form.trade_id, p_location_id: form.location_id,
      p_total_experience_years: Number(form.total_experience_years || 0),
      p_commercial_experience_years: Number(form.commercial_experience_years || 0),
      p_industrial_experience_years: Number(form.industrial_experience_years || 0),
      p_residential_experience_years: Number(form.residential_experience_years || 0),
      p_strengths: form.strengths, p_needs_improvement: form.needs_improvement,
      p_available_from: form.available_from || null, p_willing_to_travel: form.willing_to_travel,
    });
    setSaving(false);
    if (saveError) { setError(saveError.message || "Could not update your profile."); return; }
    setForm({ ...emptyForm, ...data, available_from: data.available_from || "" });
    setSuccess("Your profile was updated successfully.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return <div className="candidate-profile-page">
    <Styles />
    <CandidateTopBar workerName={form.name} />
    <main className="candidate-profile-shell">
      <section className="candidate-profile-hero">
        <div><div style={{ color: "#2563eb", fontSize: 11, fontWeight: 850, letterSpacing: ".1em" }}>MY UTS PROFILE</div><h1 style={{ margin: "7px 0", fontSize: "clamp(30px,5vw,42px)", letterSpacing: "-.04em" }}>Personal and professional details</h1><p style={{ color: "#64748b", lineHeight: 1.6 }}>Keep your information current. Internal recruiting notes, rates, and review status remain managed by UTS.</p></div>
        <UserRound size={54} color="#2563eb" />
      </section>
      {error ? <div className="candidate-feedback error">{error}</div> : null}
      {success ? <div className="candidate-feedback success"><CheckCircle2 size={16} style={{ verticalAlign: "middle", marginRight: 7 }} />{success}</div> : null}
      <form className="candidate-profile-card" onSubmit={save}>
        {loading ? <div style={{ display: "flex", gap: 9, alignItems: "center" }}><Loader2 className="spin" size={20} /> Loading profile...</div> : <div className="candidate-profile-grid">
          <label className="candidate-field"><span className="candidate-label">Full name</span><input className="candidate-input" value={form.name} onChange={(e) => update("name", e.target.value)} /></label>
          <label className="candidate-field"><span className="candidate-label">Email (verified login)</span><input className="candidate-input" value={form.email || ""} disabled /></label>
          <label className="candidate-field"><span className="candidate-label">Phone</span><input className="candidate-input" value={form.phone || ""} onChange={(e) => update("phone", normalizePhone(e.target.value))} /></label>
          <label className="candidate-field"><span className="candidate-label">Available from</span><input className="candidate-input" type="date" value={form.available_from} onChange={(e) => update("available_from", e.target.value)} /></label>
          <label className="candidate-field full"><span className="candidate-label">Street address</span><input className="candidate-input" value={form.address || ""} onChange={(e) => update("address", e.target.value)} /></label>
          <label className="candidate-field"><span className="candidate-label">ZIP code</span><input className="candidate-input" value={form.zip_code || ""} onChange={(e) => update("zip_code", normalizeZipCode(e.target.value))} />{zipStatus ? <small style={{ color: "#64748b" }}>{zipStatus}</small> : null}</label>
          <label className="candidate-field"><span className="candidate-label">City</span><input className="candidate-input" value={form.city || ""} onChange={(e) => update("city", e.target.value)} /></label>
          <label className="candidate-field"><span className="candidate-label">State</span><input className="candidate-input" value={form.state || ""} onChange={(e) => { const state=e.target.value; setForm((previous)=>({...previous,state,location_id:findLocationIdByState(locations,state)||previous.location_id})); }} /></label>
          <label className="candidate-field"><span className="candidate-label">Trade</span><select className="candidate-input" value={form.trade_id} onChange={(e) => update("trade_id", e.target.value)}><option value="">Select trade</option>{trades.map((trade)=><option key={trade.id} value={trade.id}>{trade.name}</option>)}</select></label>
          <label className="candidate-field"><span className="candidate-label">Location</span><select className="candidate-input" value={form.location_id} onChange={(e) => update("location_id", e.target.value)}><option value="">Select location</option>{locations.map((location)=><option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          {[['total_experience_years','Total experience'],['commercial_experience_years','Commercial'],['industrial_experience_years','Industrial'],['residential_experience_years','Residential']].map(([field,label])=><label className="candidate-field" key={field}><span className="candidate-label">{label} (years)</span><input className="candidate-input" type="number" min="0" max="60" value={form[field]} onChange={(e)=>update(field,e.target.value)} /></label>)}
          <label className="candidate-field full" style={{ display: "flex", gridTemplateColumns: "auto 1fr", alignItems: "center" }}><input type="checkbox" checked={!!form.willing_to_travel} onChange={(e)=>update("willing_to_travel",e.target.checked)} /><span style={{ fontWeight: 750 }}>I am willing to travel</span></label>
          <label className="candidate-field"><span className="candidate-label">Strengths</span><textarea className="candidate-input" value={form.strengths || ""} onChange={(e)=>update("strengths",e.target.value)} /></label>
          <label className="candidate-field"><span className="candidate-label">Areas to improve</span><textarea className="candidate-input" value={form.needs_improvement || ""} onChange={(e)=>update("needs_improvement",e.target.value)} /></label>
          <div className="candidate-field full" style={{ display: "flex", justifyContent: "flex-end" }}><button className="candidate-save" disabled={saving} type="submit">{saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />}{saving ? "Saving..." : "Save profile"}</button></div>
        </div>}
      </form>
      <div style={{ display: "flex", gap: 8, color: "#64748b", fontSize: 13, alignItems: "center" }}><ShieldCheck size={16} /> Your profile is linked to your verified email and protected by row-level security.</div>
    </main>
  </div>;
}
