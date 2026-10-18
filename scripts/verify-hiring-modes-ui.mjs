import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
const { chromium } = await import(process.env.UTS_PLAYWRIGHT_MODULE || 'playwright');
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const host = new URL(env.match(/^VITE_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)[1]).hostname;
const user = { id: '00000000-0000-4000-8000-000000000001', email: 'admin@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated' };
const project = { id: '00000000-0000-4000-8000-000000000002', level_type: 'Hiring test project', client_name: 'CTS', status: 'open', updated_at: '2026-10-17T00:00:00Z', created_at: '2026-10-17T00:00:00Z' };
let assignments = ['Owned Worker', 'Sourcing Worker', 'Cancel Worker'].map((name, i) => ({ id: `00000000-0000-4000-8000-${String(i+10).padStart(12,'0')}`, cts_job_id: project.id, worker_id: null, name_snapshot: name, candidate_status: 'sourced', hiring_mode: null, placement_fee_paid: false, updated_at: '2026-10-17T00:00:00Z', created_at: '2026-10-17T00:00:00Z' }));
const writes = [];
const browser = await chromium.launch({ headless: true, ...(process.env.UTS_CHROME_PATH ? { executablePath: process.env.UTS_CHROME_PATH } : {}) });
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const token = Buffer.from(JSON.stringify({ sub: user.id, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url');
  await context.addInitScript(({ key, user, token }) => localStorage.setItem(key, JSON.stringify({ access_token: `e30.${token}.mock`, refresh_token: 'mock', expires_at: Math.floor(Date.now()/1000)+3600, expires_in: 3600, token_type: 'bearer', user })), { key: `sb-${host.split('.')[0]}-auth-token`, user, token });
  await context.route(`https://${host}/**`, async route => {
    const req = route.request(); const url = new URL(req.url()); const table = url.pathname.split('/').at(-1);
    const fulfill = value => route.fulfill({ contentType: 'application/json', body: JSON.stringify(value) });
    if (url.pathname.includes('/auth/v1/user')) return fulfill(user);
    if (table === 'admin_permissions') return fulfill({ can_edit_workers: true, can_delete_workers: true });
    if (table === 'client_users') return fulfill(null);
    if (url.pathname.includes('/rpc/')) return fulfill(table === 'planner_note_unread_count' ? 0 : null);
    if (table === 'cts_jobs') {
      if (req.method() === 'PATCH') return fulfill(null);
      return fulfill(url.searchParams.has('id') ? project : [project]);
    }
    if (table === 'cts_hours_import_rows') return fulfill(assignments.slice(0,2).map((item, i) => ({ id: `hours-${i}`, cts_job_candidate_id: item.id, cts_job_id: project.id, worker_id: null, week_start_date: '2026-10-12', week_ending_date: '2026-10-18', total_hours: 40, regular_hours: 40, overtime_hours: 0, double_time_hours: 0 })));
    if (table === 'weekly_hours_reviews') return fulfill(assignments.slice(0,2).map((item, i) => ({ id: `review-${i}`, cts_job_candidate_id: item.id, week_start_date: '2026-10-12', official_source: 'cts', status: 'locked' })));
    if (table === 'cts_job_candidates') {
      if (req.method() === 'PATCH') {
        const body = req.postDataJSON(); writes.push(body);
        const row = assignments.find(item => `eq.${item.id}` === url.searchParams.get('id'));
        Object.assign(row, body, { updated_at: new Date().toISOString() });
        return fulfill(row);
      }
      return fulfill(assignments);
    }
    return fulfill([]);
  });
  const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/cts-jobs');
  const row = name => page.locator('tr').filter({ has: page.getByText(name, { exact: true }) }).filter({ has: page.locator('select') });
  await row('Owned Worker').waitFor();
  await row('Owned Worker').locator('select').selectOption('placed');
  const modal = page.getByRole('dialog', { name: 'Place candidate · hiring mode', exact: true });
  await modal.waitFor(); assert.equal(writes.length, 0, 'Placement waits for explicit mode choice');
  await modal.getByRole('button', { name: /^Owned/ }).click();
  await row('Owned Worker').getByText('No placement fee', { exact: true }).waitFor();
  assert.equal(writes[0].hiring_mode, 'owned'); assert.equal(writes[0].placement_fee_amount, 0);
  await row('Sourcing Worker').locator('select').selectOption('placed');
  await modal.getByRole('button', { name: /^Sourcing/ }).click();
  await row('Sourcing Worker').getByRole('button', { name: 'Mark Paid', exact: true }).waitFor();
  assert.equal(writes[1].hiring_mode, 'sourcing'); assert.equal(writes[1].placement_fee_amount, 50);
  await row('Cancel Worker').locator('select').selectOption('placed');
  await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(writes.length, 2, 'Cancelling never saves placement');
  assert.equal(await row('Cancel Worker').locator('select').inputValue(), 'sourced');
  mkdirSync('tmp/hiring-verification', { recursive: true });
  await page.screenshot({ path: 'tmp/hiring-verification/dashboard.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await row('Cancel Worker').locator('select').selectOption('placed');
  await modal.waitFor();
  const box = await modal.boundingBox(); assert.ok(box.width <= 390);
  await page.screenshot({ path: 'tmp/hiring-verification/mobile-mode-dialog.png' });
  await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto(`http://127.0.0.1:5173/cts-jobs/${project.id}`);
  const detailRow = page.locator('tbody tr').filter({ hasText: 'Cancel Worker' });
  await detailRow.waitFor();
  const stage = detailRow.locator('td').nth(10);
  await stage.getByRole('button', { name: 'Edit field', exact: true }).click();
  await stage.locator('select').selectOption('placed');
  await stage.getByRole('button', { name: 'Save field', exact: true }).click();
  await modal.getByRole('button', { name: /^Owned/ }).click();
  await detailRow.getByText(/Owned · \$5\/hr/).waitFor();
  assert.equal(writes[2].hiring_mode, 'owned');
  await page.goto('http://127.0.0.1:5173/invoice');
  const ownedInvoiceRows = page.locator('tbody tr').filter({ hasText: 'Owned Worker' });
  await ownedInvoiceRows.first().waitFor();
  assert.equal(await ownedInvoiceRows.count(), 1, 'Owned has hours and no placement fee line');
  await ownedInvoiceRows.locator('.screen-rate-value').getByText('$5.00', { exact: true }).waitFor();
  const sourceInvoiceRows = page.locator('tbody tr').filter({ hasText: 'Sourcing Worker' });
  assert.equal(await sourceInvoiceRows.count(), 2, 'Sourcing has hours plus one placement line');
  await sourceInvoiceRows.locator('.screen-rate-value').getByText('$1.00', { exact: true }).waitFor();
  assert.equal(await sourceInvoiceRows.getByRole('button', { name: 'Mark Placement Paid', exact: true }).count(), 1);
  await page.screenshot({ path: 'tmp/hiring-verification/invoice-mode-fees.png', fullPage: true });
  assignments[1].placement_fee_billed_at = new Date().toISOString();
  await page.reload();
  const billedSourceRows = page.locator('tbody tr').filter({ hasText: 'Sourcing Worker' });
  await billedSourceRows.first().waitFor();
  assert.equal(await billedSourceRows.count(), 1, 'An invoiced unpaid placement is not charged again');
  assert.equal(await billedSourceRows.getByRole('button', { name: 'Mark Placement Paid', exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log('Hiring mode UI passed: explicit selection, sourcing/owned atomic payloads, fee display, cancellation and mobile dialog.');
} finally { await browser.close(); }
