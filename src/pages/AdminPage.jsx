import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Users,
  Search,
  Loader2,
  FolderKanban,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Briefcase,
  MapPin,
  ShieldCheck,
  Wrench,
  Languages,
} from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function PageStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #eef4ff;
        color: #0f172a;
      }

      input, select, button {
        font: inherit;
      }

      input::placeholder {
        color: #94a3b8;
      }

      .spin {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @media (max-width: 950px) {
        .filters-grid,
        .stats-grid,
        .worker-top,
        .worker-meta {
          grid-template-columns: 1fr !important;
        }

        .admin-shell {
          padding: 16px !important;
        }

        .admin-panel {
          padding: 20px !important;
          border-radius: 24px !important;
        }
      }
    `}</style>
  );
}

const inputStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 14,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  outline: "none",
};

function pillStyle(dark = false) {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 11px",
    borderRadius: 999,
    background: dark ? "#0f172a" : "#dbeafe",
    color: dark ? "#ffffff" : "#0f172a",
    fontSize: 13,
    fontWeight: 700,
  };
}

function metricCardStyle() {
  return {
    background: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
    display: "grid",
    gap: 8,
  };
}

function fieldGroupTitleStyle() {
  return {
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 8,
  };
}

function StatCard({ icon, label, value }) {
  return (
    <div style={metricCardStyle()}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#334155" }}>
        {icon}
        <div style={{ fontWeight: 700 }}>{label}</div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color: "#0f172a" }}>{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: "#0f172a", fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function TagRow({ title, values, icon, emptyLabel }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, ...fieldGroupTitleStyle() }}>
        {icon}
        <span>{title}</span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {values.length === 0 ? (
          <span style={{ color: "#64748b" }}>{emptyLabel}</span>
        ) : (
          values.map((value) => (
            <span key={`${title}-${value}`} style={pillStyle()}>
              {value}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function WorkerCard({ worker }) {
  const [open, setOpen] = useState(false);

  const skills =
    worker.worker_skills?.map((s) => s.skills?.name).filter(Boolean) || [];

  const certifications =
    worker.worker_certifications
      ?.map((c) => c.certifications?.name)
      .filter(Boolean) || [];

  const languages =
    worker.worker_languages?.map((l) => l.language_name).filter(Boolean) || [];

  const projects = [...(worker.worker_projects || [])].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  );

  return (
    <div
      style={{
        background: "#ffffff",
        padding: 22,
        borderRadius: 24,
        border: "1px solid #dbeafe",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
        display: "grid",
        gap: 18,
      }}
    >
      <div
        className="worker-top"
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 0.8fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a" }}>
            {worker.name}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={pillStyle(true)}>
              <Briefcase size={14} />
              {worker.trades?.name || "No trade"}
            </span>
            <span style={pillStyle()}>
              <MapPin size={14} />
              {worker.locations?.name || "No location"}
            </span>
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 16,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569" }}>
            <Phone size={15} />
            <span>{worker.phone || "No phone"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569" }}>
            <Mail size={15} />
            <span>{worker.email || "No email"}</span>
          </div>
        </div>
      </div>

      <div
        className="worker-meta"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <MiniMetric label="Total Experience" value={`${worker.total_experience_years || 0} yrs`} />
        <MiniMetric label="Industrial" value={`${worker.industrial_experience_years || 0} yrs`} />
        <MiniMetric label="Commercial" value={`${worker.commercial_experience_years || 0} yrs`} />
        <MiniMetric label="Residential" value={`${worker.residential_experience_years || 0} yrs`} />
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <TagRow
          title="Skills"
          values={skills}
          icon={<Wrench size={16} color="#334155" />}
          emptyLabel="No skills"
        />

        <TagRow
          title="Certifications"
          values={certifications}
          icon={<ShieldCheck size={16} color="#334155" />}
          emptyLabel="No certifications"
        />

        <TagRow
          title="Languages"
          values={languages}
          icon={<Languages size={16} color="#334155" />}
          emptyLabel="No languages"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: 18,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={fieldGroupTitleStyle()}>Strengths</div>
          <div style={{ color: "#475569", lineHeight: 1.7 }}>
            {worker.strengths || "No strengths listed."}
          </div>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 18,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={fieldGroupTitleStyle()}>Needs Improvement</div>
          <div style={{ color: "#475569", lineHeight: 1.7 }}>
            {worker.needs_improvement || "No notes listed."}
          </div>
        </div>
      </div>

      <button
        onClick={() => setOpen(!open)}
        style={{
          border: "1px solid #cbd5e1",
          background: "#ffffff",
          color: "#0f172a",
          borderRadius: 14,
          padding: "12px 16px",
          fontWeight: 800,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          width: "fit-content",
        }}
      >
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {open ? "Hide Projects" : `Projects (${projects.length})`}
      </button>

      {open ? (
        <div style={{ display: "grid", gap: 12 }}>
          {projects.length === 0 ? (
            <div
              style={{
                padding: 16,
                borderRadius: 16,
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                color: "#64748b",
              }}
            >
              No project history found.
            </div>
          ) : (
            projects.map((p) => (
              <div
                key={p.id}
                style={{
                  background: "#f8fbff",
                  padding: 16,
                  borderRadius: 18,
                  border: "1px solid #dbeafe",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 900, color: "#0f172a" }}>
                  {p.project_name || "Untitled project"}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {p.project_location ? (
                    <span style={pillStyle()}>
                      <MapPin size={14} />
                      {p.project_location}
                    </span>
                  ) : null}

                  {p.duration ? <span style={pillStyle()}>{p.duration}</span> : null}
                </div>

                <div style={{ color: "#475569", lineHeight: 1.7 }}>
                  {p.description || "No description."}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tradeFilter, setTradeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [trades, setTrades] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("workers")
        .select(`
          *,
          trades(name),
          locations(name),
          worker_languages(language_name),
          worker_projects(*),
          worker_skills(skills(name)),
          worker_certifications(certifications(name))
        `)
        .order("created_at", { ascending: false });

      const tradesData = await supabase.from("trades").select("*").order("name");
      const locationsData = await supabase.from("locations").select("*").order("name");

      if (!error) setWorkers(data || []);
      setTrades(tradesData.data || []);
      setLocations(locationsData.data || []);
      setLoading(false);
    };

    load();
  }, []);

  const filtered = useMemo(() => {
    return workers.filter((w) => {
      const term = search.toLowerCase().trim();

      const matchSearch =
        !term ||
        w.name?.toLowerCase().includes(term) ||
        w.email?.toLowerCase().includes(term) ||
        w.phone?.toLowerCase().includes(term);

      const matchTrade = !tradeFilter || w.trade_id === tradeFilter;
      const matchLocation = !locationFilter || w.location_id === locationFilter;

      return matchSearch && matchTrade && matchLocation;
    });
  }, [workers, search, tradeFilter, locationFilter]);

  const totalProjects = workers.reduce(
    (acc, worker) => acc + (worker.worker_projects?.length || 0),
    0
  );

  return (
    <>
      <PageStyles />

      <div
        className="admin-shell"
        style={{
          minHeight: "100vh",
          padding: 24,
          background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 24 }}>
          <div
            className="admin-panel"
            style={{
              background: "#ffffff",
              borderRadius: 30,
              padding: 32,
              boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
              border: "1px solid #dbeafe",
              display: "grid",
              gap: 24,
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <div
                style={{
                  display: "inline-flex",
                  width: "fit-content",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: "#0f172a",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                Universal Talent Source
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 42,
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                }}
              >
                Admin Panel
              </h1>

              <p style={{ margin: 0, color: "#475569", fontSize: 18, lineHeight: 1.7 }}>
                Review, search, and filter all worker profiles currently stored in your database.
              </p>
            </div>

            <div
              className="stats-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <StatCard
                icon={<Users size={18} />}
                label="Total Workers"
                value={workers.length}
              />
              <StatCard
                icon={<Search size={18} />}
                label="Filtered Results"
                value={filtered.length}
              />
              <StatCard
                icon={<FolderKanban size={18} />}
                label="Projects Logged"
                value={totalProjects}
              />
            </div>

            <div
              style={{
                background: "#f8fbff",
                border: "1px solid #dbeafe",
                borderRadius: 24,
                padding: 18,
                display: "grid",
                gap: 16,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 18 }}>Filters</div>

              <div
                className="filters-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 1fr",
                  gap: 14,
                }}
              >
                <input
                  placeholder="Search by name, email or phone"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={inputStyle}
                />

                <select
                  value={tradeFilter}
                  onChange={(e) => setTradeFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">All Trades</option>
                  {trades.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">All Locations</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gap: 18 }}>
              {loading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: 18,
                    borderRadius: 18,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontWeight: 800,
                  }}
                >
                  <Loader2 size={18} className="spin" />
                  Loading workers...
                </div>
              ) : filtered.length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    borderRadius: 18,
                    background: "#ffffff",
                    border: "1px dashed #cbd5e1",
                    color: "#64748b",
                    fontWeight: 700,
                  }}
                >
                  No workers found for the selected filters.
                </div>
              ) : (
                filtered.map((w) => <WorkerCard key={w.id} worker={w} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}