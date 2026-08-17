import fs from "node:fs/promises";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export async function extractPdfTitle(filePath, fallback) {
  try {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer, { max: 1 });
    const title = data?.info?.Title?.trim();
    return title && title.length > 0 ? title : fallback;
  } catch {
    return fallback;
  }
}
