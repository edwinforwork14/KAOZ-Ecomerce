"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function DeploymentChecker({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const pathname = usePathname()

  // Rutas que no requieren verificación de deployment
  const excludedRoutes = [
    '/admin',
    '/pmaa'
  ]

  const shouldCheckDeployment = !excludedRoutes.some(route =>
    pathname.startsWith(route)
  )

  const checkDeployment = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010/api"
      const response = await fetch(`${API_URL}/deployments/active`)
      const data = await response.json()

      if (data.success && data.data) {
        setIsActive(true)
      } else {
        setIsActive(false)
      }
    } catch (error) {
      console.error("Error checking deployment:", error)
      setIsActive(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (shouldCheckDeployment) {
      checkDeployment()
    } else {
      setIsActive(true) // Permitir acceso a rutas excluidas
      setLoading(false)
    }
  }, [retryCount, shouldCheckDeployment])

  const handleRetry = () => {
    setLoading(true)
    setRetryCount(prev => prev + 1)
  }

  if (loading && shouldCheckDeployment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (isActive === false && shouldCheckDeployment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">Servicio no disponible</AlertTitle>
            <AlertDescription className="text-orange-700">
              La tienda está temporalmente fuera de servicio. Por favor, inténtalo más tarde.
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button onClick={handleRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}