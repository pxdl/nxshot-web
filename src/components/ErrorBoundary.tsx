import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level error boundary. The static app shell is removed once React mounts,
 * so an uncaught render error after that point would otherwise leave a blank
 * page with no way to recover. This shows a minimal reload card instead.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    // Inline styles so the fallback renders even if the failure is CSS-related.
    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem 1rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#44403c",
          background: "#fafaf9",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ margin: 0, maxWidth: "28rem", color: "#78716c" }}>
          nxshot hit an unexpected error. Your files were never uploaded
          anywhere, and reloading the page should fix it.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: "0.75rem 1.5rem",
            fontWeight: 600,
            color: "#fff",
            background: "#e60012",
            border: "none",
            borderRadius: "0.75rem",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
