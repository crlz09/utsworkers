import { getWorkerDocumentCategoryKey } from "./workerDocuments.js";

export const CERT_TYPES = [
  { value: "osha", label: "OSHA", documentType: "OSHA Card" },
  { value: "mewp", label: "MEWP", documentType: "MEWP" },
  { value: "fall_arrest", label: "Fall Arrest", documentType: "Fall Arrest" },
  { value: "orientation", label: "Orientation", documentType: "Orientation" },
  { value: "other", label: "Others", documentType: "Other" },
];
export const CERT_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const CERT_MAX_BYTES = 10 * 1024 * 1024;

export function certificateCategory(document) {
  if (
    CERT_TYPES.some((type) => type.value === document.onboarding_cert_category)
  )
    return document.onboarding_cert_category;
  const type = getWorkerDocumentCategoryKey(document.document_type);
  return (
    {
      "osha card": "osha",
      mewp: "mewp",
      "fall arrest": "fall_arrest",
      orientation: "orientation",
    }[type] || ""
  );
}
export function certificateFields(category, name, file) {
  const type = CERT_TYPES.find((item) => item.value === category);
  if (!type) throw new Error("Choose a certificate category.");
  const title = name.trim();
  if (!title || title.length > 160)
    throw new Error("Enter a document name of 1–160 characters.");
  if (
    !file ||
    !CERT_FILE_TYPES.includes(file.type) ||
    file.size < 1 ||
    file.size > CERT_MAX_BYTES
  )
    throw new Error("Choose a PDF, JPG, PNG, or Word file up to 10 MB.");
  return {
    document_name: title,
    onboarding_cert_category: category,
    document_type: category === "other" ? `Other: ${title}` : type.documentType,
  };
}

export async function uploadCertificate({
  client,
  workerId,
  category,
  name,
  file,
}) {
  if (!workerId) throw new Error("Select a candidate before uploading.");
  const fields = certificateFields(category, name, file);
  const id = crypto.randomUUID();
  const filePath = `${workerId}/${id}_cert_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const storage = client.storage.from("worker-documents");
  const { error: uploadError } = await storage.upload(filePath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;
  const { error: insertError } = await client.from("worker_documents").insert({
    id,
    worker_id: workerId,
    file_name: file.name,
    file_path: filePath,
    file_type: file.type,
    file_size: file.size,
    ...fields,
  });
  if (insertError) {
    // Confirm an uncertain response before deleting a file that may already be linked.
    const { data: saved, error: checkError } = await client
      .from("worker_documents")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (saved) return saved.id;
    if (!checkError) await storage.remove([filePath]);
    throw insertError;
  }
  return id;
}
