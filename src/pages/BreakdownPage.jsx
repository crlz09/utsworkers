import { useEffect, useState } from "react";
import { Calculator, ChevronDown, Minus, Plus, RotateCcw, UsersRound } from "lucide-react";
import UtsTopNavBar from "../components/UtsTopNavBar";
import { calculateWorkforce, normalizeWorkforce, WORKFORCE_DEFAULTS } from "../lib/workforceCalculator";
import "./BreakdownPage.css";

const KEY = "uts-workforce-calculator-v1";
const money = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
const number = (v) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v);
const percent = (v) => `${(v * 100).toFixed(2)}%`;
const scenarios = [[5, 0], [0, 5], [5, 5], [10, 0], [0, 10], [5, 10], [10, 5], [15, 0], [0, 15], [10, 10], [15, 5], [5, 15]];
function readInputs() {
  try { return normalizeWorkforce(JSON.parse(localStorage.getItem(KEY)) || {}); }
  catch { return { ...WORKFORCE_DEFAULTS }; }
}
function Field({ label, value, onChange, unit, min = 0 }) {
  return <label className="wf-field"><span>{label}</span><div><input aria-label={label} type="number" inputMode="decimal" min={min} step="any" value={value} onFocus={(e) => e.target.select()} onChange={(e) => onChange(e.target.value === "" ? "" : Math.max(min, Number(e.target.value) || 0))} onBlur={() => { if (value === "") onChange(min); }} /><small>{unit}</small></div></label>;
}
function Counter({ label, description, value, onChange }) {
  return <div className={`wf-counter wf-${label}`}><b>{label}</b><span>{description}</span><div className="wf-stepper"><button aria-label={`Quitar ${label}`} disabled={!value} onClick={() => onChange(Math.max(0, Number(value) - 1))}><Minus size={18} /></button><input aria-label={`Cantidad ${label}`} type="number" inputMode="numeric" min="0" step="1" value={value} onFocus={(e) => e.target.select()} onChange={(e) => onChange(e.target.value === "" ? "" : Math.max(0, Math.floor(Number(e.target.value) || 0)))} onBlur={() => { if (value === "") onChange(0); }} /><button aria-label={`Agregar ${label}`} onClick={() => onChange(Number(value) + 1)}><Plus size={18} /></button></div></div>;
}
function Row({ label, value, strong = false }) {
  return <div className={`wf-row ${strong ? "wf-total" : ""}`}><span>{label}</span><b>{money(value)}</b></div>;
}
function Detail({ title, children }) {
  return <details className="wf-details"><summary>{title}<ChevronDown size={18} /></summary><div className="wf-details-body">{children}</div></details>;
}
export default function BreakdownPage() {
  const [inputs, setInputs] = useState(readInputs);
  const [storageFailed, setStorageFailed] = useState(false);
  const values = Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, v === "" ? 0 : v]));
  const r = calculateWorkforce(values);
  const update = (key, value) => setInputs((a) => ({ ...a, [key]: value }));
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(inputs)); }
    catch { queueMicrotask(() => setStorageFailed(true)); }
  }, [inputs]);
  const field = (key, label, unit, min = 0) => <Field key={key} label={label} unit={unit} min={min} value={inputs[key]} onChange={(v) => update(key, v)} />;
  return <div className="breakdown-page"><UtsTopNavBar /><main className="wf-main">
    <header className="wf-heading"><div><p className="wf-eyebrow"><Calculator size={15} /> UTS · WORKFORCE CALCULATOR</p><h1>Tu equipo. Tus números.</h1><p>Ajusta tu combinación de W2 y 1099 y calcula el resultado al instante.</p></div><span className="wf-period">Proyección mensual · USD</span></header>
    <div className="wf-primary"><section className="wf-team" aria-label="Configura tu equipo"><div className="wf-section-title"><h2><UsersRound size={20} /> Configura tu equipo</h2><span>{r.workers} personas</span></div><div className="wf-counters"><Counter label="W2" description="Empleados" value={inputs.w2} onChange={(v) => update("w2", v)} /><Counter label="1099" description="Contratistas" value={inputs.contractors} onChange={(v) => update("contractors", v)} /></div><div className="wf-mix" aria-hidden="true"><span style={{ width: `${r.workers ? Number(inputs.w2) / r.workers * 100 : 0}%` }} /></div><div className="wf-legend"><span>● {number(Number(inputs.w2))} W2</span><span>● {number(Number(inputs.contractors))} 1099</span></div><div className="wf-fields">{field("hours", "Horas por semana", "h/persona")}{field("fee", "CTS hourly fee", "$/h")}</div><p className="wf-hint">{number(r.monthlyHours)} h por persona/mes · {number(values.weeks)} semanas ÷ {number(Math.max(1, values.months))} meses</p></section>
    <section className={`wf-result ${r.profit < 0 ? "wf-loss" : ""}`} aria-label="Mixed Workforce Result" aria-live="polite"><p className="wf-eyebrow">MIXED WORKFORCE RESULT</p><span className="wf-profit-label">{r.profit < 0 ? "Pérdida" : "Ganancia"} operativa mensual</span><strong className="wf-profit">{money(r.profit)}</strong><div className="wf-result-metrics"><div><span>Overall operating margin</span><b>{percent(r.margin)}</b><small>Ganancia ÷ ingresos totales</small></div><div><span>Resultado por hora</span><b>{money(r.hourlyProfit)}</b><small>Por cada hora trabajada</small></div></div><div className="wf-result-footer"><span>{number(r.hours)} horas mensuales</span><span>{r.workers} trabajadores</span></div></section></div>
    <section className="wf-summary" aria-label="Resumen mensual">{[["Ingresos totales", r.revenue, "Sueldos reembolsados + fee CTS"], ["Costo operativo total", r.cost, "W2 + 1099 + costos fijos"], ["Ingresos por fee CTS", r.feeRevenue, `${money(values.fee)} por hora trabajada`]].map(([label, value, note]) => <div key={label}><span>{label}</span><b>{money(value)}</b><small>{note}</small></div>)}</section>
    <div className="wf-secondary"><Detail title="Tarifas y supuestos"><h3>Pago por hora</h3><div className="wf-fields">{field("wage", "Sueldo W2", "$/h")}{field("contractorPay", "Pago 1099", "$/h")}</div><h3>Impuestos y seguros W2</h3><div className="wf-fields">{field("fica", "Employer FICA", "%")}{field("futa", "FUTA", "%")}{field("futaBase", "Base anual FUTA", "$/persona")}{field("suta", "Indiana SUTA", "%")}{field("sutaBase", "Base anual SUTA", "$/persona")}{field("workersComp", "Workers’ Comp", "$/h")}</div><h3>Administración y costos fijos</h3><div className="wf-fields">{field("liability", "General Liability", "$/mes")}{field("gustoBase", "Gusto · base", "$/mes")}{field("gustoEmployee", "Gusto · empleado W2", "$/mes")}{field("weeks", "Semanas por año", "semanas")}{field("months", "Meses por año", "meses", 1)}</div><button className="wf-reset" onClick={() => setInputs({ ...WORKFORCE_DEFAULTS })}><RotateCcw size={16} /> Restaurar valores del Excel</button></Detail>
    <Detail title="Desglose del resultado"><h3>Costos mensuales W2</h3>{[["Sueldos", r.wages], ["Employer FICA", r.fica], ["FUTA · promedio anualizado", r.futa], ["SUTA · promedio anualizado", r.suta], ["Workers’ Comp", r.workersComp], ["Gusto · empleados", r.gustoEmployees], ["Gusto · base fija", values.gustoBase], ["General Liability", values.liability]].map(([label, value]) => <Row key={label} label={label} value={value} />)}<Row label="Costo W2 + costos fijos" value={r.w2Cost} strong /><Row label="Pago a contratistas 1099" value={r.contractorCost} /><Row label="Costo operativo combinado" value={r.cost} strong /><h3>De ingresos a ganancia</h3><Row label="Reembolso de sueldos W2 + pago 1099" value={r.wages + r.contractorCost} /><Row label="Fee CTS" value={r.feeRevenue} /><Row label="Ingresos totales" value={r.revenue} strong /><Row label="Menos costo operativo" value={r.cost} /><Row label="Ganancia / pérdida" value={r.profit} strong /></Detail>
    <Detail title="Comparar combinaciones W2 / 1099"><p className="wf-hint">Con tus supuestos actuales. Toca una combinación para usarla.</p><div className="wf-scenarios">{scenarios.map(([w2, contractors]) => { const s = calculateWorkforce({ ...values, w2, contractors }); return <button key={`${w2}-${contractors}`} onClick={() => setInputs((a) => ({ ...a, w2, contractors }))} aria-pressed={values.w2 === w2 && values.contractors === contractors}><span>{w2} W2 · {contractors} 1099</span><b>{money(s.profit)}<small>/mes · {percent(s.margin)}</small></b></button>; })}</div></Detail>
    <Detail title="Escala de costos W2 · 1 a 30 empleados"><div className="wf-table-wrap" tabIndex="0" role="region" aria-label="Tabla de costos W2"><table><thead><tr>{["W2", "Sueldos", "FICA", "FUTA + SUTA", "WC", "Gusto + GL", "Costo total", "Costo/h", "Fee/h", "Resultado/h", "Resultado/mes"].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{Array.from({ length: 30 }, (_, i) => { const s = calculateWorkforce({ ...values, w2: i + 1, contractors: 0 }); return <tr key={i}><th>{i + 1}</th>{[s.wages, s.fica, s.futa + s.suta, s.workersComp, s.gustoEmployees + s.fixed, s.cost, s.hours ? s.cost / s.hours : 0, values.fee, s.hourlyProfit, s.profit].map((value, index) => <td key={index}>{money(value)}</td>)}</tr>; })}</tbody></table></div></Detail>
    <Detail title="Cómo se calcula"><div className="wf-notes"><p>Ingresos = reembolso del sueldo W2 y del pago 1099 + fee CTS por todas las horas. Margen operativo = ganancia ÷ ingresos totales, incluyendo esos reembolsos.</p><p>El Excel no aplica impuestos patronales, Workers’ Comp ni cargos Gusto por empleado a contratistas 1099. Gusto base y General Liability se mantienen, incluso sin trabajadores.</p><p>FUTA y SUTA son promedios de la base anual completa dividida entre los meses del año. Las tasas son supuestos editables del archivo.</p><p>No incluye per diem, intereses de capital ni recargo de overtime. Las horas adicionales usan la misma tarifa. Este simulador no determina la clasificación legal de los trabajadores.</p><p>General Liability parte de $489.17: el archivo contempla 9 pagos financiados restantes y excluye el pago inicial.</p></div></Detail></div>
    <footer className="wf-footer">{storageFailed ? "No se pudieron guardar los cambios en este navegador." : "Tus ajustes se guardan automáticamente en este navegador."}<span>Basado en UTS Employee Cost Calculator · Per diem excluido</span></footer>
  </main></div>;
}
