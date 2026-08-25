import * as XLSX from 'xlsx'
import type { LpiiCategory } from '@/types/peso/provincialPeso/gip'
import type { NsrpParsedApplicant } from '@/types/peso/provincialPeso/nsrpOcr'

// ─── Agusan del Sur Municipalities & Default Ecosystem Knowledge ───
export const AGSUR_MUNICIPALITIES = [
  'Bayugan City',
  'Bunawan',
  'Esperanza',
  'La Paz',
  'Loreto',
  'Prosperidad',
  'Rosario',
  'San Francisco',
  'San Luis',
  'Santa Josefa',
  'Sibagat',
  'Talacogon',
  'Trento',
  'Veruela',
]

export const KNOWN_WETLAND_AREAS = [
  'talacogon',
  'san luis',
  'la paz',
  'loreto',
  'bunawan',
  'rosario',
  'sabang gibong',
  'panaytayon',
  'caimpugan',
  'maharlika',
  'nuevo trabajo',
  'san marcos',
  'agusan marsh',
]

export const KNOWN_UPLAND_AREAS = [
  'sibagat',
  'esperanza',
  'veruela',
  'loreto',
  'san vicente',
  'tabon-tabon',
  'del monte',
  'lucac',
  'guadalupe',
  'new vargas',
  'sinobong',
  'borela',
  'binucayan',
  'mabuhay',
]

/**
 * Infers LPII Category (LOWLAND, UPLAND, WETLAND) from municipality and barangay text.
 */
export function inferLpiiCategory(
  municipality: string,
  barangay: string,
  barangayTagMap?: Map<string, LpiiCategory>
): LpiiCategory {
  const normBrgy = (barangay || '').trim().toLowerCase()
  const normMuni = (municipality || '').trim().toLowerCase()

  if (barangayTagMap && normBrgy && barangayTagMap.has(normBrgy)) {
    return barangayTagMap.get(normBrgy)!
  }

  if (KNOWN_WETLAND_AREAS.some((k) => normBrgy.includes(k) || normMuni.includes(k))) {
    return 'WETLAND'
  }

  if (KNOWN_UPLAND_AREAS.some((k) => normBrgy.includes(k) || normMuni.includes(k))) {
    return 'UPLAND'
  }

  return 'LOWLAND'
}

/**
 * Normalizes headers from Excel into standardized object keys.
 */
function normalizeRowKey(rawKey: string): string {
  const clean = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')
  
  if (['surname', 'last_name', 'lastname', 'family_name', 'apelyido'].includes(clean)) return 'surname'
  if (['first_name', 'firstname', 'given_name', 'pangalan', 'name'].includes(clean)) return 'firstName'
  if (['middle_name', 'middlename', 'mi', 'middle_initial'].includes(clean)) return 'middleName'
  if (['suffix', 'ext', 'name_extension'].includes(clean)) return 'suffix'
  if (['sex', 'gender', 'kasarian'].includes(clean)) return 'sex'
  if (['dob', 'date_of_birth', 'birthdate', 'birth_date', 'bday'].includes(clean)) return 'dateOfBirth'
  if (['age', 'edad'].includes(clean)) return 'age'
  if (['civil_status', 'marital_status', 'status_civil'].includes(clean)) return 'civilStatus'
  if (['religion', 'relihiyon'].includes(clean)) return 'religion'
  if (['tin', 'tin_number', 'tin_no'].includes(clean)) return 'tin'
  if (['contact', 'contact_no', 'contact_number', 'mobile', 'phone', 'cellphone'].includes(clean)) return 'contactNumber'
  if (['email', 'email_address', 'e_mail'].includes(clean)) return 'email'
  if (['house_street', 'street', 'purok', 'address', 'sitio', 'address_line'].includes(clean)) return 'houseStreet'
  if (['barangay', 'brgy', 'bgy'].includes(clean)) return 'barangay'
  if (['municipality', 'city', 'city_municipality', 'bayan', 'mun'].includes(clean)) return 'municipality'
  if (['province', 'lalawigan', 'prov'].includes(clean)) return 'province'
  if (['course', 'degree', 'field_of_study', 'major', 'program'].includes(clean)) return 'course'
  if (['educational_level', 'education', 'attainment', 'highest_educational_attainment'].includes(clean)) return 'educationalLevel'
  if (['year_graduated', 'graduated_year', 'year'].includes(clean)) return 'yearGraduated'
  if (['batch_year', 'batch', 'year_batch'].includes(clean)) return 'batchYear'
  if (['documents', 'documents_submitted', 'requirements', 'submitted_docs'].includes(clean)) return 'documentsSubmitted'
  if (['employment_status', 'work_status'].includes(clean)) return 'employmentStatus'
  if (['is_4ps', '4ps', 'is_4ps_beneficiary', '4ps_beneficiary'].includes(clean)) return 'is4ps'
  if (['disability', 'has_disability', 'pwd'].includes(clean)) return 'hasDisability'
  if (['skills', 'skill_sets', 'competencies'].includes(clean)) return 'skills'

  return clean
}

/**
 * Formats a Date object or excel date serial into YYYY-MM-DD string.
 */
function formatDateField(val: any): string {
  if (!val) return ''
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10)
  }
  if (typeof val === 'number') {
    // Excel serial date to JS Date
    const date = new Date(Math.round((val - 25569) * 86400 * 1000))
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10)
    }
  }
  if (typeof val === 'string') {
    const trimmed = val.trim()
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10)
    }
    return trimmed
  }
  return String(val)
}

/**
 * Parses an Excel or CSV file buffer into structured NsrpParsedApplicant records.
 */
export async function parseApplicantsExcelFile(
  file: File,
  barangayTagMap?: Map<string, LpiiCategory>
): Promise<NsrpParsedApplicant[]> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array', cellDates: true })

  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) throw new Error('Excel workbook does not contain any sheets.')

  const worksheet = workbook.Sheets[firstSheetName]
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

  if (!rawRows || rawRows.length === 0) {
    throw new Error('No rows found in uploaded Excel sheet.')
  }

  const currentYear = new Date().getFullYear()

  const parsedApplicants: NsrpParsedApplicant[] = rawRows.map((row, idx) => {
    const mapped: Record<string, any> = {}
    for (const [key, val] of Object.entries(row)) {
      const normalizedKey = normalizeRowKey(key)
      mapped[normalizedKey] = val
    }

    const surname = String(mapped.surname || '').trim()
    const firstName = String(mapped.firstName || '').trim()
    const middleName = String(mapped.middleName || '').trim()
    const suffix = String(mapped.suffix || '').trim()
    
    const rawSex = String(mapped.sex || '').trim().toLowerCase()
    const sex = rawSex.startsWith('f') || rawSex === 'woman' ? 'Female' : 'Male'

    const dateOfBirth = formatDateField(mapped.dateOfBirth)
    
    let age: number | null = null
    if (mapped.age && !isNaN(Number(mapped.age))) {
      age = Number(mapped.age)
    } else if (dateOfBirth) {
      const birthYear = new Date(dateOfBirth).getFullYear()
      if (!isNaN(birthYear)) age = currentYear - birthYear
    }

    const municipality = String(mapped.municipality || 'Prosperidad').trim()
    const barangay = String(mapped.barangay || 'Poblacion').trim()
    const province = String(mapped.province || 'Agusan del Sur').trim()
    const houseStreet = String(mapped.houseStreet || 'Purok 1').trim()
    const contactNumber = String(mapped.contactNumber || mapped.phone || '').trim()
    const email = String(mapped.email || '').trim()
    const educationalLevel = String(mapped.educationalLevel || 'Tertiary / College Graduate').trim()
    const course = String(mapped.course || 'BS Information Technology').trim()
    const yearGraduated = String(mapped.yearGraduated || `${currentYear}`).trim()
    const batchYear = Number(mapped.batchYear) || currentYear
    
    // Parse documents submitted string
    let documentsSubmitted: string[] = ['NSRP Form 1', 'Resume / Bio-Data']
    if (mapped.documentsSubmitted) {
      if (Array.isArray(mapped.documentsSubmitted)) {
        documentsSubmitted = mapped.documentsSubmitted
      } else if (typeof mapped.documentsSubmitted === 'string') {
        documentsSubmitted = mapped.documentsSubmitted.split(/[,;|]/).map((s) => s.trim()).filter(Boolean)
      }
    }

    // Infer LPII
    const lpiiTag = inferLpiiCategory(municipality, barangay, barangayTagMap)

    const is4ps = Boolean(mapped.is4ps === true || String(mapped.is4ps).toLowerCase() === 'yes')
    const hasDisability = Boolean(mapped.hasDisability === true || String(mapped.hasDisability).toLowerCase() === 'yes')

    const validationErrors: string[] = []
    if (!surname) validationErrors.push('Surname is missing')
    if (!firstName) validationErrors.push('First name is missing')
    if (!municipality) validationErrors.push('Municipality is missing')
    if (!barangay) validationErrors.push('Barangay is missing')

    return {
      id: `EXCEL-${idx + 1}-${Date.now().toString().slice(-4)}`,
      surname,
      firstName,
      middleName,
      suffix,
      sex,
      dateOfBirth,
      age,
      civilStatus: String(mapped.civilStatus || 'Single').trim(),
      religion: String(mapped.religion || 'Roman Catholic').trim(),
      tin: String(mapped.tin || '').trim(),
      houseStreet,
      barangay,
      municipality,
      province,
      contactNumber,
      email,
      educationalLevel,
      course,
      yearGraduated,
      lpiiTag,
      batchYear,
      documentsSubmitted,
      employmentStatus: String(mapped.employmentStatus || 'Unemployed').trim(),
      is4ps,
      hasDisability,
      skills: mapped.skills ? String(mapped.skills).split(/[,;]/).map((s) => s.trim()).filter(Boolean) : ['Computer Literacy', 'Communication'],
      sourceFile: file.name,
      pageRange: `Row ${idx + 2}`,
      validationErrors,
      isValid: validationErrors.length === 0,
    }
  })

  return parsedApplicants
}

/**
 * Generates and downloads a standard Excel template for GIP applicant batch registration.
 */
export function downloadGipApplicantsExcelTemplate(): void {
  const headers = [
    'Surname',
    'First Name',
    'Middle Name',
    'Suffix',
    'Sex',
    'Date of Birth (YYYY-MM-DD)',
    'Age',
    'Civil Status',
    'Religion',
    'TIN',
    'House / Street / Purok',
    'Barangay',
    'Municipality',
    'Province',
    'Contact Number',
    'Email Address',
    'Highest Educational Attainment',
    'Academic Course / Degree',
    'Year Graduated',
    'Batch Year',
    'Documents Submitted (comma separated)',
    'Employment Status',
    '4Ps Beneficiary (Yes/No)',
    'PWD / Disability (Yes/No)',
    'Skills (comma separated)',
  ]

  const sampleRows = [
    [
      'Dela Cruz',
      'Juan',
      'Santos',
      'Jr.',
      'Male',
      '2001-05-14',
      24,
      'Single',
      'Roman Catholic',
      '123-456-789-000',
      'Purok 3B',
      'Poblacion',
      'Prosperidad',
      'Agusan del Sur',
      '09123456789',
      'juan.delacruz@example.com',
      'College Graduate',
      'BS Information Technology',
      '2024',
      2026,
      'NSRP Form 1, Resume, Transcript of Records, Barangay Clearance',
      'Unemployed',
      'No',
      'No',
      'Data Entry, Basic Troubleshooting, MS Office',
    ],
    [
      'Montenegro',
      'Maria Clara',
      'Reyes',
      '',
      'Female',
      '2002-10-21',
      23,
      'Single',
      'Roman Catholic',
      '',
      'Sitio Riverside',
      'Panaytayon',
      'Talacogon',
      'Agusan del Sur',
      '09987654321',
      'maria.montenegro@example.com',
      'College Graduate',
      'BS Agriculture',
      '2025',
      2026,
      'NSRP Form 1, Resume, Diploma',
      'Unemployed',
      'Yes',
      'No',
      'Agricultural Research, Crop Management',
    ],
  ]

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'GIP_Applicants_Template')

  XLSX.writeFile(workbook, `GIP_Applicants_Batch_Template_${new Date().getFullYear()}.xlsx`)
}
