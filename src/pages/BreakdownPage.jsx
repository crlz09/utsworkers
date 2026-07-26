import { useMemo, useState } from "react";
import UtsTopNavBar from "../components/UtsTopNavBar";
import "./BreakdownPage.css";

const DEFAULTS = {
  capital: 0,
  interestRate: 5,
  expenses: [],
  employeeRate: 30,
  perDiemEmployee: 0,
  hoursPerWeek: 40,
  daysPerWeek: 5,
  overtimeThreshold: 40,
  overtimeMultiplier: 1.5,
  payrollBurden: 12,
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const preciseCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function loadStored(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? { ...fallback, ...JSON.parse(value) } : fallback;
  } catch {
    return fallback;
  }
}

function NumericField({
  label,
  value,
  onChange,
  prefix = "$",
  suffix = "",
  step = 1,
  help,
}) {
  return (
    <label className="bd-field">
      <span>
        {label}
        {help ? <small>{help}</small> : null}
      </span>
      <span className="bd-input">
        {prefix ? <i>{prefix}</i> : null}
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step={step}
          value={value}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
        />
        {suffix ? <i>{suffix}</i> : null}
      </span>
    </label>
  );
}

export default function BreakdownPage() {
  const [inputs, setInputs] = useState(() =>
    loadStored("breakdown-foundation-v1", DEFAULTS),
  );
  const [playground, setPlayground] = useState(() =>
    loadStored("breakdown-playground-v2", { hours: 40, people: 0, margin: 0 }),
  );
  const [saved, setSaved] = useState(false);

  const model = useMemo(() => {
    const regularHours = Math.min(inputs.hoursPerWeek, inputs.overtimeThreshold);
    const overtimeHours = Math.max(inputs.hoursPerWeek - inputs.overtimeThreshold, 0);
    const weightedHours = regularHours + overtimeHours * inputs.overtimeMultiplier;
    const monthlyLoadedWages =
      weightedHours * inputs.employeeRate * 4 * (1 + inputs.payrollBurden / 100);
    const monthlyPerDiem = inputs.daysPerWeek * inputs.perDiemEmployee * 4;
    const monthlyCostPerPerson = monthlyLoadedWages + monthlyPerDiem;
    const exactCapacity =
      monthlyCostPerPerson > 0 ? inputs.capital / monthlyCostPerPerson : 0;
    const sustainablePeople = Math.floor(exactCapacity);
    const monthlyInterest = inputs.capital * (inputs.interestRate / 100);
    const monthlyExpenses = inputs.expenses.reduce(
      (total, expense) => total + (Number(expense.amount) || 0),
      0,
    );
    const totalBreakEven = monthlyExpenses + monthlyInterest;
    const supportedHours = sustainablePeople * inputs.hoursPerWeek * 4;
    const marginPerHour = supportedHours ? totalBreakEven / supportedHours : 0;

    return {
      monthlyLoadedWages,
      monthlyPerDiem,
      monthlyCostPerPerson,
      exactCapacity,
      sustainablePeople,
      monthlyInterest,
      monthlyExpenses,
      totalBreakEven,
      supportedHours,
      marginPerHour,
    };
  }, [inputs]);

  const playgroundModel = useMemo(() => {
    const monthlyHours = playground.hours * playground.people * 4;
    const monthlyMargin = monthlyHours * playground.margin;
    return {
      monthlyHours,
      monthlyMargin,
      requiredMargin: monthlyHours ? model.totalBreakEven / monthlyHours : 0,
      result: monthlyMargin - model.totalBreakEven,
    };
  }, [model.totalBreakEven, playground]);

  const update = (key, value) => {
    setSaved(false);
    setInputs((current) => ({ ...current, [key]: value }));
  };

  const updateExpense = (id, key, value) => {
    update(
      "expenses",
      inputs.expenses.map((expense) =>
        expense.id === id ? { ...expense, [key]: value } : expense,
      ),
    );
  };

  const saveScenario = () => {
    window.localStorage.setItem("breakdown-foundation-v1", JSON.stringify(inputs));
    window.localStorage.setItem("breakdown-playground-v2", JSON.stringify(playground));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const reset = () => {
    setInputs(DEFAULTS);
    setPlayground({ hours: 40, people: 0, margin: 0 });
    setSaved(false);
    window.localStorage.removeItem("breakdown-foundation-v1");
    window.localStorage.removeItem("breakdown-playground-v2");
  };

  return (
    <div className="breakdown-page">
      <UtsTopNavBar />

      <div className="bd-actionbar">
        <div className="bd-brand">
          <b>B</b>
          <span>BREAKDOWN</span>
          <small><i /> Modelo base</small>
        </div>
        <div>
          <button type="button" className="bd-button bd-secondary" onClick={reset}>
            Reiniciar
          </button>
          <button type="button" className="bd-button bd-primary" onClick={saveScenario}>
            {saved ? "Guardado" : "Guardar escenario"}
          </button>
        </div>
      </div>

      <main>
        <section className="bd-hero">
          <div>
            <p className="bd-eyebrow">BASE / PRIMERA ETAPA</p>
            <h1>Capital claro.<br />Decisiones claras.</h1>
          </div>
          <p>
            Comienza con el capital, los gastos mensuales y un horario representativo.
            Obtén dos respuestas: personas sostenibles y break-even total.
          </p>
        </section>

        <section className="bd-kpis" aria-label="Resultados principales">
          <article className="dark">
            <span>Personas sostenibles · 4 semanas</span>
            <strong>{model.sustainablePeople}<small> personas</small></strong>
            <em>Capacidad exacta: {model.exactCapacity.toFixed(2)}</em>
          </article>
          <article>
            <span>Break-even mensual total</span>
            <strong>{currency.format(model.totalBreakEven)}</strong>
            <em>Gastos + interés mensual</em>
          </article>
          <article>
            <span>Costo mensual por persona</span>
            <strong>{currency.format(model.monthlyCostPerPerson)}</strong>
            <em>Nómina cargada + per diem</em>
          </article>
          <article className="positive">
            <span>Margen requerido por hora</span>
            <strong>{preciseCurrency.format(model.marginPerHour)}</strong>
            <em>Entre {model.supportedHours.toLocaleString()} horas sostenidas</em>
          </article>
        </section>

        <div className="bd-workspace">
          <section className="bd-assumptions">
            <div className="bd-section-heading">
              <div>
                <p className="bd-eyebrow">DATOS</p>
                <h2>Construye la base</h2>
              </div>
              <span>Cada mes = 4 semanas</span>
            </div>

            <InputSection number="01" title="Capital">
              <div className="bd-field-grid two">
                <NumericField
                  label="Capital disponible"
                  value={inputs.capital}
                  onChange={(value) => update("capital", value)}
                  step={1000}
                />
                <NumericField
                  label="Interés mensual"
                  value={inputs.interestRate}
                  onChange={(value) => update("interestRate", value)}
                  prefix=""
                  suffix="%"
                  step={0.1}
                  help={`${currency.format(model.monthlyInterest)} por mes`}
                />
              </div>
            </InputSection>

            <InputSection number="02" title="Gastos mensuales">
              <div className="bd-expenses">
                {inputs.expenses.length === 0 ? (
                  <p className="bd-empty">
                    Aún no hay gastos. Agrega cada gasto con su nombre y monto.
                  </p>
                ) : null}
                {inputs.expenses.map((expense) => (
                  <div className="bd-expense-row" key={expense.id}>
                    <label>
                      <span>Nombre del gasto</span>
                      <input
                        type="text"
                        placeholder="Ej. Payroll manager"
                        value={expense.name}
                        onChange={(event) =>
                          updateExpense(expense.id, "name", event.target.value)
                        }
                      />
                    </label>
                    <NumericField
                      label="Monto mensual"
                      value={expense.amount}
                      onChange={(value) => updateExpense(expense.id, "amount", value)}
                    />
                    <button
                      type="button"
                      className="bd-remove"
                      aria-label={`Eliminar ${expense.name || "gasto"}`}
                      onClick={() =>
                        update(
                          "expenses",
                          inputs.expenses.filter((item) => item.id !== expense.id),
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="bd-add"
                onClick={() =>
                  update("expenses", [
                    ...inputs.expenses,
                    { id: crypto.randomUUID(), name: "", amount: 0 },
                  ])
                }
              >
                + Agregar gasto mensual
              </button>
            </InputSection>

            <InputSection number="03" title="Horario de trabajo">
              <div className="bd-field-grid">
                <NumericField label="Tarifa promedio" value={inputs.employeeRate} onChange={(value) => update("employeeRate", value)} />
                <NumericField label="Carga de nómina" value={inputs.payrollBurden} onChange={(value) => update("payrollBurden", value)} prefix="" suffix="%" step={0.1} />
                <NumericField label="Per diem promedio" value={inputs.perDiemEmployee} onChange={(value) => update("perDiemEmployee", value)} />
                <NumericField label="Horas por semana" value={inputs.hoursPerWeek} onChange={(value) => update("hoursPerWeek", value)} prefix="" suffix="h" />
                <NumericField label="Días por semana" value={inputs.daysPerWeek} onChange={(value) => update("daysPerWeek", value)} prefix="" suffix="días" />
                <NumericField label="Overtime comienza" value={inputs.overtimeThreshold} onChange={(value) => update("overtimeThreshold", value)} prefix="" suffix="h" />
                <NumericField label="Multiplicador overtime" value={inputs.overtimeMultiplier} onChange={(value) => update("overtimeMultiplier", value)} prefix="" suffix="×" step={0.1} />
              </div>
            </InputSection>
          </section>

          <aside className="bd-calculation">
            <p className="bd-eyebrow">CÁLCULO</p>
            <h2>Cómo funciona el modelo</h2>
            <div className="bd-money">
              <MoneyRow label="Nómina cargada · 4 semanas" value={model.monthlyLoadedWages} />
              <MoneyRow label="Per diem · 4 semanas" value={model.monthlyPerDiem} />
              <MoneyRow label="Gastos mensuales" value={model.monthlyExpenses} />
              <MoneyRow label="Interés mensual" value={model.monthlyInterest} />
              <MoneyRow label="Break-even total" value={model.totalBreakEven} total />
            </div>
            <div className="bd-formula">
              <b>FÓRMULAS</b>
              <p>La capacidad usa el costo total de cuatro semanas de un empleado representativo.</p>
              <code>Capital ÷ costo por persona = personas sostenibles</code>
              <code>Gastos + interés = break-even total</code>
              <code>Break-even ÷ horas sostenidas = margen por hora</code>
            </div>
          </aside>
        </div>

        <section className="bd-playground">
          <div className="bd-playground-heading">
            <div>
              <p className="bd-eyebrow">PLAYGROUND / EJERCICIO INVERSO</p>
              <h2>Estima la ganancia mensual</h2>
            </div>
            <p>Prueba horas, personas y margen por hora. El modelo descuenta el break-even calculado arriba.</p>
          </div>
          <div className="bd-playground-grid">
            <div className="bd-playground-inputs">
              <NumericField label="Horas por semana" value={playground.hours} onChange={(hours) => setPlayground((current) => ({ ...current, hours }))} prefix="" suffix="h" />
              <NumericField label="Personas" value={playground.people} onChange={(people) => setPlayground((current) => ({ ...current, people }))} prefix="" />
              <NumericField label="Margen por hora" value={playground.margin} onChange={(margin) => setPlayground((current) => ({ ...current, margin }))} />
              {playground.people > model.sustainablePeople ? <p className="bd-warning">Esta cantidad excede tu capacidad de capital.</p> : null}
            </div>
            <div className="bd-results">
              <Result label="Horas mensuales" value={playgroundModel.monthlyHours.toLocaleString()} />
              <Result label="Margen mensual" value={currency.format(playgroundModel.monthlyMargin)} />
              <Result label="Break-even" value={currency.format(model.totalBreakEven)} />
              <Result label="Margen requerido/h" value={preciseCurrency.format(playgroundModel.requiredMargin)} />
              <div className={`bd-total ${playgroundModel.result < 0 ? "negative" : ""}`}>
                <span>{playgroundModel.result >= 0 ? "Ganancia estimada" : "Pérdida estimada"}</span>
                <strong>{currency.format(playgroundModel.result)}</strong>
                <small>Después de todos los gastos</small>
              </div>
            </div>
          </div>
          <code className="bd-playground-formula">Horas × Personas × Margen × 4 − Break-even = Total después de gastos</code>
        </section>
      </main>
      <footer className="bd-footer">
        <span>Breakdown / Modelo base</span>
        <span>Estimados de planificación; no constituyen asesoría contable.</span>
      </footer>
    </div>
  );
}

function InputSection({ number, title, children }) {
  return (
    <div className="bd-input-section">
      <div className="bd-input-title"><b>{number}</b><h3>{title}</h3></div>
      {children}
    </div>
  );
}

function MoneyRow({ label, value, total = false }) {
  return <div className={total ? "total" : ""}><span>{label}</span><strong>{currency.format(value)}</strong></div>;
}

function Result({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
