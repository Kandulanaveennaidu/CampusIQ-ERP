"use client";

/**
 * Global error boundary — catches errors in the root layout itself.
 * Must include its own <html>/<body> tags since the root layout may be broken.
 */
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
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(to bottom, #fef2f2, #ffffff)",
            padding: "1rem",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: "480px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                backgroundColor: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
                fontSize: "2rem",
              }}
            >
              ⚠️
            </div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                color: "#1f2937",
                marginBottom: "0.75rem",
              }}
            >
              Critical Error
            </h1>
            <p
              style={{
                color: "#6b7280",
                marginBottom: "1.5rem",
                lineHeight: 1.6,
              }}
            >
              CampusIQ encountered a critical error. Please try refreshing the
              page. If this persists, contact support.
            </p>
            <button
              onClick={reset}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                fontWeight: 500,
                cursor: "pointer",
                marginRight: "0.5rem",
              }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{
                padding: "0.75rem 1.5rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                fontWeight: 500,
                color: "#374151",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
