import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  FileCheck2,
  FileText,
  Loader2,
  Paperclip,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { getCurrentUserAccess } from "../lib/userAccess";
import CandidateTopBar from "../components/CandidateTopBar";

const BUCKET_NAME = "worker-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const DOCUMENT_TYPES = [
  { value: "state_id_or_driver_license", label: "State ID or Driver License" },
  { value: "employment_authorization_card", label: "Employment Authorization Card" },
  { value: "osha_card", label: "OSHA Card" },
  { value: "other", label: "Other" },
];
const LEGACY_DOCUMENT_LABELS = {
  resume: "Resume",
  id: "Government ID",
  work_permit: "Work permit",
  osha: "OSHA card",
  certification: "Certification",
  license: "License",
  other: "Other",
};

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value)
      )
    : "—";

const formatFileSize = (bytes) => {
  if (!Number.isFinite(Number(bytes))) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getDocumentLabel = (value) => {
  if (String(value || "").toLowerCase().startsWith("other:")) return value;
  return DOCUMENT_TYPES.find((option) => option.value === value)?.label
    || LEGACY_DOCUMENT_LABELS[value]
    || value
    || "Other";
};

function PageStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body, #root { margin: 0; min-height: 100%; }
      body { background: #eef4ff; color: #0f172a; }
      button, input, select { font: inherit; }
      .spin { animation: worker-doc-spin 1s linear infinite; }
      @keyframes worker-doc-spin { to { transform: rotate(360deg); } }
      .worker-doc-page { min-height: 100dvh; background: linear-gradient(180deg, #eaf2ff 0, #f8fafc 420px); font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      .worker-doc-header { background: linear-gradient(180deg, #1f2c40, #1b2738); box-shadow: 0 8px 24px rgba(15,23,42,.18); }
      .worker-doc-header-inner { width: min(100% - 32px, 1080px); min-height: 76px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
      .worker-doc-brand { display: flex; align-items: center; gap: 14px; color: white; min-width: 0; }
      .worker-doc-brand img { width: auto; height: 54px; object-fit: contain; }
      .worker-doc-shell { width: min(100% - 32px, 1080px); margin: 0 auto; padding: 38px 0 56px; display: grid; gap: 18px; }
      .worker-doc-hero { display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 24px; padding: 26px; border: 1px solid #dbeafe; border-radius: 24px; background: rgba(255,255,255,.9); box-shadow: 0 18px 42px rgba(30,64,175,.08); }
      .worker-doc-grid { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 18px; align-items: start; }
      .worker-doc-card { min-width: 0; padding: 22px; border: 1px solid #e2e8f0; border-radius: 22px; background: white; box-shadow: 0 14px 34px rgba(15,23,42,.06); }
      .worker-doc-field { display: grid; gap: 7px; }
      .worker-doc-label { color: #475569; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
      .worker-doc-input { width: 100%; min-height: 48px; border: 1px solid #cbd5e1; border-radius: 13px; padding: 11px 13px; background: white; color: #0f172a; outline: none; }
      .worker-doc-input:focus { border-color: #2563eb; box-shadow: 0 0 0 4px rgba(37,99,235,.12); }
      .worker-doc-button { min-height: 44px; border: 1px solid #cbd5e1; border-radius: 13px; padding: 10px 14px; background: white; color: #0f172a; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
      .worker-doc-button.primary { border-color: #1f2c40; background: #1f2c40; color: white; }
      .worker-doc-button.danger { border-color: #fecaca; color: #b91c1c; }
      .worker-doc-button:disabled { opacity: .55; cursor: not-allowed; }
      .worker-doc-row { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 14px; align-items: center; padding: 15px 0; border-bottom: 1px solid #e2e8f0; }
      .worker-doc-row:last-child { border-bottom: 0; padding-bottom: 0; }
      .worker-doc-feedback { padding: 12px 14px; border-radius: 13px; font-size: 14px; font-weight: 700; }
      .worker-doc-feedback.error { color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; }
      .worker-doc-feedback.success { color: #166534; background: #f0fdf4; border: 1px solid #bbf7d0; }
      @media (max-width: 760px) {
        .worker-doc-header-inner, .worker-doc-shell { width: min(100% - 24px, 1080px); }
        .worker-doc-brand img { height: 44px; }
        .worker-doc-hero, .worker-doc-grid { grid-template-columns: 1fr; }
        .worker-doc-hero { padding: 21px; }
        .worker-doc-card { padding: 18px; }
        .worker-doc-row { grid-template-columns: 1fr; }
        .worker-doc-row-actions { justify-content: flex-start !important; }
      }
    `}</style>
  );
}

export default function WorkerDocumentsPage() {
  const fileInputRef = useRef(null);
  const [worker, setWorker] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [documentType, setDocumentType] = useState("state_id_or_driver_license");
  const [otherDescription, setOtherDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyDocumentId, setBusyDocumentId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDocuments = useCallback(async (workerId) => {
    const { data, error: loadError } = await supabase
      .from("worker_documents")
      .select("id, worker_id, file_name, file_path, file_type, file_size, document_type, uploaded_at")
      .eq("worker_id", workerId)
      .order("uploaded_at", { ascending: false });

    if (loadError) throw loadError;
    setDocuments(data || []);
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const access = await getCurrentUserAccess();
        if (!active) return;
        if (!access.worker?.id) throw new Error("We could not find a candidate profile for this account.");
        setWorker(access.worker);
        await loadDocuments(access.worker.id);
      } catch (loadError) {
        if (active) setError(loadError.message || "Could not load your documents.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, [loadDocuments]);

  const chooseFiles = (event) => {
    const files = Array.from(event.target.files || []);
    const invalid = files.find(
      (file) => !ACCEPTED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE
    );

    setSuccess("");
    if (invalid) {
      setSelectedFiles([]);
      setError(`${invalid.name} is not an accepted PDF, image, or Word file under 10 MB.`);
      event.target.value = "";
      return;
    }

    setError("");
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (!worker?.id || selectedFiles.length === 0) return;
    const trimmedOtherDescription = otherDescription.trim();
    if (documentType === "other" && !trimmedOtherDescription) {
      setError("Describe the document when selecting Other.");
      return;
    }
    setUploading(true);
    setError("");
    setSuccess("");
    const uploadedPaths = [];

    try {
      const rows = [];
      for (const file of selectedFiles) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${worker.id}/${crypto.randomUUID()}_${safeName}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        rows.push({
          worker_id: worker.id,
          file_name: file.name,
          file_path: path,
          file_type: file.type,
          file_size: file.size,
          document_type: documentType === "other" ? `Other: ${trimmedOtherDescription}` : documentType,
        });
      }

      const { error: insertError } = await supabase.from("worker_documents").insert(rows);
      if (insertError) throw insertError;

      setSelectedFiles([]);
      if (documentType === "other") setOtherDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadDocuments(worker.id);
      setSuccess(`${rows.length} document${rows.length === 1 ? "" : "s"} uploaded successfully.`);
    } catch (uploadError) {
      if (uploadedPaths.length) await supabase.storage.from(BUCKET_NAME).remove(uploadedPaths);
      setError(uploadError.message || "Could not upload your documents.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document) => {
    setBusyDocumentId(document.id);
    setError("");
    try {
      const { data, error: downloadError } = await supabase.storage
        .from(BUCKET_NAME)
        .download(document.file_path);
      if (downloadError) throw downloadError;
      const url = window.URL.createObjectURL(data);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = document.file_name;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.message || "Could not download the document.");
    } finally {
      setBusyDocumentId("");
    }
  };

  const handleDelete = async (document) => {
    if (!window.confirm(`Delete “${document.file_name}”?`)) return;
    setBusyDocumentId(document.id);
    setError("");
    setSuccess("");
    try {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([document.file_path]);
      if (storageError) throw storageError;
      const { error: deleteError } = await supabase
        .from("worker_documents")
        .delete()
        .eq("id", document.id)
        .eq("worker_id", worker.id);
      if (deleteError) throw deleteError;
      await loadDocuments(worker.id);
      setSuccess("Document deleted.");
    } catch (deleteError) {
      setError(deleteError.message || "Could not delete the document.");
    } finally {
      setBusyDocumentId("");
    }
  };

  return (
    <div className="worker-doc-page">
      <PageStyles />
      <CandidateTopBar workerName={worker?.name} />

      <main className="worker-doc-shell">
        <section className="worker-doc-hero">
          <div>
            <div style={{ color: "#2563eb", fontSize: 12, fontWeight: 850, letterSpacing: ".1em" }}>
              YOUR PROFILE
            </div>
            <h1 style={{ margin: "7px 0 8px", fontSize: "clamp(30px, 5vw, 44px)", letterSpacing: "-.04em" }}>
              My documents
            </h1>
            <p style={{ color: "#64748b", lineHeight: 1.6, maxWidth: 700 }}>
              Upload identification, work authorization, licenses, and certifications. Files are linked directly to your candidate profile for the UTS team to review.
            </p>
          </div>
          <ShieldCheck size={58} color="#2563eb" aria-hidden="true" />
        </section>

        {error ? <div className="worker-doc-feedback error">{error}</div> : null}
        {success ? <div className="worker-doc-feedback success">{success}</div> : null}

        {loading ? (
          <div className="worker-doc-card" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Loader2 size={20} className="spin" /> Loading your profile...
          </div>
        ) : (
          <div className="worker-doc-grid">
            <section className="worker-doc-card" style={{ display: "grid", gap: 17 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22 }}>Upload documents</h2>
                <p style={{ marginTop: 6, color: "#64748b", fontSize: 14, lineHeight: 1.5 }}>
                  PDF, JPG, PNG, DOC, or DOCX. Maximum 10 MB per file.
                </p>
              </div>
              <label className="worker-doc-field">
                <span className="worker-doc-label">Document type</span>
                <select className="worker-doc-input" value={documentType} onChange={(event) => { setDocumentType(event.target.value); setError(""); }}>
                  {DOCUMENT_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              {documentType === "other" ? (
                <label className="worker-doc-field">
                  <span className="worker-doc-label">Document description</span>
                  <input
                    className="worker-doc-input"
                    value={otherDescription}
                    maxLength={120}
                    placeholder="Example: Fall Protection"
                    onChange={(event) => setOtherDescription(event.target.value)}
                  />
                </label>
              ) : null}
              <label className="worker-doc-field">
                <span className="worker-doc-label">Choose files</span>
                <input
                  ref={fileInputRef}
                  className="worker-doc-input"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={chooseFiles}
                />
              </label>
              {selectedFiles.length ? (
                <div style={{ display: "grid", gap: 6, color: "#475569", fontSize: 13 }}>
                  {selectedFiles.map((file) => <span key={`${file.name}-${file.size}`}>• {file.name} ({formatFileSize(file.size)})</span>)}
                </div>
              ) : null}
              <button className="worker-doc-button primary" type="button" disabled={uploading || !selectedFiles.length || (documentType === "other" && !otherDescription.trim())} onClick={handleUpload}>
                {uploading ? <Loader2 size={17} className="spin" /> : <Upload size={17} />}
                {uploading ? "Uploading..." : "Upload to my profile"}
              </button>
            </section>

            <section className="worker-doc-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22 }}>Uploaded files</h2>
                  <p style={{ marginTop: 6, color: "#64748b", fontSize: 14 }}>{documents.length} document{documents.length === 1 ? "" : "s"}</p>
                </div>
                <Paperclip size={22} color="#64748b" />
              </div>
              <div style={{ marginTop: 8 }}>
                {!documents.length ? (
                  <div style={{ padding: "34px 12px", textAlign: "center", color: "#64748b" }}>
                    <FileCheck2 size={38} style={{ marginBottom: 10 }} />
                    <div>No documents uploaded yet.</div>
                  </div>
                ) : documents.map((document) => (
                  <div className="worker-doc-row" key={document.id}>
                    <div style={{ minWidth: 0, display: "flex", gap: 11, alignItems: "flex-start" }}>
                      <FileText size={20} color="#2563eb" style={{ flex: "0 0 auto", marginTop: 2 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 850, overflowWrap: "anywhere" }}>{document.file_name}</div>
                        <div style={{ marginTop: 5, color: "#64748b", fontSize: 12, lineHeight: 1.45 }}>
                          {getDocumentLabel(document.document_type)} · {formatFileSize(document.file_size)} · {formatDate(document.uploaded_at)}
                        </div>
                      </div>
                    </div>
                    <div className="worker-doc-row-actions" style={{ display: "flex", gap: 7, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <button className="worker-doc-button" type="button" disabled={busyDocumentId === document.id} onClick={() => handleDownload(document)} aria-label={`Download ${document.file_name}`}>
                        <Download size={15} /> Download
                      </button>
                      <button className="worker-doc-button danger" type="button" disabled={busyDocumentId === document.id} onClick={() => handleDelete(document)} aria-label={`Delete ${document.file_name}`}>
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
