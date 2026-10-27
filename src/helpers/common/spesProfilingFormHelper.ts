import type { SpesDocumentKey, SpesFormRow } from '@/types/common/spesForm'
import { renderHtmlPagesToPdf } from '@/helpers/common/htmlPdfHelper'
import agsurSealUrl from '@/assets/images/agsur.png'
import pesoLogoUrl from '@/assets/images/pesologo.png'

/** Saved SPES details (applicants.spes_form) the form is filled in from */
export type SpesProfilingSource = Partial<SpesFormRow>

export interface SpesProfilingOptions {
  /** When the form is made; picks the tax year and school year of the requirements. Defaults to now */
  preparedAt?: Date
  /** Requirements with a file attached, ticked in the documentary requirements checklist */
  submitted?: readonly SpesDocumentKey[]
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

const assetUrl = (url: string) => new URL(url, window.location.origin).href

/** A returning beneficiary has a past SPES availment on their form */
function isReturning(form: SpesProfilingSource): boolean {
  return ([1, 2, 3, 4] as const).some(
    (slot) => !!(form[`availment_${slot}_year`] || form[`availment_${slot}_establishment`])
  )
}

/**
 * The present address split into the form's purok and barangay; the municipality has its own column.
 * The address is free text ("Purok 3, Poblacion, San Francisco, Agusan del Sur"), so the parts naming the
 * municipality or the province are dropped, the last one left is the barangay and the rest the purok.
 */
function splitAddress(form: SpesProfilingSource): { purok: string; barangay: string } {
  const municipality = (form.municipality ?? '').trim().toLowerCase()
  const parts = (form.present_address ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => {
      const lower = part.toLowerCase()
      if (!lower) return false
      if (municipality && (lower.includes(municipality) || municipality.includes(lower))) return false
      return !/agusan|caraga|philippines/.test(lower)
    })
  if (parts.length === 0) return { purok: '', barangay: '' }
  if (parts.length === 1) return { purok: '', barangay: parts[0]! }
  return { purok: parts.slice(0, -1).join(', '), barangay: parts[parts.length - 1]! }
}

/** Tax year of the income proof and the school year of the grades, for when the form is made */
function documentYears(date: Date) {
  const year = date.getFullYear()
  // A school year starts in June: before then the first semester was last year's
  const schoolYearStart = date.getMonth() < 5 ? year - 1 : year
  return { taxYear: year - 1, schoolYear: `${schoolYearStart}-${schoolYearStart + 1}` }
}

const box = (checked = false) => `<span class="box">${checked ? '&#10003;' : ''}</span>`

/**
 * PESO Agusan del Sur's SPES form (checklist and personal information), filled in from the applicant's
 * saved SPES details, as a printable HTML document with one A4 page (#page-1). The documentary
 * requirements the applicant attached are ticked; remarks and "Received/Assessed by" are left for PESO.
 */
export function generateSpesProfilingFormHtml(form: SpesProfilingSource = {}, options: SpesProfilingOptions = {}): string {
  const { preparedAt = new Date(), submitted = [] } = options
  const has = (...keys: SpesDocumentKey[]) => keys.every((key) => submitted.includes(key))
  const name = [form.surname, [form.first_name, form.middle_name].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const { purok, barangay } = splitAddress(form)
  const returning = isReturning(form)
  const { taxYear, schoolYear } = documentYears(preparedAt)

  const qualifications = [
    'Resident of Agusan del Sur',
    'Student at least 15 years but not more than 30 years of age.',
    'Family should belong to low earners or income should not exceed the regional poverty threshold',
    'Obtain the passing general weighted average',
    'Not a government scholar',
  ]

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SPES Form - ${escapeHtml(form.surname || 'Applicant')}, ${escapeHtml(form.first_name || '')}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
      font-size: 10.5pt;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { width: 195mm; height: 277mm; background: #fff; padding: 4mm 6mm; }
    .header { display: flex; align-items: center; justify-content: space-between; }
    .header img { width: 22mm; height: 22mm; object-fit: contain; }
    .titles { text-align: center; flex: 1; line-height: 1.25; }
    .titles .small { font-size: 10pt; }
    .titles .office { font-size: 11pt; font-weight: bold; }
    .program { text-align: center; color: #1d4e9e; font-size: 15pt; font-weight: bold; margin: 3mm 0 4mm; }
    .heading { font-weight: bold; font-size: 10.5pt; margin: 2mm 0 1mm; }
    .qualifications { list-style: none; padding-left: 9mm; }
    .qualifications li { display: flex; gap: 3mm; }
    .qualifications li::before { content: '\\27F6'; flex-shrink: 0; width: 14mm; text-align: right; font-size: 9pt; }
    .requirements { list-style: none; padding-left: 2mm; }
    .requirements li { display: flex; gap: 3mm; margin-bottom: 1.2mm; }
    .requirements .text { flex: 1; }
    .box {
      display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
      width: 4.5mm; height: 4.5mm; border: 1px solid #000; font-size: 9pt; font-weight: bold;
      vertical-align: middle;
    }
    .red { color: #d32f2f; font-style: italic; }
    .center { text-align: center; }
    .info { margin-top: 3mm; }
    .row { display: flex; align-items: flex-end; gap: 2mm; margin-bottom: 2.5mm; }
    .label { white-space: nowrap; }
    .line {
      border-bottom: 1px solid #000;
      min-height: 5.5mm;
      padding: 0 1mm 0.3mm;
      font-weight: bold;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .grow { flex: 1; min-width: 0; }
    .cell { display: flex; flex-direction: column; min-width: 0; }
    .caption { text-align: center; font-size: 7.5pt; margin-top: 0.5mm; }
    .choice { display: inline-flex; align-items: center; gap: 1mm; font-size: 8.5pt; margin-left: 1.5mm; }
    .blank { border-bottom: 1px solid #000; height: 7mm; margin: 0 4mm; }
  </style>
</head>
<body>
  <div class="page" id="page-1">
    <div class="header">
      <img src="${assetUrl(agsurSealUrl)}" alt="Province of Agusan del Sur seal">
      <div class="titles">
        <div class="small">Republic of the Philippine</div>
        <div class="small">PROVINCE OF AGUSAN DEL SUR</div>
        <div class="office">PROVINCIAL PUBLIC EMPLOYMENT SERVICE OFFICE</div>
      </div>
      <img src="${assetUrl(pesoLogoUrl)}" alt="PESO logo">
    </div>

    <div class="program">SPECIAL PROGRAM FOR EMPLOYMENT OF STUDENT</div>

    <div class="heading">QUALIFICATION:</div>
    <ul class="qualifications">
      ${qualifications.map((item) => `<li>${item}</li>`).join('\n      ')}
    </ul>

    <div class="heading">DOCUMENTARY REQUIREMENTS:</div>
    <ul class="requirements">
      <li>${box(has('has_application_letter', 'has_resume'))}<span class="text">Application Letter address to the Provincial Governor and Resume</span></li>
      <li>${box(has('has_passport_photo'))}<span class="text">Duly accomplished SPES Form with passport size picture</span></li>
      <li>${box(has('has_birth_certificate'))}<span class="text">Clear Copy of Birth Certificate</span></li>
      <li>${box(has('has_income_proof'))}<span class="text">
        Latest combined Income of Parents should not exceed to the regional poverty threshold<br>
        <span class="red">For wage earners</span>. Government and Private employees<br>
        <span style="display: block; text-align: center;">${taxYear} Copy of Income Tax Return</span>
        <span class="red">For non-wage earners</span>. Original Copy of Certificate of Low Income or Certificate of
        Indigence of parents with Barangay Seal
      </span></li>
      <li>${box(has('has_passing_grade_proof'))}<span class="text">${schoolYear} First Semester Certificate of Passing Grades / Report Card/Form 138 with General Percentage Average</span></li>
    </ul>

    <div class="info">
      <div class="heading">Personal Information</div>
      <div class="row">
        <span class="label">Name:</span><span class="line grow">${escapeHtml(name)}</span>
        <span class="label" style="margin-left: 4mm;">Contact No.</span><span class="line" style="width: 44mm;">${escapeHtml(form.contact_number ?? '')}</span>
      </div>
      <div class="row">
        <span class="label">Gender:</span><span class="line grow">${escapeHtml(form.sex ?? '')}</span>
        <span class="label" style="margin-left: 4mm;">Age:</span><span class="line" style="width: 16mm;">${escapeHtml(form.age ?? '')}</span>
        <span class="label" style="margin-left: 1mm;">Status:</span>
        <span class="choice">${box(!returning)}New</span><span class="choice">${box(returning)}Old</span>
      </div>
      <div class="row" style="align-items: flex-start;">
        <span class="label" style="padding-top: 1mm;">Address:</span>
        <div class="cell" style="width: 20mm;"><span class="line">${escapeHtml(purok)}</span><span class="caption">Purok</span></div>
        <div class="cell" style="width: 28mm;"><span class="line">${escapeHtml(barangay)}</span><span class="caption">Barangay</span></div>
        <div class="cell" style="width: 40mm;"><span class="line">${escapeHtml(form.municipality ?? '')}</span><span class="caption">Municipality</span></div>
        <span class="label" style="margin-left: 2mm; padding-top: 1mm;">If old:</span>
        <span class="choice" style="padding-top: 1mm;">${box()}10 days</span>
        <span class="choice" style="padding-top: 1mm;">${box()}20 days</span>
      </div>
      <div class="row" style="margin-top: 3mm;">
        <span class="label">Beneficiary:</span><span class="line grow">${escapeHtml(form.gsis_beneficiary_relationship ?? '')}</span>
      </div>
      <div class="heading">Remarks:</div>
      <div class="blank"></div>
      <div class="blank"></div>
      <div class="row" style="margin-top: 10mm;">
        <span class="label">Received/Assessed by:</span><span class="line" style="width: 48mm;"></span>
        <span class="label" style="margin-left: 3mm;">Date:</span><span class="line" style="width: 38mm;"></span>
        <span class="choice" style="margin-left: 4mm; font-weight: bold;">${box()}PEIS</span>
      </div>
    </div>
  </div>
</body>
</html>`
}

/** The filled SPES form as a PDF File (not downloaded), e.g. to attach it to an application */
export async function generateSpesProfilingFormPdfFile(
  form: SpesProfilingSource,
  options: SpesProfilingOptions = {},
  customFilename?: string
): Promise<File> {
  const pdf = await renderHtmlPagesToPdf(generateSpesProfilingFormHtml(form, options), ['page-1'])
  const safeName = [form.surname, form.first_name].filter(Boolean).join('_').toLowerCase().replace(/[^a-z0-9_-]/gi, '_') || 'applicant'
  const fileName = customFilename || `SPES_Form_${safeName}.pdf`
  return new File([pdf.output('blob')], fileName, { type: 'application/pdf' })
}
