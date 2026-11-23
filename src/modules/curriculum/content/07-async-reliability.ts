import { py } from "../dedent";
import type { Module } from "../types";

export const asyncReliability: Module = {
  id: "async-reliability",
  order: 7,
  title: "Async & Reliable Integrations",
  track: "backend",
  tagline:
    "asyncio, concurrency limits, timeouts, retries with backoff — calling flaky APIs (like LLMs) safely.",
  outcomes: [
    "Run I/O concurrently with asyncio.gather and bound it with a Semaphore",
    "Put a timeout on every outbound call",
    "Retry only transient failures, with exponential backoff and jitter",
  ],
  lessons: [
    {
      id: "asyncio-basics",
      title: "async/await in Python",
      summary:
        "Same keywords as Dart/TS, but you start the event loop yourself.",
      minutes: 25,
      content: [
        {
          kind: "compare",
          otherLang: "ts",
          other: py`
            const results = await Promise.all(urls.map(fetchJson));
            const first = await Promise.race([call(), timeout(5000)]);
          `,
          python: py`
            import asyncio

            results = await asyncio.gather(*(fetch_json(u) for u in urls))
            first = await asyncio.wait_for(call(), timeout=5)

            # entry point of a script:
            asyncio.run(main())
          `,
          note: "Calling an `async def` function returns a coroutine object; nothing runs until it's awaited or scheduled. A missing `await` is the #1 asyncio bug.",
        },
        {
          kind: "text",
          body: "Concurrency, not parallelism: asyncio runs on one thread and switches at `await` points. It's ideal for I/O (HTTP, DB, LLM calls). CPU-heavy work blocks the loop — move it to a thread/process pool with `asyncio.to_thread()`.",
        },
        {
          kind: "code",
          caption: "Bounding concurrency — don't fire 10,000 requests at once",
          code: py`
            sem = asyncio.Semaphore(5)

            async def limited(coro_fn, *args):
                async with sem:
                    return await coro_fn(*args)
          `,
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "async-bounded-gather",
          title: "Bounded concurrent map",
          difficulty: "medium",
          prompt:
            "Write `async def bounded_map(fn, items, limit)` that runs the async `fn(item)` for every item with at most `limit` running at once, and returns results **in input order**.",
          starter: py`
            import asyncio

            async def bounded_map(fn, items, limit):
                pass
          `,
          solution: py`
            import asyncio

            async def bounded_map(fn, items, limit):
                sem = asyncio.Semaphore(limit)

                async def run(item):
                    async with sem:
                        return await fn(item)

                return await asyncio.gather(*(run(i) for i in items))
          `,
          tests: [
            {
              name: "order preserved and concurrency bounded",
              code: py`
                import asyncio
                state = {"now": 0, "peak": 0}
                async def work(x):
                    state["now"] += 1; state["peak"] = max(state["peak"], state["now"])
                    await asyncio.sleep(0.01 * (5 - x % 5))
                    state["now"] -= 1
                    return x * 10
                out = await bounded_map(work, list(range(12)), 3)
                assert out == [x * 10 for x in range(12)]
                assert state["peak"] == 3, f"peak concurrency was {state['peak']}"
              `,
            },
          ],
          hints: [
            "`asyncio.gather` returns results in the order the awaitables were passed in.",
            "Wrap each call in `async with sem:` to cap how many run at the same time.",
          ],
          explanation:
            "This is how you'd embed 10k documents or run an eval over 500 prompts without tripping provider rate limits. (Tests in this app support top-level `await`.)",
        },
      ],
    },
    {
      id: "timeouts-retries",
      title: "Timeouts, retries & backoff",
      summary: "Every network call fails eventually. Design for it.",
      minutes: 25,
      content: [
        {
          kind: "text",
          body: "Rules from production: (1) every outbound call has a timeout; (2) retry only **idempotent** operations and **transient** errors (timeouts, 429, 5xx) — never 400s; (3) back off exponentially with **jitter** so clients don't retry in lockstep; (4) cap attempts and total time; (5) honour `Retry-After`.",
        },
        {
          kind: "code",
          caption: "Exponential backoff with full jitter",
          code: py`
            import random
            def backoff_delay(attempt: int, base: float = 0.5, cap: float = 20.0) -> float:
                return random.uniform(0, min(cap, base * 2 ** attempt))
          `,
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "async-retry-backoff",
          title: "Async retry with backoff",
          difficulty: "hard",
          prompt:
            "Write `async def call_with_retry(fn, *, attempts, base_delay, sleep, is_retryable)`. Call `await fn()`; on exception, if `is_retryable(exc)` and attempts remain, `await sleep(delay)` where delay = `base_delay * 2 ** (attempt_index)` (0-based, no jitter — tests need determinism) and retry. Otherwise re-raise. `sleep` is injected so tests don't actually wait.",
          starter: py`
            async def call_with_retry(fn, *, attempts, base_delay, sleep, is_retryable):
                pass
          `,
          solution: py`
            async def call_with_retry(fn, *, attempts, base_delay, sleep, is_retryable):
                for i in range(attempts):
                    try:
                        return await fn()
                    except Exception as exc:
                        if i == attempts - 1 or not is_retryable(exc):
                            raise
                        await sleep(base_delay * 2 ** i)
          `,
          tests: [
            {
              name: "backs off then succeeds",
              code: py`
                delays = []
                async def fake_sleep(d): delays.append(d)
                n = {"c": 0}
                async def flaky():
                    n["c"] += 1
                    if n["c"] < 4: raise TimeoutError()
                    return "ok"
                r = await call_with_retry(flaky, attempts=5, base_delay=0.5, sleep=fake_sleep,
                                          is_retryable=lambda e: isinstance(e, TimeoutError))
                assert r == "ok" and delays == [0.5, 1.0, 2.0], delays
              `,
            },
            {
              name: "does not retry non-retryable",
              code: py`
                delays = []
                async def fake_sleep(d): delays.append(d)
                async def bad(): raise ValueError("400 bad request")
                try:
                    await call_with_retry(bad, attempts=5, base_delay=1, sleep=fake_sleep, is_retryable=lambda e: False)
                    raise AssertionError("should raise")
                except ValueError:
                    assert delays == []
              `,
            },
            {
              name: "gives up after attempts, no trailing sleep",
              code: py`
                delays = []
                async def fake_sleep(d): delays.append(d)
                async def down(): raise ConnectionError()
                try:
                    await call_with_retry(down, attempts=3, base_delay=1, sleep=fake_sleep, is_retryable=lambda e: True)
                except ConnectionError:
                    assert delays == [1, 2], delays
                else:
                    raise AssertionError("should raise")
              `,
              hidden: true,
            },
          ],
          hints: [
            "Loop `for i in range(attempts)`, `return` on success.",
            "Re-raise if it's the last attempt or the error isn't retryable; otherwise sleep and continue.",
          ],
          explanation:
            "Injecting `sleep` (like the clock earlier) keeps tests instant and deterministic. The official Anthropic and OpenAI SDKs already retry 429/5xx with backoff — know when you're double-retrying.",
        },
        {
          kind: "quiz",
          id: "async-idempotent",
          title: "What's safe to retry?",
          difficulty: "medium",
          question:
            "A `POST /payments` call times out. What's the safest way to retry?",
          options: [
            "Retry immediately — timeouts mean it didn't happen",
            "Never retry POST requests",
            "Retry with the same Idempotency-Key header so the server can dedupe",
            "Retry with a new request ID so the server treats it as fresh",
          ],
          answerIndex: 2,
          explanation:
            "A timeout doesn't tell you whether the server processed it. An idempotency key lets the server return the original result instead of charging twice.",
        },
      ],
    },
  ],
};
