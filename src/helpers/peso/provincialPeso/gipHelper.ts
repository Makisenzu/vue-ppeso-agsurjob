import type { ChartConfig } from '@/components/ui/chart'
import { VisDonutSelectors } from '@unovis/vue'
import type {
  ApplicantRow,
  ApplicantStatusDataPoint,
  GenderDataPoint,
  GipApplicantRecord,
  GipApplicantRow,
  GipAppointmentRecord,
  GipAppointmentStatus,
  GipInternRecord,
  GipPriorityApplicantRecord,
  GipPriorityScoreRow,
  GipRow,
  LpiiCategory,
  LpiiCategoryConfig,
  LpiiDataPoint,
} from '@/types/peso/provincialPeso/gip'
import type { ApplicantEntryRecord } from '@/types/peso/provincialPeso/applicantEntry'
import { mapToApplicantEntryRecord } from '@/helpers/peso/provincialPeso/applicantEntryHelper'

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

export const statusDonutTooltipTriggers = {
  [VisDonutSelectors.segment]: (d: { data: ApplicantStatusDataPoint }): string => `
    <div style="background: rgba(15, 23, 42, 0.92); color: #fff; padding: 8px 12px; border-radius: 8px; font-family: inherit; font-size: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1);">
      <div style="display: flex; align-items: center; gap: 6px; font-weight: 600;">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${d.data.color};"></span>
        ${d.data.label} Status
      </div>
      <div style="margin-top: 4px; color: #cbd5e1;">
        Applicants: <span style="font-weight: 700; color: #fff;">${d.data.count.toLocaleString()}</span>
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

// ─── Helpers: Appointment Lifecycle & Parsing ───
const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

export function parsePeriodDates(
  period: string,
  fallbackYear: number = new Date().getFullYear(),
): { startDate: string; endDate: string } {
  if (!period || !period.trim()) {
    return {
      startDate: `${fallbackYear}-01-01`,
      endDate: `${fallbackYear}-06-30`,
    }
  }

  const p = period.trim()
  // Pattern: "Jan 1 - Jun 30, 2026" or "Jan 1, 2026 - Jun 30, 2026"
  const rangeMatch = p.match(
    /^([A-Za-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?\s*[-–]\s*([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/,
  )
  if (rangeMatch) {
    const [, sm, sd, sy, em, ed, ey] = rangeMatch
    const sMonth = MONTH_MAP[sm.toLowerCase().slice(0, 3)] || 1
    const eMonth = MONTH_MAP[em.toLowerCase().slice(0, 3)] || 6
    const sYear = sy ? parseInt(sy) : parseInt(ey)
    const eYear = parseInt(ey)
    const sDay = String(parseInt(sd)).padStart(2, '0')
    const eDay = String(parseInt(ed)).padStart(2, '0')
    return {
      startDate: `${sYear}-${String(sMonth).padStart(2, '0')}-${sDay}`,
      endDate: `${eYear}-${String(eMonth).padStart(2, '0')}-${eDay}`,
    }
  }

  // Pattern: "Jan 2026 - Jun 2026"
  const monthYearMatch = p.match(/^([A-Za-z]+)\s+(\d{4})\s*[-–]\s*([A-Za-z]+)\s+(\d{4})$/)
  if (monthYearMatch) {
    const [, sm, sy, em, ey] = monthYearMatch
    const sMonth = MONTH_MAP[sm.toLowerCase().slice(0, 3)] || 1
    const eMonth = MONTH_MAP[em.toLowerCase().slice(0, 3)] || 6
    const sYear = parseInt(sy)
    const eYear = parseInt(ey)
    const lastDay = new Date(eYear, eMonth, 0).getDate()
    return {
      startDate: `${sYear}-${String(sMonth).padStart(2, '0')}-01`,
      endDate: `${eYear}-${String(eMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    }
  }

  return {
    startDate: `${fallbackYear}-01-01`,
    endDate: `${fallbackYear}-06-30`,
  }
}

export function calculateAppointmentStatus(
  endDateStr: string,
  rawStatus: string = 'Active',
): {
  status: GipAppointmentStatus
  daysRemaining: number
  isExpired: boolean
  isExpiringSoon: boolean
} {
  const norm = rawStatus.trim().toLowerCase()
  if (norm === 'completed' || norm === 'hired' || norm === 'resigned' || norm === 'terminated' || norm === 'renewed') {
    return {
      status: (norm.charAt(0).toUpperCase() + norm.slice(1)) as GipAppointmentStatus,
      daysRemaining: 0,
      isExpired: false,
      isExpiringSoon: false,
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const endDate = new Date(endDateStr)
  endDate.setHours(0, 0, 0, 0)

  if (isNaN(endDate.getTime())) {
    return {
      status: 'Active',
      daysRemaining: 999,
      isExpired: false,
      isExpiringSoon: false,
    }
  }

  const diffTime = endDate.getTime() - today.getTime()
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (daysRemaining < 0) {
    return {
      status: 'Expired',
      daysRemaining,
      isExpired: true,
      isExpiringSoon: false,
    }
  }

  if (daysRemaining <= 30) {
    return {
      status: 'Expiring Soon',
      daysRemaining,
      isExpired: false,
      isExpiringSoon: true,
    }
  }

  return {
    status: 'Active',
    daysRemaining,
    isExpired: false,
    isExpiringSoon: false,
  }
}

export function generateAppointmentCode(batchYear: number, gipId: string, term: number): string {
  const shortId = gipId.slice(0, 4).toUpperCase()
  return `GIP-APPT-${batchYear}-${shortId}-T${term}`
}

// ─── Transform DB Records into Domain GipInternRecord ───
export function mapToGipInternRecord(
  gip: GipRow,
  application: GipApplicantRow | null,
  applicant: ApplicantRow | null,
  barangayTagMap?: Map<string, LpiiCategory>,
  appointmentsMap?: Map<string, GipAppointmentRecord[]>,
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

  let assignedOffice = program === 'PGAS' ? 'Provincial PESO / PGAS Office' : 'DOLE AgSur Field Office'
  let supervisor = 'Assigned Coordinator'
  let stipend = program === 'DOLE' ? '₱475.00 / day' : '₱479.35 / day'
  let period = `Jan ${batchYear} - Jun ${batchYear}`

  if (gip.remarks) {
    const cleaned = gip.remarks.replace(/^\[(PGAS|DOLE)\]\s*/i, '').trim()
    const parts = cleaned.split('|').map((p) => p.trim())
    if (parts[0]) {
      assignedOffice = parts[0]
    }
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]
      if (part.toLowerCase().startsWith('supervisor:')) {
        supervisor = part.replace(/^supervisor:\s*/i, '').trim()
      } else if (part.toLowerCase().startsWith('stipend:')) {
        stipend = part.replace(/^stipend:\s*/i, '').trim()
      } else if (part.toLowerCase().startsWith('period:')) {
        period = part.replace(/^period:\s*/i, '').trim()
      }
    }
  }

  // ─── Attach Appointments & Expiration Status ───
  const internAppointments = (appointmentsMap && appointmentsMap.get(gip.id)) ? [...appointmentsMap.get(gip.id)!] : []
  let currentAppointment: GipAppointmentRecord | null = null

  if (internAppointments.length > 0) {
    // Sort descending by term_number
    internAppointments.sort((a, b) => b.termNumber - a.termNumber)
    currentAppointment = internAppointments[0]
  } else {
    // Synthesize initial Term 1 appointment from period string
    const parsedDates = parsePeriodDates(period, batchYear)
    const apptCalc = calculateAppointmentStatus(parsedDates.endDate, status)
    currentAppointment = {
      id: `synthetic-${gip.id}-t1`,
      gipId: gip.id,
      termNumber: 1,
      appointmentCode: generateAppointmentCode(batchYear, gip.id, 1),
      program,
      assignedOffice,
      supervisor,
      dailyStipend: stipend,
      startDate: parsedDates.startDate,
      endDate: parsedDates.endDate,
      status: apptCalc.status,
      daysRemaining: apptCalc.daysRemaining,
      isExpired: apptCalc.isExpired,
      isExpiringSoon: apptCalc.isExpiringSoon,
      createdAt: createdDate,
    }
    internAppointments.push(currentAppointment)
  }

  // Recalculate dynamic flags on current appointment
  const currentCalc = calculateAppointmentStatus(
    currentAppointment.endDate,
    currentAppointment.status,
  )
  currentAppointment.status = currentCalc.status
  currentAppointment.daysRemaining = currentCalc.daysRemaining
  currentAppointment.isExpired = currentCalc.isExpired
  currentAppointment.isExpiringSoon = currentCalc.isExpiringSoon

  return {
    id: gip.id,
    code,
    fullName,
    gender,
    program,
    municipality: address.municipality,
    barangay: address.barangay,
    lpiiTag,
    assignedOffice,
    supervisor,
    course,
    stipend,
    batchYear,
    period,
    status,
    contact,
    documentsSubmitted: (applicant?.documents_submitted && applicant.documents_submitted.length > 0)
      ? applicant.documents_submitted
      : (application?.document_submitted || []),
    currentAppointment,
    appointmentHistory: internAppointments,
    appointmentStatus: currentAppointment.status,
    daysRemaining: currentAppointment.daysRemaining,
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
    documentsSubmitted: (applicant?.documents_submitted && applicant.documents_submitted.length > 0)
      ? applicant.documents_submitted
      : (application.document_submitted || []),
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

// ─── GIP Month Options for Filtering ───
export interface MonthOption {
  value: string
  label: string
}

export const GIP_MONTH_OPTIONS: MonthOption[] = [
  { value: 'ALL', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

export function formatDateDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
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

// ─── Applicant Status Breakdown Helper ───
export function computeApplicantStatusBreakdown(
  records: GipApplicantRecord[]
): ApplicantStatusDataPoint[] {
  const countStatus = (statusName: string) => {
    const target = statusName.toLowerCase()
    return records.filter((r) => {
      const s = (r.status || '').trim().toLowerCase()
      if (target === 'hired') {
        return s === 'hired' || s === 'deployed'
      }
      return s === target
    }).length
  }

  return [
    {
      status: 'Hired',
      label: 'Hired',
      count: countStatus('hired'),
      color: '#3b82f6', // Blue 500
      description: 'Candidates hired and actively deployed',
    },
    {
      status: 'Pending',
      label: 'Pending',
      count: countStatus('pending'),
      color: '#f59e0b', // Amber 500
      description: 'Applications pending evaluation and review',
    },
    {
      status: 'Approved',
      label: 'Approved',
      count: countStatus('approved'),
      color: '#10b981', // Emerald 500
      description: 'Approved applicants qualified for deployment',
    },
    {
      status: 'Rejected',
      label: 'Rejected',
      count: countStatus('rejected'),
      color: '#f43f5e', // Rose 500
      description: 'Applications rejected or disqualified',
    },
  ]
}

// ─── Convert GipApplicantRecord to full ApplicantEntryRecord ───
export function convertGipApplicantToEntryRecord(gipApp: GipApplicantRecord): ApplicantEntryRecord {
  if (gipApp.rawApplicant) {
    const entry = mapToApplicantEntryRecord(gipApp.rawApplicant as ApplicantRow)
    // Ensure GIP program is included in referred programs
    if (!entry.referredPrograms.some((p) => (p || '').toUpperCase().includes('GIP'))) {
      entry.referredPrograms = ['GIP', ...entry.referredPrograms]
    }
    // Ensure address fields fallback to GIP application if missing
    if ((!entry.address.municipality || entry.address.municipality === 'N/A') && gipApp.municipality) {
      entry.address.municipality = gipApp.municipality
    }
    if ((!entry.address.barangay || entry.address.barangay === 'N/A') && gipApp.barangay) {
      entry.address.barangay = gipApp.barangay
    }
    // Ensure course fallback
    if ((!entry.highestEducationalAttainment || entry.highestEducationalAttainment === 'Not Specified') && gipApp.course) {
      entry.highestEducationalAttainment = gipApp.course
    }
    return entry
  }

  // Fallback if rawApplicant is not available
  const nameParts = gipApp.fullName.trim().split(/\s+/)
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0] || 'Applicant'
  const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''

  return {
    id: gipApp.applicantId || gipApp.id,
    profileId: null,
    firstName,
    middleName: null,
    surname,
    suffix: null,
    fullName: gipApp.fullName,
    email: gipApp.contact.includes('@') ? gipApp.contact : null,
    contactNumber: gipApp.contact,
    allContactNumbers: gipApp.contact && gipApp.contact !== 'N/A' ? [gipApp.contact] : [],
    dateOfBirth: `${gipApp.batchYear - 22}-01-01`,
    age: 22,
    sex: gipApp.gender || 'Not Specified',
    civilStatus: 'Single',
    religion: null,
    heightFt: null,
    tin: null,
    address: {
      barangay: gipApp.barangay,
      municipality: gipApp.municipality,
      province: 'Agusan del Sur',
      region: 'Caraga (Region XIII)',
    },
    fullAddressString: `Brgy. ${gipApp.barangay}, ${gipApp.municipality}, Agusan del Sur`,
    employmentStatus: gipApp.status === 'Hired' ? 'Employed' : 'Unemployed',
    employmentType: null,
    unemployedReason: 'Looking for Internship',
    selfEmployedType: null,
    monthsLookingForWork: 1,
    is4psBeneficiary: false,
    householdId4ps: null,
    hasDisability: false,
    disabilities: [],
    disabilityOthers: null,
    isOfw: false,
    ofwCountry: null,
    isFormerOfw: false,
    formerOfwCountry: null,
    formerOfwReturnDate: null,
    currentlyInSchool: false,
    highestEducationalAttainment: gipApp.course || 'College Graduate',
    educationalBackground: [
      {
        level: 'Tertiary / College',
        course: gipApp.course || 'College Degree',
        school: 'College / University',
        year_graduated: `${gipApp.batchYear}`,
      },
    ],
    workExperiences: [],
    vocationalTrainings: [],
    eligibilities: [],
    languageProficiencies: [
      { language: 'English', read: true, write: true, speak: true, understand: true },
      { language: 'Filipino', read: true, write: true, speak: true, understand: true },
    ],
    preferredOccupations: [gipApp.course || 'Government Intern'],
    preferredLocalLocations: [gipApp.municipality || 'Agusan del Sur'],
    preferredOverseasLocations: [],
    jobTypePreference: ['Full-time'],
    otherSkills: ['Computer Literacy', 'Administrative Support'],
    otherSkillsSpecified: null,
    referredPrograms: ['GIP'],
    assessedByName: 'Provincial PESO Officer',
    assessmentDate: gipApp.createdAt,
    createdAt: gipApp.createdAt,
    updatedAt: gipApp.createdAt,
  }
}

// ─── Priority Applicants Mapping Helper ───
export function mapToGipPriorityApplicantRecord(
  row: GipPriorityScoreRow,
  rank: number,
  barangayTagMap?: Map<string, LpiiCategory>
): GipPriorityApplicantRecord {
  const address = parseApplicantAddress(row.address)
  const course = parseApplicantCourse(row.educational_background)

  const rawGender = (row.sex || '').trim().toLowerCase()
  const gender: 'Male' | 'Female' = rawGender.startsWith('f') || rawGender === 'woman' ? 'Female' : 'Male'

  const normalizedBrgy = address.barangay.trim().toLowerCase()
  let lpiiTag: LpiiCategory = 'LOWLAND'
  if (barangayTagMap && barangayTagMap.has(normalizedBrgy)) {
    lpiiTag = barangayTagMap.get(normalizedBrgy)!
  }

  const nameParts = [
    row.first_name,
    row.middle_name ? `${row.middle_name.charAt(0)}.` : '',
    row.surname,
    row.suffix,
  ].filter(Boolean)
  const fullName = nameParts.length > 0 ? nameParts.join(' ') : `Applicant ${(row.applicant_id || '').slice(0, 6)}`

  const batchYear = row.gip_created_at ? new Date(row.gip_created_at).getFullYear() : new Date().getFullYear()
  const code = `GIP-PRIO-${batchYear}-${(row.applicant_id || '').slice(0, 4).toUpperCase()}`

  const contact =
    (row.contact_numbers && row.contact_numbers.length > 0 ? row.contact_numbers[0] : null) ||
    row.email ||
    'N/A'

  return {
    applicantId: row.applicant_id || '',
    gipApplicantId: row.gip_applicant_id || '',
    rank,
    code,
    fullName,
    firstName: row.first_name || '',
    surname: row.surname || '',
    middleName: row.middle_name,
    suffix: row.suffix,
    gender,
    age: row.age || null,
    municipality: address.municipality,
    barangay: address.barangay,
    lpiiTag,
    course,
    status: row.gip_status || 'Pending',
    contact,
    email: row.email || null,
    dateOfBirth: row.date_of_birth,
    civilStatus: row.civil_status,
    currentlyInSchool: row.currently_in_school,
    unemployedReason: row.unemployed_reason,
    statusScore: Number(row.status_score) || 0,
    academicScore: Number(row.academic_score) || 0,
    eligibilityScore: Number((row as any).eligibility_score) || 0,
    certScore: Number(row.cert_score) || 0,
    povertyScore: Number(row.poverty_score) || 0,
    unemploymentScore: Number(row.unemployment_score) || 0,
    totalPriorityScore: Number(row.total_priority_score) || 0,
    rawScoreRow: row,
  }
}

// ─── Priority Applicants CSV Export Helper ───
export function exportPriorityApplicantsCsv(records: GipPriorityApplicantRecord[]): void {
  const headers = [
    'Rank',
    'Candidate Code',
    'Full Name',
    'Gender',
    'Age',
    'Municipality',
    'Barangay',
    'LPII Zone',
    'Course / Education',
    'Contact Number',
    'Email',
    'Status Score (15 max)',
    'Academic Score (15 max)',
    'Civil Service / Board Exam Score (10 max)',
    'TESDA Certifications Score (10 max)',
    'Poverty Score (25 max)',
    'Unemployment Score (25 max)',
    'Total Priority Score (100 max)',
    'Status',
  ]

  const rows = records.map((r) => [
    `#${r.rank}`,
    `"${r.code}"`,
    `"${r.fullName}"`,
    `"${r.gender}"`,
    r.age ?? 'N/A',
    `"${r.municipality}"`,
    `"${r.barangay}"`,
    `"${r.lpiiTag}"`,
    `"${r.course}"`,
    `"${r.contact}"`,
    `"${r.email || 'N/A'}"`,
    r.statusScore,
    r.academicScore,
    r.eligibilityScore,
    r.certScore,
    r.povertyScore,
    r.unemploymentScore,
    r.totalPriorityScore,
    `"${r.status}"`,
  ])

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute(
    'download',
    `GIP_Priority_Applicants_Ranking_${new Date().toISOString().slice(0, 10)}.csv`
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}




