import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import UtsTopNavBar from "../components/UtsTopNavBar";
import GoToTopButton from "../components/GoToTopButton";
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
  X,
  CalendarDays,
  FileText,
  Upload,
  Paperclip,
  Trash2,
  Download,
  ExternalLink,
  UserPlus,
  UserCheck,
  History,
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

      input, select, textarea, button {
        font: inherit;
      }

      input::placeholder,
      textarea::placeholder {
        color: #94a3b8;
      }

      .spin {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .uts-topbar {
        position: sticky;
        top: 0;
        z-index: 30;
        background: linear-gradient(180deg, #1f2c40 0%, #1b2738 100%);
        border-bottom: 1px solid rgba(255,255,255,0.06);
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
      }

      .uts-topbar-inner {
        max-width: 1280px;
        margin: 0 auto;
        min-height: 78px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 0 24px;
      }

      .uts-brand {
        display: inline-flex;
        align-items: center;
        gap: 14px;
        flex-shrink: 0;
      }

      .uts-brand img {
        height: 52px;
        width: auto;
        object-fit: contain;
        display: block;
      }

      .uts-nav {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .uts-nav-btn {
        border: none;
        background: transparent;
        color: rgba(255,255,255,0.82);
        padding: 12px 14px;
        border-radius: 12px;
        font-weight: 800;
        font-size: 15px;
        cursor: pointer;
        transition: 0.18s ease;
      }

      .uts-nav-btn:hover {
        background: rgba(255,255,255,0.08);
        color: #ffffff;
      }

      .uts-nav-btn.active {
        background: rgba(255,255,255,0.12);
        color: #ffffff;
      }

      .uts-topbar-right {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .uts-logout-btn {
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(255,255,255,0.04);
        color: #ffffff;
        border-radius: 14px;
        padding: 11px 15px;
        font-weight: 800;
        cursor: pointer;
      }

      @media (max-width: 1100px) {
        .uts-topbar-inner {
          align-items: flex-start;
          flex-direction: column;
          padding-top: 14px;
          padding-bottom: 14px;
        }

        .uts-topbar-right {
          width: 100%;
          justify-content: flex-start;
        }
      }

      @media (max-width: 950px) {
        .filters-grid,
        .stats-grid,
        .worker-top,
        .worker-meta,
        .worker-notes,
        .worker-dates,
        .availability-grid,
        .document-upload-grid,
        .worker-actions {
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

const textareaStyle = {
  width: "100%",
  minHeight: 120,
  padding: "13px 14px",
  borderRadius: 14,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  outline: "none",
  resize: "vertical",
  lineHeight: 1.6,
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
    default:
      return {
        background: "#f1f5f9",
        color: "#334155",
        border: "1px solid #cbd5e1",
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
      return "Available";
    case "on_project":
      return "On Project";
    case "unavailable":
    default:
      return "Unavailable";
  }
}

function statusPriority(status) {
  switch (status) {
    case "pending":
      return 1;
    case "onboarding":
      return 2;
    case "working":
      return 3;
    case "hold":
      return 4;
    case "completed":
      return 5;
    case "rejected":
      return 6;
    default:
      return 99;
  }
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
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

function SkillMultiFilter({ skills, selectedSkillIds, setSelectedSkillIds }) {
  const toggleSkill = (id) => {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedNames = skills
    .filter((skill) => selectedSkillIds.includes(skill.id))
    .map((skill) => skill.name);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 800, color: "#0f172a" }}>Skills</div>

        {selectedSkillIds.length > 0 ? (
          <button
            type="button"
            onClick={() => setSelectedSkillIds([])}
            style={{
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#0f172a",
              borderRadius: 12,
              padding: "8px 12px",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <X size={14} />
            Clear skills
          </button>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {skills.map((skill) => {
          const active = selectedSkillIds.includes(skill.id);

          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => toggleSkill(skill.id)}
              style={{
                padding: "9px 13px",
                borderRadius: 999,
                border: active ? "1px solid #0f172a" : "1px solid #cbd5e1",
                background: active ? "#0f172a" : "#ffffff",
                color: active ? "#ffffff" : "#0f172a",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {skill.name}
            </button>
          );
        })}
      </div>

      <div style={{ color: "#64748b", fontSize: 14 }}>
        {selectedNames.length === 0
          ? "No skill filters selected."
          : `Selected: ${selectedNames.join(", ")}`}
      </div>
    </div>
  );
}

function WorkerDocumentsPanel({ workerId, documents, onDocumentsChanged }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [documentType, setDocumentType] = useState("resume");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState("");

  const handleUpload = async () => {
    if (!selectedFiles.length) return;

    setUploading(true);
    setError("");

    try {
      const uploadedRows = [];

      for (const file of selectedFiles) {
        const safeName = file.name.replace(/\s+/g, "_");
        const path = `${workerId}/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("worker-documents")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });

        if (uploadError) throw uploadError;

        uploadedRows.push({
          worker_id: workerId,
          file_name: file.name,
          file_path: path,
          file_type: file.type || null,
          file_size: file.size || null,
          document_type: documentType,
        });
      }

      const { error: insertError } = await supabase
        .from("worker_documents")
        .insert(uploadedRows);

      if (insertError) throw insertError;

      setSelectedFiles([]);
      onDocumentsChanged();
    } catch (err) {
      setError(err.message || "Could not upload files.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    setDownloadingId(doc.id);
    setError("");

    try {
      const { data, error } = await supabase.storage
        .from("worker-documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Could not download file.");
    } finally {
      setDownloadingId("");
    }
  };

  const handleDelete = async (doc) => {
    const confirmed = window.confirm(`Delete "${doc.file_name}"?`);
    if (!confirmed) return;

    setError("");

    try {
      const { error: storageError } = await supabase.storage
        .from("worker-documents")
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("worker_documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

      onDocumentsChanged();
    } catch (err) {
      setError(err.message || "Could not delete file.");
    }
  };

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        display: "grid",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: "#0f172a" }}>
        <Paperclip size={16} />
        <span>Documents</span>
      </div>

      <div
        className="document-upload-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 220px auto",
          gap: 12,
        }}
      >
        <input
          type="file"
          multiple
          onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
          style={inputStyle}
        />

        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          style={inputStyle}
        >
          <option value="resume">Resume</option>
          <option value="osha">OSHA Card</option>
          <option value="certification">Certification</option>
          <option value="license">License</option>
          <option value="id">ID</option>
          <option value="other">Other</option>
        </select>

        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0}
          style={{
            border: "none",
            background: uploading || selectedFiles.length === 0 ? "#94a3b8" : "#0f172a",
            color: "#ffffff",
            borderRadius: 14,
            padding: "12px 16px",
            fontWeight: 800,
            cursor: uploading || selectedFiles.length === 0 ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Upload size={16} />
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {selectedFiles.length > 0 ? (
        <div style={{ color: "#475569", fontSize: 14 }}>
          {selectedFiles.length} file(s) selected
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        {documents.length === 0 ? (
          <div style={{ color: "#64748b" }}>No documents uploaded yet.</div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                padding: 14,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontWeight: 800, color: "#0f172a" }}>{doc.file_name}</div>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  Type: {doc.document_type || "other"} • Uploaded: {formatDate(doc.uploaded_at)}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  disabled={downloadingId === doc.id}
                  style={{
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Download size={14} />
                  {downloadingId === doc.id ? "Downloading..." : "Download"}
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  style={{
                    border: "1px solid #fecaca",
                    background: "#ffffff",
                    color: "#b91c1c",
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function WorkerCard({
  worker,
  recruiters,
  onStatusSaved,
  onAvailabilitySaved,
  onRecruiterSaved,
  onRecruiterNotesSaved,
  onDocumentsChanged,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);

  const [recruiterUserId, setRecruiterUserId] = useState(worker.recruiter_user_id || "");
  const [savingRecruiter, setSavingRecruiter] = useState(false);
  const [recruiterError, setRecruiterError] = useState("");

  const [status, setStatus] = useState(worker.status || "pending");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusUpdatedAt, setStatusUpdatedAt] = useState(worker.status_updated_at);

  const [availability, setAvailability] = useState(
    worker.availability || "available_soon"
  );
  const [availableFrom, setAvailableFrom] = useState(worker.available_from || "");
  const [willingToTravel, setWillingToTravel] = useState(
    worker.willing_to_travel ?? true
  );
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  const [recruiterNotes, setRecruiterNotes] = useState(worker.recruiter_notes || "");
  const [notesUpdatedAt, setNotesUpdatedAt] = useState(worker.recruiter_notes_updated_at);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesError, setNotesError] = useState("");

  const skills =
    worker.worker_skills?.map((s) => s.skills?.name).filter(Boolean) || [];

  const certifications =
    worker.worker_certifications?.map((c) => c.certifications?.name).filter(Boolean) || [];

  const languages =
    worker.worker_languages?.map((l) => l.language_name).filter(Boolean) || [];

  const projects = [...(worker.worker_projects || [])].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  );

  const assignedRecruiter = recruiters.find(
    (recruiter) => recruiter.user_id === recruiterUserId
  );

  const saveRecruiterOwner = async (newRecruiterUserId) => {
    setRecruiterUserId(newRecruiterUserId);
    setRecruiterError("");
    setSavingRecruiter(true);

    const { error } = await supabase
      .from("workers")
      .update({
        recruiter_user_id: newRecruiterUserId || null,
      })
      .eq("id", worker.id);

    if (error) {
      setRecruiterError(error.message || "Could not update recruiter owner.");
      setRecruiterUserId(worker.recruiter_user_id || "");
    } else {
      onRecruiterSaved(worker.id, newRecruiterUserId || null);
    }

    setSavingRecruiter(false);
  };

  const saveStatus = async (newStatus) => {
    setStatus(newStatus);
    setStatusError("");
    setSavingStatus(true);

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("workers")
      .update({
        status: newStatus,
        status_updated_at: nowIso,
      })
      .eq("id", worker.id);

    if (error) {
      setStatusError(error.message || "Could not update status.");
      setStatus(worker.status || "pending");
      setAvailability(worker.availability || "available_soon");
      setStatusUpdatedAt(worker.status_updated_at);
    } else {
      setStatusUpdatedAt(nowIso);
      onStatusSaved(worker.id, newStatus, nowIso);

      const updatedAvailability =
        worker.status === "pending" && newStatus !== "pending"
          ? "unavailable"
          : newStatus === "pending"
          ? "available_soon"
          : availability;

      setAvailability(updatedAvailability);

      onAvailabilitySaved(worker.id, {
        availability: updatedAvailability,
        available_from: worker.available_from,
        willing_to_travel: worker.willing_to_travel,
      });
    }

    setSavingStatus(false);
  };

  const saveAvailability = async () => {
    setAvailabilityError("");
    setSavingAvailability(true);

    const { error } = await supabase
      .from("workers")
      .update({
        availability,
        available_from: availableFrom || null,
        willing_to_travel: willingToTravel,
      })
      .eq("id", worker.id);

    if (error) {
      setAvailabilityError(error.message || "Could not update availability.");
    } else {
      onAvailabilitySaved(worker.id, {
        availability,
        available_from: availableFrom || null,
        willing_to_travel: willingToTravel,
      });
    }

    setSavingAvailability(false);
  };

  const saveRecruiterNotes = async () => {
    setNotesError("");
    setSavingNotes(true);

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("workers")
      .update({
        recruiter_notes: recruiterNotes.trim() || null,
        recruiter_notes_updated_at: nowIso,
      })
      .eq("id", worker.id);

    if (error) {
      setNotesError(error.message || "Could not save recruiter notes.");
    } else {
      setNotesUpdatedAt(nowIso);
      onRecruiterNotesSaved(worker.id, recruiterNotes.trim() || null, nowIso);
    }

    setSavingNotes(false);
  };

  const showAvailabilityTag = status === "pending";

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
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a" }}>
              {worker.name}
            </div>

            <button
              type="button"
              title="Open public profile"
              aria-label="Open public profile"
              onClick={() => {
                if (!worker.public_profile_slug) {
                  alert("This worker does not have a public profile slug yet.");
                  return;
                }
                window.open(`/profile/${worker.public_profile_slug}`, "_blank");
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
              }}
            >
              <ExternalLink size={17} />
            </button>
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

            <span style={pillStyle()}>
              <UserCheck size={14} />
              {assignedRecruiter?.full_name || "Unassigned recruiter"}
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "7px 11px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 800,
                ...getStatusStyle(status),
              }}
            >
              {formatStatus(status)}
            </span>

            {showAvailabilityTag ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "7px 11px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 800,
                  ...getAvailabilityStyle(availability),
                }}
              >
                {formatAvailability(availability)}
              </span>
            ) : null}
          </div>

          <div
            className="worker-meta"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
              marginTop: 4,
            }}
          >
            <MiniMetric label="Total Experience" value={`${worker.total_experience_years || 0} yrs`} />
            <MiniMetric label="Industrial" value={`${worker.industrial_experience_years || 0} yrs`} />
            <MiniMetric label="Commercial" value={`${worker.commercial_experience_years || 0} yrs`} />
            <MiniMetric label="Residential" value={`${worker.residential_experience_years || 0} yrs`} />
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

          <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 14 }}>
              Recruiter Owner
            </div>

            <select
              value={recruiterUserId}
              onChange={(e) => saveRecruiterOwner(e.target.value)}
              disabled={savingRecruiter}
              style={{
                ...inputStyle,
                padding: "10px 12px",
                background: savingRecruiter ? "#f8fafc" : "#ffffff",
                cursor: savingRecruiter ? "not-allowed" : "pointer",
              }}
            >
              <option value="">Unassigned</option>
              {recruiters.map((recruiter) => (
                <option key={recruiter.user_id} value={recruiter.user_id}>
                  {recruiter.full_name || recruiter.email || recruiter.user_id}
                </option>
              ))}
            </select>

            {savingRecruiter ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#475569",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <Loader2 size={14} className="spin" />
                Saving recruiter...
              </div>
            ) : null}

            {recruiterError ? (
              <div
                style={{
                  color: "#b91c1c",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {recruiterError}
              </div>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 14 }}>
              Status
            </div>

            <select
              value={status}
              onChange={(e) => saveStatus(e.target.value)}
              disabled={savingStatus}
              style={{
                ...inputStyle,
                padding: "10px 12px",
                background: savingStatus ? "#f8fafc" : "#ffffff",
                cursor: savingStatus ? "not-allowed" : "pointer",
              }}
            >
              <option value="pending">Pending</option>
              <option value="onboarding">OnBoarding</option>
              <option value="hold">Hold</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
              <option value="working">Working</option>
            </select>

            {savingStatus ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#475569",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <Loader2 size={14} className="spin" />
                Saving status...
              </div>
            ) : null}

            {statusError ? (
              <div
                style={{
                  color: "#b91c1c",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {statusError}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setDetailsOpen((prev) => !prev)}
            style={{
              border: detailsOpen ? "none" : "1px solid #cbd5e1",
              background: detailsOpen ? "#0f172a" : "#ffffff",
              color: detailsOpen ? "#ffffff" : "#0f172a",
              borderRadius: 14,
              padding: "12px 16px",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 4,
            }}
          >
            {detailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {detailsOpen ? "Hide Details" : "View Details"}
          </button>
        </div>
      </div>

      <div
        className="worker-dates"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
        }}
      >
        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <CalendarDays size={16} color="#334155" />
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Registered</div>
            <div style={{ fontWeight: 800, color: "#0f172a" }}>{formatDate(worker.created_at)}</div>
          </div>
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <CalendarDays size={16} color="#334155" />
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Status Updated</div>
            <div style={{ fontWeight: 800, color: "#0f172a" }}>{formatDate(statusUpdatedAt)}</div>
          </div>
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 16,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <FileText size={16} color="#334155" />
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>Notes Updated</div>
            <div style={{ fontWeight: 800, color: "#0f172a" }}>{formatDate(notesUpdatedAt)}</div>
          </div>
        </div>
      </div>

      {detailsOpen ? (
        <>
          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 800, color: "#0f172a" }}>Pending Pool Availability</div>

            <div
              className="availability-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
              }}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontWeight: 700, fontSize: 14 }}>Availability</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  style={inputStyle}
                  disabled={status !== "pending"}
                >
                  <option value="available_soon">Available</option>
                  <option value="on_project">On Project</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontWeight: 700, fontSize: 14 }}>Available From</label>
                <input
                  type="date"
                  value={availableFrom || ""}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                  style={inputStyle}
                  disabled={status !== "pending"}
                />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontWeight: 700, fontSize: 14 }}>Travel</label>
                <button
                  type="button"
                  onClick={() => {
                    if (status !== "pending") return;
                    setWillingToTravel((prev) => !prev);
                  }}
                  disabled={status !== "pending"}
                  style={{
                    ...inputStyle,
                    cursor: status !== "pending" ? "not-allowed" : "pointer",
                    textAlign: "left",
                    background:
                      status !== "pending"
                        ? "#f8fafc"
                        : willingToTravel
                        ? "#dcfce7"
                        : "#fee2e2",
                    color:
                      status !== "pending"
                        ? "#94a3b8"
                        : willingToTravel
                        ? "#166534"
                        : "#991b1b",
                    border:
                      status !== "pending"
                        ? "1px solid #e2e8f0"
                        : willingToTravel
                        ? "1px solid #86efac"
                        : "1px solid #fca5a5",
                  }}
                >
                  {status !== "pending"
                    ? "Availability controlled only for Pending"
                    : willingToTravel
                    ? "Willing to Travel"
                    : "Not Willing to Travel"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={saveAvailability}
                disabled={savingAvailability || status !== "pending"}
                style={{
                  border: "none",
                  background:
                    savingAvailability || status !== "pending" ? "#94a3b8" : "#0f172a",
                  color: "#ffffff",
                  borderRadius: 14,
                  padding: "12px 16px",
                  fontWeight: 800,
                  cursor:
                    savingAvailability || status !== "pending" ? "not-allowed" : "pointer",
                }}
              >
                {savingAvailability ? "Saving..." : "Save Availability"}
              </button>

              {status !== "pending" ? (
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                    fontWeight: 700,
                    alignSelf: "center",
                  }}
                >
                  Availability only applies to workers in Pending.
                </div>
              ) : null}

              {availabilityError ? (
                <div
                  style={{
                    color: "#b91c1c",
                    fontSize: 13,
                    fontWeight: 700,
                    alignSelf: "center",
                  }}
                >
                  {availabilityError}
                </div>
              ) : null}
            </div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: "#0f172a" }}>
              <FileText size={16} />
              <span>Recruiter / Admin Notes</span>
            </div>

            <textarea
              value={recruiterNotes}
              onChange={(e) => setRecruiterNotes(e.target.value)}
              placeholder="Internal notes about communication, readiness, interview impression, pay expectations, travel flexibility, etc."
              style={textareaStyle}
            />

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={saveRecruiterNotes}
                disabled={savingNotes}
                style={{
                  border: "none",
                  background: savingNotes ? "#94a3b8" : "#0f172a",
                  color: "#ffffff",
                  borderRadius: 14,
                  padding: "12px 16px",
                  fontWeight: 800,
                  cursor: savingNotes ? "not-allowed" : "pointer",
                }}
              >
                {savingNotes ? "Saving..." : "Save Notes"}
              </button>

              {notesError ? (
                <div
                  style={{
                    color: "#b91c1c",
                    fontSize: 13,
                    fontWeight: 700,
                    alignSelf: "center",
                  }}
                >
                  {notesError}
                </div>
              ) : null}
            </div>
          </div>

          <WorkerDocumentsPanel
            workerId={worker.id}
            documents={worker.worker_documents || []}
            onDocumentsChanged={onDocumentsChanged}
          />

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
            className="worker-notes"
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

          <div
            className="worker-actions"
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setProjectsOpen(!projectsOpen)}
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
              {projectsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {projectsOpen ? "Hide Projects" : `Projects (${projects.length})`}
            </button>
          </div>

          {projectsOpen ? (
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
        </>
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
  const [statusFilter, setStatusFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState([]);
  const [sortBy, setSortBy] = useState("status_priority");
  const [trades, setTrades] = useState([]);
  const [locations, setLocations] = useState([]);
  const [skills, setSkills] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [recruiterFilter, setRecruiterFilter] = useState("");

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
          worker_skills(skills(id, name)),
          worker_certifications(certifications(name)),
          worker_documents(*)
        `);

      const tradesData = await supabase.from("trades").select("*").order("name");
      const locationsData = await supabase.from("locations").select("*").order("name");
      const skillsData = await supabase.from("skills").select("*").order("name");
      const recruitersData = await supabase
        .from("recruiters")
        .select("id, user_id, full_name, email, is_active")
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (!error) setWorkers(data || []);
      setTrades(tradesData.data || []);
      setLocations(locationsData.data || []);
      setSkills(skillsData.data || []);
      setRecruiters(recruitersData.data || []);
      setLoading(false);
    };

    load();
  }, []);

  const reloadWorkerDocuments = async (workerId) => {
    const { data, error } = await supabase
      .from("worker_documents")
      .select("*")
      .eq("worker_id", workerId)
      .order("uploaded_at", { ascending: false });

    if (!error) {
      setWorkers((prev) =>
        prev.map((worker) =>
          worker.id === workerId
            ? { ...worker, worker_documents: data || [] }
            : worker
        )
      );
    }
  };

  const handleStatusSaved = (workerId, newStatus, statusUpdatedAt) => {
    setWorkers((prev) =>
      prev.map((worker) =>
        worker.id === workerId
          ? { ...worker, status: newStatus, status_updated_at: statusUpdatedAt }
          : worker
      )
    );
  };

  const handleAvailabilitySaved = (workerId, payload) => {
    setWorkers((prev) =>
      prev.map((worker) =>
        worker.id === workerId
          ? {
              ...worker,
              availability: payload.availability,
              available_from: payload.available_from,
              willing_to_travel: payload.willing_to_travel,
            }
          : worker
      )
    );
  };

  const handleRecruiterSaved = (workerId, recruiterUserId) => {
    setWorkers((prev) =>
      prev.map((worker) =>
        worker.id === workerId
          ? {
              ...worker,
              recruiter_user_id: recruiterUserId,
            }
          : worker
      )
    );
  };

  const handleRecruiterNotesSaved = (workerId, notes, notesUpdatedAt) => {
    setWorkers((prev) =>
      prev.map((worker) =>
        worker.id === workerId
          ? {
              ...worker,
              recruiter_notes: notes,
              recruiter_notes_updated_at: notesUpdatedAt,
            }
          : worker
      )
    );
  };

  const filtered = useMemo(() => {
    const base = workers.filter((w) => {
      const term = search.toLowerCase().trim();

      const matchSearch =
        !term ||
        w.name?.toLowerCase().includes(term) ||
        w.email?.toLowerCase().includes(term) ||
        w.phone?.toLowerCase().includes(term) ||
        w.recruiter_notes?.toLowerCase().includes(term);

      const matchTrade = !tradeFilter || w.trade_id === tradeFilter;
      const matchLocation = !locationFilter || w.location_id === locationFilter;
      const matchStatus = !statusFilter || w.status === statusFilter;
      const matchRecruiter =
        !recruiterFilter ||
        (recruiterFilter === "unassigned"
          ? !w.recruiter_user_id
          : w.recruiter_user_id === recruiterFilter);

      const matchAvailability =
        !availabilityFilter ||
        (w.status === "pending" && w.availability === availabilityFilter);

      const workerSkillIds =
        w.worker_skills?.map((s) => s.skills?.id).filter(Boolean) || [];

      const matchSkills =
        selectedSkillIds.length === 0 ||
        selectedSkillIds.some((skillId) => workerSkillIds.includes(skillId));

      return (
        matchSearch &&
        matchTrade &&
        matchLocation &&
        matchStatus &&
        matchRecruiter &&
        matchAvailability &&
        matchSkills
      );
    });

    const sorted = [...base].sort((a, b) => {
      if (sortBy === "newest_registered") {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }

      if (sortBy === "oldest_registered") {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }

      const statusDiff = statusPriority(a.status) - statusPriority(b.status);
      if (statusDiff !== 0) return statusDiff;

      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return sorted;
  }, [
    workers,
    search,
    tradeFilter,
    locationFilter,
    statusFilter,
    availabilityFilter,
    recruiterFilter,
    selectedSkillIds,
    sortBy,
  ]);

  const totalProjects = workers.reduce(
    (acc, worker) => acc + (worker.worker_projects?.length || 0),
    0
  );

  const pendingCount = workers.filter((w) => w.status === "pending").length;
  const onboardingCount = workers.filter((w) => w.status === "onboarding").length;
  const holdCount = workers.filter((w) => w.status === "hold").length;
  const rejectedCount = workers.filter((w) => w.status === "rejected").length;
  const completedCount = workers.filter((w) => w.status === "completed").length;
  const workingCount = workers.filter((w) => w.status === "working").length;

  const poolCount = pendingCount;
  const availableCount = workers.filter(
    (w) => w.status === "pending" && w.availability === "available_soon"
  ).length;
  const onProjectCount = workers.filter(
    (w) => w.status === "pending" && w.availability === "on_project"
  ).length;
  const unavailableCount = workers.filter(
    (w) => w.status === "pending" && w.availability === "unavailable"
  ).length;

  return (
    <>
      <PageStyles />
<UtsTopNavBar />
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
                  Admin Panel
                </h1>

                <p style={{ margin: 0, color: "#475569", fontSize: 18, lineHeight: 1.7 }}>
                  Review, search, filter, sort, and manage both workflow status and pending-pool availability.
                </p>
              </div>
            </div>

            <div
              className="stats-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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
              <StatCard
                icon={<ShieldCheck size={18} />}
                label="Pool"
                value={poolCount}
              />
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontWeight: 800, color: "#0f172a" }}>Workflow Status</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span style={{ ...pillStyle(), ...getStatusStyle("pending") }}>
                  Pending: {pendingCount}
                </span>
                <span style={{ ...pillStyle(), ...getStatusStyle("onboarding") }}>
                  OnBoarding: {onboardingCount}
                </span>
                <span style={{ ...pillStyle(), ...getStatusStyle("hold") }}>
                  Hold: {holdCount}
                </span>
                <span style={{ ...pillStyle(), ...getStatusStyle("rejected") }}>
                  Rejected: {rejectedCount}
                </span>
                <span style={{ ...pillStyle(), ...getStatusStyle("completed") }}>
                  Completed: {completedCount}
                </span>
                <span style={{ ...pillStyle(), ...getStatusStyle("working") }}>
                  Working: {workingCount}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontWeight: 800, color: "#0f172a" }}>Pending Pool Availability</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span
                  style={{
                    ...pillStyle(),
                    background: "#dcfce7",
                    color: "#166534",
                    border: "1px solid #86efac",
                  }}
                >
                  Pool: {poolCount}
                </span>
                <span style={{ ...pillStyle(), ...getAvailabilityStyle("available_soon") }}>
                  Available: {availableCount}
                </span>
                <span style={{ ...pillStyle(), ...getAvailabilityStyle("on_project") }}>
                  On Project: {onProjectCount}
                </span>
                <span style={{ ...pillStyle(), ...getAvailabilityStyle("unavailable") }}>
                  Unavailable: {unavailableCount}
                </span>
              </div>
            </div>

            <div
              style={{
                background: "#f8fbff",
                border: "1px solid #dbeafe",
                borderRadius: 24,
                padding: 18,
                display: "grid",
                gap: 18,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 18 }}>Filters & Sorting</div>

              <div
                className="filters-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr repeat(6, minmax(0, 1fr))",
                  gap: 14,
                }}
              >
                <input
                  placeholder="Search by name, email, phone or notes"
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

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="onboarding">OnBoarding</option>
                  <option value="hold">Hold</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                  <option value="working">Working</option>
                </select>

                <select
                  value={recruiterFilter}
                  onChange={(e) => setRecruiterFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">All Recruiters</option>
                  <option value="unassigned">Unassigned</option>
                  {recruiters.map((recruiter) => (
                    <option key={recruiter.user_id} value={recruiter.user_id}>
                      {recruiter.full_name || recruiter.email || recruiter.user_id}
                    </option>
                  ))}
                </select>

                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">All Pool Availability</option>
                  <option value="available_soon">Available</option>
                  <option value="on_project">On Project</option>
                  <option value="unavailable">Unavailable</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={inputStyle}
                >
                  <option value="status_priority">Sort: Status Priority</option>
                  <option value="newest_registered">Sort: Newest Registered</option>
                  <option value="oldest_registered">Sort: Oldest Registered</option>
                </select>
              </div>

              <SkillMultiFilter
                skills={skills}
                selectedSkillIds={selectedSkillIds}
                setSelectedSkillIds={setSelectedSkillIds}
              />
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
                filtered.map((w) => (
                  <WorkerCard
                    key={w.id}
                    worker={w}
                    recruiters={recruiters}
                    onStatusSaved={handleStatusSaved}
                    onAvailabilitySaved={handleAvailabilitySaved}
                    onRecruiterSaved={handleRecruiterSaved}
                    onRecruiterNotesSaved={handleRecruiterNotesSaved}
                    onDocumentsChanged={() => reloadWorkerDocuments(w.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <GoToTopButton showAfter={600} />
    </>
  );
}