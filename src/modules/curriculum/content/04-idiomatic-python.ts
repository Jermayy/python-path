import { py } from "../dedent";
import type { Module } from "../types";

export const idiomaticPython: Module = {
  id: "idiomatic-python",
  order: 4,
  title: "Idiomatic Python",
  track: "engineering",
  tagline:
    "Classes, dataclasses, exceptions, generators, decorators and context managers.",
  outcomes: [
    "Model data with dataclasses and know when a plain class is better",
    "Raise and handle exceptions with custom error types",
    "Write decorators, generators and context managers — the building blocks of every Python framework",
  ],
  lessons: [
    {
      id: "classes-dataclasses",
      title: "Classes & dataclasses",
      summary:
        "Explicit self, dunder methods, and @dataclass as Python's data class.",
      minutes: 25,
      content: [
        {
          kind: "compare",
          otherLang: "dart",
          other: py`
            class Point {
              final int x, y;
              const Point(this.x, this.y);
              @override String toString() => 'Point($x, $y)';
            }
          `,
          python: py`
            from dataclasses import dataclass

            @dataclass(frozen=True)
            class Point:
                x: int
                y: int
            # __init__, __repr__, __eq__ (and __hash__ when frozen) generated
          `,
          note: "`frozen=True` is like Dart's `final` fields — instances are immutable and hashable.",
        },
        {
          kind: "code",
          caption:
            "Plain classes: self is explicit; dunder methods hook into language syntax",
          code: py`
            class Money:
                def __init__(self, cents: int, currency: str = "AUD"):
                    self.cents = cents
                    self.currency = currency

                def __add__(self, other: "Money") -> "Money":
                    if other.currency != self.currency:
                        raise ValueError("currency mismatch")
                    return Money(self.cents + other.cents, self.currency)

                def __repr__(self) -> str:
                    return f"Money({self.cents}, {self.currency!r})"
          `,
        },
        {
          kind: "text",
          body: 'There are no access modifiers. Convention: a leading underscore (`_cache`) means "internal". `@property` gives you computed getters like Dart\'s `get`.',
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "idiom-dataclass-cart",
          title: "Shopping cart with dataclasses",
          difficulty: "medium",
          prompt:
            "Create a frozen dataclass `Item(name: str, price_cents: int, qty: int = 1)` and a dataclass `Cart` with an `items: list[Item]` field defaulting to an empty list. Give `Cart` a method `add(item)` and a `@property` `total_cents`.",
          starter: py`
            from dataclasses import dataclass, field

            @dataclass(frozen=True)
            class Item:
                pass

            @dataclass
            class Cart:
                pass
          `,
          solution: py`
            from dataclasses import dataclass, field

            @dataclass(frozen=True)
            class Item:
                name: str
                price_cents: int
                qty: int = 1

            @dataclass
            class Cart:
                items: list[Item] = field(default_factory=list)

                def add(self, item: Item) -> None:
                    self.items.append(item)

                @property
                def total_cents(self) -> int:
                    return sum(i.price_cents * i.qty for i in self.items)
          `,
          tests: [
            {
              name: "totals",
              code: py`
                c = Cart(); c.add(Item("tea", 450, 2)); c.add(Item("cake", 600))
                assert c.total_cents == 1500
              `,
            },
            {
              name: "carts don't share items",
              code: `a, b = Cart(), Cart(); a.add(Item("x", 1)); assert b.items == []`,
            },
            {
              name: "Item is immutable",
              code: py`
                import dataclasses
                try:
                    Item("x", 1).price_cents = 0
                    raise AssertionError("Item should be frozen")
                except dataclasses.FrozenInstanceError:
                    pass
              `,
            },
          ],
          hints: [
            "Mutable defaults in dataclasses need `field(default_factory=list)` — same trap as function defaults.",
            "`@property` turns a method into a read-only attribute: `cart.total_cents` with no parentheses.",
          ],
          explanation:
            "Money is stored as integer cents — never floats. `default_factory` runs per instance, so each Cart gets its own list.",
        },
      ],
    },
    {
      id: "errors",
      title: "Exceptions",
      summary: "try/except/else/finally, custom exceptions, and EAFP.",
      minutes: 20,
      content: [
        {
          kind: "compare",
          otherLang: "ts",
          other: py`
            try { risky(); }
            catch (e) { if (e instanceof NotFound) {...} else throw e; }
            finally { cleanup(); }
          `,
          python: py`
            try:
                risky()
            except NotFound as e:
                ...
            except (TimeoutError, ConnectionError):
                ...
            else:
                ...   # runs only if no exception
            finally:
                cleanup()
          `,
        },
        {
          kind: "text",
          body: 'Python culture prefers **EAFP** ("easier to ask forgiveness than permission"): try the operation and catch the specific error, rather than checking first. Never write bare `except:` — it also catches `KeyboardInterrupt`. Use `raise NewError(...) from err` to keep the cause chain.',
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "idiom-parse-config",
          title: "Parse config with custom errors",
          difficulty: "medium",
          prompt:
            'Define `class ConfigError(Exception)`. Write `parse_port(env: dict) -> int` that reads `env["PORT"]`, converts to int, and checks 1–65535. Raise `ConfigError` with a helpful message in every failure case (missing, not a number, out of range), chaining the original exception where there is one.',
          starter: py`
            class ConfigError(Exception):
                pass

            def parse_port(env):
                pass
          `,
          solution: py`
            class ConfigError(Exception):
                pass

            def parse_port(env):
                try:
                    raw = env["PORT"]
                except KeyError as err:
                    raise ConfigError("PORT is required") from err
                try:
                    port = int(raw)
                except ValueError as err:
                    raise ConfigError(f"PORT must be an integer, got {raw!r}") from err
                if not 1 <= port <= 65535:
                    raise ConfigError(f"PORT out of range: {port}")
                return port
          `,
          tests: [
            {
              name: "valid",
              code: `assert parse_port({"PORT": "8080"}) == 8080`,
            },
            {
              name: "missing chains KeyError",
              code: py`
                try:
                    parse_port({}); raise AssertionError("expected ConfigError")
                except ConfigError as e:
                    assert isinstance(e.__cause__, KeyError)
              `,
            },
            {
              name: "not a number",
              code: py`
                try:
                    parse_port({"PORT": "abc"}); raise AssertionError("expected ConfigError")
                except ConfigError as e:
                    assert isinstance(e.__cause__, ValueError)
              `,
            },
            {
              name: "out of range",
              code: py`
                for bad in ("0", "70000"):
                    try:
                        parse_port({"PORT": bad}); raise AssertionError("expected ConfigError")
                    except ConfigError:
                        pass
              `,
              hidden: true,
            },
          ],
          hints: [
            "Catch `KeyError` and `ValueError` separately so each message is specific.",
            "`raise ConfigError(...) from err` sets `__cause__` on the new exception.",
          ],
          explanation:
            'This is "validate config at startup and fail fast" in practice. Chaining keeps the root cause in tracebacks without leaking it into user-facing messages.',
        },
      ],
    },
    {
      id: "generators-decorators-context",
      title: "Generators, decorators & context managers",
      summary: "yield, functions that wrap functions, and with-blocks.",
      minutes: 35,
      content: [
        {
          kind: "code",
          caption: "Generators: functions that yield values lazily",
          code: py`
            def chunks(items, size):
                for i in range(0, len(items), size):
                    yield items[i:i + size]

            list(chunks([1, 2, 3, 4, 5], 2))  # [[1, 2], [3, 4], [5]]
          `,
        },
        {
          kind: "code",
          caption: "Decorators: @decorator is sugar for fn = decorator(fn)",
          code: py`
            import functools, time

            def timed(fn):
                @functools.wraps(fn)          # keep fn's name/docstring
                def wrapper(*args, **kwargs):
                    start = time.perf_counter()
                    try:
                        return fn(*args, **kwargs)
                    finally:
                        print(f"{fn.__name__} took {time.perf_counter() - start:.3f}s")
                return wrapper
          `,
        },
        {
          kind: "text",
          body: "FastAPI's `@app.get(\"/\")`, pytest's `@pytest.fixture`, and agent frameworks' `@tool` are all decorators. Context managers (`with open(path) as f:`) guarantee cleanup — the Python equivalent of try/finally or Dart's `using` patterns.",
        },
        {
          kind: "code",
          caption: "Context managers via contextlib",
          code: py`
            from contextlib import contextmanager

            @contextmanager
            def transaction(db):
                db.begin()
                try:
                    yield db
                    db.commit()
                except Exception:
                    db.rollback()
                    raise
          `,
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "idiom-retry-decorator",
          title: "A retry decorator",
          difficulty: "hard",
          prompt:
            "Write `retry(times, exceptions=(Exception,))` — a decorator *factory*. The wrapped function is called up to `times` attempts; if it raises one of `exceptions`, try again; after the last attempt re-raise. Other exceptions propagate immediately. Preserve the function name with `functools.wraps`. (No sleeping — we'll add backoff in the async module.)",
          starter: py`
            import functools

            def retry(times, exceptions=(Exception,)):
                pass
          `,
          solution: py`
            import functools

            def retry(times, exceptions=(Exception,)):
                def decorator(fn):
                    @functools.wraps(fn)
                    def wrapper(*args, **kwargs):
                        for attempt in range(1, times + 1):
                            try:
                                return fn(*args, **kwargs)
                            except exceptions:
                                if attempt == times:
                                    raise
                    return wrapper
                return decorator
          `,
          tests: [
            {
              name: "succeeds after failures",
              code: py`
                calls = []
                @retry(3)
                def flaky():
                    calls.append(1)
                    if len(calls) < 3:
                        raise ConnectionError("boom")
                    return "ok"
                assert flaky() == "ok" and len(calls) == 3
              `,
            },
            {
              name: "re-raises after last attempt",
              code: py`
                n = []
                @retry(2)
                def always():
                    n.append(1); raise TimeoutError()
                try:
                    always(); raise AssertionError("should raise")
                except TimeoutError:
                    assert len(n) == 2
              `,
            },
            {
              name: "non-matching exceptions are not retried",
              code: py`
                m = []
                @retry(5, exceptions=(ConnectionError,))
                def bad():
                    m.append(1); raise ValueError()
                try:
                    bad()
                except ValueError:
                    assert len(m) == 1
              `,
            },
            {
              name: "keeps name",
              code: `assert retry(1)(lambda: 1).__name__ == "<lambda>"`,
              hidden: true,
            },
          ],
          hints: [
            "Three layers: `retry(times)` returns `decorator(fn)`, which returns `wrapper(*args, **kwargs)`.",
            "`except exceptions:` works when `exceptions` is a tuple of classes. A bare `raise` re-raises the current exception.",
          ],
          explanation:
            "Decorator factories are everywhere in Python frameworks. Only retry errors you know are transient (connection, timeout) — retrying a ValueError just repeats a bug.",
        },
        {
          kind: "code",
          id: "idiom-batched",
          title: "Lazy batching generator",
          difficulty: "medium",
          prompt:
            "Write a generator `batched(iterable, size)` that yields lists of up to `size` items from *any* iterable (including infinite generators) without converting it to a list first. Raise `ValueError` if size < 1.",
          starter: py`
            def batched(iterable, size):
                pass
          `,
          solution: py`
            def batched(iterable, size):
                if size < 1:
                    raise ValueError("size must be >= 1")
                batch = []
                for item in iterable:
                    batch.append(item)
                    if len(batch) == size:
                        yield batch
                        batch = []
                if batch:
                    yield batch
          `,
          tests: [
            {
              name: "uneven",
              code: `assert list(batched(range(5), 2)) == [[0, 1], [2, 3], [4]]`,
            },
            {
              name: "works on infinite iterables",
              code: py`
                import itertools
                gen = batched(itertools.count(), 3)
                assert next(gen) == [0, 1, 2] and next(gen) == [3, 4, 5]
              `,
            },
            {
              name: "validates size",
              code: py`
                try:
                    batched([1], 0)
                    list(batched([1], 0))
                    raise AssertionError("expected ValueError")
                except ValueError:
                    pass
              `,
              hidden: true,
            },
          ],
          hints: [
            "Accumulate into a list and `yield` it when it reaches `size`; then start a new list.",
            "Don't forget the final partial batch.",
          ],
          explanation:
            "Generator bodies don't run until the first `next()`, so the ValueError is raised lazily — the test consumes it with `list()`. Python 3.12 added `itertools.batched` (yielding tuples); knowing how to build it shows you understand iteration. You'll batch embedding requests exactly like this.",
        },
      ],
    },
  ],
};
