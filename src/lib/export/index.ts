import { csvExporter } from "./formats/csv";
import { jsonExporter } from "./formats/json";
import { pdfExporter } from "./formats/pdf";
import type { ExportContext, Exporter, ExportFormat } from "./types";

export const EXPORTERS: Record<ExportFormat, Exporter> = {
  csv: csvExporter,
  json: jsonExporter,
  pdf: pdfExporter,
};

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Build the file for the chosen format and trigger a download. Returns the final filename and size. */
export async function runExport(ctx: ExportContext): Promise<{ filename: string; bytes: number }> {
  const exporter = EXPORTERS[ctx.options.format];
  const blob = await exporter.build(ctx);
  const filename = `${ctx.options.filename}.${exporter.extension}`;
  downloadBlob(blob, filename);
  return { filename, bytes: blob.size };
}

export * from "./prepare";
export * from "./types";
