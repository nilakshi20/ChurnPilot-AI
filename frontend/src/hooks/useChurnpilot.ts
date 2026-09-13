import { useCallback, useState } from "react";

import { useDataVersion } from "@/contexts/DataVersionContext";
import { useToast } from "@/contexts/ToastContext";
import { churnpilot, type CustomerQuery } from "@/services/churnpilot";
import { toApiError } from "@/services/api";
import { useResource } from "@/hooks/useResource";
import { formatNumber } from "@/utils/format";

export function useHealth() {
  return useResource(() => churnpilot.health(), []);
}

export function useDashboardSummary() {
  return useResource(() => churnpilot.dashboardSummary(), []);
}

export function useCustomers(query: CustomerQuery) {
  const key = JSON.stringify(query);
  return useResource(() => churnpilot.customers(query), [key]);
}

export function useCustomer(id: string | undefined) {
  return useResource(() => (id ? churnpilot.customer(id) : Promise.reject(new Error("Missing customer id"))), [id]);
}

export function usePrediction(id: string | undefined) {
  return useResource(() => (id ? churnpilot.prediction(id) : Promise.reject(new Error("Missing customer id"))), [id]);
}

export function useRiskFactors(id: string | undefined) {
  return useResource(() => (id ? churnpilot.riskFactors(id) : Promise.reject(new Error("Missing customer id"))), [id]);
}

export function useRetentionHistory(id: string | undefined) {
  return useResource(() => (id ? churnpilot.retention(id) : Promise.reject(new Error("Missing customer id"))), [id]);
}

export function useSegments() {
  return useResource(() => churnpilot.segments(), []);
}

export function useInsights() {
  return useResource(() => churnpilot.insights(), []);
}

export function useChurnAnalytics() {
  return useResource(() => churnpilot.churnAnalytics(), []);
}

export function useRevenueRisk() {
  return useResource(() => churnpilot.revenueRisk(), []);
}

export function usePlatformSettings() {
  return useResource(() => churnpilot.platformSettings(), []);
}

/**
 * Loads the synthetic demo dataset, retrains the model, rescores customers and then
 * invalidates every mounted resource so the UI reflects the new data automatically.
 */
export function useDemoLoader() {
  const { notify } = useToast();
  const { invalidate } = useDataVersion();
  const [loading, setLoading] = useState(false);

  const loadDemo = useCallback(async () => {
    setLoading(true);
    notify({
      tone: "info",
      title: "Loading synthetic demo data",
      description: "Generating customers, retraining the model and scoring risk. This can take a minute.",
    });
    try {
      const result = await churnpilot.loadDemo();
      invalidate();
      notify({
        tone: "success",
        title: `${formatNumber(result.customers_loaded)} synthetic customers loaded`,
        description: result.predictions
          ? `${formatNumber(result.predictions.scored_customers)} customers scored with ${result.predictions.model_name} ${result.predictions.model_version}.`
          : "Customers loaded. Run predictions to score churn risk.",
      });
      return result;
    } catch (cause) {
      const error = toApiError(cause);
      notify({ tone: "error", title: "Demo data could not be loaded", description: error.message });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [invalidate, notify]);

  return { loadDemo, loading };
}

export function usePredictionRunner() {
  const { notify } = useToast();
  const { invalidate } = useDataVersion();
  const [loading, setLoading] = useState(false);

  const runPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await churnpilot.runPredictions();
      invalidate();
      notify({
        tone: "success",
        title: `Scored ${formatNumber(result.scored_customers)} customers`,
        description: `${result.model_name} ${result.model_version}`,
      });
      return result;
    } catch (cause) {
      const error = toApiError(cause);
      notify({ tone: "error", title: "Prediction run failed", description: error.message });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [invalidate, notify]);

  return { runPredictions, loading };
}
