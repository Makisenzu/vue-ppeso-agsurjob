import type { LpiiCategory } from '@/types/peso/provincialPeso/gip'
import type { NsrpParsedApplicant } from '@/types/peso/provincialPeso/nsrpOcr'
import type { ApplicantFormOcrData } from '@/types/common/ocrVision'
import {
  AGSUR_MUNICIPALITIES,
  inferLpiiCategory,
} from '@/helpers/peso/provincialPeso/excelImportHelper'

/**
 * Cleans and normalizes OCR extracted text lines.
 */
export function cleanOcrText(text: string): string {
  if (!text) return ''
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\t\f\v]+/g, ' ')
    .replace(/[—–]/g, '-')
    .replace(/_{2,}/g, ' ') // Strip repeated underscores from blank lines
    .replace(/={2,}/g, ' ')
    .replace(/[*]{2,}/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim()
}

/**
 * Strips form template instruction noise from extracted values.
 */
function cleanFieldValue(val: string): string {
  if (!val) return ''
  let cleaned = val
    .replace(/\(e\.?g\.?[^)]*\)/gi, '')
    .replace(/\((?:Last|First|Given|Middle|Family)\s*Name\)/gi, '')
    .replace(/\((?:Jr\.?|Sr\.?|III|IV|Extension)\)/gi, '')
    .replace(/\((?:Middle\s*Initial|M\.I\.)\)/gi, '')
    .replace(/^(?:1\.[0-9]|2\.[0-9]|3\.[0-9]|4\.[0-9]|5\.[0-9]|I\.[0-9]|II\.[0-9]|III\.[0-9]|IV\.[0-9])\s*/i, '')
    .replace(/^[:\-_.\s|/]+/, '')
    .replace(/[:\-_.\s|/]+$/, '')
    .trim()

  if (/^(?:N\/?A|NONE|NIL|NA|NOT\s*APPLICABLE|-|\.)$/i.test(cleaned)) {
    return ''
  }
  return cleaned
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
  // Common variants & misspellings
  if (lower.includes('bayugan')) return 'Bayugan City'
  if (lower.includes('san fran') || lower.includes('san francisco') || lower.includes('sanfran')) return 'San Francisco'
  if (lower.includes('prosperidad') || lower.includes('prosperi')) return 'Prosperidad'
  if (lower.includes('trento')) return 'Trento'
  if (lower.includes('bunawan')) return 'Bunawan'
  if (lower.includes('rosario')) return 'Rosario'
  if (lower.includes('talacogon')) return 'Talacogon'
  if (lower.includes('esperanza')) return 'Esperanza'
  if (lower.includes('loreto')) return 'Loreto'
  if (lower.includes('la paz') || lower.includes('lapaz')) return 'La Paz'
  if (lower.includes('san luis') || lower.includes('sanluis')) return 'San Luis'
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

  // Clean OCR digits (e.g., O -> 0, l/I/| -> 1, S -> 5)
  let clean = rawDob
    .replace(/O(?=[0-9]|\b)|(?<=[0-9])O/gi, '0')
    .replace(/[lI|](?=[0-9]|\b)|(?<=[0-9])[lI|]/g, '1')
    .trim()

  // Format 1: YYYY-MM-DD or YYYY/MM/DD
  const ymd = clean.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (ymd && ymd[1] && ymd[2] && ymd[3]) {
    const y = Number(ymd[1])
    const m = Number(ymd[2])
    const d = Number(ymd[3])
    if (y >= 1950 && y <= 2025 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
  }

  // Format 2: MM/DD/YYYY or DD/MM/YYYY
  const mdy = clean.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
  if (mdy && mdy[1] && mdy[2] && mdy[3]) {
    const p1 = Number(mdy[1])
    const p2 = Number(mdy[2])
    const y = Number(mdy[3])
    if (y >= 1950 && y <= 2025) {
      if (p1 <= 12 && p2 <= 31) {
        return `${y}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`
      } else if (p2 <= 12 && p1 <= 31) {
        return `${y}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`
      }
    }
  }

  // Format 3: Month Name DD, YYYY (e.g. October 14, 2001 or 14 October 2001)
  const monthNames = 'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec'
  const monthMatch = clean.match(new RegExp(`(${monthNames})\\s*(\\d{1,2})[,.]?\\s*(\\d{4})`, 'i'))
    || clean.match(new RegExp(`(\\d{1,2})\\s*(${monthNames})[,.]?\\s*(\\d{4})`, 'i'))

  if (monthMatch) {
    const d = new Date(clean)
    if (!isNaN(d.getTime()) && d.getFullYear() >= 1950 && d.getFullYear() <= 2025) {
      return d.toISOString().slice(0, 10)
    }
  }

  return ''
}

/**
 * Extracts surname, first name, middle name, and suffix from multi-layered text.
 */
function extractNameComponents(text: string): {
  surname: string
  firstName: string
  middleName: string
  suffix: string
} {
  let surname = ''
  let firstName = ''
  let middleName = ''
  let suffix = ''

  // Strategy 1: Check structured field labels
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Form field format: [Surname: Dela Cruz] or [1.1 SURNAME: Dela Cruz]
    if (!surname) {
      const match = line.match(/(?:1\.1\s*)?(?:SURNAME|LAST\s*NAME|FAMILY\s*NAME)[:\s]+([A-Za-z\s\-ñÑ]+?)(?:\s+(?:FIRST|GIVEN|MIDDLE|SUFFIX|1\.2|$))/i)
      if (match && match[1] && match[1].trim().length > 1) {
        surname = cleanFieldValue(match[1])
      } else if (/^(?:1\.1\s*)?(?:SURNAME|LAST\s*NAME|FAMILY\s*NAME)$/i.test(line) && lines[i + 1]) {
        // Label on line i, Value on line i+1
        const nextVal = lines[i + 1]
        if (!/(?:FIRST|GIVEN|MIDDLE|SUFFIX|NAME|DOB|SEX|AGE)/i.test(nextVal)) {
          surname = cleanFieldValue(nextVal)
        }
      }
    }

    if (!firstName) {
      const match = line.match(/(?:1\.2\s*)?(?:FIRST\s*NAME|GIVEN\s*NAME)[:\s]+([A-Za-z\s\-ñÑ]+?)(?:\s+(?:MIDDLE|SURNAME|SUFFIX|1\.3|$))/i)
      if (match && match[1] && match[1].trim().length > 1) {
        firstName = cleanFieldValue(match[1])
      } else if (/^(?:1\.2\s*)?(?:FIRST\s*NAME|GIVEN\s*NAME)$/i.test(line) && lines[i + 1]) {
        const nextVal = lines[i + 1]
        if (!/(?:SURNAME|MIDDLE|SUFFIX|NAME|DOB|SEX|AGE)/i.test(nextVal)) {
          firstName = cleanFieldValue(nextVal)
        }
      }
    }

    if (!middleName) {
      const match = line.match(/(?:1\.3\s*)?(?:MIDDLE\s*NAME|M\.I\.)[:\s]+([A-Za-z\s\-ñÑ]+?)(?:\s+(?:SUFFIX|SEX|DOB|AGE|1\.4|$))/i)
      if (match && match[1] && match[1].trim().length > 0) {
        middleName = cleanFieldValue(match[1])
      } else if (/^(?:1\.3\s*)?(?:MIDDLE\s*NAME|M\.I\.)$/i.test(line) && lines[i + 1]) {
        const nextVal = lines[i + 1]
        if (!/(?:SURNAME|FIRST|SUFFIX|NAME|DOB|SEX|AGE)/i.test(nextVal)) {
          middleName = cleanFieldValue(nextVal)
        }
      }
    }

    if (!suffix) {
      const match = line.match(/(?:1\.4\s*)?(?:SUFFIX|EXT\.|NAME\s*EXTENSION)[:\s]+([A-Za-z0-9.\s]+?)(?:\s+(?:SEX|DOB|AGE|CIVIL|$))/i)
      if (match && match[1] && match[1].trim().length > 0) {
        suffix = cleanFieldValue(match[1])
      }
    }
  }

  // Strategy 2: Tabular column headers followed by values
  if (!surname || !firstName) {
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i]
      if (/SURNAME.*FIRST\s*NAME/i.test(line) && lines[i + 1]) {
        const valueRow = lines[i + 1]
        const parts = valueRow.split(/\s{2,}|\t/).map((s) => s.trim()).filter(Boolean)
        if (parts.length >= 2) {
          if (!surname) surname = cleanFieldValue(parts[0])
          if (!firstName) firstName = cleanFieldValue(parts[1])
          if (!middleName && parts[2]) middleName = cleanFieldValue(parts[2])
          if (!suffix && parts[3]) suffix = cleanFieldValue(parts[3])
          break
        }
      }
    }
  }

  // Strategy 3: Full name string fallback (e.g. "NAME: Dela Cruz, Juan Santos Jr.")
  if (!surname || !firstName) {
    const fullMatch = text.match(/(?:NAME|APPLICANT\s*NAME|FULL\s*NAME)[:\s]+([A-Za-z\s,.\-ñÑ]+)/i)
    if (fullMatch && fullMatch[1]) {
      const cleaned = cleanFieldValue(fullMatch[1])
      if (cleaned.includes(',')) {
        const parts = cleaned.split(',').map((s) => s.trim())
        if (!surname) surname = parts[0]
        if (parts[1]) {
          const fnParts = parts[1].split(' ')
          if (!firstName) firstName = fnParts[0] || ''
          if (!middleName) middleName = fnParts.slice(1).join(' ') || ''
        }
      } else {
        const words = cleaned.split(' ').filter(Boolean)
        if (words.length >= 2) {
          if (!firstName) firstName = words.slice(0, words.length - 1).join(' ')
          if (!surname) surname = words[words.length - 1]
        }
      }
    }
  }

  return { surname, firstName, middleName, suffix }
}

/**
 * Extracts sex / gender from text markers and checkboxes.
 */
function extractSex(text: string): 'Male' | 'Female' {
  // Check female markers first (e.g. [X] Female, FEMALE [X], (•) Female)
  const femaleCheckbox = /\[[xX✓v*\u2713\u25A0\u2022]\]\s*FEMALE|FEMALE\s*\[[xX✓v*\u2713\u25A0\u2022]\]|\(•|\(\*\)\s*FEMALE|SEX[:\s]+FEMALE|GENDER[:\s]+F(?:EMALE)?\b/i
  if (femaleCheckbox.test(text)) {
    return 'Female'
  }

  const maleCheckbox = /\[[xX✓v*\u2713\u25A0\u2022]\]\s*MALE|MALE\s*\[[xX✓v*\u2713\u25A0\u2022]\]|\(•|\(\*\)\s*MALE|SEX[:\s]+MALE|GENDER[:\s]+M(?:ALE)?\b/i
  if (maleCheckbox.test(text)) {
    return 'Male'
  }

  // Look for direct word match near SEX label
  const sexMatch = text.match(/(?:SEX|GENDER)[:\s]+([A-Za-z]+)/i)
  if (sexMatch && sexMatch[1]) {
    const val = sexMatch[1].trim().toUpperCase()
    if (val.startsWith('F')) return 'Female'
    if (val.startsWith('M')) return 'Male'
  }

  return 'Male'
}

/**
 * Extracts civil status from checkboxes or label text.
 */
function extractCivilStatus(text: string): string {
  const options = ['Single', 'Married', 'Widowed', 'Separated', 'Solo Parent', 'Divorced']

  for (const opt of options) {
    const reg = new RegExp(`\\[[xX✓v*\\u2713\\u25A0\\u2022]\\]\\s*${opt}|${opt}\\s*\\[[xX✓v*\\u2713\\u25A0\\u2022]\\]`, 'i')
    if (reg.test(text)) {
      return opt
    }
  }

  const direct = text.match(/(?:CIVIL\s*STATUS|MARITAL\s*STATUS)[:\s]+([A-Za-z\s]+?)(?:\n|RELIGION|TIN|HEIGHT|$)/i)
  if (direct && direct[1]) {
    const val = cleanFieldValue(direct[1])
    for (const opt of options) {
      if (val.toLowerCase().includes(opt.toLowerCase())) return opt
    }
    if (val.length > 2) return val
  }

  return 'Single'
}

/**
 * Extracts religion.
 */
function extractReligion(text: string): string {
  const known = [
    'Roman Catholic',
    'Islam',
    'Iglesia ni Cristo',
    'Seventh-day Adventist',
    'Baptist',
    'Evangelical',
    'Born Again',
    'Protestant',
    'Jehovah\'s Witness',
    'Christian',
  ]

  for (const rel of known) {
    if (new RegExp(`\\b${rel}\\b`, 'i').test(text)) {
      return rel
    }
  }

  const match = text.match(/(?:RELIGION|RELIGIOUS\s*AFFILIATION)[:\s]+([A-Za-z\s]+?)(?:\n|TIN|HEIGHT|WEIGHT|$)/i)
  if (match && match[1]) {
    const val = cleanFieldValue(match[1])
    if (val.length > 2) return val
  }

  return 'Roman Catholic'
}

/**
 * Extracts contact number.
 */
function extractContactNumber(text: string): string {
  // Philippine mobile numbers (09xxxxxxxxx or +639xxxxxxxxx)
  const match = text.match(/(?:\+63|0)9\d{2}[-\s]?\d{3}[-\s]?\d{4}/)
  if (match) {
    return match[0].replace(/[-\s]/g, '')
  }

  const direct = text.match(/(?:CONTACT\s*(?:NO\.?|NUMBER)?|CELLPHONE|MOBILE|PHONE)[:\s]+([0-9\-\s+]{7,15})/i)
  if (direct && direct[1]) {
    return direct[1].trim().replace(/[^\d+]/g, '')
  }

  return ''
}

/**
 * Extracts email address.
 */
function extractEmail(text: string): string {
  const match = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
  return match ? match[1].toLowerCase() : ''
}

/**
 * Extracts educational course/degree.
 */
function extractCourse(text: string): string {
  // Check for explicit Course label
  const direct = text.match(/(?:COURSE|DEGREE|PROGRAM|FIELD\s*OF\s*STUDY|TITLE\s*OF\s*COURSE)[:\s]+([A-Za-z0-9\s,.\-&ñÑ]+?)(?:\n|YEAR|GRADUATED|SCHOOL|INCLUSIVE|$)/i)
  if (direct && direct[1]) {
    const val = cleanFieldValue(direct[1])
    if (val.length > 3 && !/(?:TERTIARY|COLLEGE|SECONDARY|ELEMENTARY)/i.test(val)) {
      return val
    }
  }

  // Check common tertiary degree patterns in PH
  const patterns = [
    /Bachelor\s+of\s+Science\s+in\s+[A-Za-z\s]+/i,
    /Bachelor\s+of\s+[A-Za-z\s]+/i,
    /BS\s+(?:Information\s+Technology|Criminology|Business\s+Administration|Agriculture|Nursing|Education|Civil\s+Engineering|Computer\s+Science)[A-Za-z\s]*/i,
    /Associate\s+in\s+[A-Za-z\s]+/i,
    /Diploma\s+in\s+[A-Za-z\s]+/i,
    /Senior\s+High\s+School\s+Graduate/i,
    /High\s+School\s+Graduate/i,
  ]

  for (const pat of patterns) {
    const match = text.match(pat)
    if (match) {
      return cleanFieldValue(match[0])
    }
  }

  return 'BS Information Technology'
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
  const combined = `${p1}\n\n${p2}`
  const currentYear = new Date().getFullYear()

  // 1. Name Components
  const { surname: rawSurname, firstName: rawFirstName, middleName, suffix } = extractNameComponents(p1)
  let surname = rawSurname
  let firstName = rawFirstName

  // 2. Sex
  const sex = extractSex(p1)

  // 3. Date of Birth & Age
  let rawDob = ''
  const dobMatch = p1.match(/(?:1\.5\s*)?(?:DATE\s*OF\s*BIRTH|BIRTHDATE|DOB)[:\s]+([A-Za-z0-9\s,.\-/]+?)(?:\n|AGE|PLACE|CIVIL|1\.6|$)/i)
  if (dobMatch && dobMatch[1]) {
    rawDob = cleanFieldValue(dobMatch[1])
  }
  const dateOfBirth = normalizeDateOfBirth(rawDob)

  let age: number | null = null
  const ageMatch = p1.match(/(?:1\.6\s*)?(?:AGE)[:\s]+(\d{1,3})/i)
  if (ageMatch && ageMatch[1]) {
    const parsedAge = Number(ageMatch[1])
    if (parsedAge >= 15 && parsedAge <= 80) age = parsedAge
  }
  if (!age && dateOfBirth) {
    const bYear = new Date(dateOfBirth).getFullYear()
    if (!isNaN(bYear) && bYear > 1950) age = currentYear - bYear
  }

  // 4. Civil Status & Religion
  const civilStatus = extractCivilStatus(p1)
  const religion = extractReligion(p1)

  // 5. TIN
  let tin = ''
  const tinMatch = p1.match(/(?:TIN|TIN\s*NO\.?|TAX\s*ID)[:\s]+([0-9\-\s]{9,15})/i)
  if (tinMatch && tinMatch[1]) {
    tin = tinMatch[1].trim()
  }

  // 6. Address (Municipality, Barangay, House/Street)
  const municipality = matchMunicipality(p1)
  const province = 'Agusan del Sur'

  let barangay = ''
  const brgyMatch = p1.match(/(?:BARANGAY|BRGY\.?)[:\s]+([A-Za-z0-9\s\-ñÑ]+?)(?:\n|MUNICIPALITY|CITY|PROVINCE|ZIP|$)/i)
  if (brgyMatch && brgyMatch[1]) {
    barangay = cleanFieldValue(brgyMatch[1])
  } else {
    barangay = 'Poblacion'
  }

  let houseStreet = ''
  const houseMatch = p1.match(/(?:HOUSE\s*(?:NO\.|NUMBER)?\/?\s*STREET|ADDRESS|PUROK|SITIO)[:\s]+([A-Za-z0-9\s,.\-ñÑ]+?)(?:\n|BARANGAY|BRGY|$)/i)
  if (houseMatch && houseMatch[1]) {
    houseStreet = cleanFieldValue(houseMatch[1])
  } else {
    houseStreet = 'Purok 1'
  }

  // 7. Contact Details
  const contactNumber = extractContactNumber(p1)
  const email = extractEmail(p1)

  // 8. Educational Background
  const course = extractCourse(combined)

  let educationalLevel = 'College Graduate'
  if (/(?:HIGH\s*SCHOOL|SECONDARY)/i.test(course)) {
    educationalLevel = 'High School Graduate'
  } else if (/(?:ASSOCIATE|DIPLOMA|VOCATIONAL)/i.test(course)) {
    educationalLevel = 'Technical/Vocational Graduate'
  } else if (/(?:MASTER|POST\s*GRAD)/i.test(combined)) {
    educationalLevel = 'Post Graduate'
  }

  let yearGraduated = `${currentYear}`
  const yrMatch = combined.match(/(?:YEAR\s*GRADUATED|GRADUATED\s*IN|INCLUSIVE\s*DATES|YEAR)[:\s]+((?:19|20)\d{2})/i)
  if (yrMatch && yrMatch[1]) {
    yearGraduated = yrMatch[1]
  }

  // 9. Flags & Skills
  const is4ps = /\[[xX✓v*\u2713\u25A0\u2022]\]\s*4PS|4PS\s*BENEFICIARY[:\s]*YES|4PS[:\s]*YES/i.test(combined)
  const hasDisability = /\[[xX✓v*\u2713\u25A0\u2022]\]\s*(?:PWD|WITH\s*DISABILITY)|DISABILITY[:\s]*YES|PERSON\s*WITH\s*DISABILITY[:\s]*YES/i.test(combined)
  const employmentStatus = 'Unemployed'

  const skillsMatch = combined.match(/(?:SKILLS|OTHER\s*SKILLS|COMPETENCIES)[:\s]+([A-Za-z0-9\s,.\-&ñÑ]+)/i)
  const skills = skillsMatch && skillsMatch[1]
    ? cleanFieldValue(skillsMatch[1]).split(/[,;]/).map((s) => s.trim()).filter(Boolean)
    : ['Computer Literacy', 'Office Productivity', 'Data Entry']

  // 10. LPII Ecosystem Determination
  const lpiiTag = inferLpiiCategory(municipality, barangay, barangayTagMap)

  // Fallbacks if OCR could not detect name
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
    rawOcrText: combined.slice(0, 800) + '...',
    validationErrors,
    isValid: validationErrors.length === 0,
  }
}

/**
 * Converts a Gemini Vision OCR structured response (ApplicantFormOcrData)
 * into the flat NsrpParsedApplicant format used by the batch upload table.
 */
export function mapGeminiOcrToNsrpApplicant(
  data: ApplicantFormOcrData,
  index: number,
  sourceFile: string = '',
  pageRange: string = '',
  barangayTagMap?: Map<string, LpiiCategory>
): NsrpParsedApplicant {
  const pi = data.personalInfo || {} as any
  const edu = data.education || {} as any
  const other = data.otherDetails || {} as any
  const addr = pi.address || {} as any
  const currentYear = new Date().getFullYear()

  // Resolve municipality from OCR output
  let municipality = cleanFieldValue(addr.municipality || '')
  if (municipality) {
    municipality = matchMunicipality(municipality)
  } else {
    municipality = 'Prosperidad'
  }

  // Resolve barangay
  let barangay = cleanFieldValue(addr.barangay || '')
  if (!barangay) barangay = 'Poblacion'

  // Resolve LPII classification using the existing infrastructure
  const lpiiTag = inferLpiiCategory(municipality, barangay, barangayTagMap)

  // Name extraction — use raw OCR values, fallback to indexed placeholder
  let surname = cleanFieldValue(pi.surname || '')
  let firstName = cleanFieldValue(pi.firstName || '')
  const middleName = cleanFieldValue(pi.middleName || '')
  const suffix = cleanFieldValue(pi.suffix || '')

  // Course
  let course = cleanFieldValue(edu.course || '')
  if (!course) course = 'Not Specified'

  // Year graduated
  let yearGraduated = cleanFieldValue(edu.yearGraduated || '')
  if (!yearGraduated) yearGraduated = `${currentYear}`

  // Date of birth
  let dateOfBirth = ''
  if (pi.dateOfBirth) {
    dateOfBirth = normalizeDateOfBirth(pi.dateOfBirth)
  }

  // Age
  let age: number | null = typeof pi.age === 'number' ? pi.age : null
  if (!age && dateOfBirth) {
    const bYear = new Date(dateOfBirth).getFullYear()
    if (!isNaN(bYear) && bYear > 1950) age = currentYear - bYear
  }

  // Sex
  let sex: 'Male' | 'Female' | string = 'Male'
  if (pi.sex) {
    const rawSex = String(pi.sex).trim().toUpperCase()
    if (rawSex.startsWith('F')) sex = 'Female'
    else if (rawSex.startsWith('M')) sex = 'Male'
    else sex = pi.sex
  }

  // Documents submitted — derive from confidence and source
  const documentsSubmitted: string[] = []
  if (sourceFile.endsWith('.pdf')) {
    documentsSubmitted.push('NSRP Form 1 (2-Page Scanned Application)')
  } else {
    documentsSubmitted.push('NSRP Form 1')
  }

  // Skills
  const skills = Array.isArray(data.skills) && data.skills.length > 0
    ? data.skills
    : ['Computer Literacy']

  // Preferred occupations as extra document metadata
  const preferredOccupations = Array.isArray(other.preferredOccupations)
    ? other.preferredOccupations
    : []
  if (preferredOccupations.length > 0) {
    documentsSubmitted.push(`Preferred: ${preferredOccupations.slice(0, 2).join(', ')}`)
  }

  // Validation
  const validationErrors: string[] = []
  if (!surname) {
    surname = `Applicant-${index + 1}`
    validationErrors.push('Surname could not be identified by OCR')
  }
  if (!firstName) {
    firstName = 'Candidate'
    validationErrors.push('First name could not be identified by OCR')
  }

  // Confidence-based validation
  const confidence = data.confidenceScore ?? 1
  if (confidence < 0.5) {
    validationErrors.push(`Low OCR confidence: ${Math.round(confidence * 100)}%`)
  }

  return {
    id: `GEMINI-${index + 1}-${Date.now().toString().slice(-4)}`,
    surname,
    firstName,
    middleName,
    suffix,
    sex,
    dateOfBirth,
    age,
    civilStatus: cleanFieldValue(pi.civilStatus || '') || 'Single',
    religion: cleanFieldValue(pi.religion || '') || 'Roman Catholic',
    tin: cleanFieldValue(pi.tin || ''),
    houseStreet: cleanFieldValue(addr.houseStreet || '') || 'Purok 1',
    barangay,
    municipality,
    province: cleanFieldValue(addr.province || '') || 'Agusan del Sur',
    contactNumber: cleanFieldValue(pi.contactNumber || ''),
    email: cleanFieldValue(pi.email || ''),
    educationalLevel: cleanFieldValue(edu.educationalLevel || '') || 'College Graduate',
    course,
    yearGraduated,
    lpiiTag,
    batchYear: currentYear,
    documentsSubmitted,
    employmentStatus: cleanFieldValue(other.employmentStatus || '') || 'Unemployed',
    is4ps: other.is4ps === true,
    hasDisability: other.hasDisability === true,
    skills,
    sourceFile,
    pageRange,
    rawOcrText: data.extractedNotes || '',
    validationErrors,
    isValid: validationErrors.length === 0,
  }
}
