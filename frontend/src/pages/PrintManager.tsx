import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {
  GraduationCap, DollarSign, BookOpen, Plus, Trash2,
  Pencil, Mail, ClipboardList, RefreshCw, Save, Send,
  CheckCircle2, XCircle, Paperclip,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { PolarGrid, RadialBar, RadialBarChart, Label as RechartsLabel } from 'recharts'
import { printManagerApi } from '@/services/api'

/* ── types ───────────────────────────────────────────────── */

interface Plan {
  id: number
  label: string
  pages: number
  price: number
  is_free?: boolean
}

interface PurchaseLog {
  id: number
  plan: string
  price: number
  type: 'purchase' | 'email'
  locked: boolean
  purchased_at: string
}

interface Student {
  id: number
  printer_id: string | null
  name: string
  email: string
  plan_id: number
  plan_label: string
  purchase_count: number
  history: PurchaseLog[]
}

interface BudgetRow {
  id: number
  label: string
  pages: number
  price: number
  is_free: boolean
  total_purchases: number
  income: number
}

interface BudgetData {
  total_income: number
  plans: BudgetRow[]
}

/* ── tab list ────────────────────────────────────────────── */

const TABS = [
  { key: 'plans',    label: 'Plans & Budget',   icon: DollarSign },
  { key: 'students', label: 'Students + Email',  icon: GraduationCap },
] as const

type Tab = typeof TABS[number]['key']

/* ── small helpers ───────────────────────────────────────── */

function fmt(n: number, isFree?: boolean) {
  if (isFree) return 'Free'
  return 'Rs ' + (Number.isInteger(n) ? n : n.toFixed(2))
}

function StatusBadge({ count }: { count: number }) {
  return count > 0
    ? <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
    : <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">Inactive</span>
}

/* ── modal wrapper ───────────────────────────────────────── */

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-background shadow-2xl border border-border max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

/* ── main page ───────────────────────────────────────────── */

export function PrintManager() {
  const [activeTab, setActiveTab] = useState<Tab>('plans')

  // data
  const [plans, setPlans]       = useState<Plan[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [budget, setBudget]     = useState<BudgetData | null>(null)
  const [loading, setLoading]   = useState(false)

  // local price edits
  const [priceEdits, setPriceEdits] = useState<Record<number, string>>({})
  const [savingPrices, setSavingPrices] = useState(false)

  // student modal
  const [studentModal, setStudentModal] = useState<{ open: boolean; editing: Student | null }>({ open: false, editing: null })
  const [studentForm, setStudentForm] = useState({ printer_id: '', name: '', email: '', plan_id: 0 })
  const [savingStudent, setSavingStudent] = useState(false)

  // log purchase modal
  const [logModal, setLogModal] = useState<{ open: boolean; student: Student | null }>({ open: false, student: null })
  const [logForm, setLogForm] = useState({ plan_id: 0, purchased_at: '' })
  const [savingLog, setSavingLog] = useState(false)

  // history modal
  const [historyModal, setHistoryModal] = useState<{ open: boolean; student: Student | null }>({ open: false, student: null })
  const [deletingLogId, setDeletingLogId] = useState<number | null>(null)

  // delete confirmation
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; student: Student | null }>({ open: false, student: null })
  const [deleteLogModal, setDeleteLogModal] = useState<{ open: boolean; purchaseId: number | null }>({ open: false, purchaseId: null })

  // email
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [emailSubject, setEmailSubject] = useState('Printing Plan Update')
  const bodyRef = useRef<HTMLDivElement>(null)
  const [emailBodyHtml, setEmailBodyHtml] = useState('')
  const savedTemplateRef = useRef<string>('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [emailAttachments, setEmailAttachments] = useState<File[]>([])
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null)

  const defaultEmailBody = `<p>Hello [STUDENT_NAME],</p>
<p>This is a reminder about your printing plan.</p>
<p>You are currently on the [PLAN_NAME] plan.</p>
<p>Your Printer ID is [PRINTER_ID].</p>
<p>To avoid interruption, please purchase additional pages.</p>
<p>Regards,<br>University Print Center</p>`

  /* ── data fetching ────────────────────────────────────── */

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, sRes] = await Promise.all([
        printManagerApi.plans(),
        printManagerApi.students(),
      ])
      const plansData: Plan[] = pRes.data
      setPlans(plansData)
      setPriceEdits(Object.fromEntries(plansData.map(p => [p.id, String(p.price)])))
      setStudents(sRes.data)
    } catch {
      toast.error('Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBudget = useCallback(async () => {
    try {
      const res = await printManagerApi.budget()
      setBudget(res.data)
    } catch {
      toast.error('Failed to load budget.')
    }
  }, [])

  useEffect(() => {
    fetchAll()
    fetchBudget()
    printManagerApi.getEmailTemplate().then(res => {
      const saved = res.data.template || defaultEmailBody
      savedTemplateRef.current = saved
      if (bodyRef.current) {
        bodyRef.current.innerHTML = saved
        setEmailBodyHtml(saved)
      }
    })
  }, [fetchAll, fetchBudget]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'plans') fetchBudget()
    if (activeTab === 'students' && bodyRef.current && !emailBodyHtml) {
      const html = savedTemplateRef.current || defaultEmailBody
      bodyRef.current.innerHTML = html
      setEmailBodyHtml(html)
    }
  }, [activeTab, fetchBudget]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── pricing ──────────────────────────────────────────── */

  const savePrices = async () => {
    setSavingPrices(true)
    try {
      await Promise.all(
        plans.map(p => printManagerApi.updatePlan(p.id, parseFloat(priceEdits[p.id]) || 0))
      )
      await fetchAll()
      toast.success('Prices updated.')
    } catch {
      toast.error('Failed to save prices.')
    } finally {
      setSavingPrices(false)
    }
  }

  /* ── students CRUD ────────────────────────────────────── */

  const openAdd = () => {
    setStudentForm({ printer_id: '', name: '', email: '', plan_id: plans[0]?.id ?? 0 })
    setStudentModal({ open: true, editing: null })
  }

  const openEdit = (s: Student) => {
    setStudentForm({ printer_id: s.printer_id ?? '', name: s.name, email: s.email, plan_id: s.plan_id })
    setStudentModal({ open: true, editing: s })
  }

  const saveStudent = async () => {
    const isEditing = !!studentModal.editing
    if (!studentForm.name || !studentForm.email || (isEditing && !studentForm.plan_id)) {
      toast.error(isEditing ? 'Name, email and plan are required.' : 'Name and email are required.')
      return
    }
    setSavingStudent(true)
    try {
      if (studentModal.editing) {
        const res = await printManagerApi.updateStudent(studentModal.editing.id, studentForm)
        setStudents(prev => prev.map(s => s.id === studentModal.editing!.id ? res.data : s))
        toast.success('Student updated.')
      } else {
        const res = await printManagerApi.createStudent(studentForm)
        setStudents(prev => [...prev, res.data])
        toast.success('Student added.')
      }
      setStudentModal({ open: false, editing: null })
    } catch (err: any) {
      const printerIdError = err?.response?.data?.errors?.printer_id?.[0]
      toast.error(printerIdError ?? 'Failed to save student.')
    } finally {
      setSavingStudent(false)
    }
  }

  const deleteLog = (purchaseId: number) => setDeleteLogModal({ open: true, purchaseId })

  const confirmDeleteLog = async () => {
    if (!deleteLogModal.purchaseId) return
    setDeletingLogId(deleteLogModal.purchaseId)
    setDeleteLogModal({ open: false, purchaseId: null })
    try {
      const res = await printManagerApi.deletePurchase(deleteLogModal.purchaseId)
      const updated: Student = res.data
      setStudents(prev => prev.map(s => s.id === updated.id ? updated : s))
      setHistoryModal(prev => ({ ...prev, student: updated }))
      printManagerApi.budget().then(r => setBudget(r.data))
      toast.success('Log entry deleted.')
    } catch {
      toast.error('Failed to delete log entry.')
    } finally {
      setDeletingLogId(null)
    }
  }

  const deleteStudent = (s: Student) => setDeleteModal({ open: true, student: s })

  const confirmDelete = async () => {
    if (!deleteModal.student) return
    try {
      await printManagerApi.deleteStudent(deleteModal.student.id)
      setStudents(prev => prev.filter(x => x.id !== deleteModal.student!.id))
      if (selectedStudent?.id === deleteModal.student.id) setSelectedStudent(null)
      toast.success('Student deleted.')
    } catch {
      toast.error('Failed to delete student.')
    } finally {
      setDeleteModal({ open: false, student: null })
    }
  }

  /* ── log purchase ─────────────────────────────────────── */

  const openLog = (s: Student) => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const dt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
    setLogForm({ plan_id: s.plan_id, purchased_at: dt })
    setLogModal({ open: true, student: s })
  }

  const submitLog = async () => {
    if (!logModal.student || !logForm.plan_id || !logForm.purchased_at) return
    setSavingLog(true)
    try {
      const res = await printManagerApi.logPurchase(logModal.student.id, {
        plan_id: logForm.plan_id,
        purchased_at: logForm.purchased_at,
      })
      setStudents(prev => prev.map(s => s.id === logModal.student!.id ? res.data : s))
      if (historyModal.student?.id === logModal.student.id) {
        setHistoryModal({ open: true, student: res.data })
      }
      toast.success('Purchase logged.')
      setLogModal({ open: false, student: null })
    } catch {
      toast.error('Failed to log purchase.')
    } finally {
      setSavingLog(false)
    }
  }

  /* ── email ────────────────────────────────────────────── */

  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
       .replace(/"/g, '&quot;').replace(/'/g, '&#039;')

  const getPreview = (student: Student | null) => {
    if (!student) return ''
    const html = emailBodyHtml || bodyRef.current?.innerHTML || ''
    return html
      .replace(/\[STUDENT_NAME\]/g, escapeHtml(student.name))
      .replace(/\[PRINTER_ID\]/g, escapeHtml(student.printer_id ?? 'Not assigned'))
      .replace(/\[PLAN_NAME\]/g, escapeHtml(student.plan_label))
  }

  const saveTemplate = async () => {
    const html = bodyRef.current?.innerHTML || emailBodyHtml
    if (!html.trim()) { toast.error('Template cannot be empty.'); return }
    setSavingTemplate(true)
    try {
      await printManagerApi.saveEmailTemplate(html)
      toast.success('Template saved.')
    } catch {
      toast.error('Failed to save template.')
    } finally {
      setSavingTemplate(false)
    }
  }

  const sendEmail = async () => {
    if (!selectedStudent) { toast.error('Select a student first (click Compose).'); return }
    const body = bodyRef.current?.innerHTML ?? ''
    if (!emailSubject || !body) { toast.error('Subject and body cannot be empty.'); return }
    setSendingEmail(true)
    setEmailResult(null)
    try {
      const fd = new FormData()
      fd.append('subject', emailSubject)
      fd.append('body', body)
      emailAttachments.forEach(f => fd.append('attachments[]', f))
      const res = await printManagerApi.sendEmail(selectedStudent.id, fd)
      setEmailResult({ success: true, message: res.data.message })
      // refresh student to pick up logged email
      const sRes = await printManagerApi.students()
      setStudents(sRes.data)
      setEmailAttachments([])
      toast.success('Email sent.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to send email.'
      setEmailResult({ success: false, message: msg })
    } finally {
      setSendingEmail(false)
    }
  }

  /* ── plan color helpers ───────────────────────────────── */

  const planColors: Record<string, string> = {
    Essential: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700',
    Plus:      'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700',
    Ultimate:  'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700',
  }
  const planBadgeColors: Record<string, string> = {
    Essential: 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200',
    Plus:      'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200',
    Ultimate:  'bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200',
  }

  /* ── render ───────────────────────────────────────────── */

  return (
    <div className="space-y-6 -mt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground dark:text-secondary-foreground flex items-center gap-2">
            <GraduationCap size={22} className="text-primary" />
            Print Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage student printing plans, roster, and budget.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw size={13} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map(t => {
          const Icon = t.icon
          const active = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── TAB: PLANS & BUDGET ─────────────────────────── */}
      {activeTab === 'plans' && (
        <div className="space-y-8">

          {/* All cards row */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Update the price for each plan.</p>
            <div className="flex gap-4 flex-wrap items-start">

              {/* Plan cards */}
              {plans.map(plan => {
                const budgetRow = budget?.plans.find(b => b.id === plan.id)
                return (
                  <div
                    key={plan.id}
                    className={`w-44 aspect-square rounded-2xl border p-4 flex flex-col justify-between shrink-0 ${planColors[plan.label] ?? 'bg-muted/30 border-border'}`}
                  >
                    <div className="text-center">
                      <p className="font-bold text-sm leading-tight">{plan.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{plan.pages} pages</p>
                    </div>
                    <div className="text-center">
                      {plan.price === 0 ? (
                        <span className="text-base font-bold text-green-600 dark:text-green-400">Free</span>
                      ) : (
                        <>
                          <p className="text-base font-bold">{fmt(budgetRow?.income ?? 0)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {budgetRow?.total_purchases ?? 0} purchase{(budgetRow?.total_purchases ?? 0) !== 1 ? 's' : ''}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="space-y-1 text-center">
                      <Label className="text-[10px] font-medium">Price (Rs)</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={priceEdits[plan.id] ?? ''}
                        onChange={e => setPriceEdits(prev => ({ ...prev, [plan.id]: e.target.value }))}
                        placeholder={plan.price === 0 ? 'Free' : ''}
                        className="h-7 text-xs bg-white/70 dark:bg-background/50"
                      />
                    </div>
                  </div>
                )
              })}

              {/* Radial chart card */}
              {budget && (() => {
                const planChartColors: Record<string, string> = {
                  Essential: '#3b82f6', // blue   — matches Essential card
                  Plus:      '#22c55e', // green  — matches Plus card
                  Ultimate:  '#a855f7', // purple — matches Ultimate card
                }
                const chartData = budget.plans.map(p => ({
                  name:      p.label,
                  purchases: p.total_purchases,
                  fill:      planChartColors[p.label] ?? 'var(--chart-4)',
                }))
                const chartConfig: ChartConfig = Object.fromEntries(
                  budget.plans.map(p => [
                    p.label.toLowerCase(),
                    { label: p.label, color: planChartColors[p.label] ?? 'var(--chart-4)' },
                  ])
                )
                const totalStudents = budget.plans.reduce((s, p) => s + p.total_purchases, 0)
                const topPlan = [...budget.plans].sort((a, b) => b.total_purchases - a.total_purchases)[0]
                return (
                  <Card className="shrink-0 flex flex-col" style={{ width: '22rem', height: '22rem' }}>
                    <CardHeader className="items-center pt-4 pb-2 px-4">
                      <CardTitle className="text-sm">Purchases by Plan</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 min-h-0 flex flex-col">
                      <ChartContainer config={chartConfig} className="mx-auto flex-1 w-full !aspect-auto">
                        <RadialBarChart data={chartData} innerRadius={55} outerRadius={100}>
                          <ChartTooltip
                            cursor={false}
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null
                              const d = payload[0].payload
                              return (
                                <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                                  <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.fill }} />
                                    <span className="font-medium text-popover-foreground">{d.name}</span>
                                    <span className="text-muted-foreground">— {d.purchases} purchase{d.purchases !== 1 ? 's' : ''}</span>
                                  </div>
                                </div>
                              )
                            }}
                          />
                          <PolarGrid gridType="circle" />
                          <RadialBar dataKey="purchases">
                            <RechartsLabel
                              content={({ viewBox }) => {
                                if (!viewBox || !('cx' in viewBox)) return null
                                return (
                                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                    <tspan x={viewBox.cx} dy="-0.4em" className="fill-foreground text-sm font-bold">
                                      Rs {budget.total_income.toLocaleString()}
                                    </tspan>
                                    <tspan x={viewBox.cx} dy="1.4em" className="fill-muted-foreground text-[10px]">
                                      Total Income
                                    </tspan>
                                  </text>
                                )
                              }}
                            />
                          </RadialBar>
                        </RadialBarChart>
                      </ChartContainer>
                      <p className="pb-3 text-[11px] text-muted-foreground text-center">
                        {totalStudents} student{totalStudents !== 1 ? 's' : ''} enrolled
                        {topPlan && topPlan.total_purchases > 0 && ` · ${topPlan.label} most popular`}
                      </p>
                    </CardContent>
                  </Card>
                )
              })()}

            </div>
            <Button onClick={savePrices} disabled={savingPrices}>
              <Save size={14} className="mr-1.5" />
              {savingPrices ? 'Saving…' : 'Save Prices'}
            </Button>
          </div>
        </div>
      )}

      {/* ── TAB: STUDENTS + EMAIL ────────────────────────── */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{students.length} students</Badge>
            </div>
            <Button size="sm" onClick={openAdd}>
              <Plus size={13} className="mr-1.5" /> Add Student
            </Button>
          </div>

          <div className="flex gap-5 flex-col xl:flex-row items-start">
            {/* Table */}
            <div className="flex-[2] min-w-0 w-full rounded-lg border border-border overflow-x-auto shadow-sm">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {['Printer ID','Student','Email','Purchases','Plan','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {students.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">No students yet. Click Add Student.</td></tr>
                  )}
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.printer_id || '—'}</td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                      <td className="px-4 py-3 text-center">{s.purchase_count}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${planBadgeColors[s.plan_label] ?? 'bg-muted text-muted-foreground'}`}>
                          {s.plan_label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded p-1.5 hover:bg-muted transition-colors">
                              <Pencil size={14} className="text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setHistoryModal({ open: true, student: s })}>
                              <ClipboardList size={13} className="mr-2" /> Activity Log
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(s)}>
                              <Pencil size={13} className="mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedStudent(s); setEmailResult(null) }}>
                              <Mail size={13} className="mr-2" /> Compose Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => deleteStudent(s)} className="text-destructive focus:text-destructive">
                              <Trash2 size={13} className="mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Email composer */}
            <div className="flex-1 min-w-[280px] w-full rounded-xl border border-border bg-muted/20 p-5 space-y-4">
              <h3 className="font-semibold text-sm">Email Template</h3>

              <div className="space-y-1">
                <Label className="text-xs">Subject</Label>
                <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Email subject" className="h-8 text-sm" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Template</Label>
                <div
                  ref={bodyRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={e => setEmailBodyHtml((e.currentTarget as HTMLDivElement).innerHTML)}
                  className="min-h-[260px] rounded-lg border-2 border-dashed border-border bg-background p-3 text-sm leading-relaxed focus:border-primary focus:outline-none hover:border-primary/60 transition-colors overflow-y-auto"
                />
                <p className="text-[10px] text-muted-foreground">Use <strong>[STUDENT_NAME]</strong>, <strong>[PRINTER_ID]</strong>, <strong>[PLAN_NAME]</strong></p>
              </div>

              {/* Attachments */}
              <div className="space-y-1">
                <Label className="text-xs">Attachments</Label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground hover:border-primary/60 transition-colors">
                  <Paperclip size={13} />
                  <span>Click to add files (images, PDF, Word…)</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    className="hidden"
                    onChange={e => {
                      const files = Array.from(e.target.files ?? [])
                      setEmailAttachments(prev => [...prev, ...files])
                      e.target.value = ''
                    }}
                  />
                </label>
                {emailAttachments.length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {emailAttachments.map((f, i) => (
                      <li key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-xs">
                        <span className="truncate max-w-[220px]">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setEmailAttachments(prev => prev.filter((_, j) => j !== i))}
                          className="ml-2 text-muted-foreground hover:text-destructive"
                        >
                          <XCircle size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Live preview */}
              <div className="space-y-1">
                <Label className="text-xs">Live Preview</Label>
                <div
                  className="min-h-[80px] rounded-lg border border-border bg-background/60 p-3 text-sm leading-relaxed text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: selectedStudent ? getPreview(selectedStudent) : '<em>Select a student (click Compose) to see preview.</em>' }}
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={saveTemplate} disabled={savingTemplate}>
                  {savingTemplate ? <RefreshCw size={13} className="mr-1.5 animate-spin" /> : <Save size={13} className="mr-1.5" />}
                  {savingTemplate ? 'Saving…' : 'Save Template'}
                </Button>
                <Button size="sm" variant="outline" onClick={sendEmail} disabled={sendingEmail || !selectedStudent}>
                  {sendingEmail ? <RefreshCw size={13} className="mr-1.5 animate-spin" /> : <Send size={13} className="mr-1.5" />}
                  {sendingEmail ? 'Sending…' : 'Send via SMTP'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Recipient:</span>{' '}
                {selectedStudent ? `${selectedStudent.name} (${selectedStudent.email})` : '(select a student by clicking Compose)'}
              </p>

              {emailResult && (
                <div className={`flex items-start gap-2 rounded-md p-2.5 text-xs ${emailResult.success ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                  {emailResult.success ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" /> : <XCircle size={13} className="shrink-0 mt-0.5" />}
                  {emailResult.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DIALOG: Add / Edit Student ─────────────────── */}
      <Dialog open={studentModal.open} onOpenChange={open => !open && setStudentModal({ open: false, editing: null })}>
        <DialogContent className="w-[300px]">
          <DialogHeader>
            <DialogTitle>{studentModal.editing ? 'Edit Student' : 'Add Student'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Printer ID</Label>
              <Input placeholder="e.g. PR-001" value={studentForm.printer_id} onChange={e => setStudentForm(f => ({ ...f, printer_id: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Full Name *</Label>
              <Input value={studentForm.name} onChange={e => setStudentForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input type="email" value={studentForm.email} onChange={e => setStudentForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            {studentModal.editing && (
              <div className="space-y-1">
                <Label className="text-xs">Pricing Plan *</Label>
                <Select value={String(studentForm.plan_id)} onValueChange={v => setStudentForm(f => ({ ...f, plan_id: Number(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {plans.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.label} ({p.pages} pages — {p.price === 0 ? 'Free' : fmt(p.price)})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentModal({ open: false, editing: null })}>Cancel</Button>
            <Button onClick={saveStudent} disabled={savingStudent}>{savingStudent ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: History / Activity Log ────────────── */}
      <Dialog open={historyModal.open} onOpenChange={open => !open && setHistoryModal({ open: false, student: null })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Activity Log</DialogTitle>
            {historyModal.student && (
              <p className="text-sm text-muted-foreground">{historyModal.student.name} · {historyModal.student.printer_id || 'No Printer ID'}</p>
            )}
          </DialogHeader>
          {historyModal.student && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      {['Date & Time', 'Plan / Type', 'Amount', ''].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historyModal.student.history.length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No entries yet.</td></tr>
                    )}
                    {historyModal.student.history.map(h => (
                      <tr key={h.id}>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{h.purchased_at}</td>
                        <td className="px-3 py-2">
                          {h.type === 'email'
                            ? <span className="inline-flex items-center gap-1 text-xs text-blue-600"><Mail size={10} /> Email sent</span>
                            : h.plan}
                        </td>
                        <td className="px-3 py-2 font-medium">{h.price > 0 ? fmt(h.price) : '—'}</td>
                        <td className="px-3 py-2">
                          {!h.locked && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              disabled={deletingLogId === h.id}
                              onClick={() => deleteLog(h.id)}
                            >
                              <Trash2 size={12} />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-border pt-3 font-bold text-sm">
                Total spent: {fmt(historyModal.student.history.filter(h => h.type === 'purchase').reduce((sum, h) => sum + h.price, 0))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryModal({ open: false, student: null })}>Close</Button>
            <Button onClick={() => openLog(historyModal.student!)}>
              <ClipboardList size={13} className="mr-1.5" /> Log New Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Log Purchase ───────────────────────── */}
      <Dialog open={logModal.open} onOpenChange={open => !open && setLogModal({ open: false, student: null })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Purchase</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Plan</Label>
              <Select value={String(logForm.plan_id)} onValueChange={v => setLogForm(f => ({ ...f, plan_id: Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="Select plan…" /></SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.price > 0).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.label} ({p.pages} pages — {fmt(p.price)})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date & Time</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                      <CalendarIcon size={14} className="mr-2 text-muted-foreground" />
                      {logForm.purchased_at
                        ? format(new Date(logForm.purchased_at), 'dd MMM yyyy')
                        : <span className="text-muted-foreground">Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      disabled={{ after: new Date() }}
                      selected={logForm.purchased_at ? new Date(logForm.purchased_at) : undefined}
                      onSelect={day => {
                        if (!day) return
                        const existing = logForm.purchased_at ? new Date(logForm.purchased_at) : new Date()
                        day.setHours(existing.getHours(), existing.getMinutes())
                        setLogForm(f => ({ ...f, purchased_at: format(day, "yyyy-MM-dd'T'HH:mm") }))
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  className="w-28"
                  value={logForm.purchased_at ? logForm.purchased_at.slice(11, 16) : ''}
                  onChange={e => {
                    const base = logForm.purchased_at ? logForm.purchased_at.slice(0, 10) : format(new Date(), 'yyyy-MM-dd')
                    setLogForm(f => ({ ...f, purchased_at: `${base}T${e.target.value}` }))
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogModal({ open: false, student: null })}>Cancel</Button>
            <Button onClick={submitLog} disabled={savingLog}>{savingLog ? 'Saving…' : 'Log Purchase'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Delete Confirmation ───────────────── */}
      <AlertDialog open={deleteLogModal.open} onOpenChange={open => !open && setDeleteLogModal({ open: false, purchaseId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete log entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this entry from the activity log and update the budget totals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDeleteLog}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteModal.open} onOpenChange={open => !open && setDeleteModal({ open: false, student: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteModal.student?.name}</strong> and all their purchase history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
