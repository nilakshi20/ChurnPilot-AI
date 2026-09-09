import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type CardProps = {
  className?: string;
  children: ReactNode;
};

export function Card({ className, children }: CardProps) {
  return (
    <section className={cn("rounded-3xl bg-white p-6 shadow-panel ring-1 ring-sand-200", className)}>
      {children}
    </section>
  );
}
