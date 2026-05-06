"use client"

import { useEffect } from "react"

export default function Error({
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
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-xl w-full border border-outline-variant/30 bg-surface-container-lowest p-12 text-center flex flex-col items-center gap-8">
        <div className="border border-error/30 bg-error/5 px-3 py-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-sm">error</span>
          <span className="font-mono-data text-[10px] text-error uppercase tracking-widest">SYSTEM_ERROR_DETECTED</span>
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-h1 text-on-background uppercase tracking-tight leading-none">
            PROTOCOL<br />FAILURE
          </h1>
          <p className="font-mono-data text-[10px] text-on-surface-variant uppercase tracking-widest opacity-60">
            {error.digest ? `REF: ${error.digest}` : "UNEXPECTED_RUNTIME_EXCEPTION"}
          </p>
        </div>

        <p className="font-body-sm text-xs text-on-surface-variant uppercase tracking-widest leading-relaxed opacity-70 max-w-sm">
          An unexpected error occurred in the application protocol. Attempt a reset or return to the main grid.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <button
            onClick={reset}
            className="flex-1 bg-tertiary text-on-tertiary font-label-caps text-label-caps uppercase py-4 hover:bg-on-surface hover:text-tertiary transition-all duration-300 border border-tertiary flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            RESET_PROTOCOL
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="flex-1 bg-transparent text-on-surface-variant font-label-caps text-label-caps uppercase py-4 hover:bg-surface-container hover:text-on-background transition-all duration-300 border border-outline-variant/30 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">home</span>
            RETURN_HOME
          </button>
        </div>

        <p className="font-mono-data text-[8px] text-on-surface-variant uppercase opacity-30 tracking-widest">
          KAOS_URBAN_ATHLETICS // SYSTEM_CORE_V1.0 // VALENCIA_NODE_AF
        </p>
      </div>
    </div>
  )
}
