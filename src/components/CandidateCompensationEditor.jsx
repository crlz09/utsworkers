import { useState } from "react";
import { Pencil } from "lucide-react";
import "./CandidateCompensationEditor.css";

export function CandidateCompensationInputs({ values, onChange, disabled = false, required = false, field }) {
  return <>
    {(!field || field === "rate_snapshot") && <label className="form-field" style={{ display: "grid", gap: 6 }}>
      <span className="form-label">Rate per hour ($)</span>
      <input className="input" aria-label="Rate per hour ($)" type="number" min="0.01" step="0.01" required={required} value={values.rate_snapshot ?? ""} onChange={(e) => onChange("rate_snapshot", e.target.value)} disabled={disabled} placeholder="35.00" />
    </label>}
    {(!field || field === "payment_type") && <label className="form-field" style={{ display: "grid", gap: 6 }}>
      <span className="form-label">Hiring method</span>
      <select className="select" aria-label="Hiring method" required={required} value={values.payment_type || ""} onChange={(e) => onChange("payment_type", e.target.value)} disabled={disabled}>
        <option value="">Select W2 / 1099</option><option value="W2">W2</option><option value="1099">1099</option>
      </select>
    </label>}
  </>;
}

export default function CandidateCompensationEditor({ candidate, onSave, saving, field }) {
  const [draft, setDraft] = useState(null);
  if (!draft) return <div className="candidate-compensation candidate-compensation-read">
    {field === "rate_snapshot" ? <span>{candidate.rate_snapshot == null ? "Not set" : `$${Number(candidate.rate_snapshot).toFixed(2)}/hr`}</span> : <span>{candidate.payment_type || "Not set"}</span>}
    <button className="candidate-compensation-edit" type="button" title="Editar" aria-label={field === "rate_snapshot" ? "Editar tarifa por hora" : "Editar modalidad de pago"} onClick={() => setDraft({ rate_snapshot: candidate.rate_snapshot ?? "", payment_type: candidate.payment_type || "" })}><Pencil size={15} aria-hidden="true" /></button>
  </div>;
  return <form className="candidate-compensation" onSubmit={async (event) => {
    event.preventDefault();
    if (await onSave({ ...candidate, ...draft }, "compensation")) setDraft(null);
  }}>
    <CandidateCompensationInputs field={field} values={draft} onChange={(field, value) => setDraft((prev) => ({ ...prev, [field]: value }))} disabled={saving} />
    <button className="mini-action-btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
    <button className="mini-action-btn" type="button" disabled={saving} onClick={() => setDraft(null)}>Cancel</button>
  </form>;
}
