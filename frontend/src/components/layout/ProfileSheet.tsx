import { useRef, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Camera, Trash2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'

const roleLabel: Record<string, string> = {
  'super-admin': 'Super Admin',
  admin: 'Admin',
  reports: 'Reports',
  view: 'View',
}

const roleBadgeVariant: Record<string, BadgeVariant> = {
  'super-admin': 'role-superadmin',
  admin:         'role-admin',
  reports:       'role-reports',
  view:          'role-view',
}

interface ProfileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileSheet({ open, onOpenChange }: ProfileSheetProps) {
  const { user, updateAvatar, updateName, updatePassword } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)

  // Profile fields
  const [username, setUsername] = useState('')

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  useEffect(() => {
    if (open) {
      setLoading(true)
      setUsername(user?.name ?? '')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      const t = setTimeout(() => setLoading(false), 600)
      return () => clearTimeout(t)
    }
  }, [open])

  const initials = user?.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U'

  const [avatarSaving, setAvatarSaving] = useState(false)

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB.'); return }
    const reader = new FileReader()
    reader.onload = async e => {
      if (e.target?.result) {
        setAvatarSaving(true)
        try {
          await updateAvatar(e.target.result as string)
        } catch {
          toast.error('Failed to save photo.')
        } finally {
          setAvatarSaving(false)
        }
      }
    }
    reader.readAsDataURL(file)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleSaveProfile = async () => {
    if (!username.trim()) return
    if (username.trim() === user?.name) { onOpenChange(false); return }
    setSavingProfile(true)
    try {
      await updateName(username.trim())
      onOpenChange(false)
    } catch {
      toast.error('Failed to save profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.')
      return
    }
    setSavingPw(true)
    try {
      await updatePassword(currentPassword, newPassword)
      toast.success('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err?.message ?? err?.response?.data?.message ?? 'Failed to update password.')
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>My Profile</SheetTitle>
          <SheetDescription>Update your photo, username and password.</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex-1 overflow-y-auto space-y-5 px-4 py-1">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Separator />
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-5 px-4 py-1">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div
                className={`relative group cursor-pointer rounded-full transition-all ${dragOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user?.avatar_url} alt={user?.name} />
                  <AvatarFallback className="text-2xl font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
              <div className="flex gap-2">
                {user?.avatar_url && (
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={avatarSaving} onClick={async () => {
                    setAvatarSaving(true)
                    try { await updateAvatar('') } catch { toast.error('Failed to remove photo.') } finally { setAvatarSaving(false) }
                  }}>
                    <Trash2 size={14} /> {avatarSaving ? 'Saving…' : 'Remove Photo'}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">Click or drag & drop to change photo · max 2MB.</p>
            </div>

            <Separator />

            {/* Profile fields */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="profile-username">Username</Label>
                <Input
                  id="profile-username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={user?.email ?? ''} readOnly className="text-muted-foreground cursor-default" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <div className="mt-1">
                    <Badge variant={roleBadgeVariant[user?.role ?? 'view']}>
                      {roleLabel[user?.role ?? 'view']}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-medium mt-0.5 capitalize">{user?.status}</p>
                </div>
              </div>
            </div>

            {/* Change password accordion */}
            <Accordion type="single" collapsible className="-mx-1">
              <AccordionItem value="password" className="border-t">
                <AccordionTrigger className="px-1 text-sm font-semibold hover:no-underline">
                  Change Password
                </AccordionTrigger>
                <AccordionContent className="px-1 pt-1 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-current">Current Password</Label>
                    <div className="relative">
                      <Input id="pw-current" type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="pr-9" />
                      <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-new">New Password</Label>
                    <div className="relative">
                      <Input id="pw-new" type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="pr-9" />
                      <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-confirm">Confirm New Password</Label>
                    <div className="relative">
                      <Input id="pw-confirm" type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pr-9" />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={handleChangePassword} disabled={savingPw}>
                    {savingPw ? 'Updating…' : 'Update Password'}
                  </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}

        <SheetFooter className="flex-row justify-end border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSaveProfile} disabled={savingProfile}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
