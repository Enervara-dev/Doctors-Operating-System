"use client";

import { useCallback, useEffect, useState } from "react";
import { toRequestFailure, type RequestFailure } from "@/lib/api/failure";

export type ResourceStatus = "loading" | "ready" | "error";

export interface AsyncResource<TData> {
  data: TData | null;
  status: ResourceStatus;
  failure: RequestFailure | null;
  reload: () => void;
}

/**
 * Loads a single API resource with the states every data-driven screen needs.
 * `loader` must be stable — wrap it in `useCallback` at the call site.
 *
 * The effect only ever writes state from its async callbacks; the transition
 * back to `loading` happens in `reload`, so a re-fetch never triggers a
 * cascading render.
 */
export function useAsyncResource<TData>(
  loader: (signal: AbortSignal) => Promise<TData>,
): AsyncResource<TData> {
  const [data, setData] = useState<TData | null>(null);
  const [status, setStatus] = useState<ResourceStatus>("loading");
  const [failure, setFailure] = useState<RequestFailure | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    loader(controller.signal)
      .then((result) => {
        if (!isCurrent) return;
        setData(result);
        setFailure(null);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!isCurrent || controller.signal.aborted) return;
        setFailure(toRequestFailure(error));
        setStatus("error");
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [loader, reloadToken]);

  const reload = useCallback(() => {
    setStatus("loading");
    setFailure(null);
    setReloadToken((token) => token + 1);
  }, []);

  return { data, status, failure, reload };
}
