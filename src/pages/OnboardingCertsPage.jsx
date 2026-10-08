import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Download,
  ExternalLink,
  FileCheck2,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import UtsTopNavBar from "../components/UtsTopNavBar";
import CandidateWorkspaceTabs from "../components/CandidateWorkspaceTabs";
import OnboardingStepTabs from "../components/OnboardingStepTabs";
import {
  CERT_TYPES,
  certificateCategory,
  uploadCertificate,
} from "../lib/onboardingCerts";
import "./OnboardingCertsPage.css";

function CertificateUpload({ type, workerId, busy, onBusy, onSaved }) {
  const [name, setName] = useState(type.value === "other" ? "" : type.label);
  const [file, setFile] = useState(null);
  const [inputKey, setInputKey] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const upload = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    setSaving(true);
    onBusy(true);
    try {
      await uploadCertificate({
        client: supabase,
        workerId,
        category: type.value,
        name,
        file,
      });
      setFile(null);
      setInputKey((value) => value + 1);
      if (type.value === "other") setName("");
      onSaved(`${name.trim()} uploaded successfully.`);
    } catch (failure) {
      setError(failure.message || "Could not upload the certificate.");
    } finally {
      setSaving(false);
      onBusy(false);
    }
  };
  return (
    <form
      className="cert-upload-card"
      onSubmit={upload}
      aria-label={`Upload ${type.label}`}
    >
      <header>
        <h2>
          <FileCheck2 size={19} /> {type.label}
        </h2>
        <span>Optional</span>
      </header>
      <label>
        Document name
        <input
          aria-label={`${type.label} document name`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={160}
          required
          disabled={busy}
          placeholder={
            type.value === "other" ? "e.g. Client safety course" : type.label
          }
        />
      </label>
      <label>
        File
        <input
          key={inputKey}
          aria-label={`${type.label} file`}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          required
          disabled={busy}
          onChange={(event) => {
            const selected = event.target.files?.[0] || null;
            setFile(selected);
            setError("");
            if (type.value === "other" && !name.trim() && selected)
              setName(selected.name.replace(/\.[^.]+$/, "").slice(0, 160));
          }}
        />
      </label>
      <small>PDF, JPG, PNG or Word · Up to 10 MB</small>
      {error ? (
        <p role="alert" className="cert-error">
          {error}
        </p>
      ) : null}
      <button
        className="cert-button primary"
        disabled={busy || !file || !name.trim()}
      >
        {saving ? (
          <Loader2 className="cert-spin" size={16} />
        ) : (
          <Upload size={16} />
        )}
        {saving ? "Uploading…" : `Upload ${type.label}`}
      </button>
    </form>
  );
}

export default function OnboardingCertsPage() {
  const { workerId: routeWorkerId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const workerId = routeWorkerId || params.get("candidate") || "";
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [candidateError, setCandidateError] = useState("");
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [category, setCategory] = useState("");
  const current = result?.workerId === workerId ? result : null;

  useEffect(() => {
    if (routeWorkerId) return;
    let active = true;
    const timer = setTimeout(async () => {
      setCandidateLoading(true);
      setCandidateError("");
      try {
        const search = candidateSearch.trim();
        const queries = search
          ? ["name", "email"].map((field) =>
              supabase
                .from("workers")
                .select("id,name,email")
                .ilike(field, `%${search.replace(/[\\%_]/g, "\\$&")}%`)
                .order("name")
                .limit(50),
            )
          : [
              supabase
                .from("workers")
                .select("id,name,email")
                .order("name")
                .limit(50),
            ];
        const responses = await Promise.all(queries);
        const failure = responses.find((response) => response.error)?.error;
        if (failure) throw failure;
        const map = new Map(
          responses
            .flatMap((response) => response.data || [])
            .map((candidate) => [candidate.id, candidate]),
        );
        if (active)
          setCandidates(
            [...map.values()].sort((a, b) => a.name.localeCompare(b.name)),
          );
      } catch (failure) {
        if (active) {
          setCandidates([]);
          setCandidateError(failure.message || "Could not search candidates.");
        }
      } finally {
        if (active) setCandidateLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [candidateSearch, routeWorkerId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setError("");
      setLoading(!!workerId);
      if (!workerId) {
        setResult(null);
        return;
      }
      try {
        const { data: worker, error: workerError } = await supabase
          .from("workers")
          .select("id,name,email")
          .eq("id", workerId)
          .single();
        if (workerError) throw workerError;
        const documents = [];
        for (let offset = 0; ; offset += 500) {
          const { data, error: failure } = await supabase
            .from("worker_documents")
            .select(
              "id,worker_id,file_name,file_path,file_type,file_size,document_type,document_name,onboarding_cert_category,uploaded_at",
            )
            .eq("worker_id", workerId)
            .order("uploaded_at", { ascending: false })
            .order("id")
            .range(offset, offset + 499);
          if (failure) throw failure;
          documents.push(
            ...data.filter((document) => certificateCategory(document)),
          );
          if (data.length < 500) break;
        }
        if (active) setResult({ workerId, worker, documents });
      } catch (failure) {
        if (active) {
          setResult(null);
          setError(failure.message || "Could not load candidate certificates.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [workerId, refresh]);
  const saved = (message) => {
    setRefresh((value) => value + 1);
    setNotice(message);
  };
  const selectCandidate = (value) => {
    setResult(null);
    setCategory("");
    setNotice("");
    setError("");
    setParams(value ? { candidate: value } : {});
  };
  const openFile = async (document, download = false) => {
    if (busy) return;
    setBusy(true);
    setError("");
    const preview = download ? null : window.open("about:blank", "_blank");
    if (preview) preview.opener = null;
    try {
      if (!download && !preview)
        throw new Error("Allow pop-ups to open the file, or use Download.");
      const storage = supabase.storage.from("worker-documents");
      if (download) {
        const { data, error: failure } = await storage.download(
          document.file_path,
        );
        if (failure) throw failure;
        const url = URL.createObjectURL(data);
        const anchor = window.document.createElement("a");
        anchor.href = url;
        anchor.download = document.file_name;
        window.document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const { data, error: failure } = await storage.createSignedUrl(
          document.file_path,
          60,
        );
        if (failure) throw failure;
        preview.location.replace(data.signedUrl);
      }
    } catch (failure) {
      preview?.close();
      setError(failure.message || "Could not open the document.");
    } finally {
      setBusy(false);
    }
  };
  const documents =
    current?.documents.filter(
      (document) => !category || certificateCategory(document) === category,
    ) || [];
  return (
    <div className="cert-page">
      <UtsTopNavBar />
      {routeWorkerId ? <CandidateWorkspaceTabs /> : null}
      <main className="cert-shell">
        <header className="cert-page-header">
          <div>
            <span>Hiring onboarding</span>
            <h1>Certs</h1>
            <p>
              Upload the certificates requested by the client. All categories
              are optional.
            </p>
          </div>
          <button
            className="cert-button"
            disabled={!workerId || loading || busy}
            onClick={() => setRefresh((value) => value + 1)}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </header>
        <OnboardingStepTabs />
        {!routeWorkerId ? (
          <section
            className="cert-candidate-picker"
            aria-label="Select candidate"
          >
            <label>
              Find a candidate
              <input
                aria-label="Find a candidate"
                type="search"
                placeholder="Search by name or email…"
                value={candidateSearch}
                disabled={busy}
                onChange={(event) => setCandidateSearch(event.target.value)}
              />
            </label>
            <label>
              Candidate
              <select
                aria-label="Candidate"
                value={workerId}
                disabled={busy}
                onChange={(event) => selectCandidate(event.target.value)}
              >
                <option value="">Select a candidate…</option>
                {workerId &&
                !candidates.some((candidate) => candidate.id === workerId) ? (
                  <option value={workerId}>
                    {current?.worker.name || "Selected candidate"}
                  </option>
                ) : null}
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} · {candidate.email}
                  </option>
                ))}
              </select>
            </label>
            <p role="status">
              {candidateLoading
                ? "Searching…"
                : "Search to find candidates beyond the initial list."}
            </p>
            {candidateError ? (
              <p className="cert-error" role="alert">
                {candidateError}
              </p>
            ) : null}
          </section>
        ) : null}
        {error ? (
          <p className="cert-error" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="cert-success" role="status">
            {notice}
          </p>
        ) : null}
        {loading ? (
          <div className="cert-empty">
            <Loader2 className="cert-spin" size={24} /> Loading certificates…
          </div>
        ) : !workerId ? (
          <div className="cert-empty">
            <FileCheck2 size={30} />
            <h2>Select a candidate</h2>
            <p>Choose whose certificates you want to upload or review.</p>
          </div>
        ) : current ? (
          <>
            <section className="cert-candidate-summary">
              <div>
                <h2>{current.worker.name}</h2>
                <p>{current.worker.email}</p>
              </div>
              <Link to={`/admin/workers/${workerId}/documents`}>
                Candidate documents ↗
              </Link>
            </section>
            <div className="cert-upload-grid">
              {CERT_TYPES.map((type) => (
                <CertificateUpload
                  key={`${workerId}:${type.value}`}
                  type={type}
                  workerId={workerId}
                  busy={busy}
                  onBusy={setBusy}
                  onSaved={saved}
                />
              ))}
            </div>
            <section className="cert-library">
              <header>
                <div>
                  <h2>Uploaded certificates</h2>
                  <p>
                    {current.documents.length} files · Includes existing OSHA
                    cards
                  </p>
                </div>
                <label>
                  Filter certificates
                  <select
                    aria-label="Filter certificates"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="">All categories</option>
                    {CERT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
              </header>
              {!documents.length ? (
                <div className="cert-empty">
                  <p>
                    No certificates uploaded
                    {category ? " in this category" : ""}.
                  </p>
                </div>
              ) : (
                documents.map((document) => (
                  <article className="cert-document" key={document.id}>
                    <div>
                      <span className="cert-type">
                        {
                          CERT_TYPES.find(
                            (type) =>
                              type.value === certificateCategory(document),
                          )?.label
                        }
                      </span>
                      <h3>
                        {document.document_name || document.document_type}
                      </h3>
                      <p>
                        {document.file_name} ·{" "}
                        {new Date(document.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="cert-document-actions">
                      <button
                        className="cert-button"
                        disabled={busy}
                        onClick={() => openFile(document)}
                        aria-label={`Open ${document.file_name}`}
                      >
                        <ExternalLink size={15} /> Open
                      </button>
                      <button
                        className="cert-button"
                        disabled={busy}
                        onClick={() => openFile(document, true)}
                        aria-label={`Download ${document.file_name}`}
                      >
                        <Download size={15} /> Download
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
