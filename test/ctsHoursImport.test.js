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
