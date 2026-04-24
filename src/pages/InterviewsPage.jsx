import React, { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Loader2,
  UserPlus,
  X,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import UtsTopNavBar from "../components/UtsTopNavBar";
import GoToTopButton from "../components/GoToTopButton";

const initialWorkerForm = {
  trade_id: "",
  location_id: "",
  total_experience_years: "0",
  commercial_experience_years: "0",
  industrial_experience_years: "0",
  residential_experience_years: "0",
  strengths: "",
  needs_improvement: "",
  available_from: "",
  willing_to_travel: true,
  recruiter_notes: "",
};

function buildInitialWorkerForm(interview) {
  return {
    ...initialWorkerForm,
    strengths: interview?.final_summary || interview?.quick_notes || "",
    recruiter_notes: interview ? buildWorkerNotesFromInterview(interview) : "",
  };
}

function PageStyles() {
  return (
    <style>{`
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }

      * {
        box-sizing: border-box;
      }

      input,
      select,
      textarea,
      button {
        font: inherit;
      }

      .spin {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.56);
        z-index: 80;
        display: grid;
        place-items: center;
        padding: 20px;
      }

      .modal-card {
        width: min(980px, 100%);
        max-height: 90vh;
        overflow: auto;
        background: #ffffff;
        border: 1px solid #dbeafe;
        border-radius: 24px;
        box-shadow: 0 30px 80px rgba(15, 23, 42, 0.22);
        padding: 24px;
      }

      .modal-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-top: 18px;
      }

      .modal-field {
        display: grid;
        gap: 8px;
      }

      .modal-field.span-2 {
        grid-column: span 2;
      }

      .modal-label {
        font-size: 13px;
        font-weight: 900;
        color: #334155;
      }

      .modal-input,
      .modal-select,
      .modal-textarea {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        padding: 12px 14px;
        background: #ffffff;
        color: #0f172a;
        outline: none;
      }

      .modal-textarea {
        min-height: 110px;
        resize: vertical;
        line-height: 1.5;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        padding: 7px 11px;
        font-size: 12px;
        font-weight: 900;
      }

      .pill.green {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #86efac;
      }

      .pill.blue {
        background: #dbeafe;
        color: #1d4ed8;
        border: 1px solid #93c5fd;
      }

      .pill.gray {
        background: #f1f5f9;
        color: #475569;
        border: 1px solid #cbd5e1;
      }

      .action-button {
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #0f172a;
        border-radius: 12px;
        padding: 9px 12px;
        font-weight: 900;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .action-button.dark {
        border: none;
        background: #0f172a;
        color: #ffffff;
      }

      .action-button.green {
        border: none;
        background: #16a34a;
        color: #ffffff;
      }

      .action-button:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      @media (max-width: 760px) {
        .modal-grid {
          grid-template-columns: 1fr;
        }

        .modal-field.span-2 {
          grid-column: span 1;
        }
      }
    `}</style>
  );
}

function buildWorkerNotesFromInterview(interview) {
  const languageList = [
    interview.speaks_spanish ? "Spanish" : null,
    interview.speaks_english ? "English" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    `Converted from interview #${interview.interview_number || "N/A"}`,
    interview.interview_date ? `Interview date: ${interview.interview_date}` : null,
    interview.position ? `Interview position: ${interview.position}` : null,
    languageList ? `Languages from interview: ${languageList}` : null,
    interview.quick_notes ? `\nQuick notes:\n${interview.quick_notes}` : null,
    interview.final_summary ? `\nFinal summary:\n${interview.final_summary}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function WorkerConversionModal({
  interview,
  open,
  onClose,
  trades,
  locations,
  onCreateWorker,
  saving,
  error,
}) {
  const [form, setForm] = useState(() => buildInitialWorkerForm(interview));

  if (!open || !interview) return null;

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const languages = [
    interview.speaks_english ? "English" : null,
    interview.speaks_spanish ? "Spanish" : null,
  ].filter(Boolean);

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>
              Create Worker from Interview
            </h2>
            <p style={{ margin: "8px 0 0 0", color: "#475569", lineHeight: 1.55 }}>
              This will create a new worker profile and link it back to this interview.
            </p>
          </div>

          <button className="action-button" type="button" onClick={onClose}>
            <X size={16} />
            Close
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 18,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 20 }}>
            {interview.candidate_name || "Unnamed candidate"}
          </div>
          <div style={{ color: "#475569" }}>
            {interview.phone || "No phone"} • {interview.email || "No email"}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="pill blue">{interview.classification || "No classification"}</span>
            {languages.length ? (
              <span className="pill gray">{languages.join(" / ")}</span>
            ) : null}
          </div>
        </div>

        <div className="modal-grid">
          <div className="modal-field">
            <label className="modal-label">Trade / Class *</label>
            <select
              className="modal-select"
              value={form.trade_id}
              onChange={(e) => update("trade_id", e.target.value)}
            >
              <option value="">Select trade</option>
              {trades.map((trade) => (
                <option key={trade.id} value={trade.id}>
                  {trade.name}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-field">
            <label className="modal-label">Location *</label>
            <select
              className="modal-select"
              value={form.location_id}
              onChange={(e) => update("location_id", e.target.value)}
            >
              <option value="">Select location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-field">
            <label className="modal-label">Total Experience Years</label>
            <input
              className="modal-input"
              type="number"
              min="0"
              step="0.5"
              value={form.total_experience_years}
              onChange={(e) => update("total_experience_years", e.target.value)}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">Commercial Experience Years</label>
            <input
              className="modal-input"
              type="number"
              min="0"
              step="0.5"
              value={form.commercial_experience_years}
              onChange={(e) => update("commercial_experience_years", e.target.value)}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">Industrial Experience Years</label>
            <input
              className="modal-input"
              type="number"
              min="0"
              step="0.5"
              value={form.industrial_experience_years}
              onChange={(e) => update("industrial_experience_years", e.target.value)}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">Residential Experience Years</label>
            <input
              className="modal-input"
              type="number"
              min="0"
              step="0.5"
              value={form.residential_experience_years}
              onChange={(e) => update("residential_experience_years", e.target.value)}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">Available From</label>
            <input
              className="modal-input"
              type="date"
              value={form.available_from}
              onChange={(e) => update("available_from", e.target.value)}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">Willing To Travel</label>
            <select
              className="modal-select"
              value={form.willing_to_travel ? "yes" : "no"}
              onChange={(e) => update("willing_to_travel", e.target.value === "yes")}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div className="modal-field span-2">
            <label className="modal-label">Strengths</label>
            <textarea
              className="modal-textarea"
              value={form.strengths}
              onChange={(e) => update("strengths", e.target.value)}
              placeholder="Strengths extracted from the interview..."
            />
          </div>

          <div className="modal-field span-2">
            <label className="modal-label">Needs Improvement</label>
            <textarea
              className="modal-textarea"
              value={form.needs_improvement}
              onChange={(e) => update("needs_improvement", e.target.value)}
              placeholder="Areas to validate or improve..."
            />
          </div>

          <div className="modal-field span-2">
            <label className="modal-label">Recruiter / Admin Notes</label>
            <textarea
              className="modal-textarea"
              value={form.recruiter_notes}
              onChange={(e) => update("recruiter_notes", e.target.value)}
              placeholder="Internal notes to store in worker profile..."
            />
          </div>
        </div>

        {error ? (
          <div style={{ marginTop: 16, color: "#991b1b", fontWeight: 800 }}>
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 20,
            flexWrap: "wrap",
          }}
        >
          <button className="action-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="action-button green"
            type="button"
            disabled={saving}
            onClick={() => onCreateWorker(form)}
          >
            {saving ? <Loader2 className="spin" size={16} /> : <UserPlus size={16} />}
            Create Worker
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InterviewsPage() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState("all");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const [trades, setTrades] = useState([]);
  const [locations, setLocations] = useState([]);
  const [catalogsLoading, setCatalogsLoading] = useState(false);

  const [conversionInterview, setConversionInterview] = useState(null);
  const [conversionSaving, setConversionSaving] = useState(false);
  const [conversionError, setConversionError] = useState("");
  const [pageMessage, setPageMessage] = useState({ type: "", text: "" });

  const loadInterviews = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("candidate_interviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRows(data);
    }

    setLoading(false);
  };

  const loadCatalogs = async () => {
    setCatalogsLoading(true);

    const [tradesRes, locationsRes] = await Promise.all([
      supabase.from("trades").select("id, name").order("name"),
      supabase.from("locations").select("id, name").order("name"),
    ]);

    if (!tradesRes.error) setTrades(tradesRes.data || []);
    if (!locationsRes.error) setLocations(locationsRes.data || []);

    setCatalogsLoading(false);
  };

  useEffect(() => {
    loadInterviews();
    loadCatalogs();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesQuery =
        !query ||
        row.candidate_name?.toLowerCase().includes(query.toLowerCase()) ||
        row.position?.toLowerCase().includes(query.toLowerCase()) ||
        row.email?.toLowerCase().includes(query.toLowerCase()) ||
        row.phone?.toLowerCase().includes(query.toLowerCase());

      const matchesClassification =
        classification === "all" || row.classification === classification;

      return matchesQuery && matchesClassification;
    });
  }, [rows, query, classification]);

  const openConversionModal = async (interview) => {
    setConversionError("");
    setPageMessage({ type: "", text: "" });

    if (!trades.length || !locations.length) {
      await loadCatalogs();
    }

    setConversionInterview(interview);
  };

  const createWorkerFromInterview = async (form) => {
    if (!conversionInterview) return;

    setConversionError("");
    setPageMessage({ type: "", text: "" });

    if (!form.trade_id || !form.location_id) {
      setConversionError("Please select Trade / Class and Location before creating the worker.");
      return;
    }

    setConversionSaving(true);

    try {
      const languages = [
        conversionInterview.speaks_english ? "English" : null,
        conversionInterview.speaks_spanish ? "Spanish" : null,
      ].filter(Boolean);

      const { data: workerId, error: workerError } = await supabase.rpc(
        "register_worker_public",
        {
          p_name: conversionInterview.candidate_name?.trim() || "Unnamed Candidate",
          p_phone: conversionInterview.phone?.trim() || null,
          p_email: conversionInterview.email?.trim() || null,
          p_location_id: form.location_id,
          p_trade_id: form.trade_id,
          p_total_experience_years: Number(form.total_experience_years || 0),
          p_commercial_experience_years: Number(
            form.commercial_experience_years || 0
          ),
          p_industrial_experience_years: Number(
            form.industrial_experience_years || 0
          ),
          p_residential_experience_years: Number(
            form.residential_experience_years || 0
          ),
          p_strengths: form.strengths?.trim() || null,
          p_needs_improvement: form.needs_improvement?.trim() || null,
          p_available_from: form.available_from || null,
          p_willing_to_travel: !!form.willing_to_travel,
          p_languages: languages,
          p_skill_ids: [],
          p_certification_ids: [],
          p_projects: [],
        }
      );

      if (workerError) throw workerError;

      const nowIso = new Date().toISOString();

      const { error: workerUpdateError } = await supabase
        .from("workers")
        .update({
          recruiter_notes: form.recruiter_notes?.trim() || null,
          recruiter_notes_updated_at: nowIso,
        })
        .eq("id", workerId);

      if (workerUpdateError) throw workerUpdateError;

      const { error: interviewUpdateError } = await supabase
        .from("candidate_interviews")
        .update({ worker_id: workerId })
        .eq("id", conversionInterview.id);

      if (interviewUpdateError) throw interviewUpdateError;

      setRows((prev) =>
        prev.map((row) =>
          row.id === conversionInterview.id ? { ...row, worker_id: workerId } : row
        )
      );

      setPageMessage({
        type: "success",
        text: "Worker created and linked to the interview successfully.",
      });
      setConversionInterview(null);
    } catch (err) {
      setConversionError(
        err.message || "Could not create worker from this interview."
      );
    } finally {
      setConversionSaving(false);
    }
  };

  return (
    <>
      <PageStyles />
      <UtsTopNavBar />

      <div
        style={{
          padding: 24,
          fontFamily: "Inter, sans-serif",
          background: "#f8fafc",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gap: 20,
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 20,
              padding: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>
                Interview History
              </h1>
              <p style={{ margin: "10px 0 0 0", color: "#475569" }}>
                Saved interviews from the standalone interview module.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                window.open("/interviews/new", "_blank", "noopener,noreferrer")
              }
              className="action-button dark"
              style={{ marginLeft: "auto" }}
            >
              <ClipboardList size={16} />
              New Interview
            </button>
          </div>

          {pageMessage.text ? (
            <div
              style={{
                background: pageMessage.type === "success" ? "#dcfce7" : "#fee2e2",
                border:
                  pageMessage.type === "success"
                    ? "1px solid #86efac"
                    : "1px solid #fca5a5",
                color: pageMessage.type === "success" ? "#166534" : "#991b1b",
                borderRadius: 16,
                padding: 14,
                fontWeight: 900,
              }}
            >
              {pageMessage.text}
            </div>
          ) : null}

          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 20,
              padding: 20,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: 12,
              }}
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, position, email or phone"
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontSize: 14,
                }}
              />

              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontSize: 14,
                  background: "#fff",
                }}
              >
                <option value="all">All classifications</option>
                <option value="Apprentice">Apprentice</option>
                <option value="Top Helper">Top Helper</option>
                <option value="JM">JM</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {loading ? (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 20,
                  padding: 20,
                }}
              >
                Loading...
              </div>
            ) : filteredRows.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 20,
                  padding: 20,
                }}
              >
                No interviews found.
              </div>
            ) : (
              filteredRows.map((row) => (
                <div
                  key={row.id}
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 20,
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900 }}>
                        {row.candidate_name || "Unnamed candidate"}
                      </div>
                      <div style={{ marginTop: 6, color: "#475569" }}>
                        {row.position || "No position"} • #{row.interview_number}
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          color: "#64748b",
                          fontSize: 14,
                        }}
                      >
                        {row.interview_date || "No date"} • {row.email || "No email"} •{" "}
                        {row.phone || "No phone"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", display: "grid", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 28, fontWeight: 900 }}>
                          {row.total_score}
                        </div>
                        <div style={{ color: "#334155", fontWeight: 700 }}>
                          {row.classification}
                        </div>
                      </div>

                      {row.worker_id ? (
                        <span className="pill green" style={{ justifySelf: "end" }}>
                          <CheckCircle2 size={14} />
                          Worker linked
                        </span>
                      ) : null}

                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        {!row.worker_id ? (
                          <button
                            type="button"
                            className="action-button green"
                            onClick={() => openConversionModal(row)}
                            disabled={catalogsLoading}
                          >
                            {catalogsLoading ? (
                              <Loader2 className="spin" size={14} />
                            ) : (
                              <UserPlus size={14} />
                            )}
                            Create Worker
                          </button>
                        ) : null}

                        <button
                          onClick={() =>
                            setExpandedId(expandedId === row.id ? null : row.id)
                          }
                          className="action-button"
                        >
                          {expandedId === row.id ? "Hide details" : "View details"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {expandedId === row.id && (
                    <div
                      style={{
                        marginTop: 18,
                        paddingTop: 18,
                        borderTop: "1px solid #e2e8f0",
                        display: "grid",
                        gap: 14,
                      }}
                    >
                      <div>
                        <strong>Languages:</strong>{" "}
                        {[
                          row.speaks_spanish ? "Spanish" : null,
                          row.speaks_english ? "English" : null,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </div>

                      {row.worker_id ? (
                        <div>
                          <strong>Worker ID:</strong> {row.worker_id}
                        </div>
                      ) : null}

                      {row.quick_notes && (
                        <div>
                          <strong>Quick notes:</strong>
                          <div
                            style={{
                              marginTop: 6,
                              color: "#334155",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {row.quick_notes}
                          </div>
                        </div>
                      )}

                      {row.final_summary && (
                        <div>
                          <strong>Final summary:</strong>
                          <div
                            style={{
                              marginTop: 6,
                              color: "#334155",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {row.final_summary}
                          </div>
                        </div>
                      )}

                      {Array.isArray(row.answers_snapshot) &&
                        row.answers_snapshot.length > 0 && (
                          <div style={{ display: "grid", gap: 12 }}>
                            {row.answers_snapshot.map((section, idx) => (
                              <div
                                key={`${row.id}-${idx}`}
                                style={{
                                  border: "1px solid #e2e8f0",
                                  borderRadius: 14,
                                  padding: 14,
                                  background: "#f8fafc",
                                }}
                              >
                                <div style={{ fontWeight: 900, marginBottom: 10 }}>
                                  {section.sectionTitle}
                                </div>

                                <div style={{ display: "grid", gap: 10 }}>
                                  {section.questions?.map((q, qIdx) => (
                                    <div
                                      key={`${row.id}-${idx}-${qIdx}`}
                                      style={{
                                        borderTop: qIdx ? "1px solid #e2e8f0" : "none",
                                        paddingTop: qIdx ? 10 : 0,
                                      }}
                                    >
                                      <div style={{ fontWeight: 700 }}>
                                        {q.questionPrompt}
                                      </div>
                                      <div style={{ marginTop: 4, color: "#334155" }}>
                                        <strong>Answer:</strong> {q.selectedOption}
                                      </div>
                                      {q.isOther && q.otherText ? (
                                        <div
                                          style={{
                                            marginTop: 4,
                                            color: "#334155",
                                            whiteSpace: "pre-wrap",
                                          }}
                                        >
                                          <strong>Other text:</strong> {q.otherText}
                                        </div>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <WorkerConversionModal
        key={conversionInterview?.id || "conversion-closed"}
        interview={conversionInterview}
        open={!!conversionInterview}
        onClose={() => setConversionInterview(null)}
        trades={trades}
        locations={locations}
        onCreateWorker={createWorkerFromInterview}
        saving={conversionSaving}
        error={conversionError}
      />

      <GoToTopButton showAfter={600} />
    </>
  );
}
