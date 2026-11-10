import { format, parseISO } from 'date-fns'
import type { jsPDF } from 'jspdf'
import { printPdf, renderPaginatedPdf, type PaginatedDocument } from '@/helpers/common/htmlPdfHelper'
import type { GipAppointmentRecord, GipInternRecord } from '@/types/peso/provincialPeso/gip'

/**
 * The GIP Appointment Record: one landscape page listing the interns appointed together (bulk deploys list every
 * name) with their address, designation, rate per day and employment period, signed by the four provincial officials.
 * Laid out like the Province's own form: provincial seal + PPESO seal letterhead, NO. / NAME/S / ADDRESS /
 * DESIGNATION / RATE PER DAY / EMPLOYMENT PERIOD / AREA OF ASSIGNMENT / CURRENT STATUS table, the rate paragraph and the signatories.
 */

export type GipProgramCode = 'PGAS' | 'DOLE'

export interface GipAppointmentSignatory {
  /** "Recommending Approval:", printed above the name */
  label: string
  name: string
  position: string
}

export type GipAppointmentCurrentStatus = 'New Enrollment' | 'Renewal'

export interface GipAppointmentRecordRow {
  internId: string
  name: string
  address: string
  designation: string
  rate: number | null
  /** "OCTOBER 5, 2026-" / "DECEMBER 30, 2026" */
  periodStart: string
  periodEnd: string
  /** The office the intern is assigned to on this term */
  areaOfAssignment: string
  /** Term 1 is a new enrollment; later terms are renewals */
  currentStatus: GipAppointmentCurrentStatus
}

export interface GipAppointmentRecordSettings {
  sourceOfFunds: string
  designation: string
  signatories: GipAppointmentSignatory[]
}

export const DEFAULT_GIP_DESIGNATION = 'Administrative Aide'

/** 75% of Salary Grade 1 (₱639.13) = ₱479.35, the PGAS GIP rate */
export const SG1_DAILY_RATE = 639.13
export const PGAS_GIP_DAILY_RATE = 479.35

export const DEFAULT_SOURCE_OF_FUNDS: Record<GipProgramCode, string> = {
  PGAS: 'SPECIAL PROJECT GIP/GENERAL FUND',
  DOLE: 'DOLE GOVERNMENT INTERNSHIP PROGRAM FUND',
}

export const DEFAULT_GIP_SIGNATORIES: readonly GipAppointmentSignatory[] = [
  { label: 'Recommending Approval:', name: 'PAULINE J. ANG', position: 'PGDH-PESO Manager' },
  { label: 'Allotment Provided:', name: 'JAVE NHORIEL N. BORDAJE, CPA', position: 'Provincial Budget Officer' },
  { label: 'Fund Available:', name: 'ALVIN G. ELORDE, CPA', position: 'Provincial Treasurer' },
  { label: 'Approved:', name: 'SANTIAGO B. CANE, JR.', position: 'Provincial Governor' },
]

// ─── Row data ──────────────────────────────────────────────────────────────

const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

/** "DAGONDON, AL KEVIN C." (surname first, middle initial) */
export function appointmentRecordName(intern: GipInternRecord): string {
  const a = intern.rawApplicant ?? {}
  const surname = clean(a.surname)
  const first = clean(a.first_name)
  if (!surname && !first) return intern.fullName.toUpperCase()
  const middle = clean(a.middle_name)
  const given = [first, middle ? `${middle.charAt(0)}.` : '', clean(a.suffix)].filter(Boolean).join(' ')
  return [surname, given].filter(Boolean).join(', ').toUpperCase()
}

/** "P-1, STA. IRENE, PROSPERIDAD, AGUSAN DEL SUR" */
export function appointmentRecordAddress(intern: GipInternRecord): string {
  const addr = (intern.rawApplicant?.address ?? {}) as Record<string, unknown>
  const barangay = clean(addr.barangay) || (intern.barangay !== 'N/A' ? intern.barangay : '')
  const municipality = clean(addr.city_municipality) || clean(addr.municipality) || clean(addr.city) || intern.municipality
  const parts = [clean(addr.house_street), barangay, municipality, clean(addr.province) || 'Agusan del Sur']
  // "Agusan del Sur" as the municipality fallback would repeat the province
  return parts
    .filter((part, index) => part && parts.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === index)
    .join(', ')
    .toUpperCase()
}

/** "₱479.35 / day" → 479.35 */
export function parseDailyRate(stipend: string | null | undefined): number | null {
  const match = (stipend ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

const longDate = (iso: string) => {
  try {
    return format(parseISO(iso), 'MMMM d, yyyy').toUpperCase()
  } catch {
    return iso
  }
}

/** The term printed on the record: the intern's current appointment, else the first one on file */
export function recordAppointment(intern: GipInternRecord): GipAppointmentRecord | null {
  return intern.currentAppointment ?? intern.appointmentHistory?.[0] ?? null
}

export function appointmentRecordRow(intern: GipInternRecord, designation: string): GipAppointmentRecordRow {
  const appt = recordAppointment(intern)
  const [fallbackStart = '', fallbackEnd = ''] = intern.period.split(/\s+-\s+/)
  return {
    internId: intern.id,
    name: appointmentRecordName(intern),
    address: appointmentRecordAddress(intern),
    designation: designation.trim() || DEFAULT_GIP_DESIGNATION,
    rate: parseDailyRate(appt?.dailyStipend ?? intern.stipend),
    periodStart: appt?.startDate ? longDate(appt.startDate) : fallbackStart,
    periodEnd: appt?.endDate ? longDate(appt.endDate) : fallbackEnd,
    areaOfAssignment: (appt?.assignedOffice || intern.assignedOffice || '').trim(),
    currentStatus: (appt?.termNumber ?? 1) > 1 ? 'Renewal' : 'New Enrollment',
  }
}

export const formatRate = (rate: number | null) =>
  rate === null ? '' : rate.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** The daily rate the record states: the interns' own rate from their funding (PGAS ₱479.35, DOLE ₱475.00, or what
 *  their term says); with mixed rates, the one most of them have */
export function appointmentRecordRate(rows: GipAppointmentRecordRow[]): number {
  const counts = new Map<number, number>()
  for (const row of rows) if (row.rate !== null) counts.set(row.rate, (counts.get(row.rate) ?? 0) + 1)
  let best = PGAS_GIP_DAILY_RATE
  let bestCount = 0
  for (const [rate, count] of counts) if (count > bestCount) [best, bestCount] = [rate, count]
  return best
}

/** The rate as a share of the SG 1 daily rate: ₱479.35 → "75", ₱475.00 → "74.32" */
export function sg1Percentage(rate: number): string {
  const pct = (rate / SG1_DAILY_RATE) * 100
  return Math.abs(pct - Math.round(pct)) < 0.01 ? String(Math.round(pct)) : pct.toFixed(2).replace(/\.?0+$/, '')
}

/** The paragraph under the table, worded like the Province's form, with the rate of the interns' funding */
export function appointmentRecordStatement(rows: GipAppointmentRecordRow[]): string {
  const rate = appointmentRecordRate(rows)
  return `The above-named beneficiaries are qualified to avail the Government Internship Program with ${sg1Percentage(rate)}% (₱${formatRate(rate)} per day) of Salary Grade 1 (SG 1) basic salary rate of ₱${formatRate(SG1_DAILY_RATE)} per day.  Their employment will cease automatically at the end of the period.`
}

// ─── Printable form ────────────────────────────────────────────────────────

const escapeHtml = (value: string | null | undefined) =>
  (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const asset = (path: string) => new URL(path, window.location.origin).href

const STYLES = `
  .page { padding: 40px 60px 36px; font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 13px; }
  .letterhead { display: flex; align-items: center; justify-content: center; gap: 150px; margin-bottom: 34px; }
  .letterhead img { height: 82px; width: 82px; object-fit: contain; }
  .letterhead .agency { text-align: center; font-size: 12px; line-height: 1.4; }
  .letterhead .agency b { letter-spacing: 0.3px; }
  .project { display: flex; justify-content: space-between; gap: 24px; font-weight: bold; font-size: 13px; margin: 0 0 14px 3px; padding-right: 160px; }
  table.record { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.record th, table.record td { border: 1px solid #000; padding: 4px 4px; font-size: 12px; vertical-align: middle; line-height: 1.25; }
  table.record th { font-weight: bold; text-align: center; height: 46px; }
  table.record td { height: 38px; }
  table.record .center { text-align: center; }
  table.record .no { border-right-width: 2px; }
  .statement { font-family: Calibri, Carlito, 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 2.1; white-space: pre-wrap; margin: 34px 0 0 3px; }
  .signatures { display: grid; grid-template-columns: 1.25fr 1.2fr 0.9fr 1fr; column-gap: 18px; margin: 40px 0 0 3px; font-size: 12px; }
  .signatures .label { margin-bottom: 72px; }
  .signatures .name { font-weight: bold; text-transform: uppercase; }
`

function buildDocument(rows: GipAppointmentRecordRow[], settings: GipAppointmentRecordSettings): PaginatedDocument {
  const letterhead = `
    <div class="letterhead">
      <img src="${asset('/agsur.png')}" alt="Province of Agusan del Sur">
      <div class="agency">
        Republic of the Philippines<br>
        <b>PROVINCE OF AGUSAN DEL SUR</b><br>
        Gov. Democrito O. Plaza, Gov&rsquo;t. Center Prosperidad
      </div>
      <img src="${asset('/images/pesologo.png')}" alt="PPESO">
    </div>`

  const project = `
    <div class="project">
      <span>PROJECT: GOVERNMENT INTERNSHIP PROJECT (GIP)</span>
      <span>SOURCE OF FUNDS: ${escapeHtml(settings.sourceOfFunds.toUpperCase())}</span>
    </div>`

  const head = `
    <colgroup>
      <col style="width:36px"><col style="width:170px"><col style="width:190px"><col style="width:112px">
      <col style="width:68px"><col style="width:150px"><col style="width:177px"><col style="width:100px">
    </colgroup>
    <thead><tr>
      <th class="no">NO.</th><th>NAME/S</th><th>ADDRESS</th><th>DESIGNATION</th><th>RATE PER DAY</th><th>EMPLOYMENT PERIOD</th><th>AREA OF ASSIGNMENT</th><th>CURRENT STATUS</th>
    </tr></thead>`

  const tableRows = rows.map(
    (row, index) => `
      <tr>
        <td class="center no">${index + 1}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.address)}</td>
        <td class="center">${escapeHtml(row.designation)}</td>
        <td class="center">${escapeHtml(formatRate(row.rate))}</td>
        <td class="center">${escapeHtml(row.periodStart)}-<br>${escapeHtml(row.periodEnd)}</td>
        <td class="center">${escapeHtml(row.areaOfAssignment)}</td>
        <td class="center">${escapeHtml(row.currentStatus)}</td>
      </tr>`,
  )

  const signatures = `
    <div class="signatures">
      ${settings.signatories
        .map(
          (s) => `
        <div>
          <div class="label">${escapeHtml(s.label)}</div>
          <div class="name">${escapeHtml(s.name)}</div>
          <div>${escapeHtml(s.position)}</div>
        </div>`,
        )
        .join('')}
    </div>`

  return {
    orientation: 'landscape',
    styles: STYLES,
    blocks: [
      { kind: 'html', html: `<div>${letterhead}${project}</div>` },
      { kind: 'table', tableTag: '<table class="record">', head, rows: tableRows },
      { kind: 'html', html: `<p class="statement">${escapeHtml(appointmentRecordStatement(rows))}</p>` },
      { kind: 'html', html: signatures },
    ],
  }
}

export function createGipAppointmentRecordPdf(
  rows: GipAppointmentRecordRow[],
  settings: GipAppointmentRecordSettings,
): Promise<jsPDF> {
  return renderPaginatedPdf(buildDocument(rows, settings))
}

/** "GIP_Appointment_Record_2026-11-10.pdf", or the intern's name when there is only one */
export function gipAppointmentRecordFileName(rows: GipAppointmentRecordRow[]): string {
  const stamp = format(new Date(), 'yyyy-MM-dd')
  if (rows.length !== 1) return `GIP_Appointment_Record_${rows.length}_interns_${stamp}.pdf`
  const name = rows[0]!.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'intern'
  return `GIP_Appointment_Record_${name}_${stamp}.pdf`
}

export async function downloadGipAppointmentRecord(
  rows: GipAppointmentRecordRow[],
  settings: GipAppointmentRecordSettings,
): Promise<void> {
  const pdf = await createGipAppointmentRecordPdf(rows, settings)
  pdf.save(gipAppointmentRecordFileName(rows))
}

export async function printGipAppointmentRecord(
  rows: GipAppointmentRecordRow[],
  settings: GipAppointmentRecordSettings,
): Promise<void> {
  printPdf(await createGipAppointmentRecordPdf(rows, settings))
}
