"use client";

import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { List, ListOrdered, Link2 } from "lucide-react";
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

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-sm font-mono leading-none"
    >
      {children}
    </button>
  );
}

export function MarkdownEditor({
  value,
  onChange,
  label,
  placeholder,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const editorRef = useRef<HTMLDivElement>(null);

  function highlight(code: string) {
    return Prism.highlight(code, Prism.languages.markdown, "markdown");
  }

  function getTextarea(): HTMLTextAreaElement | null {
    return editorRef.current?.querySelector("textarea") ?? null;
  }

  function wrapSelection(before: string, after: string) {
    const textarea = getTextarea();
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  }

  function prefixLines(prefix: string) {
    const textarea = getTextarea();
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = value.indexOf("\n", end);
    const blockEnd = lineEnd === -1 ? value.length : lineEnd;
    const block = value.slice(lineStart, blockEnd);
    const prefixed = block.split("\n").map((line) => prefix + line).join("\n");
    const newValue = value.slice(0, lineStart) + prefixed + value.slice(blockEnd);
    onChange(newValue);
    setTimeout(() => {
      textarea.focus();
    }, 0);
  }

  function insertLink() {
    const textarea = getTextarea();
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const linkText = selected || "link text";
    const insertion = `[${linkText}](url)`;
    const newValue = value.slice(0, start) + insertion + value.slice(end);
    onChange(newValue);
    setTimeout(() => {
      textarea.focus();
      const urlStart = start + linkText.length + 3;
      textarea.setSelectionRange(urlStart, urlStart + 3);
    }, 0);
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
          <div ref={editorRef}>
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-[var(--background)]">
              <ToolbarButton onClick={() => wrapSelection("**", "**")} title="Bold">
                <strong>B</strong>
              </ToolbarButton>
              <ToolbarButton onClick={() => wrapSelection("*", "*")} title="Italic">
                <em>I</em>
              </ToolbarButton>
              <ToolbarButton onClick={() => prefixLines("### ")} title="Heading">
                H3
              </ToolbarButton>
              <ToolbarButton onClick={() => prefixLines("- ")} title="Unordered list">
                <List className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => prefixLines("1. ")} title="Ordered list">
                <ListOrdered className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => prefixLines("> ")} title="Blockquote">
                &ldquo;
              </ToolbarButton>
              <ToolbarButton onClick={insertLink} title="Link">
                <Link2 className="w-4 h-4" />
              </ToolbarButton>
            </div>
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
          </div>
        ) : (
          <div className="px-4 py-3 prose prose-sm max-w-none min-h-[200px]">
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkBreaks]}>{value}</ReactMarkdown>
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
