import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/AuthContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { Skeleton } from '@/components/ui/skeleton'

const Login       = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })))
const Dashboard   = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Printers    = lazy(() => import('@/pages/Printers').then(m => ({ default: m.Printers })))
const Capex       = lazy(() => import('@/pages/Capex').then(m => ({ default: m.Capex })))
const Opex        = lazy(() => import('@/pages/Opex').then(m => ({ default: m.Opex })))
const Consumables = lazy(() => import('@/pages/Consumables').then(m => ({ default: m.Consumables })))
const Contracts   = lazy(() => import('@/pages/Contracts').then(m => ({ default: m.Contracts })))
const Suppliers   = lazy(() => import('@/pages/Suppliers').then(m => ({ default: m.Suppliers })))
const Budget      = lazy(() => import('@/pages/Budget').then(m => ({ default: m.Budget })))
const Reports     = lazy(() => import('@/pages/Reports').then(m => ({ default: m.Reports })))
const Maintenance = lazy(() => import('@/pages/Maintenance').then(m => ({ default: m.Maintenance })))
const SnipeIt     = lazy(() => import('@/pages/SnipeIt').then(m => ({ default: m.SnipeIt })))
const TopAccess   = lazy(() => import('@/pages/TopAccess').then(m => ({ default: m.TopAccess })))
const PrintManager= lazy(() => import('@/pages/PrintManager').then(m => ({ default: m.PrintManager })))
const Admin       = lazy(() => import('@/pages/Admin').then(m => ({ default: m.Admin })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
    },
  },
})

function PageFallback() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-4 gap-4 mt-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl mt-4" />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard"    element={<Dashboard />} />
                <Route path="/printers"     element={<Printers />} />
                <Route path="/capex"        element={<Capex />} />
                <Route path="/opex"         element={<Opex />} />
                <Route path="/consumables"  element={<Consumables />} />
                <Route path="/contracts"    element={<Contracts />} />
                <Route path="/suppliers"    element={<Suppliers />} />
                <Route path="/budget"       element={<Budget />} />
                <Route path="/reports"      element={<Reports />} />
                <Route path="/maintenance"  element={<Maintenance />} />
                <Route path="/snipeit"      element={<SnipeIt />} />
                <Route path="/topaccess"    element={<TopAccess />} />
                <Route path="/print-manager" element={<PrintManager />} />
                <Route path="/admin"        element={<Admin />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
