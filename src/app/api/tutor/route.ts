import Anthropic from "@anthropic-ai/sdk";
import { streamTutorReply, TUTOR_MODEL } from "@/modules/tutor/anthropic";
import { guardAiRequest } from "@/modules/tutor/guard";
import { tutorRequestSchema } from "@/modules/tutor/schema";
import { problem } from "@/shared/http";
import { log } from "@/shared/logger";

export const maxDuration = 60;

/** Streams a tutor reply as text/plain chunks. */
export async function POST(request: Request) {
  const guard = await guardAiRequest(request, tutorRequestSchema, "tutor");
  if (!guard.ok) return guard.response;
  const { userId, body } = guard;
  const started = Date.now();
  const stream = streamTutorReply(body, request.signal);
  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(
            encoder.encode(
              "\n\nI can't help with that one — try asking about the exercise or a Python concept.",
            ),
          );
        }
        log("info", "tutor_reply", {
          userId,
          exerciseId: body.exerciseId,
          model: final.model ?? TUTOR_MODEL,
          stopReason: final.stop_reason,
          inputTokens: final.usage.input_tokens,
          outputTokens: final.usage.output_tokens,
          cacheReadTokens: final.usage.cache_read_input_tokens,
          latencyMs: Date.now() - started,
        });
        controller.close();
      } catch (err) {
        const status =
          err instanceof Anthropic.APIError ? err.status : undefined;
        log(status === 429 ? "warn" : "error", "tutor_failed", {
          userId,
          exerciseId: body.exerciseId,
          status,
          error: err,
        });
        controller.enqueue(
          encoder.encode(
            "\n\n[The tutor hit an error. Please try again in a moment.]",
          ),
        );
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function GET() {
  return problem(405, "Method not allowed");
}
