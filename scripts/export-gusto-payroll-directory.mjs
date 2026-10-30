// Export only matching fields; OAuth credentials and private payroll fields stay local.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
const exec = promisify(execFile);
const run = async (...args) => {
  const { stdout } = await exec(resolve(homedir(), '.gusto/bin/gusto'), ['--env', 'production', ...args], { maxBuffer: 16 * 1024 * 1024 });
  const response = JSON.parse(stdout);
  if (!response.ok) throw new Error(response.error?.message || 'Gusto request failed');
  return response.data;
};
const [identity, employees, contractors] = await Promise.all([run('auth','whoami'),run('employee','list','--status','all','--all'),run('contractor','list','--all')]);
const company = identity.accessible_resources?.find((r) => r.uuid === identity.resource?.uuid);
if (identity.environment !== 'production' || !company) throw new Error('Sign into your Gusto company first.');
const people = [...employees.employees.map((p) => ({ p, worker_type: 'W2', active: !p.terminated })), ...contractors.map((p) => ({ p, worker_type: '1099', active: p.is_active !== false && !p.dismissal_date }))].map(({ p, worker_type, active }) => {
  if (p.company_uuid !== company.uuid) throw new Error('Company mismatch in Gusto directory.');
  return { person_uuid: p.uuid, name: p.business_name || [p.first_name,p.last_name].filter(Boolean).join(' '), email: p.email || p.work_email || '', worker_type, active };
});
const snapshot = { schema_version: 1, source: 'gusto-cli', environment: 'production', company_uuid: company.uuid, company_name: company.name, imported_at: new Date().toISOString(), people };
if (process.argv.includes('--stdout')) process.stdout.write(JSON.stringify(snapshot));
else {
  const flag = process.argv.indexOf('--output');
  const output = resolve(flag >= 0 ? process.argv[flag+1] : 'gusto-payroll-directory.json');
  await writeFile(output, JSON.stringify(snapshot,null,2), { mode: 0o600 });
  console.log(`Exported ${people.length} directory records to ${output}. Import this file in Payroll → Gusto directory.`);
}
