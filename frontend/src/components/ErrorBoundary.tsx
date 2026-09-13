import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

import { Button } from "@/components/ui/Button";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Keeps a render failure in one page from blanking the whole application shell.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ChurnPilot render error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    return (
      <div role="alert" className="rounded-3xl bg-white p-8 shadow-panel ring-1 ring-rose-200">
        <h2 className="font-display text-2xl text-ink-900">This view failed to render</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-700">
          Something went wrong while drawing this page. The rest of the app is still usable — reload the view to try again.
        </p>
        <p className="mt-3 rounded-2xl bg-sand-50 px-4 py-3 font-mono text-[11px] leading-5 text-ink-700">
          {this.state.error.message}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => this.setState({ error: null })}>Reload view</Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload the page
          </Button>
        </div>
      </div>
    );
  }
}
