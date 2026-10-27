import type { ApplicantEntryRecord } from '@/types/peso/provincialPeso/applicantEntry'
import { formatDateDisplay } from '@/helpers/peso/provincialPeso/applicantEntryHelper'
import { renderHtmlPagesToPdf } from '@/helpers/common/htmlPdfHelper'
import tupadLogoUrl from '@/assets/images/tupadLogo.png'

/** TUPAD details that aren't in the NSRP record (esmdd.tupad_applicants) */
export interface TupadProfilingDetails {
  monthlyIncome: number | null
  dependentName: string | null
  /** Form number; PESO fills it in by hand when left blank */
  formNumber?: string | null
  remarks?: string | null
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Latest job title from the NSRP work experience, else the employment status (e.g. "Unemployed") */
function occupationOf(applicant: Partial<ApplicantEntryRecord>): string {
  const latest = applicant.workExperiences?.[0]
  return latest?.position || latest?.job_title || applicant.employmentStatus || ''
}

const formatIncome = (value: number | null) =>
  value === null ? '' : `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** A filled-in line with its caption underneath, e.g. the value over "(Last Name)" */
const captioned = (value: string, caption: string, flex: number) =>
  `<div class="cell" style="flex: ${flex}"><div class="line">${value}</div><div class="caption">${caption}</div></div>`

/** "Label: ____" with the value on the line */
const labeled = (label: string, value: string, lineWidth: string) =>
  `<span class="label">${label}</span><span class="line inline" style="width: ${lineWidth}">${value}</span>`

/**
 * TUPAD Profiling Form (DOLE Caraga) filled in from the applicant's NSRP record and TUPAD details,
 * as a printable HTML document with one A4 page (#page-1).
 * The TUPAD logo is bundled from src/assets/images; a text mark stands in if it fails to load.
 */
export function generateTupadProfilingFormHtml(
  applicant: Partial<ApplicantEntryRecord> = {},
  details: TupadProfilingDetails = { monthlyIncome: null, dependentName: null }
): string {
  const address = applicant.address ?? { barangay: '', municipality: '', province: '' }
  const purok = [address.houseNumber, address.street, address.village].filter(Boolean).join(' ')
  const sex = (applicant.sex ?? '').toLowerCase()
  const contact = applicant.contactNumber || applicant.allContactNumbers?.[0] || ''
  const surname = [applicant.surname, applicant.suffix].filter(Boolean).join(' ')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TUPAD Profiling Form - ${escapeHtml(applicant.surname || 'Applicant')}, ${escapeHtml(applicant.firstName || '')}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
      font-size: 11pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* A full A4 page so the PDF keeps the form at the top, at its printed size */
    .page { width: 195mm; height: 277mm; background: #fff; }
    .form { border: 1.5px solid #000; padding: 7mm 9mm 9mm; }
    .header { display: flex; align-items: center; justify-content: center; gap: 6mm; }
    .header img { height: 22mm; width: auto; object-fit: contain; }
    .seal { width: 26mm; display: flex; justify-content: center; }
    .titles { text-align: center; line-height: 1.35; }
    .titles .country { font-size: 11pt; }
    .titles .agency { font-size: 12pt; font-weight: bold; }
    .titles .region { font-size: 11pt; }
    .tupad-mark { display: none; font-size: 15pt; font-weight: 900; letter-spacing: 1px; color: #1e3a8a; }
    .form-title { text-align: center; font-size: 13pt; font-weight: bold; margin: 6mm 0 5mm; }
    .number { text-align: right; margin-bottom: 7mm; }
    .row { display: flex; align-items: flex-start; gap: 2mm; margin-bottom: 4mm; }
    .row.inline-row { align-items: flex-end; flex-wrap: nowrap; }
    .row-label { white-space: nowrap; padding-top: 2mm; }
    .cell { min-width: 0; }
    .line {
      border-bottom: 1px solid #000;
      min-height: 6.5mm;
      padding: 0 1.5mm 0.5mm;
      font-size: 10.5pt;
      font-weight: bold;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: flex-end;
    }
    .line.inline { display: inline-flex; vertical-align: bottom; }
    .caption { text-align: center; font-size: 10pt; margin-top: 1mm; }
    .label { white-space: nowrap; margin-right: 1mm; }
    .gap { margin-left: 2mm; }
    .box {
      display: inline-flex; align-items: center; justify-content: center;
      width: 5mm; height: 5mm; border: 1px solid #000; margin: 0 1mm 0 2mm;
      font-size: 10pt; font-weight: bold; vertical-align: bottom;
    }
    .spacer { height: 6mm; }
    .remarks { margin-top: 12mm; }
  </style>
</head>
<body>
  <div class="page" id="page-1">
    <div class="form">
      <div class="header">
        <div class="seal"><img src="/images/dole.png" alt="DOLE logo"></div>
        <div class="titles">
          <div class="country">Republic of the Philippines</div>
          <div class="agency">DEPARTMENT OF LABOR AND EMPLOYMENT</div>
          <div class="region">Caraga Region</div>
        </div>
        <div class="seal">
          <img src="${new URL(tupadLogoUrl, window.location.origin).href}" alt="TUPAD logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
          <div class="tupad-mark">TUPAD</div>
        </div>
      </div>

      <div class="form-title">TUPAD PROFILING FORM</div>
      <div class="number">${labeled('No.', escapeHtml(details.formNumber ?? ''), '32mm')}</div>

      <div class="row">
        <span class="row-label">Full Name:</span>
        ${captioned(escapeHtml(surname), '(Last Name)', 1)}
        ${captioned(escapeHtml(applicant.firstName ?? ''), '(First Name)', 1.2)}
        ${captioned(escapeHtml(applicant.middleName ?? ''), '(Middle Name)', 1.1)}
      </div>

      <div class="row">
        <span class="row-label">Address:</span>
        ${captioned(escapeHtml(purok), '(Purok)', 0.7)}
        ${captioned(escapeHtml(address.barangay ?? ''), '(Barangay)', 1.6)}
        ${captioned(escapeHtml(address.municipality ?? ''), '(Municipality)', 1.2)}
      </div>

      <div class="row inline-row">
        ${labeled('Birthday:', escapeHtml(applicant.dateOfBirth ? formatDateDisplay(applicant.dateOfBirth) : ''), '36mm')}
        <span class="gap"></span>${labeled('Age:', escapeHtml(applicant.age ?? ''), '10mm')}
        <span class="gap"></span>${labeled('Civil Status:', escapeHtml(applicant.civilStatus ?? ''), '24mm')}
        <span class="gap"></span><span class="label">Sex:</span>
        <span class="box">${sex === 'male' ? '&#10003;' : ''}</span>Male
        <span class="box">${sex === 'female' ? '&#10003;' : ''}</span>Female
      </div>

      <div class="spacer"></div>

      <div class="row inline-row" style="padding-left: 6mm;">
        ${labeled('Contact Number:', escapeHtml(contact), '42mm')}
        <span class="gap"></span>${labeled('Occupation:', escapeHtml(occupationOf(applicant)), '52mm')}
      </div>

      <div class="row inline-row">
        ${labeled('Average Monthly Income:', escapeHtml(formatIncome(details.monthlyIncome)), '30mm')}
        <span class="gap"></span>${labeled('Name of Dependent:', escapeHtml(details.dependentName ?? ''), '46mm')}
      </div>

      <div class="row inline-row remarks">
        ${labeled('Remarks:', escapeHtml(details.remarks ?? ''), '140mm')}
      </div>
    </div>
  </div>
</body>
</html>`
}

/** The filled TUPAD Profiling Form as a PDF File (not downloaded), e.g. to attach it to an application */
export async function generateTupadProfilingFormPdfFile(
  applicant: Partial<ApplicantEntryRecord>,
  details: TupadProfilingDetails,
  customFilename?: string
): Promise<File> {
  const pdf = await renderHtmlPagesToPdf(generateTupadProfilingFormHtml(applicant, details), ['page-1'])
  const safeName = (applicant.fullName || applicant.surname || 'applicant').toLowerCase().replace(/[^a-z0-9_-]/gi, '_')
  const fileName = customFilename || `TUPAD_Profiling_Form_${safeName}.pdf`
  return new File([pdf.output('blob')], fileName, { type: 'application/pdf' })
}
