import type {
  ApplicantEntryRecord,
  ApplicantRow,
  ApplicantStatsSummary,
  EducationalBackgroundItem,
  EligibilityItem,
  LanguageProficiencyItem,
  ParsedAddress,
  VocationalTrainingItem,
  WorkExperienceItem,
} from '@/types/peso/provincialPeso/applicantEntry'

// ─── Address Parsing ───
export function parseApplicantAddress(addressJson: any): ParsedAddress {
  if (!addressJson || typeof addressJson !== 'object') {
    return {
      barangay: 'N/A',
      municipality: 'Agusan del Sur',
      province: 'Agusan del Sur',
      region: 'Caraga (Region XIII)',
    }
  }

  const barangay = addressJson.barangay || addressJson.brgy || 'N/A'
  const municipality =
    addressJson.city_municipality ||
    addressJson.municipality ||
    addressJson.city ||
    addressJson.geographic ||
    'Agusan del Sur'
  const province = addressJson.province || 'Agusan del Sur'
  const region = addressJson.region || 'Caraga (Region XIII)'
  const street = addressJson.street || addressJson.street_address || ''
  const houseNumber = addressJson.house_no || addressJson.house_number || ''
  const village = addressJson.village || addressJson.subdivision || ''

  return {
    houseNumber: houseNumber || undefined,
    street: street || undefined,
    village: village || undefined,
    barangay,
    municipality,
    province,
    region,
  }
}

export function formatAddressString(address: ParsedAddress): string {
  const parts = [
    address.houseNumber,
    address.street,
    address.village,
    address.barangay && address.barangay !== 'N/A' ? `Brgy. ${address.barangay}` : null,
    address.municipality,
    address.province,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : 'Agusan del Sur'
}

// ─── Education Parsing ───
export function parseEducationalBackground(eduJson: any): EducationalBackgroundItem[] {
  if (!eduJson) return []
  if (Array.isArray(eduJson)) {
    return eduJson.map((item) => ({
      level: item.level || item.education_level || 'N/A',
      school: item.school || item.school_name || item.institution || 'N/A',
      course: item.course || item.degree || item.program || 'N/A',
      year_graduated: item.year_graduated || item.year_grad || item.year || 'N/A',
      awards: item.awards || item.honors || undefined,
      undergraduate_level_reached: item.undergraduate_level_reached || item.level_reached || undefined,
    }))
  }
  if (typeof eduJson === 'object') {
    return [
      {
        level: eduJson.level || 'N/A',
        school: eduJson.school || 'N/A',
        course: eduJson.course || 'N/A',
        year_graduated: eduJson.year_graduated || 'N/A',
        awards: eduJson.awards,
        undergraduate_level_reached: eduJson.undergraduate_level_reached,
      },
    ]
  }
  return []
}

export function getHighestEducationalAttainment(eduList: EducationalBackgroundItem[]): string {
  if (!eduList || eduList.length === 0) return 'Not Specified'
  const latest = eduList[eduList.length - 1]
  if (latest.course && latest.course !== 'N/A') return latest.course
  if (latest.level && latest.level !== 'N/A') return latest.level
  return 'Not Specified'
}

// ─── Work Experiences Parsing ───
export function parseWorkExperiences(workJson: any): WorkExperienceItem[] {
  if (!workJson) return []
  if (Array.isArray(workJson)) {
    return workJson.map((item) => ({
      company_name: item.company_name || item.employer || item.company || 'N/A',
      position: item.position || item.job_title || item.title || 'N/A',
      job_title: item.job_title || item.position || 'N/A',
      inclusive_dates: item.inclusive_dates || item.dates || (item.start_date ? `${item.start_date} - ${item.end_date || 'Present'}` : 'N/A'),
      monthly_salary: item.monthly_salary || item.salary || undefined,
      status_of_appointment: item.status_of_appointment || item.status || undefined,
    }))
  }
  return []
}

// ─── Vocational Trainings Parsing ───
export function parseVocationalTrainings(vocJson: any): VocationalTrainingItem[] {
  if (!vocJson) return []
  if (Array.isArray(vocJson)) {
    return vocJson.map((item) => ({
      course_training_title: item.course_training_title || item.course || item.title || 'N/A',
      duration: item.duration || item.hours || 'N/A',
      training_institution: item.training_institution || item.institution || item.school || 'N/A',
      certificates_received: item.certificates_received || item.certificate || undefined,
    }))
  }
  return []
}

// ─── Eligibilities Parsing ───
export function parseEligibilities(elJson: any): EligibilityItem[] {
  if (!elJson) return []
  if (Array.isArray(elJson)) {
    return elJson.map((item) => ({
      eligibility_title: item.eligibility_title || item.title || item.name || 'N/A',
      rating: item.rating || item.score || 'Passed',
      date_of_examination: item.date_of_examination || item.exam_date || undefined,
      place_of_examination: item.place_of_examination || item.exam_place || undefined,
    }))
  }
  return []
}

// ─── Language Proficiencies Parsing ───
export function parseLanguageProficiencies(langJson: any): LanguageProficiencyItem[] {
  if (!langJson) return []
  if (Array.isArray(langJson)) {
    return langJson.map((item) => ({
      language: item.language || item.name || 'N/A',
      read: Boolean(item.read),
      write: Boolean(item.write),
      speak: Boolean(item.speak),
      understand: Boolean(item.understand),
    }))
  }
  return []
}

// ─── Record Mapping ───
export function mapToApplicantEntryRecord(row: ApplicantRow): ApplicantEntryRecord {
  const address = parseApplicantAddress(row.address)
  const fullAddressString = formatAddressString(address)
  const educationalBackground = parseEducationalBackground(row.educational_background)
  const highestEducationalAttainment = getHighestEducationalAttainment(educationalBackground)
  const workExperiences = parseWorkExperiences(row.work_experiences)
  const vocationalTrainings = parseVocationalTrainings(row.vocational_trainings)
  const eligibilities = parseEligibilities(row.eligibilities)
  const languageProficiencies = parseLanguageProficiencies(row.language_proficiencies)

  const nameParts = [
    row.first_name,
    row.middle_name ? `${row.middle_name.charAt(0)}.` : '',
    row.surname,
    row.suffix,
  ].filter(Boolean)

  const fullName = nameParts.length > 0 ? nameParts.join(' ') : 'Unnamed Applicant'
  const contactNumber =
    (row.contact_numbers && row.contact_numbers.length > 0 ? row.contact_numbers[0] : null) ||
    row.email ||
    'N/A'

  return {
    id: row.id,
    profileId: row.profile_id,
    firstName: row.first_name || '',
    middleName: row.middle_name,
    surname: row.surname || '',
    suffix: row.suffix,
    fullName,
    email: row.email,
    contactNumber,
    allContactNumbers: row.contact_numbers || [],
    dateOfBirth: row.date_of_birth,
    age: row.age,
    sex: row.sex || 'Not Specified',
    civilStatus: row.civil_status || 'Single',
    religion: row.religion,
    heightFt: row.height_ft,
    tin: row.tin,
    address,
    fullAddressString,
    employmentStatus: row.employment_status || 'Unemployed',
    employmentType: row.employment_type,
    unemployedReason: row.unemployed_reason,
    selfEmployedType: row.self_employed_type,
    monthsLookingForWork: row.months_looking_for_work,
    is4psBeneficiary: Boolean(row.is_4ps_beneficiary),
    householdId4ps: row.household_id_4ps,
    hasDisability: Boolean(row.has_disability),
    disabilities: row.disabilities || [],
    disabilityOthers: row.disability_others,
    isOfw: Boolean(row.is_ofw),
    ofwCountry: row.ofw_country,
    isFormerOfw: Boolean(row.is_former_ofw),
    formerOfwCountry: row.former_ofw_country,
    formerOfwReturnDate: row.former_ofw_return_date,
    currentlyInSchool: Boolean(row.currently_in_school),
    highestEducationalAttainment,
    educationalBackground,
    workExperiences,
    vocationalTrainings,
    eligibilities,
    languageProficiencies,
    preferredOccupations: row.preferred_occupations || [],
    preferredLocalLocations: row.preferred_local_locations || [],
    preferredOverseasLocations: row.preferred_overseas_locations || [],
    jobTypePreference: row.job_type_preference || [],
    otherSkills: row.other_skills || [],
    otherSkillsSpecified: row.other_skills_specified,
    referredPrograms: row.referred_programs || [],
    assessedByName: row.assessed_by_name,
    assessmentDate: row.assessment_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─── Summary Metrics ───
export function computeApplicantStats(applicants: ApplicantEntryRecord[]): ApplicantStatsSummary {
  let gip = 0
  let tupad = 0
  let spes = 0

  for (const a of applicants) {
    const progs = a.referredPrograms.map((p) => (p || '').toUpperCase())
    const progText = progs.join(' ')

    // GIP
    if (progText.includes('GIP')) {
      gip++
    }

    // TUPAD
    if (progText.includes('TUPAD')) {
      tupad++
    }

    // SPES
    if (progText.includes('SPES')) {
      spes++
    }
  }

  return {
    total: applicants.length,
    gip,
    tupad,
    spes,
  }
}

// ─── Utility Helpers ───
export function getInitials(fullName: string): string {
  if (!fullName) return 'NA'
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

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

// ─── CSV Export Utility ───
export function exportApplicantsToCsv(applicants: ApplicantEntryRecord[], filterSummary: string = 'All'): void {
  const headers = [
    'ID',
    'Surname',
    'First Name',
    'Middle Name',
    'Suffix',
    'Sex',
    'Date of Birth',
    'Age',
    'Civil Status',
    'Contact Number',
    'Email',
    'Municipality',
    'Barangay',
    'Complete Address',
    'Employment Status',
    'Employment Type',
    'Highest Education / Degree',
    '4Ps Beneficiary',
    'PWD Status',
    'Disabilities',
    'OFW Status',
    'Preferred Occupations',
    'Preferred Locations',
    'Registered Date',
  ]

  const rows = applicants.map((a) => [
    `"${a.id}"`,
    `"${a.surname}"`,
    `"${a.firstName}"`,
    `"${a.middleName || ''}"`,
    `"${a.suffix || ''}"`,
    `"${a.sex}"`,
    `"${a.dateOfBirth}"`,
    a.age ?? 'N/A',
    `"${a.civilStatus}"`,
    `"${a.contactNumber}"`,
    `"${a.email || ''}"`,
    `"${a.address.municipality}"`,
    `"${a.address.barangay}"`,
    `"${a.fullAddressString}"`,
    `"${a.employmentStatus}"`,
    `"${a.employmentType || ''}"`,
    `"${a.highestEducationalAttainment}"`,
    a.is4psBeneficiary ? 'Yes' : 'No',
    a.hasDisability ? 'Yes' : 'No',
    `"${a.disabilities.join(', ')}"`,
    a.isOfw ? 'Current OFW' : a.isFormerOfw ? 'Former OFW' : 'No',
    `"${a.preferredOccupations.join(', ')}"`,
    `"${a.preferredLocalLocations.join(', ')}"`,
    a.createdAt ? a.createdAt.slice(0, 10) : 'N/A',
  ])

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute(
    'download',
    `Applicants_Registry_${filterSummary}_${new Date().toISOString().slice(0, 10)}.csv`
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
