// Optional PDF support. If pdfjs-dist fails to import in your environment, the app still works via paste/TXT.
interface PDFJSLib {
  GlobalWorkerOptions?: {
    workerSrc?: string;
  };
  getDocument: (params: { data: ArrayBuffer }) => {
    promise: Promise<{
      numPages: number;
      getPage: (pageNum: number) => Promise<{
        getTextContent: () => Promise<{
          items: Array<{ str?: string }>;
        }>;
      }>;
    }>;
  };
}

let pdfjs: PDFJSLib | null = null;
let pdfWorkerSrc: string | null = null;
try {
  // Use the browser-friendly legacy build so webpack doesn't try to pull in node-only deps.
  // @ts-ignore
  pdfjs = require("pdfjs-dist/legacy/build/pdf");
  // @ts-ignore
  pdfWorkerSrc = require("pdfjs-dist/legacy/build/pdf.worker.min.js");
  if (pdfjs?.GlobalWorkerOptions && pdfWorkerSrc) pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
} catch {
  pdfjs = null;
  pdfWorkerSrc = null;
}

import { normalizeWhitespace } from "@/lib/utils/text-utils";

export async function parsePdf(file: File): Promise<string> {
  if (!pdfjs) {
    throw new Error("PDF support is not available in this environment. Please paste text, or upload a .txt export.");
  }
  const ab = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: ab }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const pageText = (content.items || [])
      .map((it) => (typeof it.str === "string" ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) pages.push(pageText);
  }
  return normalizeWhitespace(pages.join("\n\n"));
}

