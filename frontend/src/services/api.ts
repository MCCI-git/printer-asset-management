import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/login', { email, password }),
  register: (name: string, email: string, password: string, password_confirmation: string) => api.post('/register', { name, email, password, password_confirmation }),
  me: () => api.get('/user'),
  logout: () => api.post('/logout'),
  updateProfile: (data: { name?: string; avatar?: string | null }) =>
    api.put('/user/profile', data),
  updatePassword: (current_password: string, password: string) =>
    api.put('/user/password', { current_password, password, password_confirmation: password }),
}

// Dashboard
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
}

// Printers
export const printersApi = {
  list: (params?: Record<string, unknown>) => api.get('/printers', { params }),
  get: (id: number) => api.get(`/printers/${id}`),
  create: (data: unknown) => api.post('/printers', data),
  update: (id: number, data: unknown) => api.put(`/printers/${id}`, data),
  delete: (id: number) => api.delete(`/printers/${id}`),
}

// Consumables
export const consumablesApi = {
  list: (params?: Record<string, unknown>) => api.get('/consumables', { params }),
  get: (id: number) => api.get(`/consumables/${id}`),
  create: (data: unknown) => api.post('/consumables', data),
  update: (id: number, data: unknown) => api.put(`/consumables/${id}`, data),
  delete: (id: number) => api.delete(`/consumables/${id}`),
  assign: (id: number, printer_id: number) => api.post(`/consumables/${id}/assign`, { printer_id }),
  assignments: () => api.get('/consumable-assignments'),
  unassign: (assignmentId: number) => api.delete(`/consumable-assignments/${assignmentId}`),
}

// Contracts
export const contractsApi = {
  list: (params?: Record<string, unknown>) => api.get('/contracts', { params }),
  get: (id: number) => api.get(`/contracts/${id}`),
  create: (data: unknown) => api.post('/contracts', data),
  update: (id: number, data: unknown) => api.put(`/contracts/${id}`, data),
  delete: (id: number) => api.delete(`/contracts/${id}`),
  renew: (id: number) => api.post(`/contracts/${id}/renew`),
  renewals: () => api.get('/contract-renewals'),
  createRenewal: (data: unknown) => api.post('/contract-renewals', data),
  deleteRenewal: (id: number) => api.delete(`/contract-renewals/${id}`),
  uploadPdf: (id: number, file: File) => {
    const fd = new FormData(); fd.append('pdf', file)
    return api.post(`/contracts/${id}/upload-pdf`, fd)
  },
}

// Suppliers
export const suppliersApi = {
  list: (params?: Record<string, unknown>) => api.get('/suppliers', { params }),
  get: (id: number) => api.get(`/suppliers/${id}`),
  create: (data: FormData) => api.post('/suppliers', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: number, data: FormData) => api.post(`/suppliers/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: number) => api.delete(`/suppliers/${id}`),
}

// Snipe-IT
export const snipeItApi = {
  assets: (params?: Record<string, unknown>) => api.get('/snipeit/assets', { params }),
  asset: (id: number) => api.get(`/snipeit/assets/${id}`),
  categories: () => api.get('/snipeit/categories'),
  locations: () => api.get('/snipeit/locations'),
  test: (data?: { url: string; api_key: string }) => api.post('/snipeit/test', data ?? {}),
  sync: () => api.post('/snipeit/sync'),
  getConfig: () => api.get('/snipeit/config'),
  saveConfig: (data: { url: string; api_key: string; category_id: number }) =>
    api.post('/snipeit/config', data),
}

// Print Manager
export const printManagerApi = {
  plans: () => api.get('/print-manager/plans'),
  updatePlan: (id: number, price: number) => api.put(`/print-manager/plans/${id}`, { price }),
  students: () => api.get('/print-manager/students'),
  createStudent: (data: unknown) => api.post('/print-manager/students', data),
  updateStudent: (id: number, data: unknown) => api.put(`/print-manager/students/${id}`, data),
  deleteStudent: (id: number) => api.delete(`/print-manager/students/${id}`),
  logPurchase: (studentId: number, data: { plan_id: number; purchased_at: string }) =>
    api.post(`/print-manager/students/${studentId}/purchase`, data),
  sendEmail: (studentId: number, data: FormData) =>
    api.post(`/print-manager/students/${studentId}/email`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deletePurchase: (id: number) => api.delete(`/print-manager/purchases/${id}`),
  budget: () => api.get('/print-manager/budget'),
  getEmailTemplate: () => api.get('/print-manager/email-template'),
  saveEmailTemplate: (template: string) => api.post('/print-manager/email-template', { template }),
}

// TopAccess (Toshiba SNMP)
export const topAccessApi = {
  printers: () => api.get('/topaccess/printers'),
  refreshAll: () => api.post('/topaccess/refresh-all'),
  printer: (id: number) => api.get('/topaccess/printer', { params: { id } }),
  refreshOne: (id: number) => api.post(`/topaccess/refresh/${id}`),
  test: (data: { ip: string; community: string }) => api.post('/topaccess/test', data),
}

// Admin: SMTP + Notifications
export const adminApi = {
  getSmtp: () => api.get('/admin/smtp'),
  saveSmtp: (data: {
    host: string
    port: number
    encryption: string
    username?: string
    password?: string
    from_address: string
    from_name: string
  }) => api.post('/admin/smtp', data),
  testSmtp: (to?: string) => api.post('/admin/smtp/test', { to }),
  getNotifications: () => api.get('/admin/notifications'),
  saveNotifications: (data: {
    recipients: string
    alert_low_stock: boolean
    alert_out_of_stock: boolean
    alert_contract_expiry: boolean
    contract_expiry_days: number
    alert_overdue_service: boolean
  }) => api.post('/admin/notifications', data),
  sendAlerts: () => api.post('/admin/notifications/send'),
}

// Printer page counts
export const pageCountsApi = {
  list:    (printerId: number) => api.get(`/printers/${printerId}/page-counts`),
  create:  (printerId: number, data: { count: number; logged_at: string; notes?: string }) =>
    api.post(`/printers/${printerId}/page-counts`, data),
  delete:  (printerId: number, logId: number) => api.delete(`/printers/${printerId}/page-counts/${logId}`),
  opexYtd: (year: number) => api.get('/printers/opex-ytd', { params: { year } }),
}

// Budgets
export const budgetsApi = {
  get: (year: number) => api.get('/budgets', { params: { year } }),
  history: () => api.get<number[]>('/budgets/history'),
  all: () => api.get('/budgets/all'),
  actual: (year: number) => api.get('/budgets/actual', { params: { year } }),
  breakdown: (year: number) => api.get('/budgets/breakdown', { params: { year } }),
  upsert: (data: { year: number; type: 'total' | 'capex' | 'opex'; amount: number; notes?: string; start_date?: string; end_date?: string }) =>
    api.put('/budgets', data),
}

// Activity Logs
export const activityLogsApi = {
  list: (params?: Record<string, unknown>) => api.get('/activity-logs', { params }),
  export: (params?: Record<string, unknown>) =>
    api.get('/activity-logs/export', { params, responseType: 'blob' }),
}

// Work Orders
export const workOrdersApi = {
  list: () => api.get('/work-orders'),
  create: (data: unknown) => api.post('/work-orders', data),
  update: (id: number, data: unknown) => api.put(`/work-orders/${id}`, data),
  delete: (id: number) => api.delete(`/work-orders/${id}`),
}

// Users
export const usersApi = {
  list: () => api.get('/users'),
  get: (id: number) => api.get(`/users/${id}`),
  create: (data: unknown) => api.post('/users', data),
  update: (id: number, data: unknown) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  toggleStatus: (id: number) => api.patch(`/users/${id}/toggle-status`),
}
