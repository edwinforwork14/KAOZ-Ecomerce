"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="es">
      <head>
        <title>Error crítico — KAOS Urban Athletics</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body style={{ margin: 0, background: "#0a0a0a", color: "#f5f5f5", fontFamily: "'Space Grotesk', sans-serif", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 560, width: "100%", padding: "48px", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#ff4444", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 32 }}>
            ⚠ CRITICAL_SYSTEM_FAILURE
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 700, textTransform: "uppercase", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 16 }}>
            KAOS<br />OFFLINE
          </h1>
          {error.digest && (
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 24 }}>
              ERR_REF: {error.digest}
            </p>
          )}
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.12em", lineHeight: 1.8, marginBottom: 40 }}>
            A critical rendering failure has occurred.<br />Attempting system recovery.
          </p>
          <button
            onClick={reset}
            style={{ background: "#f5f5f5", color: "#0a0a0a", border: "none", padding: "16px 40px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", cursor: "pointer", width: "100%" }}
          >
            REINITIALIZE SYSTEM
          </button>
        </div>
      </body>
    </html>
  )
}
