"use client";

import { AlertCircle, Check, CircleDot, Loader2 } from "lucide-react";
import { useIsHydrated } from "@/lib/hooks/use-is-hydrated";
import { cn } from "@/lib/utils/cn";
import type { SaveState } from "@/stores/consultation.store";

function relativeLabel(isoTimestamp: string | null, isHydrated: boolean): string {
  if (!isoTimestamp || !isHydrated) return "Saved";
  const seconds = Math.round((Date.now() - new Date(isoTimestamp).getTime()) / 1000);
  if (seconds < 60) return "Saved just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Saved ${minutes} min ago`;
  return `Saved at ${new Date(isoTimestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function SaveStateIndicator({
  state,
  lastSavedAt,
  className,
}: {
  state: SaveState;
  lastSavedAt: string | null;
  className?: string;
}) {
  const isHydrated = useIsHydrated();

  const presentation = {
    IDLE: { icon: CircleDot, label: "No changes", tone: "text-text-tertiary" },
    UNSAVED: { icon: CircleDot, label: "Unsaved changes", tone: "text-warning" },
    SAVING: { icon: Loader2, label: "Saving…", tone: "text-text-secondary" },
    SAVED: { icon: Check, label: relativeLabel(lastSavedAt, isHydrated), tone: "text-success" },
    ERROR: { icon: AlertCircle, label: "Save failed", tone: "text-error" },
  }[state];

  const Icon = presentation.icon;

  return (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap",
        presentation.tone,
        className,
      )}
    >
      <Icon aria-hidden className={cn("size-3.5", state === "SAVING" && "animate-spin")} />
      {presentation.label}
    </span>
  );
}
