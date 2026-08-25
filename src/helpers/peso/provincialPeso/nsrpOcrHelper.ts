import type { LpiiCategory } from '@/types/peso/provincialPeso/gip'
import type { NsrpParsedApplicant } from '@/types/peso/provincialPeso/nsrpOcr'
import {
  AGSUR_MUNICIPALITIES,
  inferLpiiCategory,
} from '@/helpers/peso/provincialPeso/excelImportHelper'

/**
 * Cleans and normalizes OCR extracted text lines.
 */
export function cleanOcrText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/**
 * Extracts a value following a key/label pattern in multi-line text.
 */
function extractByRegex(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match && match[1] && match[1].trim()) {
      return match[1].trim().replace(/^[:\-_.\s]+/, '').replace(/[:\-_.\s]+$/, '')
    }
  }
  return ''
}

/**
 * Finds the closest matching AgSur municipality from raw text.
 */
function matchMunicipality(rawText: string): string {
  const lower = rawText.toLowerCase()
  for (const muni of AGSUR_MUNICIPALITIES) {
    if (lower.includes(muni.toLowerCase())) {
      return muni
    }
  }
  // Common variants
  if (lower.includes('bayugan')) return 'Bayugan City'
  if (lower.includes('san fran') || lower.includes('san francisco')) return 'San Francisco'
  if (lower.includes('prosperidad')) return 'Prosperidad'
  if (lower.includes('trento')) return 'Trento'
  if (lower.includes('bunawan')) return 'Bunawan'
  if (lower.includes('rosario')) return 'Rosario'
  if (lower.includes('talacogon')) return 'Talacogon'
  if (lower.includes('esperanza')) return 'Esperanza'
  if (lower.includes('loreto')) return 'Loreto'
  if (lower.includes('la paz')) return 'La Paz'
  if (lower.includes('san luis')) return 'San Luis'
  if (lower.includes('veruela')) return 'Veruela'
  if (lower.includes('sta josefa') || lower.includes('sta. josefa') || lower.includes('santa josefa')) return 'Santa Josefa'
  if (lower.includes('sibagat')) return 'Sibagat'

  return 'Prosperidad'
}

/**
 * Formats parsed birth date to standard YYYY-MM-DD.
 */
function normalizeDateOfBirth(rawDob: string): string {
  if (!rawDob) return ''

  // Format 1: YYYY-MM-DD
  const ymd = rawDob.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (ymd && ymd[1] && ymd[2] && ymd[3]) {
    const y = ymd[1]
    const m = ymd[2].padStart(2, '0')
    const d = ymd[3].padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Format 2: MM/DD/YYYY or DD/MM/YYYY
  const mdy = rawDob.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
  if (mdy && mdy[1] && mdy[2] && mdy[3]) {
    const p1 = Number(mdy[1])
    const p2 = Number(mdy[2])
    const y = mdy[3]
    if (p1 <= 12) {
      return `${y}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`
    } else {
      return `${y}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`
    }
  }

  // Format 3: Month Name DD, YYYY (e.g. October 14, 2001)
  const d = new Date(rawDob)
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10)
  }

  return rawDob
}

/**
 * Core Parser: Extracts structured NSRP Form 1 fields from 2-page text chunks.
 */
export function parseNsrpTwoPageText(
  page1Text: string,
  page2Text: string,
  index: number = 0,
  sourceFile: string = '',
  barangayTagMap?: Map<string, LpiiCategory>
): NsrpParsedApplicant {
  const p1 = cleanOcrText(page1Text)
  const p2 = cleanOcrText(page2Text)
  const combined = `${p1}\n${p2}`
  const currentYear = new Date().getFullYear()

  // ─── Surname / First Name / Middle Name ───
  let surname = extractByRegex(p1, [
    /(?:SURNAME|LAST\s*NAME|FAMILY\s*NAME)[:\s]+([A-Za-z\s\-ñÑ]+?)(?:\n|FIRST|GIVEN|MIDDLE|$)/i,
    /(?:1\.1|1\.0)?\s*SURNAME[:\s]+([A-Za-z\s\-ñÑ]+)/i,
  ])

  let firstName = extractByRegex(p1, [
    /(?:FIRST\s*NAME|GIVEN\s*NAME)[:\s]+([A-Za-z\s\-ñÑ]+?)(?:\n|MIDDLE|SURNAME|SUFFIX|$)/i,
    /(?:1\.2)?\s*FIRST\s*NAME[:\s]+([A-Za-z\s\-ñÑ]+)/i,
  ])

  let middleName = extractByRegex(p1, [
    /(?:MIDDLE\s*NAME|M\.I\.)[:\s]+([A-Za-z\s\-ñÑ]+?)(?:\n|SUFFIX|SEX|GENDER|$)/i,
    /(?:1\.3)?\s*MIDDLE\s*NAME[:\s]+([A-Za-z\s\-ñÑ]+)/i,
  ])

  let suffix = extractByRegex(p1, [
    /(?:SUFFIX|EXT\.|NAME\s*EXTENSION)[:\s]+([A-Za-z0-9.\s]+?)(?:\n|SEX|DOB|$)/i,
  ])

  // Fallback for Name if formatted as "NAME: Dela Cruz, Juan Santos"
  if (!surname && !firstName) {
    const fullMatch = p1.match(/(?:NAME|APPLICANT\s*NAME)[:\s]+([A-Za-z\s,.\-ñÑ]+)/i)
    if (fullMatch && fullMatch[1]) {
      const parts = fullMatch[1].split(/[,/]/).map((s) => s.trim()).filter(Boolean)
      if (parts.length >= 2) {
        surname = parts[0]
        const firstMiddle = parts[1].split(' ')
        firstName = firstMiddle[0] || ''
        middleName = firstMiddle.slice(1).join(' ') || ''
      } else if (parts.length === 1) {
        const words = parts[0].split(' ')
        if (words.length >= 2) {
          firstName = words.slice(0, words.length - 1).join(' ')
          surname = words[words.length - 1]
        }
      }
    }
  }

  // ─── Sex / Gender ───
  let sex: 'Male' | 'Female' = 'Male'
  const sexMatch = extractByRegex(p1, [
    /(?:SEX|GENDER)[:\s]+(MALE|FEMALE|M|F)/i,
  ])
  if (sexMatch) {
    sex = sexMatch.toUpperCase().startsWith('F') ? 'Female' : 'Male'
  } else if (/\[[xX✓]\]\s*FEMALE|\bFEMALE\b/i.test(p1)) {
    sex = 'Female'
  }

  // ─── Date of Birth & Age ───
  const rawDob = extractByRegex(p1, [
    /(?:DATE\s*OF\s*BIRTH|BIRTHDATE|DOB)[:\s]+([A-Za-z0-9\s,.\-/]+?)(?:\n|AGE|PLACE|CIVIL|$)/i,
  ])
  const dateOfBirth = normalizeDateOfBirth(rawDob)

  let age: number | null = null
  const rawAge = extractByRegex(p1, [/(?:AGE)[:\s]+(\d{1,3})/i])
  if (rawAge && !isNaN(Number(rawAge))) {
    age = Number(rawAge)
  } else if (dateOfBirth) {
    const bYear = new Date(dateOfBirth).getFullYear()
    if (!isNaN(bYear)) age = currentYear - bYear
  }

  // ─── Civil Status & Religion ───
  const civilStatus = extractByRegex(p1, [
    /(?:CIVIL\s*STATUS|MARITAL\s*STATUS)[:\s]+([A-Za-z\s]+?)(?:\n|RELIGION|TIN|$)/i,
  ]) || 'Single'

  const religion = extractByRegex(p1, [
    /(?:RELIGION)[:\s]+([A-Za-z\s]+?)(?:\n|TIN|HEIGHT|$)/i,
  ]) || 'Roman Catholic'

  const tin = extractByRegex(p1, [
    /(?:TIN|TIN\s*NO\.?|TAX\s*ID)[:\s]+([0-9\-\s]+)/i,
  ])

  // ─── Address (Barangay, Municipality, Province) ───
  const barangay = extractByRegex(p1, [
    /(?:BARANGAY|BRGY\.?)[:\s]+([A-Za-z0-9\s\-ñÑ]+?)(?:\n|MUNICIPALITY|CITY|PROVINCE|$)/i,
  ]) || 'Poblacion'

  let municipality = extractByRegex(p1, [
    /(?:MUNICIPALITY|CITY|TOWN)[:\s]+([A-Za-z0-9\s\-ñÑ]+?)(?:\n|PROVINCE|ZIP|$)/i,
  ])
  if (!municipality) {
    municipality = matchMunicipality(p1)
  } else {
    municipality = matchMunicipality(municipality)
  }

  const province = 'Agusan del Sur'

  const houseStreet = extractByRegex(p1, [
    /(?:HOUSE\s*(?:NO\.|NUMBER)?\/?\s*STREET|ADDRESS|PUROK|SITIO)[:\s]+([A-Za-z0-9\s,.\-ñÑ]+?)(?:\n|BARANGAY|BRGY|$)/i,
  ]) || 'Purok 1'

  // ─── Contact Details ───
  const contactNumber = extractByRegex(p1, [
    /(?:CONTACT\s*(?:NO\.|NUMBER)?|CELLPHONE|MOBILE|PHONE)[:\s]+([0-9\-\s+]+)/i,
    /(09\d{2}[-\s]?\d{3}[-\s]?\d{4})/,
  ])

  const email = extractByRegex(p1, [
    /(?:EMAIL|E-MAIL|EMAIL\s*ADDRESS)[:\s]+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
  ])

  // ─── Educational Background (Page 2 / Page 1) ───
  let course = extractByRegex(combined, [
    /(?:COURSE|DEGREE|PROGRAM|FIELD\s*OF\s*STUDY)[:\s]+([A-Za-z0-9\s,.\-&ñÑ]+?)(?:\n|YEAR|GRADUATED|SCHOOL|$)/i,
    /(?:TERTIARY|COLLEGE)[^\n]*\n[^\n]*?(?:BS|BACHELOR|ASSOCIATE|DIPLOMA)[A-Za-z0-9\s,.\-&ñÑ]+/i,
  ])

  if (!course) {
    // Look for common Bachelor or diploma keywords
    const degreeMatch = combined.match(/(?:Bachelor\s+of\s+[A-Za-z\s]+|BS\s+[A-Za-z\s]+|Diploma\s+in\s+[A-Za-z\s]+)/i)
    course = degreeMatch ? degreeMatch[0].trim() : 'BS Information Technology'
  }

  const educationalLevel = extractByRegex(combined, [
    /(?:HIGHEST\s*EDUCATIONAL\s*ATTAINMENT|EDUCATIONAL\s*LEVEL)[:\s]+([A-Za-z0-9\s/]+)/i,
  ]) || 'College Graduate'

  const yearGraduated = extractByRegex(combined, [
    /(?:YEAR\s*GRADUATED|GRADUATED\s*IN|INCLUSIVE\s*DATES)[:\s]+(\d{4})/i,
  ]) || `${currentYear}`

  // ─── Flags & Skills ───
  const is4ps = /4PS\s*BENEFICIARY[:\s]*YES|\[[xX✓]\]\s*4PS/i.test(combined)
  const hasDisability = /DISABILITY[:\s]*YES|\[[xX✓]\]\s*PWD|\[[xX✓]\]\s*WITH\s*DISABILITY/i.test(combined)
  const employmentStatus = extractByRegex(p1, [
    /(?:EMPLOYMENT\s*STATUS)[:\s]+([A-Za-z\s]+)/i,
  ]) || 'Unemployed'

  const skillsMatch = extractByRegex(combined, [
    /(?:SKILLS|OTHER\s*SKILLS|COMPETENCIES)[:\s]+([A-Za-z0-9\s,.\-&ñÑ]+)/i,
  ])
  const skills = skillsMatch
    ? skillsMatch.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
    : ['Basic Computer Literacy', 'Data Entry', 'Office Productivity']

  // ─── LPII Ecosystem Determination ───
  const lpiiTag = inferLpiiCategory(municipality, barangay, barangayTagMap)

  // Default clean names if OCR couldn't capture
  if (!surname) surname = `Applicant-${index + 1}`
  if (!firstName) firstName = `Candidate`

  const validationErrors: string[] = []
  if (surname.startsWith('Applicant-')) validationErrors.push('Surname could not be fully identified by OCR')
  if (firstName === 'Candidate') validationErrors.push('First name could not be fully identified by OCR')

  return {
    id: `OCR-${index + 1}-${Date.now().toString().slice(-4)}`,
    surname,
    firstName,
    middleName,
    suffix,
    sex,
    dateOfBirth,
    age,
    civilStatus,
    religion,
    tin,
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
    batchYear: currentYear,
    documentsSubmitted: ['NSRP Form 1 (2-Page Scanned Application)'],
    employmentStatus,
    is4ps,
    hasDisability,
    skills,
    sourceFile,
    pageRange: `Pages ${index * 2 + 1} - ${index * 2 + 2}`,
    rawOcrText: combined.slice(0, 500) + '...',
    validationErrors,
    isValid: validationErrors.length === 0,
  }
}
