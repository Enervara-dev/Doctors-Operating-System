"use client";

import { useEffect, useState } from "react";
import { CirclePause, CirclePlay, CircleStop, FlaskConical, Radio } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  CONNECTION_META,
  LIVE_SESSION_META,
  formatElapsed,
} from "@/lib/constants/live-consultation";
import { cn } from "@/lib/utils/cn";
import { useIsHydrated } from "@/lib/hooks/use-is-hydrated";
import { useConsultationStore } from "@/stores/consultation.store";
import { selectIsFixtureSession, useLiveSessionStore } from "@/stores/live-session.store";
import type { Consultation } from "@/types";

/**
 * Session control and status for the live consultation.
 *
 * Deliberately states two things separately: whether the platform is listening,
 * and whether this workspace is connected to it. A transport problem is not a
 * clinical problem, and the doctor should be able to tell them apart.
 */
export function LiveSessionBar({ consultation }: { consultation: Consultation }) {
  const session = useLiveSessionStore((state) => state.session);
  const connection = useLiveSessionStore((state) => state.connection);
  const transport = useLiveSessionStore((state) => state.transport);
  const isControlling = useLiveSessionStore((state) => state.isControlling);
  const isFixture = useLiveSessionStore(selectIsFixtureSession);
  const start = useLiveSessionStore((state) => state.start);
  const pause = useLiveSessionStore((state) => state.pause);
  const resume = useLiveSessionStore((state) => state.resume);
  const stop = useLiveSessionStore((state) => state.stop);

  const loadConsultation = useConsultationStore((state) => state.load);

  const isHydrated = useIsHydrated();
  const [now, setNow] = useState<number | null>(null);

  /**
   * Session control also moves the consultation's clinical lifecycle on the
   * server (LIVE, PAUSED, REVIEW). The record is re-read afterwards so the
   * header reflects the backend's state rather than an assumed one.
   */
  async function runControl(action: (id: string) => Promise<boolean>) {
    const ok = await action(consultation.id);
    if (ok) await loadConsultation(consultation.id, { force: true });
  }

  const state = session?.state ?? "IDLE";
  const startedAt = session?.startedAt ?? null;

  // The clock ticks locally from the server's start time rather than polling
  // it. The effect only advances a timestamp; the elapsed value is derived
  // during render, so there is no cascading state update.
  useEffect(() => {
    if (state !== "LIVE" || !startedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state, startedAt]);

  // Until the first tick lands the server's own count is shown, so the clock is
  // correct immediately and no impure call happens during render.
  const elapsed =
    state === "LIVE" && startedAt && now !== null
      ? Math.floor((now - new Date(startedAt).getTime()) / 1000)
      : (session?.elapsedSeconds ?? 0);

  const sessionMeta = LIVE_SESSION_META[state];
  const connectionMeta = CONNECTION_META[connection];
  const isFinalized = consultation.status === "FINALIZED";
  const canStart = !isFinalized && (state === "IDLE" || state === "ENDED");

  return (
    <Card className="overflow-hidden">
      {isFixture ? (
        <div
          role="note"
          className="flex items-start gap-2.5 border-b border-warning-border bg-warning-subtle px-4 py-2.5"
        >
          <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-xs text-text-secondary">
            <span className="font-semibold text-warning">
              Test fixture — not clinical output.
            </span>{" "}
            No Clinical Intelligence Platform is connected. This session replays a fixed
            synthetic script so the workspace can be evaluated. Nothing here is clinical advice.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn(
                "size-2.5 rounded-full",
                state === "LIVE" ? "animate-pulse bg-error" : "bg-text-tertiary",
              )}
            />
            <Badge tone={sessionMeta.tone}>{sessionMeta.label}</Badge>
          </span>

          {state === "LIVE" || state === "PAUSED" || state === "ENDED" ? (
            <span className="font-mono text-sm text-text tabular-nums">
              {isHydrated ? formatElapsed(elapsed) : "0:00"}
            </span>
          ) : null}

          <span className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Radio aria-hidden className="size-3.5" />
            <span className={cn(connection === "UNAVAILABLE" && "text-error")}>
              {connectionMeta.label}
            </span>
            {transport !== "NONE" ? (
              <span className="text-text-tertiary">
                · {transport === "STREAM" ? "stream" : "polling"}
              </span>
            ) : null}
          </span>
        </div>

        {isFinalized ? null : (
          <div className="flex shrink-0 flex-wrap gap-2">
            {canStart ? (
              <Button
                size="sm"
                isLoading={isControlling}
                onClick={() => void runControl(start)}
              >
                {isControlling ? null : <CirclePlay aria-hidden className="size-4" />}
                Start consultation
              </Button>
            ) : null}

            {state === "LIVE" ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  isLoading={isControlling}
                  onClick={() => void runControl(pause)}
                >
                  {isControlling ? null : <CirclePause aria-hidden className="size-4" />}
                  Pause
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void runControl(stop)}
                >
                  <CircleStop aria-hidden className="size-4" />
                  End consultation
                </Button>
              </>
            ) : null}

            {state === "PAUSED" ? (
              <>
                <Button
                  size="sm"
                  isLoading={isControlling}
                  onClick={() => void runControl(resume)}
                >
                  {isControlling ? null : <CirclePlay aria-hidden className="size-4" />}
                  Resume
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void runControl(stop)}
                >
                  <CircleStop aria-hidden className="size-4" />
                  End consultation
                </Button>
              </>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
}
