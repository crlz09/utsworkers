import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Eye, Loader2, X } from "lucide-react";
import { supabase } from "../lib/supabase";

const buttonStyle = { border: "1px solid #cbd5e1", background: "white", color: "#0f172a", borderRadius: 12, padding: "10px 12px", font: "inherit", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 };

export default function WorkerDocumentPreview({ document, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    dialog.showModal();
    let active = true;
    let objectUrl;
    const load = async () => {
      try {
        const { data, error: downloadError } = await supabase.storage.from("worker-documents").download(document.file_path);
        if (downloadError) throw downloadError;
        if (!active) return;
        const extension = document.file_name?.split(".").pop().toLowerCase();
        const type = ({ pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" })[extension];
        objectUrl = URL.createObjectURL(type ? new Blob([data], { type }) : data);
        setPreview({ url: objectUrl, type });
      } catch (failure) {
        if (active) setError(failure.message || "Could not load the document preview.");
      }
    };
    void load();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      dialog.close();
    };
  }, [open, document.file_path, document.file_name]);

  const close = () => { setOpen(false); setPreview(null); setError(""); };

  return <>
    <button type="button" style={buttonStyle} disabled={disabled} onClick={() => setOpen(true)} aria-label={`View ${document.file_name}`}><Eye size={15} /> View</button>
    {open && createPortal(<dialog ref={dialogRef} aria-labelledby={titleId} onCancel={close} style={{ width: "min(1100px, 94vw)", maxWidth: "94vw", height: "85dvh", maxHeight: "90dvh", padding: 0, border: "1px solid #cbd5e1", borderRadius: 16, color: "#0f172a", background: "#f8fafc" }}>
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, borderBottom: "1px solid #e2e8f0", background: "white" }}>
          <strong id={titleId} style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{document.file_name}</strong>
          {preview && <a href={preview.url} download={document.file_name} style={{ ...buttonStyle, textDecoration: "none" }}><Download size={15} /> Download</a>}
          <button type="button" style={buttonStyle} onClick={close} aria-label="Close preview" autoFocus><X size={18} /></button>
        </header>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "grid", placeItems: "center", padding: 12 }}>
          {error ? <p role="alert">{error}</p> : !preview ? <p role="status"><Loader2 size={20} /> Loading preview...</p> : preview.type === "application/pdf" ? <iframe src={preview.url} title={`Preview of ${document.file_name}`} style={{ width: "100%", height: "100%", border: 0 }} /> : preview.type?.startsWith("image/") ? <img src={preview.url} alt={document.document_name || document.file_name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <p>Preview is unavailable for this file format. Use Download to open it on your device.</p>}
        </div>
      </div>
    </dialog>, window.document.body)}
  </>;
}
