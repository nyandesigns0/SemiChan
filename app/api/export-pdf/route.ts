import { NextResponse } from "next/server";
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
  if (isVercel) {
    return (await chromium.executablePath()) ?? "";
  }

  const envPath =
    process.env.CHROME_PATH ||
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROMIUM_PATH;
  if (envPath) return envPath;

  return (await chromium.executablePath()) ?? "";
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

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath,
      headless: chromium.headless ?? "new",
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

    const safeFilename = (filename || DEFAULT_FILENAME).replace(/["]/g, "");
    return new NextResponse(pdfBuffer, {
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
