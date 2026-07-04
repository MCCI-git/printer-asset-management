import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { Footer } from './Footer'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'

export function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')
  const [scrolled, setScrolled] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => { setScrolled(false) }, [location.pathname])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-[220px] border-r border-border p-4 space-y-3">
          <Skeleton className="h-8 w-32" />
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <Sidebar />
      <SidebarInset className="flex flex-col overflow-hidden min-h-0">
        <Topbar darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} scrolled={scrolled} />
        <main className="flex-1 overflow-y-auto">
          {/* Sentinel: scrolls out of view immediately on scroll, triggering shadow */}
          <div ref={sentinelRef} className="h-px w-full" aria-hidden />
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, scale: 0.99, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1,    filter: 'blur(0px)' }}
              exit={{    opacity: 0, scale: 1.01, filter: 'blur(4px)' }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              className="min-h-full p-6"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}
