"use client";

import { useEffect, useRef } from "react";
import { MessagesSquare } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { SPEAKER_META } from "@/lib/constants/live-consultation";
import { cn } from "@/lib/utils/cn";
import { useLiveSessionStore } from "@/stores/live-session.store";
import { selectUtterances, useTranscriptStore } from "@/stores/transcript.store";
import type { TranscriptUtterance } from "@/types";

function timeOf(utterance: TranscriptUtterance): string {
  const value = new Date(utterance.finalizedAt ?? utterance.startedAt);
  if (Number.isNaN(value.getTime())) return "";
  return value.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * One turn of the consultation. Presented as a clinical record of what was
 * said — an ordered, attributed timeline — rather than as chat.
 */
function Utterance({ utterance }: { utterance: TranscriptUtterance }) {
  const meta = SPEAKER_META[utterance.speaker];
  const isPartial = utterance.status === "PARTIAL";

  return (
    <li
      className={cn(
        "grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 border-l-2 py-2.5 pl-3",
        utterance.speaker === "DOCTOR" ? "border-primary" : "border-border-default",
        isPartial && "opacity-70",
      )}
    >
      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-xs font-semibold tracking-wide uppercase",
            utterance.speaker === "DOCTOR" ? "text-primary" : "text-text-secondary",
          )}
        >
          {utterance.speakerLabel || meta.label}
        </p>
        <p className="mt-0.5 font-mono text-[0.6875rem] text-text-tertiary tabular-nums">
          {timeOf(utterance)}
        </p>
      </div>

      <div className="min-w-0">
        <p className="text-sm leading-relaxed text-text">
          {utterance.text}
          {isPartial ? (
            <span
              aria-hidden
              className="ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-text-tertiary align-middle"
            />
          ) : null}
        </p>
        {isPartial ? <span className="sr-only">(still being transcribed)</span> : null}
      </div>
    </li>
  );
}

/**
 * The live speaker-labelled transcript.
 *
 * The Doctor application never touches audio: it renders what the platform has
 * already transcribed and attributed. When nothing is connected, it says so
 * plainly rather than showing an empty box.
 */
export function TranscriptPanel({ className }: { className?: string }) {
  const utterances = useTranscriptStore(selectUtterances);
  const status = useTranscriptStore((state) => state.status);
  const failure = useTranscriptStore((state) => state.failure);
  const finalCount = useTranscriptStore((state) => state.finalCount);
  const load = useTranscriptStore((state) => state.load);

  const session = useLiveSessionStore((state) => state.session);
  const connection = useLiveSessionStore((state) => state.connection);
  const sessionState = session?.state ?? "IDLE";

  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);

  // Follow the conversation, but stop following the moment the doctor scrolls
  // back to read something — jumping the view mid-consultation is hostile.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !pinnedToBottom.current) return;
    node.scrollTop = node.scrollHeight;
  }, [utterances]);

  function handleScroll() {
    const node = scrollRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    pinnedToBottom.current = distanceFromBottom < 48;
  }

  const emptyMessage =
    sessionState === "IDLE"
      ? "Start the consultation to begin the transcript."
      : sessionState === "PAUSED"
        ? "Paused. The transcript resumes when you do."
        : connection === "CONNECTING"
          ? "Connecting…"
          : connection === "RECONNECTING"
            ? "Reconnecting…"
            : "Waiting for the consultation to begin.";

  return (
    <Card
      role="region"
      aria-label="Live transcript"
      className={cn("relative flex min-h-0 flex-col overflow-hidden", className)}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border-default px-4 py-3">
        <h2 className="flex items-center gap-2 text-eyebrow text-text-secondary">
          <MessagesSquare aria-hidden className="size-3.5" />
          Live transcript
        </h2>
        {finalCount > 0 ? (
          <span className="text-xs text-text-tertiary tabular-nums">{finalCount} turns</span>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        aria-live="polite"
        aria-relevant="additions text"
        className="min-h-0 flex-1 overflow-y-auto px-4 py-2"
      >
        {status === "error" ? (
          <ErrorState
            title="Transcript unavailable"
            description={failure?.message ?? "The transcript could not be loaded."}
            onRetry={() => {
              if (session?.consultationId) void load(session.consultationId);
            }}
            className="my-4"
          />
        ) : null}

        {status === "loading" && utterances.length === 0 ? (
          <div aria-hidden className="space-y-4 py-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : null}

        {status !== "error" && utterances.length === 0 && status !== "loading" ? (
          <p className="px-1 py-10 text-center text-sm text-text-tertiary">{emptyMessage}</p>
        ) : null}

        {utterances.length > 0 ? (
          <ol className="divide-y divide-border-default">
            {utterances.map((utterance) => (
              <Utterance key={utterance.id} utterance={utterance} />
            ))}
          </ol>
        ) : null}
      </div>
    </Card>
  );
}
