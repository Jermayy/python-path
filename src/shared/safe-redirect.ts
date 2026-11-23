/** Only allow same-site relative paths, to prevent open redirects (e.g. `//evil.com`, `/\evil.com`). */
export function safeNextPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  )
    return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://placeholder.invalid");
    if (url.origin !== "https://placeholder.invalid") return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
