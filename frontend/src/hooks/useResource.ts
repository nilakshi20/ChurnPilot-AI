import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, toApiError } from "@/services/api";
import { useDataVersion } from "@/contexts/DataVersionContext";

export type ResourceState<T> = {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refetching: boolean;
  reload: () => void;
};

/**
 * Small fetch-state container used by every page: it tracks loading, keeps the previous
 * value while refetching, exposes a retry action, and refetches when demo data reloads.
 */
export function useResource<T>(loader: () => Promise<T>, deps: unknown[] = []): ResourceState<T> {
  const { version } = useDataVersion();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const hasData = useRef(false);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (hasData.current) {
      setRefetching(true);
    } else {
      setLoading(true);
    }

    loader()
      .then((value) => {
        if (cancelled) return;
        hasData.current = true;
        setData(value);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(toApiError(cause));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setRefetching(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt, version]);

  return { data, loading, error, refetching, reload };
}

export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
