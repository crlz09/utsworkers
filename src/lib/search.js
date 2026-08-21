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

export function getSearchableDateValues(value) {
  if (!value) return [];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return [value];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  const paddedMonth = String(month).padStart(2, "0");
  const paddedDay = String(day).padStart(2, "0");
  return [
    `${month}/${day}/${year}`,
    `${paddedMonth}/${paddedDay}/${year}`,
    `${year}-${paddedMonth}-${paddedDay}`,
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    date.toLocaleString("en-US"),
  ];
}
