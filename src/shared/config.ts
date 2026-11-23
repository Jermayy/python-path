import { z } from "zod";

/**
 * Typed, validated configuration. Public values are inlined at build time, so each
 * NEXT_PUBLIC_* variable must be referenced literally (not via a dynamic key).
 */
const publicSchema = z.object({
  supabaseUrl: z.url().optional(),
  supabasePublishableKey: z.string().min(20).optional(),
  appVersion: z.string().default("dev"),
});

export type PublicConfig = z.infer<typeof publicSchema>;

function readPublicConfig(): PublicConfig {
  const parsed = publicSchema.safeParse({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
    supabasePublishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || undefined,
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION || undefined,
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid public configuration: ${z.prettifyError(parsed.error)}`,
    );
  }
  const cfg = parsed.data;
  const partiallySet =
    Boolean(cfg.supabaseUrl) !== Boolean(cfg.supabasePublishableKey);
  if (partiallySet) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set together.",
    );
  }
  return cfg;
}

export const publicConfig = readPublicConfig();

/** Accounts and cloud sync are available only when Supabase is configured. Guest mode always works. */
export const isAuthConfigured = Boolean(
  publicConfig.supabaseUrl && publicConfig.supabasePublishableKey,
);

const serverSchema = z.object({
  anthropicApiKey: z.string().min(10).optional(),
  aiDailyLimit: z.coerce.number().int().min(1).max(1000).default(40),
});

export type ServerConfig = z.infer<typeof serverSchema>;

/** Server-only config. Call from route handlers / server code, never from client components. */
export function getServerConfig(): ServerConfig {
  const parsed = serverSchema.safeParse({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || undefined,
    aiDailyLimit: process.env.AI_DAILY_LIMIT || undefined,
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid server configuration: ${z.prettifyError(parsed.error)}`,
    );
  }
  return parsed.data;
}
