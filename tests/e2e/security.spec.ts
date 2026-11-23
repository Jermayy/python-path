import { expect, test } from "@playwright/test";

test("pages send security headers", async ({ request }) => {
  const res = await request.get("/");
  const headers = res.headers();
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("AI endpoints refuse cross-site, non-JSON and unauthenticated calls", async ({
  request,
}) => {
  const crossSite = await request.post("/api/tutor", {
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.example",
    },
    data: {},
  });
  expect(crossSite.status()).toBe(403);

  const notJson = await request.post("/api/tutor", {
    headers: { "Content-Type": "text/plain" },
    data: "hi",
  });
  expect(notJson.status()).toBe(415);

  const anon = await request.post("/api/coach", {
    headers: { "Content-Type": "application/json" },
    data: {},
  });
  expect([401, 503]).toContain(anon.status());
  expect(anon.headers()["content-type"]).toContain("application/problem+json");
  const body = await anon.json();
  expect(body).toMatchObject({ status: anon.status() });
  expect(JSON.stringify(body)).not.toMatch(/stack|at \//);
});

test("auth callback never redirects off-site", async ({ request }) => {
  const res = await request.get("/auth/callback?next=//evil.example", {
    maxRedirects: 0,
  });
  expect(res.status()).toBeGreaterThanOrEqual(300);
  expect(res.headers()["location"] ?? "").not.toContain("evil.example");
});

test("health endpoint reports status without secrets", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(JSON.stringify(body)).not.toMatch(/key|secret|token/i);
});
