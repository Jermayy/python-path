"use client";

import { python } from "@codemirror/lang-python";
import { EditorView, keymap } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo } from "react";

export function CodeEditor({
  value,
  onChange,
  onRun,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  label: string;
}) {
  const extensions = useMemo(
    () => [
      python(),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ "aria-label": label }),
      keymap.of([
        {
          key: "Mod-Enter",
          run: () => {
            onRun();
            return true;
          },
        },
      ]),
    ],
    [label, onRun],
  );
  return (
    <div className="border-line overflow-hidden rounded-lg border text-sm">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme="dark"
        minHeight="180px"
        maxHeight="520px"
        basicSetup={{
          tabSize: 4,
          indentOnInput: true,
          foldGutter: false,
          highlightActiveLine: true,
        }}
      />
    </div>
  );
}
