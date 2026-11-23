type Level = "debug" | "info" | "warn" | "error";

const REDACT_KEYS = /(token|key|secret|password|authorization|cookie|email)/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (value instanceof Error)
    return { name: value.name, message: value.message };
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      REDACT_KEYS.test(k) ? "[redacted]" : redact(v, depth + 1),
    ]),
  );
}

/** Structured JSON logger with key-based redaction. */
export function log(
  level: Level,
  message: string,
  context: Record<string, unknown> = {},
) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: "python-path",
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
    ...(redact(context) as Record<string, unknown>),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
