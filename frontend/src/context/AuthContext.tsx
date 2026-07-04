import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi } from '@/services/api'
import { mockUsers } from '@/services/mockData'
import type { User } from '@/types'

const USE_MOCK = false

interface AuthContextValue {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
  isAuthenticated: boolean
  updateAvatar: (dataUrl: string) => Promise<void>
  updateName: (name: string) => Promise<void>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (USE_MOCK) {
      // Restore mock session from localStorage
      const saved = localStorage.getItem('mock_user')
      if (saved) {
        try { setUser(JSON.parse(saved)) } catch { localStorage.removeItem('mock_user') }
      }
      setIsLoading(false)
      return
    }
    if (token) {
      authApi.me()
        .then((res) => setUser({ ...res.data, avatar_url: res.data.avatar ?? res.data.avatar_url }))
        .catch(() => {
          setToken(null)
          localStorage.removeItem('auth_token')
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [token])

  const login = async (email: string, password: string) => {
    if (USE_MOCK) {
      const found = mockUsers.find(u => u.email === email && u.password === password)
      if (!found) throw { response: { data: { message: 'These credentials do not match our records.' } } }
      const { password: _pw, ...u } = found
      localStorage.setItem('mock_user', JSON.stringify(u))
      setUser(u)
      return
    }
    const res = await authApi.login(email, password)
    const { user: u, token: t } = res.data
    localStorage.setItem('auth_token', t)
    setToken(t)
    setUser(u)
  }

  const register = async (name: string, email: string, password: string, passwordConfirmation: string) => {
    if (USE_MOCK) {
      if (mockUsers.find(u => u.email === email)) {
        throw { response: { data: { message: 'An account with this email already exists.' } } }
      }
      const newUser: User = { id: mockUsers.length + 1, name, email, role: 'view', status: 'active' }
      mockUsers.push({ ...newUser, password })
      localStorage.setItem('mock_user', JSON.stringify(newUser))
      setUser(newUser)
      return
    }
    const res = await authApi.register(name, email, password, passwordConfirmation)
    const { user: u, token: t } = res.data
    localStorage.setItem('auth_token', t)
    setToken(t)
    setUser(u)
  }

  const logout = async () => {
    if (USE_MOCK) {
      localStorage.removeItem('mock_user')
      setUser(null)
      return
    }
    try { await authApi.logout() } catch {}
    localStorage.removeItem('auth_token')
    setToken(null)
    setUser(null)
  }

  const updateAvatar = async (dataUrl: string) => {
    if (!user) return
    if (!USE_MOCK) {
      const res = await authApi.updateProfile({ avatar: dataUrl || null })
      setUser({ ...res.data, avatar_url: res.data.avatar ?? dataUrl })
      return
    }
    const updated = { ...user, avatar_url: dataUrl }
    setUser(updated)
    localStorage.setItem('mock_user', JSON.stringify(updated))
  }

  const updateName = async (name: string) => {
    if (!user) return
    if (!USE_MOCK) {
      const res = await authApi.updateProfile({ name })
      setUser({ ...res.data, avatar_url: user.avatar_url })
      return
    }
    const updated = { ...user, name }
    setUser(updated)
    localStorage.setItem('mock_user', JSON.stringify(updated))
  }

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (USE_MOCK) {
      const found = mockUsers.find(u => u.id === user?.id)
      if (!found || found.password !== currentPassword) throw new Error('Current password is incorrect.')
      found.password = newPassword
      return
    }
    await authApi.updatePassword(currentPassword, newPassword)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading, isAuthenticated: !!user, updateAvatar, updateName, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
