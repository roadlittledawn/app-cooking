"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markdown";
import "prismjs/themes/prism-tomorrow.css";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  label,
  placeholder,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");

  function highlight(code: string) {
    return Prism.highlight(code, Prism.languages.markdown, "markdown");
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="border rounded-md overflow-hidden">
        <div className="flex border-b bg-[var(--muted)]">
          <button
            type="button"
            onClick={() => setTab("write")}
            className={`px-4 py-2 text-sm ${
              tab === "write"
                ? "bg-[var(--background)] border-b-2 border-blue-500 font-medium"
                : "text-[var(--muted-foreground)] hover:opacity-80"
            }`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={`px-4 py-2 text-sm ${
              tab === "preview"
                ? "bg-[var(--background)] border-b-2 border-blue-500 font-medium"
                : "text-[var(--muted-foreground)] hover:opacity-80"
            }`}
          >
            Preview
          </button>
        </div>

        {tab === "write" ? (
          <div className="min-h-[300px] relative">
            {!value && placeholder && (
              <span className="absolute top-2 left-3 text-[var(--muted-foreground)] text-sm pointer-events-none">
                {placeholder}
              </span>
            )}
            <Editor
              value={value}
              onValueChange={onChange}
              highlight={highlight}
              padding={12}
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.875rem",
                minHeight: "300px",
                backgroundColor: "var(--card)",
                color: "var(--foreground)",
              }}
            />
          </div>
        ) : (
          <div className="px-4 py-3 prose prose-sm max-w-none min-h-[200px]">
            {value ? (
              <ReactMarkdown>{value}</ReactMarkdown>
            ) : (
              <p className="text-[var(--muted-foreground)] italic">Nothing to preview</p>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--muted-foreground)] mt-1">Supports Markdown formatting</p>
    </div>
  );
}
