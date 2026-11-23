import { py } from "../dedent";
import type { Module } from "../types";

export const evals: Module = {
  id: "evals",
  order: 12,
  title: "Evals: Measuring LLM Systems",
  track: "ai",
  tagline:
    "Golden datasets, metrics, LLM-as-judge and regression gates — the senior skill most candidates lack.",
  outcomes: [
    "Build a golden dataset and compute accuracy, precision/recall and retrieval metrics",
    "Write an LLM-as-judge with a rubric and control for its biases",
    "Gate releases on eval regressions in CI",
  ],
  lessons: [
    {
      id: "eval-basics",
      title: "Datasets & metrics",
      summary:
        "If you can't measure it, you're guessing. Evals are unit tests for model behaviour.",
      minutes: 30,
      content: [
        {
          kind: "text",
          body: "An **eval** = a dataset of inputs (with expected outputs or grading criteria) + a way to run your system on them + a **grader** + a summary metric. Start with 20–50 hand-written examples covering the common cases *and* known failure modes; grow it from real production failures. Keep a held-out set you don't tune against.",
        },
        {
          kind: "text",
          body: "Grader types, cheapest first: **code-based** (exact match, regex, JSON schema valid, contains citation) → **model-based** (LLM-as-judge with a rubric) → **human** review. Use the cheapest grader that's trustworthy for each criterion.",
        },
        {
          kind: "text",
          body: "Retrieval metrics for RAG: **recall@k** (did any relevant doc make the top k?) and **MRR** (mean of 1/rank of the first relevant doc). Evaluate retrieval separately from generation — when answers are wrong you need to know which half failed.",
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "eval-accuracy-breakdown",
          title: "Accuracy with a breakdown",
          difficulty: "medium",
          prompt:
            'Write `score(dataset, predict)` where each example is `{"input", "expected", "tag"}`. Grade with **normalised exact match** (case-insensitive, whitespace-trimmed, collapse internal whitespace). If `predict` raises, count it as a failure with `error` recorded. Return `{"accuracy": float(4dp), "by_tag": {tag: float(4dp)}, "failures": [{"input", "expected", "got"}]}` where `got` is the prediction or `"error: <ExceptionType>"`.',
          starter: py`
            def normalise(s):
                pass

            def score(dataset, predict):
                pass
          `,
          solution: py`
            from collections import defaultdict

            def normalise(s):
                return " ".join(str(s).lower().split())

            def score(dataset, predict):
                passed = 0
                tag_totals = defaultdict(lambda: [0, 0])
                failures = []
                for ex in dataset:
                    try:
                        got = predict(ex["input"])
                        ok = normalise(got) == normalise(ex["expected"])
                    except Exception as e:
                        got, ok = f"error: {type(e).__name__}", False
                    tag_totals[ex["tag"]][1] += 1
                    if ok:
                        passed += 1
                        tag_totals[ex["tag"]][0] += 1
                    else:
                        failures.append({"input": ex["input"], "expected": ex["expected"], "got": got})
                n = len(dataset)
                return {
                    "accuracy": round(passed / n, 4) if n else 0.0,
                    "by_tag": {t: round(p / c, 4) for t, (p, c) in tag_totals.items()},
                    "failures": failures,
                }
          `,
          tests: [
            {
              name: "scores with breakdown",
              code: py`
                ds = [{"input": "2+2", "expected": "4", "tag": "math"},
                      {"input": "capital of France", "expected": "Paris", "tag": "geo"},
                      {"input": "3*3", "expected": "9", "tag": "math"}]
                answers = {"2+2": " 4 ", "capital of France": "paris", "3*3": "6"}
                r = score(ds, lambda q: answers[q])
                assert r["accuracy"] == 0.6667 and r["by_tag"] == {"math": 0.5, "geo": 1.0}
                assert r["failures"] == [{"input": "3*3", "expected": "9", "got": "6"}]
              `,
            },
            {
              name: "exceptions are failures",
              code: py`
                def boom(q): raise TimeoutError()
                r = score([{"input": "x", "expected": "y", "tag": "t"}], boom)
                assert r["accuracy"] == 0.0 and r["failures"][0]["got"] == "error: TimeoutError"
              `,
            },
            {
              name: "normalise",
              code: py`assert normalise("  New   York \n") == "new york"`,
              hidden: true,
            },
          ],
          hints: [
            '`" ".join(s.lower().split())` trims and collapses whitespace in one go.',
            "Wrap each prediction in try/except so one crash doesn't kill the whole eval run.",
          ],
          explanation:
            'Per-tag breakdowns are what make evals actionable ("we regressed on refunds, not overall"). Recording failures with inputs lets you read them — the most valuable eval activity there is.',
        },
        {
          kind: "code",
          id: "eval-retrieval-metrics",
          title: "recall@k and MRR",
          difficulty: "medium",
          prompt:
            'Write `retrieval_metrics(results, k)` where `results` is a list of `(retrieved_ids, relevant_ids)` pairs. Return `{"recall_at_k": ..., "mrr": ...}` rounded to 4dp. recall@k = fraction of queries with at least one relevant id in the top k. MRR = mean of 1/rank (1-based) of the first relevant id in the full retrieved list, 0 if none.',
          starter: py`
            def retrieval_metrics(results, k):
                pass
          `,
          solution: py`
            def retrieval_metrics(results, k):
                if not results:
                    return {"recall_at_k": 0.0, "mrr": 0.0}
                hits = 0
                rr_total = 0.0
                for retrieved, relevant in results:
                    relevant = set(relevant)
                    if any(r in relevant for r in retrieved[:k]):
                        hits += 1
                    for rank, doc in enumerate(retrieved, start=1):
                        if doc in relevant:
                            rr_total += 1 / rank
                            break
                n = len(results)
                return {"recall_at_k": round(hits / n, 4), "mrr": round(rr_total / n, 4)}
          `,
          tests: [
            {
              name: "example",
              code: py`
                results = [(["a", "b", "c"], ["b"]),   # rank 2
                           (["x", "y", "z"], ["q"]),   # miss
                           (["m", "n"], ["m", "n"])]   # rank 1
                assert retrieval_metrics(results, 1) == {"recall_at_k": 0.3333, "mrr": 0.5}
                assert retrieval_metrics(results, 2)["recall_at_k"] == 0.6667
              `,
            },
            {
              name: "empty",
              code: `assert retrieval_metrics([], 5) == {"recall_at_k": 0.0, "mrr": 0.0}`,
              hidden: true,
            },
          ],
          hints: [
            "Convert relevant ids to a set for O(1) membership.",
            "For MRR, stop at the first relevant hit: `break` after adding 1/rank.",
          ],
          explanation:
            "MRR = (1/2 + 0 + 1/1) / 3 = 0.5. If recall@k is low, fix chunking/embeddings/hybrid search before touching the generation prompt.",
        },
      ],
    },
    {
      id: "llm-judge-regression",
      title: "LLM-as-judge & regression gates",
      summary:
        "Grade open-ended outputs with a model — carefully — and block bad releases.",
      minutes: 35,
      content: [
        {
          kind: "text",
          body: "LLM judges are useful for open-ended criteria (faithfulness to sources, tone, completeness), but they have biases: **position bias** (prefers the first option), **verbosity bias**, and **self-preference**. Mitigations: grade one criterion at a time with a concrete rubric, ask for reasoning before the verdict, use structured output, swap positions in pairwise comparisons, and **calibrate the judge against human labels** before trusting it.",
        },
        {
          kind: "code",
          caption: "A rubric-based judge prompt",
          code: py`
            JUDGE = """You are grading whether an ANSWER is fully supported by SOURCES.
            Score 1 if every factual claim in the answer is supported by the sources.
            Score 0 if any claim is unsupported or contradicted.
            Think step by step inside <reasoning>, then output <score>0</score> or <score>1</score>."""
          `,
        },
        {
          kind: "callout",
          tone: "interview",
          body: '"How do you know your RAG system works?" A senior answer: golden dataset from real queries, retrieval metrics + faithfulness/answer-quality judges calibrated on human labels, tracked per release in CI, plus online signals (thumbs, escalations) feeding new eval cases.',
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "eval-pairwise-judge",
          title: "Pairwise judge with position swap",
          difficulty: "hard",
          prompt:
            'Write `parse_verdict(text) -> "A" | "B" | "tie" | None` reading the last `<verdict>X</verdict>` tag (case-insensitive X, tolerate whitespace). Then write `compare(question, out1, out2, judge) -> "1" | "2" | "tie" | "inconsistent"`: call `judge(prompt)` twice — once with out1 as A, once swapped. If both runs agree on the same underlying output, return it; if both say tie return `"tie"`; if either verdict is unparseable or they disagree return `"inconsistent"`. Build prompts with `make_prompt(question, a, b)` (given).',
          starter: py`
            import re

            def make_prompt(question, a, b):
                return f"Question: {question}\n<A>{a}</A>\n<B>{b}</B>\nWhich is better? Answer <verdict>A</verdict>, <verdict>B</verdict> or <verdict>tie</verdict>."

            def parse_verdict(text):
                pass

            def compare(question, out1, out2, judge):
                pass
          `,
          solution: py`
            import re

            def make_prompt(question, a, b):
                return f"Question: {question}\n<A>{a}</A>\n<B>{b}</B>\nWhich is better? Answer <verdict>A</verdict>, <verdict>B</verdict> or <verdict>tie</verdict>."

            def parse_verdict(text):
                matches = re.findall(r"<verdict>\s*(a|b|tie)\s*</verdict>", text or "", flags=re.IGNORECASE)
                if not matches:
                    return None
                v = matches[-1].lower()
                return "tie" if v == "tie" else v.upper()

            def compare(question, out1, out2, judge):
                first = parse_verdict(judge(make_prompt(question, out1, out2)))
                second = parse_verdict(judge(make_prompt(question, out2, out1)))
                if first is None or second is None:
                    return "inconsistent"
                map_first = {"A": "1", "B": "2", "tie": "tie"}
                map_second = {"A": "2", "B": "1", "tie": "tie"}
                a, b = map_first[first], map_second[second]
                return a if a == b else "inconsistent"
          `,
          tests: [
            {
              name: "parses last verdict",
              code: py`
                assert parse_verdict("thinking <verdict>A</verdict> wait, actually <verdict> b </verdict>") == "B"
                assert parse_verdict("<VERDICT>Tie</VERDICT>") == "tie"
                assert parse_verdict("I prefer A") is None
              `,
            },
            {
              name: "consistent judge",
              code: py`
                def judge(prompt):
                    a = prompt.split("<A>")[1].split("</A>")[0]
                    return "<verdict>A</verdict>" if "detailed" in a else "<verdict>B</verdict>"
                assert compare("q", "short", "detailed answer", judge) == "2"
              `,
            },
            {
              name: "position-biased judge is caught",
              code: py`
                always_a = lambda p: "<verdict>A</verdict>"
                assert compare("q", "x", "y", always_a) == "inconsistent"
              `,
            },
            {
              name: "ties and garbage",
              code: py`
                assert compare("q", "x", "y", lambda p: "<verdict>tie</verdict>") == "tie"
                assert compare("q", "x", "y", lambda p: "no idea") == "inconsistent"
              `,
              hidden: true,
            },
          ],
          hints: [
            "`re.findall` with `re.IGNORECASE` returns every captured verdict — take the last one.",
            "In the swapped run, verdict A refers to out2. Map both runs back to '1'/'2' before comparing.",
          ],
          explanation:
            "Tracking the inconsistency rate tells you how much to trust the judge. A judge that flips when you swap positions is measuring order, not quality.",
        },
        {
          kind: "code",
          id: "eval-regression-gate",
          title: "CI regression gate",
          difficulty: "medium",
          prompt:
            'Write `gate(baseline, candidate, max_drop=0.02)` where each is a dict `case_id -> bool` (passed). Only compare cases present in both. Return `{"ship": bool, "baseline_rate", "candidate_rate" (4dp), "regressions": sorted ids that passed in baseline but fail in candidate, "fixes": sorted ids that newly pass}`. Ship only if the candidate pass rate hasn\'t dropped by more than `max_drop` **and** no case tagged critical regressed — critical ids are those starting with `"crit:"`.',
          starter: py`
            def gate(baseline, candidate, max_drop=0.02):
                pass
          `,
          solution: py`
            def gate(baseline, candidate, max_drop=0.02):
                common = sorted(set(baseline) & set(candidate))
                n = len(common)
                b_rate = sum(baseline[c] for c in common) / n if n else 0.0
                c_rate = sum(candidate[c] for c in common) / n if n else 0.0
                regressions = [c for c in common if baseline[c] and not candidate[c]]
                fixes = [c for c in common if not baseline[c] and candidate[c]]
                critical_regressed = any(c.startswith("crit:") for c in regressions)
                ship = (b_rate - c_rate) <= max_drop + 1e-9 and not critical_regressed
                return {
                    "ship": ship,
                    "baseline_rate": round(b_rate, 4),
                    "candidate_rate": round(c_rate, 4),
                    "regressions": regressions,
                    "fixes": fixes,
                }
          `,
          tests: [
            {
              name: "improvement ships",
              code: py`
                r = gate({"a": True, "b": False, "c": True}, {"a": True, "b": True, "c": True})
                assert r["ship"] and r["fixes"] == ["b"] and r["regressions"] == []
              `,
            },
            {
              name: "critical regression blocks even if overall improves",
              code: py`
                base = {"crit:refund": True, "x": False, "y": False}
                cand = {"crit:refund": False, "x": True, "y": True}
                r = gate(base, cand)
                assert not r["ship"] and r["regressions"] == ["crit:refund"]
              `,
            },
            {
              name: "drop beyond threshold blocks",
              code: py`
                base = {str(i): True for i in range(100)}
                cand = {**base, "1": False, "2": False, "3": False}
                assert gate(base, cand)["ship"] is False
                cand2 = {**base, "1": False, "2": False}
                assert gate(base, cand2)["ship"] is True
              `,
              hidden: true,
            },
          ],
          hints: [
            "Intersect the key sets so added/removed cases don't skew the rates.",
            "Floating point: compare with a tiny epsilon so a drop of exactly `max_drop` is allowed.",
          ],
          explanation:
            "This runs in CI on every prompt/model change, just like unit tests. Tagging critical cases encodes business priorities: a 1% overall gain isn't worth breaking refunds.",
        },
      ],
    },
  ],
};
