import { useState } from "react";
import { Pencil } from "lucide-react";
import { perDiemValue } from "../lib/candidateCompensation";
import "./CandidateCompensationEditor.css";

export function CandidateCompensationInputs({ values, onChange, disabled = false, required = false, field }) {
  return <>
    {(!field || field === "rate_snapshot") && <label className="form-field" style={{ display: "grid", gap: 6 }}>
      <span className="form-label">Rate per hour ($)</span>
      <input className="input" aria-label="Rate per hour ($)" type="number" min="0.01" step="0.01" required={required} value={values.rate_snapshot ?? ""} onChange={(e) => onChange("rate_snapshot", e.target.value)} disabled={disabled} placeholder="35.00" />
    </label>}
    {(!field || field === "per_diem_snapshot") && <label className="form-field" style={{ display: "grid", gap: 6 }}>
      <span className="form-label">Per Diem</span>
      <input className="input" aria-label="Per Diem" value={values.per_diem_snapshot ?? ""} onChange={(e) => onChange("per_diem_snapshot", e.target.value)} disabled={disabled} placeholder="NO" />
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
  const saveField = field === "per_diem_snapshot" ? field : "compensation";
  const editLabel = field === "rate_snapshot" ? "Editar tarifa por hora" : field === "per_diem_snapshot" ? "Editar per diem" : "Editar modalidad de pago";
  const displayValue = field === "rate_snapshot"
    ? (candidate.rate_snapshot == null ? "Not set" : `$${Number(candidate.rate_snapshot).toFixed(2)}/hr`)
    : field === "per_diem_snapshot" ? perDiemValue(candidate.per_diem_snapshot) : candidate.payment_type || "Not set";
  if (!draft) return <div className="candidate-compensation candidate-compensation-read">
    <span>{displayValue}</span>
    <button className="candidate-compensation-edit" type="button" title="Editar" aria-label={editLabel} onClick={() => setDraft({ rate_snapshot: candidate.rate_snapshot ?? "", payment_type: candidate.payment_type || "", per_diem_snapshot: perDiemValue(candidate.per_diem_snapshot) })}><Pencil size={15} aria-hidden="true" /></button>
  </div>;
  return <form className="candidate-compensation" onSubmit={async (event) => {
    event.preventDefault();
    if (await onSave({ ...candidate, ...draft }, saveField)) setDraft(null);
  }}>
    <CandidateCompensationInputs field={field} values={draft} onChange={(field, value) => setDraft((prev) => ({ ...prev, [field]: value }))} disabled={saving} />
    <button className="mini-action-btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
    <button className="mini-action-btn" type="button" disabled={saving} onClick={() => setDraft(null)}>Cancel</button>
  </form>;
}
