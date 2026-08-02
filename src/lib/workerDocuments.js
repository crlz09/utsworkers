export const WORKER_DOCUMENT_TYPES = [
  { value: "resume", label: "Resume" },
  { value: "state_id_or_driver_license", label: "State ID or Driver License" },
  { value: "employment_authorization_card", label: "Employment Authorization Card" },
  { value: "social_security_card", label: "Social Security Card" },
  { value: "osha_card", label: "OSHA Card" },
  { value: "other", label: "Other" },
];

export const CTS_BIO_DOCUMENT_LABEL = "BIO";

export const TWO_SIDED_WORKER_DOCUMENT_TYPES = new Set([
  "state_id_or_driver_license",
  "employment_authorization_card",
]);

export const REQUIRED_WORKER_DOCUMENT_TYPES = new Set([
  "state_id_or_driver_license",
  "social_security_card",
]);

export const REMINDER_WORKER_DOCUMENT_TYPES = WORKER_DOCUMENT_TYPES.map((type) => ({
  ...type,
  required: REQUIRED_WORKER_DOCUMENT_TYPES.has(type.value),
}));

const LEGACY_DOCUMENT_LABELS = {
  resume: "Resume",
  id: "Government ID",
  work_permit: "Work permit",
  osha: "OSHA Card",
  certification: "Certification",
  license: "License",
  other: "Other",
};

export const getWorkerDocumentLabel = (value) => {
  if (String(value || "").toLowerCase().startsWith("other:")) return value;
  return WORKER_DOCUMENT_TYPES.find((option) => option.value === value)?.label
    || LEGACY_DOCUMENT_LABELS[value]
    || value
    || "Other";
};

export const getWorkerDocumentCategoryKey = (value) =>
  String(getWorkerDocumentLabel(value) || "")
    .replace(/\s+-\s+(front|back)$/i, "")
    .trim()
    .toLowerCase();

export const getWorkerDocumentStatus = (documents, documentType) => {
  if (documentType === "other") {
    return {
      complete: (documents || []).some((document) =>
        String(document.document_type || "").toLowerCase().startsWith("other")
      ),
    };
  }
  const label = getWorkerDocumentLabel(documentType);
  const matching = (documents || []).filter(
    (document) => getWorkerDocumentCategoryKey(document.document_type)
      === getWorkerDocumentCategoryKey(label)
  );

  if (TWO_SIDED_WORKER_DOCUMENT_TYPES.has(documentType)) {
    const sides = matching.map((document) => String(document.document_type || "").toLowerCase());
    const front = sides.some((value) => /\s-\sfront$/.test(value));
    const back = sides.some((value) => /\s-\sback$/.test(value));
    return { complete: front && back, front, back };
  }

  return { complete: matching.length > 0 };
};
