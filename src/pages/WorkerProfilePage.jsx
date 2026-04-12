import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  CalendarDays,
  ShieldCheck,
  Wrench,
  Languages,
  FolderKanban,
  Download,
  ExternalLink,
} from "lucide-react";

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

      @media (max-width: 950px) {
        .profile-top,
        .profile-meta,
        .profile-notes,
        .profile-summary {
          grid-template-columns: 1fr !important;
        }

        .profile-shell {
          padding: 16px !important;
        }

        .profile-panel {
          padding: 20px !important;
          border-radius: 24px !important;
        }
      }
    `}</style>
  );
}

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

function cardStyle() {
  return {
    background: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
  };
}

function sectionTitleStyle() {
  return {
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 10,
  };
}

function getStatusStyle(status) {
  switch (status) {
    case "onboarding":
      return {
        background: "#e0f2fe",
        color: "#0c4a6e",
        border: "1px solid #7dd3fc",
      };
    case "hold":
      return {
        background: "#ffedd5",
        color: "#9a3412",
        border: "1px solid #fdba74",
      };
    case "rejected":
      return {
        background: "#fee2e2",
        color: "#991b1b",
        border: "1px solid #fca5a5",
      };
    case "completed":
      return {
        background: "#ede9fe",
        color: "#5b21b6",
        border: "1px solid #c4b5fd",
      };
    case "working":
      return {
        background: "#dcfce7",
        color: "#166534",
        border: "1px solid #86efac",
      };
    case "pending":
    default:
      return {
        background: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fcd34d",
      };
  }
}

function getAvailabilityStyle(availability) {
  switch (availability) {
    case "available_soon":
      return {
        background: "#e0f2fe",
        color: "#0c4a6e",
        border: "1px solid #7dd3fc",
      };
    case "on_project":
      return {
        background: "#ede9fe",
        color: "#5b21b6",
        border: "1px solid #c4b5fd",
      };
    case "unavailable":
      return {
        background: "#f1f5f9",
        color: "#334155",
        border: "1px solid #cbd5e1",
      };
    case "available":
    default:
      return {
        background: "#dcfce7",
        color: "#166534",
        border: "1px solid #86efac",
      };
  }
}

function formatStatus(status) {
  switch (status) {
    case "onboarding":
      return "OnBoarding";
    case "hold":
      return "Hold";
    case "rejected":
      return "Rejected";
    case "completed":
      return "Completed";
    case "working":
      return "Working";
    case "pending":
    default:
      return "Pending";
  }
}

function formatAvailability(availability) {
  switch (availability) {
    case "available_soon":
      return "Available Soon";
    case "on_project":
      return "On Project";
    case "unavailable":
      return "Unavailable";
    case "available":
    default:
      return "Available";
  }
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, ...sectionTitleStyle() }}>
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

export default function WorkerProfilePage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadWorker = async () => {
      setLoading(true);
      setError("");

      const { data, error } = await supabase.rpc("get_public_worker_profile", {
        profile_slug: slug,
      });

      if (error) {
        setError(error.message || "Could not load worker profile.");
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Worker profile not found or not public.");
        setLoading(false);
        return;
      }

      setWorker(data);
      setLoading(false);
    };

    loadWorker();
  }, [slug]);

  const skills = useMemo(() => worker?.skills || [], [worker]);
  const certifications = useMemo(() => worker?.certifications || [], [worker]);
  const languages = useMemo(() => worker?.languages || [], [worker]);
  const projects = useMemo(
    () =>
      [...(worker?.projects || [])].sort(
        (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
      ),
    [worker]
  );

  const exportCsv = () => {
    if (!worker) return;

    const profileUrl = window.location.href;

    const rows = [
      ["Name", worker.name || ""],
      ["Phone", worker.phone || ""],
      ["Email", worker.email || ""],
      ["Trade", worker.trade || ""],
      ["Location", worker.location || ""],
      ["Total Experience (Years)", worker.total_experience_years ?? ""],
      ["Commercial Experience (Years)", worker.commercial_experience_years ?? ""],
      ["Industrial Experience (Years)", worker.industrial_experience_years ?? ""],
      ["Residential Experience (Years)", worker.residential_experience_years ?? ""],
      ["Profile URL", profileUrl],
    ];

    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(worker.name || "worker").replace(/\s+/g, "_")}_profile.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <>
        <PageStyles />
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)",
            fontWeight: 800,
            color: "#1d4ed8",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            Loading profile...
          </div>
        </div>
      </>
    );
  }

  if (error || !worker) {
    return (
      <>
        <PageStyles />
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)",
            padding: 24,
          }}
        >
          <div style={{ ...cardStyle(), maxWidth: 700 }}>
            <div style={{ color: "#b91c1c", fontWeight: 800 }}>
              {error || "Worker not found."}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageStyles />

      <div
        className="profile-shell"
        style={{
          minHeight: "100vh",
          padding: 24,
          background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 24 }}>
          <div
            className="profile-panel"
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                gap: 16,
                flexWrap: "wrap",
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
                  Worker Profile
                </h1>

                <p style={{ margin: 0, color: "#475569", fontSize: 18, lineHeight: 1.7 }}>
                  Public read-only profile.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
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
                  }}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>

                <button
                  type="button"
                  onClick={exportCsv}
                  style={{
                    border: "none",
                    background: "#0f172a",
                    color: "#ffffff",
                    borderRadius: 14,
                    padding: "12px 16px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
            </div>

            <div
              className="profile-top"
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 0.8fr",
                gap: 18,
                alignItems: "start",
              }}
            >
              <div style={cardStyle()}>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#0f172a", marginBottom: 12 }}>
                  {worker.name}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={pillStyle(true)}>
                    <Briefcase size={14} />
                    {worker.trade || "No trade"}
                  </span>

                  <span style={pillStyle()}>
                    <MapPin size={14} />
                    {worker.location || "No location"}
                  </span>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "7px 11px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 800,
                      ...getStatusStyle(worker.status),
                    }}
                  >
                    {formatStatus(worker.status)}
                  </span>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "7px 11px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 800,
                      ...getAvailabilityStyle(worker.availability),
                    }}
                  >
                    {formatAvailability(worker.availability)}
                  </span>
                </div>
              </div>

              <div style={cardStyle()}>
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569" }}>
                    <Phone size={15} />
                    <span>{worker.phone || "No phone"}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569" }}>
                    <Mail size={15} />
                    <span>{worker.email || "No email"}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569" }}>
                    <CalendarDays size={15} />
                    <span>Registered: {formatDate(worker.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="profile-summary"
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

            <div style={{ ...cardStyle(), display: "grid", gap: 16 }}>
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
              className="profile-notes"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 16,
              }}
            >
              <div style={cardStyle()}>
                <div style={sectionTitleStyle()}>Strengths</div>
                <div style={{ color: "#475569", lineHeight: 1.7 }}>
                  {worker.strengths || "No strengths listed."}
                </div>
              </div>

              <div style={cardStyle()}>
                <div style={sectionTitleStyle()}>Needs Improvement</div>
                <div style={{ color: "#475569", lineHeight: 1.7 }}>
                  {worker.needs_improvement || "No notes listed."}
                </div>
              </div>

              <div style={cardStyle()}>
                <div style={sectionTitleStyle()}>Availability Details</div>
                <div style={{ color: "#475569", lineHeight: 1.7 }}>
                  Available From: {worker.available_from || "—"}
                  <br />
                  Willing To Travel: {worker.willing_to_travel ? "Yes" : "No"}
                </div>
              </div>
            </div>

            <div style={cardStyle()}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, ...sectionTitleStyle() }}>
                <FolderKanban size={16} />
                <span>Project History</span>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {projects.length === 0 ? (
                  <div style={{ color: "#64748b" }}>No project history found.</div>
                ) : (
                  projects.map((p, index) => (
                    <div
                      key={index}
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
            </div>

            <div style={cardStyle()}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, ...sectionTitleStyle() }}>
                <ExternalLink size={16} />
                <span>Profile URL</span>
              </div>

              <div style={{ color: "#475569", wordBreak: "break-all" }}>
                {window.location.href}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}