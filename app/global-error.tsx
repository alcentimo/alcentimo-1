"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#fafafa",
          color: "#18181b",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: "22rem",
            width: "100%",
            textAlign: "center",
            border: "1px solid #e4e4e7",
            borderRadius: "1rem",
            padding: "1.5rem",
            background: "#fff",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#71717a" }}>
            Error crítico
          </p>
          <h1
            style={{
              margin: "0.5rem 0 0",
              fontSize: "1.25rem",
              fontWeight: 700,
            }}
          >
            No pudimos cargar la aplicación
          </h1>
          <p style={{ margin: "0.75rem 0 0", fontSize: "0.875rem", color: "#52525b" }}>
            Recarga la página para continuar. Si el problema persiste, vuelve
            más tarde.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.25rem",
              width: "100%",
              border: 0,
              borderRadius: "0.75rem",
              padding: "0.75rem 1rem",
              background: "#0d9488",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}
