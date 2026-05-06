"use client"

/**
 * DeploymentChecker - Versión Template
 * Este componente antes verificaba el estado en MongoDB.
 * Ahora simplemente renderiza los hijos para evitar bloqueos innecesarios.
 */
export default function DeploymentChecker({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}