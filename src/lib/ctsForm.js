import { PDFDocument } from "pdf-lib";
import { getFullStateName, US_STATE_ABBREVIATIONS } from "./addressLookup.js";
import { formatDateOfBirth, splitName } from "./ctsJotform.js";

export const CTS_FORM_URL = "https://hire.myavionte.com/sonar/v2/careers/integrations/standalone/general?bId=C49sQn8w92E&jbId=aYxC4tDzp1Q&rpid=general";

export async function fillCtsContactPdf(template, candidate) {
  const pdf = await PDFDocument.load(template);
  const form = pdf.getForm();
  const { first, last } = splitName(candidate.name);
  const stateName = getFullStateName(candidate.state).toLowerCase();
  const isUsAddress = Object.values(US_STATE_ABBREVIATIONS).some(
    (state) => state.toLowerCase() === stateName
  ) && /^\d{5}(-\d{4})?$/.test(String(candidate.zip_code ?? "").trim());
  const fields = {
    first_name: first,
    last_name: last,
    Address: candidate.address,
    City: candidate.city,
    Country: candidate.country || (isUsAddress ? "United States of America" : ""),
    state: candidate.state,
    ZipCode: candidate.zip_code,
    date_of_birth: formatDateOfBirth(candidate.date_of_birth),
    mobile: candidate.phone,
    email: candidate.email,
  };

  for (const [name, value] of Object.entries(fields)) {
    const text = String(value ?? "").trim();
    if (text) form.getTextField(name).setText(text);
  }

  // Include field values in the visible page content for resume parsers.
  form.flatten();
  return pdf.save();
}
