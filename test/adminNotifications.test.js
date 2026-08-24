import test from "node:test";
import assert from "node:assert/strict";
import { buildAdminNotifications } from "../src/lib/adminNotifications.js";

const baseWorker = {
  id: "worker-1",
  name: "Test Candidate",
  created_at: "2026-08-24T15:00:00Z",
  admin_reviewed_at: null,
  vetting_completed_at: null,
  worker_documents: [],
};

test("shows only registered and vetting-pending notifications before vetting", () => {
  const notifications = buildAdminNotifications({ workers: [baseWorker] });
  assert.deepEqual(notifications.map((item) => item.type).sort(), ["registered", "vetting_pending"]);
});

test("does not rebuild notifications for candidates from before the reset", () => {
  const notifications = buildAdminNotifications({
    workers: [{ ...baseWorker, created_at: "2026-08-24T12:00:00Z" }],
  });
  assert.deepEqual(notifications, []);
});

test("shows documents pending only after vetting is completed", () => {
  const notifications = buildAdminNotifications({
    workers: [{ ...baseWorker, admin_reviewed_at: "2026-08-24T15:30:00Z", vetting_completed_at: "2026-08-24T16:00:00Z" }],
  });
  assert.deepEqual(notifications.map((item) => item.type), ["documents_pending"]);
  assert.match(notifications[0].body, /State ID or Driver License/);
  assert.match(notifications[0].body, /Social Security Card/);
});

test("hides documents pending when both required two-sided documents are complete", () => {
  const workerDocuments = [
    { document_type: "State ID or Driver License - Front" },
    { document_type: "State ID or Driver License - Back" },
    { document_type: "Social Security Card - Front" },
    { document_type: "Social Security Card - Back" },
  ];
  const notifications = buildAdminNotifications({
    workers: [{ ...baseWorker, admin_reviewed_at: "2026-08-24T15:30:00Z", vetting_completed_at: "2026-08-24T16:00:00Z", worker_documents: workerDocuments }],
  });
  assert.deepEqual(notifications, []);
});

test("maps persistent handoffs to vetting-completed notifications", () => {
  const notifications = buildAdminNotifications({
    recruiterNotifications: [{
      id: "notification-1",
      worker_id: "worker-1",
      title: "Vetting completed: Test Candidate",
      body: "Maria completed vetting.",
      created_at: "2026-08-24T14:00:00Z",
    }],
  });
  assert.equal(notifications[0].type, "vetting_completed");
  assert.equal(notifications[0].meta.persistent, true);
});
