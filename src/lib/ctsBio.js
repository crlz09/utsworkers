import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

const FONT = "Arial";
const BODY_SIZE = 20;

const cleanLines = (value) => String(value || "")
  .split(/\r?\n|\s*;\s*/)
  .map((item) => item.trim().replace(/^[•*-]\s*/, ""))
  .filter(Boolean);

const percentage = (value, total) => total > 0 ? Math.round((Number(value || 0) / total) * 100) : 0;

export function createInitialCtsBio(worker) {
  const categoryTotal = [
    worker.commercial_experience_years,
    worker.industrial_experience_years,
    worker.residential_experience_years,
  ].reduce((sum, value) => sum + Number(value || 0), 0);
  const projects = [...(worker.worker_projects || [])]
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((project) => [project.project_name, project.project_location].filter(Boolean).join(", "))
    .filter(Boolean);
  const certifications = worker.worker_certifications
    ?.map((item) => item.certifications?.name)
    .filter(Boolean) || [];
  const languages = worker.worker_languages
    ?.map((item) => item.proficiency_percent
      ? `${item.language_name} ${item.proficiency_percent}%`
      : item.language_name)
    .filter(Boolean) || [];
  const localRate = String(worker.rate || "").trim();
  const formattedRate = localRate && !localRate.startsWith("$") ? `$${localRate}` : localRate;

  return {
    name: worker.name || "",
    phone: worker.phone || "",
    email: worker.email || "",
    location: [worker.city, worker.state].filter(Boolean).join(", ") || worker.locations?.name || "",
    trade: worker.trades?.name || "",
    totalExperience: String(worker.total_experience_years ?? ""),
    commercialExperience: String(percentage(worker.commercial_experience_years, categoryTotal)),
    industrialExperience: String(percentage(worker.industrial_experience_years, categoryTotal)),
    residentialExperience: String(percentage(worker.residential_experience_years, categoryTotal)),
    projects: projects.join("\n"),
    strengths: cleanLines(worker.strengths).join("\n"),
    certifications: certifications.join(", "),
    languages: languages.join(", "),
    notes: formattedRate ? `Can take Local jobs for a good rate (${formattedRate})` : "",
  };
}

const run = (text, options = {}) => new TextRun({
  text: String(text ?? ""),
  font: FONT,
  size: BODY_SIZE,
  ...options,
});

const field = (label, value, suffix = "") => new Paragraph({
  spacing: { after: 150 },
  children: [
    run(`${label}: `, { bold: true }),
    run(`${value || ""}${suffix}`),
  ],
});

const heading = (text) => new Paragraph({
  spacing: { before: 80, after: 100 },
  children: [run(`${text}:`, { bold: true })],
});

const bullets = (values) => values.map((value) => new Paragraph({
  bullet: { level: 0 },
  spacing: { after: 70 },
  indent: { left: 360, hanging: 180 },
  children: [run(value)],
}));

export async function buildCtsBioBlob(bio) {
  const document = new Document({
    styles: {
      default: {
        document: { run: { font: FONT, size: BODY_SIZE } },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 720, right: 900, bottom: 720, left: 900 },
        },
      },
      children: [
        field("Name", bio.name),
        field("Phone", bio.phone),
        field("Email", bio.email),
        field("Location", bio.location),
        field("Trade", bio.trade),
        field("Total Experience in Trade", bio.totalExperience, " Years"),
        field("Commercial Experience", bio.commercialExperience, "%"),
        field("Industrial Experience", bio.industrialExperience, "%"),
        field("Residential Experience", bio.residentialExperience, "%"),
        heading("Project History"),
        ...bullets(cleanLines(bio.projects)),
        heading("Strengths"),
        ...bullets(cleanLines(bio.strengths)),
        field("Certifications", bio.certifications),
        field("Language", bio.languages),
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 180 },
          children: [run(bio.notes)],
        }),
      ],
    }],
  });

  return Packer.toBlob(document);
}

export const sanitizeBioFileName = (name) => `${String(name || "Candidate")
  .trim()
  .replace(/[^a-zA-Z0-9_-]+/g, "_")}_CTS_BIO.docx`;
