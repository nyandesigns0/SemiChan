export function downloadJson(obj: unknown, filename = "jury-concept-graph.json"): void {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function gatherHeadStyles(): string {
  return Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
    .map((node) => node.outerHTML)
    .join("\n");
}

function createPrintDocument(targetHtml: string, filename: string): string {
  const styles = gatherHeadStyles();
  return `
    <!doctype html>
    <html>
      <head>
        <title>${filename}</title>
        <meta charset="utf-8">
        ${styles}
        <style>
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #export-root {
            width: 100%;
            background: #ffffff;
          }
          @media print {
            @page {
              margin: 0.5in;
            }
            body {
              background: #ffffff;
              padding: 0;
            }
            #export-root {
              width: 100%;
              background: #ffffff;
            }
          }
        </style>
      </head>
      <body>
        <div id="export-root">${targetHtml}</div>
        <script>
          function triggerPrint() {
            window.print();
          }
          window.addEventListener("load", () => {
            setTimeout(triggerPrint, 200);
          });
        </script>
      </body>
    </html>
  `;
}

export async function downloadPdf(target: HTMLElement, filename = "analysis-report.pdf"): Promise<void> {
  if (!target) throw new Error("No target element provided for PDF export");

  const html = createPrintDocument(target.outerHTML, filename);
  const printWindow = window.open("", "_blank", "toolbar=0,location=0,menubar=0,width=1280,height=720");
  if (!printWindow) {
    throw new Error("Unable to open window for PDF export");
  }

  return new Promise<void>((resolve) => {
    const cleanup = () => {
      printWindow.close();
      resolve();
    };
    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.addEventListener("afterprint", cleanup);
    printWindow.addEventListener("beforeunload", cleanup);
    printWindow.addEventListener("load", () => {
      printWindow.focus();
    });
  });
}
