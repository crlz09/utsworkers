import { getWorkerDocumentCategoryKey, getWorkerDocumentLabel } from "./workerDocuments.js";

const CATEGORY = {
  id: getWorkerDocumentCategoryKey("state_id_or_driver_license"),
  authorization: getWorkerDocumentCategoryKey("employment_authorization_card"),
  socialSecurity: getWorkerDocumentCategoryKey("social_security_card"),
  osha: getWorkerDocumentCategoryKey("osha_card"),
  resume: getWorkerDocumentCategoryKey("resume"),
};

const getSide = (document) => {
  const value = String(document?.document_type || "").toLowerCase();
  if (/\s-\sfront$/.test(value)) return "front";
  if (/\s-\sback$/.test(value)) return "back";
  return "document";
};

const groupByCategory = (documents) => {
  const grouped = new Map();
  (documents || []).forEach((document) => {
    const category = getWorkerDocumentCategoryKey(document.document_type);
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(document);
  });
  return grouped;
};

const getPair = (grouped, category) => {
  const documents = grouped.get(category) || [];
  return {
    front: documents.find((document) => getSide(document) === "front") || null,
    back: documents.find((document) => getSide(document) === "back") || null,
  };
};

export const getMissingCandidatePdfDocuments = (documents) => {
  const grouped = groupByCategory(documents);
  const requirements = [
    { label: "State ID or Driver License", pair: getPair(grouped, CATEGORY.id) },
    { label: "Social Security Card", pair: getPair(grouped, CATEGORY.socialSecurity) },
  ];

  return requirements.flatMap(({ label, pair }) => {
    const missingSides = [!pair.front ? "front" : "", !pair.back ? "back" : ""].filter(Boolean);
    return missingSides.length ? [`${label} (${missingSides.join(" and ")})`] : [];
  });
};

export const buildCandidatePdfSections = (documents) => {
  const grouped = groupByCategory(documents);
  const id = getPair(grouped, CATEGORY.id);
  const authorization = getPair(grouped, CATEGORY.authorization);
  const socialSecurity = getPair(grouped, CATEGORY.socialSecurity);
  const consumed = new Set([
    ...(grouped.get(CATEGORY.id) || []),
    ...(grouped.get(CATEGORY.authorization) || []),
    ...(grouped.get(CATEGORY.socialSecurity) || []),
  ].map((document) => document.id));

  const sections = [
    { title: "State ID or Driver License", documents: [id.front, id.back].filter(Boolean), paired: true },
  ];
  if (authorization.front && authorization.back) {
    sections.push({ title: "Work Authorization Card", documents: [authorization.front, authorization.back], paired: true });
  }
  sections.push({ title: "Social Security Card", documents: [socialSecurity.front, socialSecurity.back].filter(Boolean), paired: true });

  const extras = (documents || [])
    .filter((document) => !consumed.has(document.id))
    .sort((a, b) => {
      const categoryA = getWorkerDocumentCategoryKey(a.document_type);
      const categoryB = getWorkerDocumentCategoryKey(b.document_type);
      const priority = (category) => category === CATEGORY.osha ? 0 : category === CATEGORY.resume ? 1 : 2;
      const priorityDifference = priority(categoryA) - priority(categoryB);
      if (priorityDifference) return priorityDifference;
      return new Date(a.uploaded_at || 0).getTime() - new Date(b.uploaded_at || 0).getTime();
    });

  extras.forEach((document) => sections.push({
    title: getWorkerDocumentLabel(document.document_type),
    documents: [document],
    paired: false,
  }));
  return sections;
};

export const sanitizeDownloadName = (value, fallback = "document") => {
  const safe = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return safe || fallback;
};
