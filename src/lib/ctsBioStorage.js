import { buildCtsBioBlob, sanitizeBioFileName } from "./ctsBio";
import { CTS_BIO_DOCUMENT_LABEL, getWorkerDocumentCategoryKey } from "./workerDocuments";
import { supabase } from "./supabase";

const BUCKET_NAME = "worker-documents";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function findStoredCtsBio(documents) {
  return (documents || []).find((document) =>
    getWorkerDocumentCategoryKey(document.document_type)
      === getWorkerDocumentCategoryKey(CTS_BIO_DOCUMENT_LABEL)
  ) || null;
}

export async function replaceStoredCtsBio({ workerId, bio, existingDocument = null }) {
  const blob = await buildCtsBioBlob(bio);
  const fileName = sanitizeBioFileName(bio.name);
  const filePath = `${workerId}/${crypto.randomUUID()}_bio_${fileName}`;
  let insertedId = "";

  try {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, { cacheControl: "3600", contentType: DOCX_MIME, upsert: false });
    if (uploadError) throw uploadError;

    let { data: inserted, error: insertError } = await supabase
      .from("worker_documents")
      .insert({
        worker_id: workerId,
        file_name: fileName,
        file_path: filePath,
        file_type: DOCX_MIME,
        file_size: blob.size,
        document_type: CTS_BIO_DOCUMENT_LABEL,
        bio_data: bio,
      })
      .select("*")
      .single();
    if (insertError && /bio_data/i.test(insertError.message || "")) {
      const fallback = await supabase
        .from("worker_documents")
        .insert({
          worker_id: workerId,
          file_name: fileName,
          file_path: filePath,
          file_type: DOCX_MIME,
          file_size: blob.size,
          document_type: CTS_BIO_DOCUMENT_LABEL,
        })
        .select("*")
        .single();
      inserted = fallback.data;
      insertError = fallback.error;
    }
    if (insertError) throw insertError;
    insertedId = inserted.id;

    if (existingDocument?.id) {
      const { error: deleteRowError } = await supabase
        .from("worker_documents")
        .delete()
        .eq("id", existingDocument.id)
        .eq("worker_id", workerId);
      if (deleteRowError) throw deleteRowError;
      const { error: removeError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([existingDocument.file_path]);
      if (removeError) console.error("Previous BIO file could not be removed.", removeError);
    }

    return inserted;
  } catch (error) {
    if (insertedId) await supabase.from("worker_documents").delete().eq("id", insertedId);
    await supabase.storage.from(BUCKET_NAME).remove([filePath]);
    throw error;
  }
}

export async function downloadStoredCtsBio(document) {
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(document.file_path);
  if (error) throw error;
  const url = window.URL.createObjectURL(data);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = document.file_name;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
