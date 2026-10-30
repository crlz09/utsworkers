export function candidateCompensationPayload(values, { required = false } = {}) {
  const rawRate = String(values.rate_snapshot ?? "").trim();
  const paymentType = String(values.payment_type ?? "").trim();
  const rate = rawRate === "" ? null : Number(rawRate);
  if ((required && rate === null) || (rate !== null && (!Number.isFinite(rate) || rate <= 0 || !/^\d+(\.\d{1,2})?$/.test(rawRate)))) {
    throw new Error("Enter a valid rate per hour greater than zero, with up to two decimals.");
  }
  if ((required && !paymentType) || (paymentType && !["W2", "1099"].includes(paymentType))) {
    throw new Error("Choose a payment type: W2 or 1099.");
  }
  return { rate_snapshot: rate, payment_type: paymentType || null };
}

// Legacy profile rates can be free text; only unambiguous hourly values prefill.
export function profileRateForAssignment(value) {
  const raw = String(value ?? "").trim().replace(/^\$\s*/, "").replace(/\s*(?:\/\s*(?:hr|hour)|per hour)\s*$/i, "").trim();
  return /^\d+(\.\d{1,2})?$/.test(raw) && Number(raw) > 0 ? String(Number(raw)) : "";
}

// Per diem belongs to the CTS assignment; retain existing amount/unit formats.
export function perDiemValue(value) {
  const text = String(value ?? "").trim();
  return !text || /^no$/i.test(text) || /^\$?0+(?:\.0+)?$/.test(text) ? "NO" : text;
}
