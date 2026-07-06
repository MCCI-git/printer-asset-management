import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Printer, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import Aurora from '@/components/ui/Aurora'

function useIsDark() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )
  useEffect(() => {
    const el = document.documentElement
    const obs = new MutationObserver(() =>
      setDark(el.classList.contains('dark'))
    )
    obs.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

export function Login() {
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const isDark = useIsDark()

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4">

      {/* Aurora background — dark mode only */}
      {isDark && (
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <Aurora
            colorStops={['#355872', '#7AAACE', '#9CD5FF']}
            amplitude={1.25}
          />
        </div>
      )}

      <div
        className={cn(
          "relative z-10 mx-auto w-full max-w-sm rounded-2xl px-8 pt-10 pb-6",
          isDark
            ? "border border-white/15 bg-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl backdrop-saturate-150"
            : "border border-border bg-card shadow-sm"
        )}
        style={isDark ? { boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)' } : {}}
      >
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Printer size={18} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">Printer Asset Management</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Sign in to your workspace</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={isDark ? "border-white/15 bg-white/8 backdrop-blur-md placeholder:text-white/40 text-white focus-visible:ring-white/25 focus-visible:border-white/30" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className={isDark ? "border-white/15 bg-white/8 backdrop-blur-md placeholder:text-white/40 text-white pr-10 focus-visible:ring-white/25 focus-visible:border-white/30" : "pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
          <Button type="submit" disabled={loading} className="px-6 border border-transparent hover:border-blue-500 hover:bg-white hover:text-blue-500 transition-colors" size="lg">
            {loading ? <Spinner className="size-4" /> : 'Sign in'}
          </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
