import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { MessageTone } from "@/types/api";

export type WorkspacePreferences = {
  businessName: string;
  currency: string;
  defaultTone: MessageTone;
  retentionFocus: "revenue" | "probability" | "balanced";
  minimumMonthlySpend: number;
  excludeChurnedFromQueue: boolean;
  requireApprovalBeforeExport: boolean;
};

const STORAGE_KEY = "churnpilot.preferences.v1";

const DEFAULTS: WorkspacePreferences = {
  businessName: "ChurnPilot Workspace",
  currency: "USD",
  defaultTone: "professional",
  retentionFocus: "balanced",
  minimumMonthlySpend: 0,
  excludeChurnedFromQueue: true,
  requireApprovalBeforeExport: true,
};

type SettingsContextValue = {
  preferences: WorkspacePreferences;
  update: (patch: Partial<WorkspacePreferences>) => void;
  reset: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function readStored(): WorkspacePreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULTS;
    }
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<WorkspacePreferences>) };
  } catch {
    return DEFAULTS;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<WorkspacePreferences>(readStored);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Preferences are a convenience; ignore storage failures (private mode, quota).
    }
  }, [preferences]);

  const update = useCallback((patch: Partial<WorkspacePreferences>) => {
    setPreferences((current) => ({ ...current, ...patch }));
  }, []);

  const reset = useCallback(() => setPreferences(DEFAULTS), []);

  const value = useMemo(() => ({ preferences, update, reset }), [preferences, update, reset]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }
  return context;
}

export function useCurrency(): string {
  return useSettings().preferences.currency;
}

export { DEFAULTS as DEFAULT_PREFERENCES };
