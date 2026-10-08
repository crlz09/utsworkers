import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Download,
  ExternalLink,
  Files,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import UtsTopNavBar from "../components/UtsTopNavBar";
import "./AdminDocsPage.css";

const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "—";
const sizeLabel = (bytes) =>
  bytes == null
    ? ""
    : bytes < 1048576
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / 1048576).toFixed(1)} MB`;

export default function AdminDocsPage() {
  const [params, setParams] = useSearchParams();
  const query = (params.get("q") || "").slice(0, 250);
  const category = params.get("type") || "";
  const page = Math.max(
    1,
    Math.min(Number.parseInt(params.get("page"), 10) || 1, 1000000),
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState("");
  const [fileError, setFileError] = useState("");
  const key = JSON.stringify([query, category, page, refresh]);
  const current = result?.key === key ? result.data : null;

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const { data, error: searchError } = await supabase.rpc(
          "search_admin_documents",
          {
            p_query: query,
            p_category: category,
            p_page: page,
          },
        );
        if (searchError) throw searchError;
        if (active) setResult({ key, data });
      } catch (failure) {
        if (active) setError(failure.message || "Could not load documents.");
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, category, page, refresh, key]);

  const updateFilter = (name, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "page") next.delete("page");
    setParams(next, { replace: name === "q" });
  };
  const openFile = async (document, download = false) => {
    if (busy) return;
    setBusy(document.id);
    setFileError("");
    // Open synchronously to avoid browser popup blockers; never expose a public URL.
    const preview = download ? null : window.open("about:blank", "_blank");
    if (preview) preview.opener = null;
    try {
      if (!download && !preview)
        throw new Error("Allow pop-ups to open the document, or use Download.");
      if (download) {
        const { data, error: downloadError } = await supabase.storage
          .from(document.bucket)
          .download(document.file_path);
        if (downloadError) throw downloadError;
        const url = URL.createObjectURL(data);
        const anchor = window.document.createElement("a");
        anchor.href = url;
        anchor.download = document.file_name;
        window.document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const { data, error: urlError } = await supabase.storage
          .from(document.bucket)
          .createSignedUrl(document.file_path, 60);
        if (urlError) throw urlError;
        preview.location.replace(data.signedUrl);
      }
    } catch (failure) {
      preview?.close();
      setFileError(failure.message || "Could not open the document.");
    } finally {
      setBusy("");
    }
  };
  const totalPages = Math.max(1, Math.ceil((current?.total || 0) / 50));
  const categories = current?.categories || result?.data.categories || [];
  const pending = loading || (!current && !error);

  return (
    <div className="admin-docs-page">
      <UtsTopNavBar />
      <main className="admin-docs-shell">
        <section className="admin-docs-hero">
          <div>
            <span className="admin-docs-eyebrow">
              <ShieldCheck size={15} /> Admin access
            </span>
            <h1>
              <Files size={30} /> Docs
            </h1>
            <p>Find uploaded documents across all candidates.</p>
          </div>
          <button
            className="admin-docs-button"
            disabled={pending}
            onClick={() => setRefresh((value) => value + 1)}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </section>
        <section className="admin-docs-filters" aria-label="Document filters">
          <label className="admin-docs-search">
            <span>Search documents</span>
            <div>
              <Search size={18} />
              <input
                type="search"
                aria-label="Search documents"
                maxLength={250}
                placeholder="Candidate, email, file name or document type…"
                value={query}
                onChange={(event) => updateFilter("q", event.target.value)}
              />
            </div>
          </label>
          <label>
            <span>Document type</span>
            <select
              aria-label="Document type"
              value={category}
              onChange={(event) => updateFilter("type", event.target.value)}
            >
              <option value="">All types</option>
              {category &&
              !categories.some((item) => item.category === category) ? (
                <option value={category}>{category} (0)</option>
              ) : null}
              {categories.map((item) => (
                <option key={item.category} value={item.category}>
                  {item.category} ({item.count})
                </option>
              ))}
            </select>
          </label>
          <div className="admin-docs-quick-filters">
            <span>Quick filters</span>
            <div>
              {["OSHA Card", "Others"].map((type) => (
                <button
                  key={type}
                  className={`admin-docs-button ${category === type ? "selected" : ""}`}
                  aria-pressed={category === type}
                  onClick={() =>
                    updateFilter("type", category === type ? "" : type)
                  }
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </section>
        {fileError ? (
          <p role="alert" className="admin-docs-error">
            {fileError}
          </p>
        ) : null}
        <section className="admin-docs-results" aria-busy={pending}>
          <div className="admin-docs-result-heading">
            <h2>{category || "All documents"}</h2>
            <span role="status">
              {pending
                ? "Loading…"
                : current
                  ? `${current.total} ${current.total === 1 ? "file" : "files"} · ${current.total_documents} in library`
                  : ""}
            </span>
          </div>
          {error ? (
            <div role="alert" className="admin-docs-empty">
              <p>{error}</p>
              <button
                className="admin-docs-button"
                onClick={() => setRefresh((value) => value + 1)}
              >
                Try again
              </button>
            </div>
          ) : pending ? (
            <div className="admin-docs-empty">
              <Loader2 className="admin-docs-spin" size={24} />
              <p>Loading documents…</p>
            </div>
          ) : !current?.documents.length ? (
            <div className="admin-docs-empty">
              <Files size={32} />
              <h3>No documents found</h3>
              <p>Try a different search or document type.</p>
              <button
                className="admin-docs-button"
                onClick={() => setParams({})}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="admin-docs-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Candidate</th>
                      <th>Type</th>
                      <th>Uploaded</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.documents.map((document) => (
                      <tr key={document.id}>
                        <td>
                          <strong className="admin-docs-file-name">
                            {document.document_name || document.file_name}
                          </strong>
                          <small>
                            {document.document_name
                              ? `${document.file_name} · `
                              : ""}
                            {sizeLabel(document.file_size)}
                            {document.confirmation_number
                              ? ` · ${document.confirmation_number}`
                              : ""}
                          </small>
                        </td>
                        <td>
                          {document.worker_id ? (
                            <Link
                              to={`/admin/workers/${document.worker_id}/${document.source === "screening" ? "onboarding" : "documents"}`}
                            >
                              {document.candidate_name || "Candidate"}
                            </Link>
                          ) : (
                            <>
                              <strong>
                                {document.candidate_name || "Unassigned"}
                              </strong>
                              <small>Pending candidate verification</small>
                            </>
                          )}
                          <small>{document.candidate_email}</small>
                        </td>
                        <td>
                          <span className="admin-docs-type">
                            {document.category}
                          </span>
                          <small>
                            {document.document_type !== document.category
                              ? document.document_type
                              : ""}
                          </small>
                        </td>
                        <td>{dateLabel(document.uploaded_at)}</td>
                        <td>
                          <div className="admin-docs-actions">
                            <button
                              className="admin-docs-button"
                              disabled={!!busy}
                              onClick={() => openFile(document)}
                              aria-label={`Open ${document.file_name}`}
                            >
                              <ExternalLink size={15} /> Open
                            </button>
                            <button
                              className="admin-docs-button"
                              disabled={!!busy}
                              onClick={() => openFile(document, true)}
                              aria-label={`Download ${document.file_name}`}
                            >
                              {busy === document.id ? (
                                <Loader2
                                  className="admin-docs-spin"
                                  size={15}
                                />
                              ) : (
                                <Download size={15} />
                              )}{" "}
                              Download
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="admin-docs-pagination">
                <span>
                  {(page - 1) * 50 + 1}–{Math.min(page * 50, current.total)} of{" "}
                  {current.total}
                </span>
                <div>
                  <button
                    className="admin-docs-button"
                    disabled={page <= 1}
                    onClick={() => updateFilter("page", String(page - 1))}
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="admin-docs-button"
                    disabled={page >= totalPages}
                    onClick={() => updateFilter("page", String(page + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
