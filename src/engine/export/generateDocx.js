import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  CommentRangeStart,
  CommentRangeEnd,
  CommentReference,
  Packer,
} from "docx";
import { saveAs } from "../utils/saveBlob.js";
import { SECTIONS, SECTION_GROUPS } from "../../packages/v2024/fr/sections.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeParagraph(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: 120 },
  });
}

function makeHeading(text, level = HeadingLevel.HEADING_2) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 280, after: 120 },
  });
}

function makeLabel(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: "30323E" })],
    spacing: { after: 60 },
  });
}

function makeContext(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text: `« ${text} »`,
        italics: true,
        color: "9E9E9E",
        size: 20,
      }),
    ],
    spacing: { after: 80 },
  });
}

function makeValue(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: false,
        size: 22,
        color: "1A1A1A",
      }),
    ],
    spacing: { after: 160 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "DFE4E8" },
    },
  });
}

function makeEmpty() {
  return new Paragraph({ text: "", spacing: { after: 80 } });
}

function makeDivider() {
  return new Paragraph({
    text: "",
    spacing: { before: 160, after: 160 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "E30513" },
    },
  });
}

// ── Personnel Table ────────────────────────────────────────────────────────

function makePersonnelTable(rows) {
  if (!rows || rows.length === 0) return [];

  const headerRow = new TableRow({
    tableHeader: true,
    children: ["No.", "Poste", "Exp. générale (ans)", "Exp. comparable (ans)", "Note"].map(
      (text) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text, bold: true, size: 20 })],
            }),
          ],
          shading: { fill: "F2F2F2" },
          width: { size: text === "No." ? 5 : text === "Poste" ? 30 : 20, type: WidthType.PERCENTAGE },
        })
    ),
  });

  const dataRows = rows.map((row, idx) =>
    new TableRow({
      children: [
        new TableCell({ children: [makeParagraph(String(idx + 1))] }),
        new TableCell({ children: [makeParagraph(row.poste || "")] }),
        new TableCell({ children: [makeParagraph(row.exp_generale || "")] }),
        new TableCell({ children: [makeParagraph(row.exp_comparable || "")] }),
        new TableCell({ children: [makeParagraph(row.note || "")] }),
      ],
    })
  );

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    }),
    makeEmpty(),
  ];
}

// ── Matériel Table ─────────────────────────────────────────────────────────

function makeMaterielTable(rows) {
  if (!rows || rows.length === 0) return [];

  const headerRow = new TableRow({
    tableHeader: true,
    children: ["No.", "Type de matériel et caractéristiques", "Nombre minimal requis"].map(
      (text) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20 })] })],
          shading: { fill: "F2F2F2" },
        })
    ),
  });

  const dataRows = rows.map((row, idx) =>
    new TableRow({
      children: [
        new TableCell({ children: [makeParagraph(String(idx + 1))] }),
        new TableCell({ children: [makeParagraph(row.type_materiel || "")] }),
        new TableCell({ children: [makeParagraph(row.nombre_minimal || "")] }),
      ],
    })
  );

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    }),
    makeEmpty(),
  ];
}

// ── Proposition Technique List ─────────────────────────────────────────────

function makePropositionList(items) {
  if (!items || items.length === 0) return [];
  return items.map((item) =>
    new Paragraph({
      children: [
        new TextRun({
          text: `${item.enabled ? "☑" : "☐"} `,
          bold: true,
          color: item.enabled ? "E30513" : "AAAAAA",
        }),
        new TextRun({
          text: item.label,
          bold: item.enabled,
          color: item.enabled ? "1A1A1A" : "AAAAAA",
        }),
        item.description
          ? new TextRun({
              text: ` — ${item.description}`,
              italics: true,
              color: "777777",
              size: 20,
            })
          : new TextRun(""),
      ],
      spacing: { after: 80 },
    })
  );
}

// ── Format field value for display ────────────────────────────────────────

function formatValue(field, value) {
  if (!value && value !== 0) return "[non renseigné]";
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "[non renseigné]";
  }
  if (field.type === "date") {
    try {
      return new Date(value).toLocaleDateString("fr-FR");
    } catch {
      return value;
    }
  }
  return String(value).trim() || "[non renseigné]";
}

// ── Main export function ──────────────────────────────────────────────────

export async function generateDocx({
  formData,
  actorAssignments,
  fieldComments,
  actors,
  personnelRows,
  materielRows,
  propositionItems,
}) {
  const allComments = [];
  let commentId = 1;

  // Build paragraphs for each field with optional Word comments
  function buildFieldParagraphs(field, sectionFormData = formData) {
    const paragraphs = [];
    const value = sectionFormData[field.id];
    const assigned = actorAssignments[field.id] || [];
    const freeComment = fieldComments[field.id];

    // Label
    paragraphs.push(makeLabel(`${field.label}${field.ref ? ` (${field.ref})` : ""}`));

    // Context
    if (field.context) {
      paragraphs.push(makeContext(field.context));
    }

    // Special types
    if (field.type === "personnel_table") {
      paragraphs.push(...makePersonnelTable(personnelRows));
      return paragraphs;
    }
    if (field.type === "materiel_table") {
      paragraphs.push(...makeMaterielTable(materielRows));
      return paragraphs;
    }
    if (field.type === "proposition_list") {
      paragraphs.push(...makePropositionList(propositionItems));
      return paragraphs;
    }

    // Build value run(s) with optional comment
    const displayVal = formatValue(field, value);
    const isDelegated = assigned.length > 0;
    const hasComment = (isDelegated && assigned.length > 0) || !!freeComment;

    if (hasComment) {
      // Create one comment per actor
      const commentIds = [];

      assigned.forEach((actorId) => {
        const actor = actors.find((a) => a.id === actorId);
        if (!actor) return;
        const cId = commentId++;
        commentIds.push(cId);
        allComments.push({
          id: cId,
          author: actor.label,
          date: new Date(),
          children: [
            new Paragraph({
              children: [new TextRun({ text: actor.defaultComment || "" })],
            }),
          ],
        });
      });

      // Free comment
      if (freeComment) {
        const cId = commentId++;
        commentIds.push(cId);
        allComments.push({
          id: cId,
          author: "Commentaire",
          date: new Date(),
          children: [
            new Paragraph({
              children: [new TextRun({ text: freeComment })],
            }),
          ],
        });
      }

      // Paragraph with comment range markers
      const children = [];
      commentIds.forEach((cId) => children.push(new CommentRangeStart({ id: cId })));
      children.push(
        new TextRun({
          text: isDelegated
            ? `[À compléter par : ${assigned.map((id) => actors.find((a) => a.id === id)?.label || id).join(", ")}]`
            : displayVal,
          color: isDelegated ? "999999" : "1A1A1A",
          italics: isDelegated,
          size: 22,
        })
      );
      commentIds.forEach((cId) => children.push(new CommentRangeEnd({ id: cId })));
      commentIds.forEach((cId) => children.push(new CommentReference({ id: cId })));

      paragraphs.push(
        new Paragraph({
          children,
          spacing: { after: 160 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "DFE4E8" },
          },
        })
      );
    } else {
      paragraphs.push(makeValue(displayVal));
    }

    // Note
    if (field.note) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `ℹ️ ${field.note}`,
              italics: true,
              color: "E65100",
              size: 19,
            }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    return paragraphs;
  }

  // ── Cover page ──────────────────────────────────────────────────────────
  const coverParagraphs = [
    new Paragraph({
      children: [
        new TextRun({
          text: "DOCUMENT D'APPEL D'OFFRES",
          bold: true,
          size: 40,
          color: "E30513",
          allCaps: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Travaux — Format PAY",
          bold: true,
          size: 28,
          color: "30323E",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Agence Française de Développement · Révision Février 2024", color: "777777", size: 20 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    makeDivider(),
    new Paragraph({
      children: [
        new TextRun({ text: "Projet : ", bold: true, size: 26 }),
        new TextRun({ text: formData.nom_projet || "[non renseigné]", size: 26 }),
      ],
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Maître d'Ouvrage : ", bold: true, size: 24 }),
        new TextRun({ text: formData.nom_maitrise_ouvrage || "[non renseigné]", size: 24 }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Pays : ", bold: true, size: 24 }),
        new TextRun({ text: formData.pays || "[non renseigné]", size: 24 }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Référence AOI : ", bold: true, size: 24 }),
        new TextRun({ text: formData.ref_aoi || "[non renseigné]", size: 24 }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Date d'émission : ", bold: true, size: 24 }),
        new TextRun({
          text: formData.date_emission
            ? new Date(formData.date_emission).toLocaleDateString("fr-FR")
            : "[non renseigné]",
          size: 24,
        }),
      ],
      spacing: { after: 200 },
    }),
    makeDivider(),
    makeEmpty(),
  ];

  // ── Section content ─────────────────────────────────────────────────────
  const sectionParagraphs = [];
  const sectionMap = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

  SECTION_GROUPS.forEach((group) => {
    // Group heading
    sectionParagraphs.push(
      new Paragraph({
        text: group.groupLabel,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    group.sectionIds.forEach((sectionId) => {
      const section = sectionMap[sectionId];
      if (!section) return;

      // Section heading
      sectionParagraphs.push(makeHeading(`${section.icon} ${section.title}`));

      if (section.description) {
        sectionParagraphs.push(
          new Paragraph({
            children: [new TextRun({ text: section.description, italics: true, color: "777777", size: 20 })],
            spacing: { after: 160 },
          })
        );
      }

      // Fields
      section.fields.forEach((field) => {
        // Check condition
        if (field.condition) {
          const [condField, condVal] = field.condition.split("=");
          if (formData[condField] !== condVal) return;
        }
        const fieldParas = buildFieldParagraphs(field);
        sectionParagraphs.push(...fieldParas);
      });

      sectionParagraphs.push(makeEmpty());
    });
  });

  // ── Build document ─────────────────────────────────────────────────────
  const doc = new Document({
    title: "DTAO Travaux PAY",
    description: `Document d'Appel d'Offres — ${formData.nom_projet || "Projet"}`,
    creator: formData.nom_maitrise_ouvrage || "Maître d'Ouvrage",
    ...(allComments.length > 0 ? { comments: { children: allComments } } : {}),
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 22,
          },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 32,
            bold: true,
            color: "E30513",
            font: "Calibri",
          },
          paragraph: {
            spacing: { before: 400, after: 200 },
          },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 26,
            bold: true,
            color: "30323E",
            font: "Calibri",
          },
          paragraph: {
            spacing: { before: 280, after: 120 },
          },
        },
      ],
    },
    sections: [
      {
        children: [...coverParagraphs, ...sectionParagraphs],
      },
    ],
  });

  // ── Save file ──────────────────────────────────────────────────────────
  const projectName = (formData.nom_projet || "DTAO")
    .replace(/[^a-zA-Z0-9À-ÿ\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  const date = new Date().toISOString().slice(0, 10);
  const filename = `DTAO_${projectName}_${date}.docx`;

  const buffer = await Packer.toBlob(doc);
  saveAs(buffer, filename);
  return filename;
}
