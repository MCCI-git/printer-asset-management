import { useState, useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Printer, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import DotField from '@/components/ui/DotField'

const LIGHT_FIELD = {
  gradientFrom: '#78A4CB',
  gradientTo:   '#B4E1EB',
  glowColor:    '#ffffff',
}

const DARK_FIELD = {
  gradientFrom: '#78A4CB',
  gradientTo:   '#95BDD7',
  glowColor:    '#000000',
}

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
  const [progress, setProgress] = useState(0)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isDark = useIsDark()
  const field = isDark ? DARK_FIELD : LIGHT_FIELD

  useEffect(() => {
    if (loading) {
      setProgress(0)
      progressRef.current = setInterval(() => {
        setProgress(p => {
          if (p < 70) return p + 4
          if (p < 90) return p + 0.5
          return p
        })
      }, 80)
    } else {
      if (progressRef.current) clearInterval(progressRef.current)
    }
    return () => { if (progressRef.current) clearInterval(progressRef.current) }
  }, [loading])

  if (isAuthenticated) {
    if (progress > 0 && progress < 100) setProgress(100)
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      setProgress(100)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Something went wrong. Please try again.')
      setProgress(0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4">

      {/* DotField background — dark mode only */}
      {isDark && (
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <DotField
            dotRadius={1.5}
            dotSpacing={14}
            bulgeStrength={67}
            glowRadius={160}
            sparkle={false}
            waveAmplitude={0}
            gradientFrom={field.gradientFrom}
            gradientTo={field.gradientTo}
            glowColor={field.glowColor}
          />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 mx-auto w-full max-w-sm rounded-2xl border border-white/10 bg-white/8 px-8 py-10 shadow-2xl backdrop-blur-2xl"
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
              className="border-white/10 bg-white/5 backdrop-blur-sm placeholder:text-muted-foreground/60 focus-visible:ring-white/20"
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
                className="border-white/10 bg-white/5 pr-10 backdrop-blur-sm placeholder:text-muted-foreground/60 focus-visible:ring-white/20"
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

          <Button type="submit" disabled={loading} className="mt-1 w-full" size="sm">
            {loading
              ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              : 'Sign in'}
          </Button>
        </form>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: loading || progress > 0 ? 1 : 0 }}
          transition={{ duration: 0.15 }}
          className={cn('mt-6 flex justify-center')}
        >
          <Progress value={progress} className="h-1 w-48" />
        </motion.div>
      </motion.div>
    </div>
  )
}
