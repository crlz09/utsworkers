import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { supabase } from "../lib/supabase";
import UtsTopNavBar from "../components/UtsTopNavBar";
import GoToTopButton from "../components/GoToTopButton";

export default function InterviewsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState("all");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const load = async () => {
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

    load();
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
      `}</style>
    );
  }

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
              onClick={() => window.open("/interviews/new", "_blank", "noopener,noreferrer")}
              style={{
                border: "none",
                background: "#0f172a",
                color: "#ffffff",
                borderRadius: 14,
                padding: "12px 16px",
                fontWeight: 900,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginLeft: "auto",
              }}
            >
              <ClipboardList size={16} />
              New Interview
            </button>
          </div>

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
                        {row.interview_date || "No date"} •{" "}
                        {row.email || "No email"} • {row.phone || "No phone"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 28, fontWeight: 900 }}>
                        {row.total_score}
                      </div>
                      <div style={{ color: "#334155", fontWeight: 700 }}>
                        {row.classification}
                      </div>
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === row.id ? null : row.id)
                        }
                        style={{
                          marginTop: 10,
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                          borderRadius: 12,
                          padding: "8px 12px",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {expandedId === row.id ? "Hide details" : "View details"}
                      </button>
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
                                <div
                                  style={{
                                    fontWeight: 900,
                                    marginBottom: 10,
                                  }}
                                >
                                  {section.sectionTitle}
                                </div>

                                <div style={{ display: "grid", gap: 10 }}>
                                  {section.questions?.map((q, qIdx) => (
                                    <div
                                      key={`${row.id}-${idx}-${qIdx}`}
                                      style={{
                                        borderTop: qIdx
                                          ? "1px solid #e2e8f0"
                                          : "none",
                                        paddingTop: qIdx ? 10 : 0,
                                      }}
                                    >
                                      <div style={{ fontWeight: 700 }}>
                                        {q.questionPrompt}
                                      </div>
                                      <div
                                        style={{
                                          marginTop: 4,
                                          color: "#334155",
                                        }}
                                      >
                                        <strong>Answer:</strong>{" "}
                                        {q.selectedOption}
                                      </div>
                                      {q.isOther && q.otherText ? (
                                        <div
                                          style={{
                                            marginTop: 4,
                                            color: "#334155",
                                            whiteSpace: "pre-wrap",
                                          }}
                                        >
                                          <strong>Other text:</strong>{" "}
                                          {q.otherText}
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

      <GoToTopButton showAfter={600} />
    </>
  );
}