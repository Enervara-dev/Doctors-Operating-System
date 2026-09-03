"use client";

import type { LiveTransportKind, LiveUpdate, LiveUpdatesPage } from "@/types";
import { liveConsultationApi } from "./live-consultation.api";

/**
 * Transport abstraction for live consultation updates.
 *
 * The workspace does not know or care how updates arrive. Two implementations
 * exist — a server-sent event stream and cursor polling — and both deliver the
 * same `LiveUpdate` shape. A different mechanism later (WebSocket, or a
 * provider's own SDK) means adding one implementation here and nothing else.
 */

export interface LiveTransportCursors {
  transcript: number;
  events: number;
}

export interface LiveTransportHandlers {
  onUpdate: (update: LiveUpdate) => void;
  onSnapshot: (page: LiveUpdatesPage) => void;
  /** Reports transport health only; clinical availability is separate. */
  onConnectionChange: (state: "CONNECTING" | "CONNECTED" | "RECONNECTING" | "UNAVAILABLE") => void;
  /** Lets the transport report which mechanism actually carried the data. */
  onTransportChange: (kind: LiveTransportKind) => void;
  /** The transport reads cursors lazily so it always resumes from the latest. */
  getCursors: () => LiveTransportCursors;
}

export interface LiveTransport {
  readonly kind: LiveTransportKind;
  connect(consultationId: string, handlers: LiveTransportHandlers): () => void;
}

/* -------------------------------------------------------------------------- */
/* Stream transport                                                            */
/* -------------------------------------------------------------------------- */

const STREAM_HANDSHAKE_TIMEOUT_MS = 6000;

/**
 * Reads the event stream with `fetch` rather than `EventSource`.
 *
 * `EventSource` cannot send an Authorization header, and putting a session
 * token in a URL would leak it into logs and history. Reading the body stream
 * directly keeps the request authenticated like every other call.
 */
export function createStreamTransport(): LiveTransport {
  return {
    kind: "STREAM",
    connect(consultationId, handlers) {
      const controller = new AbortController();
      let closed = false;
      let handshakeTimer: ReturnType<typeof setTimeout> | null = null;

      const fail = (): void => {
        if (closed) return;
        closed = true;
        controller.abort();
        handlers.onConnectionChange("UNAVAILABLE");
      };

      handlers.onConnectionChange("CONNECTING");

      void (async () => {
        try {
          const response = await liveConsultationApi.openStream(consultationId, controller.signal);
          if (!response.ok || !response.body) {
            fail();
            return;
          }

          handshakeTimer = setTimeout(fail, STREAM_HANDSHAKE_TIMEOUT_MS);

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            if (closed) return;

            buffer += decoder.decode(value, { stream: true });
            const frames = buffer.split("\n\n");
            buffer = frames.pop() ?? "";

            for (const frame of frames) {
              if (handshakeTimer) {
                clearTimeout(handshakeTimer);
                handshakeTimer = null;
                handlers.onConnectionChange("CONNECTED");
                handlers.onTransportChange("STREAM");
              }

              const eventName = /^event: (.+)$/m.exec(frame)?.[1];
              const dataLine = /^data: (.+)$/m.exec(frame)?.[1];
              if (!eventName || !dataLine) continue;

              try {
                const parsed: unknown = JSON.parse(dataLine);
                if (eventName === "snapshot") handlers.onSnapshot(parsed as LiveUpdatesPage);
                else handlers.onUpdate(parsed as LiveUpdate);
              } catch {
                // A malformed frame must not tear down a live consultation.
              }
            }
          }

          // The server closed the stream; fall back so updates keep flowing.
          if (!closed) fail();
        } catch {
          if (!closed) fail();
        }
      })();

      return () => {
        closed = true;
        if (handshakeTimer) clearTimeout(handshakeTimer);
        controller.abort();
      };
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Polling transport                                                           */
/* -------------------------------------------------------------------------- */

const POLL_INTERVAL_MS = 2000;

/** Cursor polling. Slower, but works wherever a long-lived response does not. */
export function createPollingTransport(intervalMs = POLL_INTERVAL_MS): LiveTransport {
  return {
    kind: "POLL",
    connect(consultationId, handlers) {
      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      handlers.onConnectionChange("CONNECTING");
      handlers.onTransportChange("POLL");

      const tick = async (): Promise<void> => {
        if (stopped) return;
        try {
          const page = await liveConsultationApi.getUpdates(consultationId, handlers.getCursors());
          if (stopped) return;
          handlers.onConnectionChange("CONNECTED");
          handlers.onSnapshot(page);
        } catch {
          if (!stopped) handlers.onConnectionChange("RECONNECTING");
        } finally {
          if (!stopped) timer = setTimeout(() => void tick(), intervalMs);
        }
      };

      void tick();

      return () => {
        stopped = true;
        if (timer) clearTimeout(timer);
      };
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Resilient transport                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Prefers the stream and falls back to polling if it cannot be established or
 * drops. The consultation keeps receiving updates either way; which mechanism
 * is in use is reported for diagnostics, not as a functional difference.
 */
export function createResilientTransport(): LiveTransport {
  const stream = createStreamTransport();
  const polling = createPollingTransport();

  return {
    kind: "STREAM",
    connect(consultationId, handlers) {
      let disposeActive: (() => void) | null = null;
      let fellBack = false;
      let disposed = false;

      const startPolling = (): void => {
        if (disposed || fellBack) return;
        fellBack = true;
        disposeActive?.();
        disposeActive = polling.connect(consultationId, handlers);
      };

      disposeActive = stream.connect(consultationId, {
        ...handlers,
        onConnectionChange: (state) => {
          if (state === "UNAVAILABLE" && !fellBack) {
            handlers.onConnectionChange("RECONNECTING");
            startPolling();
            return;
          }
          handlers.onConnectionChange(state);
        },
      });

      return () => {
        disposed = true;
        disposeActive?.();
      };
    },
  };
}
