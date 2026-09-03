import type { ApiErrorCode, ApiResponse } from "@/types";

/** Every non-2xx or transport failure surfaces to callers as this error. */
export class ApiClientError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: Record<string, string> | undefined;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

type TokenProvider = () => string | null;

let getToken: TokenProvider = () => null;
let onUnauthorized: () => void = () => {};

/**
 * Wires the client to the auth store at app boot. Injecting rather than
 * importing keeps `lib/api` free of any dependency on React or Zustand.
 */
export function configureApiClient(options: {
  tokenProvider: TokenProvider;
  unauthorizedHandler: () => void;
}): void {
  getToken = options.tokenProvider;
  onUnauthorized = options.unauthorizedHandler;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** Skips the bearer header — used by the login call itself. */
  anonymous?: boolean;
}

/**
 * Issues an authenticated request and returns the raw `Response`.
 *
 * Used by the live event stream, which consumes a body stream rather than a
 * JSON envelope. It shares the same token provider, so streaming is
 * authenticated exactly like every other call.
 */
export function apiStream(path: string, signal?: AbortSignal): Promise<Response> {
  const token = getToken();
  return fetch(`/api${path}`, {
    headers: {
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
    cache: "no-store",
  });
}

export async function apiRequest<TData>(
  path: string,
  options: RequestOptions = {},
): Promise<TData> {
  const { method = "GET", body, signal, anonymous = false } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (!anonymous) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      signal,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiClientError(
      "INTERNAL_ERROR",
      "Unable to reach the Enervara service. Check your connection and try again.",
      0,
    );
  }

  let payload: ApiResponse<TData> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<TData>;
  } catch {
    payload = null;
  }

  if (!payload) {
    throw new ApiClientError(
      "INTERNAL_ERROR",
      "The service returned an unreadable response.",
      response.status,
    );
  }

  if (!payload.success) {
    if (response.status === 401) onUnauthorized();
    throw new ApiClientError(
      payload.error.code,
      payload.error.message,
      response.status,
      payload.error.details,
    );
  }

  return payload.data;
}
