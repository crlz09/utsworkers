// Browser checks use an isolated mock API; database/RLS checks run separately.
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
const { chromium } = await import(
  process.env.UTS_PLAYWRIGHT_MODULE || "playwright"
);
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const host = new URL(env.match(/^VITE_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)[1])
  .hostname;
const user = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "admin@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-10-09T00:00:00Z",
};
const today = new Date();
const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
const candidate = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Carlos Example",
};
const project = {
  id: "00000000-0000-4000-8000-000000000003",
  level_type: "Electrician",
};
let counter = 10;
const uuid = () =>
  `00000000-0000-4000-8000-${String(counter++).padStart(12, "0")}`;
const makeTask = (title, status, position, due_date = null) => ({
  id: uuid(),
  title,
  status,
  position,
  due_date,
  description: "",
  priority: "normal",
  checklist: [],
  assignee_id: null,
  worker_id: null,
  job_id: null,
  worker: null,
  job: null,
  archived_at: null,
  created_by: user.id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});
let tasks = [
  makeTask("Call recent registrations", "pending", 1024, dateKey),
  makeTask("Follow up sourced candidates", "in_progress", 2048, yesterdayKey),
  makeTask("Complete CTS form", "waiting", 3072),
];
let notes = [],
  files = [],
  conflict = false,
  failLoad = false,
  failUpload = false,
  failComment = false;
let sharedNotes = [
  {
    id: uuid(),
    title: "Team handoff",
    body: "Vetting finished. Review CTS tomorrow.",
    revision: 1,
    archived_at: null,
    created_by: "other",
    created_by_name: "Maria Example",
    created_at: new Date().toISOString(),
    updated_by: null,
    updated_by_name: null,
    updated_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    title: "Project reminder",
    body: "Confirm crew availability.",
    revision: 1,
    archived_at: null,
    created_by: "other",
    created_by_name: "Maria Example",
    created_at: new Date().toISOString(),
    updated_by: null,
    updated_by_name: null,
    updated_at: new Date().toISOString(),
  },
];
let noteReads = [],
  noteConflict = false;
const noteCount = () =>
  sharedNotes.filter(
    (n) =>
      !n.archived_at &&
      n.revision >
        (noteReads.find((r) => r.note_id === n.id && r.user_id === user.id)
          ?.seen_revision || 0),
  ).length;
const errors = [];
const requests = [];
const browser = await chromium.launch({
  headless: true,
  ...(process.env.UTS_CHROME_PATH
    ? { executablePath: process.env.UTS_CHROME_PATH }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1600, height: 1050 },
  reducedMotion: "reduce",
});
const part = Buffer.from(
  JSON.stringify({
    sub: user.id,
    aud: "authenticated",
    role: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600,
  }),
).toString("base64url");
await context.addInitScript(
  ({ key, user, part }) =>
    localStorage.setItem(
      key,
      JSON.stringify({
        access_token: `e30.${part}.mock`,
        refresh_token: "mock",
        token_type: "bearer",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        user,
      }),
    ),
  { key: `sb-${host.split(".")[0]}-auth-token`, user, part },
);
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP9sAAAAASUVORK5CYII=",
  "base64",
);
await context.route(`https://${host}/**`, async (route) => {
  const req = route.request(),
    url = new URL(req.url()),
    path = url.pathname;
  const fulfill = (data, status = 200, headers = {}) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
      headers,
    });
  if (path.includes("/auth/v1/user")) return fulfill(user);
  if (path.endsWith("/rpc/planner_team_members"))
    return fulfill([
      { user_id: user.id, full_name: "Andrea Example", email: user.email },
    ]);
  if (path.endsWith("/rpc/planner_note_unread_count"))
    return fulfill(noteCount());
  if (path.includes("/rpc/")) return fulfill(null);
  if (path.includes("/storage/v1/object/sign/") && req.method() === "POST") {
    const paths = req.postDataJSON().paths;
    return fulfill(
      paths.map((p) => ({
        path: p,
        signedURL: `/object/sign/planner-images/${p}?token=mock`,
      })),
    );
  }
  if (path.includes("/storage/v1/object/")) {
    if (req.method() === "POST")
      return failUpload
        ? fulfill({ message: "Upload failed" }, 500)
        : fulfill({ Key: "planner-images/mock" });
    if (req.method() === "DELETE") return fulfill([]);
    return route.fulfill({ contentType: "image/png", body: tinyPng });
  }
  const table = path.split("/").at(-1);
  const body = ["POST", "PATCH"].includes(req.method())
    ? req.postDataJSON()
    : null;
  if (table === "planner_notes") {
    if (req.method() === "POST") {
      const n = {
        ...body,
        id: uuid(),
        revision: 1,
        archived_at: null,
        created_by: user.id,
        created_by_name: "Andrea Example",
        created_at: new Date().toISOString(),
        updated_by: null,
        updated_by_name: null,
        updated_at: new Date().toISOString(),
      };
      sharedNotes.unshift(n);
      return fulfill(n, 201);
    }
    if (req.method() === "PATCH") {
      if (noteConflict) {
        noteConflict = false;
        return fulfill(null);
      }
      const n = sharedNotes.find(
        (n) => n.id === url.searchParams.get("id").slice(3),
      );
      Object.assign(n, body, {
        revision: n.revision + 1,
        updated_by: user.id,
        updated_by_name: "Andrea Example",
        updated_at: new Date().toISOString(),
      });
      return fulfill(n);
    }
    return fulfill(sharedNotes);
  }
  if (table === "planner_note_reads") {
    if (req.method() === "POST") {
      const found = noteReads.find(
        (r) => r.note_id === body.note_id && r.user_id === body.user_id,
      );
      if (found)
        found.seen_revision = Math.max(found.seen_revision, body.seen_revision);
      else noteReads.push({ ...body });
      return fulfill(null, 201);
    }
    return fulfill(noteReads.filter((r) => r.user_id === user.id));
  }
  if (table === "planner_tasks") {
    if (req.method() === "HEAD")
      return route.fulfill({
        status: 200,
        headers: {
          "content-range": `0-0/${tasks.filter((t) => !t.archived_at && t.status !== "completed").length}`,
        },
      });
    if (req.method() === "POST") {
      requests.push(body);
      const task = {
        ...makeTask(body.title, body.status, body.position),
        ...body,
      };
      task.worker = body.worker_id ? candidate : null;
      task.job = body.job_id ? project : null;
      tasks.push(task);
      return fulfill(task, 201);
    }
    if (req.method() === "PATCH") {
      if (conflict) {
        conflict = false;
        return fulfill(null);
      }
      const id = url.searchParams.get("id").slice(3);
      const task = tasks.find((t) => t.id === id);
      Object.assign(task, body, {
        updated_at: new Date(Date.now() + counter++).toISOString(),
      });
      task.worker = task.worker_id ? candidate : null;
      task.job = task.job_id ? project : null;
      return fulfill(task);
    }
    if (failLoad)
      return fulfill({ message: "Planner temporarily unavailable" }, 500);
    return fulfill(tasks);
  }
  if (table === "planner_comments") {
    if (req.method() === "POST") {
      if (failComment) return fulfill({ message: "Comment failed" }, 500);
      notes.push({
        ...body,
        id: uuid(),
        created_by: user.id,
        created_at: new Date().toISOString(),
      });
      return fulfill(null, 201);
    }
    const taskId = url.searchParams.get("task_id")?.slice(3);
    return fulfill(taskId ? notes.filter((n) => n.task_id === taskId) : notes);
  }
  if (table === "planner_attachments") {
    if (req.method() === "POST") {
      files.push({ ...body, id: uuid(), created_at: new Date().toISOString() });
      return fulfill(null, 201);
    }
    if (req.method() === "DELETE") {
      files = files.filter((f) => f.id !== url.searchParams.get("id").slice(3));
      return fulfill(null, 204);
    }
    const taskId = url.searchParams.get("task_id")?.slice(3);
    return fulfill(taskId ? files.filter((f) => f.task_id === taskId) : files);
  }
  if (table === "admin_permissions")
    return fulfill({
      user_id: user.id,
      can_edit_workers: true,
      can_delete_workers: true,
    });
  if (table === "workers")
    return fulfill(url.searchParams.has("name") ? [candidate] : []);
  if (table === "cts_jobs") return fulfill([project]);
  if (table === "client_users") return fulfill(null);
  return fulfill([]);
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5173/admin/notifications");
await page.waitForURL("**/admin/planner");
await page.getByRole("heading", { name: "Planner", exact: true }).waitFor();
await page
  .getByRole("button", { name: "Call recent registrations", exact: true })
  .waitFor();
assert.equal(await page.locator(".planner-column").count(), 5);
await page
  .getByRole("button", { name: "Add task to To do", exact: true })
  .click();
await page
  .getByRole("textbox", { name: "New task in To do" })
  .fill("Quick call");
await page.getByRole("textbox", { name: "New task in To do" }).press("Enter");
await page.getByRole("button", { name: "Quick call", exact: true }).waitFor();
await page.getByRole("button", { name: "New task", exact: true }).click();
const dialog = page.getByRole("dialog");
await dialog
  .getByLabel("Task title", { exact: true })
  .fill("Prepare candidate for CTS");
await dialog.getByLabel("Assigned to", { exact: true }).selectOption(user.id);
await dialog.getByLabel("Due date", { exact: true }).fill(dateKey);
await dialog
  .getByLabel("Notes", { exact: true })
  .fill("Vetting completed. OSHA10 ready.");
await dialog.getByLabel("Priority", { exact: true }).selectOption("high");
await dialog.getByLabel("New checklist item").fill("Review OSHA10");
await dialog.getByLabel("New checklist item").press("Enter");
await dialog.getByRole("checkbox", { name: "Review OSHA10" }).check();
await dialog.getByLabel("Candidate", { exact: true }).fill("Carlos");
await dialog
  .getByRole("button", { name: "Carlos Example", exact: true })
  .click();
await dialog.getByLabel("Project", { exact: true }).fill("Electric");
await dialog.getByRole("button", { name: "Electrician", exact: true }).click();
await dialog.locator("input[type=file]").setInputFiles({
  name: "first-image.png",
  mimeType: "image/png",
  buffer: tinyPng,
});
await dialog.locator(".planner-image-grid img").waitFor();
await page.waitForFunction(
  () => !document.querySelector("dialog input[type=file]").disabled,
);
assert.equal(files.length, 0, "New images are staged until task creation");
await dialog.getByRole("button", { name: "Create task", exact: true }).click();
await page
  .getByRole("button", { name: "Prepare candidate for CTS", exact: true })
  .waitFor();
assert.equal(requests.at(-1).worker_id, candidate.id);
assert.equal(requests.at(-1).checklist[0].done, true);
await page
  .getByRole("button", { name: "Prepare candidate for CTS", exact: true })
  .click();
await dialog
  .getByLabel("New comment")
  .fill("Called candidate. Available Monday.");
await dialog.getByRole("button", { name: "Post comment" }).click();
await dialog
  .getByText("Called candidate. Available Monday.", { exact: true })
  .waitFor();
await page.waitForFunction(
  () => !document.querySelector("dialog input[type=file]").disabled,
);
await dialog.locator("input[type=file]").setInputFiles({
  name: "osha10.png",
  mimeType: "image/png",
  buffer: tinyPng,
});
await page.waitForFunction(
  () =>
    document.querySelectorAll("dialog .planner-image-grid img").length === 2,
);
assert.equal(files.length, 2);
await dialog.getByRole("button", { name: "Close task" }).click();
await page
  .getByRole("combobox", {
    name: "Move Prepare candidate for CTS",
    exact: true,
  })
  .selectOption("in_progress");
await page.waitForFunction(
  () =>
    document.querySelector('[aria-label="Move Prepare candidate for CTS"]')
      .value === "in_progress",
);
await page.getByRole("button", { name: /^My tasks/ }).click();
assert.equal(await page.locator(".planner-card").count(), 1);
await page.getByRole("button", { name: /^Overdue/ }).click();
await page
  .getByRole("button", { name: "Follow up sourced candidates", exact: true })
  .waitFor();
assert.equal(await page.locator(".planner-card").count(), 1);
await page.getByRole("button", { name: /^All tasks/ }).click();
await page.getByRole("textbox", { name: "Search tasks" }).fill("osha10");
assert.equal(await page.locator(".planner-card").count(), 1);
await page.getByRole("button", { name: "Clear search" }).click();
await page
  .getByRole("button", {
    name: "Complete Prepare candidate for CTS",
    exact: true,
  })
  .click();
await page
  .getByRole("button", {
    name: "Reopen Prepare candidate for CTS",
    exact: true,
  })
  .waitFor();
await page
  .getByRole("button", { name: "Prepare candidate for CTS", exact: true })
  .click();
await dialog.getByRole("button", { name: "Archive", exact: true }).click();
await page.getByRole("button", { name: "Undo", exact: true }).click();
await page
  .getByRole("button", { name: "Prepare candidate for CTS", exact: true })
  .waitFor();
// Drag cards between columns and verify persisted destination.
await page
  .getByRole("button", { name: "Quick call", exact: true })
  .locator("xpath=ancestor::article")
  .dragTo(page.locator('.planner-column[aria-label="Waiting"]'));
await page.waitForFunction(
  () =>
    document.querySelector('[aria-label="Move Quick call"]').value ===
    "waiting",
);
// Optimistic concurrency: preserve draft and show an actionable conflict.
await page.getByRole("button", { name: "Quick call", exact: true }).click();
await dialog.getByLabel("Notes", { exact: true }).fill("Unsaved draft");
conflict = true;
await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
await dialog.getByText(/Someone updated this task/).waitFor();
assert.equal(
  await dialog.getByLabel("Notes", { exact: true }).inputValue(),
  "Unsaved draft",
);
page.once("dialog", (d) => d.accept());
await dialog.getByRole("button", { name: "Close task" }).click();
failLoad = true;
await page.getByRole("button", { name: "Refresh board" }).click();
await page
  .getByText("Planner temporarily unavailable", { exact: true })
  .waitFor();
failLoad = false;
await page.getByRole("button", { name: "Retry", exact: true }).click();
await page
  .getByText("Planner temporarily unavailable", { exact: true })
  .waitFor({ state: "hidden" });
// Creation remains recoverable if image upload fails after the task was saved.
await page.getByRole("button", { name: "New task", exact: true }).click();
await dialog
  .getByLabel("Task title", { exact: true })
  .fill("Task with upload retry");
await dialog
  .locator("input[type=file]")
  .setInputFiles({ name: "retry.png", mimeType: "image/png", buffer: tinyPng });
await dialog.locator(".planner-image-grid img").waitFor();
await page.waitForFunction(
  () => !document.querySelector("dialog input[type=file]").disabled,
);
const before = tasks.length;
failUpload = true;
await dialog.getByRole("button", { name: "Create task", exact: true }).click();
await dialog.getByText("Upload failed", { exact: true }).waitFor();
assert.equal(tasks.length, before + 1);
failUpload = false;
await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
await dialog.waitFor({ state: "hidden" });
assert.equal(
  tasks.length,
  before + 1,
  "Retry must not create a duplicate task",
);
await page.locator(".planner-board").evaluate((el) => (el.scrollLeft = 0));
mkdirSync("tmp/planner-verification", { recursive: true });
await page.screenshot({
  path: "tmp/planner-verification/desktop.png",
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("button", { name: "List view" }).click();
await page.screenshot({
  path: "tmp/planner-verification/mobile.png",
  fullPage: true,
});
await page.getByRole("button", { name: "New task", exact: true }).click();
await dialog.getByLabel("Task title", { exact: true }).fill("Mobile task");
await dialog.getByRole("button", { name: "Create task", exact: true }).click();
await page.getByRole("button", { name: "Mobile task", exact: true }).waitFor();
await page.reload();
await page.getByRole("button", { name: "Mobile task", exact: true }).waitFor();
// Shared quick notes: opening the panel must not mark the list as read.
await page.setViewportSize({ width: 1600, height: 1050 });
await page.locator(".quick-notes-trigger").click();
const noteDialog = page.getByRole("dialog", { name: /Quick notes/ });
await noteDialog.locator(".quick-note-card").first().waitFor();
assert.equal(noteCount(), 2);
assert.equal(await noteDialog.locator(".quick-note-card.unread").count(), 2);
await noteDialog
  .locator(".quick-note-open")
  .filter({ hasText: "Team handoff" })
  .click();
await noteDialog.locator(".quick-note-full").waitFor();
await page.waitForFunction(() =>
  document
    .querySelector(".quick-notes-trigger")
    .getAttribute("aria-label")
    .includes("1 unread"),
);
await noteDialog
  .getByRole("button", { name: "Edit note", exact: true })
  .click();
await noteDialog
  .getByLabel("Note text", { exact: true })
  .fill("CTS reviewed by Andrea.");
await noteDialog
  .getByRole("button", { name: "Save note", exact: true })
  .click();
await noteDialog
  .locator(".quick-note-full > p")
  .filter({ hasText: "CTS reviewed by Andrea." })
  .waitFor();
await page.waitForFunction(
  () =>
    Boolean(document.querySelector(".quick-note-full-actions button")) &&
    !document.querySelector(".quick-note-full-actions button").disabled,
);
assert.match(
  await noteDialog.locator(".quick-note-attribution").innerText(),
  /Created by Maria Example/,
);
assert.match(
  await noteDialog.locator(".quick-note-attribution").innerText(),
  /Modified by Andrea Example/,
);
// A teammate edit reappears as unread, and does not replace an open version.
const changedNote = sharedNotes.find((n) => n.title === "Team handoff");
Object.assign(changedNote, {
  body: "Maria added a new update.",
  revision: changedNote.revision + 1,
  updated_by_name: "Maria Example",
});
await page.evaluate(() => window.dispatchEvent(new Event("focus")));
await noteDialog.getByRole("button", { name: "Read latest version" }).waitFor();
await noteDialog.getByRole("button", { name: "Read latest version" }).click();
await noteDialog
  .getByText("Maria added a new update.", { exact: true })
  .waitFor();
await page.waitForFunction(() =>
  document
    .querySelector(".quick-notes-trigger")
    .getAttribute("aria-label")
    .includes("1 unread"),
);
await noteDialog
  .getByRole("button", { name: "Edit note", exact: true })
  .click();
await noteDialog
  .getByLabel("Note text", { exact: true })
  .fill("Keep this draft on conflict.");
noteConflict = true;
await noteDialog
  .getByRole("button", { name: "Save note", exact: true })
  .click();
await noteDialog
  .getByText(/This note was modified by someone else/)
  .waitFor({ timeout: 5000 })
  .catch(async (e) => {
    console.log(
      "Note conflict failure",
      noteConflict,
      await noteDialog.innerText(),
    );
    throw e;
  });
assert.equal(
  await noteDialog.getByLabel("Note text", { exact: true }).inputValue(),
  "Keep this draft on conflict.",
);
page.once("dialog", (d) => d.accept());
await noteDialog
  .getByRole("button", { name: "All notes", exact: true })
  .click();
await noteDialog
  .locator(".quick-note-open")
  .filter({ hasText: "Project reminder" })
  .click();
await noteDialog.getByRole("button", { name: "Archive", exact: true }).click();
await noteDialog.getByRole("button", { name: "Undo", exact: true }).click();
await noteDialog
  .locator(".quick-note-open")
  .filter({ hasText: "Project reminder" })
  .waitFor();
assert.equal(noteCount(), 0);
await noteDialog.getByRole("button", { name: "New note", exact: true }).click();
await noteDialog
  .getByLabel("Note title", { exact: true })
  .fill("New team note");
await noteDialog
  .getByLabel("Note text", { exact: true })
  .fill("Call the new applicants this afternoon.");
await noteDialog
  .getByRole("button", { name: "Save note", exact: true })
  .click();
await noteDialog
  .getByText("Call the new applicants this afternoon.", { exact: true })
  .waitFor();
await page.waitForFunction(
  () =>
    document.querySelector(
      ".quick-notes-dialog .quick-note-full-actions button",
    )?.disabled === false,
);
assert.equal(noteCount(), 0, "Your own saved note is already read for you");
await noteDialog
  .getByRole("button", { name: "All notes", exact: true })
  .click();
await noteDialog.getByLabel("Search quick notes").fill("afternoon");
assert.equal(await noteDialog.locator(".quick-note-card").count(), 1);
await noteDialog.getByLabel("Search quick notes").fill("");
await page.screenshot({
  path: "tmp/planner-verification/quick-notes-desktop.png",
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: "tmp/planner-verification/quick-notes-mobile.png",
  fullPage: true,
});
await noteDialog
  .getByRole("button", { name: "Close quick notes", exact: true })
  .click();
await page.reload();
await page.locator(".quick-notes-trigger").click();
await noteDialog.locator(".quick-note-card").first().waitFor();
assert.equal(
  await noteDialog.locator(".quick-note-card.unread").count(),
  0,
  "Read receipts survive reload",
);
console.log(
  "Quick notes UI passed: shared notes, individual read receipts, edits becoming unread, author/editor dates, creation, search, conflict drafts, archive/undo, mobile and reload.",
);
assert.deepEqual(errors, []);
console.log(
  "Planner UI passed: route redirect, quick/full creation, assignment, dates, checklist, links, comments, private images, filters, completion, archive/undo, drag, conflict protection, retry, mobile and reload.",
);
await browser.close();
