import { ArrowRight, Radar, Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const pillars = [
  {
    title: "Predict",
    copy: "Score which customers are likely to leave before the renewal window closes.",
    icon: Radar,
  },
  {
    title: "Understand",
    copy: "Explain the behavioral, billing, and support signals behind each risk score.",
    icon: Search,
  },
  {
    title: "Act",
    copy: "Recommend the retention move and draft the message your team should send.",
    icon: Sparkles,
  },
];

export function HomePage() {
  return (
    <div>
      <TopBar
        title="Keep the customers who already chose you."
        subtitle="Predict customer churn. Understand why. Take the right retention action."
      />

      <div className="grid gap-6 p-8 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="bg-ink-900 text-sand-50">
          <p className="text-sm uppercase tracking-[0.18em] text-moss-400">Product foundation</p>
          <h2 className="mt-4 max-w-xl font-display text-4xl leading-tight">
            A production-ready workspace for churn prediction and retention ops.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-sand-200/80">
            This first release establishes the application shell, API contract, and data model.
            The dashboard, scoring pipeline, and generated outreach will land on this foundation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/overview">
              <Button variant="inverse">
                Open workspace
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/health">
              <Button variant="ghost" className="text-sand-50 hover:bg-white/10">
                Check API health
              </Button>
            </Link>
          </div>
        </Card>

        <div className="grid gap-4">
          {pillars.map(({ title, copy, icon: Icon }) => (
            <Card key={title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sand-100 text-moss-600">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-ink-700/75">{copy}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
