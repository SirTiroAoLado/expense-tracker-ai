import { CATEGORY_META } from "../../categories";
import { formatCurrency, formatDate } from "../../format";
import { CATEGORIES } from "../../types";
import { orderedColumns } from "../prepare";
import { COLUMN_LABELS, type Exporter, type ExportContext } from "../types";

/** jsPDF's built-in fonts are WinAnsi: swap locale spaces/minus signs for plain ASCII. */
const pdfText = (s: string) => s.replace(/[   ]/g, " ").replace(/−/g, "-");

const INK = [11, 11, 11] as const;
const MUTED = [100, 116, 139] as const;
const BRAND = [42, 120, 214] as const;
const HAIRLINE = [226, 232, 240] as const;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export async function buildPDF(ctx: ExportContext): Promise<Blob> {
  // Lazy-loaded: ~350 KB that only PDF exporters pay for.
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const { rows, options, summary, currency, generatedAt } = ctx;
  const money = (n: number) => pdfText(formatCurrency(n, currency));

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = M;

  // Header band
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 6, "F");
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(...INK);
  doc.text("Expense Report", M, (y += 22));
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...MUTED);
  doc.text(pdfText(`Spendwise  ·  Generated ${generatedAt.toLocaleString()}`), M, (y += 16));

  // Filter description
  const range =
    options.from || options.to
      ? `${options.from ? formatDate(options.from) : "Beginning"} – ${options.to ? formatDate(options.to) : "Today"}`
      : "All dates";
  const cats = options.categories.length === CATEGORIES.length ? "All categories" : options.categories.join(", ");
  doc.text(pdfText(`Period: ${range}    Categories: ${cats}`), M, (y += 13), { maxWidth: W - 2 * M });

  // KPI tiles
  y += 18;
  const tiles = [
    ["Total spent", money(summary.total)],
    ["Expenses", String(summary.count)],
    ["Average", money(summary.average)],
    [
      "Date span",
      summary.firstDate && summary.lastDate
        ? pdfText(`${formatDate(summary.firstDate)} – ${formatDate(summary.lastDate)}`)
        : "—",
    ],
  ];
  const gap = 8;
  const tw = (W - 2 * M - gap * (tiles.length - 1)) / tiles.length;
  tiles.forEach(([label, value], i) => {
    const x = M + i * (tw + gap);
    doc.setDrawColor(...HAIRLINE).setFillColor(248, 250, 252);
    doc.roundedRect(x, y, tw, 46, 4, 4, "FD");
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x + 10, y + 16);
    doc.setFont("helvetica", "bold").setFontSize(i === 3 ? 9 : 13).setTextColor(...INK);
    doc.text(value, x + 10, y + 34, { maxWidth: tw - 16 });
  });
  y += 64;

  // Category breakdown with inline share bars
  if (summary.byCategory.length > 0) {
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...INK);
    doc.text("By category", M, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Category", "Items", "Share", "Total"]],
      body: summary.byCategory.map((c) => [
        c.category,
        String(c.count),
        `${summary.total ? ((c.total / summary.total) * 100).toFixed(1) : "0"}%`,
        money(c.total),
      ]),
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 5, textColor: INK as unknown as [number, number, number] },
      headStyles: { textColor: MUTED as unknown as [number, number, number], fontStyle: "bold", fontSize: 8 },
      columnStyles: { 1: { halign: "right", cellWidth: 50 }, 2: { halign: "right", cellWidth: 60 }, 3: { halign: "right", cellWidth: 100 } },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          const cat = summary.byCategory[data.row.index].category;
          doc.setFillColor(...hexToRgb(CATEGORY_META[cat].color));
          doc.circle(data.cell.x - 1, data.cell.y + data.cell.height / 2, 2.5, "F");
        }
      },
      didParseCell: (data) => {
        if (data.section === "body") data.cell.styles.lineColor = HAIRLINE as unknown as [number, number, number];
        if (data.column.index === 0) data.cell.styles.cellPadding = { left: 8, top: 5, bottom: 5, right: 5 };
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
  }

  // Transactions table
  const cols = orderedColumns(options.columns);
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...INK);
  doc.text("Transactions", M, y);
  autoTable(doc, {
    startY: y + 8,
    margin: { left: M, right: M, bottom: 50 },
    head: [cols.map((c) => COLUMN_LABELS[c])],
    body: rows.map((e) =>
      cols.map((c) =>
        c === "amount" ? money(e.amount) : c === "date" ? pdfText(formatDate(e.date)) : pdfText(String(e[c])),
      ),
    ),
    foot: cols.includes("amount")
      ? [cols.map((c, i) => (c === "amount" ? money(summary.total) : i === 0 ? `Total (${summary.count})` : ""))]
      : undefined,
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 5, overflow: "linebreak" },
    headStyles: { fillColor: BRAND as unknown as [number, number, number], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [241, 245, 249], textColor: INK as unknown as [number, number, number], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: Object.fromEntries(
      cols.map((c, i) => [i, c === "amount" ? { halign: "right" as const, cellWidth: 90 } : c === "date" ? { cellWidth: 85 } : c === "category" ? { cellWidth: 95 } : {}]),
    ),
    showFoot: "lastPage",
  });

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const H = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...HAIRLINE).line(M, H - 32, W - M, H - 32);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED);
    doc.text(pdfText(`${options.filename}.pdf`), M, H - 20);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 20, { align: "right" });
  }

  doc.setProperties({ title: "Expense Report", creator: "Spendwise" });
  return doc.output("blob");
}

export const pdfExporter: Exporter = {
  id: "pdf",
  label: "PDF",
  extension: "pdf",
  mimeType: "application/pdf",
  description: "Formatted report with totals and category breakdown. Print-ready.",
  build: buildPDF,
};
