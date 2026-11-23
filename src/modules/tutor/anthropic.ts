import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { getServerConfig } from "@/shared/config";
import {
  COACH_SYSTEM,
  coachPrompt,
  exerciseContext,
  TUTOR_SYSTEM,
} from "./prompts";
import {
  coachResponseSchema,
  type CoachRequest,
  type CoachResponse,
  type TutorRequest,
} from "./schema";

/** Adapter around the Anthropic SDK: one place for model choice, timeouts and safety settings. */
export const TUTOR_MODEL = "claude-opus-5-5";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const REQUEST_TIMEOUT_MS = 60_000;

let client: Anthropic | null = null;

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI features are not configured");
    this.name = "AiNotConfiguredError";
  }
}

function getClient(): Anthropic {
  const { anthropicApiKey } = getServerConfig();
  if (!anthropicApiKey) throw new AiNotConfiguredError();
  client ??= new Anthropic({
    apiKey: anthropicApiKey,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 2,
  });
  return client;
}

export function isAiConfigured(): boolean {
  return Boolean(getServerConfig().anthropicApiKey);
}

/** Streams the tutor's reply as plain text chunks. */
export function streamTutorReply(req: TutorRequest, signal: AbortSignal) {
  const [first, ...rest] = req.messages;
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `${exerciseContext(req)}\n\nLearner's question:\n${first.content}`,
    },
    ...rest.map((m) => ({ role: m.role, content: m.content })),
  ];
  return getClient().beta.messages.stream(
    {
      model: TUTOR_MODEL,
      max_tokens: 4000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: [
        {
          type: "text",
          text: TUTOR_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    },
    { signal },
  );
}

export async function getCoaching(
  req: CoachRequest,
): Promise<CoachResponse | null> {
  const response = await getClient().beta.messages.parse({
    model: TUTOR_MODEL,
    max_tokens: 2000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: betaZodOutputFormat(coachResponseSchema),
    },
    system: [
      {
        type: "text",
        text: COACH_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: coachPrompt(req) }],
  });
  if (response.stop_reason === "refusal") return null;
  return response.parsed_output ?? null;
}
