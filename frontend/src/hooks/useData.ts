import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardApi, printersApi, consumablesApi, contractsApi, suppliersApi, snipeItApi, budgetsApi, pageCountsApi, usersApi, workOrdersApi, activityLogsApi } from '@/services/api'
import type { PrinterPageCount, ConsumableAssignment, WorkOrder, ActivityLog } from '@/types'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await dashboardApi.stats()
      return res.data
    },
    staleTime: 0,
    refetchInterval: 30_000,
  })
}

export function usePrinters(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['printers', params],
    queryFn: async () => {
      const res = await printersApi.list(params)
      return res.data
    },
  })
}

export function usePrinter(id: number) {
  return useQuery({
    queryKey: ['printer', id],
    queryFn: async () => {
      const res = await printersApi.get(id)
      return res.data
    },
    enabled: !!id,
  })
}

export function useConsumables(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['consumables', params],
    queryFn: async () => {
      const res = await consumablesApi.list(params)
      return res.data
    },
  })
}

export function usePrinterConsumables(printerId: number | null) {
  return useQuery({
    queryKey: ['consumables', { printer_id: printerId }],
    queryFn: async () => {
      const res = await consumablesApi.list({ printer_id: printerId!, per_page: 100 })
      return res.data.data as { id: number; name: string; sku: string; type: string; unit_cost: number; assigned_to?: string }[]
    },
    enabled: printerId !== null,
  })
}

export function useContracts(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['contracts', params],
    queryFn: async () => {
      const res = await contractsApi.list(params)
      return res.data
    },
  })
}

export function useSuppliers(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: async () => {
      const res = await suppliersApi.list(params)
      return res.data
    },
  })
}

export function useSnipeItAssets(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['snipeit-assets', params],
    queryFn: async () => {
      const res = await snipeItApi.assets(params)
      return res.data
    },
  })
}

export function useUpdatePrinter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) => printersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['printers'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useDeletePrinter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => printersApi.delete(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['printers'], exact: false })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.removeQueries({ queryKey: ['page-counts', id] })
    },
  })
}

export function useUpdateConsumable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      consumablesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consumables'] })
      qc.invalidateQueries({ queryKey: ['supplier'] })
    },
  })
}

export function useCreateConsumable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => consumablesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consumables'] }),
  })
}

export function useDeleteConsumable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => consumablesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consumables'] }),
  })
}

export function useConsumableAssignments() {
  return useQuery<ConsumableAssignment[]>({
    queryKey: ['consumable-assignments'],
    queryFn: async () => {
      const res = await consumablesApi.assignments()
      return res.data as ConsumableAssignment[]
    },
  })
}

export function useAssignConsumable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ consumableId, printerId }: { consumableId: number; printerId: number }) =>
      consumablesApi.assign(consumableId, printerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consumables'] })
      qc.invalidateQueries({ queryKey: ['consumable-assignments'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useUnassignConsumable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assignmentId: number) => consumablesApi.unassign(assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consumables'] })
      qc.invalidateQueries({ queryKey: ['consumable-assignments'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useCreateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => contractsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  })
}

export function useUpdateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) => contractsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  })
}

export function useDeleteContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => contractsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  })
}

export function useRenewContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => contractsApi.renew(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] })
      qc.invalidateQueries({ queryKey: ['contract-renewals'] })
    },
  })
}

export function useContractRenewals() {
  return useQuery({
    queryKey: ['contract-renewals'],
    queryFn: async () => {
      const res = await contractsApi.renewals()
      return res.data as {
        id: number
        event_type: 'renewed' | 'expired'
        original_contract_id: number
        renewed_contract_id: number | null
        renewed_at: string
        original_contract: { id: number; name: string }
        renewed_contract: { id: number; name: string; start_date: string; end_date: string } | null
        renewed_by: { id: number; name: string } | null
      }[]
    },
    refetchOnWindowFocus: true,
  })
}

export function useSupplier(id: number | null) {
  return useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => {
      const res = await suppliersApi.get(id!)
      return res.data
    },
    enabled: id !== null,
  })
}

export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FormData) => suppliersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormData }) => suppliersApi.update(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      qc.invalidateQueries({ queryKey: ['supplier', id] })
    },
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => suppliersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export function useOpexYtd(year: number) {
  return useQuery({
    queryKey: ['opex-ytd', year],
    queryFn: async () => {
      const res = await pageCountsApi.opexYtd(year)
      return res.data as { year: number; months_elapsed: number; fixed_cost_total: number; pages_cost_total: number; total: number }
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function usePageCounts(printerId: number | null) {
  return useQuery({
    queryKey: ['page-counts', printerId],
    queryFn: async () => {
      const res = await pageCountsApi.list(printerId!)
      return res.data as PrinterPageCount[]
    },
    enabled: printerId !== null,
  })
}

export function useCreatePageCount(printerId: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { count: number; logged_at: string; log_type?: string; notes?: string }) =>
      pageCountsApi.create(printerId!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['page-counts', printerId] }),
  })
}

export function useDeletePageCount(printerId: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (logId: number) => pageCountsApi.delete(printerId!, logId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['page-counts', printerId] }),
  })
}

export function useBudget(year: number) {
  return useQuery({
    queryKey: ['budgets', year],
    queryFn: async () => {
      const res = await budgetsApi.get(year)
      return res.data as { year: number; total: number; capex: number; opex: number; start_date?: string; end_date?: string }
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useBudgetHistory() {
  return useQuery({
    queryKey: ['budgets-history'],
    queryFn: async () => {
      const res = await budgetsApi.history()
      return res.data as number[]
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useActualSpend(year: number) {
  return useQuery({
    queryKey: ['budgets-actual', year],
    queryFn: async () => {
      const res = await budgetsApi.actual(year)
      return res.data as { year: number; actual: number }
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useUpsertBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { year: number; type: 'total' | 'capex' | 'opex'; amount: number; notes?: string; start_date?: string; end_date?: string }) =>
      budgetsApi.upsert(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] })
      qc.invalidateQueries({ queryKey: ['budgets-all'] })
      qc.invalidateQueries({ queryKey: ['budgets-history'] })
    },
  })
}

export function useBudgetBreakdown(year: number) {
  return useQuery({
    queryKey: ['budgets-breakdown', year],
    queryFn: async () => {
      const res = await budgetsApi.breakdown(year)
      return res.data as { year: number; categories: { category: string; short: string; budgeted: number; actual: number }[] }
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await usersApi.list()
      return res.data
    },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => usersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) => usersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useToggleUserStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => usersApi.toggleStatus(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useActivityLogs(params?: Record<string, unknown>) {
  return useQuery<{ data: ActivityLog[]; total: number; last_page: number; current_page: number }>({
    queryKey: ['activity-logs', params],
    queryFn: async () => {
      const res = await activityLogsApi.list(params)
      return res.data
    },
  })
}

export function useWorkOrders() {
  return useQuery<WorkOrder[]>({
    queryKey: ['work-orders'],
    queryFn: async () => {
      const res = await workOrdersApi.list()
      return res.data as WorkOrder[]
    },
  })
}

export function useCreateWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => workOrdersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-orders'] }),
  })
}

export function useUpdateWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) => workOrdersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-orders'] }),
  })
}

export function useDeleteWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => workOrdersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-orders'] }),
  })
}

export function useAllBudgets() {
  return useQuery({
    queryKey: ['budgets-all'],
    queryFn: async () => {
      const res = await budgetsApi.all()
      return res.data as { year: number; budget: number; actual: number; start_date?: string; end_date?: string }[]
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}
