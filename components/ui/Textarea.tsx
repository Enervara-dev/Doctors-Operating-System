"use client";

import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  label: string;
  hint?: string;
  error?: string;
  /** Hides the visible label while keeping it available to screen readers. */
  labelHidden?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, labelHidden = false, className, required, rows = 4, ...props },
  ref,
) {
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className="w-full">
      <label
        htmlFor={fieldId}
        className={cn(
          "mb-1.5 block text-sm font-medium text-text",
          labelHidden && "sr-only",
        )}
      >
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-error">
            *
          </span>
        ) : null}
      </label>

      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          "w-full rounded-control border bg-surface px-3 py-2 text-sm text-text",
          "placeholder:text-text-tertiary transition-colors",
          "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-secondary",
          error
            ? "border-error focus-visible:outline-error"
            : "border-border-default hover:border-border-strong",
          className,
        )}
        {...props}
      />

      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-xs text-text-secondary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
});
