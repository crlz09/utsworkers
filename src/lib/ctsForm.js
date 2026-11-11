import { getFullStateName, US_STATE_ABBREVIATIONS } from "./addressLookup.js";
import { splitName } from "./ctsJotform.js";
import { createInitialCtsBio } from "./ctsBio.js";
import { findStoredCtsBio } from "./ctsBioStorage.js";
import { profileRateForAssignment } from "./candidateCompensation.js";

// Direct apply URL loaded by the CTS careers widget for this posting.
export const CTS_FORM_URL = "https://hire.myavionte.com/app/careers/#/jobs/C49sQn8w92E/r6_4z5-tWGg/HuWz6tnkpSg/direct";

function getCtsContactFields(candidate) {
  const { first, last } = splitName(candidate.name);
  const stateName = getFullStateName(candidate.state);
  const isUsAddress = Object.values(US_STATE_ABBREVIATIONS).some(
    (state) => state.toLowerCase() === stateName.toLowerCase()
  ) && /^\d{5}(-\d{4})?$/.test(String(candidate.zip_code ?? "").trim());
  return {
    first_name: first,
    last_name: last,
    Address: candidate.address,
    City: candidate.city,
    Country: candidate.country || (isUsAddress ? "United States of America" : ""),
    state: stateName,
    ZipCode: candidate.zip_code,
    mobile: candidate.phone,
    email: candidate.email,
    ssn_last4: /^[0-9]{4}$/.test(candidate.ssn_last4 || "") ? candidate.ssn_last4 : "",
  };
}

function getCtsQuestionnaireFields(candidate) {
  const documents = [...(candidate.worker_documents || [])].sort(
    (a, b) => new Date(b.uploaded_at || 0) - new Date(a.uploaded_at || 0)
  );
  const savedBio = findStoredCtsBio(documents)?.bio_data;
  const bio = { ...createInitialCtsBio(candidate), ...savedBio };
  const hasExperience = ["commercial_experience_years", "industrial_experience_years", "residential_experience_years"]
    .some((field) => Number(candidate[field]) > 0);
  const english = candidate.worker_languages?.find((language) =>
    String(language.language_name || "").trim().toLowerCase() === "english"
  )?.proficiency_percent;
  const englishPercent = Number(english);
  const englishUpperBound = Math.max(20, Math.ceil(englishPercent / 20) * 20);
  const englishBand = english != null && String(english).trim() !== "" &&
    Number.isFinite(englishPercent) && englishPercent >= 0 && englishPercent <= 100
    ? `${englishUpperBound - 20}-${englishUpperBound}`
    : "";
  const certifications = (candidate.worker_certifications || [])
    .map((item) => String(item.certifications?.name || "").toLowerCase());
  const hasCertification = (...terms) => certifications.some((name) => terms.every((term) => name.includes(term)));
  const dob = String(candidate.date_of_birth || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);

  return {
    Trade: bio.trade,
    "Trade Experience (years)": bio.totalExperience,
    "Commercial Experience %": savedBio?.commercialExperience ?? (hasExperience ? bio.commercialExperience : ""),
    "Industrial Experience %": savedBio?.industrialExperience ?? (hasExperience ? bio.industrialExperience : ""),
    "Residential Experience %": savedBio?.residentialExperience ?? (hasExperience ? bio.residentialExperience : ""),
    "Project history": bio.projects,
    Strengths: bio.strengths,
    "English Proficiency": englishBand,
    "OSHA 10?": hasCertification("osha", "10") ? "Yes" : "",
    "Lift Cert?": hasCertification("lift") ? "Yes" : "",
    "Fall Protection Cert?": hasCertification("fall", "protection") ? "Yes" : "",
    Payrate: profileRateForAssignment(savedBio?.suggestedRate ?? candidate.rate),
    "Date of Birth": dob ? `${dob[2]}/${dob[3]}/${dob[1]}` : "",
  };
}

export function fillCtsAvionteForm(frame, candidate, signal) {
  const origin = new URL(CTS_FORM_URL).origin;
  const requestId = crypto.randomUUID();
  const channel = "uts-cts-prefill-v1";
  const values = Object.fromEntries(
    Object.entries(getCtsContactFields(candidate))
      .map(([name, value]) => [name, String(value ?? "").trim()])
  );
  values.questionnaire = Object.fromEntries(
    Object.entries(getCtsQuestionnaireFields(candidate))
      .map(([name, value]) => [name, String(value ?? "").trim()])
  );
  const post = (type, payload = {}) => frame.postMessage({ channel, requestId, type, ...payload }, origin);

  return new Promise((resolve) => {
    let timeout;
    let connected = false;
    const finish = (status) => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      signal.removeEventListener("abort", onAbort);
      resolve(status);
    };
    const onAbort = () => finish("cancelled");
    const onMessage = (event) => {
      if (event.origin !== origin || event.source !== frame) return;
      const message = event.data;
      if (message?.channel !== channel || message.requestId !== requestId) return;
      if (message.type === "ready" && !connected) {
        connected = true;
        window.clearTimeout(timeout);
        timeout = window.setTimeout(() => finish("unavailable"), 12000);
        post("fill", { values });
      } else if (message.type === "result" && connected) {
        finish(["filled", "unchanged"].includes(message.status) ? message.status : "unavailable");
      }
    };

    if (signal.aborted) return onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    window.addEventListener("message", onMessage);
    timeout = window.setTimeout(() => finish("missing-script"), 1500);
    post("probe");
  });
}
