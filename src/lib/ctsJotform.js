const CTS_JOTFORM_FORM_URL = "https://form.jotform.com/261095938583167";

function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: parts[0] || "", last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function setIfPresent(params, key, value) {
  const normalizedValue = String(value ?? "").trim();
  if (normalizedValue) params.set(key, normalizedValue);
}

function formatDateOfBirth(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : value;
}

export function buildCtsJotformPrefillUrl(candidate, job) {
  const params = new URLSearchParams();
  const name = String(candidate?.name_snapshot || candidate?.worker_name || "").trim();
  const { first, last } = splitName(name);

  setIfPresent(params, "recruiterCompany", "Universal Talent Source");
  setIfPresent(params, "fullName3[first]", first);
  setIfPresent(params, "fullName3[last]", last);
  setIfPresent(params, "dob", formatDateOfBirth(candidate?.worker_date_of_birth));

  // Questions 42 and 43 share the same Jotform unique name. We send the
  // candidate's primary address once and leave Address 2 for manual review.
  setIfPresent(params, "typeA", candidate?.worker_address);
  setIfPresent(params, "typeA44", candidate?.worker_city);
  setIfPresent(params, "state", candidate?.worker_state);
  setIfPresent(params, "typeA46", candidate?.worker_zip_code);
  setIfPresent(params, "phoneNumber5[full]", candidate?.phone_snapshot || candidate?.worker_phone);
  setIfPresent(params, "email6", candidate?.worker_email);
  setIfPresent(params, "trade", candidate?.class_snapshot);
  setIfPresent(params, "tradeSkill", job?.level_type);
  setIfPresent(params, "yearsOf", candidate?.worker_total_experience_years);
  setIfPresent(params, "englishProficiency", candidate?.english_snapshot);
  setIfPresent(params, "notes", candidate?.notes);
  setIfPresent(params, "hiredWith", job?.id ? "Yes" : "");
  setIfPresent(params, "project", job?.level_type);
  setIfPresent(params, "payRate", candidate?.rate_snapshot);

  const certifications = (candidate?.worker_certifications || []).map((item) =>
    String(item?.certifications?.name || "").toLowerCase()
  );
  const hasCertification = (...terms) => certifications.some((nameValue) =>
    terms.every((term) => nameValue.includes(term))
  );

  if (hasCertification("osha", "10")) setIfPresent(params, "osha1072", "Yes");
  if (hasCertification("lift")) setIfPresent(params, "liftCert", "Yes");
  if (hasCertification("fall", "protection")) setIfPresent(params, "fallProtection", "Yes");
  if (hasCertification("harness") || hasCertification("lanyard")) {
    setIfPresent(params, "harnessampamp", "Yes");
  }

  const query = params.toString();
  return query ? `${CTS_JOTFORM_FORM_URL}?${query}` : CTS_JOTFORM_FORM_URL;
}
