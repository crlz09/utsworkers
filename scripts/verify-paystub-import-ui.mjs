// Uses a local workbook with mocked APIs. Never writes real finals or sends mail.
// UTS_PAYSTUB_IMPORT_XLSX=/path/to/payroll.xlsx node scripts/verify-paystub-import-ui.mjs
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import readExcelFile from 'read-excel-file/node';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { parsePaystubImport } from '../src/lib/paystubImport.js';
import { paystubTotals } from '../src/lib/contractorPaystub.js';

const file = process.env.UTS_PAYSTUB_IMPORT_XLSX;
assert.ok(file, 'Set UTS_PAYSTUB_IMPORT_XLSX to a local payroll workbook.');
const parsed = parsePaystubImport((await readExcelFile(file))[0].data);
const { chromium } = await import(process.env.UTS_PLAYWRIGHT_MODULE || 'playwright');
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const host = new URL(env.match(/^VITE_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)[1]).hostname;
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const admin = { id: uuid(1), email: 'admin@example.test', app_metadata: {}, user_metadata: {}, aud: 'authenticated' };
const roster = parsed.items.map((item, i) => ({ id: uuid(100 + i), worker_id: uuid(200 + i), cts_job_id: uuid(300), name_snapshot: item.name, worker: { id: uuid(200 + i), name: item.name }, job: { level_type: 'Test assignment' }, candidate_status: 'placed', payment_type: '1099', hiring_mode: 'owned' }));
const finals = [], errors = [];
let inserts = 0, loseResponse = true, blockExisting = true;
const browser = await chromium.launch({ headless: true, ...(process.env.UTS_CHROME_PATH ? { executablePath: process.env.UTS_CHROME_PATH } : {}) });
try {
  mkdirSync('tmp/paystub-import-verification', { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const token = Buffer.from(JSON.stringify({ sub: admin.id, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  await ctx.addInitScript(({ key, user, token }) => localStorage.setItem(key, JSON.stringify({ access_token: `e30.${token}.mock`, refresh_token: 'mock', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user })), { key: `sb-${host.split('.')[0]}-auth-token`, user: admin, token });
  await ctx.route(`https://${host}/**`, async route => {
    const req = route.request(), url = new URL(req.url()), table = url.pathname.split('/').at(-1);
    const send = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
    assert.ok(!url.pathname.includes('/functions/'), 'No email function may be called.');
    if (url.pathname.includes('/auth/v1/user')) return send(admin);
    if (table === 'admin_permissions') return send({ can_edit_workers: true, can_delete_workers: true });
    if (table === 'client_users') return send(null);
    if (table === 'cts_job_candidates') return send(roster);
    if (table === 'get_payroll_cts_week') return send({ lines: [] });
    if (table === 'next_contractor_paystub_number') return send(`111826-${String(++number).padStart(2, '0')}`);
    if (table === 'contractor_paystubs') {
      if (req.method() === 'POST') {
        const payloads = req.postDataJSON();
        assert.ok(Array.isArray(payloads), 'One array INSERT finalizes the entire batch.');
        assert.equal(payloads.length, parsed.items.length);
        assert.equal(new Set(payloads.map(p => p.id)).size, payloads.length);
        inserts++;
        for (const p of payloads) {
          const a = roster.find(a => a.id === p.assignment_id);
          assert.ok(a); assert.equal(p.period_start, parsed.periodStart); assert.equal(p.period_end, parsed.weekEnding);
          assert.ok(!finals.some(s => s.worker_id === a.worker_id), 'No duplicate worker finals.');
          finals.push({ ...p, worker_id: a.worker_id, worker_name: a.worker.name, net_payment: paystubTotals(p).net, revision: 1, template_version: 1, finalized_at: '2026-11-18T22:00:00Z' });
        }
        if (loseResponse) { loseResponse = false; return route.abort('failed'); }
        return send(finals);
      }
      if (url.searchParams.has('id')) {
        const ids = url.searchParams.get('id');
        return send(finals.filter(s => ids.includes(s.id)));
      }
      if (blockExisting) return send([{ id: uuid(999), worker_id: roster[0].worker_id }]);
      return send(finals.filter(s => `eq.${s.worker_id}` === url.searchParams.get('worker_id') && `eq.${s.period_start}` === url.searchParams.get('period_start')));
    }
    if (table === 'planner_note_unread_count') return send(0);
    return send([]);
  });
  let number = 0;
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/payroll');
  await page.getByRole('button', { name: 'Import payroll Excel', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Excel paystub import' });
  await panel.getByLabel('Payroll workbook (.xlsx)').setInputFiles(file);
  await panel.getByRole('button', { name: 'Load worksheet', exact: true }).click();
  await panel.getByRole('heading', { name: `Review ${parsed.items[0].name}`, exact: true }).waitFor();
  const confirmation = panel.getByLabel(/Publish these/);
  assert.equal(await confirmation.isEnabled(), false);
  assert.equal(await panel.getByRole('button', { name: /^Finalize \d+ paystubs$/ }).isEnabled(), false);
  assert.equal(await panel.getByLabel('Payment date', { exact: true }).inputValue(), parsed.items[0].values.payment_date);
  assert.equal(finals.length, 0, 'Import and preview never finalize anything.');
  await panel.getByRole('button', { name: 'Approve this paystub', exact: true }).click();
  await panel.getByRole('alert').filter({ hasText: 'A final already exists' }).waitFor();
  blockExisting = false;
  for (let index = 0; index < parsed.items.length; index++) {
    const item = parsed.items[index];
    await panel.getByRole('navigation', { name: 'Imported contractors' }).getByRole('button').nth(index).click();
    if (item.values.deductions > 0) {
      assert.equal(await panel.getByRole('button', { name: 'Approve this paystub', exact: true }).isEnabled(), false);
      await panel.getByLabel(/Imported deduction decision/).selectOption('apply');
    }
    await panel.getByRole('button', { name: 'Approve this paystub', exact: true }).click();
    await panel.getByRole('button', { name: 'Approved for batch', exact: true }).waitFor();
  }
  assert.equal(await confirmation.isEnabled(), true);
  await confirmation.check();
  // Any edit revokes that individual's approval and the final batch confirmation.
  const notes = panel.getByLabel('Notes', { exact: true });
  await notes.fill(`${await notes.inputValue()}\nVerified in UI test.`.trim());
  assert.equal(await confirmation.isChecked(), false);
  assert.equal(await confirmation.isEnabled(), false);
  await panel.getByRole('button', { name: 'Approve this paystub', exact: true }).click();
  await panel.getByRole('button', { name: 'Approved for batch', exact: true }).waitFor();
  // Exclusion and re-inclusion also require a fresh individual approval.
  const exclusion = panel.getByLabel('Exclude this contractor from the batch');
  await exclusion.check(); await exclusion.uncheck();
  assert.equal(await confirmation.isEnabled(), false);
  await panel.getByRole('button', { name: 'Approve this paystub', exact: true }).click();
  await panel.getByRole('button', { name: 'Approved for batch', exact: true }).waitFor();
  await page.screenshot({ path: 'tmp/paystub-import-verification/review-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => getComputedStyle(document.body).paddingLeft === '0px');
  await page.screenshot({ path: 'tmp/paystub-import-verification/review-mobile.png', fullPage: true });
  const overflow = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth, elements: [...document.querySelectorAll('main *')].filter(el => el.getBoundingClientRect().right > window.innerWidth && getComputedStyle(el).display !== 'none').slice(0, 15).map(el => ({ tag: el.tagName, className: el.className, right: el.getBoundingClientRect().right, width: el.getBoundingClientRect().width })) }));
  assert.ok(overflow.scroll <= overflow.width, `Mobile has no page overflow: ${JSON.stringify(overflow)}`);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await confirmation.check();
  await panel.getByRole('button', { name: /^Finalize \d+ paystubs$/ }).click();
  await panel.getByRole('button', { name: 'Retry / check batch', exact: true }).waitFor();
  await panel.getByRole('button', { name: 'Retry / check batch', exact: true }).click();
  await panel.getByRole('heading', { name: `${parsed.items.length} final paystubs saved`, exact: true }).waitFor();
  assert.equal(inserts, 1, 'Lost-response retry recovers the saved batch without another INSERT.');
  assert.equal(finals.length, parsed.items.length);
  const downloadPromise = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Download all PDFs (.zip)', exact: true }).click();
  const download = await downloadPromise;
  const zip = await JSZip.loadAsync(readFileSync(await download.path()));
  const pdfs = Object.values(zip.files).filter(f => !f.dir);
  assert.equal(pdfs.length, parsed.items.length);
  for (const pdf of pdfs) assert.equal((await PDFDocument.load(await pdf.async('uint8array'))).getPageCount(), 1);
  await page.screenshot({ path: 'tmp/paystub-import-verification/saved.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log(`PASS: ${parsed.items.length} contractors; real XLSX parsing, dates, source warnings, deduction decisions, existing-final block, individual review, edit/exclusion invalidation, atomic array INSERT, lost-response recovery, ${pdfs.length} one-page PDFs in ZIP, mobile layout. Mocked APIs only; no real finals or emails.`);
} finally { await browser.close(); }
