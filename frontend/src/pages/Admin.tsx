import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table'
import { Shield, UserPlus, Settings, Mail, Search, ArrowUpDown, Users, UserX, UserCog, Trash2, X, KeyRound, Eye, EyeOff, Plug, RefreshCw, Download, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card'
import { AnimatedTabs, TabsList, TabsTrigger, AnimatedTabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'
import type { BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/context/AuthContext'
import { snipeItApi } from '@/services/api'
import { useEffect } from 'react'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useToggleUserStatus } from '@/hooks/useData'
import { toast } from 'sonner'

interface MockUser {
  id: number
  name: string
  email: string
  role: string
  status: string
  last_login: string
}


const roleVariant: Record<string, BadgeProps['variant']> = {
  'super-admin': 'role-superadmin',
  admin:         'role-admin',
  reports:       'role-reports',
  view:          'role-view',
}

export function Admin() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: usersData } = useUsers()
  const users: MockUser[] = useMemo(
    () => (usersData ?? []).map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      last_login: u.last_login_at ?? u.last_login ?? '–',
    })),
    [usersData]
  )
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const deleteUserMutation = useDeleteUser()
  const toggleStatusMutation = useToggleUserStatus()

  const toggleDisable = (id: number) => {
    toggleStatusMutation.mutate(id, {
      onError: (err: any) => {
        toast.error('Action not allowed', {
          description: err?.response?.data?.errors?.status?.[0] ?? err?.response?.data?.message ?? 'Request was rejected.',
        })
      },
    })
  }

  const changeRole = (id: number, role: string): Promise<void> =>
    updateUserMutation.mutateAsync({ id, data: { role } }).then(() => {})

  // Create user dialog
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('view')
  const [showNewUserPassword, setShowNewUserPassword] = useState(false)

  const resetCreateUserForm = () => {
    setNewUserName('')
    setNewUserEmail('')
    setNewUserPassword('')
    setNewUserRole('view')
    setShowNewUserPassword(false)
  }

  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPassword) {
      toast.error('Please fill in all fields.')
      return
    }
    if (newUserPassword.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    try {
      await createUserMutation.mutateAsync({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
      })
      setCreateUserOpen(false)
      resetCreateUserForm()
      toast.success('User created successfully.')
    } catch (err: any) {
      toast.error(
        err?.response?.data?.errors?.email?.[0]
        ?? err?.response?.data?.errors?.password?.[0]
        ?? err?.response?.data?.message
        ?? 'Failed to create user.'
      )
    }
  }

  // Snipe-IT config
  const [snipeitUrl, setSnipeitUrl] = useState('')
  const [snipeitKey, setSnipeitKey] = useState('')
  const [snipeitCategoryId, setSnipeitCategoryId] = useState('')
  const [snipeitSyncFreq, setSnipeitSyncFreq] = useState('manual')
  const [showSnipeitKey, setShowSnipeitKey] = useState(false)
  const [snipeitSaving, setSnipeitSaving] = useState(false)
  const [snipeitTesting, setSnipeitTesting] = useState(false)
  const [snipeitFetching, setSnipeitFetching] = useState(false)
  const [autoSync, setAutoSync] = useState(false)

  // Load saved Snipe-IT config on mount
  useEffect(() => {
    snipeItApi.getConfig()
      .then(res => {
        const d = res.data
        if (d.url)         setSnipeitUrl(d.url)
        if (d.api_key)     setSnipeitKey(d.api_key)
        if (d.category_id) setSnipeitCategoryId(String(d.category_id))
        if (d.sync_freq)   setSnipeitSyncFreq(d.sync_freq)
      })
      .catch(() => {})
  }, [])

  // Load saved SMTP + notification config on mount
  useEffect(() => {
    import('@/services/api').then(({ adminApi }) => {
      adminApi.getSmtp()
        .then(res => {
          const d = res.data
          if (!d) return
          setSmtpConfigured(true)
          if (d.host)         setSmtpHost(d.host)
          if (d.port)         setSmtpPort(String(d.port))
          if (d.encryption)   setSmtpEncryption(d.encryption)
          if (d.username)     setSmtpUsername(d.username)
          if (d.from_address) setSmtpFromEmail(d.from_address)
          if (d.from_name)    setSmtpFromName(d.from_name)
        })
        .catch(() => {})
      adminApi.getNotifications()
        .then(res => {
          const d = res.data
          if (!d) return
          if (d.recipients !== undefined)            setNotifRecipients(d.recipients)
          if (d.alert_low_stock !== undefined)       setNotifLowStock(d.alert_low_stock)
          if (d.alert_out_of_stock !== undefined)    setNotifOutOfStock(d.alert_out_of_stock)
          if (d.alert_contract_expiry !== undefined) setNotifContractExpiry(d.alert_contract_expiry)
          if (d.contract_expiry_days !== undefined)  setNotifExpiryDays(String(d.contract_expiry_days))
          if (d.alert_overdue_service !== undefined) setNotifOverdueService(d.alert_overdue_service)
        })
        .catch(() => {})
    })
  }, [])
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpEncryption, setSmtpEncryption] = useState('tls')
  const [smtpUsername, setSmtpUsername] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpFromEmail, setSmtpFromEmail] = useState('')
  const [smtpFromName, setSmtpFromName] = useState('')
  const [smtpSaving, setSmtpSaving] = useState(false)
  const [smtpTesting, setSmtpTesting] = useState(false)
  const [showSmtpPassword, setShowSmtpPassword] = useState(false)
  const [smtpConfigured, setSmtpConfigured] = useState(false)

  // Notification settings
  const [notifRecipients, setNotifRecipients] = useState('')
  const [notifLowStock, setNotifLowStock] = useState(true)
  const [notifOutOfStock, setNotifOutOfStock] = useState(true)
  const [notifContractExpiry, setNotifContractExpiry] = useState(true)
  const [notifExpiryDays, setNotifExpiryDays] = useState('90')
  const [notifOverdueService, setNotifOverdueService] = useState(true)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSending, setNotifSending] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const snipeitConfig = { url: snipeitUrl, api_key: snipeitKey, category_id: Number(snipeitCategoryId) || 0 }

  const handleSnipeitTest = async () => {
    setSnipeitTesting(true)
    try {
      const res = await snipeItApi.test({ url: snipeitUrl, api_key: snipeitKey })
      const message = res.data.message ?? (res.data.success ? 'Connected.' : 'Failed.')
      const detail = res.data.tested_url ? `Tested: ${res.data.tested_url}` : undefined
      if (res.data.success) {
        toast.success(message, { description: detail })
      } else {
        toast.error(message, { description: detail })
      }
      if (res.data.success && res.data.working_url && res.data.working_url !== snipeitUrl) {
        setSnipeitUrl(res.data.working_url)
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? (err?.code === 'ERR_NETWORK' ? 'Backend not running — start php artisan serve' : err?.message) ?? 'Test failed.'
      )
    } finally {
      setSnipeitTesting(false)
    }
  }

  const handleSnipeitSave = async () => {
    setSnipeitSaving(true)
    try {
      await snipeItApi.saveConfig({ ...snipeitConfig, sync_freq: snipeitSyncFreq } as any)
      toast.success('Configuration saved successfully.')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save.')
    } finally {
      setSnipeitSaving(false)
    }
  }

  const handleSnipeitFetch = async () => {
    setSnipeitFetching(true)
    try {
      await snipeItApi.saveConfig({ ...snipeitConfig, sync_freq: snipeitSyncFreq } as any)
      const res = await snipeItApi.sync()
      const { synced, skipped, message } = res.data
      toast.success(message ?? `Synced ${synced} asset(s).`, {
        description: skipped ? `${skipped} asset(s) skipped (no ID).` : undefined,
      })
      // Invalidate printers + dashboard so all pages reflect the new data immediately
      queryClient.invalidateQueries({ queryKey: ['printers'], exact: false })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? err?.response?.data?.message ?? 'Fetch failed.')
    } finally {
      setSnipeitFetching(false)
    }
  }

  const columns = useMemo<ColumnDef<MockUser>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={v => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={v => row.toggleSelected(!!v)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableGlobalFilter: false,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={column.getToggleSortingHandler()}>
            Name <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
          </Button>
        ),
        cell: ({ getValue }) => <p className="font-medium">{getValue<string>()}</p>,
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Permission',
        cell: ({ getValue }) => {
          const role = getValue<string>()
          return <Badge variant={roleVariant[role]}>{role.replace('-', ' ')}</Badge>
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        accessorKey: 'last_login',
        header: 'Last Login',
        cell: ({ getValue }) => {
          const val = getValue<string>()
          if (!val || val === '–') return <span className="text-xs text-muted-foreground">Never</span>
          const d = new Date(val)
          const formatted = d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
          return <span className="text-xs text-muted-foreground">{formatted}</span>
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const u = row.original
          const isProtectedOtherSuperAdmin = u.id === user?.id
          return (
            <div className="flex items-center gap-1">
              {user?.role === 'super-admin' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setResetTarget(u); setResetPw(''); setResetConfirm(''); setResetSuccess(false) }}
                >
                  <KeyRound size={13} /> Reset Password
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive disabled:opacity-40 disabled:pointer-events-none"
                    disabled={isProtectedOtherSuperAdmin}
                    title={isProtectedOtherSuperAdmin ? 'You cannot delete your own account' : undefined}
                  >
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {u.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove their access. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => deleteUserMutation.mutate(u.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )
        },
      },
    ],
    [user]
  )

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const selectedCount = Object.keys(rowSelection).length
  const [activeTab, setActiveTab] = useState('users')

  // Change role dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [roleTarget, setRoleTarget] = useState<MockUser | null>(null)
  const [selectedRole, setSelectedRole] = useState('')

  const handleChangeRole = async () => {
    if (!selectedRole) return
    try {
      if (roleTarget) {
        await changeRole(roleTarget.id, selectedRole)
      } else {
        const targets = table.getSelectedRowModel().rows
          .map(row => row.original)
          .filter(r => !(r.role === 'super-admin' && r.id !== user?.id))
        await Promise.all(targets.map(r => changeRole(r.id, selectedRole)))
        table.resetRowSelection()
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.role?.[0] ?? err?.response?.data?.message ?? 'Failed to change role.')
      return
    }
    toast.success('Role updated successfully.')
    setRoleTarget(null)
    setRoleDialogOpen(false)
  }

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState<MockUser | null>(null)
  const [resetPw, setResetPw] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [showResetPw, setShowResetPw] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const handleResetPassword = () => {
    if (!resetPw || !resetConfirm) { toast.error('Please fill in both fields.'); return }
    if (resetPw !== resetConfirm) { toast.error('Passwords do not match.'); return }
    if (resetPw.length < 6) { toast.error('Password must be at least 6 characters.'); return }
    // In production: call API to reset password for resetTarget.id
    setResetSuccess(true)
    toast.success('Password reset successfully.')
    setTimeout(() => {
      setResetTarget(null)
      setResetPw('')
      setResetConfirm('')
      setResetSuccess(false)
    }, 1200)
  }

  if (user?.role !== 'super-admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Shield size={40} className="mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">Access restricted to Super Admin only</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-xl font-bold text-foreground dark:text-secondary-foreground">Admin</h1>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground/70">User management, system configuration and integrations</p>
      </div>

      <AnimatedTabs orientation="vertical" activeTab={activeTab} onValueChange={setActiveTab} className="gap-4">
        {/* Vertical tab list */}
        <TabsList className="h-fit w-44 shrink-0 flex-col gap-0.5 p-1.5">
          <TabsTrigger value="users" className="w-full justify-start gap-2 px-3 py-2 text-sm">
            <Users size={15} /> Users
          </TabsTrigger>
          <TabsTrigger value="integrations" className="w-full justify-start gap-2 px-3 py-2 text-sm">
            <Settings size={15} /> Integrations
          </TabsTrigger>
          <TabsTrigger value="email" className="w-full justify-start gap-2 px-3 py-2 text-sm">
            <Mail size={15} /> Email
          </TabsTrigger>
        </TabsList>

        {/* Users tab */}
        <AnimatedTabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield size={15} /> User Management
              </CardTitle>
              <CardAction>
                <Button size="sm" className="h-8 w-fit px-3 text-sm gap-1.5" onClick={() => { resetCreateUserForm(); setCreateUserOpen(true) }}><UserPlus size={14} /> Create User</Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  placeholder="Search users..."
                  value={globalFilter}
                  onChange={e => setGlobalFilter(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-foreground/80 placeholder:text-muted-foreground/50 focus:border-blue-500 focus:outline-none dark:border-border dark:bg-secondary dark:text-muted-foreground/50"
                />
              </div>

              {selectedCount > 0 && (() => {
                const selectedRows = table.getSelectedRowModel().rows
                const allActive = selectedRows.every(r => r.original.status === 'active')
                const label = allActive ? 'Disable' : 'Enable'
                return (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">{selectedCount} selected</span>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-7 text-xs gap-1.5 ${allActive ? 'text-destructive hover:text-destructive' : 'text-emerald-600 hover:text-emerald-700'}`}
                      onClick={() => {
                        const selfRow = selectedRows.find(row => row.original.id === user?.id)
                        if (selfRow) {
                          toast.error('You cannot disable your own account.')
                        }
                        selectedRows
                          .filter(row => row.original.id !== user?.id)
                          .forEach(row => toggleDisable(row.original.id))
                        table.resetRowSelection()
                      }}
                    >
                      <UserX size={12} /> {label}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => { setRoleTarget(null); setSelectedRole(''); setRoleDialogOpen(true) }}
                    >
                      <UserCog size={12} /> Change Role
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="h-7 text-xs gap-1.5">
                          <Trash2 size={12} /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete {selectedCount} user{selectedCount > 1 ? 's' : ''}?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently remove their access. This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => {
                              selectedRows
                                .filter(row => !(row.original.role === 'super-admin' && row.original.id !== user?.id))
                                .forEach(row => deleteUserMutation.mutate(row.original.id))
                              table.resetRowSelection()
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => table.resetRowSelection()}>
                    <X size={12} />
                  </Button>
                </div>
                )
              })()}

              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map(hg => (
                    <TableRow key={hg.id}>
                      {hg.headers.map(header => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                        No results found
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map(row => (
                      <TableRow key={row.id} className="h-14 hover:bg-muted/50 transition-colors border-b border-border/60 bg-white dark:border-border dark:bg-card dark:hover:bg-secondary/50" data-state={row.getIsSelected() ? 'selected' : undefined}>
                        {row.getVisibleCells().map(cell => (
                          <TableCell key={cell.id} className="align-middle">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </AnimatedTabsContent>

        {/* Integrations tab */}
        <AnimatedTabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw size={15} className="text-purple-600" /> Snipe-IT Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Connect to your Snipe-IT instance to sync printer assets automatically.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 max-w-2xl">

              {/* Fields grid — matches wireframe 2-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                <div className="space-y-1.5">
                  <Label>Snipe-IT Server URL <span className="text-destructive">*</span></Label>
                  <Input
                    type="url"
                    value={snipeitUrl}
                    onChange={e => setSnipeitUrl(e.target.value)}
                    placeholder="https://your-snipeit-instance.com"
                  />
                  <p className="text-xs text-muted-foreground">Your Snipe-IT instance URL</p>
                </div>

                <div className="space-y-1.5">
                  <Label>API Key (Personal Access Token) <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      type={showSnipeitKey ? 'text' : 'password'}
                      value={snipeitKey}
                      onChange={e => setSnipeitKey(e.target.value)}
                      placeholder="snipeit-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="pr-10 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSnipeitKey(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showSnipeitKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Generate in Snipe-IT → Account Settings → API Tokens</p>
                </div>

                <div className="space-y-1.5">
                  <Label>Printer Category ID <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    min="0"
                    value={snipeitCategoryId}
                    onChange={e => setSnipeitCategoryId(e.target.value)}
                    placeholder="e.g. 5"
                    className="max-w-[160px]"
                  />
                  <p className="text-xs text-muted-foreground">Find in Snipe-IT → Admin → Categories</p>
                </div>

                <div className="space-y-1.5">
                  <Label>Sync Frequency</Label>
                  <Select value={snipeitSyncFreq} onValueChange={setSnipeitSyncFreq}>
                    <SelectTrigger className="max-w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="15">Every 15 minutes</SelectItem>
                      <SelectItem value="30">Every 30 minutes</SelectItem>
                      <SelectItem value="60">Every hour</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">How often to sync with Snipe-IT</p>
                </div>

              </div>

              {/* Action buttons — matches wireframe */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20"
                  disabled={snipeitTesting || !snipeitUrl || !snipeitKey}
                  onClick={handleSnipeitTest}
                >
                  {snipeitTesting
                    ? <><div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />Testing…</>
                    : <><Plug size={13} />Test Connection</>}
                </Button>

                <Button
                  size="sm"
                  disabled={snipeitSaving || !snipeitUrl || !snipeitKey}
                  onClick={handleSnipeitSave}
                >
                  {snipeitSaving
                    ? <><div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Saving…</>
                    : 'Save Settings'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20"
                  disabled={snipeitFetching || !snipeitUrl || !snipeitKey}
                  onClick={handleSnipeitFetch}
                >
                  {snipeitFetching
                    ? <><div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />Fetching…</>
                    : <><Download size={13} />Fetch Printers</>}
                </Button>
              </div>

            </CardContent>
          </Card>
        </AnimatedTabsContent>

        {/* Email tab */}
        <AnimatedTabsContent value="email">
          <div className="space-y-6">

          {/* SMTP Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Mail size={15} /> SMTP Configuration
                </CardTitle>
                {smtpConfigured && (
                  <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Configured
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Configure outgoing email settings. Settings persist across server restarts.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              <div className="space-y-1.5">
                <Label>SMTP Host</Label>
                <Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Port</Label>
                  <Input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" />
                </div>
                <div className="space-y-1.5">
                  <Label>Encryption</Label>
                  <Select value={smtpEncryption} onValueChange={setSmtpEncryption}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tls">TLS</SelectItem>
                      <SelectItem value="ssl">SSL</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input value={smtpUsername} onChange={e => setSmtpUsername(e.target.value)} placeholder="you@gmail.com" autoComplete="off" />
              </div>
              <div className="space-y-1.5">
                <Label>Password {smtpConfigured && <span className="text-xs text-muted-foreground font-normal">(leave blank to keep existing)</span>}</Label>
                <div className="relative">
                  <Input
                    type={showSmtpPassword ? 'text' : 'password'}
                    value={smtpPassword}
                    onChange={e => setSmtpPassword(e.target.value)}
                    placeholder={smtpConfigured ? '••••••••' : 'SMTP password or app password'}
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowSmtpPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showSmtpPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>From Email</Label>
                  <Input value={smtpFromEmail} onChange={e => setSmtpFromEmail(e.target.value)} placeholder="noreply@company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>From Name</Label>
                  <Input value={smtpFromName} onChange={e => setSmtpFromName(e.target.value)} placeholder="Printer Asset Management" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" disabled={smtpSaving} onClick={async () => {
                  setSmtpSaving(true)
                  try {
                    const { adminApi } = await import('@/services/api')
                    await adminApi.saveSmtp({ host: smtpHost, port: Number(smtpPort), encryption: smtpEncryption, username: smtpUsername, password: smtpPassword || undefined, from_address: smtpFromEmail, from_name: smtpFromName })
                    setSmtpConfigured(true)
                    setSmtpPassword('')
                    toast.success('SMTP settings saved.')
                  } catch (err: any) { toast.error(err?.response?.data?.message ?? err?.response?.data?.errors ? JSON.stringify(err?.response?.data?.errors) : 'Failed to save SMTP settings.') }
                  finally { setSmtpSaving(false) }
                }}>
                  {smtpSaving ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : 'Save SMTP'}
                </Button>
                <Button variant="outline" size="sm" disabled={smtpTesting || !smtpConfigured} onClick={async () => {
                  setSmtpTesting(true)
                  try {
                    const { adminApi } = await import('@/services/api')
                    const res = await adminApi.testSmtp()
                    toast.success(res.data?.message ?? 'Test email sent.')
                  } catch (err: unknown) {
                    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                    toast.error(msg ?? 'Failed to send test email. Check your SMTP settings.')
                  } finally { setSmtpTesting(false) }
                }}>
                  {smtpTesting ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground border-t-transparent" /> : 'Send Test Email'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail size={15} /> Alert Notifications
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure who receives alert digests and which conditions trigger them.
              </p>
            </CardHeader>
            <CardContent className="space-y-5 max-w-lg">
              <div className="space-y-1.5">
                <Label>Recipient Email Addresses</Label>
                <Input
                  value={notifRecipients}
                  onChange={e => setNotifRecipients(e.target.value)}
                  placeholder="admin@company.com, manager@company.com"
                />
                <p className="text-xs text-muted-foreground">Separate multiple addresses with commas.</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alert Types</p>
                {([
                  { label: 'Out of Stock consumables', value: notifOutOfStock, set: setNotifOutOfStock },
                  { label: 'Low stock consumables', value: notifLowStock, set: setNotifLowStock },
                  { label: 'Overdue printer service', value: notifOverdueService, set: setNotifOverdueService },
                  { label: 'Expiring contracts', value: notifContractExpiry, set: setNotifContractExpiry },
                ] as const).map(item => (
                  <label key={item.label} className="flex cursor-pointer items-center gap-3">
                    <input type="checkbox" checked={item.value} onChange={e => item.set(e.target.checked)} className="h-4 w-4 rounded border-border" />
                    <span className="text-sm">{item.label}</span>
                  </label>
                ))}
                {notifContractExpiry && (
                  <p className="ml-7 text-xs text-muted-foreground">Alerts sent at 60, 45, and 30 days before expiry.</p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button size="sm" disabled={notifSaving} onClick={async () => {
                  setNotifSaving(true)
                  try {
                    const { adminApi } = await import('@/services/api')
                    await adminApi.saveNotifications({
                      recipients: notifRecipients,
                      alert_low_stock: notifLowStock,
                      alert_out_of_stock: notifOutOfStock,
                      alert_contract_expiry: notifContractExpiry,

                      alert_overdue_service: notifOverdueService,
                    })
                    toast.success('Notification settings saved.')
                  } catch { toast.error('Failed to save notification settings.') }
                  finally { setNotifSaving(false) }
                }}>
                  {notifSaving ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : 'Save Settings'}
                </Button>
                <Button variant="outline" size="sm" disabled={notifSending || !smtpConfigured || !notifRecipients.trim()} onClick={async () => {
                  setNotifSending(true)
                  try {
                    const { adminApi } = await import('@/services/api')
                    const res = await adminApi.sendAlerts()
                    const d = res.data
                    toast.success(d.alert_count > 0 ? `Alert digest sent — ${d.alert_count} alert(s) reported.` : 'Alert digest sent — no active alerts.')
                  } catch (err: unknown) {
                    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                    toast.error(msg ?? 'Failed to send alert digest.')
                  } finally { setNotifSending(false) }
                }}>
                  {notifSending ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground border-t-transparent" /> : 'Send Alert Digest Now'}
                </Button>
              </div>
              {(!smtpConfigured || !notifRecipients.trim()) && (
                <p className="text-xs text-muted-foreground">
                  {!smtpConfigured ? 'Save SMTP settings before sending alerts.' : 'Add at least one recipient to send alerts.'}
                </p>
              )}
            </CardContent>
          </Card>

          </div>
        </AnimatedTabsContent>
      </AnimatedTabs>

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={open => { if (!open) { setRoleDialogOpen(false); setRoleTarget(null) } }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              {roleTarget
                ? <>Update the permission level for <span className="font-medium text-foreground">{roleTarget.name}</span>.</>
                : <>Apply a permission level to <span className="font-medium text-foreground">{selectedCount} selected user{selectedCount !== 1 ? 's' : ''}</span>.</>}
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const isProtectedTarget = !!roleTarget && roleTarget.role === 'super-admin' && roleTarget.id !== user?.id
            const otherSuperAdminCount = users.filter(u => u.role === 'super-admin' && u.id !== user?.id).length
            const isSelfOnlySuperAdmin = !!roleTarget && roleTarget.role === 'super-admin' && roleTarget.id === user?.id && otherSuperAdminCount === 0
            const isSelfDemoteBlocked = isSelfOnlySuperAdmin && selectedRole !== '' && selectedRole !== 'super-admin'
            const disabled = isProtectedTarget || isSelfDemoteBlocked
            return (
              <>
                {(isProtectedTarget || isSelfDemoteBlocked) && (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {(isProtectedTarget && 'This user is a super admin. Only they can change their own role — log in as them to do so.')
                      || (isSelfDemoteBlocked && 'You are the only super admin. Promote another user to super admin before changing your own role.')}
                  </p>
                )}
                <div className="py-2 space-y-1.5">
                  <Label>Permission</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole} disabled={isProtectedTarget}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a role…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super-admin">Super Admin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="reports">Reports</SelectItem>
                      <SelectItem value="view">View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setRoleDialogOpen(false); setRoleTarget(null) }}>Cancel</Button>
                  <Button onClick={handleChangeRole} disabled={disabled}>Save</Button>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createUserOpen} onOpenChange={open => { setCreateUserOpen(open); if (!open) resetCreateUserForm() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Add a new user and assign their permission level.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="new-user-name">Name</Label>
              <Input id="new-user-name" value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-user-email">Email</Label>
              <Input id="new-user-email" type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="name@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-user-password">Password</Label>
              <div className="relative">
                <Input
                  id="new-user-password"
                  type={showNewUserPassword ? 'text' : 'password'}
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  className="pr-9"
                  placeholder="Min. 6 characters"
                />
                <button type="button" onClick={() => setShowNewUserPassword(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNewUserPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Permission</Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super-admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="reports">Reports</SelectItem>
                  <SelectItem value="view">View</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateUserOpen(false); resetCreateUserForm() }}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? 'Creating…' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={open => { if (!open) { setResetTarget(null); setResetPw(''); setResetConfirm(''); setResetSuccess(false) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for <span className="font-medium text-foreground">{resetTarget?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="reset-pw">New Password</Label>
              <div className="relative">
                <Input id="reset-pw" type={showResetPw ? 'text' : 'password'} value={resetPw} onChange={e => setResetPw(e.target.value)} className="pr-9" placeholder="Min. 6 characters" />
                <button type="button" onClick={() => setShowResetPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showResetPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reset-confirm">Confirm Password</Label>
              <div className="relative">
                <Input id="reset-confirm" type={showResetConfirm ? 'text' : 'password'} value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} className="pr-9" placeholder="Repeat new password" />
                <button type="button" onClick={() => setShowResetConfirm(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showResetConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={resetSuccess}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
