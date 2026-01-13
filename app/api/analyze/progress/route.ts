import { NextRequest } from "next/server";
import { addProgressListener, removeProgressListener } from "../progress-store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      addProgressListener(id, send);
      request.signal.addEventListener("abort", () => {
        removeProgressListener(id, send);
        controller.close();
      });
    },
    cancel() {
      // noop, handled by abort
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
