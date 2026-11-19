import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PAYSTUB_FIELDS, downloadPaystub, paystubDate, paystubFilename, paystubPayload, paystubTotals, paystubUsd } from '../lib/contractorPaystub';
import { matchImportAssignment, parsePaystubImport, reviewedBatchPayload, savePaystubBatch } from '../lib/paystubImport';
import ContractorPaystubView from './ContractorPaystubView';

const numericFields = [['hourly_rate', 'Rate / hour'], ['regular_hours', 'Regular hours'], ['overtime_hours', 'Overtime hours (1.5×)'], ['per_diem', 'Per diem · weekly total'], ['deductions', 'Deductions (subtract)'], ['extras', 'Extras']];

export default function PaystubExcelImport({ roster, rosterLoading, rosterError, onBusy, onHistory }) {
  const [workbook, setWorkbook] = useState(null), [sheetIndex, setSheetIndex] = useState(0);
  const [batch, setBatch] = useState(null), [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(false), [saved, setSaved] = useState([]);
  const [submitted, setSubmitted] = useState(null);
  const working = useRef(false);
  const setWorking = value => { working.current = value; setBusy(value); onBusy(value); };
  const item = batch?.items[active];
  const assignment = roster.find(a => a.id === item?.assignmentId);
  const included = batch?.items.filter(i => !i.excluded) || [];
  const approved = included.filter(i => i.reviewed).length;
  let preview = null, validation = '';
  if (item) {
    try { preview = { ...paystubPayload(assignment, { ...item.values, statement_number: item.values.statement_number || 'Assigned during review' }), worker_name: assignment?.worker?.name || assignment?.name_snapshot, template_version: 1 }; }
    catch (e) { validation = e.message; }
  }
  let batchPayload = null, batchValidation = '';
  if (batch) {
    try { batchPayload = reviewedBatchPayload(batch.items, roster); }
    catch (e) { batchValidation = e.message; }
  }
  const editItem = changes => {
    setBatch(b => ({ ...b, items: b.items.map((i, index) => index === active ? { ...i, ...changes, reviewed: false } : i) }));
    setConfirmation(false); setError('');
  };
  const editValue = (key, value) => editItem({ values: { ...item.values, [key]: value } });
  const upload = async event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || working.current) return;
    setWorking(true); setError('');
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error('Choose an .xlsx payroll workbook.');
      if (file.size > 10 * 1024 * 1024) throw new Error('The workbook exceeds 10 MB.');
      const { default: readExcelFile } = await import('read-excel-file/browser');
      const sheets = await readExcelFile(file);
      if (!sheets.length) throw new Error('The workbook has no worksheets.');
      setWorkbook({ name: file.name, sheets }); setSheetIndex(0);
    } catch (e) { setError(e.message); } finally { setWorking(false); }
  };
  const loadSheet = () => {
    setError('');
    try {
      const parsed = parsePaystubImport(workbook.sheets[sheetIndex].data);
      setBatch({ ...parsed, items: parsed.items.map(i => ({ ...i, id: crypto.randomUUID(), assignmentId: matchImportAssignment(i.name, roster), importedDeductions: i.values.deductions, deductionDecision: i.values.deductions > 0 ? '' : 'apply', reviewed: false, excluded: false })) });
      setActive(0); setConfirmation(false); setSaved([]); setSubmitted(null);
    } catch (e) { setError(e.message); }
  };
  const approve = async () => {
    if (working.current || !item || item.excluded || submitted) return;
    setError(''); setWorking(true);
    try {
      if (!item.deductionDecision) throw new Error('Choose whether to apply or skip the imported deduction.');
      if (!assignment) throw new Error('Select the correct placed 1099 assignment.');
      if (batch.items.some(i => i !== item && !i.excluded && roster.find(a => a.id === i.assignmentId)?.worker_id === assignment.worker_id)) throw new Error('Another included entry is linked to this worker. Reconcile or exclude the duplicate first.');
      const history = await supabase.from('contractor_paystubs').select(PAYSTUB_FIELDS).eq('worker_id', assignment.worker_id).eq('period_start', batch.periodStart).order('revision', { ascending: false }).limit(1);
      if (history.error) throw history.error;
      if (history.data?.length) throw new Error('A final already exists for this worker and week. Exclude this entry. Use Create paystub to explicitly review a correction.');
      let number = item.values.statement_number.trim();
      if (!number) {
        const result = await supabase.rpc('next_contractor_paystub_number');
        if (result.error) throw result.error;
        if (!result.data) throw new Error('No statement number was returned.');
        number = result.data;
      }
      const values = { ...item.values, statement_number: number };
      paystubPayload(assignment, values);
      setBatch(b => ({ ...b, items: b.items.map((i, index) => index === active ? { ...i, values, reviewed: true, reviewedIdentity: `${assignment.worker_id}:${assignment.worker?.name || assignment.name_snapshot}` } : i) }));
      setConfirmation(false);
    } catch (e) { setError(e.message); } finally { setWorking(false); }
  };
  const finalize = async () => {
    if (working.current || !confirmation || (!batchPayload && !submitted) || saved.length) return;
    const payloads = submitted || batchPayload;
    setSubmitted(payloads); setWorking(true); setError('');
    try { setSaved(await savePaystubBatch(supabase, payloads)); }
    catch (e) {
      // A database rejection guarantees rollback. Transport failures can mean the
      // batch committed: keep the exact payload locked until a retry checks IDs.
      if (/^[0-9A-Z]{5}$/.test(e.code || '')) { setSubmitted(null); setBatch(b => ({ ...b, items: b.items.map(i => ({ ...i, reviewed: false })) })); setConfirmation(false); }
      setError(`${e.message || 'Could not confirm saving.'} ${/^[0-9A-Z]{5}$/.test(e.code || '') ? 'The batch was rejected; review the entries again.' : 'Retry to check whether this exact batch was saved.'}`);
    } finally { setWorking(false); }
  };
  const downloadZip = async () => {
    if (working.current) return;
    setWorking(true); setError('');
    try {
      const [{ default: JSZip }, { buildContractorPaystubPdf }] = await Promise.all([import('jszip'), import('../lib/contractorPaystubPdf.js')]);
      const zip = new JSZip();
      for (const stub of saved) zip.file(`${stub.id}-${paystubFilename(stub)}`, await buildContractorPaystubPdf(stub));
      const url = URL.createObjectURL(await zip.generateAsync({ type: 'blob' }));
      const link = document.createElement('a'); link.href = url; link.download = `UTS-1099-week-ending-${batch.weekEnding}.zip`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e.message); } finally { setWorking(false); }
  };
  const reset = () => {
    if (!saved.length && !window.confirm('Discard this import and its individual reviews?')) return;
    setBatch(null); setWorkbook(null); setSaved([]); setSubmitted(null); setConfirmation(false); setError('');
  };
  return <section className="paystub-import" aria-label="Excel paystub import">
    <div className="pay-card paystub-import-heading"><h3>Import payroll Excel</h3><p>Choose a worksheet, review each contractor, then finalize the included paystubs together. Import drafts stay in this browser page until you leave or reload.</p>
      {!batch && <><label className="paystub-upload">Payroll workbook (.xlsx)<input type="file" accept=".xlsx" onChange={upload} disabled={busy || rosterLoading || !!rosterError}/></label>
        {workbook && <div className="paystub-setup"><label>Worksheet<select value={sheetIndex} onChange={e => setSheetIndex(Number(e.target.value))} disabled={busy}>{workbook.sheets.map((s, i) => <option key={i} value={i}>{s.sheet}</option>)}</select></label><button className="pay-btn primary" onClick={loadSheet} disabled={busy || rosterLoading || !!rosterError}><Upload size={15}/>Load worksheet</button><span>{workbook.name}</span></div>}</>}
      {rosterLoading && <p role="status">Loading eligible contractors…</p>}
      {rosterError && <p role="alert" className="paystub-error">{rosterError}</p>}
      {busy && <p role="status">{submitted ? 'Checking and saving the batch…' : 'Working…'}</p>}
    </div>
    {error && <p role="alert" className="paystub-error">{error}</p>}
    {batch && <>
      <div className="pay-card paystub-import-heading"><strong>Week: {paystubDate(batch.periodStart)} – {paystubDate(batch.weekEnding)}</strong><p>{batch.items.length} contractors · {batch.skipped} W2 rows skipped · {approved}/{included.length} included paystubs approved.</p><p className="paystub-muted">Totals are recalculated from hours, rate, per diem, extras and deductions. TOTAL COSTO is an internal cost and is not used as the employee payment.</p></div>
      {saved.length ? <section className="pay-card paystub-import-heading" aria-live="polite"><h3>{saved.length} final paystubs saved</h3><p>Published to each employee’s portal. Email delivery is available separately in Final history.</p><div className="paystub-actions"><button className="pay-btn primary" disabled={busy} onClick={() => void downloadZip()}><Download size={15}/>Download all PDFs (.zip)</button><button className="pay-btn" disabled={busy} onClick={onHistory}>Open final history</button><button className="pay-btn" disabled={busy} onClick={reset}>New import</button></div><ul>{saved.map(stub => <li key={stub.id}><button className="pay-btn" disabled={busy} onClick={async () => { setWorking(true); setError(''); try { await downloadPaystub(stub); } catch (e) { setError(e.message); } finally { setWorking(false); } }}>{stub.worker_name} · {stub.statement_number} · {paystubUsd(stub.net_payment)}</button></li>)}</ul></section> : <>
        <div className="paystub-import-layout"><nav className="pay-card paystub-import-roster" aria-label="Imported contractors">{batch.items.map((entry, index) => <button key={entry.key} type="button" aria-current={index === active ? 'true' : undefined} disabled={busy || !!submitted} onClick={() => { setActive(index); setError(''); }}><strong>{entry.name}</strong><span>{entry.excluded ? 'Excluded' : entry.reviewed ? 'Approved' : 'Needs review'}{entry.warnings.length ? ' · Review source warnings' : ''}</span></button>)}</nav>
          <section className="pay-card paystub-editor"><h3>Review {item.name}</h3><fieldset disabled={busy || !!submitted}>
            <label className="paystub-check"><input type="checkbox" checked={item.excluded} onChange={e => editItem({ excluded: e.target.checked })}/>Exclude this contractor from the batch</label>
            <details open><summary>Excel source rows ({item.sources.length})</summary><div className="paystub-import-source">{item.sources.map(source => <div key={source.row}><strong>Row {source.row}: {source.name} · {source.project}</strong><p>Rate {paystubUsd(source.hourly_rate)} · REG {source.regular_hours} · OT {source.overtime_hours} · Per diem {paystubUsd(source.per_diem)} · Deductions {paystubUsd(source.deductions)} · Extras {paystubUsd(source.extras)} · ELLOS COBRAN {source.statedNet == null ? 'blank' : paystubUsd(source.statedNet)}</p>{source.notes && <p className="paystub-import-note">{source.notes}</p>}</div>)}</div></details>
            {item.warnings.length > 0 && <ul className="paystub-import-warnings">{item.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
            {!item.excluded && <><label>Linked 1099 contractor · placed<select value={item.assignmentId} onChange={e => editItem({ assignmentId: e.target.value })}><option value="">Select the correct assignment…</option>{roster.map(a => <option key={a.id} value={a.id}>{a.worker?.name || a.name_snapshot} · {a.job?.level_type || 'Assignment'} · {a.id.slice(0, 8)}</option>)}</select></label>
              <p className="paystub-muted">Verify the linked employee, including names that matched automatically. Multiple assignments require an explicit selection.</p>
              <div className="paystub-fields"><label>Payment date<input type="date" value={item.values.payment_date} onChange={e => editValue('payment_date', e.target.value)}/></label><label>Project<input maxLength={200} value={item.values.project_name} onChange={e => editValue('project_name', e.target.value)}/></label><label>Statement number<input maxLength={100} placeholder="Assigned when approved" value={item.values.statement_number} onChange={e => editValue('statement_number', e.target.value)}/></label>
                {numericFields.map(([key, label]) => <label key={key}>{label}<input type="number" min={key === 'hourly_rate' ? '0.01' : '0'} step="0.01" max="999999.99" value={item.values[key]} disabled={key === 'deductions' && item.importedDeductions > 0 && item.deductionDecision !== 'apply'} onChange={e => editValue(key, e.target.value)}/></label>)}
              </div>
              {item.importedDeductions > 0 && <label>Imported deduction decision ({paystubUsd(item.importedDeductions)})<select value={item.deductionDecision} onChange={e => editItem({ deductionDecision: e.target.value, values: { ...item.values, deductions: e.target.value === 'skip' ? 0 : item.importedDeductions } })}><option value="">Choose after reviewing the notes…</option><option value="apply">Apply deduction this week (amount editable)</option><option value="skip">Do not deduct this week</option></select></label>}
              <label>Payment method<input maxLength={100} value={item.values.payment_method} onChange={e => editValue('payment_method', e.target.value)}/></label><label>Notes<textarea rows={3} maxLength={500} value={item.values.notes} onChange={e => editValue('notes', e.target.value)}/></label>
              {validation && <p className="paystub-error">{validation}</p>}
              {preview && <><div className="paystub-draft-total"><span>Calculated net payment</span><strong>{paystubUsd(paystubTotals(preview).net)}</strong></div><ContractorPaystubView stub={preview}/></>}
              <p>Approval confirms that you reviewed this employee, the payment date, all amounts, source rows, notes and warnings. Any edit requires another approval.</p>
              <button className="pay-btn primary" disabled={!!validation || !item.deductionDecision || item.reviewed || rosterLoading || !!rosterError} onClick={() => void approve()}>{item.reviewed ? 'Approved for batch' : 'Approve this paystub'}</button>
            </>}
          </fieldset></section>
        </div>
        <section className="pay-card paystub-import-heading"><h3>Finalize reviewed batch</h3><p>{approved} approved / {included.length} included · Total {paystubUsd(included.reduce((sum, i) => sum + paystubTotals(i.values).net, 0))}</p>
          {batchValidation && <p className="paystub-muted">{batchValidation}</p>}
          {submitted && <p>The submitted batch is locked while its saved status is checked. Retry uses the same records.</p>}
          <label className="paystub-check"><input type="checkbox" checked={confirmation} disabled={busy || !batchPayload || !!submitted} onChange={e => setConfirmation(e.target.checked)}/>Publish these {included.length} individually approved paystubs to the employees’ portals.</label>
          <div className="paystub-actions"><button className="pay-btn primary" disabled={busy || !confirmation || (!batchPayload && !submitted)} onClick={() => void finalize()}>{submitted ? 'Retry / check batch' : `Finalize ${included.length} paystubs`}</button><button className="pay-btn" disabled={busy || !!submitted} onClick={reset}>Discard import</button></div>
        </section>
      </>}
    </>}
  </section>;
}
