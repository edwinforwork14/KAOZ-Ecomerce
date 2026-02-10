"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Globe, CheckCircle, XCircle, Calendar, Code, Shield, AlertTriangle } from "lucide-react"
import bcrypt from "bcryptjs"


interface Deployment {
  _id: string
  version: string
  isActive: boolean
  deployedAt: string
  environment: string
  description?: string
  name: string
  url: string
  branch: string
  commitMessage?: string
  deployedBy: string
}

export default function PublicDeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [accessGranted, setAccessGranted] = useState(false)
  const [password, setPassword] = useState("")
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(true)

  // Contraseña simple para acceso (cambiar por algo más seguro en producción)

  const ACCESS_PASSWORD_HASH = "$2a$12$0v3PHsJ1bXUj6qCmI3.KiOmWcRJH8x2Dps9poirgjUd/Lyah34F6K"

const handlePasswordSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  const ok = await bcrypt.compare(password, ACCESS_PASSWORD_HASH)
    if (ok) {
      setAccessGranted(true)
      setShowPasswordPrompt(false)
      fetchDeployments()
    } else {
      toast({ title: "Acceso denegado", description: "Contraseña incorrecta", variant: "destructive" })
    }
  }

  const fetchDeployments = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010/api"
      const response = await fetch(`${API_URL}/deployments`)
      const data = await response.json()

      if (data.success) {
        setDeployments(data.data)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar las implementaciones",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching deployments:", error)
      toast({
        title: "Error",
        description: "Error al cargar implementaciones",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleDeployment = async (id: string, currentStatus: boolean) => {
    setToggling(id)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5010/api"
      const response = await fetch(`${API_URL}/deployments/${id}/toggle`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      const data = await response.json()

      if (data.success) {
        setDeployments(prev =>
          prev.map(dep =>
            dep._id === id ? { ...dep, isActive: !dep.isActive } : dep
          )
        )
        toast({
          title: "Éxito",
          description: `Implementación ${!currentStatus ? "activada" : "desactivada"}`,
        })
      } else {
        toast({
          title: "Error",
          description: data.message || "Error al cambiar estado",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error toggling deployment:", error)
      toast({
        title: "Error",
        description: "Error al cambiar estado de implementación",
        variant: "destructive",
      })
    } finally {
      setToggling(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (showPasswordPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>
              Ingresa la contraseña para acceder al panel de control de implementaciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full">
                Acceder
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <Globe className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Panel de Control</h1>
          <p className="text-xl text-gray-600">YF E-commerce - Implementaciones</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-yellow-800">Control de Implementaciones</h3>
              <p className="text-yellow-700 text-sm">
                Aquí puedes activar o desactivar versiones desplegadas. Solo activa implementaciones después de confirmar pagos.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {deployments.map((deployment) => (
            <Card key={deployment._id} className="shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Code className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">
                      {deployment.name}
                    </CardTitle>
                    <Badge variant={deployment.isActive ? "default" : "secondary"} className="text-sm">
                      {deployment.isActive ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {deployment.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium">Versión:</span> <code className="bg-gray-100 px-1 rounded text-xs">{deployment.version.substring(0, 8)}</code>
                      </div>
                      <div>
                        <span className="font-medium">Rama:</span> {deployment.branch}
                      </div>
                      <div>
                        <span className="font-medium">Entorno:</span> <Badge variant="outline" className="text-xs py-0">{deployment.environment}</Badge>
                      </div>
                      <div>
                        <span className="font-medium">Desplegado por:</span> {deployment.deployedBy}
                      </div>
                    </div>
                  </CardDescription>
                </div>
                <div className="ml-4">
                  <Switch
                    checked={deployment.isActive}
                    onCheckedChange={() => toggleDeployment(deployment._id, deployment.isActive)}
                    disabled={toggling === deployment._id}
                    className="scale-125"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Desplegada: {formatDate(deployment.deployedAt)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    <a href={deployment.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                      {deployment.url}
                    </a>
                  </div>
                </div>

                {deployment.commitMessage && (
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Commit:</span>
                    <p className="text-xs bg-gray-50 p-2 rounded mt-1 italic">
                      {deployment.commitMessage}
                    </p>
                  </div>
                )}

                {deployment.description && (
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Descripción:</span>
                    <p className="text-xs bg-gray-50 p-2 rounded mt-1">
                      {deployment.description}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
            </Card>
          ))}

          {deployments.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay implementaciones</h3>
                <p className="text-muted-foreground text-center">
                  Las implementaciones se registrarán automáticamente cuando el servidor se inicie.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="text-center">
          <Button onClick={fetchDeployments} variant="outline">
            <Globe className="h-4 w-4 mr-2" />
            Actualizar Lista
          </Button>
        </div>
      </div>
    </div>
  )
}