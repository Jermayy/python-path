import { py } from "../dedent";
import type { Module } from "../types";

export const trainingFinetuning: Module = {
  id: "training-finetuning",
  order: 13,
  title: "Model Training & Fine-tuning",
  track: "ai",
  tagline:
    "How models learn — loss, gradient descent, data splits — and when fine-tuning beats prompting or RAG.",
  outcomes: [
    "Explain training, validation and test sets, overfitting and data leakage",
    "Implement gradient descent for a simple model with NumPy",
    "Prepare and validate a fine-tuning dataset, and argue prompt vs RAG vs fine-tune",
  ],
  lessons: [
    {
      id: "how-models-learn",
      title: "How models learn",
      summary:
        "A model is a function with parameters; training nudges them to reduce a loss.",
      minutes: 30,
      content: [
        {
          kind: "text",
          body: "**Training loop:** predict → measure error with a **loss** function → compute the **gradient** (direction that increases loss) → step parameters the opposite way, scaled by the **learning rate** → repeat over the data for several **epochs**. LLM pre-training is this loop at enormous scale with next-token prediction as the loss.",
        },
        {
          kind: "text",
          body: "**Data splits:** train on the training set, tune choices (hyperparameters, prompts!) on the validation set, and report once on a held-out test set. **Overfitting** = great training score, worse validation score. **Leakage** = test information sneaking into training (duplicates across splits, future data) — it makes results look better than reality.",
        },
        {
          kind: "code",
          caption: "Mean squared error and its gradient for y ≈ w·x + b",
          code: py`
            pred = w * x + b
            loss = np.mean((pred - y) ** 2)
            dw = 2 * np.mean((pred - y) * x)
            db = 2 * np.mean(pred - y)
            w -= lr * dw
            b -= lr * db
          `,
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "train-split",
          title: "Leak-free data split",
          difficulty: "medium",
          prompt:
            "Write `split(records, key, ratios=(0.8, 0.1, 0.1), seed=0)` returning `(train, val, test)`. Records sharing the same `key(record)` (e.g. same customer) must land in the same split to prevent leakage. Shuffle the unique keys with `random.Random(seed)` (sorted first, for determinism), then assign keys to splits by the cumulative ratios over the number of keys.",
          starter: py`
            import random

            def split(records, key, ratios=(0.8, 0.1, 0.1), seed=0):
                pass
          `,
          solution: py`
            import random

            def split(records, key, ratios=(0.8, 0.1, 0.1), seed=0):
                keys = sorted({key(r) for r in records})
                random.Random(seed).shuffle(keys)
                n = len(keys)
                n_train = int(round(ratios[0] * n))
                n_val = int(round(ratios[1] * n))
                assignment = {}
                for i, k in enumerate(keys):
                    assignment[k] = 0 if i < n_train else 1 if i < n_train + n_val else 2
                out = ([], [], [])
                for r in records:
                    out[assignment[key(r)]].append(r)
                return out
          `,
          tests: [
            {
              name: "groups never straddle splits",
              code: py`
                recs = [{"customer": f"c{i % 20}", "text": str(i)} for i in range(200)]
                tr, va, te = split(recs, key=lambda r: r["customer"])
                sets = [{r["customer"] for r in s} for s in (tr, va, te)]
                assert not (sets[0] & sets[1]) and not (sets[0] & sets[2]) and not (sets[1] & sets[2])
                assert len(tr) + len(va) + len(te) == 200
                assert (len(sets[0]), len(sets[1]), len(sets[2])) == (16, 2, 2)
              `,
            },
            {
              name: "deterministic for a seed",
              code: py`
                recs = [{"k": i} for i in range(50)]
                keysets = lambda parts: [sorted(r["k"] for r in p) for p in parts]
                a = keysets(split(recs, key=lambda r: r["k"], seed=7))
                b = keysets(split(list(reversed(recs)), key=lambda r: r["k"], seed=7))
                c = keysets(split(recs, key=lambda r: r["k"], seed=8))
                assert a == b, "input order must not change the assignment"
                assert a != c, "a different seed should give a different split"
              `,
            },
          ],
          hints: [
            "Split the *unique keys*, not the records — then route each record by its key.",
            "Sort the keys before shuffling so the result doesn't depend on set iteration order.",
          ],
          explanation:
            "Group-aware splitting is the most common fix for leakage in real projects: if the same customer's tickets appear in train and test, your eval measures memorisation. The same applies to eval sets for prompts.",
        },
        {
          kind: "code",
          id: "train-gradient-descent",
          title: "Gradient descent with NumPy",
          difficulty: "hard",
          packages: ["numpy"],
          prompt:
            "Write `fit_line(x, y, lr=0.05, epochs=500) -> (w, b, losses)` fitting `y ≈ w·x + b` by full-batch gradient descent on MSE, starting from w=b=0. `losses` is the MSE recorded at the start of each epoch. Return floats.",
          starter: py`
            import numpy as np

            def fit_line(x, y, lr=0.05, epochs=500):
                x = np.asarray(x, dtype=float)
                y = np.asarray(y, dtype=float)
                w, b = 0.0, 0.0
                losses = []
                pass
          `,
          solution: py`
            import numpy as np

            def fit_line(x, y, lr=0.05, epochs=500):
                x = np.asarray(x, dtype=float)
                y = np.asarray(y, dtype=float)
                w, b = 0.0, 0.0
                losses = []
                for _ in range(epochs):
                    pred = w * x + b
                    err = pred - y
                    losses.append(float(np.mean(err ** 2)))
                    w -= lr * float(2 * np.mean(err * x))
                    b -= lr * float(2 * np.mean(err))
                return w, b, losses
          `,
          tests: [
            {
              name: "recovers the line",
              code: py`
                import numpy as np
                rng = np.random.default_rng(0)
                x = rng.uniform(-2, 2, 200)
                y = 3 * x - 1 + rng.normal(0, 0.1, 200)
                w, b, losses = fit_line(x, y)
                assert abs(w - 3) < 0.05 and abs(b + 1) < 0.05, (w, b)
              `,
            },
            {
              name: "loss decreases",
              code: py`
                w, b, losses = fit_line([0, 1, 2, 3], [1, 3, 5, 7], epochs=50)
                assert len(losses) == 50 and losses[-1] < losses[0] / 100
                assert all(a >= b - 1e-12 for a, b in zip(losses, losses[1:]))
              `,
            },
            {
              name: "too-high learning rate diverges",
              code: py`
                _, _, losses = fit_line([0, 1, 2, 3], [1, 3, 5, 7], lr=1.0, epochs=20)
                assert losses[-1] > losses[0], "lr=1.0 should overshoot and diverge"
              `,
              hidden: true,
            },
          ],
          hints: [
            "Each epoch: compute predictions, record the loss, then update w and b with their gradients.",
            "Gradients of MSE: dw = 2·mean(err·x), db = 2·mean(err).",
          ],
          explanation:
            "Swap the line for a transformer and MSE for cross-entropy on next tokens, add mini-batches, Adam and GPUs — that's how LLMs train. The divergence test shows why learning-rate schedules matter.",
        },
      ],
    },
    {
      id: "finetuning",
      title: "Prompt vs RAG vs fine-tune",
      summary:
        "Choose the right lever, then prepare data properly if you do fine-tune.",
      minutes: 25,
      content: [
        {
          kind: "text",
          body: "**Decision ladder:** (1) better prompts + examples — cheapest, fastest to iterate; (2) **RAG** when the model needs knowledge it doesn't have or that changes (docs, tickets, catalogues); (3) **fine-tuning** when you need a consistent style/format/behaviour at scale, a smaller/cheaper model to match a bigger one on a narrow task, or lower latency. Fine-tuning teaches *behaviour*, not reliable new facts.",
        },
        {
          kind: "text",
          body: 'Fine-tuning data is usually chat-formatted JSONL: one example per line, each `{"messages": [{"role": "system"|"user"|"assistant", "content": ...}]}` ending with the assistant response you want. Quality beats quantity: a few hundred clean, diverse, deduplicated examples often beat thousands of noisy ones. Always hold out an eval set first.',
        },
      ],
      exercises: [
        {
          kind: "code",
          id: "ft-validate-jsonl",
          title: "Validate a fine-tuning dataset",
          difficulty: "medium",
          prompt:
            'Write `validate_jsonl(text) -> (valid_examples, errors)`. Each non-blank line must be JSON with a `messages` list; roles must be `system` (optional, only first), then alternating `user`/`assistant` starting with `user` and ending with `assistant`; every `content` a non-empty string. Duplicate examples (identical messages) after the first are errors. Errors are strings `"line N: <reason>"` (1-based). Reasons: `invalid json`, `missing messages`, `bad roles`, `empty content`, `duplicate`.',
          starter: py`
            import json

            def validate_jsonl(text):
                pass
          `,
          solution: py`
            import json

            def _roles_ok(messages):
                roles = [m.get("role") for m in messages]
                if roles and roles[0] == "system":
                    roles = roles[1:]
                if not roles or roles[-1] != "assistant":
                    return False
                return all(r == ("user" if i % 2 == 0 else "assistant") for i, r in enumerate(roles))

            def validate_jsonl(text):
                valid, errors, seen = [], [], set()
                for n, line in enumerate(text.splitlines(), start=1):
                    if not line.strip():
                        continue
                    try:
                        obj = json.loads(line)
                    except json.JSONDecodeError:
                        errors.append(f"line {n}: invalid json"); continue
                    msgs = obj.get("messages") if isinstance(obj, dict) else None
                    if not isinstance(msgs, list) or not all(isinstance(m, dict) for m in msgs):
                        errors.append(f"line {n}: missing messages"); continue
                    if not _roles_ok(msgs):
                        errors.append(f"line {n}: bad roles"); continue
                    if not all(isinstance(m.get("content"), str) and m["content"].strip() for m in msgs):
                        errors.append(f"line {n}: empty content"); continue
                    fingerprint = json.dumps(msgs, sort_keys=True)
                    if fingerprint in seen:
                        errors.append(f"line {n}: duplicate"); continue
                    seen.add(fingerprint)
                    valid.append(obj)
                return valid, errors
          `,
          tests: [
            {
              name: "catches each problem",
              code: py`
                import json
                good = {"messages": [{"role": "system", "content": "Be terse."}, {"role": "user", "content": "Hi"}, {"role": "assistant", "content": "Hello."}]}
                lines = [
                    json.dumps(good),
                    "{not json",
                    json.dumps({"prompt": "x"}),
                    json.dumps({"messages": [{"role": "assistant", "content": "x"}]}),
                    json.dumps({"messages": [{"role": "user", "content": "q"}, {"role": "assistant", "content": "  "}]}),
                    "",
                    json.dumps(good),
                ]
                valid, errors = validate_jsonl("\n".join(lines))
                assert len(valid) == 1
                assert errors == ["line 2: invalid json", "line 3: missing messages", "line 4: bad roles",
                                  "line 5: empty content", "line 7: duplicate"], errors
              `,
            },
            {
              name: "multi-turn ok",
              code: py`
                import json
                ex = {"messages": [{"role": "user", "content": "a"}, {"role": "assistant", "content": "b"},
                                   {"role": "user", "content": "c"}, {"role": "assistant", "content": "d"}]}
                assert validate_jsonl(json.dumps(ex)) == ([ex], [])
              `,
            },
            {
              name: "must end with assistant",
              code: `assert validate_jsonl('{"messages": [{"role": "user", "content": "a"}]}')[1] == ["line 1: bad roles"]`,
              hidden: true,
            },
          ],
          hints: [
            "Check in a fixed order (json → messages → roles → content → duplicate) and `continue` after the first error.",
            "A duplicate fingerprint: `json.dumps(messages, sort_keys=True)`.",
          ],
          explanation:
            "Data validation scripts like this run before every fine-tuning job — a single malformed line can fail a multi-hour job, and duplicates silently overweight examples.",
        },
        {
          kind: "quiz",
          id: "ft-when",
          title: "Pick the lever",
          difficulty: "medium",
          question:
            "A customer wants their support bot to answer questions about product docs that change weekly. What's the best first approach?",
          options: [
            "Fine-tune a model on the docs every week",
            "RAG over the docs with an eval set of real support questions",
            "Pre-train a new model",
            "Put all docs in the system prompt forever, no evals needed",
          ],
          answerIndex: 1,
          explanation:
            "Knowledge that changes belongs in retrieval, not weights. Fine-tuning may later help with tone/format, but RAG + evals is the right first step.",
        },
      ],
    },
  ],
};
