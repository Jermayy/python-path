import { Fragment, type ReactNode } from "react";

/**
 * Renders the tiny markdown subset used in curriculum text: `code` and **bold**.
 * Produces React nodes only — never raw HTML — so content can't inject markup.
 */
export function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last)
      parts.push(
        <Fragment key={key++}>{text.slice(last, match.index)}</Fragment>,
      );
    const token = match[0];
    if (token.startsWith("`")) {
      parts.push(
        <code
          key={key++}
          className="bg-sunken text-accent rounded px-1.5 py-0.5 font-mono text-[0.9em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(
        <strong key={key++} className="text-fg font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length)
    parts.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return <>{parts}</>;
}
