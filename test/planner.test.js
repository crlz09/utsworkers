import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dueState,
  localDateKey,
  matchesPlannerFilter,
  positionBetween,
  validatePlannerImage,
} from "../src/lib/planner.js";
test("date-only deadlines use the local calendar and completed tasks never overdue", () => {
  assert.equal(localDateKey(new Date(2026, 9, 9, 23, 59)), "2026-10-09");
  assert.equal(
    dueState({ due_date: "2026-10-08", status: "pending" }, "2026-10-09"),
    "overdue",
  );
  assert.equal(
    dueState({ due_date: "2026-10-09", status: "pending" }, "2026-10-09"),
    "today",
  );
  assert.equal(
    dueState({ due_date: "2026-10-08", status: "completed" }, "2026-10-09"),
    "",
  );
  assert.equal(
    dueState(
      { due_date: "2026-10-08", status: "pending", archived_at: "now" },
      "2026-10-09",
    ),
    "",
  );
});
test("task filters combine ownership, deadlines and case-insensitive notes search", () => {
  const task = {
    title: "Call Carlos",
    description: "OSHA10 ready",
    assignee_id: "a",
    due_date: "2026-10-09",
    status: "pending",
  };
  assert.equal(
    matchesPlannerFilter(task, { filter: "mine", userId: "b" }),
    false,
  );
  assert.equal(
    matchesPlannerFilter(task, {
      filter: "today",
      today: "2026-10-09",
      query: "osha10",
    }),
    true,
  );
  assert.equal(
    matchesPlannerFilter(task, { filter: "overdue", today: "2026-10-09" }),
    false,
  );
  assert.equal(matchesPlannerFilter(task, { filter: "unassigned" }), false);
});
test("drag ordering allows prepend, insert and append without touching other cards", () => {
  assert.ok(positionBetween(null, 1024) < 1024);
  assert.equal(positionBetween(1024, 2048), 1536);
  assert.ok(positionBetween(2048, null) > 2048);
});
test("uploads reject oversized images and unsupported active formats", () => {
  assert.throws(
    () => validatePlannerImage({ type: "image/svg+xml", size: 1 }),
    /Choose/,
  );
  assert.throws(
    () => validatePlannerImage({ type: "image/png", size: 10485761 }),
    /10 MB/,
  );
  assert.doesNotThrow(() =>
    validatePlannerImage({ type: "image/png", size: 10485760 }),
  );
});
