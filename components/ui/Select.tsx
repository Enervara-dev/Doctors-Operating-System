"use client";

import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  label: string;
  options: readonly SelectOption[];
  hint?: string;
  error?: string;
  labelHidden?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, hint, error, labelHidden = false, className, ...props },
  ref,
) {
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;

  return (
    <div className="w-full">
      <label
        htmlFor={fieldId}
        className={cn("mb-1.5 block text-sm font-medium text-text", labelHidden && "sr-only")}
      >
        {label}
      </label>

      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint ? hintId : undefined}
          className={cn(
            "h-10 w-full appearance-none rounded-control border bg-surface pr-9 pl-3",
            "text-sm text-text transition-colors",
            "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-secondary",
            error
              ? "border-error focus-visible:outline-error"
              : "border-border-default hover:border-border-strong",
            className,
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-tertiary"
        />
      </div>

      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-text-secondary">
          {hint}
        </p>
      ) : null}
      {error ? <p className="mt-1.5 text-xs font-medium text-error">{error}</p> : null}
    </div>
  );
});
