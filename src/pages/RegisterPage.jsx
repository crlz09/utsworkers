import React, { useEffect, useRef, useState } from "react";
import UtsTopNavBar from "../components/UtsTopNavBar";
import GoToTopButton from "../components/GoToTopButton";
import { supabase } from "../lib/supabase";
import {
  findLocationIdByState,
  getFullStateName,
  lookupUsZipCode,
  normalizeZipCode,
} from "../lib/addressLookup";
import {
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Wrench,
  Plus,
  Trash2,
  FolderKanban,
  Globe2,
  ChevronDown,
} from "lucide-react";
import { motion as Motion } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const AUTOSAVE_KEY = "uts_public_register_draft_v2";

const languageOptions = ["English", "Spanish"];
const experienceFields = [
  "total_experience_years",
  "commercial_experience_years",
  "industrial_experience_years",
  "residential_experience_years",
];
const registrationStepFields = [
  {
    fields: ["first_name", "last_name", "date_of_birth", "phone", "email", "address", "zip_code", "city", "state"],
  },
  {
    fields: [
      "trade_id",
      "total_experience_years",
      "commercial_experience_years",
      "industrial_experience_years",
      "residential_experience_years",
    ],
  },
  {
    fields: [],
  },
];

const copy = {
  en: {
    localeLabel: "English",
    toggleLabel: "Switch form language",
    stepLabel: "Step",
    title: "Worker Registration Portal",
    subtitle: "Complete the form below to register",
    steps: [
      {
        title: "Personal Info",
        description: "Name, phone, email, and current address.",
      },
      {
        title: "Experience & Projects",
        description: "Trade, experience years, and project history.",
      },
      {
        title: "Skills",
        description: "Strengths, skills, certifications, and languages.",
      },
    ],
    labels: {
      firstName: "First Name",
      lastName: "Last Name",
      dateOfBirth: "Date of Birth (DOB)",
      phone: "Phone",
      email: "Email",
      address: "Street Address",
      zip: "ZIP Code",
      city: "City",
      state: "State",
      trade: "Trade",
      totalExperience: "Total Experience in Trade (Years)",
      commercialExperience: "Commercial Experience (Years)",
      industrialExperience: "Industrial Experience (Years)",
      residentialExperience: "Residential Experience (Years)",
      projectHistory: "Project History",
      projectHelp: "Add one or more job experiences for this worker.",
      addProject: "Add Project",
      project: "Project",
      projectName: "Project Name",
      projectLocation: "Project Location",
      duration: "Duration",
      description: "Description",
      remove: "Remove",
      strengths: "Strengths",
      needsImprovement: "Needs Improvement",
      languages: "Languages",
      englishLevel: "English level",
      skills: "Skills",
      certifications: "Certifications",
      verification: "Verification",
      verificationHelp: "Complete the security check before submitting the public registration form.",
    },
    placeholders: {
      firstName: "Enter first name",
      lastName: "Enter last name",
      dateOfBirth: "MM/DD/YYYY",
      phone: "Enter phone number",
      email: "Enter email address",
      address: "Street address",
      zip: "5-digit ZIP",
      city: "City",
      state: "State",
      trade: "Select a trade",
      projectName: "Amazon IND2 Outbound",
      projectLocation: "Indianapolis, IN",
      duration: "8 months",
      projectDescription: "Describe what you did on this project...",
      strengths: "Leadership, troubleshooting, blueprint reading...",
      needsImprovement: "Documentation, advanced PLC diagnostics...",
    },
    messages: {
      noItemsSelected: "No items selected yet.",
      noSkills: "No skills found in your catalog yet.",
      noCertifications: "No certifications found in your catalog yet.",
      success: "Worker registered successfully.",
      successTitle: "Registration submitted",
      successDetail:
        "The worker profile was registered successfully. You can close this page now or register another person.",
      successSummaryTitle: "Submitted profile",
      draftRestored: "Your saved draft was restored.",
      continueError: "Please review the highlighted fields before continuing.",
      submitError: "Please review the highlighted fields before submitting.",
      missingSupabase: "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.",
      missingTurnstile: "Turnstile is not configured. Please contact support.",
      completeVerification: "Please complete the verification challenge.",
      saveError: "Something went wrong while saving the worker profile.",
      zipLooking: "Looking up ZIP...",
      zipFilled: "City and state filled from ZIP.",
      zipNotFound: "ZIP not found.",
      zipLookupFailed: "Could not look up ZIP.",
      fieldErrors: {
        first_name: "Enter your first name.",
        last_name: "Enter your last name.",
        date_of_birth: "Enter a valid date of birth in MM/DD/YYYY format.",
        phoneRequired: "Enter your phone number.",
        phoneInvalid: "Enter a valid 10-digit US phone number.",
        emailRequired: "Enter your email address.",
        emailInvalid: "Enter a valid email address, for example name@email.com.",
        address: "Enter your street address.",
        zipRequired: "Enter your ZIP code.",
        zipInvalid: "Enter a valid 5-digit ZIP code.",
        city: "Enter your city.",
        stateRequired: "Enter your state.",
        stateInvalid: "Enter a valid state so we can match your current location.",
        trade_id: "Select your trade.",
        experience: "Enter a whole number from 0 to 30.",
        totalExperienceMismatch: "Total experience must equal commercial + industrial + residential.",
      },
    },
    actions: {
      continue: "Continue",
      back: "Back",
      register: "Register Worker",
      saving: "Saving...",
      clear: "Clear Form",
      registerAnother: "Register Another Person",
      openPortal: "Open My Candidate Portal",
    },
  },
  es: {
    localeLabel: "Español",
    toggleLabel: "Cambiar idioma del formulario",
    stepLabel: "Paso",
    title: "Portal de Registro de Workers",
    subtitle: "Completa el formulario para registrarte",
    steps: [
      {
        title: "Información Personal",
        description: "Nombre, teléfono, correo y dirección actual.",
      },
      {
        title: "Experiencia y Proyectos",
        description: "Oficio, años de experiencia e historial de proyectos.",
      },
      {
        title: "Habilidades",
        description: "Fortalezas, habilidades, certificaciones e idiomas.",
      },
    ],
    labels: {
      firstName: "Nombre",
      lastName: "Apellido",
      dateOfBirth: "Fecha de Nacimiento (DOB)",
      phone: "Teléfono",
      email: "Correo",
      address: "Dirección",
      zip: "Código ZIP",
      city: "Ciudad",
      state: "Estado",
      trade: "Oficio",
      totalExperience: "Experiencia Total en el Oficio (Años)",
      commercialExperience: "Experiencia Comercial (Años)",
      industrialExperience: "Experiencia Industrial (Años)",
      residentialExperience: "Experiencia Residencial (Años)",
      projectHistory: "Historial de Proyectos",
      projectHelp: "Agrega una o más experiencias laborales para este worker.",
      addProject: "Agregar Proyecto",
      project: "Proyecto",
      projectName: "Nombre del Proyecto",
      projectLocation: "Ubicación del Proyecto",
      duration: "Duración",
      description: "Descripción",
      remove: "Eliminar",
      strengths: "Fortalezas",
      needsImprovement: "Áreas de Mejora",
      languages: "Idiomas",
      englishLevel: "Nivel de inglés",
      skills: "Habilidades",
      certifications: "Certificaciones",
      verification: "Verificación",
      verificationHelp: "Completa la verificación de seguridad antes de enviar el formulario.",
    },
    placeholders: {
      firstName: "Ingresa tu nombre",
      lastName: "Ingresa tu apellido",
      dateOfBirth: "MM/DD/AAAA",
      phone: "Ingresa tu teléfono",
      email: "Ingresa tu correo",
      address: "Dirección completa",
      zip: "ZIP de 5 dígitos",
      city: "Ciudad",
      state: "Estado",
      trade: "Selecciona un oficio",
      projectName: "Amazon IND2 Outbound",
      projectLocation: "Indianapolis, IN",
      duration: "8 meses",
      projectDescription: "Describe qué hiciste en este proyecto...",
      strengths: "Liderazgo, troubleshooting, lectura de planos...",
      needsImprovement: "Documentación, diagnósticos PLC avanzados...",
    },
    messages: {
      noItemsSelected: "Aún no hay elementos seleccionados.",
      noSkills: "Todavía no hay habilidades en el catálogo.",
      noCertifications: "Todavía no hay certificaciones en el catálogo.",
      success: "Worker registrado correctamente.",
      successTitle: "Registro enviado",
      successDetail:
        "El perfil del worker fue registrado correctamente. Puedes cerrar esta página o registrar otra persona.",
      successSummaryTitle: "Perfil enviado",
      draftRestored: "Restauramos tu borrador guardado.",
      continueError: "Revisa los campos marcados antes de continuar.",
      submitError: "Revisa los campos marcados antes de enviar.",
      missingSupabase: "Supabase no está configurado. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env.local.",
      missingTurnstile: "Turnstile no está configurado. Contacta a soporte.",
      completeVerification: "Completa la verificación de seguridad.",
      saveError: "Ocurrió un problema guardando el perfil del worker.",
      zipLooking: "Buscando ZIP...",
      zipFilled: "Ciudad y estado completados desde el ZIP.",
      zipNotFound: "ZIP no encontrado.",
      zipLookupFailed: "No se pudo buscar el ZIP.",
      fieldErrors: {
        first_name: "Ingresa tu nombre.",
        last_name: "Ingresa tu apellido.",
        date_of_birth: "Ingresa una fecha de nacimiento válida en formato MM/DD/AAAA.",
        phoneRequired: "Ingresa tu número de teléfono.",
        phoneInvalid: "Ingresa un teléfono válido de 10 dígitos.",
        emailRequired: "Ingresa tu correo.",
        emailInvalid: "Ingresa un correo válido, por ejemplo nombre@email.com.",
        address: "Ingresa tu dirección.",
        zipRequired: "Ingresa tu código ZIP.",
        zipInvalid: "Ingresa un ZIP válido de 5 dígitos.",
        city: "Ingresa tu ciudad.",
        stateRequired: "Ingresa tu estado.",
        stateInvalid: "Ingresa un estado válido para identificar tu ubicación actual.",
        trade_id: "Selecciona tu oficio.",
        experience: "Ingresa un número entero del 0 al 30.",
        totalExperienceMismatch: "La experiencia total debe ser igual a comercial + industrial + residencial.",
      },
    },
    actions: {
      continue: "Continuar",
      back: "Atrás",
      register: "Registrar Worker",
      saving: "Guardando...",
      clear: "Limpiar Formulario",
      registerAnother: "Registrar Otra Persona",
      openPortal: "Abrir Mi Portal de Candidato",
    },
  },
};

const initialForm = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
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

function TurnstileField({ siteKey, onVerify, resetKey, language = "en" }) {
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
          language,
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
  }, [siteKey, onVerify, language]);

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
        color: #cbd5e1;
        opacity: 1;
      }

      .spin {
        animation: spin 1s linear infinite;
      }

      .personal-info-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px 22px;
        align-items: start;
      }

      .date-picker-full-width,
      .date-picker-full-width .react-datepicker-wrapper {
        width: 100%;
      }

      .experience-top-grid {
        display: grid;
        grid-template-columns: minmax(320px, 1.35fr) minmax(180px, 0.65fr);
        gap: 18px;
        align-items: start;
      }

      .experience-mini-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(130px, 190px));
        gap: 18px;
        align-items: start;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @media (max-width: 920px) {
        .two-col,
        .personal-info-grid,
        .tag-grid,
        .project-grid,
        .experience-top-grid,
        .experience-mini-grid,
        .stepper-grid {
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

function Field({ label, children, required = false }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
        {label}
        {required ? (
          <span aria-label="required" style={{ color: "#dc2626", marginLeft: 4 }}>
            *
          </span>
        ) : null}
      </label>
      {children}
    </div>
  );
}

function FieldError({ children }) {
  if (!children) return null;

  return (
    <div style={{ color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>
      {children}
    </div>
  );
}

function Stepper({ steps, currentStep, setCurrentStep, stepLabel = "Step" }) {
  return (
    <div
      className="stepper-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 12,
      }}
    >
      {steps.map((step, index) => {
        const active = index === currentStep;
        const complete = index < currentStep;

        return (
          <button
            key={step.title}
            type="button"
            onClick={() => setCurrentStep(index)}
            aria-current={active ? "step" : undefined}
            style={{
              textAlign: "left",
              borderRadius: 16,
              border: active ? "1px solid #0f172a" : "1px solid #dbeafe",
              background: active ? "#0f172a" : complete ? "#eff6ff" : "#ffffff",
              color: active ? "#ffffff" : "#0f172a",
              padding: 14,
              cursor: "pointer",
              display: "grid",
              gap: 6,
              minHeight: 102,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 900, opacity: active ? 0.9 : 0.7 }}>
              {stepLabel} {index + 1}
            </span>
            <strong style={{ fontSize: 16 }}>{step.title}</strong>
            <span style={{ fontSize: 13, lineHeight: 1.35, color: active ? "#dbeafe" : "#64748b" }}>
              {step.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function buildFullName(firstName, lastName) {
  return [firstName, lastName]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
}

function normalizePhoneDigits(value) {
  const digitsOnly = String(value || "").replace(/\D/g, "");
  return digitsOnly.length === 11 && digitsOnly.startsWith("1")
    ? digitsOnly.slice(1)
    : digitsOnly;
}

function formatPhoneInput(value) {
  const digits = normalizePhoneDigits(value).slice(0, 10);

  if (!digits) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function parseDateOfBirth(value) {
  const match = String(value || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const [, monthText, dayText, yearText] = match;
  const month = Number(monthText);
  const day = Number(dayText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date > today ||
    year < 1900
  ) return null;

  return date;
}

function formatDateOfBirth(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return [
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    date.getFullYear(),
  ].join("/");
}

function toIsoDate(value) {
  const date = parseDateOfBirth(value);
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getRegistrationFieldErrors(form, text = copy.en) {
  const errors = {};
  const fieldText = text.messages.fieldErrors;
  const email = form.email.trim();
  const phoneDigits = normalizePhoneDigits(form.phone);
  const zip = normalizeZipCode(form.zip_code);

  if (!form.first_name.trim()) errors.first_name = fieldText.first_name;
  if (!form.last_name.trim()) errors.last_name = fieldText.last_name;
  if (!parseDateOfBirth(form.date_of_birth)) errors.date_of_birth = fieldText.date_of_birth;

  if (!form.phone.trim()) {
    errors.phone = fieldText.phoneRequired;
  } else if (phoneDigits.length !== 10) {
    errors.phone = fieldText.phoneInvalid;
  }

  if (!email) {
    errors.email = fieldText.emailRequired;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = fieldText.emailInvalid;
  }

  if (!form.address.trim()) errors.address = fieldText.address;

  if (!zip) {
    errors.zip_code = fieldText.zipRequired;
  } else if (zip.length !== 5) {
    errors.zip_code = fieldText.zipInvalid;
  }

  if (!form.city.trim()) errors.city = fieldText.city;
  if (!form.state.trim()) {
    errors.state = fieldText.stateRequired;
  } else if (!form.location_id) {
    errors.state = fieldText.stateInvalid;
  }
  if (!form.trade_id) errors.trade_id = fieldText.trade_id;

  experienceFields.forEach((field) => {
    if (!String(form[field] || "").trim()) return;
    const value = Number(form[field]);
    if (!Number.isInteger(value) || value < 0 || value > 30) {
      errors[field] = fieldText.experience;
    }
  });

  const totalExperience = Number(form.total_experience_years || 0);
  const experienceBreakdown =
    Number(form.commercial_experience_years || 0) +
    Number(form.industrial_experience_years || 0) +
    Number(form.residential_experience_years || 0);

  if (
    experienceFields.every((field) => !errors[field]) &&
    totalExperience !== experienceBreakdown
  ) {
    errors.total_experience_years = fieldText.totalExperienceMismatch;
  }

  return errors;
}

function normalizeExperienceInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 2);
  if (!digits) return "";
  return String(Math.min(Number(digits), 30));
}

function normalizePercentInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 3);
  if (!digits) return "";
  return String(Math.min(Math.max(Number(digits), 1), 100));
}

function LanguagePicker({ selected, setSelected, englishProficiency, setEnglishProficiency, text }) {
  const toggleLanguage = (language) => {
    if (selected.includes(language)) {
      setSelected(selected.filter((item) => item !== language));
      return;
    }

    setSelected([...selected, language]);
    if (language === "English" && !englishProficiency) {
      setEnglishProficiency("50");
    }
  };

  const englishSelected = selected.includes("English");

  return (
    <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
      <label style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
        {text.labels.languages}
      </label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {languageOptions.map((item) => {
          const active = selected.includes(item);

          return (
            <button
              key={item}
              type="button"
              onClick={() => toggleLanguage(item)}
              style={{
                border: active ? "1px solid #0f172a" : "1px solid #cbd5e1",
                background: active ? "#0f172a" : "#fff",
                borderRadius: 999,
                minHeight: 44,
                padding: "9px 14px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: active ? "#ffffff" : "#0f172a",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              {active ? <CheckCircle2 size={14} /> : <Plus size={14} />}
              {item}
            </button>
          );
        })}
      </div>

      {englishSelected ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            padding: 12,
            borderRadius: 16,
            border: "1px solid #dbeafe",
            background: "#f8fbff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <span style={{ color: "#334155", fontWeight: 800 }}>{text.labels.englishLevel}</span>
            <strong style={{ color: "#0f172a" }}>{englishProficiency || 50}%</strong>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={englishProficiency || "50"}
            onChange={(e) => setEnglishProficiency(e.target.value)}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              inputMode="numeric"
              maxLength={3}
              value={englishProficiency || ""}
              onChange={(e) => setEnglishProficiency(normalizePercentInput(e.target.value))}
              placeholder="50"
              style={{ ...inputStyle(), height: 42, width: 86, padding: "8px 12px" }}
            />
            <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>1-100%</span>
          </div>
        </div>
      ) : null}
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

function ProjectHistoryEditor({ projects, setProjects, text }) {
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
              {text.labels.projectHistory}
            </div>
          </div>
          <div style={{ color: "#64748b", fontSize: 14 }}>
            {text.labels.projectHelp}
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
          {text.labels.addProject}
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
                {text.labels.project} #{index + 1}
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
                {text.labels.remove}
              </button>
            </div>

            <div
              className="project-grid"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
            >
              <Field label={text.labels.projectName}>
                <input
                  value={project.project_name}
                  onChange={(e) =>
                    updateProject(index, "project_name", e.target.value)
                  }
                  placeholder={text.placeholders.projectName}
                  style={inputStyle()}
                />
              </Field>

              <Field label={text.labels.projectLocation}>
                <input
                  value={project.project_location}
                  onChange={(e) =>
                    updateProject(index, "project_location", e.target.value)
                  }
                  placeholder={text.placeholders.projectLocation}
                  style={inputStyle()}
                />
              </Field>

              <Field label={text.labels.duration}>
                <input
                  value={project.project_duration}
                  onChange={(e) =>
                    updateProject(index, "project_duration", e.target.value)
                  }
                  placeholder={text.placeholders.duration}
                  style={inputStyle()}
                />
              </Field>
            </div>

            <Field label={text.labels.description}>
              <textarea
                value={project.project_description}
                onChange={(e) =>
                  updateProject(index, "project_description", e.target.value)
                }
                placeholder={text.placeholders.projectDescription}
                style={textareaStyle(110)}
              />
            </Field>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegistrationSuccessPanel({ text, onRegisterAnother, summary }) {
  const summaryRows = [
    [text.labels.firstName, summary?.firstName],
    [text.labels.lastName, summary?.lastName],
    [text.labels.phone, summary?.phone],
    [text.labels.email, summary?.email],
    [text.labels.trade, summary?.trade],
  ].filter(([, value]) => String(value || "").trim());

  return (
    <div
      style={{
        display: "grid",
        justifyItems: "center",
        textAlign: "center",
        gap: 18,
        padding: "38px 18px 26px",
      }}
    >
      <div
        style={{
          width: 74,
          height: 74,
          borderRadius: "50%",
          background: "#ecfdf5",
          color: "#047857",
          border: "1px solid #a7f3d0",
          display: "grid",
          placeItems: "center",
        }}
      >
        <CheckCircle2 size={40} strokeWidth={2.2} />
      </div>

      <div style={{ display: "grid", gap: 10, maxWidth: 620 }}>
        <h2
          style={{
            margin: 0,
            color: "#0f172a",
            fontSize: "clamp(28px, 4vw, 40px)",
            lineHeight: 1.08,
            letterSpacing: 0,
          }}
        >
          {text.messages.successTitle}
        </h2>
        <p
          style={{
            margin: 0,
            color: "#475569",
            fontSize: 18,
            lineHeight: 1.55,
          }}
        >
          {text.messages.successDetail}
        </p>
      </div>

      {summaryRows.length > 0 ? (
        <div
          style={{
            width: "min(100%, 620px)",
            display: "grid",
            gap: 10,
            padding: 18,
            borderRadius: 18,
            background: "#f8fafc",
            border: "1px solid #dbeafe",
            textAlign: "left",
          }}
        >
          <div style={{ color: "#0f172a", fontWeight: 900 }}>
            {text.messages.successSummaryTitle}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {summaryRows.map(([label, value]) => (
              <div key={label} style={{ minWidth: 0 }}>
                <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>
                  {label}
                </div>
                <div
                  style={{
                    color: "#0f172a",
                    fontWeight: 850,
                    overflowWrap: "anywhere",
                    marginTop: 3,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}>
      {summary?.email ? (
        <a
          href={`/login?email=${encodeURIComponent(summary.email)}`}
          style={{
            marginTop: 6,
            textDecoration: "none",
            background: "#2563eb",
            color: "#ffffff",
            borderRadius: 14,
            padding: "14px 20px",
            fontWeight: 900,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ShieldCheck size={18} />
          {text.actions.openPortal}
        </a>
      ) : null}
      <button
        type="button"
        onClick={onRegisterAnother}
        style={{
          marginTop: 6,
          border: "none",
          background: "#0f172a",
          color: "#ffffff",
          borderRadius: 14,
          padding: "14px 20px",
          fontWeight: 900,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Plus size={18} />
        {text.actions.registerAnother}
      </button>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [locale, setLocale] = useState("en");
  const [form, setForm] = useState(initialForm);
  const [projects, setProjects] = useState([emptyProject()]);
  const [currentStep, setCurrentStep] = useState(0);
  const [languages, setLanguages] = useState([]);
  const [englishProficiency, setEnglishProficiency] = useState("50");
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [company, setCompany] = useState("");
  const [zipLookupStatus, setZipLookupStatus] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const [lastSubmissionSummary, setLastSubmissionSummary] = useState(null);
  const text = copy[locale];
  const registrationSteps = text.steps.map((step, index) => ({
    ...step,
    fields: registrationStepFields[index].fields,
  }));

  useEffect(() => {
    void Promise.resolve().then(() => {
      try {
        const savedDraft = JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || "null");
        if (!savedDraft || typeof savedDraft !== "object") return;

        if (savedDraft.form && typeof savedDraft.form === "object") {
          setForm({ ...initialForm, ...savedDraft.form });
        }
        if (Array.isArray(savedDraft.projects) && savedDraft.projects.length > 0) {
          setProjects(savedDraft.projects.map((project) => ({ ...emptyProject(), ...project })));
        }
        if (Array.isArray(savedDraft.languages)) {
          setLanguages(savedDraft.languages);
        }
        if (savedDraft.englishProficiency) {
          setEnglishProficiency(String(savedDraft.englishProficiency));
        }
        if (Array.isArray(savedDraft.selectedSkillIds)) {
          setSelectedSkillIds(savedDraft.selectedSkillIds);
        }
        if (Array.isArray(savedDraft.selectedCertificationIds)) {
          setSelectedCertificationIds(savedDraft.selectedCertificationIds);
        }
        if (Number.isInteger(savedDraft.currentStep)) {
          setCurrentStep(Math.min(Math.max(savedDraft.currentStep, 0), registrationStepFields.length - 1));
        }
        setDraftRestored(true);
        window.setTimeout(() => setDraftRestored(false), 3500);
      } catch {
        localStorage.removeItem(AUTOSAVE_KEY);
      }
    });
  }, []);

  useEffect(() => {
    if (success) return;

    const hasDraftContent =
      Object.values(form).some((value) => String(value || "").trim()) ||
      projects.some((project) =>
        Object.values(project).some((value) => String(value || "").trim())
      ) ||
      languages.length > 0 ||
      selectedSkillIds.length > 0 ||
      selectedCertificationIds.length > 0;

    const timer = window.setTimeout(() => {
      if (!hasDraftContent) {
        localStorage.removeItem(AUTOSAVE_KEY);
        return;
      }

      localStorage.setItem(
        AUTOSAVE_KEY,
        JSON.stringify({
          form,
          projects,
          languages,
          englishProficiency,
          selectedSkillIds,
          selectedCertificationIds,
          currentStep,
        })
      );
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    form,
    projects,
    languages,
    englishProficiency,
    selectedSkillIds,
    selectedCertificationIds,
    currentStep,
    success,
  ]);

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
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleExperienceChange = (field, value) => {
    handleChange(field, normalizeExperienceInput(value));
  };

  const handleZipChange = (value) => {
    const zip = normalizeZipCode(value);
    handleChange("zip_code", zip);
    setZipLookupStatus(zip.length === 5 ? text.messages.zipLooking : "");
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
          setZipLookupStatus(text.messages.zipNotFound);
          return;
        }

        const locationId = findLocationIdByState(locationOptions, result.state);
        setForm((prev) => ({
          ...prev,
          city: result.city || prev.city,
          state: result.state || prev.state,
          location_id: locationId || prev.location_id,
        }));
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.city;
          delete next.state;
          delete next.location_id;
          return next;
        });
        setZipLookupStatus(text.messages.zipFilled);
      } catch {
        if (active) setZipLookupStatus(text.messages.zipLookupFailed);
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [form.zip_code, locationOptions, text.messages.zipFilled, text.messages.zipLookupFailed, text.messages.zipNotFound]);

  const resetForm = ({ keepSuccess = false } = {}) => {
    setForm(initialForm);
    setProjects([emptyProject()]);
    setCurrentStep(0);
    setLanguages([]);
    setEnglishProficiency("50");
    setSelectedSkillIds([]);
    setSelectedCertificationIds([]);
    setTurnstileToken("");
    setTurnstileResetKey((prev) => prev + 1);
    setCompany("");
    setZipLookupStatus("");
    setFieldErrors({});
    setError("");
    localStorage.removeItem(AUTOSAVE_KEY);
    if (!keepSuccess) {
      setSuccess(false);
      setLastSubmissionSummary(null);
    }
  };

  const registerAnotherWorker = () => {
    resetForm();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateCurrentStep = () => {
    const allErrors = getRegistrationFieldErrors(form, text);
    const fields = registrationSteps[currentStep].fields;
    const stepErrors = Object.fromEntries(
      Object.entries(allErrors).filter(([field]) => fields.includes(field))
    );

    setFieldErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      setError(text.messages.continueError);
      return false;
    }

    setError("");
    return true;
  };

  const goToNextStep = () => {
    if (!validateCurrentStep()) return;
    setCurrentStep((prev) => Math.min(prev + 1, registrationSteps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (currentStep < registrationSteps.length - 1) {
      goToNextStep();
      return;
    }

    setError("");
    setFieldErrors({});
    setSuccess(false);

    if (!supabase) {
      setError(text.messages.missingSupabase);
      return;
    }

    const fullName = buildFullName(form.first_name, form.last_name);

    const nextFieldErrors = getRegistrationFieldErrors(form, text);

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(text.messages.submitError);
      return;
    }

    if (!turnstileSiteKey) {
      setError(text.messages.missingTurnstile);
      return;
    }

    if (!turnstileToken) {
      setError(text.messages.completeVerification);
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
            date_of_birth: toIsoDate(form.date_of_birth),
            name: fullName,
            languages,
            languageProficiencies: languages.includes("English")
              ? { English: Number(englishProficiency || 50) }
              : {},
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
        if (result.field) {
          setFieldErrors((prev) => ({
            ...prev,
            [result.field]: result.error || "Please review this field.",
          }));
        }

        throw new Error(
          result.error || text.messages.saveError
        );
      }

      console.log("Worker created:", result.workerId);

      setLastSubmissionSummary({
        firstName: form.first_name.trim(),
        lastName: form.last_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        trade:
          tradeOptions.find((trade) => trade.id === form.trade_id)?.name ||
          text.placeholders.trade,
      });
      resetForm({ keepSuccess: true });
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err.message || text.messages.saveError
      );
      setTurnstileToken("");
      setTurnstileResetKey((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <UtsTopNavBar
        rightSlot={
          <button
            type="button"
            className="uts-topbar-action register-language-btn"
            onClick={() => {
              setLocale((prev) => (prev === "en" ? "es" : "en"));
              setTurnstileToken("");
              setTurnstileResetKey((prev) => prev + 1);
            }}
            title={text.toggleLabel}
            aria-label={text.toggleLabel}
            style={{
              minHeight: 46,
              borderRadius: 999,
              padding: "8px 14px",
              border: "1px solid rgba(255,255,255,0.28)",
              background: "#0f172a",
              color: "#ffffff",
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.22)",
              gap: 10,
            }}
          >
            <Globe2 size={22} strokeWidth={1.9} />
            <span style={{ fontSize: 16, lineHeight: 1 }}>{text.localeLabel}</span>
            <ChevronDown size={18} strokeWidth={2.4} />
          </button>
        }
      />
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
                  {text.title}
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
                  {text.subtitle}
                </p>

                {draftRestored && !success ? (
                  <div
                    style={{
                      marginTop: 14,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 12px",
                      borderRadius: 999,
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      color: "#1e3a8a",
                      fontWeight: 850,
                      fontSize: 14,
                    }}
                  >
                    <CheckCircle2 size={15} />
                    {text.messages.draftRestored}
                  </div>
                ) : null}
              </div>

              {success ? (
                <RegistrationSuccessPanel
                  text={text}
                  summary={lastSubmissionSummary}
                  onRegisterAnother={registerAnotherWorker}
                />
              ) : (
              <form noValidate onSubmit={handleSubmit} style={{ display: "grid", gap: 26 }}>
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

                <Stepper
                  steps={registrationSteps}
                  currentStep={currentStep}
                  setCurrentStep={setCurrentStep}
                  stepLabel={text.stepLabel}
                />

                {currentStep === 0 ? (
                <div className="personal-info-grid">
                  <Field label={text.labels.firstName} required>
                    <input
                      required
                      autoComplete="given-name"
                      value={form.first_name}
                      onChange={(e) => handleChange("first_name", e.target.value)}
                      placeholder={text.placeholders.firstName}
                      style={inputStyle()}
                    />
                    <FieldError>{fieldErrors.first_name}</FieldError>
                  </Field>

                  <Field label={text.labels.lastName} required>
                    <input
                      required
                      autoComplete="family-name"
                      value={form.last_name}
                      onChange={(e) => handleChange("last_name", e.target.value)}
                      placeholder={text.placeholders.lastName}
                      style={inputStyle()}
                    />
                    <FieldError>{fieldErrors.last_name}</FieldError>
                  </Field>

                  <Field label={text.labels.dateOfBirth} required>
                    <DatePicker
                      required
                      selected={parseDateOfBirth(form.date_of_birth)}
                      onChange={(date) => handleChange("date_of_birth", formatDateOfBirth(date))}
                      onChangeRaw={(event) => handleChange("date_of_birth", event?.target?.value || "")}
                      dateFormat="MM/dd/yyyy"
                      placeholderText={text.placeholders.dateOfBirth}
                      maxDate={new Date()}
                      minDate={new Date(1900, 0, 1)}
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      autoComplete="bday"
                      aria-label={text.labels.dateOfBirth}
                      wrapperClassName="date-picker-full-width"
                      customInput={<input style={inputStyle()} inputMode="numeric" />}
                    />
                    <FieldError>{fieldErrors.date_of_birth}</FieldError>
                  </Field>

                  <Field label={text.labels.phone} required>
                    <input
                      required
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", formatPhoneInput(e.target.value))}
                      placeholder={text.placeholders.phone}
                      style={inputStyle()}
                    />
                    <FieldError>{fieldErrors.phone}</FieldError>
                  </Field>

                  <Field label={text.labels.email} required>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder={text.placeholders.email}
                      style={inputStyle()}
                    />
                    <FieldError>{fieldErrors.email}</FieldError>
                  </Field>

                  <Field label={text.labels.address} required>
                    <input
                      required
                      autoComplete="street-address"
                      value={form.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      placeholder={text.placeholders.address}
                      style={inputStyle()}
                    />
                    <FieldError>{fieldErrors.address}</FieldError>
                  </Field>

                  <Field label={text.labels.zip} required>
                    <input
                      required
                      inputMode="numeric"
                      autoComplete="postal-code"
                      value={form.zip_code}
                      onChange={(e) => handleZipChange(e.target.value)}
                      placeholder={text.placeholders.zip}
                      style={inputStyle()}
                    />
                    {zipLookupStatus ? (
                      <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                        {zipLookupStatus}
                      </div>
                    ) : null}
                    <FieldError>{fieldErrors.zip_code}</FieldError>
                  </Field>

                  <Field label={text.labels.city} required>
                    <input
                      value={form.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      placeholder={text.placeholders.city}
                      style={inputStyle()}
                    />
                    <FieldError>{fieldErrors.city}</FieldError>
                  </Field>

                  <Field label={text.labels.state} required>
                    <input
                      value={form.state}
                      onChange={(e) => {
                        const state = getFullStateName(e.target.value);
                        const locationId = findLocationIdByState(locationOptions, state);
                        setForm((prev) => ({
                          ...prev,
                          state,
                          location_id: locationId || "",
                        }));
                        setFieldErrors((prev) => {
                          if (!prev.state) return prev;
                          const next = { ...prev };
                          delete next.state;
                          return next;
                        });
                      }}
                      placeholder={text.placeholders.state}
                      style={inputStyle()}
                    />
                    <FieldError>{fieldErrors.state}</FieldError>
                  </Field>

                </div>
                ) : null}

                {currentStep === 1 ? (
                <>
                <div className="experience-top-grid">
                  <Field label={text.labels.trade} required>
                    <select
                      value={form.trade_id}
                      onChange={(e) => handleChange("trade_id", e.target.value)}
                      style={inputStyle()}
                    >
                      <option value="">{text.placeholders.trade}</option>
                      {tradeOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <FieldError>{fieldErrors.trade_id}</FieldError>
                  </Field>

                  <Field label={text.labels.totalExperience}>
                    <input
                      inputMode="numeric"
                      maxLength={2}
                      value={form.total_experience_years}
                      onChange={(e) =>
                        handleExperienceChange("total_experience_years", e.target.value)
                      }
                      placeholder="8"
                      style={{ ...inputStyle(), maxWidth: 220 }}
                    />
                    <FieldError>{fieldErrors.total_experience_years}</FieldError>
                  </Field>
                </div>

                <div className="experience-mini-grid">
                  <Field label={text.labels.commercialExperience}>
                    <input
                      inputMode="numeric"
                      maxLength={2}
                      value={form.commercial_experience_years}
                      onChange={(e) =>
                        handleExperienceChange("commercial_experience_years", e.target.value)
                      }
                      placeholder="4"
                      style={inputStyle()}
                    />
                    <FieldError>{fieldErrors.commercial_experience_years}</FieldError>
                  </Field>

                  <Field label={text.labels.industrialExperience}>
                    <input
                      inputMode="numeric"
                      maxLength={2}
                      value={form.industrial_experience_years}
                      onChange={(e) =>
                        handleExperienceChange("industrial_experience_years", e.target.value)
                      }
                      placeholder="6"
                      style={inputStyle()}
                    />
                    <FieldError>{fieldErrors.industrial_experience_years}</FieldError>
                  </Field>

                  <Field label={text.labels.residentialExperience}>
                    <input
                      inputMode="numeric"
                      maxLength={2}
                      value={form.residential_experience_years}
                      onChange={(e) =>
                        handleExperienceChange("residential_experience_years", e.target.value)
                      }
                      placeholder="2"
                      style={inputStyle()}
                    />
                    <FieldError>{fieldErrors.residential_experience_years}</FieldError>
                  </Field>
                </div>

                <div style={{ height: 1, background: "#e2e8f0" }} />

                <ProjectHistoryEditor projects={projects} setProjects={setProjects} text={text} />
                </>
                ) : null}

                {currentStep === 2 ? (
                <>
                <div
                  className="two-col"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 18,
                  }}
                >
                  <Field label={text.labels.strengths}>
                    <textarea
                      value={form.strengths}
                      onChange={(e) => handleChange("strengths", e.target.value)}
                      placeholder={text.placeholders.strengths}
                      style={textareaStyle(120)}
                    />
                  </Field>

                  <Field label={text.labels.needsImprovement}>
                    <textarea
                      value={form.needs_improvement}
                      onChange={(e) =>
                        handleChange("needs_improvement", e.target.value)
                      }
                      placeholder={text.placeholders.needsImprovement}
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
                  <LanguagePicker
                    selected={languages}
                    setSelected={setLanguages}
                    englishProficiency={englishProficiency}
                    setEnglishProficiency={setEnglishProficiency}
                    text={text}
                  />

                  <CatalogPicker
                    label={text.labels.skills}
                    icon={<Wrench size={16} color="#334155" />}
                    items={skillOptions}
                    selectedIds={selectedSkillIds}
                    setSelectedIds={setSelectedSkillIds}
                    emptyText={text.messages.noSkills}
                  />
                </div>

                <CatalogPicker
                  label={text.labels.certifications}
                  icon={<ShieldCheck size={16} color="#334155" />}
                  items={certificationOptions}
                  selectedIds={selectedCertificationIds}
                  setSelectedIds={setSelectedCertificationIds}
                  emptyText={text.messages.noCertifications}
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
                    {text.labels.verification}
                  </div>
                  <div style={{ color: "#475569", fontSize: 14 }}>
                    {text.labels.verificationHelp}
                  </div>

                  <TurnstileField
                    siteKey={turnstileSiteKey}
                    onVerify={setTurnstileToken}
                    resetKey={turnstileResetKey}
                    language={locale}
                  />
                </div>
                </>
                ) : null}

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

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {currentStep > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep((prev) => Math.max(prev - 1, 0));
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        disabled={loading}
                        style={{
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          color: "#0f172a",
                          borderRadius: 14,
                          padding: "13px 18px",
                          fontWeight: 800,
                          cursor: loading ? "not-allowed" : "pointer",
                        }}
                      >
                        {text.actions.back}
                      </button>
                    ) : null}

                    {currentStep < registrationSteps.length - 1 ? (
                      <button
                        type="button"
                        onClick={goToNextStep}
                        disabled={loading || bootLoading}
                        style={{
                          border: "none",
                          background: loading || bootLoading ? "#94a3b8" : "#0f172a",
                          color: "#ffffff",
                          borderRadius: 14,
                          padding: "13px 18px",
                          fontWeight: 800,
                          cursor: loading || bootLoading ? "not-allowed" : "pointer",
                        }}
                      >
                        {text.actions.continue}
                      </button>
                    ) : (
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
                        {loading ? text.actions.saving : text.actions.register}
                      </button>
                    )}
                  </div>

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
                    {text.actions.clear}
                  </button>
                </div>
              </form>
              )}
            </div>
          </Motion.div>
        </div>
      </div>
      <GoToTopButton showAfter={600} />
    </>
  );
}
