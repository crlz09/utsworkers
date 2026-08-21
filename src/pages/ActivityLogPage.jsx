import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, CalendarDays, FilterX, FolderKanban, Search, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import UtsTopNavBar from "../components/UtsTopNavBar";
import { supabase } from "../lib/supabase";

const ENTITY_LABELS = {
  candidate: "Candidate",
  candidate_note: "Note",
  candidate_document: "Document",
  document_reminder: "Reminder",
  job_placement: "Placement",
  project: "Project",
  invoice: "Invoice",
};

const FIELD_LABELS = {
  name: "Name",
  status: "Status",
  availability: "Availability",
  recruiter_user_id: "Recruiter",
  trade_id: "Trade",
  location_id: "Location",
  rate: "Rate",
  per_diem: "Per diem",
  willing_to_travel: "Travel availability",
  is_public_profile: "Public profile",
  admin_reviewed_at: "Admin review",
  candidate_status: "Placement status",
  cts_job_id: "Project",
  worker_id: "Candidate",
  placement_fee_amount: "Placement fee",
  placement_fee_paid: "Placement fee paid",
  placement_fee_paid_at: "Payment date",
  placement_fee_invoice_number: "Invoice number",
  level_type: "Project name",
  qty: "Openings",
  city: "City",
  state: "State",
  priority: "Priority",
  client_name: "Client",
  document_type: "Document type",
  file_name: "File name",
  reminder_kind: "Reminder type",
  requested_document_types: "Requested documents",
  invoice_number: "Invoice number",
  total: "Total",
  subtotal: "Subtotal",
};

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).replaceAll("_", " ");
}

function getEventSummary(event) {
  if (event.entity_type === "candidate_note") return "Added a Recruiter / Admin note";
  if (event.entity_type === "document_reminder") return "Sent a document reminder";
  if (event.entity_type === "candidate_document") {
    if (event.action === "insert") return "Uploaded a candidate document";
    if (event.action === "delete") return "Removed a candidate document";
    return "Updated a candidate document";
  }
  if (event.entity_type === "job_placement") {
    if (event.action === "insert") return "Added a candidate to a CTS project";
    if (event.action === "delete") return "Removed a candidate from a CTS project";
    if (event.changed_fields?.includes("placement_fee_paid")) return "Updated the placement fee payment";
    if (event.changed_fields?.includes("candidate_status")) return "Changed the candidate's placement status";
    return "Updated a CTS project assignment";
  }
  if (event.entity_type === "project") {
    if (event.action === "insert") return "Created a CTS project";
    if (event.action === "delete") return "Deleted a CTS project";
    return "Updated a CTS project";
  }
  if (event.entity_type === "invoice") {
    if (event.action === "insert") return "Created an invoice";
    if (event.action === "delete") return "Deleted an invoice";
    return "Updated an invoice";
  }
  if (event.action === "insert") return "Created a candidate record";
  if (event.action === "delete") return "Deleted a candidate record";
  return "Updated a candidate record";
}

function PageStyles() {
  return <style>{`
    .activity-page { min-height: 100vh; padding: 28px; color: #0f172a; font-family: var(--uts-font-family, Inter, ui-sans-serif, system-ui, sans-serif); }
    .activity-shell { width: min(1420px, 100%); margin: 0 auto; display: grid; gap: 18px; }
    .activity-hero, .activity-panel { background: #fff; border: 1px solid #dbe4f0; border-radius: 22px; box-shadow: 0 12px 34px rgba(15,23,42,.05); }
    .activity-hero { padding: 25px 28px; display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; }
    .activity-kicker { color: #2563eb; font-size: 11px; font-weight: 900; letter-spacing: .11em; text-transform: uppercase; }
    .activity-title { margin: 7px 0 5px; font-size: clamp(28px, 4vw, 42px); letter-spacing: -.04em; }
    .activity-subtitle { margin: 0; color: #64748b; line-height: 1.55; }
    .activity-security { display: inline-flex; align-items: center; gap: 7px; color: #166534; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 999px; padding: 8px 11px; font-size: 12px; font-weight: 800; white-space: nowrap; }
    .activity-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .activity-metric { min-width: 0; padding: 17px; background: #fff; border: 1px solid #dbe4f0; border-radius: 17px; display: flex; align-items: center; gap: 12px; }
    .activity-metric-icon { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; color: #2563eb; background: #eff6ff; flex: 0 0 auto; }
    .activity-metric span { display: block; color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
    .activity-metric strong { display: block; margin-top: 3px; font-size: 23px; }
    .activity-panel { padding: 20px; }
    .activity-filters { display: grid; grid-template-columns: minmax(260px, 1fr) repeat(3, minmax(145px, 190px)) auto; gap: 10px; align-items: center; }
    .activity-search { position: relative; }
    .activity-search svg { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #64748b; }
    .activity-control { width: 100%; min-height: 43px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 9px 12px; background: #fff; color: #0f172a; outline: none; font: inherit; }
    .activity-search .activity-control { padding-left: 40px; }
    .activity-control:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.11); }
    .activity-clear { min-height: 43px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 9px 12px; display: inline-flex; align-items: center; gap: 7px; background: #fff; color: #475569; font-weight: 800; cursor: pointer; white-space: nowrap; }
    .activity-count { margin: 17px 2px 10px; color: #64748b; font-size: 13px; font-weight: 750; }
    .activity-list { display: grid; }
    .activity-event { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 13px; padding: 18px 4px; border-top: 1px solid #edf1f5; }
    .activity-event:first-child { border-top: 0; }
    .activity-event-icon { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; color: #1d4ed8; background: #eff6ff; }
    .activity-event-title { margin: 0; font-size: 15px; line-height: 1.35; }
    .activity-event-meta { margin-top: 5px; color: #64748b; font-size: 12px; line-height: 1.45; }
    .activity-event-actor { color: #0f172a; font-weight: 800; }
    .activity-event-badges { margin-top: 9px; display: flex; flex-wrap: wrap; gap: 6px; }
    .activity-chip { border: 1px solid #dbe4f0; border-radius: 999px; padding: 5px 8px; background: #f8fafc; color: #475569; font-size: 10px; font-weight: 800; }
    .activity-changes { margin-top: 10px; display: grid; gap: 5px; }
    .activity-change { color: #64748b; font-size: 12px; line-height: 1.45; }
    .activity-change strong { color: #334155; }
    .activity-event-link { border: 1px solid #cbd5e1; border-radius: 10px; padding: 8px 10px; background: #fff; color: #1d4ed8; font-weight: 800; cursor: pointer; white-space: nowrap; }
    .activity-empty { padding: 54px 18px; text-align: center; color: #64748b; }
    .activity-error { padding: 14px 16px; border: 1px solid #fecaca; border-radius: 12px; background: #fef2f2; color: #b91c1c; font-weight: 750; }
    @media (max-width: 1050px) { .activity-metrics { grid-template-columns: repeat(2, 1fr); } .activity-filters { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 620px) { .activity-page { padding: 18px 12px; } .activity-hero { padding: 20px; flex-direction: column; } .activity-metrics { grid-template-columns: 1fr 1fr; } .activity-filters { grid-template-columns: 1fr; } .activity-event { grid-template-columns: 40px minmax(0, 1fr); } .activity-event-link { grid-column: 2; justify-self: start; } }
  `}</style>;
}

export default function ActivityLogPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ search: "", actor: "", entity: "", date: "" });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [permissionResult, eventsResult, recruitersResult, workersResult, projectsResult] = await Promise.all([
        supabase.from("admin_permissions").select("can_delete_workers").maybeSingle(),
        supabase.from("audit_events").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("recruiters").select("user_id,full_name,email").order("full_name"),
        supabase.from("workers").select("id,name").order("name"),
        supabase.from("cts_jobs").select("id,level_type"),
      ]);
      if (!active) return;
      if (!permissionResult.data?.can_delete_workers) {
        setError("This Activity Log is available only to administrative supervisors.");
      } else if (eventsResult.error) {
        setError(eventsResult.error.message || "Could not load the Activity Log.");
      } else {
        setEvents(eventsResult.data || []);
      }
      setRecruiters(recruitersResult.data || []);
      setWorkers(workersResult.data || []);
      setProjects(projectsResult.data || []);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, []);

  const recruiterById = useMemo(() => new Map(recruiters.map((item) => [item.user_id, item])), [recruiters]);
  const workerById = useMemo(() => new Map(workers.map((item) => [item.id, item.name])), [workers]);
  const projectById = useMemo(() => new Map(projects.map((item) => [item.id, item.level_type])), [projects]);

  const actorOptions = useMemo(() => {
    const actors = new Map();
    events.forEach((event) => {
      const recruiter = recruiterById.get(event.actor_id);
      const label = recruiter?.full_name || event.actor_name || event.actor_email || "System";
      actors.set(event.actor_id || "system", label);
    });
    return [...actors.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [events, recruiterById]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    if (filters.actor && (event.actor_id || "system") !== filters.actor) return false;
    if (filters.entity && event.entity_type !== filters.entity) return false;
    if (filters.date && String(event.created_at || "").slice(0, 10) !== filters.date) return false;
    const recruiter = recruiterById.get(event.actor_id);
    const workerName = workerById.get(event.worker_id) || "";
    const projectName = projectById.get(event.project_id) || "";
    const haystack = [recruiter?.full_name, event.actor_name, event.actor_email, event.entity_name, workerName, projectName, getEventSummary(event), ...(event.changed_fields || [])].filter(Boolean).join(" ").toLowerCase();
    return !filters.search.trim() || haystack.includes(filters.search.trim().toLowerCase());
  }), [events, filters, projectById, recruiterById, workerById]);

  const metrics = useMemo(() => {
    const today = new Date().toLocaleDateString("en-CA");
    return {
      total: filteredEvents.length,
      today: filteredEvents.filter((event) => new Date(event.created_at).toLocaleDateString("en-CA") === today).length,
      recruiters: new Set(filteredEvents.map((event) => event.actor_id).filter(Boolean)).size,
      candidates: new Set(filteredEvents.map((event) => event.worker_id).filter(Boolean)).size,
    };
  }, [filteredEvents]);

  const clearFilters = () => setFilters({ search: "", actor: "", entity: "", date: "" });

  return <>
    <PageStyles />
    <UtsTopNavBar />
    <main className="activity-page">
      <div className="activity-shell">
        <section className="activity-hero">
          <div><div className="activity-kicker">Administration</div><h1 className="activity-title">Activity Log</h1><p className="activity-subtitle">Review changes made across candidates, documents, CTS projects, placements, reminders, and invoices.</p></div>
          <div className="activity-security"><ShieldCheck size={15} /> Supervisor access</div>
        </section>

        {error ? <div className="activity-error">{error}</div> : <>
          <section className="activity-metrics">
            {[
              [<Activity size={19} />, "Matching events", metrics.total],
              [<CalendarDays size={19} />, "Today", metrics.today],
              [<UserRound size={19} />, "Recruiters", metrics.recruiters],
              [<UsersRound size={19} />, "Candidates touched", metrics.candidates],
            ].map(([icon, label, value]) => <div className="activity-metric" key={label}><div className="activity-metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>)}
          </section>

          <section className="activity-panel">
            <div className="activity-filters">
              <label className="activity-search"><Search size={17} /><input className="activity-control" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search recruiter, candidate, project or action..." /></label>
              <select className="activity-control" value={filters.actor} onChange={(event) => setFilters((current) => ({ ...current, actor: event.target.value }))}><option value="">All recruiters</option>{actorOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
              <select className="activity-control" value={filters.entity} onChange={(event) => setFilters((current) => ({ ...current, entity: event.target.value }))}><option value="">All activity</option>{Object.entries(ENTITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <input className="activity-control" type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} aria-label="Filter by date" />
              <button className="activity-clear" type="button" onClick={clearFilters}><FilterX size={16} /> Clear</button>
            </div>
            <div className="activity-count">{loading ? "Loading activity..." : `${filteredEvents.length} event${filteredEvents.length === 1 ? "" : "s"}`}</div>
            <div className="activity-list">
              {!loading && filteredEvents.length === 0 ? <div className="activity-empty">No activity matches the selected filters.</div> : filteredEvents.map((event) => {
                const recruiter = recruiterById.get(event.actor_id);
                const actor = recruiter?.full_name || event.actor_name || event.actor_email || "System";
                const workerName = workerById.get(event.worker_id);
                const projectName = projectById.get(event.project_id);
                const visibleChanges = Object.keys({ ...(event.before_data || {}), ...(event.after_data || {}) });
                return <article className="activity-event" key={event.id}>
                  <div className="activity-event-icon">{event.entity_type === "project" || event.entity_type === "job_placement" ? <FolderKanban size={19} /> : event.entity_type === "candidate" ? <UsersRound size={19} /> : <Activity size={19} />}</div>
                  <div>
                    <h2 className="activity-event-title">{getEventSummary(event)}</h2>
                    <div className="activity-event-meta"><span className="activity-event-actor">{actor}</span> · {new Date(event.created_at).toLocaleString()} {workerName ? `· ${workerName}` : ""} {projectName ? `· ${projectName}` : ""}</div>
                    <div className="activity-event-badges"><span className="activity-chip">{ENTITY_LABELS[event.entity_type] || event.entity_type}</span>{(event.changed_fields || []).slice(0, 8).map((field) => <span className="activity-chip" key={field}>{FIELD_LABELS[field] || field.replaceAll("_", " ")}</span>)}</div>
                    {visibleChanges.length ? <div className="activity-changes">{visibleChanges.slice(0, 6).map((field) => <div className="activity-change" key={field}><strong>{FIELD_LABELS[field] || field.replaceAll("_", " ")}:</strong> {formatValue(event.before_data?.[field])} → {formatValue(event.after_data?.[field])}</div>)}</div> : null}
                  </div>
                  {event.worker_id ? <button className="activity-event-link" type="button" onClick={() => navigate(`/admin/workers/${event.worker_id}/details`)}>Open candidate</button> : event.project_id ? <button className="activity-event-link" type="button" onClick={() => navigate(`/cts-jobs/${event.project_id}`)}>Open project</button> : null}
                </article>;
              })}
            </div>
          </section>
        </>}
      </div>
    </main>
  </>;
}
