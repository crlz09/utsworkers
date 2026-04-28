import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Wrench,
  X,
  Plus,
  Trash2,
  FolderKanban,
} from "lucide-react";
import { motion as Motion } from "framer-motion";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

const starterLanguages = [
  "English",
  "Spanish",
  "Portuguese",
  "French",
  "German",
  "Arabic",
];

const initialForm = {
  name: "",
  phone: "",
  email: "",
  trade_id: "",
  location_id: "",
  total_experience_years: "",
  commercial_experience_years: "",
  industrial_experience_years: "",
  residential_experience_years: "",
  strengths: "",
  needs_improvement: "",
};

const emptyProject = () => ({
  project_name: "",
  project_location: "",
  project_duration: "",
  project_description: "",
});

function createCaptcha() {
  const a = Math.floor(Math.random() * 8) + 2;
  const b = Math.floor(Math.random() * 8) + 2;
  return {
    question: `${a} + ${b}`,
    answer: String(a + b),
  };
}

function PageStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #eef2ff;
        color: #0f172a;
      }

      input, textarea, select, button {
        font: inherit;
      }

      input::placeholder, textarea::placeholder {
        color: #94a3b8;
      }

      .spin {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @media (max-width: 920px) {
        .two-col,
        .tag-grid,
        .project-grid {
          grid-template-columns: 1fr !important;
        }

        .container-shell {
          padding: 16px !important;
        }

        .panel {
          padding: 20px !important;
          border-radius: 24px !important;
        }

        .hero-title {
          font-size: 30px !important;
        }
      }
    `}</style>
  );
}

function inputStyle() {
  return {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    outline: "none",
  };
}

function textareaStyle(minHeight = 120) {
  return {
    ...inputStyle(),
    minHeight,
    resize: "vertical",
    lineHeight: 1.5,
  };
}

function Field({ label, children }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function TagPicker({ label, options, selected, setSelected, placeholder }) {
  const [customValue, setCustomValue] = useState("");

  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.localeCompare(b)),
    [options]
  );

  const available = useMemo(
    () => sortedOptions.filter((item) => !selected.includes(item)),
    [sortedOptions, selected]
  );

  const addItem = (value) => {
    const trimmed = value.trim();
    if (!trimmed || selected.includes(trimmed)) return;
    setSelected([...selected, trimmed]);
  };

  const removeItem = (value) => {
    setSelected(selected.filter((item) => item !== value));
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
        {label}
      </label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minHeight: 18 }}>
        {selected.length === 0 ? (
          <span style={{ color: "#64748b", fontSize: 14 }}>
            No items selected yet.
          </span>
        ) : (
          selected.map((item) => (
            <span
              key={item}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 999,
                background: "#dbeafe",
                color: "#0f172a",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {item}
              <button
                type="button"
                onClick={() => removeItem(item)}
                style={{
                  border: "none",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  padding: 0,
                  color: "#334155",
                }}
                aria-label={`Remove ${item}`}
              >
                <X size={14} />
              </button>
            </span>
          ))
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {available.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => addItem(item)}
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              borderRadius: 999,
              padding: "8px 12px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "#0f172a",
            }}
          >
            <Plus size={14} />
            {item}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          placeholder={placeholder}
          style={inputStyle()}
        />
        <button
          type="button"
          onClick={() => {
            addItem(customValue);
            setCustomValue("");
          }}
          style={{
            border: "none",
            background: "#0f172a",
            color: "white",
            borderRadius: 14,
            padding: "0 16px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function CatalogPicker({
  label,
  icon,
  items,
  selectedIds,
  setSelectedIds,
  emptyText,
}) {
  const toggle = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        <label style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          {label}
        </label>
      </div>

      {items.length === 0 ? (
        <div
          style={{
            padding: 14,
            borderRadius: 14,
            background: "#f8fafc",
            border: "1px dashed #cbd5e1",
            color: "#64748b",
            fontSize: 14,
          }}
        >
          {emptyText}
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {items.map((item) => {
            const active = selectedIds.includes(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                style={{
                  padding: "9px 13px",
                  borderRadius: 999,
                  border: active ? "1px solid #0f172a" : "1px solid #cbd5e1",
                  background: active ? "#0f172a" : "#ffffff",
                  color: active ? "#ffffff" : "#0f172a",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {item.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectHistoryEditor({ projects, setProjects }) {
  const updateProject = (index, field, value) => {
    const next = [...projects];
    next[index] = { ...next[index], [field]: value };
    setProjects(next);
  };

  const addProject = () => {
    setProjects([...projects, emptyProject()]);
  };

  const removeProject = (index) => {
    if (projects.length === 1) {
      setProjects([emptyProject()]);
      return;
    }
    setProjects(projects.filter((_, i) => i !== index));
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <FolderKanban size={16} color="#334155" />
            <div style={{ fontWeight: 800, color: "#0f172a" }}>
              Project History
            </div>
          </div>
          <div style={{ color: "#64748b", fontSize: 14 }}>
            Add one or more job experiences for this worker.
          </div>
        </div>

        <button
          type="button"
          onClick={addProject}
          style={{
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#0f172a",
            borderRadius: 14,
            padding: "11px 14px",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Plus size={16} />
          Add Project
        </button>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {projects.map((project, index) => (
          <div
            key={index}
            style={{
              border: "1px solid #dbeafe",
              background: "#f8fbff",
              borderRadius: 22,
              padding: 18,
              display: "grid",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontWeight: 800, color: "#0f172a" }}>
                Project #{index + 1}
              </div>

              <button
                type="button"
                onClick={() => removeProject(index)}
                style={{
                  border: "1px solid #fecaca",
                  background: "#ffffff",
                  color: "#b91c1c",
                  borderRadius: 12,
                  padding: "9px 12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Trash2 size={15} />
                Remove
              </button>
            </div>

            <div
              className="project-grid"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
            >
              <Field label="Project Name">
                <input
                  value={project.project_name}
                  onChange={(e) =>
                    updateProject(index, "project_name", e.target.value)
                  }
                  placeholder="Amazon IND2 Outbound"
                  style={inputStyle()}
                />
              </Field>

              <Field label="Project Location">
                <input
                  value={project.project_location}
                  onChange={(e) =>
                    updateProject(index, "project_location", e.target.value)
                  }
                  placeholder="Indianapolis, IN"
                  style={inputStyle()}
                />
              </Field>

              <Field label="Duration">
                <input
                  value={project.project_duration}
                  onChange={(e) =>
                    updateProject(index, "project_duration", e.target.value)
                  }
                  placeholder="8 months"
                  style={inputStyle()}
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                value={project.project_description}
                onChange={(e) =>
                  updateProject(index, "project_description", e.target.value)
                }
                placeholder="Describe what you did on this project..."
                style={textareaStyle(110)}
              />
            </Field>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [projects, setProjects] = useState([emptyProject()]);
  const [languages, setLanguages] = useState([]);
  const [tradeOptions, setTradeOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [skillOptions, setSkillOptions] = useState([]);
  const [certificationOptions, setCertificationOptions] = useState([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState([]);
  const [selectedCertificationIds, setSelectedCertificationIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [captcha, setCaptcha] = useState(createCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");

  useEffect(() => {
    const loadCatalogs = async () => {
      if (!supabase) {
        setBootLoading(false);
        return;
      }

      try {
        const [tradesRes, locationsRes, skillsRes, certificationsRes] =
          await Promise.all([
            supabase.from("trades").select("id, name").order("name"),
            supabase.from("locations").select("id, name").order("name"),
            supabase.from("skills").select("id, name").order("name"),
            supabase.from("certifications").select("id, name").order("name"),
          ]);

        if (tradesRes.error) throw tradesRes.error;
        if (locationsRes.error) throw locationsRes.error;
        if (skillsRes.error) throw skillsRes.error;
        if (certificationsRes.error) throw certificationsRes.error;

        setTradeOptions(tradesRes.data || []);
        setLocationOptions(locationsRes.data || []);
        setSkillOptions(skillsRes.data || []);
        setCertificationOptions(certificationsRes.data || []);
      } catch (err) {
        setError(err.message || "Could not load catalogs from Supabase.");
      } finally {
        setBootLoading(false);
      }
    };

    loadCatalogs();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setProjects([emptyProject()]);
    setLanguages([]);
    setSelectedSkillIds([]);
    setSelectedCertificationIds([]);
    setCaptcha(createCaptcha());
    setCaptchaInput("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!supabase) {
      setError(
        "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file."
      );
      return;
    }

    if (!form.name.trim() || !form.trade_id || !form.location_id) {
      setError("Please complete Name, Trade, and Location.");
      return;
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (captchaInput.trim() !== captcha.answer) {
      setError("Captcha answer is incorrect. Please try again.");
      setCaptcha(createCaptcha());
      setCaptchaInput("");
      return;
    }

    setLoading(true);

    try {
      const workerPayload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        trade_id: form.trade_id,
        location_id: form.location_id,
        total_experience_years: Number(form.total_experience_years || 0),
        commercial_experience_years: Number(
          form.commercial_experience_years || 0
        ),
        industrial_experience_years: Number(
          form.industrial_experience_years || 0
        ),
        residential_experience_years: Number(
          form.residential_experience_years || 0
        ),
        strengths: form.strengths.trim() || null,
        needs_improvement: form.needs_improvement.trim() || null,
      };

      const { data: worker, error: workerError } = await supabase
        .from("workers")
        .insert(workerPayload)
        .select("id")
        .single();

      if (workerError) throw workerError;

      const workerId = worker.id;

      const validProjects = projects.filter(
        (project) =>
          project.project_name.trim() ||
          project.project_location.trim() ||
          project.project_duration.trim() ||
          project.project_description.trim()
      );

      if (validProjects.length > 0) {
        const projectRows = validProjects.map((project, index) => ({
          worker_id: workerId,
          project_name: project.project_name.trim() || null,
          project_location: project.project_location.trim() || null,
          duration: project.project_duration.trim() || null,
          description: project.project_description.trim() || null,
          sort_order: index + 1,
        }));

        const { error: projectsError } = await supabase
          .from("worker_projects")
          .insert(projectRows);

        if (projectsError) throw projectsError;
      }

      if (languages.length > 0) {
        const languageRows = languages.map((language) => ({
          worker_id: workerId,
          language_name: language,
        }));

        const { error: languageError } = await supabase
          .from("worker_languages")
          .insert(languageRows);

        if (languageError) throw languageError;
      }

      if (selectedSkillIds.length > 0) {
        const skillRows = selectedSkillIds.map((skillId) => ({
          worker_id: workerId,
          skill_id: skillId,
        }));

        const { error: skillError } = await supabase
          .from("worker_skills")
          .insert(skillRows);

        if (skillError) throw skillError;
      }

      if (selectedCertificationIds.length > 0) {
        const certificationRows = selectedCertificationIds.map(
          (certificationId) => ({
            worker_id: workerId,
            certification_id: certificationId,
          })
        );

        const { error: certificationError } = await supabase
          .from("worker_certifications")
          .insert(certificationRows);

        if (certificationError) throw certificationError;
      }

      resetForm();
      setSuccess(true);
    } catch (err) {
      setError(
        err.message || "Something went wrong while saving the worker profile."
      );
      setCaptcha(createCaptcha());
      setCaptchaInput("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageStyles />

      <div
        className="container-shell"
        style={{
          minHeight: "100vh",
          padding: 24,
          background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          <Motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="panel"
              style={{
                background: "#ffffff",
                borderRadius: 30,
                padding: 32,
                boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
                border: "1px solid #dbeafe",
              }}
            >
              <div style={{ marginBottom: 26 }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    borderRadius: 999,
                    background: "#0f172a",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: 25,
                    marginBottom: 18,
                  }}
                >
                  Universal Talent Source
                </div>

                <h1
                  className="hero-title"
                  style={{
                    margin: 0,
                    color: "#0f172a",
                    fontSize: 42,
                    lineHeight: 1.05,
                    letterSpacing: 0,
                  }}
                >
                  Worker Registration Portal
                </h1>

                <p
                  style={{
                    marginTop: 12,
                    marginBottom: 0,
                    color: "#475569",
                    fontSize: 18,
                    lineHeight: 1.7,
                    maxWidth: 760,
                  }}
                >
                 
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "grid", gap: 26 }}>
                <div
                  className="two-col"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 18,
                  }}
                >
                  <Field label="Name">
                    <input
                      value={form.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="Name and Last name"
                      style={inputStyle()}
                    />
                  </Field>

                  <Field label="Phone">
                    <input
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="(317) 555-1234"
                      style={inputStyle()}
                    />
                  </Field>

                  <Field label="Email">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="carlos@email.com"
                      style={inputStyle()}
                    />
                  </Field>

                  <Field label="Location">
                    <select
                      value={form.location_id}
                      onChange={(e) =>
                        handleChange("location_id", e.target.value)
                      }
                      style={inputStyle()}
                    >
                      <option value="">Select a location</option>
                      {locationOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Trade">
                    <select
                      value={form.trade_id}
                      onChange={(e) => handleChange("trade_id", e.target.value)}
                      style={inputStyle()}
                    >
                      <option value="">Select a trade</option>
                      {tradeOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Total Experience in Trade (Years)">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.total_experience_years}
                      onChange={(e) =>
                        handleChange("total_experience_years", e.target.value)
                      }
                      placeholder="8"
                      style={inputStyle()}
                    />
                  </Field>

                  <Field label="Commercial Experience (Years)">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.commercial_experience_years}
                      onChange={(e) =>
                        handleChange(
                          "commercial_experience_years",
                          e.target.value
                        )
                      }
                      placeholder="4"
                      style={inputStyle()}
                    />
                  </Field>

                  <Field label="Industrial Experience (Years)">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.industrial_experience_years}
                      onChange={(e) =>
                        handleChange(
                          "industrial_experience_years",
                          e.target.value
                        )
                      }
                      placeholder="6"
                      style={inputStyle()}
                    />
                  </Field>
                </div>

                <Field label="Residential Experience (Years)">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.residential_experience_years}
                    onChange={(e) =>
                      handleChange("residential_experience_years", e.target.value)
                    }
                    placeholder="2"
                    style={inputStyle()}
                  />
                </Field>

                <div style={{ height: 1, background: "#e2e8f0" }} />

                <ProjectHistoryEditor projects={projects} setProjects={setProjects} />

                <div
                  className="two-col"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 18,
                  }}
                >
                  <Field label="Strengths">
                    <textarea
                      value={form.strengths}
                      onChange={(e) => handleChange("strengths", e.target.value)}
                      placeholder="Leadership, troubleshooting, blueprint reading..."
                      style={textareaStyle(120)}
                    />
                  </Field>

                  <Field label="Needs Improvement">
                    <textarea
                      value={form.needs_improvement}
                      onChange={(e) =>
                        handleChange("needs_improvement", e.target.value)
                      }
                      placeholder="Documentation, advanced PLC diagnostics..."
                      style={textareaStyle(120)}
                    />
                  </Field>
                </div>

                <div style={{ height: 1, background: "#e2e8f0" }} />

                <div
                  className="tag-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 22,
                  }}
                >
                  <TagPicker
                    label="Languages"
                    options={starterLanguages}
                    selected={languages}
                    setSelected={setLanguages}
                    placeholder="Add a language"
                  />

                  <CatalogPicker
                    label="Skills"
                    icon={<Wrench size={16} color="#334155" />}
                    items={skillOptions}
                    selectedIds={selectedSkillIds}
                    setSelectedIds={setSelectedSkillIds}
                    emptyText="No skills found in your catalog yet."
                  />
                </div>

                <CatalogPicker
                  label="Certifications"
                  icon={<ShieldCheck size={16} color="#334155" />}
                  items={certificationOptions}
                  selectedIds={selectedCertificationIds}
                  setSelectedIds={setSelectedCertificationIds}
                  emptyText="No certifications found in your catalog yet."
                />

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    padding: 18,
                    borderRadius: 18,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>
                    Spam protection
                  </div>
                  <div style={{ color: "#475569", fontSize: 14 }}>
                    Solve this to submit the form.
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        minWidth: 100,
                        padding: "12px 14px",
                        borderRadius: 14,
                        background: "#dbeafe",
                        color: "#0f172a",
                        fontWeight: 800,
                        textAlign: "center",
                      }}
                    >
                      {captcha.question} = ?
                    </div>

                    <input
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      placeholder="Answer"
                      style={{ ...inputStyle(), maxWidth: 220 }}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setCaptcha(createCaptcha());
                        setCaptchaInput("");
                      }}
                      style={{
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#0f172a",
                        borderRadius: 14,
                        padding: "12px 16px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      New captcha
                    </button>
                  </div>
                </div>

                {error ? (
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: 16,
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#b91c1c",
                      fontWeight: 600,
                    }}
                  >
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "14px 16px",
                      borderRadius: 16,
                      background: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      color: "#047857",
                      fontWeight: 700,
                    }}
                  >
                    <CheckCircle2 size={18} />
                    Worker registered successfully.
                  </div>
                ) : null}

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button
                    type="submit"
                    disabled={loading || bootLoading}
                    style={{
                      border: "none",
                      background:
                        loading || bootLoading ? "#94a3b8" : "#0f172a",
                      color: "#ffffff",
                      borderRadius: 14,
                      padding: "13px 18px",
                      fontWeight: 800,
                      cursor:
                        loading || bootLoading ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {loading ? <Loader2 size={16} className="spin" /> : null}
                    {loading ? "Saving..." : "Register Worker"}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={loading}
                    style={{
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      borderRadius: 14,
                      padding: "13px 18px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Clear Form
                  </button>
                </div>
              </form>
            </div>
          </Motion.div>
        </div>
      </div>
    </>
  );
}
