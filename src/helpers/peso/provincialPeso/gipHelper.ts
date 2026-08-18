import type { ChartConfig } from '@/components/ui/chart'
import { VisDonutSelectors } from '@unovis/vue'
import type {
  GenderDataPoint,
  GipInternRecord,
  LpiiCategory,
  LpiiCategoryConfig,
  LpiiDataPoint,
} from '@/types/peso/provincialPeso/gip'

// ─── LPII Visual & Theme Configurations ───
export const LPII_CONFIG: Record<LpiiCategory, LpiiCategoryConfig> = {
  LOWLAND: {
    label: 'Lowland',
    color: '#10b981', // Emerald 500
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  UPLAND: {
    label: 'Upland',
    color: '#f59e0b', // Amber 500
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  WETLAND: {
    label: 'Wetland',
    color: '#0ea5e9', // Sky 500
    bgClass: 'bg-sky-500/10',
    textClass: 'text-sky-600 dark:text-sky-400',
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  },
}

// ─── Chart Configs (PGAS & DOLE) ───
export const pgasChartConfig: ChartConfig = {
  male: {
    label: 'Male',
    color: '#2563eb',
  },
  female: {
    label: 'Female',
    color: '#dc14ea',
  },
}

export const doleChartConfig: ChartConfig = {
  male: {
    label: 'Male',
    color: '#2563eb',
  },
  female: {
    label: 'Female',
    color: '#dc14ea',
  },
}

// ─── Unovis Chart Axis & Tooltip Formatters ───
export const formatTickYear = (dataList: GenderDataPoint[]) => (i: number): string => {
  const item = dataList[i]
  return item ? `${item.year}` : ''
}

export const formatTooltipLabel = (dataList: GenderDataPoint[]) => (d: number | Date): string => {
  const idx = typeof d === 'number' ? d : 0
  const item = dataList[idx]
  return item ? `Year ${item.year}` : ''
}

export const donutTooltipTriggers = {
  [VisDonutSelectors.segment]: (d: { data: LpiiDataPoint }): string => `
    <div style="background: rgba(15, 23, 42, 0.92); color: #fff; padding: 8px 12px; border-radius: 8px; font-family: inherit; font-size: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1);">
      <div style="display: flex; align-items: center; gap: 6px; font-weight: 600;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${d.data.color};"></span>
        ${d.data.label} Ecosystem
      </div>
      <div style="margin-top: 4px; color: #cbd5e1;">
        Interns: <span style="font-weight: 700; color: #fff;">${d.data.count.toLocaleString()}</span>
      </div>
      <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">
        ${d.data.description}
      </div>
    </div>
  `,
}

// ─── CSV Export Utility ───
export function exportGipInternsCsv(interns: GipInternRecord[], program: string = 'ALL'): void {
  const headers = [
    'GIP Code',
    'Full Name',
    'Gender',
    'Program',
    'Municipality',
    'Barangay',
    'LPII Category',
    'Assigned Office',
    'Batch Year',
    'Status',
  ]

  const rows = interns.map((i) => [
    i.code,
    `"${i.fullName}"`,
    i.gender,
    i.program,
    `"${i.municipality}"`,
    `"${i.barangay}"`,
    i.lpiiTag,
    `"${i.assignedOffice}"`,
    i.batchYear,
    i.status,
  ])

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute(
    'download',
    `GIP_Interns_LPII_${program}_${new Date().toISOString().slice(0, 10)}.csv`
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ─── Initials Helper ───
export function getInitials(fullName: string): string {
  if (!fullName) return ''
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
