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
const files = Array.from({ length: 55 }, (_, i) => ({
  id: `worker:${i}`,
  worker_id: candidate.id,
  candidate_name: candidate.name,
  candidate_email: candidate.email,
  file_name: `osha-${i}.pdf`,
  file_path: `${candidate.id}/osha-${i}.pdf`,
  file_type: "application/pdf",
  file_size: 2048,
  document_type: i % 2 ? "OSHA Card - Front" : "osha",
  category: "OSHA Card",
  uploaded_at: "2026-10-07T00:00:00Z",
  bucket: "worker-documents",
  source: "candidate",
  confirmation_number: "",
}));
files.push({
  ...files[0],
  id: "worker:other",
  file_name: "lift-certificate.pdf",
  document_type: "Other: Lift training",
  category: "Others",
});
let admin = true,
  fail = false,
  storageReads = 0;
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
await context.route(`https://${host}/**`, async (route) => {
  const url = new URL(route.request().url());
  const fulfill = (data, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  if (url.pathname.includes("/auth/v1/user")) return fulfill(user);
  if (url.pathname.includes("/storage/v1/object/sign/")) {
    storageReads++;
    return fulfill({
      signedURL: "/object/sign/worker-documents/example.pdf?token=mock",
    });
  }
  if (url.pathname.includes("/storage/v1/object/")) {
    storageReads++;
    return route.fulfill({
      contentType: "application/pdf",
      body: "%PDF-1.4\nmock",
    });
  }
  if (url.pathname.endsWith("/rpc/search_admin_documents")) {
    if (fail)
      return fulfill({ message: "Temporary document search failure" }, 500);
    if (!admin)
      return fulfill({ message: "Administrator access required" }, 403);
    const { p_query, p_category, p_page } = route.request().postDataJSON();
    const searched = files.filter((d) =>
      `${d.file_name} ${d.document_type} ${d.category} ${d.candidate_name} ${d.candidate_email}`
        .toLowerCase()
        .includes(p_query.toLowerCase()),
    );
    const filtered = searched.filter(
      (d) => !p_category || d.category === p_category,
    );
    const categories = [...new Set(searched.map((d) => d.category))].map(
      (category) => ({
        category,
        count: searched.filter((d) => d.category === category).length,
      }),
    );
    return fulfill({
      documents: filtered.slice((p_page - 1) * 50, p_page * 50),
      total: filtered.length,
      total_documents: files.length,
      search_total: searched.length,
      categories,
      page: p_page,
      page_size: 50,
    });
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
  if (url.pathname.endsWith("/workers")) return fulfill(url.searchParams.has("auth_user_id") || url.searchParams.has("email") ? null : [{...candidate,status:"completed",created_at:"2026-10-07T00:00:00Z"}]);
  if (url.pathname.endsWith("/client_users")) return fulfill([]);
  if (url.pathname.includes("/rpc/")) return fulfill(null);
  return fulfill([]);
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://127.0.0.1:5173/admin/docs");
  await page.getByRole("heading", { name: "Docs", exact: true }).waitFor();
  await page.getByRole("status").filter({ hasText: "56 files" }).waitFor();
  assert.equal(await page.locator("tbody tr").count(), 50);
  await page.getByRole("button", { name: "OSHA Card", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "55 files" }).waitFor();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText("Page 2 of 2").waitFor();
  assert.equal(await page.locator("tbody tr").count(), 5);
  await page.getByRole("button", { name: "Others", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "1 file" }).waitFor();
  await page.getByText("lift-certificate.pdf", { exact: true }).waitFor();
  const popupPromise = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Open lift-certificate.pdf", exact: true })
    .click();
  const popup = await popupPromise;
  await popup.waitForURL(/object\/sign/);
  await popup.close();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download lift-certificate.pdf", exact: true })
    .click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "lift-certificate.pdf");
  await page
    .getByRole("searchbox", { name: "Search documents", exact: true })
    .fill("not found");
  await page.getByRole("heading", { name: "No documents found" }).waitFor();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page.getByRole("status").filter({ hasText: "56 files" }).waitFor();
  await page
    .getByRole("searchbox", { name: "Search documents", exact: true })
    .fill("lift");
  await page.getByRole("status").filter({ hasText: "1 file" }).waitFor();
  assert.ok(page.url().includes("/admin/docs"));
  assert.equal(await page.locator('.uts-global-search').count(),0);
  await page.getByRole("searchbox", { name: "Search documents", exact: true }).fill("");
  await page.getByRole("status").filter({ hasText: "56 files" }).waitFor();
  fail = true;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Temporary document search failure" })
    .waitFor();
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("status").filter({ hasText: "56 files" }).waitFor();
  mkdirSync("tmp/admin-docs-verification", { recursive: true });
  await page.screenshot({
    path: "tmp/admin-docs-verification/desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () =>
      matchMedia("(max-width: 650px)").matches &&
      document.querySelector(".uts-ops-sidebar").getBoundingClientRect()
        .right <= 0,
  );
  console.log(
    "Mobile layout",
    await page.evaluate(() => ({
      inner: innerWidth,
      document: document.documentElement.scrollWidth,
      shell: document.querySelector(".admin-docs-shell").getBoundingClientRect()
        .width,
    })),
  );
  await page.screenshot({ path: "tmp/admin-docs-verification/mobile.png" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile must not overflow",
  );
  await page.goto('http://127.0.0.1:5173/admin/candidates');
  const candidateSearch=page.getByRole('searchbox',{name:'Search candidates',exact:true});
  await candidateSearch.waitFor();
  assert.equal(await page.locator('.uts-global-search').count(),0);
  await candidateSearch.fill('not found');
  await page.getByText('No candidates match this search.').waitFor();
  await candidateSearch.fill('Example');
  await page.getByRole('button',{name:'Example Candidate',exact:true}).waitFor();
  await page.goto('http://127.0.0.1:5173/admin/onboarding');
  await page.getByRole('heading',{name:'Screening inbox',exact:true}).waitFor();
  assert.equal(await page.locator('.uts-global-search').count(),0);
  await page.getByRole('link',{name:'Certs',exact:true}).click();
  await page.getByRole('combobox',{name:'Find a candidate',exact:true}).waitFor();
  assert.equal(await page.locator('.uts-global-search').count(),0);
  admin = false;
  await page.reload();
  await page.waitForURL(/\/login/);
  assert.equal(errors.length, 0, errors.join("\n"));
  assert.ok(storageReads >= 2);
  console.log(
    "Docs browser verification passed: filters, search, pagination, private file access, download, errors, mobile and non-admin redirect.",
  );
} finally {
  await browser.close();
}
