import { z } from "zod";
import { getExercise } from "@/modules/curriculum";
import { MAX_CODE_LENGTH } from "@/modules/progress/types";

const exerciseId = z
  .string()
  .regex(/^[a-z0-9-]{1,80}$/)
  .refine((id) => getExercise(id) !== undefined, "unknown exercise");

const testResult = z.object({
  name: z.string().max(200),
  passed: z.boolean(),
  error: z.string().max(500).optional(),
});

export const tutorRequestSchema = z
  .object({
    exerciseId,
    code: z.string().max(MAX_CODE_LENGTH),
    lastRun: z
      .object({
        error: z.string().max(1000).nullable(),
        results: z.array(testResult).max(20),
      })
      .nullable()
      .optional(),
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().min(1).max(4000),
        }),
      )
      .min(1)
      .max(20)
      .refine(
        (m) => m[0].role === "user" && m[m.length - 1].role === "user",
        "conversation must start and end with the learner",
      ),
  })
  .strict();

export type TutorRequest = z.infer<typeof tutorRequestSchema>;

export const coachRequestSchema = z
  .object({
    exerciseId,
    code: z.string().max(MAX_CODE_LENGTH),
    attempts: z.number().int().min(0).max(1000),
    hintsUsed: z.number().int().min(0).max(100),
    failingTests: z.array(z.string().max(200)).max(20),
    error: z.string().max(1000).nullable(),
    recent: z.object({
      recentSolved: z.number().int().min(0).max(100),
      avgAttempts: z.number().min(0).max(1000),
      avgHints: z.number().min(0).max(100),
      firstTryRate: z.number().min(0).max(1),
    }),
  })
  .strict();

export type CoachRequest = z.infer<typeof coachRequestSchema>;

export const coachResponseSchema = z.object({
  hint: z
    .string()
    .describe(
      "One Socratic hint for the current exercise. Never the full solution.",
    ),
  difficulty: z
    .enum(["easier", "same", "harder"])
    .describe(
      "Whether the learner should next see easier review material, continue, or take a harder challenge.",
    ),
  encouragement: z
    .string()
    .describe("One short, specific, encouraging sentence."),
});

export type CoachResponse = z.infer<typeof coachResponseSchema>;
