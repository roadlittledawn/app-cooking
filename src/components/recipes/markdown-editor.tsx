"use client";

import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

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
  return (
    <div data-color-mode="light">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || "")}
        preview="live"
        height={300}
        textareaProps={{ placeholder }}
      />
    </div>
  );
}
