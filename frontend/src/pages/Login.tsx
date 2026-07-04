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

export function Login() {
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-xs"
      >
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Printer size={18} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">Printer Asset Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Sign in to your workspace</p>
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
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full mt-1" size="sm">
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
