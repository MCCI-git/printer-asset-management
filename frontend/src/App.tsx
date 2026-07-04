import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/AuthContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Printers } from '@/pages/Printers'
import { Capex } from '@/pages/Capex'
import { Opex } from '@/pages/Opex'
import { Consumables } from '@/pages/Consumables'
import { Contracts } from '@/pages/Contracts'
import { Suppliers } from '@/pages/Suppliers'
import { Budget } from '@/pages/Budget'
import { Reports } from '@/pages/Reports'
import { Maintenance } from '@/pages/Maintenance'
import { SnipeIt } from '@/pages/SnipeIt'
import { Admin } from '@/pages/Admin'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/printers" element={<Printers />} />
              <Route path="/capex" element={<Capex />} />
              <Route path="/opex" element={<Opex />} />
              <Route path="/consumables" element={<Consumables />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/snipeit" element={<SnipeIt />} />
              <Route path="/admin" element={<Admin />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
