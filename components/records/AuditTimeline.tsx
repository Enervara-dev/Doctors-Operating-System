"use client";

import { History } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Disclosure } from "@/components/ui/Disclosure";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { AUDIT_ACTION_META, AUDIT_ACTOR_LABELS } from "@/lib/constants/record";
import { formatTimestamp } from "@/lib/utils/date";
import type { RequestFailure } from "@/lib/api/failure";
import type { AuditEvent } from "@/types";

/** Extracts the human-readable lines a stored payload can produce, if any. */
function toLines(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  const raw = Array.isArray(value) ? value.map((entry) => describe(entry)) : [describe(value)];
  return raw.filter((line) => line.length > 0);
}

function ChangeDetail({ label, lines }: { label: string; lines: string[] }) {
  if (lines.length === 0) return null;

  return (
    <div>
      <p className="text-eyebrow text-text-tertiary">{label}</p>
      <ul className="mt-1 space-y-0.5 text-xs text-text-secondary">
        {lines.map((line, index) => (
          <li key={`${line}-${index}`}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Turns a stored value into a short human line. Deliberately conservative: it
 * reads only well-known clinical fields, so no internal shape leaks into the UI.
 */
function describe(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value !== "object" || value === null) return "";

  const entry = value as Record<string, unknown>;
  const parts = [
    entry.condition,
    entry.name,
    entry.dosage,
    entry.frequency,
    entry.duration,
    entry.interval,
    entry.status,
  ].filter((part): part is string => typeof part === "string" && part.length > 0);

  return parts.join(" · ");
}

export interface AuditTimelineProps {
  events: AuditEvent[];
  status: "idle" | "loading" | "ready" | "error";
  failure: RequestFailure | null;
  onRetry: () => void;
}

/** The activity trail for one consultation, newest first. */
export function AuditTimeline({ events, status, failure, onRetry }: AuditTimelineProps) {
  if (status === "error") {
    return (
      <ErrorState
        title="Audit history unavailable"
        description={failure?.message ?? "The activity trail could not be loaded."}
        onRetry={onRetry}
      />
    );
  }

  if (status === "idle" || status === "loading") {
    return (
      <div aria-hidden className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3.5 w-56" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No audit events"
        description="Activity is recorded as the consultation progresses."
      />
    );
  }

  return (
    <ol className="space-y-1">
      {events.map((event) => {
        const meta = AUDIT_ACTION_META[event.action];
        const Icon = meta.icon;
        const beforeLines = toLines(event.previousValue);
        const afterLines = toLines(event.newValue);
        // Only offer the expander when it has something to show, so it never
        // opens onto an empty panel.
        const hasDetail = beforeLines.length > 0 || afterLines.length > 0;

        return (
          <li
            key={event.id}
            className="flex gap-3 rounded-control px-1 py-2.5 transition-colors hover:bg-surface-subtle"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted">
              <Icon aria-hidden className="size-4 text-text-tertiary" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="text-sm font-medium text-text">{meta.label}</p>
                <time
                  dateTime={event.timestamp}
                  className="text-xs text-text-tertiary tabular-nums"
                >
                  {formatTimestamp(event.timestamp)}
                </time>
              </div>

              <p className="mt-0.5 text-sm text-text-secondary">{event.summary}</p>

              <p className="mt-1 flex items-center gap-1.5 text-xs text-text-tertiary">
                <Badge>{AUDIT_ACTOR_LABELS[event.actorType]}</Badge>
                {event.actorName ?? "System"}
              </p>

              {hasDetail ? (
                <Disclosure
                  className="mt-2"
                  summary={
                    <span className="text-xs font-medium text-text-secondary">
                      What changed
                    </span>
                  }
                  panelClassName="space-y-2 border-l border-border-default pl-3"
                >
                  <ChangeDetail label="Before" lines={beforeLines} />
                  <ChangeDetail label="After" lines={afterLines} />
                </Disclosure>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
