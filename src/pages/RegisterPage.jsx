import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import UtsTopNavBar from "../components/UtsTopNavBar";
import GoToTopButton from "../components/GoToTopButton";
import {
  findLocationIdByState,
  lookupUsZipCode,
  normalizeZipCode,
} from "../lib/addressLookup";
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
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

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
  address: "",
  zip_code: "",
  city: "",
  state: "",
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

let turnstileScriptPromise;

function loadTurnstileScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Turnstile can only load in the browser."));
  }

  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]');

      if (existing) {
        existing.addEventListener("load", () => resolve(window.turnstile), { once: true });
        existing.addEventListener("error", () => reject(new Error("Could not load Turnstile.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => reject(new Error("Could not load Turnstile."));
      document.head.appendChild(script);
    });
  }

  return turnstileScriptPromise;
}

function TurnstileField({ siteKey, onVerify, resetKey }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    const mountWidget = async () => {
      if (!siteKey || !containerRef.current) return;

      try {
        const turnstile = await loadTurnstileScript();
        if (!active || !containerRef.current) return;

        containerRef.current.innerHTML = "";
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "light",
          callback: (token) => onVerify(token),
          "expired-callback": () => onVerify(""),
          "error-callback": () => onVerify(""),
        });
        setLoadError("");
      } catch (error) {
        setLoadError(error.message || "Could not load verification challenge.");
      }
    };

    mountWidget();

    return () => {
      active = false;
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onVerify]);

  useEffect(() => {
    if (widgetIdRef.current !== null && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetKey]);

  if (!siteKey) {
    return (
      <div
        style={{
          padding: "14px 16px",
          borderRadius: 14,
          background: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#b91c1c",
          fontWeight: 600,
        }}
      >
        Turnstile is not configured yet. Add `VITE_TURNSTILE_SITE_KEY` to your local environment.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div ref={containerRef} />
      {loadError ? (
        <div style={{ color: "#b91c1c", fontSize: 14, fontWeight: 600 }}>
          {loadError}
        </div>
      ) : null}
    </div>
  );
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

      input, textarea, select {
        transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
      }

      input:focus, textarea:focus, select:focus {
        border-color: #1f2c40 !important;
        box-shadow: 0 0 0 4px rgba(31, 44, 64, 0.11);
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
          border-radius: 18px !important;
        }

        .hero-title {
          font-size: 28px !important;
        }

        .brand-pill {
          font-size: 15px !important;
          line-height: 1.2 !important;
          padding: 8px 14px !important;
        }
      }
    `}</style>
  );
}

function inputStyle() {
  return {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    outline: "none",
    boxSizing: "border-box",
  };
}

function honeypotStyle() {
  return {
    position: "absolute",
    left: "-10000px",
    top: "auto",
    width: 1,
    height: 1,
    overflow: "hidden",
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
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [company, setCompany] = useState("");
  const [zipLookupStatus, setZipLookupStatus] = useState("");

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

  const handleZipChange = (value) => {
    const zip = normalizeZipCode(value);
    handleChange("zip_code", zip);
    setZipLookupStatus(zip.length === 5 ? "Looking up ZIP..." : "");
  };

  useEffect(() => {
    const zip = normalizeZipCode(form.zip_code);
    if (zip.length !== 5) {
      return;
    }

    let active = true;

    const timer = window.setTimeout(async () => {
      try {
        const result = await lookupUsZipCode(zip);
        if (!active) return;

        if (!result) {
          setZipLookupStatus("ZIP not found.");
          return;
        }

        const locationId = findLocationIdByState(locationOptions, result.state);
        setForm((prev) => ({
          ...prev,
          city: result.city || prev.city,
          state: result.state || prev.state,
          location_id: locationId || prev.location_id,
        }));
        setZipLookupStatus("City and state filled from ZIP.");
      } catch {
        if (active) setZipLookupStatus("Could not look up ZIP.");
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [form.zip_code, locationOptions]);

  const resetForm = () => {
    setForm(initialForm);
    setProjects([emptyProject()]);
    setLanguages([]);
    setSelectedSkillIds([]);
    setSelectedCertificationIds([]);
    setTurnstileToken("");
    setTurnstileResetKey((prev) => prev + 1);
    setCompany("");
    setZipLookupStatus("");
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

    if (!turnstileSiteKey) {
      setError("Turnstile is not configured. Please contact support.");
      return;
    }

    if (!turnstileToken) {
      setError("Please complete the verification challenge.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/register-worker-public`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            ...form,
            languages,
            selectedSkillIds,
            selectedCertificationIds,
            projects: projects.map((project) => ({
              project_name: project.project_name.trim() || "",
              project_location: project.project_location.trim() || "",
              duration: project.project_duration.trim() || "",
              description: project.project_description.trim() || "",
            })),
            company,
            captchaToken: turnstileToken,
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || "Something went wrong while saving the worker profile."
        );
      }

      console.log("Worker created:", result.workerId);

      resetForm();
      setSuccess(true);
    } catch (err) {
      setError(
        err.message || "Something went wrong while saving the worker profile."
      );
      setTurnstileToken("");
      setTurnstileResetKey((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <UtsTopNavBar />
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
                borderRadius: 20,
                padding: 32,
                boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
                border: "1px solid #dbeafe",
              }}
            >
              <div style={{ marginBottom: 26 }}>
                <div
                  className="brand-pill"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    borderRadius: 999,
                    background: "#0f172a",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: 15,
                    lineHeight: 1.2,
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
                    fontSize: "clamp(30px, 5vw, 42px)",
                    lineHeight: 1.08,
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
                  Complete the form below to register a new worker profile into
                  the UTS talent pool.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "grid", gap: 26 }}>
                <div aria-hidden="true" style={honeypotStyle()}>
                  <label htmlFor="company-field">Company</label>
                  <input
                    id="company-field"
                    name="company"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>

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

                  <Field label="Street Address">
                    <input
                      value={form.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      placeholder="123 Main St"
                      style={inputStyle()}
                    />
                  </Field>

                  <Field label="ZIP Code">
                    <input
                      inputMode="numeric"
                      value={form.zip_code}
                      onChange={(e) => handleZipChange(e.target.value)}
                      placeholder="46204"
                      style={inputStyle()}
                    />
                    {zipLookupStatus ? (
                      <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                        {zipLookupStatus}
                      </div>
                    ) : null}
                  </Field>

                  <Field label="City">
                    <input
                      value={form.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      placeholder="Indianapolis"
                      style={inputStyle()}
                    />
                  </Field>

                  <Field label="State">
                    <input
                      value={form.state}
                      onChange={(e) => {
                        const state = e.target.value;
                        const locationId = findLocationIdByState(locationOptions, state);
                        setForm((prev) => ({
                          ...prev,
                          state,
                          location_id: locationId || prev.location_id,
                        }));
                      }}
                      placeholder="Indiana"
                      style={inputStyle()}
                    />
                  </Field>

                  <Field label="Location">
                    <select
                      value={form.location_id}
                      onChange={(e) => handleChange("location_id", e.target.value)}
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
                        handleChange("commercial_experience_years", e.target.value)
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
                        handleChange("industrial_experience_years", e.target.value)
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
                    Verification
                  </div>
                  <div style={{ color: "#475569", fontSize: 14 }}>
                    Complete the security check before submitting the public registration form.
                  </div>

                  <TurnstileField
                    siteKey={turnstileSiteKey}
                    onVerify={setTurnstileToken}
                    resetKey={turnstileResetKey}
                  />
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
      <GoToTopButton showAfter={600} />
    </>
  );
}
