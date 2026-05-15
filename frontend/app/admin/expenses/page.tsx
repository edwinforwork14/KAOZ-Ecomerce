"use client"

import { useEffect, useState } from "react"
import { 
  Plus, 
  Trash2, 
  Banknote, 
  Calendar, 
  Tag, 
  FileText, 
  TrendingDown, 
  Loader2,
  AlertCircle,
  X,
  Search
} from "lucide-react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const DEFAULT_EXPENSE_CATEGORIES = [
  "Marketing",
  "Sueldos",
  "Logística",
  "Suministros",
  "Alquiler",
  "Impuestos",
  "Otros"
]

export default function ExpensesPage() {
  const { toast } = useToast()
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [settings, setSettings] = useState<any>(null)
  const currencySymbol = settings?.currency?.symbol || "$"
  
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "Otros",
    date: new Date().toISOString().split('T')[0],
    description: ""
  })

  const categories = settings?.expenseCategories || DEFAULT_EXPENSE_CATEGORIES

  useEffect(() => {
    loadExpenses()
  }, [])

  const loadExpenses = async () => {
    try {
      setLoading(true)
      const [expensesRes, settingsRes] = await Promise.all([
        api.getAllExpenses(),
        api.getSettings()
      ])
      
      if (expensesRes.success) {
        setExpenses(expensesRes.expenses || [])
      }
      if (settingsRes.success) {
        setSettings(settingsRes.settings)
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los gastos.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.amount) {
      toast({ title: "Error", description: "Completa los campos obligatorios.", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const result = await api.createExpense(formData)
      if (result.success) {
        toast({ title: "Gasto Registrado", description: "La transacción financiera ha sido guardada." })
        setIsDialogOpen(false)
        setFormData({
          title: "",
          amount: "",
          category: "Otros",
          date: new Date().toISOString().split('T')[0],
          description: ""
        })
        loadExpenses()
      }
    } catch (error) {
      toast({ title: "Error", description: "Error al guardar el gasto.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este registro financiero?")) return
    try {
      const result = await api.deleteExpense(id)
      if (result.success) {
        toast({ title: "Registro Eliminado", description: "El gasto ha sido removido del balance." })
        loadExpenses()
      }
    } catch (error) {
      toast({ title: "Error", description: "Error al eliminar.", variant: "destructive" })
    }
  }

  const filteredExpenses = expenses.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-1 bg-black overflow-hidden">
            <div className="w-full h-full bg-kaosNeon animate-progress-fast"></div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse text-black">Auditando Registros Financieros...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8 bg-transparent min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-kaosNeon animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Contabilidad Operativa • KAOZ</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">Gestión de Gastos</h1>
          <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-2">Control de egresos y costos operativos</p>
        </div>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="rounded-none bg-black text-white hover:bg-kaosNeon hover:text-black h-14 px-10 font-black uppercase text-xs tracking-widest transition-all"
        >
          <Plus className="h-4 w-4 mr-2" /> Registrar Egresos
        </Button>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-black text-white p-8 border border-black group transition-all">
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Total Egresos (Filtrado)</p>
                  <h2 className="text-5xl font-black tracking-tighter">{currencySymbol}{totalAmount.toLocaleString()}</h2>
               </div>
               <div className="p-4 bg-white/10">
                  <TrendingDown className="h-6 w-6 text-kaosNeon" />
               </div>
            </div>
         </div>
         <div className="md:col-span-2 bg-white border border-black/10 p-8 flex items-center">
            <div className="relative flex-1 group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-black/20 group-focus-within:text-black transition-colors" />
               <Input 
                 placeholder="FILTRAR POR TÍTULO O CATEGORÍA..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-12 h-14 w-full rounded-none border-black/10 focus:border-black transition-all font-black uppercase text-[10px] tracking-widest"
               />
            </div>
         </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-black overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-black bg-black text-white">
              <th className="p-4 text-[10px] font-black uppercase tracking-widest">Fecha</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest">Concepto</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest">Categoría</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Monto</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length > 0 ? (
              filteredExpenses.map((expense) => (
                <tr key={expense.id} className="border-b border-black/5 hover:bg-black/[0.02] transition-colors group">
                  <td className="p-4">
                    <p className="text-[10px] font-black uppercase">{new Date(expense.date).toLocaleDateString()}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-black uppercase tracking-tight">{expense.title}</p>
                    <p className="text-[9px] font-bold text-black/40 uppercase truncate max-w-xs">{expense.description}</p>
                  </td>
                  <td className="p-4">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border border-black/10 bg-slate-50">
                      {expense.category}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <p className="text-lg font-black">{currencySymbol}{expense.amount.toLocaleString()}</p>
                  </td>
                  <td className="p-4 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(expense.id)}
                      className="rounded-none hover:bg-red-500 hover:text-white transition-all h-10 w-10 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-20 text-center border-b border-black/5">
                  <Banknote className="h-12 w-12 text-black/10 mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40">No hay registros financieros detectados</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Register Expense Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl rounded-none border-black p-0 overflow-hidden bg-white dark:bg-slate-950 text-black dark:text-white">
          <DialogHeader className="bg-black text-white p-8">
            <div className="flex items-center gap-3 mb-2">
              <Banknote className="h-5 w-5 text-kaosNeon" />
              <span className="text-[10px] font-black uppercase tracking-widest text-kaosNeon">Protocolo Contable</span>
            </div>
            <DialogTitle className="text-4xl font-black uppercase tracking-tighter leading-none">
              Registrar Gasto
            </DialogTitle>
            <DialogDescription className="text-white/40 font-bold text-[10px] uppercase tracking-widest mt-2">
              Ingresa los detalles del egreso para el balance general
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Título del Concepto</Label>
              <Input 
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="EJ: PAGO PUBLICIDAD FACEBOOK..."
                className="h-14 rounded-none border-black/10 focus:border-black dark:border-white/10 dark:focus:border-kaosNeon font-black uppercase text-xs bg-transparent text-black dark:text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Monto del Egreso</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="h-14 rounded-none border-black dark:border-kaosNeon font-black text-2xl bg-transparent text-black dark:text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Categoría</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger className="h-14 rounded-none border-black/10 focus:border-black dark:border-white/10 font-black uppercase text-[10px] tracking-widest bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-black">
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat} className="text-[10px] font-black uppercase">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Fecha de Transacción</Label>
              <Input 
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="h-14 rounded-none border-black/10 focus:border-black dark:border-white/10 font-black uppercase text-xs bg-transparent"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">Observaciones (Opcional)</Label>
              <Textarea 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="DETALLES ADICIONALES DEL GASTO..."
                className="rounded-none border-black/10 focus:border-black dark:border-white/10 text-xs font-medium bg-transparent min-h-[100px]"
              />
            </div>

            <DialogFooter className="pt-4 gap-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 h-14 rounded-none font-black uppercase text-[10px] tracking-widest border border-black/5 hover:bg-black/5"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={saving}
                className="flex-1 h-14 rounded-none bg-black text-white hover:bg-kaosNeon hover:text-black font-black uppercase text-[10px] tracking-widest transition-all"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TrendingDown className="h-4 w-4 mr-2" />}
                Registrar Egreso
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
