/**
 * Global error boundary: the last-resort fallback when the root layout itself
 * throws, so it renders its own <html> and <body>. Dependency-light (no kit
 * imports — its CSS may not have loaded); shows generic copy and the digest
 * only, never the raw message (security floor, AGENTS.md).
 */
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "#f4ecd8",
          color: "#1a1a1a",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <main
          style={{
            width: "100%",
            maxWidth: "28rem",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              margin: "0 0 0.5rem",
              fontSize: "1.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            Something broke
          </h1>
          <p style={{ margin: "0 0 1.5rem", opacity: 0.75 }}>
            The app failed to load. Try again, or head back home.
          </p>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                cursor: "pointer",
                border: "2px solid #1a1a1a",
                borderRadius: "0.375rem",
                background: "#1a1a1a",
                color: "#f4ecd8",
                fontWeight: 700,
                padding: "0.5rem 1rem",
              }}
            >
              Try again
            </button>
            {/* Hard reload, not client nav: the root layout has thrown, so a
                full document load is what recovers the app cleanly. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                color: "#1a1a1a",
                fontWeight: 700,
                textUnderlineOffset: "4px",
              }}
            >
              Back to home
            </a>
          </div>
          {error.digest ? (
            <p
              style={{
                marginTop: "1.5rem",
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.8rem",
                opacity: 0.6,
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
