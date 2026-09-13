import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

type DataVersionContextValue = {
  version: number;
  /** Bumping the version makes every mounted resource hook refetch from FastAPI. */
  invalidate: () => void;
};

const DataVersionContext = createContext<DataVersionContextValue | null>(null);

export function DataVersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const invalidate = useCallback(() => setVersion((current) => current + 1), []);
  const value = useMemo(() => ({ version, invalidate }), [version, invalidate]);
  return <DataVersionContext.Provider value={value}>{children}</DataVersionContext.Provider>;
}

export function useDataVersion(): DataVersionContextValue {
  const context = useContext(DataVersionContext);
  if (!context) {
    throw new Error("useDataVersion must be used inside DataVersionProvider");
  }
  return context;
}
