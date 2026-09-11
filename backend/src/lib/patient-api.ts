import { AsyncLocalStorage } from "node:async_hooks";
import type { ApiErrorCode } from "../domain/types";
import { ApiError } from "./api-error";
import { env } from "../config/env";

/**
 * The seam that replaced the JSON fixtures.
 *
 * The Doctor API owns no database. Patients, appointments, health profiles,
 * labs, prescriptions and consultations all live in the patient platform's
 * PostgreSQL schema, and this module is the only thing in this service that
 * talks to it. Repositories call through here; services, controllers, the API
 * contract and the entire frontend are unchanged — which is the swap the
 * repository layer was shaped for.
 *
 * There is deliberately no second copy of any patient's record here. A stale
 * mirror of a clinical record is worse than a slow read of the real one.
 */

interface Session {
  /** The caller's bearer token, forwarded verbatim upstream. */
  token: string;
  /**
   * Per-request memo.
   *
   * The confirmation screen wants the patient, the brief wants their context,
   * and both are one upstream read. Caching for the life of a single request
   * collapses that without ever holding clinical data between requests — the
   * map dies with the async context.
   */
  cache: Map<string, Promise<unknown>>;
  /**
   * Values a handler needs to carry from a read to the write that follows it
   * — the consultation version being the only one today. Request-scoped, so
   * it is never state that outlives the call it belongs to.
   */
  scratch: Map<string, unknown>;
}

const sessionStore = new AsyncLocalStorage<Session>();

/**
 * Binds the caller's token to the async context for the life of one request.
 *
 * The alternative was threading a token argument through every service and
 * repository signature — a change to forty call sites to carry one value that
 * is constant for the request. More importantly, a service that *can* omit the
 * token is a service that can accidentally issue an unauthenticated upstream
 * read; here there is no such call to write.
 *
 * A service credential is deliberately NOT used. The doctor's own token is
 * forwarded, so the patient platform authorises the actual clinician and its
 * audit trail names them rather than naming this process.
 */
export function withSession<T>(token: string, fn: () => Promise<T>): Promise<T> {
  return sessionStore.run({ token, cache: new Map(), scratch: new Map() }, fn);
}

function currentToken(): string {
  const session = sessionStore.getStore();
  if (!session) {
    // Reaching here means a repository was called outside a request. That is a
    // wiring bug, and failing loudly is better than issuing an anonymous read.
    throw new ApiError(
      500,
      "INTERNAL_ERROR",
      "No caller session is bound to this request.",
    );
  }
  return session.token;
}

interface RemoteError {
  code?: string;
  message?: string;
  details?: Record<string, string>;
}

/**
 * Error codes the patient platform returns that this API already models.
 * Anything else is normalised rather than leaked: an upstream code the client
 * has never seen is not more useful than a clear generic one.
 */
const PASSTHROUGH_CODES = new Set<string>([
  "VALIDATION_ERROR",
  "INVALID_CREDENTIALS",
  "UNAUTHORIZED",
  "PATIENT_NOT_FOUND",
  "APPOINTMENT_NOT_FOUND",
  "CONSULTATION_NOT_FOUND",
  "ACCESS_CODE_INVALID",
  "CONSULTATION_FINALIZED",
]);

function normaliseError(status: number, body: RemoteError): ApiError {
  const code = body.code ?? "";

  if (PASSTHROUGH_CODES.has(code)) {
    return new ApiError(status, code as ApiErrorCode, body.message ?? "Request failed.", body.details);
  }

  // The platform's access vocabulary maps onto this API's single UNAUTHORIZED
  // code, but the message is the clinician-facing one and is kept.
  if (code === "PATIENT_ACCESS_REQUIRED" || code === "PATIENT_ACCESS_PENDING") {
    return new ApiError(403, "UNAUTHORIZED", body.message ?? "You do not have access to this patient.");
  }

  if (status === 401) {
    return ApiError.unauthorized("UNAUTHORIZED", "Your session is no longer valid.");
  }

  return new ApiError(
    status >= 500 ? 502 : status,
    "INTERNAL_ERROR",
    body.message ?? "The clinical record service is unavailable. Please try again.",
  );
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Login is the one call made before a session exists. */
  anonymous?: boolean;
  query?: Record<string, string | null | undefined>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${env.patientApiUrl}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value != null && value !== "") url.searchParams.set(key, value);
  }

  const headers: Record<string, string> = { accept: "application/json" };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (!options.anonymous) headers.authorization = `Bearer ${currentToken()}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(env.patientApiTimeoutMs),
    });
  } catch (error) {
    // A timeout or a refused connection is an outage, not a client mistake.
    // Saying so plainly beats a 500 that reads like a bug in this app.
    const reason = error instanceof Error && error.name === "TimeoutError" ? "timed out" : "unreachable";
    throw new ApiError(
      503,
      "INTERNAL_ERROR",
      `The clinical record service is ${reason}. Please try again.`,
    );
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  if (text.length > 0) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw normaliseError(response.status, (payload as RemoteError) ?? {});
  }

  return payload as T;
}

/**
 * Runs `load` at most once per request for a given key.
 *
 * The promise is cached rather than its value, so two callers that ask
 * concurrently share one upstream call instead of racing to make two.
 */
function memo<T>(key: string, load: () => Promise<T>): Promise<T> {
  const session = sessionStore.getStore();
  if (!session) return load();

  const existing = session.cache.get(key);
  if (existing) return existing as Promise<T>;

  const pending = load().catch((err) => {
    // A failed read must not be remembered: the next attempt in this request
    // should reach the server rather than replay the error.
    session.cache.delete(key);
    throw err;
  });
  session.cache.set(key, pending);
  return pending;
}

/**
 * Remembers a value for the life of the current request.
 *
 * Used for optimistic concurrency: the version a handler read is the version
 * its save must claim. Outside a request this is a no-op, so nothing can
 * accidentally depend on it persisting.
 */
export function remember(key: string, value: unknown): void {
  sessionStore.getStore()?.scratch.set(key, value);
}

export function recall<T>(key: string): T | undefined {
  return sessionStore.getStore()?.scratch.get(key) as T | undefined;
}

export const patientApi = {
  get: <T>(path: string, query?: RequestOptions["query"]) => request<T>(path, { query }),
  /** A GET that is issued at most once per request. */
  getOnce: <T>(path: string, query?: RequestOptions["query"]) =>
    memo(`GET ${path}?${new URLSearchParams(
      Object.entries(query ?? {}).filter((e): e is [string, string] => typeof e[1] === "string"),
    ).toString()}`, () => request<T>(path, { query })),
  post: <T>(path: string, body?: unknown, options?: { anonymous?: boolean }) =>
    request<T>(path, { method: "POST", body, anonymous: options?.anonymous }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
};
