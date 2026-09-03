import type { ReactNode } from "react";
import type { Tone } from "@/lib/constants/appointment";
import { cn } from "@/lib/utils/cn";

const TONE_STYLES: Record<Tone, string> = {
  neutral: "bg-surface-muted text-text-secondary border-border-default",
  primary: "bg-primary-subtle text-on-primary-subtle border-primary-subtle-border",
  info: "bg-info-subtle text-info border-info-border",
  success: "bg-success-subtle text-success border-success-border",
  warning: "bg-warning-subtle text-warning border-warning-border",
  error: "bg-error-subtle text-error border-error-border",
};

const DOT_STYLES: Record<Tone, string> = {
  neutral: "bg-text-tertiary",
  primary: "bg-primary",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
};

export interface BadgeProps {
  tone?: Tone;
  withDot?: boolean;
  className?: string;
  /** Native tooltip, used where a compact value needs an explanation. */
  title?: string;
  children: ReactNode;
}

export function Badge({
  tone = "neutral",
  withDot = false,
  className,
  title,
  children,
}: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        "text-xs font-medium whitespace-nowrap",
        TONE_STYLES[tone],
        className,
      )}
    >
      {withDot ? (
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT_STYLES[tone])} />
      ) : null}
      {children}
    </span>
  );
}
