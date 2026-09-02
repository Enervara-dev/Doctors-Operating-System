"use client";

import { cn } from "@/lib/utils/cn";

export interface SegmentedOption<TValue extends string> {
  value: TValue;
  label: string;
  count?: number;
}

export interface SegmentedControlProps<TValue extends string> {
  label: string;
  options: readonly SegmentedOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  className?: string;
}

export function SegmentedControl<TValue extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<TValue>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex w-full gap-1 overflow-x-auto rounded-control border border-border-default bg-surface p-1 sm:w-auto",
        className,
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-[0.375rem] px-3 py-1.5",
              "text-[0.8125rem] font-medium whitespace-nowrap transition-colors sm:flex-none",
              isSelected
                ? "bg-primary-subtle text-on-primary-subtle"
                : "text-text-secondary hover:bg-surface-muted hover:text-text",
            )}
          >
            {option.label}
            {typeof option.count === "number" ? (
              <span className="text-xs tabular-nums opacity-70">{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
