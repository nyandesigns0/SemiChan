import { NextResponse } from "next/server";
import { access, constants as fsConstants } from "fs/promises";
import path from "path";
import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ExportPdfRequest = {
  html?: string;
  filename?: string;
};

const DEFAULT_FILENAME = "analysis-report.pdf";

async function getExecutablePath(): Promise<string> {
  const isVercel = Boolean(process.env.VERCEL);
  const envPath =
    process.env.CHROME_PATH ||
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROMIUM_PATH;
  if (envPath) return envPath;

  if (!isVercel) {
    const localPath = await findLocalChrome();
    if (localPath) return localPath;
  }

  // Fallback: try bundled chromium (used in Vercel/Linux)
  try {
    return (await chromium.executablePath()) ?? "";
  } catch (error) {
    console.error("[export-pdf] chromium.executablePath failed", error);
    return await findPackagedChromium();
  }
}

async function fileExists(targetPath: string) {
  try {
    await access(targetPath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function findPackagedChromium() {
  const candidate = path.join(
    process.cwd(),
    "node_modules",
    "@sparticuz",
    "chromium-min",
    "bin",
    "chromium"
  );
  return (await fileExists(candidate)) ? candidate : "";
}

async function findLocalChrome() {
  const platform = process.platform;
  const candidates: string[] = [];

  if (platform === "win32") {
    candidates.push(
      "C:\\\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    );
  } else if (platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
    );
  } else {
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser"
    );
  }

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }
  return "";
}

export async function POST(request: Request) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    const body = (await request.json()) as ExportPdfRequest;
    const { html, filename } = body || {};

    if (!html || typeof html !== "string") {
      return NextResponse.json({ error: "Missing HTML content" }, { status: 400 });
    }

    const executablePath = await getExecutablePath();
    if (!executablePath) {
      return NextResponse.json(
        { error: "Could not resolve a Chrome executable path" },
        { status: 500 }
      );
    }

    const headless =
      (chromium as typeof chromium & { headless?: boolean | "shell" }).headless ?? true;

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath,
      headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    const pdfBuffer = await page.pdf({
      format: "letter",
      printBackground: true,
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
      preferCSSPageSize: true,
    });

    const pdfArrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    ) as ArrayBuffer;
    const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
    const safeFilename = (filename || DEFAULT_FILENAME).replace(/["]/g, "");
    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (error) {
    console.error("[export-pdf] Failed to generate PDF", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
    }
  }
}
