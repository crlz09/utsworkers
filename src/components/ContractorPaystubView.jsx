import { paystubDate, paystubTotals, paystubUsd } from '../lib/contractorPaystub';
import './ContractorPaystubs.css';

export default function ContractorPaystubView({ stub }) {
  const totals = paystubTotals(stub);
  return <article className="uts-statement" aria-label="1099 payment statement preview">
    <header className="uts-statement-brand">UNIVERSAL TALENT SOURCE</header>
    <div className="uts-statement-subtitle">INDEPENDENT CONTRACTOR PAYMENT STATEMENT · 1099</div>
    <div className="uts-statement-status">{stub.finalized_at ? `${stub.is_current === false ? 'REPLACED FINAL' : 'FINAL'} · Version ${stub.revision}` : 'DRAFT · Not saved or visible to the employee'}</div>
    <h3>CONTRACTOR</h3>
    <dl className="uts-statement-person"><dt>Contractor name</dt><dd>{stub.worker_name}</dd><dt>Project</dt><dd>{stub.project_name}</dd></dl>
    <h3>PAYMENT DETAILS</h3>
    <dl className="uts-statement-dates"><div><dt>Period start</dt><dd>{paystubDate(stub.period_start)}</dd></div><div><dt>Period end</dt><dd>{paystubDate(stub.period_end)}</dd></div><div><dt>Payment date</dt><dd>{paystubDate(stub.payment_date)}</dd></div><div><dt>Statement number</dt><dd>{stub.statement_number || 'N/A'}</dd></div></dl>
    <h3>PAYMENT BREAKDOWN</h3>
    <div className="uts-statement-table-wrap"><table><thead><tr><th>Description</th><th>Hours / Qty</th><th>Rate</th><th>Multiplier</th><th>Amount</th></tr></thead><tbody>
      <tr><td>Regular hours</td><td>{stub.regular_hours}</td><td>{paystubUsd(stub.hourly_rate)}</td><td>1</td><td>{paystubUsd(totals.regular)}</td></tr>
      <tr><td>Overtime hours</td><td>{stub.overtime_hours}</td><td>{paystubUsd(stub.hourly_rate)}</td><td>1.5</td><td>{paystubUsd(totals.overtime)}</td></tr>
      {[['Extras',stub.extras],['Per diem',stub.per_diem],['Deductions (subtract)',stub.deductions]].map(([label,amount]) => <tr key={label}><td colSpan={4}>{label}</td><td>{paystubUsd(amount)}</td></tr>)}
    </tbody></table></div>
    <div className="uts-statement-net"><strong>NET PAYMENT</strong><strong>{paystubUsd(stub.net_payment ?? totals.net)}</strong></div>
    <div className="uts-statement-note"><strong>PAYMENT METHOD</strong><span>{stub.payment_method || '—'}</span></div>
    {stub.notes && <div className="uts-statement-note"><strong>Notes</strong><span>{stub.notes}</span></div>}
    <footer><p>Contractor payment statement — not a W-2 wage statement.</p><p>Tax treatment of reimbursements depends on documentation and applicable rules.</p>{stub.finalized_at && <><p>Record ID: {stub.id}</p><p>Finalized {new Date(stub.finalized_at).toLocaleString('en-US')}{stub.correction_reason ? ` · Correction: ${stub.correction_reason}` : ''}</p></>}</footer>
  </article>;
}
