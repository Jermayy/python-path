import { py } from "../dedent";
import type { Module } from "../types";

export const dataStructures: Module = {
  id: "data-structures",
  order: 2,
  title: "Collections & Comprehensions",
  track: "foundations",
  tagline:
    "list, dict, set, tuple — and the comprehension syntax that makes Python feel like Python.",
  outcomes: [
    "Pick the right built-in collection and know its Big-O costs",
    "Write list/dict/set comprehensions and generator expressions",
    "Use collections.Counter, defaultdict and sorting with key functions",
  ],
  lessons: [
    {
      id: "lists-dicts-sets",
      title: "Lists, dicts, sets, tuples",
      summary: "The four collections you'll use every day, with their costs.",
      minutes: 20,
      content: [
        {
          kind: "compare",
          otherLang: "ts",
          other: py`
            const nums: number[] = [3, 1, 2];
            const ages: Record<string, number> = { ada: 36 };
            const seen = new Set<string>();
            const point: [number, number] = [1, 2];
          `,
          python: py`
            nums: list[int] = [3, 1, 2]
            ages: dict[str, int] = {"ada": 36}
            seen: set[str] = set()      # {} is an empty dict!
            point: tuple[int, int] = (1, 2)
          `,
        },
        {
          kind: "text",
          body: "**Costs to remember:** list index/append is O(1), `x in list` is O(n). `x in dict` / `x in set` is O(1) on average — that's why converting a list to a set is the first move in many interview problems. Tuples are immutable and hashable, so they can be dict keys.",
        },
        {
          kind: "code",
          caption: "Slicing works on lists, tuples and strings",
          code: py`
            xs = [0, 1, 2, 3, 4, 5]
            xs[1:4]    # [1, 2, 3]
            xs[:2]     # [0, 1]
            xs[-2:]    # [4, 5]
            xs[::-1]   # reversed copy
            "python"[::2]  # 'pto'
          `,
        },
        {
          kind: "code",
          caption: "Dict essentials",
          code: py`
            user = {"name": "Ada", "langs": ["py"]}
            user.get("email")            # None instead of KeyError
            user.get("email", "n/a")     # with default
            for key, value in user.items():
                ...
            merged = {**user, "role": "admin"}   # like JS spread
          `,
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "ds-dedupe",
          title: "Dedupe, keep order",
          difficulty: "easy",
          prompt:
            "Write `dedupe(items)` returning a new list with duplicates removed, keeping the first occurrence order. Must be O(n).",
          starter: py`
            def dedupe(items):
                pass
          `,
          solution: py`
            def dedupe(items):
                seen = set()
                out = []
                for item in items:
                    if item not in seen:
                        seen.add(item)
                        out.append(item)
                return out
          `,
          tests: [
            {
              name: "keeps first order",
              code: `assert dedupe([3, 1, 3, 2, 1]) == [3, 1, 2]`,
            },
            {
              name: "strings",
              code: `assert dedupe(list("banana")) == ["b", "a", "n"]`,
            },
            {
              name: "linear time on 200k items",
              code: py`
                import time
                big = list(range(100_000)) * 2
                t = time.perf_counter(); r = dedupe(big)
                assert r == list(range(100_000))
                assert time.perf_counter() - t < 2.0, "too slow — are you using in on a list?"
              `,
              hidden: true,
            },
          ],
          hints: [
            "Membership on a set is O(1); on a list it's O(n).",
            "One-liner alternative: `list(dict.fromkeys(items))` — dicts preserve insertion order.",
          ],
          explanation:
            "Since Python 3.7 dicts preserve insertion order, so `list(dict.fromkeys(items))` is the idiomatic one-liner. The explicit set+list version shows you understand why it's O(n).",
        },
        {
          kind: "quiz",
          id: "ds-empty-braces",
          title: "Empty braces",
          difficulty: "easy",
          question: "What is `type({})`?",
          options: ["set", "dict", "tuple", "SyntaxError"],
          answerIndex: 1,
          explanation: "`{}` is an empty dict. Use `set()` for an empty set.",
        },
      ],
    },
    {
      id: "comprehensions",
      title: "Comprehensions & generators",
      summary: "map/filter in one readable line, and lazy evaluation.",
      minutes: 20,
      content: [
        {
          kind: "compare",
          otherLang: "ts",
          other: py`
            const squares = nums.filter(n => n % 2 === 0).map(n => n * n);
            const byId = Object.fromEntries(users.map(u => [u.id, u]));
          `,
          python: py`
            squares = [n * n for n in nums if n % 2 == 0]
            by_id = {u["id"]: u for u in users}
            unique_domains = {email.split("@")[1] for email in emails}
          `,
        },
        {
          kind: "text",
          body: "Swap the brackets for parentheses and you get a **generator expression** — it produces values lazily. `sum(x * x for x in range(10_000_000))` never builds a 10M-element list. Generators are central to streaming LLM responses and processing large datasets.",
        },
        {
          kind: "code",
          caption: "Sorting with key functions",
          code: py`
            users = [{"name": "b", "age": 30}, {"name": "a", "age": 25}]
            sorted(users, key=lambda u: u["age"])               # by age
            sorted(users, key=lambda u: (-u["age"], u["name"]))  # age desc, then name
          `,
        },
        {
          kind: "code",
          caption: "collections: the standard library's power tools",
          code: py`
            from collections import Counter, defaultdict
            Counter("mississippi").most_common(2)   # [('i', 4), ('s', 4)]
            groups = defaultdict(list)
            for word in ["apple", "avocado", "banana"]:
                groups[word[0]].append(word)        # no KeyError on first access
          `,
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "ds-group-by",
          title: "Group words by length",
          difficulty: "easy",
          prompt:
            "Write `group_by_length(words)` returning a dict mapping each length to a **sorted** list of words of that length.",
          starter: py`
            from collections import defaultdict

            def group_by_length(words):
                pass
          `,
          solution: py`
            from collections import defaultdict

            def group_by_length(words):
                groups = defaultdict(list)
                for w in words:
                    groups[len(w)].append(w)
                return {k: sorted(v) for k, v in groups.items()}
          `,
          tests: [
            {
              name: "groups and sorts",
              code: `assert group_by_length(["pear", "fig", "kiwi", "apple"]) == {4: ["kiwi", "pear"], 3: ["fig"], 5: ["apple"]}`,
            },
            {
              name: "returns a plain dict",
              code: `assert type(group_by_length(["a"])) is dict`,
            },
            {
              name: "empty",
              code: `assert group_by_length([]) == {}`,
              hidden: true,
            },
          ],
          hints: [
            "`defaultdict(list)` creates an empty list on first access to a key.",
            "Finish with a dict comprehension that sorts each group — this also converts defaultdict → dict.",
          ],
          explanation:
            "Returning a plain dict avoids surprising callers (a defaultdict silently creates keys on read). Dict equality ignores key order.",
        },
        {
          kind: "code",
          id: "ds-top-k",
          title: "Top-k frequent words",
          difficulty: "medium",
          prompt:
            "Write `top_k(text, k)` returning the k most common lowercase words in `text` as a list of `(word, count)` tuples, sorted by count desc then word asc. Words are split on whitespace; strip `.,!?` from each word.",
          starter: py`
            from collections import Counter

            def top_k(text, k):
                pass
          `,
          solution: py`
            from collections import Counter

            def top_k(text, k):
                words = [w.strip(".,!?").lower() for w in text.split()]
                counts = Counter(w for w in words if w)
                return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:k]
          `,
          tests: [
            {
              name: "basic",
              code: `assert top_k("the cat and the hat. The end!", 2) == [("the", 3), ("and", 1)]`,
            },
            {
              name: "k larger than vocab",
              code: `assert top_k("a b", 5) == [("a", 1), ("b", 1)]`,
            },
            {
              name: "punctuation only words dropped",
              code: `assert top_k("hi ! hi", 3) == [("hi", 2)]`,
              hidden: true,
            },
          ],
          hints: [
            "`str.strip(chars)` removes any of those characters from both ends.",
            "Sort key `(-count, word)` gives count descending, then alphabetical.",
          ],
          explanation:
            "`Counter.most_common(k)` breaks ties by insertion order, not alphabetically — which is why the explicit sort key is needed for deterministic output. Deterministic output matters a lot when you write evals later.",
        },
      ],
    },
  ],
};
