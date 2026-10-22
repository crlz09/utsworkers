import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { readSheet } from 'read-excel-file/browser';
import { supabase } from '../lib/supabase';
import { blankWeeklyReport, parseWeeklyReport, validateWeeklyReport, weeklyReportTotals, weeklyInvoiceLines, invoiceCsv } from '../lib/ctsWeeklyReport';
import utsLogo from '../assets/uts-logo.png';
import './CtsWeeklyPage.css';

const usd = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Indiana/Indianapolis', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const emptyInvoice = (week = '') => ({ invoice_number: week ? `UTS-CTS-${week.replaceAll('-', '')}` : '', client_name: 'CTS', client_address: '', client_contact_name: '', client_phone: '', client_email: '', invoice_date: today(), due_date: '', notes: 'Thank you for your business.' });
function NumberInput({ label, value, onChange, disabled, max, step = 'any' }) {
  return <input aria-label={label} type="number" min="0" max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />;
}
export default function CtsWeeklyPage() {
  const location = useLocation(), navigate = useNavigate();
  const billing = location.pathname.startsWith('/invoice');
  const requestedId = new URLSearchParams(location.search).get('report');
  const [reports, setReports] = useState([]), [report, setReport] = useState(blankWeeklyReport);
  const [selected, setSelected] = useState(null), [invoice, setInvoice] = useState(() => emptyInvoice());
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [message, setMessage] = useState(''), [error, setError] = useState('');
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('cts_weekly_reports').select('*, invoice:invoices(*)').order('week_ending', { ascending: false });
    if (error) throw error;
    setReports(data || []); return data || [];
  }, []);
  const openReport = useCallback((row) => { setSelected(row); setReport(row.payload); setInvoice(row.invoice || emptyInvoice(row.week_ending)); setMessage(''); setError(''); }, []);
  useEffect(() => {
    let active = true;
    load().then((rows) => { if (!active) return; if (requestedId) { const row = rows.find((r) => r.id === requestedId); if (row) openReport(row); else setError('No se encontró el reporte solicitado.'); } }).catch((e) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, requestedId, openReport]);
  const totals = useMemo(() => weeklyReportTotals(report), [report]);
  const lines = useMemo(() => weeklyInvoiceLines(report), [report]);
  const problems = useMemo(() => validateWeeklyReport(report), [report]);
  const locked = !!selected?.invoice_id;
  const dirty = !selected || JSON.stringify(report) !== JSON.stringify(selected.payload);
  const set = (key, value) => setReport((r) => ({ ...r, [key]: value }));
  const editEntry = (i, key, value) => setReport((r) => ({ ...r, entries: r.entries.map((e, index) => index === i ? { ...e, [key]: value } : e) }));
  const newReport = () => { setSelected(null); setReport(blankWeeklyReport()); setInvoice(emptyInvoice()); setError(''); setMessage(''); navigate(billing ? '/invoice/cts-weekly' : '/hours/cts-weekly', { replace: true }); };
  const importFile = async (event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('El archivo supera 10 MB.');
      const rows = await readSheet(file);
      const parsed = parseWeeklyReport(rows, file.name, Number(report.fee));
      parsed.sourceHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())), (b) => b.toString(16).padStart(2, '0')).join('');
      const existing = reports.find((r) => r.week_ending === parsed.weekEnding);
      if (existing?.invoice_id) throw new Error('Esta semana ya tiene factura. Abre el reporte guardado; no se puede reemplazar.');
      setSelected(existing || null); setReport(parsed); setInvoice(emptyInvoice(parsed.weekEnding));
      setMessage(existing ? 'Ya existe esta semana: revisa la corrección. Guardar reemplazará el borrador existente.' : 'Archivo leído. Revisa los datos y guarda el reporte.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const save = async () => {
    setError(''); setMessage('');
    if (problems.length) { setError(problems.join(' ')); return; }
    if (report.warnings?.length && !report.notes.trim()) { setError('Revisa las diferencias detectadas y explica su resolución en las notas.'); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('save_cts_weekly_report', { p_id: selected?.id || null, p_revision: selected?.revision || null, p_payload: report });
      if (error) throw error;
      const rows = await load(); const saved = rows.find((r) => r.id === data);
      if (!saved) throw new Error('No se pudo volver a leer el reporte guardado.');
      openReport(saved); setMessage('Reporte guardado. Ya puedes preparar la factura.');
    } catch (e) { setError(e.code === '23505' ? 'Ya existe un reporte de esa semana. Ábrelo desde el historial para actualizar su borrador.' : e.message); } finally { setBusy(false); }
  };
  const generateInvoice = async () => {
    setError(''); setMessage('');
    if (!selected || dirty || problems.length) { setError('Guarda el reporte válido antes de generar la factura.'); return; }
    if (!invoice.invoice_number.trim() || !invoice.client_name.trim() || !invoice.invoice_date) { setError('Indica número de factura, cliente y fecha.'); return; }
    if (invoice.due_date && invoice.due_date < invoice.invoice_date) { setError('El vencimiento no puede ser anterior a la fecha de factura.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.rpc('invoice_cts_weekly_report', { p_id: selected.id, p_revision: selected.revision, p_invoice: invoice });
      if (error) throw error;
      const rows = await load(); openReport(rows.find((r) => r.id === selected.id));
      setMessage('Factura generada y registrada en Billing. El reporte quedó bloqueado para evitar cambios y duplicados. No se envió al cliente.');
    } catch (e) { setError(e.code === '23505' ? 'Ese número de factura ya existe. Elige otro número.' : e.message); } finally { setBusy(false); }
  };
  const downloadCsv = () => {
    const url = URL.createObjectURL(new Blob(['\uFEFF', invoiceCsv(lines)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${invoice.invoice_number || report.weekEnding || 'cts-weekly'}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const reportLink = (base) => `${base}${selected ? `?report=${selected.id}` : ''}`;
  return <main className="cts-weekly-page">
    <header className="ctsw-header"><div><p className="ctsw-kicker">CTS · UTS WEEK ENDING</p><h1>{billing ? 'Factura semanal CTS' : 'Reportes semanales CTS'}</h1><p>Registra el reporte semanal y factura horas regulares, overtime y reembolsos.</p></div><Link to={billing ? '/invoice' : '/hours'}>Volver a {billing ? 'Billing' : 'Hours'}</Link></header>
    <nav className="ctsw-tabs" aria-label="Secciones CTS"><Link aria-current={!billing ? 'page' : undefined} to={reportLink('/hours/cts-weekly')}>Hours · Reportes</Link><Link aria-current={billing ? 'page' : undefined} to={reportLink('/invoice/cts-weekly')}>Invoice · Facturación</Link></nav>
    {error && <p className="ctsw-alert error" role="alert">{error}</p>}{message && <p className="ctsw-alert" role="status">{message}</p>}
    <div className="ctsw-workspace"><aside className="ctsw-history"><div className="ctsw-heading"><h2>Historial semanal</h2><button disabled={busy} onClick={async () => { setBusy(true); try { const rows = await load(); if (selected) { const current = rows.find((r) => r.id === selected.id); if (current && !dirty) openReport(current); } } catch (e) { setError(e.message); } finally { setBusy(false); } }}>Actualizar</button><button onClick={newReport} disabled={busy}>Nuevo</button></div>{loading ? <p>Cargando reportes…</p> : !reports.length ? <p>Aún no hay reportes guardados.</p> : reports.map((r) => <button key={r.id} className={selected?.id === r.id ? 'selected' : ''} disabled={busy} onClick={() => { openReport(r); navigate(`${billing ? '/invoice' : '/hours'}/cts-weekly?report=${r.id}`, { replace: true }); }}><strong>{r.week_ending}</strong><span>{usd(r.total)} · {r.invoice_id ? 'Facturado' : 'Borrador'} · v{r.revision}</span></button>)}</aside>
    <div className="ctsw-content"><section className="ctsw-card ctsw-editor"><div className="ctsw-heading"><h2>{selected ? `Semana ${selected.week_ending}` : 'Nuevo reporte'}</h2><div className="ctsw-actions"><label className={`ctsw-upload ${busy || locked ? 'disabled' : ''}`}>Importar UTS WEEK ENDING<input type="file" accept=".xlsx" aria-label="Importar UTS WEEK ENDING" disabled={busy || locked} onChange={importFile} /></label><button className="primary" disabled={busy || locked || !dirty || !report.entries.length} onClick={save}>{busy ? 'Procesando…' : selected ? 'Guardar corrección' : 'Guardar reporte'}</button></div></div>
    <p className="ctsw-muted">Importa el Excel de CTS o captura las filas manualmente. Una semana admite un solo reporte; las correcciones reemplazan el borrador antes de facturarlo.</p>
    <div className="ctsw-fields"><label>Cierre semanal<input type="date" value={report.weekEnding} disabled={locked || busy} onChange={(e) => { set('weekEnding', e.target.value); if (!selected) setInvoice((i) => ({ ...i, invoice_number: emptyInvoice(e.target.value).invoice_number })); }} /></label><label>Fee incluido en CTS RATE ($/h)<NumberInput label="Fee incluido en CTS RATE" value={report.fee} disabled={locked || busy} onChange={(v) => set('fee', v)} /></label></div>
    {report.sourceFilename && <p className="ctsw-muted">Archivo: {report.sourceFilename} · Total original: {usd(report.sourceTotal)} · Diferencia: {usd(totals.difference)}</p>}
    {report.warnings?.length > 0 && <ul className="ctsw-alert error">{report.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
    <div className="ctsw-table-wrap"><table><thead><tr>{['Empleado', 'Contratista / proyecto', 'Horas REG', 'Horas OT', 'CTS RATE con fee', 'OT con fee', 'Días per diem', 'Per diem/día', 'Subtotal', ''].map((h, i) => <th key={i}>{h}</th>)}</tr></thead><tbody>{report.entries.map((e, i) => <tr key={i}><td><input aria-label={`Empleado ${i + 1}`} value={e.name} disabled={locked || busy} onChange={(ev) => editEntry(i, 'name', ev.target.value)} /></td><td><input aria-label={`Contratista ${i + 1}`} value={e.contractor} disabled={locked || busy} onChange={(ev) => editEntry(i, 'contractor', ev.target.value)} /></td>{[['regular', 'Horas REG', 40], ['overtime', 'Horas OT'], ['rate', 'CTS RATE']].map(([key, label, max]) => <td key={key}><NumberInput label={`${label} fila ${i + 1}`} value={e[key]} max={max} disabled={locked || busy} onChange={(v) => editEntry(i, key, v)} /></td>)}<td>{usd((Number(e.rate) - Number(report.fee)) * 1.5 + Number(report.fee))}</td>{[['perDiemDays', 'Días per diem'], ['perDiemRate', 'Per diem/día']].map(([key, label]) => <td key={key}><NumberInput label={`${label} fila ${i + 1}`} value={e[key]} disabled={locked || busy} onChange={(v) => editEntry(i, key, v)} /></td>)}<td>{usd(weeklyReportTotals({ ...report, entries: [e], adjustments: [] }).total)}</td><td><button disabled={locked || busy} aria-label={`Quitar fila ${i + 1}`} onClick={() => set('entries', report.entries.filter((_, index) => index !== i))}>Quitar</button></td></tr>)}</tbody></table></div>
    {!locked && <button disabled={busy} onClick={() => set('entries', [...report.entries, { name: '', contractor: '', regular: 40, overtime: 0, rate: 35, perDiemDays: 0, perDiemRate: 0 }])}>Agregar empleado</button>}
    <h3>Reembolsos y cargos adicionales</h3>{report.adjustments.map((a, i) => <div className="ctsw-adjustment" key={i}><input aria-label={`Descripción cargo ${i + 1}`} value={a.description} disabled={locked || busy} onChange={(e) => set('adjustments', report.adjustments.map((v, index) => index === i ? { ...v, description: e.target.value } : v))} /><NumberInput label={`Importe cargo ${i + 1}`} value={a.amount} disabled={locked || busy} onChange={(v) => set('adjustments', report.adjustments.map((a, index) => index === i ? { ...a, amount: v } : a))} /><button disabled={locked || busy} aria-label={`Quitar cargo ${i + 1}`} onClick={() => set('adjustments', report.adjustments.filter((_, index) => index !== i))}>Quitar</button></div>)}{!locked && <button disabled={busy} onClick={() => set('adjustments', [...report.adjustments, { description: '', amount: 0 }])}>Agregar cargo</button>}
    <label className="ctsw-notes">Notas de revisión / motivo de corrección<textarea value={report.notes} disabled={locked || busy} onChange={(e) => set('notes', e.target.value)} /></label><p className="ctsw-muted">REG = CTS RATE (ya incluye el fee). OT = (CTS RATE − fee) × 1.5 + fee. El fee nunca se multiplica por 1.5. Los reembolsos se suman sin fee adicional.</p>
    <div className="ctsw-totals"><span>REG <b>{totals.regular} h</b></span><span>OT <b>{totals.overtime} h</b></span><span>Fee incluido <b>{usd(totals.fee)}</b></span><span>Total a facturar <b>{usd(totals.total)}</b></span></div>
    {locked && <p className="ctsw-alert">Reporte bloqueado: factura {selected.invoice?.invoice_number} · {selected.invoice?.status}. La factura también aparece en el historial general de Billing.</p>}
    {!billing && selected && !dirty && <Link className="ctsw-next" to={reportLink('/invoice/cts-weekly')}>Preparar factura de esta semana →</Link>}
    </section>
    {billing && <><section className="ctsw-card ctsw-invoice-controls"><h2>Datos de factura</h2><p className="ctsw-muted">Primero guarda el reporte. Generar factura registra una copia definitiva y bloquea esta semana; no envía correos.</p><div className="ctsw-fields">{[['invoice_number','Número de factura','text'],['client_name','Cliente','text'],['client_address','Dirección del cliente','text'],['client_contact_name','Contacto','text'],['client_email','Email del cliente','email'],['client_phone','Teléfono','text'],['invoice_date','Fecha de factura','date'],['due_date','Vencimiento','date']].map(([key, label, type]) => <label key={key}>{label}<input type={type} value={invoice[key] || ''} disabled={locked || busy} onChange={(e) => setInvoice((i) => ({ ...i, [key]: e.target.value }))} /></label>)}</div><label className="ctsw-notes">Notas para el cliente<textarea value={invoice.notes || ''} disabled={locked || busy} onChange={(e) => setInvoice((i) => ({ ...i, notes: e.target.value }))} /></label><div className="ctsw-actions"><button className="primary" disabled={busy || locked || dirty || !selected || problems.length > 0} onClick={generateInvoice}>Generar factura definitiva</button><button disabled={!locked || busy} onClick={() => window.print()}>Imprimir / Guardar PDF</button><button disabled={!lines.length || problems.length > 0} onClick={downloadCsv}>Exportar CSV</button><Link to="/invoice">Historial general de Billing</Link></div>{dirty && <p className="ctsw-muted">Hay cambios sin guardar. Guarda el reporte antes de facturar.</p>}</section>
    <section className="ctsw-card ctsw-invoice-paper" aria-label="Vista previa de factura"><div className="ctsw-invoice-heading"><div><img src={utsLogo} alt="UTS" /><h2>Universal Talent Source</h2><p>15490 Farmland Ct<br />Noblesville, IN 46060</p></div><div><h2>INVOICE</h2><p>{invoice.invoice_number || 'Sin número'}<br />{locked ? 'Finalized' : 'DRAFT · NOT FINALIZED'}</p></div></div><div className="ctsw-invoice-heading"><div><b>Bill to</b><p>{invoice.client_name}<br />{invoice.client_address}<br />{invoice.client_contact_name}</p></div><div><p>Invoice date: {invoice.invoice_date}<br />Due date: {invoice.due_date || '—'}<br />Week ending: {report.weekEnding || '—'}</p></div></div><div className="ctsw-table-wrap"><table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{lines.map((l, i) => <tr key={i}><td><b>{l.worker_name || l.project_name}</b><br />{l.product_service_name}{l.worker_name ? ` · ${l.project_name}` : ''}</td><td>{l.qty}</td><td>{usd(l.rate)}</td><td>{usd(l.amount)}</td></tr>)}</tbody></table></div><p className="ctsw-grand-total">Total USD <strong>{usd(totals.total)}</strong></p><p>{invoice.notes}</p></section></>}
    </div></div>
  </main>;
}
