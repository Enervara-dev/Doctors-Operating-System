"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  hint?: string;
  error?: string;
  /** Rendered inside the field, before the text cursor. */
  leadingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leadingIcon, className, required, ...props },
  ref,
) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-text">
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-error">
            *
          </span>
        ) : null}
      </label>

      <div className="relative">
        {leadingIcon ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-tertiary"
          >
            {leadingIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            "h-10 w-full rounded-control border bg-surface px-3 text-sm text-text",
            "placeholder:text-text-tertiary transition-colors",
            "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-secondary",
            leadingIcon && "pl-9",
            error
              ? "border-error focus-visible:outline-error"
              : "border-border-default hover:border-border-strong",
            className,
          )}
          {...props}
        />
      </div>

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
