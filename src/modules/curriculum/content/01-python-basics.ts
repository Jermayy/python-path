import { py } from "../dedent";
import type { Module } from "../types";

export const pythonBasics: Module = {
  id: "python-basics",
  order: 1,
  title: "Python Basics",
  track: "foundations",
  tagline:
    "Syntax, types and functions — mapped onto what you already know from Dart and TypeScript.",
  outcomes: [
    "Read and write basic Python without reaching for Dart/TS habits",
    "Use f-strings, truthiness, and indentation-based blocks correctly",
    "Write small functions with default and keyword arguments",
  ],
  lessons: [
    {
      id: "variables-and-types",
      title: "Variables, types and f-strings",
      summary:
        "No `var`, no `let`, no semicolons. Dynamic typing with optional type hints.",
      minutes: 15,
      content: [
        {
          kind: "text",
          body: "Python is dynamically typed: a name points at an object, and the object carries the type. You don't declare variables — you just assign. Blocks are defined by **indentation** (4 spaces by convention), not braces.",
        },
        {
          kind: "compare",
          otherLang: "dart",
          other: py`
            final name = 'Ada';
            var age = 36;
            print('$name is $age');
          `,
          python: py`
            name = "Ada"
            age = 36
            print(f"{name} is {age}")
          `,
          note: 'f-strings are Python\'s string interpolation. Anything inside `{}` is an expression: `f"{age * 2}"` works.',
        },
        {
          kind: "text",
          body: "Core types: `int` (arbitrary precision — no overflow!), `float`, `bool` (`True`/`False`, capitalised), `str`, and `None` (Python's `null`). Use `type(x)` to inspect and `isinstance(x, int)` to check.",
        },
        {
          kind: "callout",
          tone: "tip",
          body: 'Truthiness: `0`, `0.0`, `""`, `[]`, `{}`, `None` and `False` are all falsy. So `if items:` means "if the list is non-empty" — idiomatic Python, unlike Dart which requires a real bool.',
        },
        {
          kind: "code",
          caption: "Integer vs float division",
          code: py`
            7 / 2    # 3.5  -> always a float
            7 // 2   # 3    -> floor division
            7 % 2    # 1    -> remainder
            2 ** 10  # 1024 -> exponent
          `,
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "basics-greeting",
          title: "Format a greeting",
          difficulty: "easy",
          prompt:
            'Write `greet(name, score)` that returns the string `"Hi <name>, you scored <score>%"` where score is shown with exactly one decimal place. Example: `greet("Ada", 92.456)` → `"Hi Ada, you scored 92.5%"`.',
          starter: py`
            def greet(name, score):
                # Use an f-string. Format spec for 1 decimal place: {value:.1f}
                pass
          `,
          solution: py`
            def greet(name, score):
                return f"Hi {name}, you scored {score:.1f}%"
          `,
          tests: [
            {
              name: "formats one decimal",
              code: `assert greet("Ada", 92.456) == "Hi Ada, you scored 92.5%"`,
            },
            {
              name: "pads integers",
              code: `assert greet("Linus", 80) == "Hi Linus, you scored 80.0%"`,
            },
            {
              name: "rounds",
              code: `assert greet("Grace", 99.95) == "Hi Grace, you scored 100.0%"`,
              hidden: true,
            },
          ],
          hints: [
            "Functions use `def name(args):` and an indented body. Return with `return`.",
            "Inside an f-string, `{score:.1f}` formats a number with one decimal place.",
          ],
          explanation:
            "f-strings accept a format spec after a colon: `.1f` = fixed-point, 1 decimal. Other useful specs: `{n:,}` adds thousands separators, `{x:>8}` right-aligns, `{p:.0%}` formats 0.25 as `25%`.",
        },
        {
          kind: "quiz",
          id: "basics-truthiness",
          title: "Truthiness check",
          difficulty: "easy",
          question: "Which of these values is truthy in Python?",
          options: ["[]", '"0"', "0", "None"],
          answerIndex: 1,
          explanation:
            '`"0"` is a non-empty string, so it\'s truthy. Empty containers, zero and None are falsy.',
        },
      ],
    },
    {
      id: "control-flow",
      title: "Control flow",
      summary: "if/elif/else, for-in loops, range(), while, and match.",
      minutes: 15,
      content: [
        {
          kind: "compare",
          otherLang: "ts",
          other: py`
            for (let i = 0; i < 5; i++) {
              if (i % 2 === 0) console.log(i);
              else if (i === 3) console.log("three");
            }
          `,
          python: py`
            for i in range(5):
                if i % 2 == 0:
                    print(i)
                elif i == 3:
                    print("three")
          `,
          note: "Python uses `==` (no `===`), `and`/`or`/`not` instead of `&&`/`||`/`!`, and `elif`.",
        },
        {
          kind: "text",
          body: "`for` always iterates over something. `range(stop)`, `range(start, stop)`, `range(start, stop, step)` produce numbers; `enumerate(items)` gives `(index, item)` pairs; `zip(a, b)` walks two sequences together.",
        },
        {
          kind: "code",
          caption:
            "Structural pattern matching (Python 3.10+) — like Dart 3 switch expressions",
          code: py`
            def describe(event):
                match event:
                    case {"type": "click", "x": x, "y": y}:
                        return f"click at {x},{y}"
                    case {"type": "key", "key": k}:
                        return f"key {k}"
                    case _:
                        return "unknown"
          `,
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "basics-fizzbuzz",
          title: "FizzBuzz, returned not printed",
          difficulty: "easy",
          prompt:
            'Write `fizzbuzz(n)` returning a list of strings for 1..n inclusive: `"Fizz"` for multiples of 3, `"Buzz"` for multiples of 5, `"FizzBuzz"` for both, otherwise the number as a string.',
          starter: py`
            def fizzbuzz(n):
                result = []
                # loop from 1 to n inclusive
                return result
          `,
          solution: py`
            def fizzbuzz(n):
                result = []
                for i in range(1, n + 1):
                    if i % 15 == 0:
                        result.append("FizzBuzz")
                    elif i % 3 == 0:
                        result.append("Fizz")
                    elif i % 5 == 0:
                        result.append("Buzz")
                    else:
                        result.append(str(i))
                return result
          `,
          tests: [
            {
              name: "first five",
              code: `assert fizzbuzz(5) == ["1", "2", "Fizz", "4", "Buzz"]`,
            },
            {
              name: "fifteen is FizzBuzz",
              code: `assert fizzbuzz(15)[-1] == "FizzBuzz"`,
            },
            {
              name: "zero gives empty list",
              code: `assert fizzbuzz(0) == []`,
              hidden: true,
            },
          ],
          hints: [
            "`range(1, n + 1)` includes n — the stop value is exclusive.",
            "Check the 'both' case (divisible by 15) first, otherwise 'Fizz' wins.",
          ],
          explanation:
            'Order the branches from most to least specific. Lists grow with `.append()`. An interview-ready variant: `["Fizz" * (i % 3 == 0) + "Buzz" * (i % 5 == 0) or str(i) for i in range(1, n + 1)]` — it relies on `str * bool` and `or` returning its first truthy operand.',
        },
        {
          kind: "code",
          id: "basics-match",
          title: "Route commands with match",
          difficulty: "medium",
          prompt:
            'Write `handle(cmd)` taking a list of words. Return `"moving <dir>"` for `["go", dir]`, `"picked <item>"` for `["take", item]`, `"bye"` for `["quit"]`, and `"???"` for anything else. Use `match`.',
          starter: py`
            def handle(cmd):
                match cmd:
                    case _:
                        return "???"
          `,
          solution: py`
            def handle(cmd):
                match cmd:
                    case ["go", direction]:
                        return f"moving {direction}"
                    case ["take", item]:
                        return f"picked {item}"
                    case ["quit"]:
                        return "bye"
                    case _:
                        return "???"
          `,
          tests: [
            {
              name: "go north",
              code: `assert handle(["go", "north"]) == "moving north"`,
            },
            {
              name: "take lamp",
              code: `assert handle(["take", "lamp"]) == "picked lamp"`,
            },
            { name: "quit", code: `assert handle(["quit"]) == "bye"` },
            {
              name: "too many words",
              code: `assert handle(["go", "a", "b"]) == "???"`,
              hidden: true,
            },
          ],
          hints: [
            'Sequence patterns look like list literals: `case ["go", direction]:` binds `direction`.',
            "`case _:` is the wildcard / default.",
          ],
          explanation:
            'Sequence patterns match by length and position and bind names. `["go", "a", "b"]` has three elements so it doesn\'t match `["go", direction]` — falls to `_`.',
        },
      ],
    },
    {
      id: "functions",
      title: "Functions",
      summary:
        "Defaults, keyword arguments, *args/**kwargs and the mutable-default trap.",
      minutes: 20,
      content: [
        {
          kind: "compare",
          otherLang: "dart",
          other: py`
            String tag(String text, {String level = 'info'}) => '[$level] $text';
            tag('hi', level: 'warn');
          `,
          python: py`
            def tag(text: str, level: str = "info") -> str:
                return f"[{level}] {text}"

            tag("hi", level="warn")
          `,
          note: "Any parameter can be passed by keyword. Put `*` in the signature to force keyword-only args: `def f(a, *, strict=False)`.",
        },
        {
          kind: "code",
          caption: "Variadic arguments",
          code: py`
            def log(message, *args, **kwargs):
                # args is a tuple, kwargs is a dict
                print(message, args, kwargs)

            log("hi", 1, 2, user="ada")   # hi (1, 2) {'user': 'ada'}
          `,
        },
        {
          kind: "callout",
          tone: "warning",
          body: "Default values are evaluated **once**, when the function is defined. `def add(item, items=[])` shares the same list across calls. Use `items=None` and create the list inside.",
        },
        {
          kind: "callout",
          tone: "interview",
          body: "Interviewers love the mutable default bug. Being able to explain *why* (defaults are evaluated at definition time and stored on the function object) signals real understanding.",
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "basics-mutable-default",
          title: "Fix the mutable default",
          difficulty: "medium",
          prompt:
            "`add_tag(tag, tags=[])` should return a list with `tag` appended. It currently leaks state between calls. Fix it so each call without `tags` starts fresh, and calls that pass `tags` don't mutate the caller's list.",
          starter: py`
            def add_tag(tag, tags=[]):
                tags.append(tag)
                return tags
          `,
          solution: py`
            def add_tag(tag, tags=None):
                result = list(tags) if tags is not None else []
                result.append(tag)
                return result
          `,
          tests: [
            {
              name: "fresh list each call",
              code: `add_tag("a"); assert add_tag("b") == ["b"]`,
            },
            {
              name: "does not mutate input",
              code: py`
                original = ["x"]
                out = add_tag("y", original)
                assert out == ["x", "y"] and original == ["x"]
              `,
            },
          ],
          hints: [
            "Use `None` as the default and build a new list inside the function.",
            "`list(tags)` makes a shallow copy so you don't mutate the caller's list.",
          ],
          explanation:
            "`is not None` (identity check) is the idiomatic way to test for None. Copying the input makes the function pure — easier to test and reason about.",
        },
        {
          kind: "code",
          id: "basics-kwargs",
          title: "Build a query string",
          difficulty: "medium",
          prompt:
            "Write `build_query(base, **params)` that returns `base` plus `?key=value&...` with keys sorted alphabetically. Skip params whose value is `None`. If nothing remains, return `base` unchanged.",
          starter: py`
            def build_query(base, **params):
                pass
          `,
          solution: py`
            def build_query(base, **params):
                pairs = [f"{k}={v}" for k, v in sorted(params.items()) if v is not None]
                return f"{base}?{'&'.join(pairs)}" if pairs else base
          `,
          tests: [
            {
              name: "sorted keys",
              code: `assert build_query("/s", q="py", page=2) == "/s?page=2&q=py"`,
            },
            {
              name: "skips None",
              code: `assert build_query("/s", q=None) == "/s"`,
            },
            {
              name: "no params",
              code: `assert build_query("/s") == "/s"`,
              hidden: true,
            },
          ],
          hints: [
            "`params` is a dict. `sorted(params.items())` gives (key, value) pairs sorted by key.",
            '`"&".join(list_of_strings)` joins with a separator.',
          ],
          explanation:
            "This uses a list comprehension with a filter (`if v is not None`) and a conditional expression (`a if cond else b`). In production you'd use `urllib.parse.urlencode` which also escapes values.",
        },
      ],
    },
  ],
};
