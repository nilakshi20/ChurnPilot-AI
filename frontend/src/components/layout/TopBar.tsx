type TopBarProps = {
  title: string;
  subtitle?: string;
};

export function TopBar({ title, subtitle }: TopBarProps) {
  return (
    <header className="flex items-end justify-between gap-6 border-b border-sand-200 px-8 py-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-moss-600">ChurnPilot AI</p>
        <h1 className="mt-1 font-display text-3xl text-ink-900">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm text-ink-700/80">{subtitle}</p> : null}
      </div>
    </header>
  );
}
