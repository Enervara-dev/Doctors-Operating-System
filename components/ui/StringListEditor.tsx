"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface StringListEditorProps {
  label: string;
  values: readonly string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  hint?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Adds and removes free-text entries in a list. Used wherever the doctor keeps
 * an open-ended set of short items (advice, monitoring instructions, and so on).
 */
export function StringListEditor({
  label,
  values,
  onChange,
  placeholder = "Add an item",
  hint,
  emptyLabel = "Nothing added yet.",
  disabled = false,
  className,
}: StringListEditorProps) {
  const [draft, setDraft] = useState("");

  function commit() {
    const value = draft.trim();
    if (!value) return;
    if (values.includes(value)) {
      setDraft("");
      return;
    }
    onChange([...values, value]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <span className="mb-1.5 block text-sm font-medium text-text">{label}</span>

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={label}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-10 min-w-0 flex-1 rounded-control border border-border-default bg-surface px-3",
            "text-sm text-text transition-colors placeholder:text-text-tertiary",
            "hover:border-border-strong disabled:cursor-not-allowed disabled:bg-surface-muted",
          )}
        />
        <button
          type="button"
          onClick={commit}
          aria-label={`Add to ${label}`}
          disabled={disabled || draft.trim().length === 0}
          className={cn(
            "flex h-10 shrink-0 items-center gap-1.5 rounded-control border border-border-default",
            "bg-surface px-3 text-sm font-medium text-text transition-colors",
            "hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          <Plus aria-hidden className="size-4" />
          Add
        </button>
      </div>

      {hint ? <p className="mt-1.5 text-xs text-text-secondary">{hint}</p> : null}

      {values.length === 0 ? (
        <p className="mt-2.5 text-sm text-text-tertiary">{emptyLabel}</p>
      ) : (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <li key={value}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-muted py-1 pr-1 pl-2.5 text-xs text-text">
                {value}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(values.filter((entry) => entry !== value))}
                  aria-label={`Remove ${value}`}
                  className="flex size-4 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-border-default hover:text-text disabled:pointer-events-none"
                >
                  <X aria-hidden className="size-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
