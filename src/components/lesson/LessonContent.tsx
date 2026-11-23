import { AlertTriangle, Briefcase, Lightbulb } from "lucide-react";
import { RichText } from "@/components/RichText";
import type { ContentBlock } from "@/modules/curriculum";

const calloutStyle = {
  tip: {
    Icon: Lightbulb,
    label: "Tip",
    className: "border-brand/50 bg-brand/10",
  },
  warning: {
    Icon: AlertTriangle,
    label: "Watch out",
    className: "border-warning/50 bg-warning/10",
  },
  interview: {
    Icon: Briefcase,
    label: "Interview signal",
    className: "border-accent/50 bg-accent/10",
  },
} as const;

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <pre
      className="border-line bg-sunken overflow-x-auto rounded-lg border p-4 text-sm leading-relaxed"
      aria-label={label}
      tabIndex={0}
    >
      <code className="font-mono">{code}</code>
    </pre>
  );
}

export function LessonContent({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "text":
            return (
              <p key={i} className="text-fg/90 leading-relaxed">
                <RichText text={block.body} />
              </p>
            );
          case "code":
            return (
              <figure key={i}>
                {block.caption && (
                  <figcaption className="text-muted mb-2 text-sm">
                    {block.caption}
                  </figcaption>
                )}
                <CodeBlock
                  code={block.code}
                  label={block.caption ?? "Python example"}
                />
              </figure>
            );
          case "compare":
            return (
              <figure
                key={i}
                className="border-line bg-elevated rounded-xl border p-4"
              >
                <figcaption className="mb-3 text-sm font-semibold">
                  Coming from{" "}
                  {block.otherLang === "dart" ? "Dart" : "TypeScript"}
                </figcaption>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-muted mb-1 text-xs tracking-wide uppercase">
                      {block.otherLang === "dart" ? "Dart" : "TypeScript"}
                    </p>
                    <CodeBlock
                      code={block.other}
                      label={`${block.otherLang} version`}
                    />
                  </div>
                  <div>
                    <p className="text-accent mb-1 text-xs tracking-wide uppercase">
                      Python
                    </p>
                    <CodeBlock code={block.python} label="Python version" />
                  </div>
                </div>
                {block.note && (
                  <p className="text-muted mt-3 text-sm">
                    <RichText text={block.note} />
                  </p>
                )}
              </figure>
            );
          case "callout": {
            const { Icon, label, className } = calloutStyle[block.tone];
            return (
              <aside
                key={i}
                className={`flex gap-3 rounded-lg border p-4 ${className}`}
              >
                <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm leading-relaxed">
                  <strong>{label}: </strong>
                  <RichText text={block.body} />
                </p>
              </aside>
            );
          }
        }
      })}
    </div>
  );
}
