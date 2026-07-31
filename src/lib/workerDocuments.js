export const WORKER_DOCUMENT_TYPES = [
  { value: "resume", label: "Resume" },
  { value: "state_id_or_driver_license", label: "State ID or Driver License" },
  { value: "employment_authorization_card", label: "Employment Authorization Card" },
  { value: "social_security_card", label: "Social Security Card" },
  { value: "osha_card", label: "OSHA Card" },
  { value: "other", label: "Other" },
];

export const TWO_SIDED_WORKER_DOCUMENT_TYPES = new Set([
  "state_id_or_driver_license",
  "employment_authorization_card",
]);

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
