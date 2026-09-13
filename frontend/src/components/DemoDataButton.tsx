import { Database } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useDemoLoader } from "@/hooks/useChurnpilot";

export function DemoDataButton({
  variant = "primary",
  size = "md",
  label = "Load Demo Data",
  className,
}: {
  variant?: "primary" | "secondary" | "inverse" | "ghost";
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}) {
  const { loadDemo, loading } = useDemoLoader();

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      loading={loading}
      onClick={() => {
        void loadDemo().catch(() => undefined);
      }}
      title="Generates a synthetic dataset, retrains the model and rescores every customer"
    >
      {!loading ? <Database aria-hidden="true" className="h-4 w-4" /> : null}
      {loading ? "Loading demo data…" : label}
    </Button>
  );
}
