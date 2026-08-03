function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function nameTokens(value) {
  return normalizeText(value).split(/\s+/).filter((token) => token.length > 1);
}

function tokensMatch(left, right) {
  if (left === right) return true;
  if (left.length < 5 || right.length < 5 || Math.abs(left.length - right.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) { i += 1; j += 1; continue; }
    edits += 1;
    if (edits > 1) return false;
    if (left.length > right.length) i += 1;
    else if (right.length > left.length) j += 1;
    else { i += 1; j += 1; }
  }
  return edits + (left.length - i) + (right.length - j) <= 1;
}

function matchingTokenCount(leftTokens, rightTokens) {
  return leftTokens.filter((left) => rightTokens.some((right) => tokensMatch(left, right))).length;
}

function overlapScore(left, right) {
  const a = new Set(nameTokens(left));
  const b = new Set(nameTokens(right));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  a.forEach((token) => { if ([...b].some((other) => tokensMatch(token, other))) overlap += 1; });
  return overlap / Math.min(a.size, b.size);
}

function toIsoDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : toIsoDate(parsed);
}

function hoursType(memo) {
  if (/\s-\s*DT\s*$/i.test(memo)) return "double_time_hours";
  if (/\s-\s*OT\s*$/i.test(memo)) return "overtime_hours";
  return "regular_hours";
}

function baseMemo(memo) {
  return String(memo || "").replace(/\s-\s*(?:OT|DT)\s*$/i, "").trim();
}

function bestAssignment(sourceName, memo, assignments) {
  const workerScores = new Map();
  const sourceTokens = nameTokens(sourceName);
  assignments.forEach((assignment) => {
    const score = overlapScore(sourceName, assignment.name);
    const assignmentTokens = nameTokens(assignment.name);
    const overlap = matchingTokenCount(sourceTokens, assignmentTokens);
    if (overlap >= 2) {
      workerScores.set(assignment.worker_id, Math.max(workerScores.get(assignment.worker_id) || 0, overlap * 10 + score));
    }
  });
  if (!workerScores.size) return "";
  const bestWorker = [...workerScores.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const options = assignments.filter((assignment) => assignment.worker_id === bestWorker);
  return options.sort((a, b) => {
    const aProject = overlapScore(memo, a.project) + (a.candidate_status === "placed" ? 0.1 : 0);
    const bProject = overlapScore(memo, b.project) + (b.candidate_status === "placed" ? 0.1 : 0);
    return bProject - aProject;
  })[0]?.id || "";
}

export function parseCtsHoursRows(sheetRows, assignments) {
  const headerRowIndex = sheetRows.findIndex((row) => {
    const labels = row.map((cell) => normalizeText(cell));
    return labels.includes("type") && labels.includes("date") && labels.includes("memo") && labels.includes("qty");
  });
  if (headerRowIndex < 0) throw new Error("The CTS spreadsheet headers (Type, Date, Memo, Qty) were not found.");

  const headers = sheetRows[headerRowIndex].map((cell) => normalizeText(cell));
  const typeIndex = headers.indexOf("type");
  const dateIndex = headers.indexOf("date");
  const invoiceIndex = headers.indexOf("num");
  const memoIndex = headers.indexOf("memo");
  const customerIndex = headers.indexOf("name");
  const qtyIndex = headers.indexOf("qty");
  const grouped = new Map();
  let currentEmployee = "";

  sheetRows.slice(headerRowIndex + 1).forEach((row, rowOffset) => {
    const type = normalizeText(row[typeIndex]);
    if (type !== "invoice") {
      const employeeCell = row.find((cell) => typeof cell === "string" && cell.includes(",") && !/^total\s/i.test(cell.trim()));
      if (employeeCell) currentEmployee = employeeCell.trim();
      return;
    }

    const weekEnding = toIsoDate(row[dateIndex]);
    const memo = String(row[memoIndex] || "").trim();
    const qty = Number(row[qtyIndex] || 0);
    if (!currentEmployee || !weekEnding || !Number.isFinite(qty) || qty <= 0) return;

    const cleanMemo = baseMemo(memo);
    const invoiceNumber = String(row[invoiceIndex] || "").replace(/\.0$/, "").trim();
    const key = [currentEmployee, weekEnding, invoiceNumber, cleanMemo].join("|");
    const existing = grouped.get(key) || {
      source_row_key: String(rowOffset + headerRowIndex + 2),
      source_employee_name: currentEmployee,
      source_memo: cleanMemo,
      source_customer: String(row[customerIndex] || "").trim(),
      source_invoice_number: invoiceNumber,
      week_ending_date: weekEnding,
      regular_hours: 0,
      overtime_hours: 0,
      double_time_hours: 0,
      assignmentId: bestAssignment(currentEmployee, cleanMemo, assignments),
    };
    existing[hoursType(memo)] += qty;
    grouped.set(key, existing);
  });

  const parsed = [...grouped.values()];
  if (!parsed.length) throw new Error("No billable CTS hours were found in this spreadsheet.");
  return parsed;
}

export function importedHoursTotal(row) {
  return Number(row.regular_hours || 0) + Number(row.overtime_hours || 0) + Number(row.double_time_hours || 0);
}
