import test from "node:test";
import assert from "node:assert/strict";
import { parseCtsHoursRows } from "../src/lib/ctsHoursImport.js";

test("converts numeric Excel dates to ISO dates", () => {
  const rows = [
    ["Type", "Date", "Num", "Memo", "Name", "Qty"],
    ["Employee, Test", "", "", "", "", ""],
    ["Invoice", 46236, 1234, "JM Electricians", "CTS", 40],
  ];

  const parsed = parseCtsHoursRows(rows, []);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].week_ending_date, "2026-08-02");
  assert.equal(parsed[0].regular_hours, 40);
});

test("imports employee-grouped CTS exports without Type or Num and skips totals", () => {
  const date = new Date("2026-10-04T00:00:00Z");
  const rows = [
    [null, "Date", "Memo", "Name", "Qty"],
    ["Employee, First", null, null, null, null],
    [null, date, "Project", "Customer A", 40],
    [null, date, "Project - OT", "Customer A", 8],
    [null, date, "Project - DT", "Customer A", 2],
    [null, date, "Project", "Customer B", 6],
    ["Total Employee, First", null, null, null, 56],
    ["Employee, Second", null, null, null, null],
    [null, date, "Project", "Customer A", 32],
    ["Total Employee, Second", null, null, null, 32],
    [null, null, null, null, 88],
  ];

  const parsed = parseCtsHoursRows(rows, []);

  assert.deepEqual(parsed.map((row) => [
    row.source_row_key, row.source_employee_name, row.week_ending_date,
    row.source_customer, row.source_invoice_number, row.regular_hours,
    row.overtime_hours, row.double_time_hours,
  ]), [
    ["3", "Employee, First", "2026-10-04", "Customer A", "", 40, 8, 2],
    ["6", "Employee, First", "2026-10-04", "Customer B", "", 6, 0, 0],
    ["9", "Employee, Second", "2026-10-04", "Customer A", "", 32, 0, 0],
  ]);
});
