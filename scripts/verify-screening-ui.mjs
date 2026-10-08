// Run against a local Vite server. Every Supabase request is mocked, including sends.
// UTS_PLAYWRIGHT_MODULE may point at an installed Playwright index.mjs.
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
const { chromium } = await import(
  process.env.UTS_PLAYWRIGHT_MODULE || "playwright"
);
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const supabaseUrl = env.match(/^VITE_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)?.[1];
assert.ok(
  supabaseUrl,
  "VITE_SUPABASE_URL is required to intercept local app requests",
);
const supabaseHost = new URL(supabaseUrl).hostname;
const user = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "admin@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-10-07T00:00:00Z",
};
const worker = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Example Candidate",
  email: "candidate@example.com",
};
const pdfDoc = await PDFDocument.create();
pdfDoc.addPage();
const pdf = Buffer.from(await pdfDoc.save());
const resultImage = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=",
  "base64",
);
const orders = [
  {
    id: "00000000-0000-4000-8000-000000000003",
    source: "gmail",
    candidate_name: worker.name,
    recipient_email: worker.email,
    confirmation_number: "AI123456789AB",
    lab_name: "Example Laboratory",
    lab_address: "123 Example Street, Covington, GA 30014",
    lab_phone: "(678) 555-0100",
    testing_hours: "Mon–Fri 8am–5pm",
    change_contact: "Cheryl at (317) 555-0100",
    file_name: "ePassport #AI123456789AB.pdf",
    file_path: "order/order.pdf",
    file_size: pdf.length,
    worker_id: null,
    suggested_worker_id: worker.id,
    suggested: worker,
    worker: null,
    send_state: "none",
    received_at: "2026-10-07T18:20:00Z",
    updated_at: "2026-10-07T18:20:00Z",
  },
];
let sendCount = 0;
const actions = [],
  errors = [];
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
const jwtPart = Buffer.from(
  JSON.stringify({
    sub: user.id,
    aud: "authenticated",
    role: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600,
  }),
).toString("base64url");
await context.addInitScript(
  ({ key, user, token }) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        access_token: `e30.${token}.mock`,
        refresh_token: "mock-refresh",
        token_type: "bearer",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        user,
      }),
    );
  },
  { key: `sb-${supabaseHost.split(".")[0]}-auth-token`, user, token: jwtPart },
);
await context.route(`https://${supabaseHost}/**`, async (route) => {
  const request = route.request(),
    url = new URL(request.url());
  const fulfill = (data, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  if (url.pathname.includes("/auth/v1/user")) return fulfill(user);
  if (url.pathname.includes("/storage/v1/object/"))
    return url.pathname.includes("result.png")
      ? route.fulfill({ contentType: "image/png", body: resultImage })
      : route.fulfill({ contentType: "application/pdf", body: pdf });
  if (url.pathname.includes("/functions/v1/screening-workflow")) {
    const action = request
      .headers()
      ["content-type"]?.includes("multipart/form-data")
      ? JSON.parse(
          String(
            (
              await new Request(request.url(), {
                method: "POST",
                headers: request.headers(),
                body: request.postDataBuffer(),
              }).formData()
            ).get("data"),
          ),
        )
      : request.postDataJSON();
    actions.push(action);
    if (action.action === "configuration")
      return fulfill({
        gmailConfigured: true,
        emailConfigured: true,
        mailbox: "cmolina@universaltalentsource.com",
        sender: "UTS <screenings@example.com>",
      });
    if (action.action === "sync")
      return fulfill({
        imported: 0,
        duplicates: 1,
        errors: [],
        hasMore: false,
      });
    const order = orders.find((item) => item.id === action.id);
    if (action.action === "save")
      Object.assign(order, action, {
        worker_id: worker.id,
        worker,
        identity_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    if (action.action === "send") {
      sendCount++;
      Object.assign(order, {
        send_state: "sent",
        sent_at: new Date().toISOString(),
        email_subject: action.subject,
        email_body: action.emailBody,
        email_to: worker.email,
        resend_email_id: "mock-provider-id",
        updated_at: new Date().toISOString(),
      });
    }
    if (action.action === "attendance")
      Object.assign(order, {
        attendance_reported_at: new Date().toISOString(),
        attendance_note: action.note,
        updated_at: new Date().toISOString(),
      });
    if (action.action === "result")
      Object.assign(order, {
        result_received_at: new Date().toISOString(),
        result_note: action.note,
        result_file_path: `${order.id}/result.png`,
        result_file_name: "result-photo.png",
        result_file_type: "image/png",
        updated_at: new Date().toISOString(),
      });
    return fulfill({ saved: true, sent: true });
  }
  if (url.pathname.endsWith("/admin_permissions"))
    return fulfill({
      user_id: user.id,
      can_edit_workers: true,
      can_delete_workers: true,
    });
  if (url.pathname.endsWith("/workers")) {
    if (url.searchParams.has("auth_user_id") || url.searchParams.has("email"))
      return fulfill(null);
    if (url.searchParams.has("id")) return fulfill(worker);
    return fulfill([worker]);
  }
  if (url.pathname.endsWith("/candidate_screenings")) {
    if (url.searchParams.has("id"))
      return fulfill(
        orders.find((item) => `eq.${item.id}` === url.searchParams.get("id")),
      );
    return fulfill(
      url.searchParams.has("worker_id")
        ? orders.filter(
            (item) =>
              `eq.${item.worker_id}` === url.searchParams.get("worker_id"),
          )
        : orders,
    );
  }
  return fulfill([]);
});
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
const outputDir =
  process.env.UTS_SCREENING_SCREENSHOTS ||
  "/tmp/uts-screening-check/screenshots";
mkdirSync(outputDir, { recursive: true });
try {
  await page.goto(
    `${process.env.UTS_DEV_URL || "http://127.0.0.1:5173"}/admin/onboarding`,
  );
  await page.getByRole("heading", { name: "Screening inbox" }).waitFor();
  await page.getByRole("button", { name: "Review PDF", exact: true }).click();
  await page.getByTitle("ePassport #AI123456789AB.pdf").waitFor();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Send instructions with PDF" })
      .isDisabled(),
    true,
  );
  await page
    .getByLabel(
      "I reviewed the original PDF and confirmed it belongs to this candidate.",
    )
    .check();
  await page
    .getByRole("button", { name: "Save verified order to candidate" })
    .click();
  await page.getByText(/Identity verified/).waitFor();
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  assert.ok(
    (await page.getByLabel("Message", { exact: true }).inputValue()).includes(
      "attached printed ePassport",
    ),
  );
  await page.getByLabel("Language", { exact: true }).selectOption("es");
  await page
    .getByLabel("I reviewed the recipient, message, and attached PDF.")
    .check();
  await page.screenshot({ path: `${outputDir}/desktop.png`, fullPage: true });
  await page
    .getByRole("button", { name: "Send instructions with PDF" })
    .click();
  await page.getByText(/Provider ID: mock-provider-id/).waitFor();
  assert.equal(sendCount, 1);
  assert.equal(
    await page
      .getByRole("button", { name: "Send instructions with PDF" })
      .count(),
    0,
  );
  await page
    .getByLabel("Attendance report", { exact: true })
    .fill("Candidate confirmed attendance by phone at 3pm.");
  await page.getByRole("button", { name: "Record attendance report" }).click();
  await page
    .getByText("Candidate confirmed attendance by phone at 3pm.", {
      exact: false,
    })
    .waitFor();
  assert.equal(orders[0].result_received_at, undefined);
  await page
    .getByLabel("Result source and receipt date")
    .fill("Candidate photo received today");
  const resultInput = page.getByLabel("Result document (PDF or photo)");
  assert.ok((await resultInput.getAttribute("accept")).includes("image/png"));
  await resultInput.setInputFiles({
    name: "result-photo.png",
    mimeType: "image/png",
    buffer: resultImage,
  });
  await page
    .getByRole("button", { name: "Save private result", exact: true })
    .click();
  await page
    .getByRole("button", { name: "View private result", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "View private result", exact: true })
    .click();
  await page.locator(".screening-result-image").waitFor();
  assert.ok(
    await page
      .locator(".screening-result-image")
      .evaluate((img) => img.complete && img.naturalWidth > 0),
  );

  await page.getByRole("button", { name: "Import PDF", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => getComputedStyle(document.body).paddingLeft === "0px",
  );
  await page.screenshot({ path: `${outputDir}/mobile.png`, fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
  await page.goto(
    `${process.env.UTS_DEV_URL || "http://127.0.0.1:5173"}/admin/workers/${worker.id}/onboarding`,
  );
  await page.getByRole("heading", { name: "Candidate drug tests" }).waitFor();
  await page.getByRole("heading", { name: worker.name }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "UI verified: PDF preview, identity review, bilingual email, one send, attendance, private result photo upload and preview, manual import dialog, candidate tab, and mobile layout. All services mocked.",
  );
  console.log(`Screenshots: ${outputDir}`);
} finally {
  await browser.close();
}
