import { py } from "../dedent";
import type { Module } from "../types";

export const typingTesting: Module = {
  id: "typing-testing",
  order: 5,
  title: "Types, Tests & Tooling",
  track: "engineering",
  tagline:
    "Type hints, Protocols, pytest, and the modern toolchain (uv, ruff, mypy/pyright).",
  outcomes: [
    "Write fully type-hinted code a type checker can verify",
    "Design for testability with dependency injection and Protocols",
    "Set up a modern Python project: uv, pyproject.toml, ruff, pytest, CI",
  ],
  lessons: [
    {
      id: "type-hints",
      title: "Type hints & Protocols",
      summary:
        "Gradual typing that feels like TypeScript — checked by tools, not at runtime.",
      minutes: 25,
      content: [
        {
          kind: "compare",
          otherLang: "ts",
          other: py`
            type Result = { ok: true; value: number } | { ok: false; error: string };
            interface Notifier { send(to: string, msg: string): Promise<void> }
            function first<T>(xs: T[]): T | undefined { return xs[0]; }
          `,
          python: py`
            from typing import Protocol, TypedDict, Literal

            class Ok(TypedDict):
                ok: Literal[True]
                value: int

            class Notifier(Protocol):          # structural, like a TS interface
                async def send(self, to: str, msg: str) -> None: ...

            def first[T](xs: list[T]) -> T | None:   # 3.12+ generics syntax
                return xs[0] if xs else None
          `,
          note: "Hints aren't enforced at runtime. Run `mypy` or `pyright` in CI — the equivalent of `tsc --noEmit`. Pydantic (next module) adds runtime validation.",
        },
        {
          kind: "callout",
          tone: "tip",
          body: "A `Protocol` is structural typing: any class with matching methods satisfies it, no inheritance needed. Use Protocols at your module boundaries (LLM client, vector store, email sender) so tests can pass in fakes.",
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "typing-protocol-di",
          title: "Dependency injection with a Protocol",
          difficulty: "medium",
          prompt:
            "Define a `Clock` Protocol with `def now(self) -> float`. Write `class RateLimiter` taking `max_calls: int`, `per_seconds: float`, and a `clock: Clock`. Its `allow() -> bool` returns True if fewer than `max_calls` calls were allowed in the last `per_seconds` (sliding window), recording the call when allowed. Then write a `FakeClock` with a settable `t` attribute for tests.",
          starter: py`
            from typing import Protocol
            from collections import deque

            class Clock(Protocol):
                ...

            class FakeClock:
                ...

            class RateLimiter:
                ...
          `,
          solution: py`
            from typing import Protocol
            from collections import deque

            class Clock(Protocol):
                def now(self) -> float: ...

            class FakeClock:
                def __init__(self, t: float = 0.0) -> None:
                    self.t = t

                def now(self) -> float:
                    return self.t

            class RateLimiter:
                def __init__(self, max_calls: int, per_seconds: float, clock: Clock) -> None:
                    self.max_calls = max_calls
                    self.per_seconds = per_seconds
                    self.clock = clock
                    self._calls: deque[float] = deque()

                def allow(self) -> bool:
                    now = self.clock.now()
                    while self._calls and now - self._calls[0] >= self.per_seconds:
                        self._calls.popleft()
                    if len(self._calls) < self.max_calls:
                        self._calls.append(now)
                        return True
                    return False
          `,
          tests: [
            {
              name: "limits within window",
              code: py`
                c = FakeClock(); rl = RateLimiter(2, 10, c)
                assert rl.allow() and rl.allow() and not rl.allow()
              `,
            },
            {
              name: "window slides",
              code: py`
                c = FakeClock(); rl = RateLimiter(2, 10, c)
                rl.allow(); c.t = 5; rl.allow()
                c.t = 9.9; assert not rl.allow()
                c.t = 10; assert rl.allow()
                c.t = 14.9; assert not rl.allow()
                c.t = 15; assert rl.allow()
              `,
            },
          ],
          hints: [
            "A `deque` of call timestamps gives O(1) `popleft()` for expiring old calls.",
            "Expire calls where `now - ts >= per_seconds` before checking the count.",
          ],
          explanation:
            "Injecting the clock makes time deterministic in tests — no `sleep()`, no flakiness. You'll use this exact pattern to rate-limit LLM calls per user.",
        },
        {
          kind: "quiz",
          id: "typing-runtime",
          title: "Are hints enforced?",
          difficulty: "easy",
          question:
            '`def f(x: int) -> int: return x * 2` — what does `f("ab")` do at runtime?',
          options: [
            "Raises TypeError",
            'Returns "abab"',
            "Returns None",
            "SyntaxError",
          ],
          answerIndex: 1,
          explanation:
            'Type hints are not checked at runtime. A type checker would flag this call, but the interpreter happily runs `"ab" * 2`.',
        },
      ],
    },
    {
      id: "testing-tooling",
      title: "pytest & the modern toolchain",
      summary:
        "Tests as plain functions, fixtures, parametrize — and uv/ruff/pyproject.",
      minutes: 25,
      content: [
        {
          kind: "code",
          caption:
            "pytest: plain asserts, fixtures by argument name, parametrize",
          code: py`
            import pytest
            from app.pricing import apply_discount

            @pytest.fixture
            def cart():
                return {"items": [1000, 2500]}

            @pytest.mark.parametrize("code,expected", [("TEN", 3150), ("NONE", 3500)])
            def test_apply_discount(cart, code, expected):
                assert apply_discount(cart, code) == expected

            def test_rejects_negative():
                with pytest.raises(ValueError, match="negative"):
                    apply_discount({"items": [-1]}, "TEN")
          `,
        },
        {
          kind: "code",
          caption: "A 2026 project setup",
          code: py`
            uv init my-service && cd my-service      # creates pyproject.toml + .python-version
            uv add fastapi pydantic httpx              # runtime deps -> uv.lock
            uv add --dev pytest ruff mypy              # dev deps
            uv run ruff check . && uv run ruff format --check .
            uv run mypy src && uv run pytest
          `,
        },
        {
          kind: "text",
          body: "Mapping to what you know: `pyproject.toml` ≈ `package.json`/`pubspec.yaml`, `uv.lock` ≈ `package-lock.json`, `uv sync` ≈ `npm ci`, `ruff` ≈ ESLint + Prettier, `mypy`/`pyright` ≈ `tsc`. Virtual environments (`.venv`) isolate dependencies per project — like `node_modules`, but for the interpreter too.",
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "testing-write-tests",
          title: "Write the tests yourself",
          difficulty: "medium",
          prompt:
            "`slugify(title)` is given. Write `run_tests()` that asserts at least: lowercase, spaces→hyphens, punctuation removed, repeated separators collapsed, and leading/trailing hyphens stripped. The grader runs your tests against the correct implementation **and** against 3 buggy mutants — your tests must pass on the real one and fail on every mutant.",
          starter: py`
            import re

            def slugify(title):
                s = re.sub(r"[^a-z0-9\s-]", "", title.lower())
                s = re.sub(r"[\s-]+", "-", s)
                return s.strip("-")

            def run_tests(fn=slugify):
                assert fn("Hello World") == "hello-world"
                # add more assertions that catch subtle bugs
          `,
          solution: py`
            import re

            def slugify(title):
                s = re.sub(r"[^a-z0-9\s-]", "", title.lower())
                s = re.sub(r"[\s-]+", "-", s)
                return s.strip("-")

            def run_tests(fn=slugify):
                assert fn("Hello World") == "hello-world"
                assert fn("What's New?!") == "whats-new"
                assert fn("a  --  b") == "a-b"
                assert fn("  -Trim me-  ") == "trim-me"
          `,
          tests: [
            {
              name: "passes on the correct implementation",
              code: `run_tests(slugify)`,
            },
            {
              name: "catches 3 mutants",
              code: py`
                import re
                def no_collapse(t):
                    s = re.sub(r"[^a-z0-9\s-]", "", t.lower()); return re.sub(r"\s", "-", s).strip("-")
                def no_strip(t):
                    s = re.sub(r"[^a-z0-9\s-]", "", t.lower()); return re.sub(r"[\s-]+", "-", s)
                def keeps_punct(t):
                    s = re.sub(r"[\s-]+", "-", t.lower()); return s.strip("-")
                for mutant in (no_collapse, no_strip, keeps_punct):
                    try:
                        run_tests(mutant)
                    except AssertionError:
                        continue
                    raise AssertionError(f"your tests did not catch mutant: {mutant.__name__}")
              `,
            },
          ],
          hints: [
            "Think about each rule and write one input that only passes if that rule is implemented.",
            "Try inputs with apostrophes, multiple spaces/hyphens, and leading/trailing whitespace.",
          ],
          explanation:
            "This is mutation testing: good tests fail when the code is wrong. Coverage alone wouldn't catch these mutants. The same mindset drives writing evals for LLM systems.",
        },
        {
          kind: "quiz",
          id: "tooling-lockfile",
          title: "Reproducible installs",
          difficulty: "easy",
          question:
            "In CI, which command gives you exactly the locked dependency versions for a uv project?",
          options: [
            "pip install -r requirements.txt",
            "uv sync --locked",
            "uv add --upgrade",
            "python setup.py install",
          ],
          answerIndex: 1,
          explanation:
            "`uv sync --locked` installs from `uv.lock` and fails if the lockfile is out of date with `pyproject.toml` — the equivalent of `npm ci`.",
        },
      ],
    },
  ],
};
