import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  PageOrientation,
  TextRun,
} from "docx";

const FONT = "Arial";
const BODY_SIZE = 27;
const LABEL_SIZE = 27;
const TITLE_SIZE = 64;

const cleanLines = (value) => String(value || "")
  .split(/\r?\n|\s*;\s*/)
  .map((item) => item.trim().replace(/^[•*-]\s*/, ""))
  .filter(Boolean);

const experienceDistribution = (worker) => {
  const values = [
    Number(worker.commercial_experience_years || 0),
    Number(worker.industrial_experience_years || 0),
    Number(worker.residential_experience_years || 0),
  ];
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!total) return [0, 0, 0];
  const commercial = Math.round((values[0] / total) * 100);
  const industrial = Math.round((values[1] / total) * 100);
  return [commercial, industrial, 100 - commercial - industrial];
};

export function createInitialCtsBio(worker) {
  const [commercialExperience, industrialExperience, residentialExperience] = experienceDistribution(worker);
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
    commercialExperience: String(commercialExperience),
    industrialExperience: String(industrialExperience),
    residentialExperience: String(residentialExperience),
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
  spacing: { after: 235, line: 340 },
  children: [
    run(`${label}: `, { bold: true, size: LABEL_SIZE }),
    run(`${value || ""}${suffix}`),
  ],
});

const heading = (text) => new Paragraph({
  spacing: { before: 130, after: 135, line: 340 },
  children: [run(`${text}:`, { bold: true, size: LABEL_SIZE })],
});

const bullets = (values) => values.map((value) => new Paragraph({
  bullet: { level: 0 },
  spacing: { after: 125, line: 330 },
  indent: { left: 430, hanging: 210 },
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
          size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
          margin: { top: 720, right: 900, bottom: 720, left: 900 },
        },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 920, line: 520 },
          children: [run("CANDIDATE BIO", { bold: true, size: TITLE_SIZE })],
        }),
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
          spacing: { before: 220, line: 340 },
          children: [run(bio.notes, { bold: true })],
        }),
      ],
    }],
  });

  return Packer.toBlob(document);
}

export const sanitizeBioFileName = (name) => `${String(name || "Candidate")
  .trim()
  .replace(/[^a-zA-Z0-9_-]+/g, "_")}_CTS_BIO.docx`;
