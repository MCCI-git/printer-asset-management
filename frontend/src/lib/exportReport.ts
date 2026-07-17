import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Printer, Consumable, Supplier, Contract } from '@/types'
import { CURRENT_YEAR, CURRENT_MONTH, NEXT_YEAR } from '@/lib/timeline'

// ─── Helpers ────────────────────────────────────────────────────────────────

// PDF display: currency with Rs symbol and thousands separator
const fmt = (n: number) => `Rs ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
// CSV: plain number so Excel/Sheets treats it as numeric
const csvFmt = (n: number) => n.toFixed(2)
const pct = (a: number, b: number) => b === 0 ? 'N/A' : `${((a / b) * 100).toFixed(1)}%`
// CSV: percentage as plain decimal string without % symbol
const csvPct = (a: number, b: number) => b === 0 ? '' : ((a / b) * 100).toFixed(1)
const today = () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
const thisYear = CURRENT_YEAR
const nextYear = NEXT_YEAR

// ─── CSV builder ─────────────────────────────────────────────────────────────

function cell(v: unknown): string {
  const s = v == null ? '' : String(v)
  // Always quote: keeps every cell unambiguous regardless of content
  return `"${s.replace(/"/g, '""')}"`
}

function csvRow(values: string[]): string {
  return values.map(cell).join(',')
}

function csvSection(title: string, headers: string[], rows: string[][]): string {
  return [
    cell(title),
    csvRow(headers),
    ...rows.map(r => csvRow(r)),
    '',
    '',
  ].join('\n')
}

function csvHeader(reportTitle: string, subtitle: string): string {
  return [
    cell('PrinterAssets — ' + reportTitle),
    cell(subtitle),
    '',
    '',
  ].join('\n')
}

function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

// ─── PDF helpers ─────────────────────────────────────────────────────────────

const BRAND = [99, 102, 241] as [number, number, number]   // indigo-500
const WARN  = [245, 158, 11] as [number, number, number]   // amber-500
const GOOD  = [16, 185, 129] as [number, number, number]   // emerald-500
const MUTED = [107, 114, 128] as [number, number, number]  // gray-500

function pdfHeader(doc: jsPDF, title: string, subtitle: string) {
  // Top bar
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, 210, 18, 'F')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('PrinterAssets — Management Report', 14, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Generated: ${today()}`, 150, 12)

  // Title block
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 30)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(subtitle, 14, 37)

  return 44  // next Y
}

function pdfSectionTitle(doc: jsPDF, y: number, text: string): number {
  doc.setFillColor(243, 244, 246)
  doc.rect(14, y, 182, 7, 'F')
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(text.toUpperCase(), 16, y + 5)
  doc.setFont('helvetica', 'normal')
  return y + 10
}

function pdfKpiRow(doc: jsPDF, y: number, kpis: { label: string; value: string; color?: [number, number, number] }[]): number {
  const colW = 182 / kpis.length
  kpis.forEach((k, i) => {
    const x = 14 + i * colW
    doc.setFillColor(249, 250, 251)
    doc.rect(x, y, colW - 2, 16, 'F')
    doc.setTextColor(...(k.color ?? BRAND))
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(k.value, x + 3, y + 9)
    doc.setTextColor(...MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(k.label, x + 3, y + 14)
  })
  return y + 20
}

function pdfTable(doc: jsPDF, y: number, head: string[], rows: string[][], color = BRAND): number {
  autoTable(doc, {
    startY: y,
    head: [head],
    body: rows,
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: color, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 14, right: 14 },
  })
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
}

function pdfText(doc: jsPDF, y: number, text: string, color = MUTED as [number, number, number]): number {
  doc.setFontSize(8)
  doc.setTextColor(...color)
  doc.setFont('helvetica', 'normal')
  const lines = doc.splitTextToSize(text, 182)
  doc.text(lines, 14, y)
  return y + lines.length * 4.5 + 3
}

function pdfBullets(doc: jsPDF, y: number, bullets: { text: string; color?: [number, number, number] }[]): number {
  doc.setFontSize(8)
  for (const b of bullets) {
    doc.setTextColor(...(b.color ?? ([30, 30, 30] as [number, number, number])))
    doc.text('•', 16, y)
    const lines = doc.splitTextToSize(b.text, 175)
    doc.text(lines, 20, y)
    y += lines.length * 4.5 + 1
  }
  return y + 3
}

function newPage(doc: jsPDF, title: string): number {
  doc.addPage()
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, 210, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(`PrinterAssets — ${title}`, 14, 7)
  doc.text(`Page ${doc.getNumberOfPages()}`, 185, 7)
  return 16
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORT 1: Asset Inventory
// ═══════════════════════════════════════════════════════════════════════════

export function exportAssetInventory(format: 'csv' | 'pdf', printers: Printer[]) {
  const active      = printers.filter(p => p.status === 'active')
  const maintenance = printers.filter(p => p.status === 'maintenance')
  const retired     = printers.filter(p => p.status === 'retired')
  const capex       = printers.filter(p => p.cost_type === 'CAPEX')
  const opex        = printers.filter(p => p.cost_type === 'OPEX')
  const totalCapexCost  = capex.reduce((s, p) => s + (p.purchase_cost ?? 0), 0)
  const totalOpexMonthly = opex.reduce((s, p) => s + (p.monthly_fixed_cost ?? 0), 0)
  const overdueService  = printers.filter(p => p.next_service_date && new Date(p.next_service_date) < new Date())
  const utilizationRate = active.length / (printers.length || 1)

  // Flags / insights
  const flaws: string[] = []
  const strengths: string[] = []
  if (utilizationRate < 0.8) flaws.push(`Low fleet utilisation at ${pct(active.length, printers.length)} — ${maintenance.length + retired.length} assets are inactive. Review retirement or redeployment options.`)
  else strengths.push(`Strong fleet utilisation at ${pct(active.length, printers.length)}.`)
  if (overdueService.length > 0) flaws.push(`${overdueService.length} asset(s) are overdue for scheduled service. Unresolved maintenance increases risk of downtime and voided warranties.`)
  if (retired.length / (printers.length || 1) > 0.15) flaws.push(`Retired assets represent ${pct(retired.length, printers.length)} of the fleet. Consider formal disposal / write-off process to clean up records.`)
  if (capex.filter(p => !p.purchase_date).length > 0) flaws.push(`${capex.filter(p => !p.purchase_date).length} CAPEX asset(s) have no purchase date recorded — depreciation tracking is incomplete.`)
  if (printers.filter(p => !p.department).length > 3) flaws.push(`${printers.filter(p => !p.department).length} assets have no department assigned — cost allocation to business units will be inaccurate.`)
  strengths.push(`Fleet split: ${capex.length} CAPEX (owned) / ${opex.length} OPEX (managed service). CAPEX book value: ${fmt(totalCapexCost)}.`)
  strengths.push(`Total managed print monthly OPEX commitment: ${fmt(totalOpexMonthly)} (${fmt(totalOpexMonthly * 12)} annualised).`)

  if (format === 'csv') {
    let csv = csvHeader('Asset Inventory Report', `Generated: ${today()} | Fiscal Review Year: ${thisYear}`)
    csv += csvSection('EXECUTIVE SUMMARY — KEY METRICS', ['Metric', 'Value'], [
      ['Total Assets', String(printers.length)],
      ['Active', String(active.length)],
      ['In Maintenance', String(maintenance.length)],
      ['Retired / Lost', String(retired.length)],
      ['Fleet Utilisation (%)', csvPct(active.length, printers.length)],
      ['CAPEX Assets', String(capex.length)],
      ['OPEX Assets', String(opex.length)],
      ['Total CAPEX Book Value', csvFmt(totalCapexCost)],
      ['Monthly OPEX Commitment', csvFmt(totalOpexMonthly)],
      ['Annualised OPEX Cost', csvFmt(totalOpexMonthly * 12)],
      ['Assets Overdue Service', String(overdueService.length)],
    ])
    csv += csvSection('MANAGEMENT FLAGS', ['Type', 'Finding'], [
      ...flaws.map(f => ['ACTION REQUIRED', f]),
      ...strengths.map(s => ['STRENGTH', s]),
    ])
    csv += csvSection('FULL ASSET REGISTER', ['Asset Tag','Name','Model','Serial','Status','Cost Type','Department','Location','Assigned To','Purchase Cost','Purchase Date','Warranty','Last Service','Next Service','Service Count','Notes'], printers.map(p => [
      p.asset_tag, p.name, p.model ?? '', p.serial ?? '', p.status, p.cost_type,
      p.department ?? '', p.location ?? '', p.assigned_to ?? '',
      p.purchase_cost != null ? csvFmt(p.purchase_cost) : '',
      p.purchase_date ?? '', p.warranty ?? '',
      p.last_service_date ?? '', p.next_service_date ?? '',
      String(p.service_count), p.notes ?? '',
    ]))
    if (overdueService.length > 0) {
      csv += csvSection('OVERDUE SERVICE', ['Asset Tag','Name','Next Service Due','Service Count'], overdueService.map(p => [p.asset_tag, p.name, p.next_service_date ?? '', String(p.service_count)]))
    }
    downloadFile('Asset_Inventory_Report.csv', csv, 'text/csv;charset=utf-8;')
    return
  }

  // PDF
  const doc = new jsPDF()
  let y = pdfHeader(doc, 'Asset Inventory Report', `Fiscal Year ${thisYear} · Full fleet register with operational & financial analysis`)

  y = pdfSectionTitle(doc, y, 'Fleet Overview — Key Performance Indicators')
  y = pdfKpiRow(doc, y, [
    { label: 'Total Assets', value: String(printers.length) },
    { label: 'Active', value: String(active.length), color: GOOD },
    { label: 'In Maintenance', value: String(maintenance.length), color: WARN },
    { label: 'Utilisation Rate', value: pct(active.length, printers.length), color: utilizationRate >= 0.8 ? GOOD : WARN },
    { label: 'CAPEX / OPEX Split', value: `${capex.length} / ${opex.length}` },
  ])
  y = pdfKpiRow(doc, y, [
    { label: 'CAPEX Book Value', value: fmt(totalCapexCost), color: BRAND },
    { label: 'Monthly OPEX Cost', value: fmt(totalOpexMonthly), color: BRAND },
    { label: 'Annualised OPEX', value: fmt(totalOpexMonthly * 12), color: BRAND },
    { label: 'Overdue Services', value: String(overdueService.length), color: overdueService.length > 0 ? WARN : GOOD },
    { label: 'Retired Assets', value: String(retired.length) },
  ])

  y = pdfSectionTitle(doc, y, 'Management Findings')
  y = pdfBullets(doc, y, [
    ...flaws.map(f => ({ text: f, color: [180, 50, 50] as [number, number, number] })),
    ...strengths.map(s => ({ text: s, color: GOOD })),
  ])

  y = newPage(doc, 'Asset Inventory Report — Full Register')
  y = pdfSectionTitle(doc, y, 'Full Asset Register')
  y = pdfTable(doc, y, ['Asset Tag','Name','Status','Cost Model','Department','Location','Purchase Cost','Monthly OPEX Cost','Service Count'],
    printers.map(p => [p.asset_tag, p.name, p.status, p.cost_type, p.department ?? '—', p.location ?? '—', p.purchase_cost ? fmt(p.purchase_cost) : '—', p.monthly_fixed_cost ? fmt(p.monthly_fixed_cost) : '—', String(p.service_count)]))

  if (overdueService.length > 0) {
    y = pdfSectionTitle(doc, y, '⚠ Overdue Service — Immediate Action Required')
    y = pdfTable(doc, y, ['Asset Tag','Printer Name','Next Service Due Date','Location','Total Service Events'], overdueService.map(p => [p.asset_tag, p.name, p.next_service_date ?? '', p.location ?? '', String(p.service_count)]), WARN)
  }

  doc.save('Asset_Inventory_Report.pdf')
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORT 2: OPEX Monthly
// ═══════════════════════════════════════════════════════════════════════════

export function exportOpexMonthly(format: 'csv' | 'pdf', printers: Printer[]) {
  const opex = printers.filter(p => p.cost_type === 'OPEX')
  const totalMonthly = opex.reduce((s, p) => s + (p.monthly_fixed_cost ?? 0), 0)
  const totalAnnual  = totalMonthly * 12
  const avgPerPage   = opex.reduce((s, p) => s + (p.per_page_cost ?? 0), 0) / (opex.length || 1)
  const noPageCost   = opex.filter(p => !p.per_page_cost)
  const noMonthlyCost = opex.filter(p => !p.monthly_fixed_cost)
  const highCost     = opex.filter(p => (p.monthly_fixed_cost ?? 0) > totalMonthly / (opex.length || 1) * 1.5)

  const flaws: string[] = []
  const strengths: string[] = []
  if (noPageCost.length > 0) flaws.push(`${noPageCost.length} OPEX asset(s) missing per-page cost — true cost-per-page analysis is incomplete. Obtain rates from supplier contracts.`)
  if (noMonthlyCost.length > 0) flaws.push(`${noMonthlyCost.length} OPEX asset(s) have no monthly fixed cost recorded — OPEX budget accuracy is impaired.`)
  if (highCost.length > 0) flaws.push(`${highCost.length} asset(s) cost >150% of fleet average monthly (${fmt(totalMonthly / (opex.length || 1))}). Review contract terms for renegotiation.`)
  strengths.push(`Total managed OPEX fleet: ${opex.length} devices at ${fmt(totalMonthly)}/month (${fmt(totalAnnual)}/year).`)
  if (avgPerPage > 0) strengths.push(`Fleet average per-page cost: $${avgPerPage.toFixed(4)} — benchmark against industry standard of $0.01–$0.03 per page.`)

  // Budget forecast
  const forecast = totalAnnual * 1.05  // assume 5% CPI increase

  if (format === 'csv') {
    let csv = csvHeader('OPEX Monthly Report', `Generated: ${today()} | Review Period: ${thisYear}`)
    csv += csvSection('FINANCIAL SUMMARY', ['Metric','Value'], [
      ['OPEX Devices', String(opex.length)],
      ['Total Monthly Cost', csvFmt(totalMonthly)],
      [`${thisYear} Annualised Cost`, csvFmt(totalAnnual)],
      [`${nextYear} Forecast (+5% CPI)`, csvFmt(forecast)],
      ['Avg Monthly Cost / Device', csvFmt(totalMonthly / (opex.length || 1))],
      ['Fleet Avg Per-Page Cost', avgPerPage > 0 ? avgPerPage.toFixed(4) : ''],
      ['Devices Missing Page Cost', String(noPageCost.length)],
    ])
    csv += csvSection('MANAGEMENT FLAGS', ['Type','Finding'], [
      ...flaws.map(f => ['ACTION REQUIRED', f]),
      ...strengths.map(s => ['STRENGTH', s]),
    ])
    csv += csvSection('OPEX DEVICE DETAIL', ['Asset Tag','Name','Location','Monthly Cost','Annual Cost','Per-Page Cost','Status'], opex.map(p => [
      p.asset_tag, p.name, p.location ?? '',
      p.monthly_fixed_cost ? csvFmt(p.monthly_fixed_cost) : '',
      p.monthly_fixed_cost ? csvFmt(p.monthly_fixed_cost * 12) : '',
      p.per_page_cost ? p.per_page_cost.toFixed(4) : '',
      p.status,
    ]))
    if (highCost.length > 0) {
      csv += csvSection('HIGH-COST OUTLIERS', ['Asset Tag','Printer Name','Monthly Cost','Premium vs Fleet Average (%)'], highCost.map(p => [p.asset_tag, p.name, csvFmt(p.monthly_fixed_cost ?? 0), (((p.monthly_fixed_cost ?? 0) / (totalMonthly / opex.length) - 1) * 100).toFixed(1)]))
    }
    downloadFile('OPEX_Monthly_Report.csv', csv, 'text/csv;charset=utf-8;')
    return
  }

  const doc = new jsPDF()
  let y = pdfHeader(doc, 'OPEX Monthly Report', `Managed Print Cost Analysis · ${thisYear} Review & ${nextYear} Budget Forecast`)

  y = pdfSectionTitle(doc, y, 'Financial KPIs')
  y = pdfKpiRow(doc, y, [
    { label: 'OPEX Devices', value: String(opex.length) },
    { label: 'Monthly Cost', value: fmt(totalMonthly), color: BRAND },
    { label: `${thisYear} Annual Cost`, value: fmt(totalAnnual), color: BRAND },
    { label: `${nextYear} Forecast`, value: fmt(forecast), color: WARN },
    { label: 'Avg Per-Page Cost', value: avgPerPage > 0 ? `$${avgPerPage.toFixed(4)}` : 'Incomplete' },
  ])

  y = pdfSectionTitle(doc, y, 'Management Findings & Budget Guidance')
  y = pdfBullets(doc, y, [
    ...flaws.map(f => ({ text: f, color: [180, 50, 50] as [number, number, number] })),
    ...strengths.map(s => ({ text: s, color: GOOD })),
    { text: `${nextYear} Budget Recommendation: Provision ${fmt(forecast)} for managed print OPEX, incorporating a 5% CPI/contract uplift assumption. Re-tender contracts >3 years old.`, color: BRAND },
  ])

  y = pdfSectionTitle(doc, y, 'OPEX Device Register')
  y = pdfTable(doc, y, ['Asset Tag','Name','Location','Monthly Cost','Annual Cost','Per-Page Cost','Status'],
    opex.map(p => [p.asset_tag, p.name, p.location ?? '—', p.monthly_fixed_cost ? fmt(p.monthly_fixed_cost) : '⚠ MISSING', p.monthly_fixed_cost ? fmt(p.monthly_fixed_cost * 12) : '—', p.per_page_cost ? `$${p.per_page_cost.toFixed(4)}` : '⚠ MISSING', p.status]))

  if (highCost.length > 0) {
    y = pdfSectionTitle(doc, y, '⚠ High-Cost Outliers — Renegotiation Candidates')
    y = pdfTable(doc, y, ['Asset Tag','Printer Name','Monthly Cost','Premium vs Fleet Average'], highCost.map(p => [p.asset_tag, p.name, fmt(p.monthly_fixed_cost ?? 0), `+${(((p.monthly_fixed_cost ?? 0) / (totalMonthly / opex.length) - 1) * 100).toFixed(0)}%`]), WARN)
  }

  doc.save('OPEX_Monthly_Report.pdf')
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORT 3: Consumable Usage
// ═══════════════════════════════════════════════════════════════════════════

export function exportConsumableUsage(format: 'csv' | 'pdf', consumables: Consumable[]) {
  const lowStock  = consumables.filter(c => c.quantity <= c.low_stock_threshold && c.quantity > 0)
  const outOfStock = consumables.filter(c => c.quantity === 0)
  const totalValue = consumables.reduce((s, c) => s + c.unit_cost * c.quantity, 0)
  const byType = ['Toner', 'Paper', 'Drum', 'Waste', 'Maintenance Kit'].map(t => ({
    type: t,
    count: consumables.filter(c => c.type === t).length,
    value: consumables.filter(c => c.type === t).reduce((s, c) => s + c.unit_cost * c.quantity, 0),
  }))
  const unassigned = consumables.filter(c => !c.printer_id)
  const noSupplier = consumables.filter(c => !c.supplier_id)

  const flaws: string[] = []
  const strengths: string[] = []
  if (outOfStock.length > 0) flaws.push(`${outOfStock.length} consumable(s) are completely out of stock — operational risk is HIGH. Immediate reorder required.`)
  if (lowStock.length > 0) flaws.push(`${lowStock.length} consumable(s) are below reorder threshold. Place orders within 5 business days to avoid stockout.`)
  if (noSupplier.length > 0) flaws.push(`${noSupplier.length} consumable(s) have no supplier linked — procurement cannot be automated or audited.`)
  if (unassigned.length > consumables.length * 0.3) flaws.push(`${unassigned.length} consumable(s) (${pct(unassigned.length, consumables.length)}) are unassigned to any printer — inventory control and cost allocation is weak.`)
  strengths.push(`Total consumable stock value on hand: ${fmt(totalValue)}.`)
  if (outOfStock.length === 0 && lowStock.length === 0) strengths.push('All consumables are adequately stocked above threshold levels.')

  if (format === 'csv') {
    let csv = csvHeader('Consumable Usage Report', `Generated: ${today()} | Review Period: ${thisYear}`)
    csv += csvSection('STOCK HEALTH SUMMARY', ['Metric','Value'], [
      ['Total SKUs', String(consumables.length)],
      ['Out of Stock', String(outOfStock.length)],
      ['Low Stock (Below Threshold)', String(lowStock.length)],
      ['Total Stock Value on Hand', csvFmt(totalValue)],
      ['Unassigned to Printer', String(unassigned.length)],
      ['No Supplier Linked', String(noSupplier.length)],
    ])
    csv += csvSection('STOCK BY TYPE', ['Type','SKUs','Stock Value'], byType.map(b => [b.type, String(b.count), csvFmt(b.value)]))
    csv += csvSection('MANAGEMENT FLAGS', ['Type','Finding'], [
      ...flaws.map(f => ['ACTION REQUIRED', f]),
      ...strengths.map(s => ['STRENGTH', s]),
    ])
    if (outOfStock.length > 0) csv += csvSection('OUT OF STOCK', ['SKU','Name','Type','Unit Cost','Assigned Printer'], outOfStock.map(c => [c.sku, c.name, c.type, csvFmt(c.unit_cost), c.printer?.name ?? '']))
    if (lowStock.length > 0) csv += csvSection('LOW STOCK', ['SKU','Consumable Name','Type','Current Quantity','Reorder Threshold','Unit Cost'], lowStock.map(c => [c.sku, c.name, c.type, String(c.quantity), String(c.low_stock_threshold), csvFmt(c.unit_cost)]))
    csv += csvSection('FULL CONSUMABLE REGISTER', ['SKU','Consumable Name','Type','Unit Cost','Quantity on Hand','Reorder Threshold','Total Stock Value','Supplier','Assigned Printer'], consumables.map(c => [c.sku, c.name, c.type, csvFmt(c.unit_cost), String(c.quantity), String(c.low_stock_threshold), csvFmt(c.unit_cost * c.quantity), c.supplier?.name ?? '', c.printer?.name ?? '']))
    downloadFile('Consumable_Usage_Report.csv', csv, 'text/csv;charset=utf-8;')
    return
  }

  const doc = new jsPDF()
  let y = pdfHeader(doc, 'Consumable Usage Report', `Stock Health, Cost Tracking & Procurement Flags · ${today()}`)

  y = pdfSectionTitle(doc, y, 'Stock Health KPIs')
  y = pdfKpiRow(doc, y, [
    { label: 'Total SKUs', value: String(consumables.length) },
    { label: 'Out of Stock', value: String(outOfStock.length), color: outOfStock.length > 0 ? ([220, 38, 38] as [number, number, number]) : GOOD },
    { label: 'Low Stock', value: String(lowStock.length), color: lowStock.length > 0 ? WARN : GOOD },
    { label: 'Stock Value on Hand', value: fmt(totalValue), color: BRAND },
    { label: 'Unassigned', value: String(unassigned.length), color: unassigned.length > 3 ? WARN : GOOD },
  ])

  y = pdfSectionTitle(doc, y, 'Stock by Consumable Type')
  y = pdfTable(doc, y, ['Type', 'SKU Count', 'Stock Value'], byType.filter(b => b.count > 0).map(b => [b.type, String(b.count), fmt(b.value)]))

  y = pdfSectionTitle(doc, y, 'Management Findings')
  y = pdfBullets(doc, y, [
    ...flaws.map(f => ({ text: f, color: [180, 50, 50] as [number, number, number] })),
    ...strengths.map(s => ({ text: s, color: GOOD })),
  ])

  if (outOfStock.length > 0 || lowStock.length > 0) {
    y = newPage(doc, 'Consumable Usage Report — Action Items')
    if (outOfStock.length > 0) {
      y = pdfSectionTitle(doc, y, '⚠ Out of Stock — Immediate Reorder Required')
      y = pdfTable(doc, y, ['SKU','Name','Type','Unit Cost','Assigned Printer'], outOfStock.map(c => [c.sku, c.name, c.type, fmt(c.unit_cost), c.printer?.name ?? 'Unassigned']), [220, 38, 38])
    }
    if (lowStock.length > 0) {
      y = pdfSectionTitle(doc, y, '⚠ Low Stock — Order Within 5 Business Days')
      y = pdfTable(doc, y, ['SKU','Consumable Name','Current Quantity','Reorder Threshold','Unit Cost'], lowStock.map(c => [c.sku, c.name, String(c.quantity), String(c.low_stock_threshold), fmt(c.unit_cost)]), WARN)
    }
  }

  y = newPage(doc, 'Consumable Usage Report — Full Register')
  y = pdfSectionTitle(doc, y, 'Full Consumable Register')
  pdfTable(doc, y, ['SKU','Consumable Name','Type','Unit Cost','Quantity','Total Stock Value','Supplier','Assigned Printer'], consumables.map(c => [c.sku, c.name, c.type, fmt(c.unit_cost), String(c.quantity), fmt(c.unit_cost * c.quantity), c.supplier?.name ?? '—', c.printer?.name ?? '—']))

  doc.save('Consumable_Usage_Report.pdf')
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORT 4: Supplier Spend
// ═══════════════════════════════════════════════════════════════════════════

export function exportSupplierSpend(format: 'csv' | 'pdf', suppliers: Supplier[]) {
  const totalYtd   = suppliers.reduce((s, x) => s + x.spend_2025_ytd, 0)
  const totalBudget = suppliers.reduce((s, x) => s + x.budget_2025, 0)
  const total2024  = suppliers.reduce((s, x) => s + x.spend_2024, 0)
  const total2023  = suppliers.reduce((s, x) => s + x.spend_2023, 0)
  const yoyChange  = total2024 > 0 ? ((total2023 > 0 ? total2024 - total2023 : 0) / total2023) * 100 : 0
  const overBudget = suppliers.filter(s => s.spend_2025_ytd > s.budget_2025)
  const underRated = suppliers.filter(s => s.rating < 3)
  const monthsElapsed = CURRENT_MONTH
  const monthlyBurnRate = totalYtd / monthsElapsed
  const forecastFY = monthlyBurnRate * 12
  const nextYearForecast = forecastFY * 1.04  // 4% uplift

  const flaws: string[] = []
  const strengths: string[] = []
  if (overBudget.length > 0) flaws.push(`${overBudget.length} supplier(s) have exceeded their ${thisYear} budget. Total over-run: ${fmt(overBudget.reduce((s, x) => s + (x.spend_2025_ytd - x.budget_2025), 0))}. Approval required for budget amendment.`)
  if (underRated.length > 0) flaws.push(`${underRated.length} supplier(s) rated below 3/5: ${underRated.map(s => s.name).join(', ')}. Review SLAs or initiate re-tender.`)
  if (forecastFY > totalBudget) flaws.push(`Current YTD burn rate (${fmt(monthlyBurnRate)}/month) projects a full-year spend of ${fmt(forecastFY)}, exceeding the ${thisYear} budget of ${fmt(totalBudget)} by ${fmt(forecastFY - totalBudget)}.`)
  strengths.push(`YTD supplier spend: ${fmt(totalYtd)} against a ${thisYear} budget of ${fmt(totalBudget)} (${pct(totalYtd, totalBudget)} consumed).`)
  if (yoyChange !== 0) strengths.push(`2023→2024 total supplier spend change: ${yoyChange > 0 ? '+' : ''}${yoyChange.toFixed(1)}%. Monitor trajectory for ${thisYear}.`)

  const rows = [...suppliers].sort((a, b) => b.spend_2025_ytd - a.spend_2025_ytd)

  if (format === 'csv') {
    let csv = csvHeader('Supplier Spend Report', `Generated: ${today()} | Review Period: ${thisYear}`)
    csv += csvSection('SPEND SUMMARY', ['Metric','Value'], [
      ['Total Suppliers', String(suppliers.length)],
      ['YTD Spend', csvFmt(totalYtd)],
      [`${thisYear} Budget`, csvFmt(totalBudget)],
      ['Budget Consumed (%)', csvPct(totalYtd, totalBudget)],
      [`${thisYear} Full-Year Forecast`, csvFmt(forecastFY)],
      [`${nextYear} Budget Recommendation`, csvFmt(nextYearForecast)],
      ['Suppliers Over Budget', String(overBudget.length)],
      ['Suppliers Rated Below 3', String(underRated.length)],
      ['2023 Total Spend', csvFmt(total2023)],
      ['2024 Total Spend', csvFmt(total2024)],
      ['YoY Change 2023 to 2024 (%)', yoyChange.toFixed(1)],
    ])
    csv += csvSection('MANAGEMENT FLAGS', ['Type','Finding'], [
      ...flaws.map(f => ['ACTION REQUIRED', f]),
      ...strengths.map(s => ['STRENGTH', s]),
    ])
    csv += csvSection('SUPPLIER SPEND REGISTER', ['Supplier Name','Rating','Spend FY2023','Spend FY2024','YTD Spend','Approved Budget','Budget Variance','Full-Year Forecast'], rows.map(s => [s.name, String(s.rating), csvFmt(s.spend_2023), csvFmt(s.spend_2024), csvFmt(s.spend_2025_ytd), csvFmt(s.budget_2025), csvFmt(s.spend_2025_ytd - s.budget_2025), csvFmt(s.spend_2025_ytd / monthsElapsed * 12)]))
    downloadFile('Supplier_Spend_Report.csv', csv, 'text/csv;charset=utf-8;')
    return
  }

  const doc = new jsPDF()
  let y = pdfHeader(doc, 'Supplier Spend Report', `YTD Spend vs Budget Analysis · ${thisYear} Review & ${nextYear} Forecast`)

  y = pdfSectionTitle(doc, y, 'Financial KPIs')
  y = pdfKpiRow(doc, y, [
    { label: 'Total Suppliers', value: String(suppliers.length) },
    { label: 'YTD Spend', value: fmt(totalYtd), color: BRAND },
    { label: `${thisYear} Budget`, value: fmt(totalBudget) },
    { label: 'Budget Consumed', value: pct(totalYtd, totalBudget), color: totalYtd > totalBudget ? ([220, 38, 38] as [number, number, number]) : GOOD },
    { label: `${thisYear} FY Forecast`, value: fmt(forecastFY), color: forecastFY > totalBudget ? WARN : GOOD },
  ])
  y = pdfKpiRow(doc, y, [
    { label: '2023 Total Spend', value: fmt(total2023) },
    { label: '2024 Total Spend', value: fmt(total2024) },
    { label: 'YoY Change', value: `${yoyChange > 0 ? '+' : ''}${yoyChange.toFixed(1)}%` },
    { label: 'Over Budget Suppliers', value: String(overBudget.length), color: overBudget.length > 0 ? WARN : GOOD },
    { label: `${nextYear} Budget Rec.`, value: fmt(nextYearForecast), color: BRAND },
  ])

  y = pdfSectionTitle(doc, y, 'Management Findings & Budget Recommendation')
  y = pdfBullets(doc, y, [
    ...flaws.map(f => ({ text: f, color: [180, 50, 50] as [number, number, number] })),
    ...strengths.map(s => ({ text: s, color: GOOD })),
    { text: `${nextYear} Budget Recommendation: ${fmt(nextYearForecast)} (+4% uplift). Re-tender any supplier rated below 3/5 prior to next renewal.`, color: BRAND },
  ])

  y = pdfSectionTitle(doc, y, 'Supplier Register — Ranked by YTD Spend')
  pdfTable(doc, y, ['Supplier Name','Rating (out of 5)','Spend FY2023','Spend FY2024','YTD Spend 2025','Approved Budget 2025','Budget Variance'], rows.map(s => [s.name, `${s.rating}/5`, fmt(s.spend_2023), fmt(s.spend_2024), fmt(s.spend_2025_ytd), fmt(s.budget_2025), fmt(s.spend_2025_ytd - s.budget_2025)]))

  doc.save('Supplier_Spend_Report.pdf')
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORT 5: Maintenance History
// ═══════════════════════════════════════════════════════════════════════════

export function exportMaintenanceHistory(format: 'csv' | 'pdf', printers: Printer[]) {
  const serviced   = printers.filter(p => p.last_service_date)
  const overdue    = printers.filter(p => p.next_service_date && new Date(p.next_service_date) < new Date())
  const neverServiced = printers.filter(p => !p.last_service_date && p.status === 'active')
  const highService = printers.filter(p => p.service_count >= 3)
  const avgService = printers.reduce((s, p) => s + p.service_count, 0) / (printers.length || 1)
  const maintenance = printers.filter(p => p.status === 'maintenance')

  const flaws: string[] = []
  const strengths: string[] = []
  if (overdue.length > 0) flaws.push(`${overdue.length} asset(s) are past their scheduled service date — warranty may be voided and downtime risk is elevated.`)
  if (neverServiced.length > 0) flaws.push(`${neverServiced.length} active asset(s) have no recorded service history — either service records are missing or preventative maintenance has not been performed.`)
  if (highService.length > 0) flaws.push(`${highService.length} asset(s) have 3+ service events. These are candidates for cost-benefit analysis: repair vs replace.`)
  if (maintenance.length > 0) flaws.push(`${maintenance.length} asset(s) currently in maintenance status. Track resolution time to measure impact on fleet availability.`)
  if (overdue.length === 0) strengths.push('No assets are currently overdue for service — maintenance schedule is up to date.')
  strengths.push(`Fleet average service count: ${avgService.toFixed(1)} events. ${serviced.length} assets have at least one recorded service.`)

  const sorted = [...printers].sort((a, b) => b.service_count - a.service_count)

  if (format === 'csv') {
    let csv = csvHeader('Maintenance History Report', `Generated: ${today()} | Review Period: ${thisYear}`)
    csv += csvSection('MAINTENANCE SUMMARY', ['Metric','Value'], [
      ['Total Assets', String(printers.length)],
      ['Assets with Service History', String(serviced.length)],
      ['Active — Never Serviced', String(neverServiced.length)],
      ['Currently in Maintenance', String(maintenance.length)],
      ['Overdue for Service', String(overdue.length)],
      ['High-Service Assets (3+ events)', String(highService.length)],
      ['Fleet Avg Service Count', avgService.toFixed(1)],
    ])
    csv += csvSection('MANAGEMENT FLAGS', ['Type','Finding'], [
      ...flaws.map(f => ['ACTION REQUIRED', f]),
      ...strengths.map(s => ['STRENGTH', s]),
    ])
    if (overdue.length > 0) csv += csvSection('OVERDUE SERVICE', ['Asset Tag','Name','Next Service Due','Last Serviced','Service Count'], overdue.map(p => [p.asset_tag, p.name, p.next_service_date ?? '', p.last_service_date ?? '', String(p.service_count)]))
    csv += csvSection('FULL MAINTENANCE REGISTER', ['Asset Tag','Printer Name','Operational Status','Last Service Date','Next Scheduled Service','Total Service Events','Notes'], sorted.map(p => [p.asset_tag, p.name, p.status, p.last_service_date ?? '', p.next_service_date ?? '', String(p.service_count), p.notes ?? '']))
    downloadFile('Maintenance_History_Report.csv', csv, 'text/csv;charset=utf-8;')
    return
  }

  const doc = new jsPDF()
  let y = pdfHeader(doc, 'Maintenance History Report', `Service Records, Overdue Assets & Repair vs Replace Analysis · ${thisYear}`)

  y = pdfSectionTitle(doc, y, 'Maintenance KPIs')
  y = pdfKpiRow(doc, y, [
    { label: 'Total Assets', value: String(printers.length) },
    { label: 'Serviced (Ever)', value: String(serviced.length) },
    { label: 'Never Serviced (Active)', value: String(neverServiced.length), color: neverServiced.length > 0 ? WARN : GOOD },
    { label: 'Overdue', value: String(overdue.length), color: overdue.length > 0 ? ([220, 38, 38] as [number, number, number]) : GOOD },
    { label: 'Avg Service Count', value: avgService.toFixed(1) },
  ])

  y = pdfSectionTitle(doc, y, 'Management Findings')
  y = pdfBullets(doc, y, [
    ...flaws.map(f => ({ text: f, color: [180, 50, 50] as [number, number, number] })),
    ...strengths.map(s => ({ text: s, color: GOOD })),
  ])

  if (overdue.length > 0) {
    y = pdfSectionTitle(doc, y, '⚠ Overdue Service — Immediate Action')
    y = pdfTable(doc, y, ['Asset Tag','Printer Name','Overdue Since (Scheduled Date)','Last Service Date','Total Service Events'], overdue.map(p => [p.asset_tag, p.name, p.next_service_date ?? '', p.last_service_date ?? 'Never', String(p.service_count)]), WARN)
  }

  y = pdfSectionTitle(doc, y, 'Full Maintenance Register')
  pdfTable(doc, y, ['Asset Tag','Printer Name','Operational Status','Last Service Date','Next Scheduled Service','Total Service Events'], sorted.map(p => [p.asset_tag, p.name, p.status, p.last_service_date ?? '—', p.next_service_date ?? 'Not scheduled', String(p.service_count)]))

  doc.save('Maintenance_History_Report.pdf')
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORT 6: OPEX YTD
// ═══════════════════════════════════════════════════════════════════════════

export function exportOpexYtd(
  format: 'csv' | 'pdf',
  contracts: Contract[],
  budgets: { year: number; budget: number; actual: number }[],
  printers: Printer[],
  consumables: Consumable[],
) {
  const activeContracts = contracts.filter(c => c.status === 'active')
  const expiringContracts = contracts.filter(c => {
    const end = new Date(c.end_date)
    const diff = (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 90
  })
  const totalContractCost = activeContracts.reduce((s, c) => s + c.annual_cost, 0)
  const opexPrinters = printers.filter(p => p.cost_type === 'OPEX')
  const monthlyOpex = opexPrinters.reduce((s, p) => s + (p.monthly_fixed_cost ?? 0), 0)
  const consumableValue = consumables.reduce((s, c) => s + c.unit_cost * c.quantity, 0)
  const monthsElapsed = CURRENT_MONTH
  const ytdOpex = monthlyOpex * monthsElapsed
  const totalYtdOpex = ytdOpex + totalContractCost
  const currentBudget = budgets.find(b => b.year === thisYear)
  const budgetVariance = currentBudget ? currentBudget.budget - currentBudget.actual : null
  const forecastFY = monthlyOpex * 12 + totalContractCost
  const nextYearForecast = forecastFY * 1.05

  const flaws: string[] = []
  const strengths: string[] = []
  if (expiringContracts.length > 0) flaws.push(`${expiringContracts.length} contract(s) expire within 90 days. Begin renewal or re-tender immediately to avoid service gaps.`)
  if (currentBudget && currentBudget.actual > currentBudget.budget) flaws.push(`${thisYear} actual spend (${fmt(currentBudget.actual)}) exceeds approved budget (${fmt(currentBudget.budget)}) by ${fmt(currentBudget.actual - currentBudget.budget)}. Finance sign-off required.`)
  if (budgetVariance !== null && budgetVariance > 0) strengths.push(`${thisYear} spend is ${fmt(budgetVariance)} under budget (${pct(budgetVariance, currentBudget?.budget ?? 1)} saving) — strong financial control.`)
  strengths.push(`Active contract portfolio: ${activeContracts.length} contracts totalling ${fmt(totalContractCost)}/year.`)
  if (consumableValue > 0) strengths.push(`Consumable inventory on hand valued at ${fmt(consumableValue)} — reduces short-term procurement exposure.`)

  const sortedBudgets = [...budgets].sort((a, b) => a.year - b.year)

  if (format === 'csv') {
    let csv = csvHeader('OPEX Report (Year-to-Date)', `Generated: ${today()} | Review Period: ${thisYear} | Forecast: ${nextYear}`)
    csv += csvSection('FINANCIAL POSITION', ['Component','Value'], [
      [`Active Contracts (${thisYear} Annual)`, csvFmt(totalContractCost)],
      [`Managed Print OPEX (${monthsElapsed}m YTD)`, csvFmt(ytdOpex)],
      ['Consumable Inventory Value', csvFmt(consumableValue)],
      ['Combined YTD OPEX Exposure', csvFmt(totalYtdOpex)],
      ...(currentBudget ? [
        [`${thisYear} Approved Budget`, csvFmt(currentBudget.budget)],
        [`${thisYear} Actual Spend`, csvFmt(currentBudget.actual)],
        ['Budget Variance', csvFmt((currentBudget.budget ?? 0) - (currentBudget.actual ?? 0))],
      ] : []),
      [`${thisYear} Full-Year Forecast`, csvFmt(forecastFY)],
      [`${nextYear} Budget Recommendation`, csvFmt(nextYearForecast)],
    ])
    csv += csvSection('MANAGEMENT FLAGS', ['Type','Finding'], [
      ...flaws.map(f => ['ACTION REQUIRED', f]),
      ...strengths.map(s => ['STRENGTH', s]),
    ])
    csv += csvSection('BUDGET HISTORY', ['Year','Approved Budget','Actual Spend','Variance','Variance (%)'], sortedBudgets.map(b => [String(b.year), csvFmt(b.budget), csvFmt(b.actual), csvFmt(b.budget - b.actual), csvPct(Math.abs(b.budget - b.actual), b.budget)]))
    csv += csvSection('ACTIVE CONTRACTS', ['Contract','Vendor','Type','Annual Cost','Start Date','End Date','Status'], activeContracts.map(c => [c.name, c.vendor, c.type, csvFmt(c.annual_cost), c.start_date, c.end_date, c.status]))
    if (expiringContracts.length > 0) csv += csvSection('EXPIRING WITHIN 90 DAYS', ['Contract','Vendor','Annual Cost','Expiry Date'], expiringContracts.map(c => [c.name, c.vendor, csvFmt(c.annual_cost), c.end_date]))
    downloadFile('OPEX_YTD_Report.csv', csv, 'text/csv;charset=utf-8;')
    return
  }

  const doc = new jsPDF()
  let y = pdfHeader(doc, 'OPEX Report — Year to Date', `Full OPEX Position, Budget vs Actual & ${nextYear} Forecast · ${thisYear}`)

  y = pdfSectionTitle(doc, y, 'Financial Position')
  y = pdfKpiRow(doc, y, [
    { label: 'Contract Portfolio (Annual)', value: fmt(totalContractCost), color: BRAND },
    { label: `Managed Print YTD (${monthsElapsed}m)`, value: fmt(ytdOpex), color: BRAND },
    { label: 'Consumable Inventory Value', value: fmt(consumableValue) },
    { label: `${thisYear} FY Forecast`, value: fmt(forecastFY), color: WARN },
    { label: `${nextYear} Budget Recommendation`, value: fmt(nextYearForecast), color: BRAND },
  ])

  if (currentBudget) {
    y = pdfKpiRow(doc, y, [
      { label: `${thisYear} Approved Budget`, value: fmt(currentBudget.budget) },
      { label: `${thisYear} Actual Spend`, value: fmt(currentBudget.actual), color: currentBudget.actual > currentBudget.budget ? ([220, 38, 38] as [number, number, number]) : GOOD },
      { label: 'Budget Variance', value: fmt(currentBudget.budget - currentBudget.actual), color: currentBudget.budget > currentBudget.actual ? GOOD : ([220, 38, 38] as [number, number, number]) },
      { label: 'Contracts Expiring (90d)', value: String(expiringContracts.length), color: expiringContracts.length > 0 ? WARN : GOOD },
      { label: 'Active Contracts', value: String(activeContracts.length) },
    ])
  }

  y = pdfSectionTitle(doc, y, 'Management Findings & Budget Guidance')
  y = pdfBullets(doc, y, [
    ...flaws.map(f => ({ text: f, color: [180, 50, 50] as [number, number, number] })),
    ...strengths.map(s => ({ text: s, color: GOOD })),
    { text: `${nextYear} Budget Recommendation: ${fmt(nextYearForecast)} — includes a 5% uplift for inflation and contract renewals. Re-tender expiring contracts before finalising the ${nextYear} budget.`, color: BRAND },
  ])

  y = pdfSectionTitle(doc, y, 'Budget History — Actual vs Approved')
  y = pdfTable(doc, y, ['Year','Approved Budget','Actual Spend','Variance'], sortedBudgets.map(b => [String(b.year), fmt(b.budget), fmt(b.actual), fmt(b.budget - b.actual)]))

  y = pdfSectionTitle(doc, y, 'Active Contract Register')
  y = pdfTable(doc, y, ['Contract Name','Vendor / Supplier','Contract Type','Annual Cost','Contract End Date'], activeContracts.map(c => [c.name, c.vendor, c.type, fmt(c.annual_cost), c.end_date]))

  if (expiringContracts.length > 0) {
    y = pdfSectionTitle(doc, y, '⚠ Contracts Expiring Within 90 Days')
    pdfTable(doc, y, ['Contract Name','Vendor / Supplier','Annual Cost','Expiry Date'], expiringContracts.map(c => [c.name, c.vendor, fmt(c.annual_cost), c.end_date]), WARN)
  }

  doc.save('OPEX_YTD_Report.pdf')
}
