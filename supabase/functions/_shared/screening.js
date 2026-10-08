// Shared by the browser and Edge Functions. No credentials or runtime-specific APIs.
export const SCREENING_BUCKET = "candidate-screenings";
export const MAILBOX = "cmolina@universaltalentsource.com";
export const SCREENING_STAGES = [
  ["received", "Order received"],
  ["sent", "Instructions sent"],
  ["attendance_reported", "Attendance reported"],
  ["result_received", "Result received"],
];
export const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();
export const extractEmails = (value) => [
  ...new Set(
    (
      String(value || "").match(
        /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
      ) || []
    ).map(normalizeEmail),
  ),
];
export function parseScreening({
  subject = "",
  text = "",
  to = "",
  filename = "",
}) {
  const cleanSubject = subject.replace(/^(?:(?:fw|fwd|re):\s*)+/i, "");
  const candidateName = cleanSubject
    .split(/\s+-\s+COMMERCIAL TRADE SOURCE/i)[0]
    .trim();
  const confirmation =
    text.match(/confirmation\s*#?\s*(?:is)?\s*:\s*([A-Z0-9-]+)/i)?.[1] ||
    filename.match(/#([A-Z0-9-]+)\.pdf$/i)?.[1] ||
    "";
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const confirmationIndex = lines.findIndex((line) =>
    /confirmation.*:/i.test(line),
  );
  const locationLines =
    confirmationIndex >= 0
      ? lines.slice(confirmationIndex + 1).filter(Boolean)
      : [];
  const phoneIndex = locationLines.findIndex((line) => /^Phone:/i.test(line));
  const recipients = extractEmails(to).filter(
    (email) =>
      email !== MAILBOX && !email.endsWith("@commercialtradesource.com"),
  );
  return {
    candidate_name: candidateName,
    recipient_email: recipients.length === 1 ? recipients[0] : "",
    confirmation_number: confirmation.toUpperCase(),
    lab_name: phoneIndex >= 2 ? locationLines[0] : "",
    lab_address:
      phoneIndex >= 2 ? locationLines.slice(1, phoneIndex).join(", ") : "",
    lab_phone: text.match(/Phone:\s*([^\r\n]+)/i)?.[1]?.trim() || "",
    testing_hours:
      text.match(/Testing Hours\s*[-–:]?\s*([^\r\n]+)/i)?.[1]?.trim() || "",
    change_contact:
      text
        .match(/please contact\s+([^\r\n]+?)\s+with your request/i)?.[1]
        ?.trim() || "",
  };
}
export function matchCandidate(workers, email) {
  const matches = email
    ? workers.filter(
        (worker) => normalizeEmail(worker.email) === normalizeEmail(email),
      )
    : [];
  return matches.length === 1 ? matches[0] : null;
}
export function screeningStage(order) {
  if (order.result_received_at) return "result_received";
  if (order.attendance_reported_at) return "attendance_reported";
  if (order.sent_at) return "sent";
  return "received";
}
export function buildScreeningEmail(order, worker, language = "es") {
  const spanish = language === "es";
  const name = worker.name || order.candidate_name || "Candidate";
  const details = [
    `${spanish ? "Laboratorio" : "Lab"}: ${order.lab_name}`,
    `${spanish ? "Dirección" : "Address"}: ${order.lab_address}`,
    order.lab_phone && `${spanish ? "Teléfono" : "Phone"}: ${order.lab_phone}`,
    `${spanish ? "Confirmación" : "Confirmation"}: ${order.confirmation_number}`,
    order.testing_hours &&
      `${spanish ? "Horario de pruebas según la orden" : "Testing hours provided with the order"}: ${order.testing_hours}`,
  ]
    .filter(Boolean)
    .join("\n");
  const subject = spanish
    ? `${name}, instrucciones para tu drug test — UTS`
    : `${name}, your drug test instructions — UTS`;
  const body = spanish
    ? `Hola ${name},\n\nTe compartimos las instrucciones para completar tu prueba de drogas previa al empleo.\n\nPor favor realiza el test lo más pronto posible.\n\n${details}\n\nConfirma el horario con el laboratorio antes de ir. Lleva una identificación válida con foto, el ePassport adjunto impreso y los documentos que lo acompañan. Sigue las instrucciones del PDF, incluyendo cualquier fecha límite indicada allí.\n\n${order.change_contact ? `Si necesitas cambiar de laboratorio u horario, contacta a ${order.change_contact} o a mí personalmente.\n\n` : ""}Avísanos cuando hayas completado la prueba.\n\nUniversal Talent Source`
    : `Hello ${name},\n\nHere are the instructions for your pre-employment drug screen.\n\nPlease complete the test as soon as possible.\n\n${details}\n\nConfirm the testing hours with the lab before going. Bring a valid photo ID, the attached printed ePassport, and any accompanying documents. Follow the PDF instructions, including any deadline specified there.\n\n${order.change_contact ? `To change the site or scheduled time, contact ${order.change_contact} or me personally.\n\n` : ""}Please let us know when you have completed the test.\n\nUniversal Talent Source`;
  return { subject, body, to: worker.email || "", language };
}
export function validateOrder(order) {
  for (const key of [
    "candidate_name",
    "recipient_email",
    "confirmation_number",
    "lab_name",
    "lab_address",
  ]) {
    if (!String(order[key] || "").trim())
      throw new Error(`Complete ${key.replaceAll("_", " ")} before saving.`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.recipient_email))
    throw new Error("Enter a valid candidate email.");
  if (!/^[A-Z0-9-]{4,80}$/i.test(order.confirmation_number))
    throw new Error("Enter the confirmation number from the ePassport.");
}
export function validatePdf(bytes) {
  if (!bytes.length || bytes.length > 10 * 1024 * 1024)
    throw new Error("Upload a PDF up to 10 MB.");
  if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-")
    throw new Error("The file must be an original PDF.");
}
export const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
export function emailHtml(body) {
  return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;white-space:pre-wrap">${escapeHtml(body)}</div>`;
}

export function validateScreeningResult(bytes) {
  if (!bytes.length || bytes.length > 10 * 1024 * 1024)
    throw new Error("Upload a PDF, JPG, PNG, or WebP file up to 10 MB.");
  if (String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-")
    return { contentType: "application/pdf", extension: "pdf" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { contentType: "image/jpeg", extension: "jpg" };
  if (
    [137, 80, 78, 71, 13, 10, 26, 10].every(
      (value, index) => bytes[index] === value,
    )
  )
    return { contentType: "image/png", extension: "png" };
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return { contentType: "image/webp", extension: "webp" };
  throw new Error("The result must be a PDF, JPG, PNG, or WebP image.");
}
