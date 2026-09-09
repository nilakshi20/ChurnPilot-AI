import { useEffect, useState } from "react";

import { fetchHealth } from "@/services/health";
import type { ApiResponse, HealthData } from "@/types/api";

type HealthState = {
  loading: boolean;
  error: string | null;
  payload: ApiResponse<HealthData> | null;
};

export function useHealth() {
  const [state, setState] = useState<HealthState>({
    loading: true,
    error: null,
    payload: null,
  });

  useEffect(() => {
    let cancelled = false;

    fetchHealth()
      .then((payload) => {
        if (!cancelled) {
          setState({ loading: false, error: null, payload });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unable to reach the API";
          setState({ loading: false, error: message, payload: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
