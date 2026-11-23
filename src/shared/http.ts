import "server-only";
import { NextResponse } from "next/server";

/** RFC 9457 problem details. Never include stack traces or internal details. */
export function problem(
  status: number,
  title: string,
  detail?: string,
  extra: {
    headers?: Record<string, string>;
    errors?: { field: string; code: string }[];
  } = {},
) {
  return NextResponse.json(
    {
      type: `https://python-path.dev/errors/${status}`,
      title,
      status,
      ...(detail ? { detail } : {}),
      ...(extra.errors ? { errors: extra.errors } : {}),
    },
    {
      status,
      headers: { "Content-Type": "application/problem+json", ...extra.headers },
    },
  );
}

/**
 * CSRF defence for cookie-authenticated POSTs: require JSON and a same-origin request.
 * Browsers always send Origin on cross-origin POSTs, and Sec-Fetch-Site on modern browsers.
 */
export function rejectCrossSite(request: Request): Response | null {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return problem(415, "Unsupported media type", "Send application/json.");
  }
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin")
    return problem(403, "Forbidden", "Cross-site request blocked.");
  const origin = request.headers.get("origin");
  if (origin) {
    const host =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    try {
      if (new URL(origin).host !== host)
        return problem(403, "Forbidden", "Cross-origin request blocked.");
    } catch {
      return problem(403, "Forbidden", "Invalid origin.");
    }
  }
  return null;
}

export const MAX_BODY_BYTES = 64 * 1024;

/** Reads a JSON body with a size cap. Returns undefined on oversize/invalid JSON. */
export async function readJson(request: Request): Promise<unknown | undefined> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) return undefined;
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
