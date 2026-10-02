import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import type { ResumeData } from "../types";

export type TemplateStyle = "modern" | "executive" | "technical" | "minimalist";

/**
 * Renders structured JSON Resume and Cover Letter into clean HTML templates.
 */
export function renderResumeHtml(
  profile: ResumeData,
  style: TemplateStyle = "modern",
  coverLetterText?: string
): string {
  const basics = profile.basics || {};
  const work = profile.work || [];
  const education = profile.education || [];
  const skills = profile.skills || [];
  const projects = profile.projects || [];

  const accentColor =
    style === "executive"
      ? "#1E293B"
      : style === "technical"
      ? "#0F172A"
      : style === "minimalist"
      ? "#334155"
      : "#2563EB";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${basics.name || "Resume"} - CVMama Tailored Package</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      color: #0F172A;
      margin: 0;
      padding: 32px 40px;
      line-height: 1.5;
      background: #FFFFFF;
      font-size: 13px;
    }
    .header {
      border-bottom: 2px solid ${accentColor};
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .name {
      font-size: 24px;
      font-weight: 700;
      color: ${accentColor};
      letter-spacing: -0.02em;
    }
    .title {
      font-size: 14px;
      font-weight: 600;
      color: #475569;
      margin-top: 2px;
    }
    .contact {
      font-size: 11px;
      color: #64748B;
      margin-top: 6px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${accentColor};
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 4px;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .item {
      margin-bottom: 12px;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      font-weight: 600;
      color: #1E293B;
    }
    .item-sub {
      font-size: 12px;
      color: #64748B;
      margin-top: 1px;
    }
    ul {
      margin: 6px 0 0 18px;
      padding: 0;
    }
    li {
      margin-bottom: 3px;
      color: #334155;
    }
    .skills-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .skill-cat {
      font-weight: 600;
      color: #1E293B;
    }
    .cover-letter-box {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px dashed #CBD5E1;
      white-space: pre-wrap;
      color: #334155;
      font-size: 13px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${basics.name || "Candidate Name"}</div>
    ${basics.label ? `<div class="title">${basics.label}</div>` : ""}
    <div class="contact">
      ${[basics.email, basics.phone, basics.url, basics.location?.city].filter(Boolean).join(" · ")}
    </div>
  </div>

  ${basics.summary ? `
    <div class="section-title">Professional Summary</div>
    <div style="color: #334155;">${basics.summary}</div>
  ` : ""}

  ${work.length > 0 ? `
    <div class="section-title">Work Experience</div>
    ${work.map(w => `
      <div class="item">
        <div class="item-header">
          <span>${w.position || "Role"} — ${w.name || "Company"}</span>
          <span style="font-size: 11px; color: #64748B;">${[w.startDate, w.endDate || "Present"].filter(Boolean).join(" - ")}</span>
        </div>
        ${w.summary ? `<div class="item-sub">${w.summary}</div>` : ""}
        ${w.highlights && w.highlights.length > 0 ? `
          <ul>
            ${w.highlights.map(h => `<li>${h}</li>`).join("")}
          </ul>
        ` : ""}
      </div>
    `).join("")}
  ` : ""}

  ${skills.length > 0 ? `
    <div class="section-title">Skills & Competencies</div>
    <div class="skills-grid">
      ${skills.map(s => `
        <div>
          <span class="skill-cat">${s.name}:</span>
          <span style="color: #475569;">${s.keywords?.join(", ") || s.level || "Proficient"}</span>
        </div>
      `).join("")}
    </div>
  ` : ""}

  ${education.length > 0 ? `
    <div class="section-title">Education</div>
    ${education.map(e => `
      <div class="item">
        <div class="item-header">
          <span>${e.studyType ? `${e.studyType} in ` : ""}${e.area || "Degree"}</span>
          <span style="font-size: 11px; color: #64748B;">${[e.startDate, e.endDate].filter(Boolean).join(" - ")}</span>
        </div>
        <div class="item-sub">${e.institution || ""}</div>
      </div>
    `).join("")}
  ` : ""}

  ${projects.length > 0 ? `
    <div class="section-title">Key Projects</div>
    ${projects.map(p => `
      <div class="item">
        <div class="item-header">
          <span>${p.name}</span>
        </div>
        ${p.description ? `<div class="item-sub">${p.description}</div>` : ""}
        ${p.highlights && p.highlights.length > 0 ? `
          <ul>
            ${p.highlights.map(h => `<li>${h}</li>`).join("")}
          </ul>
        ` : ""}
      </div>
    `).join("")}
  ` : ""}

  ${coverLetterText ? `
    <div class="section-title" style="margin-top: 40px;">Tailored Cover Letter</div>
    <div class="cover-letter-box">${coverLetterText}</div>
  ` : ""}
</body>
</html>
  `;
}

/**
 * Synthesizes a styled DOCX document from ResumeData.
 */
export async function generateDocxDocument(profile: ResumeData, coverLetterText?: string): Promise<Uint8Array> {
  const basics = profile.basics || {};
  const work = profile.work || [];
  const education = profile.education || [];
  const skills = profile.skills || [];

  const children: Paragraph[] = [
    // Header
    new Paragraph({
      text: basics.name || "Candidate Name",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: [basics.label, basics.email, basics.phone, basics.url].filter(Boolean).join(" | "),
          color: "64748B",
          size: 20
        })
      ]
    }),
    new Paragraph({ text: "" })
  ];

  // Summary
  if (basics.summary) {
    children.push(
      new Paragraph({ text: "SUMMARY", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: basics.summary }),
      new Paragraph({ text: "" })
    );
  }

  // Work Experience
  if (work.length > 0) {
    children.push(new Paragraph({ text: "EXPERIENCE", heading: HeadingLevel.HEADING_2 }));
    for (const w of work) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${w.position || "Role"} at ${w.name || "Company"}`, bold: true }),
            new TextRun({ text: `  (${w.startDate || ""} - ${w.endDate || "Present"})`, italics: true, color: "64748B" })
          ]
        })
      );
      if (w.summary) {
        children.push(new Paragraph({ text: w.summary }));
      }
      if (w.highlights) {
        for (const h of w.highlights) {
          children.push(new Paragraph({ text: `• ${h}` }));
        }
      }
      children.push(new Paragraph({ text: "" }));
    }
  }

  // Education
  if (education.length > 0) {
    children.push(new Paragraph({ text: "EDUCATION", heading: HeadingLevel.HEADING_2 }));
    for (const e of education) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${e.studyType ? `${e.studyType} in ` : ""}${e.area || "Degree"}`, bold: true }),
            new TextRun({ text: ` - ${e.institution || ""}`, color: "64748B" })
          ]
        })
      );
    }
    children.push(new Paragraph({ text: "" }));
  }

  // Cover Letter
  if (coverLetterText) {
    children.push(
      new Paragraph({ text: "COVER LETTER", heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: coverLetterText })
    );
  }

  const doc = new Document({
    sections: [{ children }]
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}
