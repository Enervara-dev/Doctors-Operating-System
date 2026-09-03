"use client";

import { History } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  CONSULTATION_EVENT_ACTOR_LABELS,
  CONSULTATION_EVENT_META,
} from "@/lib/constants/live-consultation";
import { cn } from "@/lib/utils/cn";
import { useConsultationEventStore } from "@/stores/consultation-event.store";
import { useLiveSessionStore } from "@/stores/live-session.store";

function timeOf(iso: string): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "";
  return value.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * The clinical timeline: what happened during the session and who caused it.
 *
 * Attribution is the point. Platform output and doctor actions sit in the same
 * ordered list but are always labelled, so the decision path can be
 * reconstructed afterwards.
 */
export function ClinicalTimelinePanel({ className }: { className?: string }) {
  const events = useConsultationEventStore((state) => state.events);
  const status = useConsultationEventStore((state) => state.status);
  const failure = useConsultationEventStore((state) => state.failure);
  const load = useConsultationEventStore((state) => state.load);
  const session = useLiveSessionStore((state) => state.session);

  // Newest first: during a consultation the recent past is what matters.
  const ordered = [...events].reverse();

  return (
    <Card
      role="region"
      aria-label="Clinical timeline"
      className={cn("relative flex min-h-0 flex-col overflow-hidden", className)}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border-default px-4 py-3">
        <h2 className="flex items-center gap-2 text-eyebrow text-text-secondary">
          <History aria-hidden className="size-3.5" />
          Clinical timeline
        </h2>
        {events.length > 0 ? (
          <span className="text-xs text-text-tertiary tabular-nums">{events.length}</span>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        {status === "error" ? (
          <ErrorState
            title="Timeline unavailable"
            description={failure?.message ?? "It could not be loaded."}
            onRetry={() => {
              if (session?.consultationId) void load(session.consultationId);
            }}
            className="my-4"
          />
        ) : ordered.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-text-tertiary">
            Activity will be recorded here as the consultation progresses.
          </p>
        ) : (
          <ol className="divide-y divide-border-default">
            {ordered.map((event) => {
              const meta = CONSULTATION_EVENT_META[event.kind];
              const Icon = meta.icon;
              const isSafety = event.kind === "CLINICAL_SAFETY";

              return (
                <li key={event.id} className="flex gap-2.5 py-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                      isSafety ? "bg-error-subtle" : "bg-surface-muted",
                    )}
                  >
                    <Icon
                      aria-hidden
                      className={cn("size-3.5", isSafety ? "text-error" : "text-text-tertiary")}
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p
                        className={cn(
                          "min-w-0 text-sm",
                          isSafety ? "font-medium text-text" : "text-text",
                        )}
                      >
                        {event.summary}
                      </p>
                      <time
                        dateTime={event.occurredAt}
                        className="font-mono text-[0.6875rem] text-text-tertiary tabular-nums"
                      >
                        {timeOf(event.occurredAt)}
                      </time>
                    </div>

                    {event.detail ? (
                      <p className="mt-0.5 text-xs text-text-secondary">{event.detail}</p>
                    ) : null}

                    <Badge
                      tone={event.actor === "DOCTOR" ? "primary" : "neutral"}
                      className="mt-1.5"
                    >
                      {CONSULTATION_EVENT_ACTOR_LABELS[event.actor]}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Card>
  );
}
