import React, { useEffect, useState } from "react";
import {
  getWorkerInterviews,
  linkInterviewToWorker,
  searchUnlinkedInterviews,
  unlinkInterviewFromWorker,
} from "../lib/interviewService";

export default function WorkerInterviewSection({ worker }) {
  const [linkedInterviews, setLinkedInterviews] = useState([]);
  const [availableInterviews, setAvailableInterviews] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingLinked, setLoadingLinked] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [message, setMessage] = useState("");

  const workerId = worker?.id;

  useEffect(() => {
    const loadLinked = async () => {
      if (!workerId) {
        setLinkedInterviews([]);
        setLoadingLinked(false);
        return;
      }

      setLoadingLinked(true);
      try {
        const data = await getWorkerInterviews(workerId);
        setLinkedInterviews(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingLinked(false);
      }
    };

    void Promise.resolve().then(loadLinked);
  }, [workerId]);

  const loadLinked = async () => {
    if (!workerId) {
      setLinkedInterviews([]);
      setLoadingLinked(false);
      return;
    }

    setLoadingLinked(true);
    try {
      const data = await getWorkerInterviews(workerId);
      setLinkedInterviews(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLinked(false);
    }
  };

  const runSearch = async () => {
    setLoadingSearch(true);
    setMessage("");
    try {
      const data = await searchUnlinkedInterviews(search);
      setAvailableInterviews(data);
    } catch (error) {
      console.error(error);
      setMessage("Could not search interviews.");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleLink = async (interviewId) => {
    try {
      setMessage("");
      await linkInterviewToWorker(interviewId, workerId);
      await loadLinked();
      await runSearch();
      setMessage("Interview linked successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Could not link interview.");
    }
  };

  const handleUnlink = async (interviewId) => {
    try {
      setMessage("");
      await unlinkInterviewFromWorker(interviewId);
      await loadLinked();
      setMessage("Interview unlinked successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Could not unlink interview.");
    }
  };

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 24,
        padding: 24,
        display: "grid",
        gap: 20,
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
          Interviews
        </h2>
        <p style={{ margin: "8px 0 0 0", color: "#475569" }}>
          Link saved standalone interviews to this worker profile.
        </p>
      </div>

      {message ? (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            fontWeight: 700,
          }}
        >
          {message}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
          Linked interviews
        </h3>

        {loadingLinked ? (
          <div style={cardStyle}>Loading...</div>
        ) : linkedInterviews.length === 0 ? (
          <div style={cardStyle}>No interviews linked yet.</div>
        ) : (
          linkedInterviews.map((item) => (
            <div key={item.id} style={cardStyle}>
              <div style={rowStyle}>
                <div>
                  <div style={titleStyle}>
                    {item.candidate_name || "Unnamed candidate"}
                  </div>
                  <div style={metaStyle}>
                    {item.position || "No position"} • Score {item.total_score} • {item.classification}
                  </div>
                  <div style={metaStyle}>
                    {item.interview_date || "No date"} • #{item.interview_number}
                  </div>
                </div>

                <button
                  onClick={() => handleUnlink(item.id)}
                  style={secondaryButtonStyle}
                >
                  Unlink
                </button>
              </div>

              {item.quick_notes ? (
                <div style={notesStyle}>
                  <strong>Quick notes:</strong> {item.quick_notes}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
          Find standalone interviews
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by candidate name, phone, email or position"
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 12,
              padding: "12px 14px",
              fontSize: 14,
            }}
          />
          <button onClick={runSearch} style={primaryButtonStyle}>
            {loadingSearch ? "Searching..." : "Search"}
          </button>
        </div>

        {availableInterviews.length > 0 && (
          <div style={{ display: "grid", gap: 10 }}>
            {availableInterviews.map((item) => (
              <div key={item.id} style={cardStyle}>
                <div style={rowStyle}>
                  <div>
                    <div style={titleStyle}>
                      {item.candidate_name || "Unnamed candidate"}
                    </div>
                    <div style={metaStyle}>
                      {item.position || "No position"} • Score {item.total_score} • {item.classification}
                    </div>
                    <div style={metaStyle}>
                      {item.interview_date || "No date"} • #{item.interview_number}
                    </div>
                  </div>

                  <button
                    onClick={() => handleLink(item.id)}
                    style={primaryButtonStyle}
                  >
                    Link to worker
                  </button>
                </div>

                {item.quick_notes ? (
                  <div style={notesStyle}>
                    <strong>Quick notes:</strong> {item.quick_notes}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
  background: "#f8fafc",
};

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const titleStyle = {
  fontSize: 16,
  fontWeight: 900,
};

const metaStyle = {
  marginTop: 4,
  color: "#475569",
  fontSize: 14,
};

const notesStyle = {
  marginTop: 10,
  color: "#334155",
  fontSize: 14,
  whiteSpace: "pre-wrap",
};

const primaryButtonStyle = {
  border: "none",
  background: "#0f172a",
  color: "#fff",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  borderRadius: 12,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};
