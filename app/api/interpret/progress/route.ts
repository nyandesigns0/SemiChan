import { NextRequest, NextResponse } from "next/server";
import { jobStore } from "@/lib/interpretation/job-store";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId query param is required" }, { status: 400 });
  }

  const store = jobStore;
  if (!store.has(jobId)) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const sendUpdate = () => {
        const state = store.get(jobId);
        if (!state) {
          controller.enqueue(encode(`data: ${JSON.stringify({ stage: "unknown", progress: 0, message: "Job not found" })}\n\n`));
          controller.close();
          clearInterval(interval);
          return;
        }
        controller.enqueue(encode(`data: ${JSON.stringify(state)}\n\n`));
        if (state.stage === "complete" || state.stage === "error") {
          controller.close();
          clearInterval(interval);
        }
      };

      const interval = setInterval(sendUpdate, 1000);
      sendUpdate();

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  const headers = {
    "Cache-Control": "no-cache",
    "Content-Type": "text/event-stream",
    Connection: "keep-alive"
  };
  return new Response(stream, { headers });
}

function encode(value: string) {
  return new TextEncoder().encode(value);
}
