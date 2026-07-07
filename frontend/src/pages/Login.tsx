import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Printer, Eye, EyeOff, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import Grainient from '@/components/ui/Grainient'

function useIsDark(): [boolean, () => void] {
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
  const toggle = () => {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }
  return [dark, toggle]
}

export function Login() {
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isDark, toggleDark] = useIsDark()

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

      {/* Theme toggle */}
      <button
        onClick={toggleDark}
        className={cn("absolute top-4 right-4 z-20 rounded-full p-2 transition-colors hover:bg-accent", isDark ? "text-muted-foreground hover:text-foreground" : "text-black hover:text-black")}
        aria-label="Toggle theme"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Grainient background */}
      <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {isDark && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1 }} />}
        <Grainient
            color1="#355872"
            color2="#7AAACE"
            color3="#9CD5FF"
            timeSpeed={1.75}
            colorBalance={0.0}
            warpStrength={1.0}
            warpFrequency={5.0}
            warpSpeed={2.0}
            warpAmplitude={50.0}
            blendAngle={0.0}
            blendSoftness={0.05}
            rotationAmount={500.0}
            noiseScale={2.0}
            grainAmount={0.06}
            grainScale={2.0}
            grainAnimated={false}
            contrast={1.5}
            gamma={1.0}
            saturation={1.0}
            centerX={0.0}
            centerY={0.0}
            zoom={0.9}
          />
      </div>

      <div
        className={cn(
          "relative z-10 mx-auto w-full max-w-sm rounded-2xl px-8 pt-10 pb-6",
          "border border-white/15 bg-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl backdrop-saturate-150"
        )}
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)' }}
      >
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Printer size={18} />
          </div>
          <div className="text-center">
            <h1 className={cn("text-xl font-bold tracking-tight", !isDark && "text-black")}>Printer Asset Management</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Sign in to your workspace</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className={!isDark ? "text-black" : ""}>Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="border-white/15 bg-white/8 backdrop-blur-md placeholder:text-white/40 focus-visible:ring-white/25 focus-visible:border-white/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className={!isDark ? "text-black" : ""}>Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="border-white/15 bg-white/8 backdrop-blur-md placeholder:text-white/40 pr-10 focus-visible:ring-white/25 focus-visible:border-white/30"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className={cn("absolute right-3 top-1/2 -translate-y-1/2 transition-colors", isDark ? "text-muted-foreground hover:text-foreground" : "text-black hover:text-black")}
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
