import { py } from "../dedent";
import type { Module } from "../types";

export const fullstack: Module = {
  id: "fullstack",
  order: 8,
  title: "Full-stack: Python Backends for TS Frontends",
  track: "backend",
  tagline:
    "Connect a FastAPI service to a Next.js/React UI: auth, pagination, CORS and streaming.",
  outcomes: [
    "Design the contract between a Python API and a TypeScript client (OpenAPI → generated types)",
    "Implement signed tokens, cursor pagination and CORS correctly",
    "Stream LLM output to a browser with Server-Sent Events",
  ],
  lessons: [
    {
      id: "contract-and-auth",
      title: "API contracts & auth",
      summary: "OpenAPI as the source of truth; verifying tokens safely.",
      minutes: 25,
      content: [
        {
          kind: "text",
          body: "The typical FDE stack: **Next.js/React** front end on Vercel ↔ **FastAPI** back end (container on Fly/Render/Cloud Run/AWS) ↔ Postgres + a vector store + LLM providers. FastAPI emits `openapi.json`; generate a TypeScript client from it (`openapi-typescript`, `orval`) so the front end and back end can't drift.",
        },
        {
          kind: "code",
          caption: "Verifying a bearer token in FastAPI with a dependency",
          code: py`
            from fastapi import Depends, HTTPException
            from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

            bearer = HTTPBearer()

            def current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
                user_id = verify(creds.credentials)      # e.g. Supabase / Auth0 JWT via PyJWT
                if user_id is None:
                    raise HTTPException(401, "invalid token")
                return user_id
          `,
        },
        {
          kind: "callout",
          tone: "warning",
          body: "Compare secrets and signatures with `hmac.compare_digest`, never `==` — string equality can short-circuit and leak timing information. In real apps use a vetted JWT library (PyJWT) and pin the algorithm.",
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "fs-signed-token",
          title: "Sign & verify a token",
          difficulty: "hard",
          prompt:
            'Implement `sign(user_id, expires_at, secret) -> str` producing `"<user_id>.<expires_at>.<hex_sig>"` where sig is HMAC-SHA256 of `"<user_id>.<expires_at>"`. Implement `verify(token, secret, now) -> str | None` returning user_id only if the format is valid, the signature matches (constant-time), and `now < expires_at`. Never raise on malformed input.',
          starter: py`
            import hmac, hashlib

            def sign(user_id, expires_at, secret):
                pass

            def verify(token, secret, now):
                pass
          `,
          solution: py`
            import hmac, hashlib

            def _sig(payload, secret):
                return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

            def sign(user_id, expires_at, secret):
                payload = f"{user_id}.{expires_at}"
                return f"{payload}.{_sig(payload, secret)}"

            def verify(token, secret, now):
                if not isinstance(token, str):
                    return None
                parts = token.split(".")
                if len(parts) != 3:
                    return None
                user_id, exp_raw, sig = parts
                if not hmac.compare_digest(sig, _sig(f"{user_id}.{exp_raw}", secret)):
                    return None
                try:
                    exp = int(exp_raw)
                except ValueError:
                    return None
                return user_id if now < exp else None
          `,
          tests: [
            {
              name: "round trip",
              code: `assert verify(sign("u1", 100, "s3cret"), "s3cret", now=50) == "u1"`,
            },
            {
              name: "expired",
              code: `assert verify(sign("u1", 100, "s3cret"), "s3cret", now=100) is None`,
            },
            {
              name: "tampered payload",
              code: py`
                t = sign("u1", 100, "k"); _, exp, sig = t.split(".")
                assert verify(f"admin.{exp}.{sig}", "k", now=0) is None
              `,
            },
            {
              name: "wrong secret",
              code: `assert verify(sign("u1", 100, "a"), "b", now=0) is None`,
            },
            {
              name: "malformed input never raises",
              code: py`
                for bad in ["", "a.b", "a.b.c.d", "u.notanint.sig", None, 42]:
                    assert verify(bad, "k", now=0) is None
              `,
              hidden: true,
            },
            {
              name: "uses compare_digest",
              code: py`
                import hmac, inspect
                assert "compare_digest" in inspect.getsource(verify), "use hmac.compare_digest"
              `,
              hidden: true,
            },
          ],
          hints: [
            "`hmac.new(key_bytes, msg_bytes, hashlib.sha256).hexdigest()` gives the signature.",
            "Split on '.', check there are exactly 3 parts, verify the signature *before* trusting any field.",
          ],
          explanation:
            "This is the essence of a JWT (header.payload.signature). Verifying first, then parsing, means attacker-controlled data is never trusted. Real JWTs add base64url encoding, an `alg` header (pin it!), and standard claims (exp, iat, aud).",
        },
      ],
    },
    {
      id: "pagination-cors-streaming",
      title: "Pagination, CORS & streaming",
      summary:
        "Cursor pagination, a strict CORS allow-list, and SSE for chat UIs.",
      minutes: 30,
      content: [
        {
          kind: "text",
          body: "**Cursor pagination** beats offset pagination on large or changing data: the cursor encodes the last-seen sort key, so you query `WHERE id > :cursor ORDER BY id LIMIT :n`. Return `next_cursor` (null at the end). Encode cursors (base64) so clients treat them as opaque.",
        },
        {
          kind: "text",
          body: '**CORS** is enforced by browsers. A FastAPI back end serving a Vercel front end must allow-list the exact origins. Never combine `allow_origins=["*"]` with credentials.',
        },
        {
          kind: "code",
          caption:
            "Streaming an LLM response to the browser with SSE (FastAPI)",
          code: py`
            from fastapi.responses import StreamingResponse

            @app.post("/v1/chat")
            async def chat(body: ChatIn, user=Depends(current_user)):
                async def events():
                    async with llm.messages.stream(model=MODEL, messages=body.messages, max_tokens=2048) as stream:
                        async for text in stream.text_stream:
                            yield f"data: {json.dumps({'delta': text})}\n\n"
                    yield "data: [DONE]\n\n"
                return StreamingResponse(events(), media_type="text/event-stream")
          `,
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "fs-cursor-pagination",
          title: "Cursor pagination",
          difficulty: "medium",
          prompt:
            'Write `paginate(rows, limit, cursor=None) -> dict` over `rows` (list of dicts sorted by unique int `id`). Return `{"items": [...], "next_cursor": str | None}`. Cursors are base64url-encoded JSON `{"after": last_id}`. Clamp limit to 1..100. An invalid cursor raises `ValueError("invalid cursor")`.',
          starter: py`
            import base64, json

            def encode_cursor(last_id):
                pass

            def decode_cursor(cursor):
                pass

            def paginate(rows, limit, cursor=None):
                pass
          `,
          solution: py`
            import base64, json

            def encode_cursor(last_id):
                return base64.urlsafe_b64encode(json.dumps({"after": last_id}).encode()).decode()

            def decode_cursor(cursor):
                try:
                    data = json.loads(base64.urlsafe_b64decode(cursor.encode()))
                    after = data["after"]
                    if not isinstance(after, int):
                        raise TypeError
                    return after
                except Exception as err:
                    raise ValueError("invalid cursor") from err

            def paginate(rows, limit, cursor=None):
                limit = max(1, min(100, limit))
                after = decode_cursor(cursor) if cursor else None
                remaining = [r for r in rows if after is None or r["id"] > after]
                page = remaining[:limit]
                has_more = len(remaining) > limit
                return {
                    "items": page,
                    "next_cursor": encode_cursor(page[-1]["id"]) if has_more else None,
                }
          `,
          tests: [
            {
              name: "walks all pages",
              code: py`
                rows = [{"id": i} for i in range(1, 8)]
                seen, cur = [], None
                while True:
                    p = paginate(rows, 3, cur); seen += [r["id"] for r in p["items"]]
                    cur = p["next_cursor"]
                    if cur is None: break
                assert seen == list(range(1, 8))
              `,
            },
            {
              name: "last page has no cursor",
              code: `assert paginate([{"id": 1}], 5)["next_cursor"] is None`,
            },
            {
              name: "invalid cursor",
              code: py`
                try:
                    paginate([{"id": 1}], 5, "not-a-cursor!!"); raise AssertionError("expected ValueError")
                except ValueError as e:
                    assert str(e) == "invalid cursor"
              `,
            },
            {
              name: "clamps limit",
              code: `assert len(paginate([{"id": i} for i in range(500)], 1000)["items"]) == 100`,
              hidden: true,
            },
          ],
          hints: [
            "`base64.urlsafe_b64encode(bytes)` → bytes; `.decode()` to get a str.",
            "Fetch `limit` items after the cursor and check whether more remain to decide on `next_cursor`.",
          ],
          explanation:
            "In SQL you'd fetch `limit + 1` rows to detect `has_more` without a COUNT query. Wrapping all decode failures in one `ValueError` means the API returns a clean 400 instead of a 500.",
        },
        {
          kind: "code",
          id: "fs-cors",
          title: "CORS decision function",
          difficulty: "medium",
          prompt:
            'Write `cors_headers(origin, allowed, allow_credentials) -> dict`. If `origin` is in `allowed` (exact match) return `{"Access-Control-Allow-Origin": origin, "Vary": "Origin"}` plus `"Access-Control-Allow-Credentials": "true"` when allowed. If `allowed == ["*"]` and credentials are off, return `{"Access-Control-Allow-Origin": "*"}`. Raise `ValueError` if `"*"` is combined with credentials. Otherwise return `{}`.',
          starter: py`
            def cors_headers(origin, allowed, allow_credentials):
                pass
          `,
          solution: py`
            def cors_headers(origin, allowed, allow_credentials):
                if "*" in allowed:
                    if allow_credentials:
                        raise ValueError("wildcard origin cannot be used with credentials")
                    return {"Access-Control-Allow-Origin": "*"}
                if origin in allowed:
                    headers = {"Access-Control-Allow-Origin": origin, "Vary": "Origin"}
                    if allow_credentials:
                        headers["Access-Control-Allow-Credentials"] = "true"
                    return headers
                return {}
          `,
          tests: [
            {
              name: "allowed origin",
              code: `assert cors_headers("https://app.dev", ["https://app.dev"], True) == {"Access-Control-Allow-Origin": "https://app.dev", "Vary": "Origin", "Access-Control-Allow-Credentials": "true"}`,
            },
            {
              name: "unknown origin",
              code: `assert cors_headers("https://evil.dev", ["https://app.dev"], True) == {}`,
            },
            {
              name: "no prefix/suffix tricks",
              code: `assert cors_headers("https://app.dev.evil.io", ["https://app.dev"], False) == {}`,
            },
            {
              name: "wildcard + credentials rejected",
              code: py`
                try:
                    cors_headers("https://x", ["*"], True); raise AssertionError("expected ValueError")
                except ValueError:
                    pass
              `,
              hidden: true,
            },
          ],
          hints: [
            "Use exact membership (`origin in allowed`) — never `startswith`/`endswith` checks.",
            "`Vary: Origin` tells caches the response differs per origin.",
          ],
          explanation:
            "Reflecting origins with sloppy matching is a classic vulnerability. Exact allow-lists plus `Vary: Origin` is the safe pattern; frameworks (FastAPI's CORSMiddleware) implement exactly this.",
        },
        {
          kind: "code",
          id: "fs-sse",
          title: "Format Server-Sent Events",
          difficulty: "easy",
          prompt:
            'Write a generator `sse(chunks)` that yields `"data: {json}\\n\\n"` for each text chunk as `{"delta": chunk}`, then a final `"data: [DONE]\\n\\n"`. Use `json.dumps` so quotes and newlines in chunks are escaped.',
          starter: py`
            import json

            def sse(chunks):
                pass
          `,
          solution: py`
            import json

            def sse(chunks):
                for chunk in chunks:
                    yield f"data: {json.dumps({'delta': chunk})}\n\n"
                yield "data: [DONE]\n\n"
          `,
          tests: [
            {
              name: "frames",
              code: py`
                out = list(sse(["Hel", "lo"]))
                assert out == ['data: {"delta": "Hel"}\n\n', 'data: {"delta": "lo"}\n\n', "data: [DONE]\n\n"]
              `,
            },
            {
              name: "escapes newlines",
              code: py`
                frame = next(sse(["a\nb"]))
                assert frame.count("\n") == 2 and "\\n" in frame
              `,
            },
          ],
          hints: [
            "An SSE frame is `data: <payload>` followed by a blank line (two newlines).",
            "A raw newline inside the payload would break framing — `json.dumps` escapes it as `\\n`.",
          ],
          explanation:
            "On the TS side, `fetch` + a `ReadableStream` reader (or `EventSource` for GET) parses these frames. This is exactly how chat UIs (including this app's AI tutor) stream tokens.",
        },
      ],
    },
  ],
};
