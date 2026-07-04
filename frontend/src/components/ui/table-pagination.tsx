import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

interface TablePaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  totalRows?: number
  pageSize?: number
  onPageSizeChange?: (size: number) => void
}

export function TablePagination({
  page, pageCount, onPageChange, totalRows, pageSize = 10, onPageSizeChange,
}: TablePaginationProps) {
  const go = (p: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    if (p >= 0 && p < pageCount) onPageChange(p)
  }

  const pages = buildPageNumbers(page, pageCount)

  const start = totalRows != null ? page * pageSize + 1 : null
  const end   = totalRows != null ? Math.min((page + 1) * pageSize, totalRows) : null

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
      <div className="flex items-center gap-3">
        {totalRows != null && start != null && end != null && (
          <p className="text-xs text-muted-foreground">
            {start}–{end} of {totalRows}
          </p>
        )}

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <select
              value={pageSize}
              onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(0) }}
              className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {PAGE_SIZE_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {pageCount > 1 && (
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" onClick={go(page - 1)} className={page === 0 ? 'pointer-events-none opacity-40' : ''} />
            </PaginationItem>

            {pages.map((p, i) =>
              p === '...' ? (
                <PaginationItem key={`ellipsis-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink href="#" isActive={p === page} onClick={go(p as number)}>
                    {(p as number) + 1}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext href="#" onClick={go(page + 1)} className={page === pageCount - 1 ? 'pointer-events-none opacity-40' : ''} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const pages: (number | '...')[] = []
  pages.push(0)
  if (current > 3) pages.push('...')
  for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) pages.push(i)
  if (current < total - 4) pages.push('...')
  pages.push(total - 1)
  return pages
}
