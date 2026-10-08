// Local browser verification. Supabase and Storage requests are mocked.
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
  created_at: "2026-10-07T00:00:00Z",
};
const candidate = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Example Candidate",
  email: "candidate@example.com",
};
let admin = true;
const errors = [];
const browser = await chromium.launch({
  headless: true,
  ...(process.env.UTS_CHROME_PATH
    ? { executablePath: process.env.UTS_CHROME_PATH }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
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
const secondCandidate = {
  ...candidate,
  id: "00000000-0000-4000-8000-000000000003",
  name: "Second Candidate",
  email: "second@example.com",
};
const certificates = [
  {
    id: "old-osha",
    worker_id: candidate.id,
    document_type: "OSHA Card - Front",
    file_name: "existing-osha.pdf",
    file_path: "existing-osha.pdf",
    file_type: "application/pdf",
    file_size: 10,
    uploaded_at: "2026-10-07T00:00:00Z",
  },
];
let failInsert = false,
  removed = 0;
await context.route(`https://${host}/**`, async (route) => {
  const request = route.request(),
    url = new URL(request.url());
  const fulfill = (data, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  if (url.pathname.includes("/auth/v1/user")) return fulfill(user);
  if (url.pathname.includes("/storage/v1/object/sign/"))
    return fulfill({
      signedURL: "/object/sign/worker-documents/example.pdf?token=mock",
    });
  if (url.pathname.includes("/storage/v1/object/")) {
    if (request.method() === "POST")
      return fulfill({ Key: "worker-documents/file.pdf", Id: "file" });
    if (request.method() === "DELETE") {
      removed++;
      return fulfill([]);
    }
    return route.fulfill({
      contentType: "application/pdf",
      body: "%PDF-1.4\nmock",
    });
  }
  if (url.pathname.endsWith("/worker_documents")) {
    if (request.method() === "POST") {
      if (failInsert) {
        failInsert = false;
        return fulfill({ message: "Could not save metadata" }, 400);
      }
      const row = request.postDataJSON();
      if (Array.isArray(row)) {
        const rows = row.map((item) => ({
          ...item,
          id: crypto.randomUUID(),
          uploaded_at: new Date().toISOString(),
        }));
        certificates.push(...rows);
        return fulfill(rows, 201);
      }
      certificates.push({ ...row, uploaded_at: new Date().toISOString() });
      return fulfill(null, 201);
    }
    if (request.method() === "DELETE") {
      const ids = url.searchParams.get("id") || "";
      for (let i = certificates.length - 1; i >= 0; i--)
        if (ids.includes(certificates[i].id)) certificates.splice(i, 1);
      return fulfill(null);
    }
    const id = (url.searchParams.get("id") || "").replace("eq.", "");
    if (id) return fulfill(certificates.filter((doc) => doc.id === id));
    const workerId = (url.searchParams.get("worker_id") || "").replace(
      "eq.",
      "",
    );
    return fulfill(certificates.filter((doc) => doc.worker_id === workerId));
  }
  if (url.pathname.endsWith("/workers")) {
    if (url.searchParams.has("auth_user_id")) return fulfill(null);
    if (url.searchParams.has("id"))
      return fulfill(
        [candidate, secondCandidate].find(
          (doc) => `eq.${doc.id}` === url.searchParams.get("id"),
        ),
      );
    const q = (
      url.searchParams.get("name") ||
      url.searchParams.get("email") ||
      ""
    )
      .replace("ilike.", "")
      .replaceAll("%", "");
    return fulfill(
      [candidate, secondCandidate].filter((doc) =>
        `${doc.name} ${doc.email}`.toLowerCase().includes(q.toLowerCase()),
      ),
    );
  }
  if (url.pathname.endsWith("/admin_permissions"))
    return fulfill(
      admin
        ? [
            {
              user_id: user.id,
              can_edit_workers: true,
              can_delete_workers: false,
            },
          ]
        : [],
    );
  if (url.pathname.endsWith("/client_users")) return fulfill([]);
  if (url.pathname.endsWith("/rpc/search_admin_documents")) {
    const { p_query } = request.postDataJSON();
    const docs = certificates
      .filter((doc) =>
        `${doc.document_name} ${doc.file_name}`
          .toLowerCase()
          .includes(p_query.toLowerCase()),
      )
      .map((doc) => ({
        ...doc,
        candidate_name: candidate.name,
        candidate_email: candidate.email,
        category: doc.document_type,
        bucket: "worker-documents",
        source: "candidate",
      }));
    return fulfill({
      documents: docs,
      total: docs.length,
      total_documents: certificates.length,
      categories: [],
      page: 1,
      page_size: 50,
    });
  }
  if (url.pathname.includes("/rpc/")) return fulfill(null);
  return fulfill([]);
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const payload = {
  name: "course.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\nmock"),
};
try {
  await page.goto("http://127.0.0.1:5173/admin/onboarding/certs");
  await page
    .getByRole("heading", { name: "Select a candidate", exact: true })
    .waitFor();
  const findCandidate = page.getByRole("combobox", {
    name: "Find a candidate",
    exact: true,
  });
  await findCandidate.fill("Example");
  await page.getByRole("option", { name: /Example Candidate/ }).click();
  await page
    .getByRole("heading", { name: candidate.name, exact: true })
    .waitFor();
  assert.equal(await page.getByText("Optional", { exact: true }).count(), 5);
  await page.getByText("existing-osha.pdf", { exact: false }).waitFor();
  await page
    .getByRole("textbox", { name: "MEWP document name" })
    .fill("Client aerial lift certification");
  await page.getByLabel("MEWP file", { exact: true }).setInputFiles(payload);
  await page.getByRole("button", { name: "Upload MEWP", exact: true }).click();
  await page
    .getByText("Client aerial lift certification uploaded successfully.", {
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("heading", {
      name: "Client aerial lift certification",
      exact: true,
    })
    .waitFor();
  assert.equal(certificates[1].worker_id, candidate.id);
  await page
    .getByRole("textbox", { name: "MEWP document name" })
    .fill("Second MEWP course");
  await page
    .getByLabel("MEWP file", { exact: true })
    .setInputFiles({ ...payload, name: "second-course.pdf" });
  await page.getByRole("button", { name: "Upload MEWP", exact: true }).click();
  await page
    .getByRole("heading", { name: "Second MEWP course", exact: true })
    .waitFor();
  assert.equal(certificates.length, 3);
  failInsert = true;
  await page
    .getByRole("textbox", { name: "Others document name" })
    .fill("Client induction");
  await page
    .getByLabel("Others file", { exact: true })
    .setInputFiles({ ...payload, name: "induction.pdf" });
  await page
    .getByRole("button", { name: "Upload Others", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Could not save metadata" })
    .waitFor();
  assert.equal(removed, 1);
  await page
    .getByRole("button", { name: "Upload Others", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Client induction", exact: true })
    .waitFor();
  await page
    .getByRole("combobox", { name: "Filter certificates" })
    .selectOption("mewp");
  assert.equal(await page.locator(".cert-document").count(), 2);
  await findCandidate.fill("no match");
  await page.getByText("No candidates found. Try another name.").waitFor();
  await findCandidate.fill("Second");
  await page.getByRole("option", { name: /Second Candidate/ }).waitFor();
  await findCandidate.press("Enter");
  await page
    .getByRole("heading", { name: secondCandidate.name, exact: true })
    .waitFor();
  assert.equal(await page.locator(".cert-document").count(), 0);
  await page.goto(
    `http://127.0.0.1:5173/admin/workers/${candidate.id}/onboarding/certs`,
  );
  await page
    .getByRole("heading", {
      name: "Client aerial lift certification",
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page
      .getByRole("combobox", { name: "Find a candidate", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page.locator(".onboarding-step-tabs .active").innerText(),
    "Certs",
  );
  assert.ok(
    await page
      .getByRole("link", { name: "Screening", exact: true })
      .getAttribute("href")
      .then((url) => url.endsWith(`${candidate.id}/onboarding`)),
  );
  const popupPromise = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Open course.pdf", exact: true })
    .click();
  const popup = await popupPromise;
  await popup.waitForURL(/object\/sign/);
  await popup.close();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download course.pdf", exact: true })
    .click();
  assert.equal((await downloadPromise).suggestedFilename(), "course.pdf");
  mkdirSync("tmp/certs-verification", { recursive: true });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: "tmp/certs-verification/desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => matchMedia("(max-width: 650px)").matches);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: "tmp/certs-verification/mobile.png" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  certificates.push({
    id: "cert-osha",
    worker_id: candidate.id,
    document_type: "OSHA Card",
    document_name: "Client OSHA certificate",
    onboarding_cert_category: "osha",
    file_name: "client-osha.pdf",
    file_path: "client-osha.pdf",
    file_type: "application/pdf",
    file_size: 10,
    uploaded_at: new Date().toISOString(),
  });
  await page.goto(
    `http://127.0.0.1:5173/admin/workers/${candidate.id}/documents`,
  );
  await page
    .getByRole("combobox", { name: "Document type" })
    .selectOption("osha_card");
  await page
    .getByLabel("Front (required)", { exact: true })
    .setInputFiles({ ...payload, name: "new-osha.pdf" });
  await page
    .getByRole("button", { name: "Upload document", exact: true })
    .click();
  await page
    .getByText("OSHA Card replaced successfully.", { exact: true })
    .waitFor();
  assert.ok(
    certificates.some((row) => row.id === "cert-osha"),
    "Standard replacement must preserve onboarding certificates",
  );
  assert.ok(!certificates.some((row) => row.id === "old-osha"));
  await page.goto("http://127.0.0.1:5173/admin/docs?q=aerial%20lift");
  await page
    .getByText("Client aerial lift certification", { exact: true })
    .waitFor();
  admin = false;
  await page.goto("http://127.0.0.1:5173/admin/onboarding/certs");
  await page.waitForURL(/\/login/);
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "Certs browser verification passed: optional slots, custom names, multiple uploads, failed upload cleanup, candidate isolation, persistence, tabs, Docs search, downloads, mobile and admin gate.",
  );
} finally {
  await browser.close();
}
