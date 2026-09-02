import type { ChartConfig } from '@/components/ui/chart'
import { VisDonutSelectors } from '@unovis/vue'
import type {
  ApplicantRow,
  GenderDataPoint,
  GipApplicantRecord,
  GipApplicantRow,
  GipInternRecord,
  GipRow,
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

// ─── Chart Configs (PGAS, DOLE & Applicants) ───
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

export const applicantsChartConfig: ChartConfig = {
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

// ─── Helpers: Address & Education Parsing ───
export function parseApplicantAddress(addressJson: any): {
  municipality: string
  barangay: string
} {
  if (!addressJson || typeof addressJson !== 'object') {
    return { municipality: 'Agusan del Sur', barangay: 'N/A' }
  }

  const municipality =
    addressJson.city_municipality ||
    addressJson.municipality ||
    addressJson.city ||
    addressJson.geographic ||
    'Agusan del Sur'

  const barangay = addressJson.barangay || 'N/A'

  return { municipality, barangay }
}

export function parseApplicantCourse(educationalBackgroundJson: any): string {
  if (!educationalBackgroundJson) return 'General Course'
  if (Array.isArray(educationalBackgroundJson) && educationalBackgroundJson.length > 0) {
    const latest = educationalBackgroundJson[educationalBackgroundJson.length - 1]
    return latest.course || latest.level || 'College Graduate'
  }
  if (typeof educationalBackgroundJson === 'object' && educationalBackgroundJson.course) {
    return educationalBackgroundJson.course
  }
  return 'General Course'
}

// ─── Transform DB Records into Domain GipInternRecord ───
export function mapToGipInternRecord(
  gip: GipRow,
  application: GipApplicantRow | null,
  applicant: ApplicantRow | null,
  barangayTagMap?: Map<string, LpiiCategory>
): GipInternRecord {
  const address = parseApplicantAddress(applicant?.address)
  const course = parseApplicantCourse(applicant?.educational_background)

  const rawGender = (applicant?.sex || '').trim().toLowerCase()
  const gender: 'Male' | 'Female' = rawGender.startsWith('f') || rawGender === 'woman' ? 'Female' : 'Male'

  const createdDate = gip.created_at || application?.created_at || applicant?.created_at || new Date().toISOString()
  const batchYear = new Date(createdDate).getFullYear() || 2026

  // Infer program from remarks or default to PGAS
  const remarksText = `${gip.remarks || ''} ${(application?.remarks || []).join(' ')}`.toUpperCase()
  const program: 'PGAS' | 'DOLE' = remarksText.includes('DOLE') ? 'DOLE' : 'PGAS'

  // Match LPII tag from barangay map or remarks or fallback
  const normalizedBrgy = address.barangay.trim().toLowerCase()
  let lpiiTag: LpiiCategory = 'LOWLAND'
  if (barangayTagMap && barangayTagMap.has(normalizedBrgy)) {
    lpiiTag = barangayTagMap.get(normalizedBrgy)!
  } else if (remarksText.includes('UPLAND')) {
    lpiiTag = 'UPLAND'
  } else if (remarksText.includes('WETLAND')) {
    lpiiTag = 'WETLAND'
  }

  // Format full name
  const nameParts = [
    applicant?.first_name,
    applicant?.middle_name ? `${applicant.middle_name.charAt(0)}.` : '',
    applicant?.surname,
    applicant?.suffix,
  ].filter(Boolean)
  const fullName = nameParts.length > 0 ? nameParts.join(' ') : `Intern ${gip.id.slice(0, 6)}`

  // Format short code
  const code = `GIP-${batchYear}-${gip.id.slice(0, 4).toUpperCase()}`

  // Parse contact
  const contact =
    (applicant?.contact_numbers && applicant.contact_numbers.length > 0 ? applicant.contact_numbers[0] : null) ||
    applicant?.email ||
    'N/A'

  // Status mapping
  let status: string = gip.status || application?.status || 'Active'
  if (status.toLowerCase() === 'approved' || status.toLowerCase() === 'active') {
    status = 'Active'
  } else if (status.toLowerCase() === 'hired') {
    status = 'Hired'
  } else if (status.toLowerCase() === 'resigned' || status.toLowerCase() === 'rejected') {
    status = 'Resigned'
  }

  return {
    id: gip.id,
    code,
    fullName,
    gender,
    program,
    municipality: address.municipality,
    barangay: address.barangay,
    lpiiTag,
    assignedOffice: gip.remarks || (program === 'PGAS' ? 'Provincial PESO / PGAS Office' : 'DOLE AgSur Field Office'),
    supervisor: 'Assigned Coordinator',
    course,
    stipend: program === 'DOLE' ? '₱450.00 / day' : '₱420.00 / day',
    batchYear,
    period: `Jan ${batchYear} - Jun ${batchYear}`,
    status,
    contact,
    rawGip: gip,
    rawApplication: application,
    rawApplicant: applicant,
  }
}

// ─── Transform DB Records into Domain GipApplicantRecord ───
export function mapToGipApplicantRecord(
  application: GipApplicantRow,
  applicant: ApplicantRow | null,
  barangayTagMap?: Map<string, LpiiCategory>
): GipApplicantRecord {
  const address = parseApplicantAddress(applicant?.address)
  const course = parseApplicantCourse(applicant?.educational_background)

  const rawGender = (applicant?.sex || '').trim().toLowerCase()
  const gender: 'Male' | 'Female' = rawGender.startsWith('f') || rawGender === 'woman' ? 'Female' : 'Male'

  const createdDate = application.created_at || applicant?.created_at || new Date().toISOString()
  const batchYear = new Date(createdDate).getFullYear() || 2026

  const normalizedBrgy = address.barangay.trim().toLowerCase()
  let lpiiTag: LpiiCategory = 'LOWLAND'
  if (barangayTagMap && barangayTagMap.has(normalizedBrgy)) {
    lpiiTag = barangayTagMap.get(normalizedBrgy)!
  }

  const nameParts = [
    applicant?.first_name,
    applicant?.middle_name ? `${applicant.middle_name.charAt(0)}.` : '',
    applicant?.surname,
    applicant?.suffix,
  ].filter(Boolean)
  const fullName = nameParts.length > 0 ? nameParts.join(' ') : `Applicant ${application.id.slice(0, 6)}`

  const code = `GIP-APP-${batchYear}-${application.id.slice(0, 4).toUpperCase()}`

  const contact =
    (applicant?.contact_numbers && applicant.contact_numbers.length > 0 ? applicant.contact_numbers[0] : null) ||
    applicant?.email ||
    'N/A'

  return {
    id: application.id,
    code,
    applicantId: application.applicant_id,
    fullName,
    gender,
    municipality: address.municipality,
    barangay: address.barangay,
    lpiiTag,
    course,
    batchYear,
    status: application.status || 'Pending',
    contact,
    documentsSubmitted: application.document_submitted || [],
    remarks: application.remarks || [],
    createdAt: createdDate,
    rawApplication: application,
    rawApplicant: applicant,
  }
}

// ─── Demographic Aggregation Helpers ───
export function computeYearlyDemographics(records: GipInternRecord[]): {
  pgas: GenderDataPoint[]
  dole: GenderDataPoint[]
} {
  const currentYear = new Date().getFullYear()
  const yearsSet = new Set<number>([currentYear - 2, currentYear - 1, currentYear])
  for (const r of records) {
    if (r.batchYear) yearsSet.add(r.batchYear)
  }

  const sortedYears = Array.from(yearsSet).sort((a, b) => a - b)

  const pgasMap = new Map<number, { male: number; female: number }>()
  const doleMap = new Map<number, { male: number; female: number }>()

  for (const y of sortedYears) {
    pgasMap.set(y, { male: 0, female: 0 })
    doleMap.set(y, { male: 0, female: 0 })
  }

  for (const r of records) {
    const targetMap = r.program === 'DOLE' ? doleMap : pgasMap
    const entry = targetMap.get(r.batchYear) || { male: 0, female: 0 }
    if (r.gender === 'Female') {
      entry.female += 1
    } else {
      entry.male += 1
    }
    targetMap.set(r.batchYear, entry)
  }

  const pgas: GenderDataPoint[] = sortedYears.map((year) => ({
    year,
    male: pgasMap.get(year)?.male ?? 0,
    female: pgasMap.get(year)?.female ?? 0,
  }))

  const dole: GenderDataPoint[] = sortedYears.map((year) => ({
    year,
    male: doleMap.get(year)?.male ?? 0,
    female: doleMap.get(year)?.female ?? 0,
  }))

  return { pgas, dole }
}

export function computeApplicantsDemographics(
  records: Array<{ batchYear: number; gender: string }>
): GenderDataPoint[] {
  const currentYear = new Date().getFullYear()
  const yearsSet = new Set<number>([currentYear - 2, currentYear - 1, currentYear])
  for (const r of records) {
    if (r.batchYear) yearsSet.add(r.batchYear)
  }

  const sortedYears = Array.from(yearsSet).sort((a, b) => a - b)
  const applicantsMap = new Map<number, { male: number; female: number }>()

  for (const y of sortedYears) {
    applicantsMap.set(y, { male: 0, female: 0 })
  }

  for (const r of records) {
    const entry = applicantsMap.get(r.batchYear) || { male: 0, female: 0 }
    if (r.gender === 'Female') {
      entry.female += 1
    } else {
      entry.male += 1
    }
    applicantsMap.set(r.batchYear, entry)
  }

  return sortedYears.map((year) => ({
    year,
    male: applicantsMap.get(year)?.male ?? 0,
    female: applicantsMap.get(year)?.female ?? 0,
  }))
}

// ─── LPII Aggregation Helpers ───
export function computeLpiiBreakdown(records: GipInternRecord[]): {
  pgas: LpiiDataPoint[]
  dole: LpiiDataPoint[]
} {
  const countCategory = (prog: 'PGAS' | 'DOLE', cat: LpiiCategory) =>
    records.filter((r) => r.program === prog && r.lpiiTag === cat).length

  const pgas: LpiiDataPoint[] = [
    {
      category: 'LOWLAND',
      label: 'Lowland',
      count: countCategory('PGAS', 'LOWLAND'),
      color: LPII_CONFIG.LOWLAND.color,
      description: 'Agricultural plains & urban flatlands',
    },
    {
      category: 'UPLAND',
      label: 'Upland',
      count: countCategory('PGAS', 'UPLAND'),
      color: LPII_CONFIG.UPLAND.color,
      description: 'Hilly and mountainous highland zones',
    },
    {
      category: 'WETLAND',
      label: 'Wetland',
      count: countCategory('PGAS', 'WETLAND'),
      color: LPII_CONFIG.WETLAND.color,
      description: 'Agusan Marsh & riverine corridors',
    },
  ]

  const dole: LpiiDataPoint[] = [
    {
      category: 'LOWLAND',
      label: 'Lowland',
      count: countCategory('DOLE', 'LOWLAND'),
      color: LPII_CONFIG.LOWLAND.color,
      description: 'Commercial & agro-industrial corridors',
    },
    {
      category: 'UPLAND',
      label: 'Upland',
      count: countCategory('DOLE', 'UPLAND'),
      color: LPII_CONFIG.UPLAND.color,
      description: 'Hinterland barangays & ancestral domains',
    },
    {
      category: 'WETLAND',
      label: 'Wetland',
      count: countCategory('DOLE', 'WETLAND'),
      color: LPII_CONFIG.WETLAND.color,
      description: 'Lakeside & riparian settlements',
    },
  ]

  return { pgas, dole }
}

// ─── Extract Unique Batch Years ───
export function extractAvailableYears(records: GipInternRecord[]): number[] {
  const currentYear = new Date().getFullYear()
  const years = new Set<number>([currentYear])
  for (const r of records) {
    if (r.batchYear) years.add(r.batchYear)
  }
  return Array.from(years).sort((a, b) => b - a)
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

// ─── Applicant LPII Breakdown Helper ───
export function computeApplicantLpiiBreakdown(records: GipApplicantRecord[]): {
  overall: LpiiDataPoint[]
  male: LpiiDataPoint[]
  female: LpiiDataPoint[]
} {
  const countCat = (cat: LpiiCategory, genderFilter?: 'Male' | 'Female') =>
    records.filter((r) => r.lpiiTag === cat && (!genderFilter || r.gender === genderFilter)).length

  const buildLpiiData = (genderFilter?: 'Male' | 'Female'): LpiiDataPoint[] => [
    {
      category: 'LOWLAND',
      label: 'Lowland',
      count: countCat('LOWLAND', genderFilter),
      color: LPII_CONFIG.LOWLAND.color,
      description: 'Plains, valleys, and municipal center barangays',
    },
    {
      category: 'UPLAND',
      label: 'Upland',
      count: countCat('UPLAND', genderFilter),
      color: LPII_CONFIG.UPLAND.color,
      description: 'Highland ridges and interior forest barangays',
    },
    {
      category: 'WETLAND',
      label: 'Wetland',
      count: countCat('WETLAND', genderFilter),
      color: LPII_CONFIG.WETLAND.color,
      description: 'Agusan Marsh wildlife buffer & river basin communities',
    },
  ]

  return {
    overall: buildLpiiData(),
    male: buildLpiiData('Male'),
    female: buildLpiiData('Female'),
  }
}

// ─── Extract Unique Batch Years for Applicants ───
export function extractApplicantAvailableYears(records: GipApplicantRecord[]): number[] {
  const currentYear = new Date().getFullYear()
  const years = new Set<number>([currentYear])
  for (const r of records) {
    if (r.batchYear) years.add(r.batchYear)
  }
  return Array.from(years).sort((a, b) => b - a)
}

// ─── CSV Export Utility for Applicants ───
export function exportGipApplicantsCsv(applicants: GipApplicantRecord[], statusFilter: string = 'ALL'): void {
  const headers = [
    'Applicant Code',
    'Full Name',
    'Gender',
    'Municipality',
    'Barangay',
    'LPII Category',
    'Course / Education',
    'Batch Year',
    'Status',
    'Contact',
    'Documents Submitted',
    'Application Date',
  ]

  const rows = applicants.map((a) => [
    a.code,
    `"${a.fullName}"`,
    a.gender,
    `"${a.municipality}"`,
    `"${a.barangay}"`,
    a.lpiiTag,
    `"${a.course}"`,
    a.batchYear,
    a.status,
    `"${a.contact}"`,
    `"${(a.documentsSubmitted || []).join('; ')}"`,
    a.createdAt ? a.createdAt.slice(0, 10) : 'N/A',
  ])

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute(
    'download',
    `GIP_Applicants_${statusFilter}_${new Date().toISOString().slice(0, 10)}.csv`
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

// ─── GIP Standard Document Options ───
export const GIP_DOCUMENT_OPTIONS = [
  'NSRP Form 1',
  'Resume / Bio-Data',
  'Transcript of Records',
  'College Diploma',
  'Barangay Clearance',
  'Valid Government ID',
  'Certificate of Indigency',
]


