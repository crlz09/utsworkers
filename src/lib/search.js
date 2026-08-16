export function normalizePhoneDigits(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export function matchesSearchQuery(query, values, phoneValues = []) {
  const textQuery = String(query || "").trim().toLowerCase();
  if (!textQuery) return true;

  const textMatch = values
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(textQuery));
  if (textMatch) return true;

  const phoneQuery = normalizePhoneDigits(textQuery);
  if (phoneQuery.length < 3) return false;

  return phoneValues
    .filter(Boolean)
    .some((value) => normalizePhoneDigits(value).includes(phoneQuery));
}
