import type { ApplicantEntryRecord } from '@/types/peso/provincialPeso/applicantEntry'
import { formatDateDisplay } from '@/helpers/peso/provincialPeso/applicantEntryHelper'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas-pro'

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function chk(condition: boolean): string {
  return condition ? 'chk checked' : 'chk'
}

export function generateNsrpFormHtml(applicant?: Partial<ApplicantEntryRecord>): string {
  const a = applicant || {}

  // Name splitting
  const surname = escapeHtml(a.surname || '')
  const firstName = escapeHtml(a.firstName || '')
  const middleName = escapeHtml(a.middleName || '')
  const suffix = escapeHtml(a.suffix || '')

  // Demographics
  const dob = a.dateOfBirth ? formatDateDisplay(a.dateOfBirth) : ''
  const age = a.age !== null && a.age !== undefined ? escapeHtml(a.age) : ''
  const isMale = (a.sex || '').toLowerCase() === 'male'
  const isFemale = (a.sex || '').toLowerCase() === 'female'
  const religion = escapeHtml(a.religion || '')

  const civilStatusLower = (a.civilStatus || '').toLowerCase()
  const isSingle = civilStatusLower === 'single'
  const isMarried = civilStatusLower === 'married'
  const isWidowed = civilStatusLower === 'widowed'

  // Address
  const addr = a.address || {
    barangay: '',
    municipality: '',
    province: '',
  }
  const streetVillage = [addr.houseNumber, addr.street, addr.village].filter(Boolean).join(' ') || ''
  const streetStr = escapeHtml(streetVillage)
  const brgyStr = escapeHtml(addr.barangay || '')
  const muniStr = escapeHtml(addr.municipality || '')
  const provStr = escapeHtml(addr.province || '')

  // Identifiers & Contact
  const tin = escapeHtml(a.tin || '')
  const height = a.heightFt !== null && a.heightFt !== undefined ? escapeHtml(a.heightFt) : ''
  const contact = escapeHtml(a.contactNumber || (a.allContactNumbers && a.allContactNumbers[0]) || '')
  const email = escapeHtml(a.email || '')

  // Disabilities
  const disabilities = (a.disabilities || []).map((d) => d.toLowerCase())
  const hasVisual = disabilities.some((d) => d.includes('visual'))
  const hasHearing = disabilities.some((d) => d.includes('hearing'))
  const hasSpeech = disabilities.some((d) => d.includes('speech'))
  const hasPhysical = disabilities.some((d) => d.includes('physical') || d.includes('orthopedic'))
  const hasMental = disabilities.some((d) => d.includes('mental') || d.includes('psychosocial'))
  const hasOthersDis = Boolean(a.disabilityOthers || disabilities.some((d) => d.includes('other')))
  const disOthersText = escapeHtml(a.disabilityOthers || '')

  // Employment status
  const empStatus = (a.employmentStatus || '').toLowerCase()
  const isEmployed = empStatus === 'employed'
  const isUnemployed = empStatus === 'unemployed' || (!isEmployed && empStatus !== '')
  const empType = (a.employmentType || '').toLowerCase()
  const isWageEmployed = empType.includes('wage')
  const isSelfEmployed = empType.includes('self')

  const selfType = (a.selfEmployedType || '').toLowerCase()
  const isFisher = selfType.includes('fisher')
  const isVendor = selfType.includes('vendor')
  const isHomeBased = selfType.includes('home')
  const isTransport = selfType.includes('transport')
  const isDomestic = selfType.includes('domestic')
  const isFreelancer = selfType.includes('freelancer')
  const isArtisan = selfType.includes('artisan')
  const isSelfOthers =
    Boolean(selfType) &&
    !isFisher &&
    !isVendor &&
    !isHomeBased &&
    !isTransport &&
    !isDomestic &&
    !isFreelancer &&
    !isArtisan
  const selfOthersText = isSelfOthers ? escapeHtml(a.selfEmployedType) : ''

  const monthsLooking = a.monthsLookingForWork !== null && a.monthsLookingForWork !== undefined ? escapeHtml(a.monthsLookingForWork) : ''
  const unempReason = (a.unemployedReason || '').toLowerCase()
  const isNewEntrant = unempReason.includes('new entrant') || unempReason.includes('fresh grad')
  const isFinishedContract = unempReason.includes('finished contract')
  const isResigned = unempReason.includes('resigned')
  const isRetired = unempReason.includes('retired')
  const isTerminatedLocal = unempReason.includes('terminated') && (unempReason.includes('local') || !unempReason.includes('abroad'))
  const isTerminatedAbroad = unempReason.includes('terminated') && unempReason.includes('abroad')
  const isCalamity = unempReason.includes('calamity')
  const isUnempOthers =
    Boolean(unempReason) &&
    !isNewEntrant &&
    !isFinishedContract &&
    !isResigned &&
    !isRetired &&
    !isTerminatedLocal &&
    !isTerminatedAbroad &&
    !isCalamity

  // OFW
  const isOfw = Boolean(a.isOfw)
  const ofwCountry = escapeHtml(a.ofwCountry || '')
  const isFormerOfw = Boolean(a.isFormerOfw)
  const formerOfwCountry = escapeHtml(a.formerOfwCountry || '')
  const formerOfwReturn = escapeHtml(a.formerOfwReturnDate || '')

  // 4Ps
  const is4ps = Boolean(a.is4psBeneficiary)
  const hhid4ps = escapeHtml(a.householdId4ps || '')

  // Job Preferences
  const prefJobTypes = (a.jobTypePreference || []).map((j) => j.toLowerCase())
  const isPartTime = prefJobTypes.some((j) => j.includes('part'))
  const isFullTime = prefJobTypes.length === 0 || prefJobTypes.some((j) => j.includes('full'))

  const occs = a.preferredOccupations || []
  const occ1 = escapeHtml(occs[0] || '')
  const occ2 = escapeHtml(occs[1] || '')
  const occ3 = escapeHtml(occs[2] || '')

  const locs = a.preferredLocalLocations || []
  const loc1 = escapeHtml(locs[0] || '')
  const loc2 = escapeHtml(locs[1] || '')
  const loc3 = escapeHtml(locs[2] || '')
  const hasLocalLoc = locs.length > 0

  const overseas = a.preferredOverseasLocations || []
  const os1 = escapeHtml(overseas[0] || '')
  const os2 = escapeHtml(overseas[1] || '')
  const os3 = escapeHtml(overseas[2] || '')
  const hasOverseasLoc = overseas.length > 0

  // Language Proficiencies
  const langList = a.languageProficiencies || []
  const findLang = (name: string) =>
    langList.find((l) => (l.language || '').toLowerCase().includes(name.toLowerCase()))

  const langEn = findLang('english') || {}
  const langFil = findLang('filipino') || findLang('tagalog') || {}
  const langMan = findLang('mandarin') || findLang('chinese') || {}
  const langOth =
    langList.find(
      (l) =>
        !(l.language || '').toLowerCase().includes('english') &&
        !(l.language || '').toLowerCase().includes('filipino') &&
        !(l.language || '').toLowerCase().includes('tagalog') &&
        !(l.language || '').toLowerCase().includes('mandarin') &&
        !(l.language || '').toLowerCase().includes('chinese'),
    ) || {}

  // Education Background
  const inSchool = Boolean(a.currentlyInSchool)
  const eduList = a.educationalBackground || []
  const findEdu = (levelKeyword: string) =>
    eduList.find((e) => (e.level || '').toLowerCase().includes(levelKeyword.toLowerCase()))

  const eduElem = findEdu('elem')
  const eduSec = findEdu('sec') || findEdu('high')
  const eduTer = findEdu('ter') || findEdu('coll')
  const eduGrad = findEdu('grad') || findEdu('post')

  const isSecK12 = (eduSec?.level || '').toLowerCase().includes('k-12') || (eduSec?.course || '').toLowerCase().includes('strand')
  const isSecNonK12 = Boolean(eduSec && !isSecK12)

  // Technical/Vocational Trainings
  const vocList = a.vocationalTrainings || []
  const voc1 = vocList[0] || {}
  const voc2 = vocList[1] || {}
  const voc3 = vocList[2] || {}

  // Eligibilities
  const eligList = a.eligibilities || []
  const elig1 = eligList[0] || {}
  const elig2 = eligList[1] || {}

  // Work Experience
  const workList = a.workExperiences || []
  const work1 = workList[0] || {}
  const work2 = workList[1] || {}
  const work3 = workList[2] || {}

  // Other Skills
  const skills = (a.otherSkills || []).map((s) => s.toLowerCase())
  const hasSkill = (k: string) => skills.some((s) => s.includes(k.toLowerCase()))

  // PESO Assessment
  const refPrograms = (a.referredPrograms || []).map((p) => p.toLowerCase())
  const refSpes = refPrograms.some((p) => p.includes('spes'))
  const refGip = refPrograms.some((p) => p.includes('gip'))
  const refTupad = refPrograms.some((p) => p.includes('tupad'))
  const refJobstart = refPrograms.some((p) => p.includes('jobstart'))
  const refDileep = refPrograms.some((p) => p.includes('dileep'))
  const refTesda = refPrograms.some((p) => p.includes('tesda'))
  const refOthers = refPrograms.find(
    (p) =>
      !p.includes('spes') &&
      !p.includes('gip') &&
      !p.includes('tupad') &&
      !p.includes('jobstart') &&
      !p.includes('dileep') &&
      !p.includes('tesda'),
  )

  const assessor = escapeHtml(a.assessedByName || 'PESO OFFICER')
  const assessDate = a.assessmentDate ? formatDateDisplay(a.assessmentDate) : formatDateDisplay(new Date().toISOString())
  const signDate = formatDateDisplay(new Date().toISOString())

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NSRP Form 1 - ${surname || 'Jobseeker'}, ${firstName || ''}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #f1f5f9;
      font-size: 8pt;
      line-height: 1.2;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      width: 195mm;
      min-height: 277mm;
      margin: 15px auto;
      background: #fff;
      border: 1.5px solid #000;
      padding: 0;
      position: relative;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      page-break-after: always;
      break-after: page;
    }
    @media print {
      body {
        background: #fff;
      }
      .page-container {
        width: 100%;
        min-height: auto;
        margin: 0;
        box-shadow: none;
        border: 1.5px solid #000;
        page-break-after: always;
        break-after: page;
      }
      .page-container:last-child {
        page-break-after: avoid;
        break-after: avoid;
      }
      .no-print {
        display: none !important;
      }
    }

    /* Section Banner */
    .section-banner {
      background-color: #d9e2ec;
      font-weight: bold;
      font-size: 8.5pt;
      padding: 3px 6px;
      letter-spacing: 0.2px;
      border-bottom: 1.5px solid #000;
    }

    /* Sub Labels & Field Values */
    .sub-label {
      font-size: 7pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #000;
      line-height: 1.1;
    }
    .field-val {
      font-size: 8.5pt;
      font-weight: 600;
      color: #0b192c;
      min-height: 14px;
      line-height: 1.2;
    }

    /* Checkboxes */
    .chk {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 10px;
      height: 10px;
      border: 1.2px solid #000;
      background: #fff;
      font-size: 9px;
      font-weight: bold;
      line-height: 1;
      margin-right: 4px;
      vertical-align: middle;
      flex-shrink: 0;
    }
    .chk.checked::after {
      content: "✔";
      display: block;
      font-size: 9px;
      color: #000;
    }
    .chk-label {
      display: inline-flex;
      align-items: center;
      font-size: 7.5pt;
      cursor: default;
      user-select: none;
    }

    /* Tables */
    table.nsrp-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      table-layout: fixed;
    }
    table.nsrp-table th,
    table.nsrp-table td {
      border: 1px solid #000;
      padding: 2.5px 4px;
      vertical-align: middle;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    table.nsrp-table th {
      font-weight: bold;
      text-align: center;
      background: #fff;
    }
    .col-num {
      width: 20px !important;
      min-width: 20px !important;
      max-width: 20px !important;
      text-align: center !important;
      font-weight: bold;
      padding: 2.5px 1px !important;
    }

    /* Header */
    .header-table {
      width: 100%;
      border-collapse: collapse;
    }
    .header-box-left {
      width: 120px;
      border-right: 1.5px solid #000;
      border-bottom: 1.5px solid #000;
      text-align: center;
      vertical-align: middle;
      padding: 6px;
    }
    .header-content {
      border-bottom: 1.5px solid #000;
      padding: 4px 8px;
    }
    .header-seal {
      width: 52px;
      height: 52px;
      object-fit: contain;
    }

    /* Footers */
    .page-footer {
      border-top: 1.5px solid #000;
      padding: 4px 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 7pt;
      line-height: 1.25;
    }
    .iso-seal {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .iso-seal-img {
      height: 34px;
      width: auto;
      display: block;
      object-fit: contain;
    }
    .qf-box {
      border: 1px solid #000;
      padding: 3px 6px;
      text-align: center;
      font-size: 7pt;
      line-height: 1.2;
    }
    .page-num {
      text-align: center;
      font-weight: bold;
      font-size: 8pt;
      margin-top: 2px;
      margin-bottom: 4px;
    }
  </style>
</head>
<body>

  <!-- Floating Action Helper for Browser Preview -->
  <div class="no-print" style="position: fixed; top: 12px; right: 12px; z-index: 9999; display: flex; gap: 8px;">
    <button id="btn-download-pdf" onclick="downloadPdf()" style="background: #0284c7; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; font-size: 13px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2); display: inline-flex; align-items: center; gap: 6px;">
      📥 Download PDF
    </button>
    <button onclick="window.print()" style="background: #1e3a8a; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; font-size: 13px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2); display: inline-flex; align-items: center; gap: 6px;">
      🖨️ Print Form
    </button>
  </div>

  <!-- ══════════════════════════════════════════════════════════════════════════ -->
  <!-- PAGE 1 — FRONT PAGE                                                      -->
  <!-- ══════════════════════════════════════════════════════════════════════════ -->
  <div class="page-container" id="page-1">
    
    <!-- Top Header -->
    <table class="header-table">
      <tr>
        <td class="header-box-left">
          <div style="font-size: 11pt; font-weight: bold; line-height: 1.1;">NSRP Form 1</div>
          <div style="font-size: 10pt; font-weight: bold; margin-top: 2px; line-height: 1.1;">September</div>
          <div style="font-size: 10pt; font-weight: bold; line-height: 1.1;">2020</div>
        </td>
        <td class="header-content">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <!-- DOLE Logo -->
            <img src="/images/dole.png" alt="DOLE Logo" class="header-seal" onerror="this.src='/src/assets/images/dole.png'">
            
            <!-- Center Titles -->
            <div style="text-align: center; flex: 1; padding: 0 8px;">
              <div style="font-size: 8.5pt; font-family: 'Times New Roman', Times, serif;">Republic of the Philippines</div>
              <div style="font-size: 11pt; font-weight: bold; letter-spacing: 0.2px; line-height: 1.15;">DEPARTMENT OF LABOR AND EMPLOYMENT</div>
              <div style="font-size: 10pt; font-weight: bold; letter-spacing: 0.2px; line-height: 1.15;">NATIONAL SKILLS REGISTRATION PROGRAM</div>
              <div style="font-size: 10.5pt; font-weight: bold; letter-spacing: 0.5px; margin-top: 1px;">JOBSEEKER REGISTRATION FORM</div>
            </div>

            <!-- Bagong Pilipinas Logo -->
            <img src="/images/bagongPilipinas.png" alt="Bagong Pilipinas" class="header-seal" onerror="this.src='/src/assets/images/bagongPilipinas.png'">
          </div>
        </td>
      </tr>
    </table>

    <!-- Instructions Banner -->
    <div style="padding: 2.5px 6px; border-bottom: 1.5px solid #000; font-size: 7.2pt; line-height: 1.25; text-align: justify;">
      <strong>INSTRUCTIONS:</strong> Please fill out the form legibly in block letters using a ballpoint pen. Check appropriate boxes. Please do not leave any items unanswered. Indicate &ldquo;NA&rdquo; if not applicable. You may use extra sheet if needed. Submit accomplished form to the Public Employment Service Office (PESO) Manager or Officer in your city/municipality.
    </div>

    <!-- ─── I. PERSONAL INFORMATION ─── -->
    <div class="section-banner">I.PERSONAL INFORMATION</div>

    <!-- Row: Surname / First Name / Middle Name / Suffix -->
    <div style="display: flex; border-bottom: 1px solid #000;">
      <div style="width: 27%; border-right: 1px dotted #000; display: flex; flex-direction: column; justify-content: flex-end;">
        <div class="field-val" style="min-height: 18px; padding: 2px 4px; font-weight: bold; font-size: 8.5pt; text-align: center;">${surname}</div>
        <div style="border-top: 1px dotted #000; padding: 1.5px 2px; font-weight: bold; font-size: 7pt; text-align: center;">SURNAME</div>
      </div>
      <div style="width: 29%; border-right: 1px dotted #000; display: flex; flex-direction: column; justify-content: flex-end;">
        <div class="field-val" style="min-height: 18px; padding: 2px 4px; font-weight: bold; font-size: 8.5pt; text-align: center;">${firstName}</div>
        <div style="border-top: 1px dotted #000; padding: 1.5px 2px; font-weight: bold; font-size: 7pt; text-align: center;">FIRST NAME</div>
      </div>
      <div style="width: 24%; border-right: 1px dotted #000; display: flex; flex-direction: column; justify-content: flex-end;">
        <div class="field-val" style="min-height: 18px; padding: 2px 4px; font-weight: bold; font-size: 8.5pt; text-align: center;">${middleName}</div>
        <div style="border-top: 1px dotted #000; padding: 1.5px 2px; font-weight: bold; font-size: 7pt; text-align: center;">MIDDLE NAME</div>
      </div>
      <div style="width: 20%; display: flex; flex-direction: column; justify-content: flex-end;">
        <div class="field-val" style="min-height: 18px; padding: 2px 4px; font-weight: bold; font-size: 8.5pt; text-align: center;">${suffix}</div>
        <div style="border-top: 1px dotted #000; padding: 1.5px 2px; font-weight: bold; font-size: 6.8pt; text-align: center;">SUFFIX (Ex: Sr., Jr., III, etc.)</div>
      </div>
    </div>

    <!-- Row: Date of Birth & Age -->
    <div style="display: flex; border-bottom: 1px solid #000; align-items: stretch;">
      <div style="width: 48%; padding: 2px 6px; display: flex; align-items: center; border-right: 1px solid #000;">
        <span style="font-weight: bold; font-size: 7.5pt; width: 145px; flex-shrink: 0;">DATE OF BIRTH <span style="font-size: 6.8pt; font-weight: normal;">(mm/dd/yyyy)</span></span>
        <span class="field-val" style="flex: 1; padding-left: 6px;">${dob}</span>
      </div>
      <div style="width: 52%; padding: 2px 6px; display: flex; align-items: center;">
        <span style="font-weight: bold; font-size: 7.5pt; width: 42px; flex-shrink: 0;">AGE:</span>
        <span class="field-val" style="flex: 1; padding-left: 6px;">${age}</span>
      </div>
    </div>

    <!-- Split Row: Sex / Religion / Civil Status (Left) & Present Address (Right) -->
    <div style="display: flex; border-bottom: 1px solid #000;">
      <!-- Left Column -->
      <div style="width: 38%; display: flex; flex-direction: column; border-right: 1px solid #000;">
        <!-- Sex -->
        <div style="display: flex; align-items: center; padding: 2px 6px; border-bottom: 1px solid #000; gap: 12px;">
          <span style="font-weight: bold; font-size: 7.5pt; width: 45px;">SEX</span>
          <span class="chk-label"><span class="${chk(isMale)}"></span>Male</span>
          <span class="chk-label"><span class="${chk(isFemale)}"></span>Female</span>
        </div>
        <!-- Religion -->
        <div style="display: flex; align-items: center; padding: 2px 6px; border-bottom: 1px solid #000; gap: 8px;">
          <span style="font-weight: bold; font-size: 7.5pt; width: 65px;">RELIGION</span>
          <span class="field-val" style="font-size: 8pt;">${religion}</span>
        </div>
        <!-- Civil Status -->
        <div style="display: flex; padding: 3px 6px; flex: 1;">
          <div style="font-weight: bold; font-size: 7.5pt; width: 65px; line-height: 1.2;">CIVIL<br>STATUS</div>
          <div style="display: flex; flex-direction: column; gap: 3px;">
            <span class="chk-label"><span class="${chk(isSingle)}"></span>Single</span>
            <span class="chk-label"><span class="${chk(isMarried)}"></span>Married</span>
            <span class="chk-label"><span class="${chk(isWidowed)}"></span>Widowed</span>
          </div>
        </div>
      </div>

      <!-- Right Column: Present Address -->
      <div style="width: 62%; display: flex; flex-direction: column;">
        <div style="font-weight: bold; font-size: 7.5pt; padding: 2px 6px; border-bottom: 1px solid #000;">PRESENT ADDRESS</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 7.5pt;">
          <tr>
            <td style="width: 42%; border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 2px 6px;">House No./ Street Village</td>
            <td style="border-bottom: 1px solid #000; padding: 2px 6px;" class="field-val">${streetStr}</td>
          </tr>
          <tr>
            <td style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 2px 6px;">Barangay</td>
            <td style="border-bottom: 1px solid #000; padding: 2px 6px;" class="field-val">${brgyStr}</td>
          </tr>
          <tr>
            <td style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 2px 6px;">Municipality/City</td>
            <td style="border-bottom: 1px solid #000; padding: 2px 6px;" class="field-val">${muniStr}</td>
          </tr>
          <tr>
            <td style="border-right: 1px solid #000; padding: 2px 6px;">Province</td>
            <td style="padding: 2px 6px;" class="field-val">${provStr}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Row: TIN & Height (With Explicit Field Divider Border) -->
    <div style="display: flex; border-bottom: 1px solid #000;">
      <!-- Left: TIN -->
      <div style="width: 70%; display: flex; border-right: 1px solid #000;">
        <div style="width: 22%; padding: 2.5px 6px; font-weight: bold; font-size: 7.5pt; border-right: 1px solid #000; display: flex; align-items: center;">TIN</div>
        <div style="width: 78%; padding: 2.5px 6px;" class="field-val">${tin}</div>
      </div>
      <!-- Right: HEIGHT (FT.) -->
      <div style="width: 30%; display: flex;">
        <div style="width: 50%; padding: 2.5px 4px; font-weight: bold; font-size: 7.2pt; border-right: 1px solid #000; display: flex; align-items: center;">HEIGHT (FT.)</div>
        <div style="width: 50%; padding: 2.5px 4px;" class="field-val">${height}</div>
      </div>
    </div>

    <!-- Row: Disability & Contact/Email (With Explicit Field Divider Border) -->
    <div style="display: flex; border-bottom: 1.5px solid #000;">
      <!-- Disability Column -->
      <div style="width: 70%; padding: 3px 6px; border-right: 1px solid #000;">
        <div style="display: flex; align-items: flex-start; gap: 8px;">
          <span style="font-weight: bold; font-size: 7.5pt; width: 68px; flex-shrink: 0;">DISABILITY</span>
          <div style="display: flex; flex-direction: column; gap: 3px; flex: 1;">
            <div style="display: flex; gap: 14px;">
              <span class="chk-label"><span class="${chk(hasVisual)}"></span>Visual</span>
              <span class="chk-label"><span class="${chk(hasSpeech)}"></span>Speech</span>
              <span class="chk-label"><span class="${chk(hasMental)}"></span>Mental</span>
            </div>
            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
              <span class="chk-label"><span class="${chk(hasHearing)}"></span>Hearing</span>
              <span class="chk-label"><span class="${chk(hasPhysical)}"></span>Physical</span>
              <span class="chk-label">
                <span class="${chk(hasOthersDis)}"></span>Others Please specify:
                <span class="field-val" style="border-bottom: 1px solid #000; min-width: 90px; margin-left: 4px; display: inline-block;">${disOthersText || '&nbsp;'}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <!-- Contact / Email Column with Exact Dividers -->
      <div style="width: 30%; display: flex; flex-direction: column;">
        <div style="display: flex; border-bottom: 1px solid #000; flex: 1;">
          <div style="width: 50%; font-weight: bold; font-size: 7pt; padding: 2px 4px; border-right: 1px solid #000; display: flex; align-items: center; line-height: 1.15;">
            CONTACT<br>NUMBER/S
          </div>
          <div style="width: 50%; padding: 2px 4px; display: flex; align-items: center;" class="field-val">${contact}</div>
        </div>
        <div style="display: flex; flex: 1;">
          <div style="width: 50%; font-weight: bold; font-size: 7.2pt; padding: 2px 4px; border-right: 1px solid #000; display: flex; align-items: center;">
            E-MAIL
          </div>
          <div style="width: 50%; padding: 2px 4px; word-break: break-all; font-size: 7pt; display: flex; align-items: center;" class="field-val">${email}</div>
        </div>
      </div>
    </div>

    <!-- ─── EMPLOYMENT STATUS / TYPE ─── -->
    <div style="font-weight: bold; font-size: 8pt; padding: 2px 6px; border-bottom: 1px solid #000;">EMPLOYMENT STATUS / TYPE</div>
    <div style="display: flex; border-bottom: 1px solid #000;">
      <!-- Employed Column -->
      <div style="width: 46%; padding: 4px 6px; border-right: 1px solid #000;">
        <span class="chk-label" style="font-weight: bold;"><span class="${chk(isEmployed)}"></span>Employed</span>
        <div style="margin-left: 18px; margin-top: 3px; display: flex; flex-direction: column; gap: 2px;">
          <span class="chk-label"><span class="${chk(isWageEmployed)}"></span>Wage employed</span>
          <span class="chk-label"><span class="${chk(isSelfEmployed)}"></span>Self-employed (Please specify)</span>
          <div style="margin-left: 16px; display: flex; flex-direction: column; gap: 1.5px; font-size: 7pt;">
            <span class="chk-label"><span class="${chk(isFisher)}"></span>Fisherman/Fisherfolk</span>
            <span class="chk-label"><span class="${chk(isVendor)}"></span>Vendor/Retailer</span>
            <span class="chk-label"><span class="${chk(isHomeBased)}"></span>Home-based worker</span>
            <span class="chk-label"><span class="${chk(isTransport)}"></span>Transport</span>
            <span class="chk-label"><span class="${chk(isDomestic)}"></span>Domestic Worker</span>
            <span class="chk-label"><span class="${chk(isFreelancer)}"></span>Freelancer</span>
            <span class="chk-label"><span class="${chk(isArtisan)}"></span>Artisan/Craft Worker</span>
            <div style="display: flex; align-items: center; margin-top: 1px;">
              <span class="chk-label"><span class="${chk(isSelfOthers)}"></span>Others (Please specify):</span>
              <span class="field-val" style="border-bottom: 1px solid #000; flex: 1; margin-left: 3px;">${selfOthersText || '&nbsp;'}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Unemployed Column -->
      <div style="width: 54%; padding: 4px 6px;">
        <span class="chk-label" style="font-weight: bold;"><span class="${chk(isUnemployed)}"></span>Unemployed</span>
        <div style="margin-left: 18px; margin-top: 2px; font-size: 7.2pt; display: flex; align-items: center;">
          <span>How long have you been looking for work? (months)</span>
          <span class="field-val" style="border-bottom: 1px solid #000; min-width: 45px; text-align: center; margin-left: 4px;">${monthsLooking || '&nbsp;'}</span>
        </div>

        <div style="display: flex; margin-left: 18px; margin-top: 4px;">
          <div style="width: 50%; display: flex; flex-direction: column; gap: 2px;">
            <span class="chk-label"><span class="${chk(isNewEntrant)}"></span>New Entrant/Fresh Graduate</span>
            <span class="chk-label"><span class="${chk(isFinishedContract)}"></span>Finished Contract</span>
            <span class="chk-label"><span class="${chk(isResigned)}"></span>Resigned</span>
            <span class="chk-label"><span class="${chk(isRetired)}"></span>Retired</span>
            <span class="chk-label" style="margin-top: 2px;"><span class="${chk(isCalamity)}"></span>Terminated/Laid off due to calamity</span>
          </div>
          <div style="width: 50%; display: flex; flex-direction: column; gap: 2.5px;">
            <span class="chk-label"><span class="${chk(isTerminatedLocal)}"></span>Terminated/Laid off (local)</span>
            <div>
              <span class="chk-label"><span class="${chk(isTerminatedAbroad)}"></span>Terminated/Laid off (abroad)</span>
              <div style="font-size: 6.8pt; margin-left: 16px; display: flex; align-items: center;">
                <span>specify country:</span>
                <span class="field-val" style="border-bottom: 1px solid #000; flex: 1; margin-left: 3px;">&nbsp;</span>
              </div>
            </div>
            <div>
              <span class="chk-label"><span class="${chk(isUnempOthers)}"></span>Others, please specify:</span>
              <span class="field-val" style="border-bottom: 1px solid #000; display: block; margin-left: 16px; margin-top: 1px;">${isUnempOthers ? escapeHtml(a.unemployedReason) : '&nbsp;'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- OFW & 4Ps Rows -->
    <div style="display: flex; border-bottom: 1px solid #000;">
      <div style="width: 38%; padding: 3px 6px; border-right: 1px solid #000;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 7.5pt;">Are you an OFW?</span>
          <span class="chk-label"><span class="${chk(isOfw)}"></span>Yes</span>
          <span class="chk-label"><span class="${chk(!isOfw)}"></span>No</span>
        </div>
        <div style="display: flex; align-items: center; margin-top: 2px; font-size: 7.2pt;">
          <span>Specify country</span>
          <span class="field-val" style="border-bottom: 1px solid #000; flex: 1; margin-left: 4px;">${ofwCountry || '&nbsp;'}</span>
        </div>
      </div>

      <div style="width: 62%; padding: 3px 6px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 7.5pt;">Are you a former OFW?</span>
          <span class="chk-label"><span class="${chk(isFormerOfw)}"></span>Yes</span>
          <span class="chk-label"><span class="${chk(!isFormerOfw)}"></span>No</span>
        </div>
        <div style="display: flex; align-items: center; margin-top: 2px; font-size: 7.2pt;">
          <span>Latest country of deployment</span>
          <span class="field-val" style="border-bottom: 1px solid #000; flex: 1; margin-left: 4px;">${formerOfwCountry || '&nbsp;'}</span>
        </div>
        <div style="display: flex; align-items: center; margin-top: 2px; font-size: 7.2pt;">
          <span>Month and year of return to Philippines</span>
          <span class="field-val" style="border-bottom: 1px solid #000; flex: 1; margin-left: 4px;">${formerOfwReturn || '&nbsp;'}</span>
        </div>
      </div>
    </div>

    <!-- 4Ps Beneficiary Row -->
    <div style="padding: 2.5px 6px; border-bottom: 1.5px solid #000; display: flex; align-items: center; gap: 10px; font-size: 7.5pt;">
      <span>Are you a 4Ps beneficiary?</span>
      <span class="chk-label"><span class="${chk(is4ps)}"></span>Yes</span>
      <span class="chk-label"><span class="${chk(!is4ps)}"></span>No</span>
      <span style="margin-left: 12px;">If yes, please provide Household ID No.</span>
      <span class="field-val" style="border-bottom: 1px solid #000; flex: 1;">${hhid4ps || '&nbsp;'}</span>
    </div>

    <!-- ─── II. JOB PREFERENCE ─── -->
    <div class="section-banner">II. JOB PREFERENCE</div>
    <table class="nsrp-table" style="border: none;">
      <colgroup>
        <col style="width: 24px;">
        <col style="width: 31%;">
        <col style="width: 24px;">
        <col style="width: 33%;">
        <col style="width: 24px;">
        <col style="width: 33%;">
      </colgroup>
      <thead>
        <tr>
          <th colspan="2" style="border-top: none; border-left: none; border-bottom: 1px solid #000; padding: 2.5px 4px; text-align: center; font-weight: bold;">
            PREFERRED OCCUPATION
          </th>
          <th colspan="4" style="border-top: none; border-right: none; border-bottom: 1px solid #000; padding: 2.5px 4px; text-align: center; font-weight: bold;">
            PREFERRED WORK LOCATION
          </th>
        </tr>
        <tr>
          <th colspan="2" style="border-left: none; border-bottom: 1px solid #000; padding: 2px 4px; font-weight: normal; text-align: center;">
            <div style="display: flex; justify-content: center; gap: 12px;">
              <span class="chk-label"><span class="${chk(isPartTime)}"></span>Part-time</span>
              <span class="chk-label"><span class="${chk(isFullTime)}"></span>Full-time</span>
            </div>
          </th>
          <th colspan="2" style="border-bottom: 1px solid #000; padding: 2px 4px; font-weight: normal; text-align: left;">
            <span class="chk-label"><span class="${chk(hasLocalLoc || !hasOverseasLoc)}"></span>Local (specify cities/municipalities):</span>
          </th>
          <th colspan="2" style="border-right: none; border-bottom: 1px solid #000; padding: 2px 4px; font-weight: normal; text-align: left;">
            <span class="chk-label"><span class="${chk(hasOverseasLoc)}"></span>Overseas, (specify countries):</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="col-num" style="border-left: none; border-right: 1px solid #000;">1.</td>
          <td class="field-val">${occ1}</td>
          <td class="col-num" style="border-right: 1px solid #000;">1.</td>
          <td class="field-val">${loc1}</td>
          <td class="col-num" style="border-right: 1px solid #000;">1.</td>
          <td class="field-val" style="border-right: none;">${os1}</td>
        </tr>
        <tr>
          <td class="col-num" style="border-left: none; border-right: 1px solid #000;">2.</td>
          <td class="field-val">${occ2}</td>
          <td class="col-num" style="border-right: 1px solid #000;">2.</td>
          <td class="field-val">${loc2}</td>
          <td class="col-num" style="border-right: 1px solid #000;">2.</td>
          <td class="field-val" style="border-right: none;">${os2}</td>
        </tr>
        <tr>
          <td class="col-num" style="border-left: none; border-right: 1px solid #000;">3.</td>
          <td class="field-val">${occ3}</td>
          <td class="col-num" style="border-right: 1px solid #000;">3.</td>
          <td class="field-val">${loc3}</td>
          <td class="col-num" style="border-right: 1px solid #000;">3.</td>
          <td class="field-val" style="border-right: none;">${os3}</td>
        </tr>
      </tbody>
    </table>

    <!-- ─── III. LANGUAGE / DIALECT PROFICIENCY ─── -->
    <div class="section-banner" style="border-top: 1.5px solid #000;">III. LANGUAGE / DIALECT PROFICIENCY <span style="font-weight: normal; font-size: 7.2pt;">(check if applicable)</span></div>
    <table class="nsrp-table" style="border: none;">
      <colgroup>
        <col style="width: 28%;">
        <col style="width: 18%;">
        <col style="width: 18%;">
        <col style="width: 18%;">
        <col style="width: 18%;">
      </colgroup>
      <thead>
        <tr>
          <th style="width: 28%; border-top: none; border-left: none; text-align: left; padding-left: 6px;">LANGUAGE/DIALECT</th>
          <th style="width: 18%; border-top: none;">READ</th>
          <th style="width: 18%; border-top: none;">WRITE</th>
          <th style="width: 18%; border-top: none;">SPEAK</th>
          <th style="width: 18%; border-top: none; border-right: none;">UNDERSTAND</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border-left: none; font-weight: 500; padding-left: 6px;">English</td>
          <td style="text-align: center;"><span class="${chk(Boolean(langEn.read))}"></span></td>
          <td style="text-align: center;"><span class="${chk(Boolean(langEn.write))}"></span></td>
          <td style="text-align: center;"><span class="${chk(Boolean(langEn.speak))}"></span></td>
          <td style="text-align: center; border-right: none;"><span class="${chk(Boolean(langEn.understand))}"></span></td>
        </tr>
        <tr>
          <td style="border-left: none; font-weight: 500; padding-left: 6px;">Filipino</td>
          <td style="text-align: center;"><span class="${chk(Boolean(langFil.read))}"></span></td>
          <td style="text-align: center;"><span class="${chk(Boolean(langFil.write))}"></span></td>
          <td style="text-align: center;"><span class="${chk(Boolean(langFil.speak))}"></span></td>
          <td style="text-align: center; border-right: none;"><span class="${chk(Boolean(langFil.understand))}"></span></td>
        </tr>
        <tr>
          <td style="border-left: none; font-weight: 500; padding-left: 6px;">Mandarin</td>
          <td style="text-align: center;"><span class="${chk(Boolean(langMan.read))}"></span></td>
          <td style="text-align: center;"><span class="${chk(Boolean(langMan.write))}"></span></td>
          <td style="text-align: center;"><span class="${chk(Boolean(langMan.speak))}"></span></td>
          <td style="text-align: center; border-right: none;"><span class="${chk(Boolean(langMan.understand))}"></span></td>
        </tr>
        <tr>
          <td style="border-left: none; font-weight: 500; padding-left: 6px;">
            Others:<span class="field-val" style="border-bottom: 1px solid #000; min-width: 90px; display: inline-block; margin-left: 4px;">${escapeHtml(langOth.language || '')}</span>
          </td>
          <td style="text-align: center;"><span class="${chk(Boolean(langOth.read))}"></span></td>
          <td style="text-align: center;"><span class="${chk(Boolean(langOth.write))}"></span></td>
          <td style="text-align: center;"><span class="${chk(Boolean(langOth.speak))}"></span></td>
          <td style="text-align: center; border-right: none;"><span class="${chk(Boolean(langOth.understand))}"></span></td>
        </tr>
      </tbody>
    </table>

    <!-- Footer Page 1 -->
    <div class="page-footer">
      <div class="iso-seal">
        <img src="/images/isoSeal.png" alt="ISO 9001:2015 PAB Accredited" class="iso-seal-img" onerror="this.src='/src/assets/images/isoSeal.png'">
      </div>

      <div style="text-align: left; line-height: 1.25;">
        <div><strong>Address :</strong> Nimfa Tiu Bldg. III, JP Rosales Ave., Butuan City</div>
        <div><strong>Email &nbsp;&nbsp;&nbsp;:</strong> dolecaraga13@gmail.com</div>
        <div><strong>Tel. No :</strong> (085) 225-3229/ 817-2358</div>
      </div>

      <div class="qf-box">
        <div style="font-weight: bold; font-size: 7.5pt;">QF-NSRP-001</div>
        <div>Revision No: 00</div>
        <div>Date Issued: 05/30/2022</div>
      </div>
    </div>

    <div class="page-num">Page 1 of 2</div>

  </div>


  <!-- ══════════════════════════════════════════════════════════════════════════ -->
  <!-- PAGE 2 — BACK PAGE                                                       -->
  <!-- ══════════════════════════════════════════════════════════════════════════ -->
  <div class="page-container" id="page-2">

    <!-- ─── IV. EDUCATIONAL BACKGROUND ─── -->
    <div class="section-banner">IV. EDUCATIONAL BACKGROUND</div>
    
    <div style="padding: 2.5px 6px; border-bottom: 1px solid #000; display: flex; align-items: center; gap: 12px; font-size: 7.5pt;">
      <span>Currently in school?</span>
      <span class="chk-label"><span class="${chk(inSchool)}"></span>Yes</span>
      <span class="chk-label"><span class="${chk(!inSchool)}"></span>No</span>
    </div>

    <table class="nsrp-table" style="border: none;">
      <colgroup>
        <col style="width: 20%;">
        <col style="width: 36%;">
        <col style="width: 14%;">
        <col style="width: 15%;">
        <col style="width: 15%;">
      </colgroup>
      <thead>
        <tr>
          <th rowspan="2" style="width: 20%; border-top: none; border-left: none;">LEVEL</th>
          <th rowspan="2" style="width: 36%; border-top: none;">COURSE</th>
          <th rowspan="2" style="width: 14%; border-top: none;">YEAR GRADUATED</th>
          <th colspan="2" style="width: 30%; border-top: none; border-right: none;">IF UNDERGRADUATE</th>
        </tr>
        <tr>
          <th style="width: 15%;">LEVEL REACHED</th>
          <th style="width: 15%; border-right: none;">YEAR LAST ATTENDED</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border-left: none; font-weight: 500;">Elementary</td>
          <td class="field-val">${escapeHtml(eduElem?.school || eduElem?.course || '')}</td>
          <td style="text-align: center;" class="field-val">${escapeHtml(eduElem?.year_graduated || '')}</td>
          <td style="text-align: center;" class="field-val">${escapeHtml(eduElem?.undergraduate_level_reached || '')}</td>
          <td style="text-align: center; border-right: none;" class="field-val">${escapeHtml(eduElem?.year_graduated || '')}</td>
        </tr>
        <tr>
          <td style="border-left: none;">
            <span class="chk-label"><span class="${chk(isSecNonK12)}"></span>Secondary (Non-K12)</span>
          </td>
          <td style="padding: 0;">
            <div style="display: flex; min-height: 20px;">
              <div style="width: 44%; padding: 2px 4px; border-right: 1px solid #000; display: flex; align-items: center;">
                <span class="chk-label"><span class="${chk(isSecK12)}"></span>Secondary (K-12)</span>
              </div>
              <div style="width: 56%; padding: 2px 4px; display: flex; align-items: center; gap: 4px;">
                <span style="font-size: 7pt; font-weight: bold; flex-shrink: 0;">Senior High Strand:</span>
                <span class="field-val" style="font-size: 7.5pt; flex: 1;">${escapeHtml(eduSec?.course || '')}</span>
              </div>
            </div>
          </td>
          <td style="text-align: center;" class="field-val">${escapeHtml(eduSec?.year_graduated || '')}</td>
          <td style="text-align: center;" class="field-val">${escapeHtml(eduSec?.undergraduate_level_reached || '')}</td>
          <td style="text-align: center; border-right: none;" class="field-val">${escapeHtml(eduSec?.year_graduated || '')}</td>
        </tr>
        <tr>
          <td style="border-left: none; font-weight: 500;">Tertiary</td>
          <td class="field-val">${escapeHtml(eduTer?.course || eduTer?.school || '')}</td>
          <td style="text-align: center;" class="field-val">${escapeHtml(eduTer?.year_graduated || '')}</td>
          <td style="text-align: center;" class="field-val">${escapeHtml(eduTer?.undergraduate_level_reached || '')}</td>
          <td style="text-align: center; border-right: none;" class="field-val">${escapeHtml(eduTer?.year_graduated || '')}</td>
        </tr>
        <tr>
          <td style="border-left: none; font-weight: 500;">Graduate Studies/<br>Post-graduate</td>
          <td class="field-val">${escapeHtml(eduGrad?.course || eduGrad?.school || '')}</td>
          <td style="text-align: center;" class="field-val">${escapeHtml(eduGrad?.year_graduated || '')}</td>
          <td style="text-align: center;" class="field-val">${escapeHtml(eduGrad?.undergraduate_level_reached || '')}</td>
          <td style="text-align: center; border-right: none;" class="field-val">${escapeHtml(eduGrad?.year_graduated || '')}</td>
        </tr>
      </tbody>
    </table>

    <!-- ─── V. TECHNICAL/VOCATIONAL AND OTHER TRAINING ─── -->
    <div class="section-banner" style="border-top: 1.5px solid #000;">
      V. TECHNICAL/VOCATIONAL AND OTHER TRAINING <span style="font-weight: normal; font-size: 7pt;">(Include courses taken as part of college education)</span>
    </div>
    <table class="nsrp-table" style="border: none;">
      <colgroup>
        <col style="width: 24px;">
        <col style="width: 26%;">
        <col style="width: 13%;">
        <col style="width: 22%;">
        <col style="width: 17%;">
        <col style="width: 20%;">
      </colgroup>
      <thead>
        <tr>
          <th colspan="2" style="border-top: none; border-left: none;">TRAINING/VOCATIONAL COURSE</th>
          <th style="width: 13%; border-top: none;">HOURS OF TRAINING</th>
          <th style="width: 22%; border-top: none;">TRAINING INSTITUTION</th>
          <th style="width: 17%; border-top: none;">SKILLS ACQUIRED</th>
          <th style="width: 20%; border-top: none; border-right: none;">
            <div>CERTIFICATES RECEIVED</div>
            <div style="font-size: 5.8pt; font-weight: normal;">(NC I, NC II, NC III, NC IV, etc.)</div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="col-num" style="border-left: none; border-right: 1px solid #000;">1.</td>
          <td class="field-val">${escapeHtml(voc1.course_training_title || '')}</td>
          <td style="text-align: center;" class="field-val">${escapeHtml(voc1.duration || '')}</td>
          <td class="field-val">${escapeHtml(voc1.training_institution || '')}</td>
          <td class="field-val">${escapeHtml(voc1.skills_acquired || '')}</td>
          <td style="border-right: none;" class="field-val">${escapeHtml(voc1.certificates_received || '')}</td>
        </tr>
        <tr>
          <td class="col-num" style="border-left: none; border-right: 1px solid #000;">2.</td>
          <td class="field-val">${escapeHtml(voc2.course_training_title || '')}</td>
          <td style="text-align: center;" class="field-val">${escapeHtml(voc2.duration || '')}</td>
          <td class="field-val">${escapeHtml(voc2.training_institution || '')}</td>
          <td class="field-val">${escapeHtml(voc2.skills_acquired || '')}</td>
          <td style="border-right: none;" class="field-val">${escapeHtml(voc2.certificates_received || '')}</td>
        </tr>
        <tr>
          <td class="col-num" style="border-left: none; border-right: 1px solid #000;">3.</td>
          <td class="field-val">${escapeHtml(voc3.course_training_title || '')}</td>
          <td style="text-align: center;" class="field-val">${escapeHtml(voc3.duration || '')}</td>
          <td class="field-val">${escapeHtml(voc3.training_institution || '')}</td>
          <td class="field-val">${escapeHtml(voc3.skills_acquired || '')}</td>
          <td style="border-right: none;" class="field-val">${escapeHtml(voc3.certificates_received || '')}</td>
        </tr>
      </tbody>
    </table>

    <!-- ─── VI. ELIGIBILITY/ PROFESSIONAL LICENSE ─── -->
    <div class="section-banner" style="border-top: 1.5px solid #000;">VI. ELIGIBILITY/ PROFESSIONAL LICENSE</div>
    <table class="nsrp-table" style="border: none;">
      <colgroup>
        <col style="width: 24px;">
        <col style="width: 32%;">
        <col style="width: 15%;">
        <col style="width: 24px;">
        <col style="width: 32%;">
        <col style="width: 15%;">
      </colgroup>
      <thead>
        <tr>
          <th colspan="2" style="border-top: none; border-left: none;">ELIGIBILITY (Civil Service)</th>
          <th style="width: 15%; border-top: none;">DATE TAKEN</th>
          <th colspan="2" style="border-top: none;">PROFESSIONAL LICENSE (PRC)</th>
          <th style="width: 15%; border-top: none; border-right: none;">VALID UNTIL</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="col-num" style="border-left: none; border-right: 1px solid #000;">1.</td>
          <td class="field-val">${escapeHtml(elig1.eligibility_title || '')}</td>
          <td style="text-align: center;" class="field-val">${escapeHtml(elig1.date_of_examination || '')}</td>
          <td class="col-num" style="border-right: 1px solid #000;">1.</td>
          <td class="field-val"></td>
          <td style="text-align: center; border-right: none;" class="field-val"></td>
        </tr>
        <tr>
          <td class="col-num" style="border-left: none; border-right: 1px solid #000;">2.</td>
          <td class="field-val">${escapeHtml(elig2.eligibility_title || '')}</td>
          <td style="text-align: center;" class="field-val">${escapeHtml(elig2.date_of_examination || '')}</td>
          <td class="col-num" style="border-right: 1px solid #000;">2.</td>
          <td class="field-val"></td>
          <td style="text-align: center; border-right: none;" class="field-val"></td>
        </tr>
      </tbody>
    </table>

    <!-- ─── VII. WORK EXPERIENCE ─── -->
    <div class="section-banner" style="border-top: 1.5px solid #000;">
      VII. WORK EXPERIENCE <span style="font-weight: normal; font-size: 7pt;">(Limit to 10 year period, start with the most recent employment)</span>
    </div>
    <table class="nsrp-table" style="border: none;">
      <colgroup>
        <col style="width: 25%;">
        <col style="width: 24%;">
        <col style="width: 23%;">
        <col style="width: 10%;">
        <col style="width: 18%;">
      </colgroup>
      <thead>
        <tr>
          <th style="width: 25%; border-top: none; border-left: none;">COMPANY NAME</th>
          <th style="width: 24%; border-top: none;">ADDRESS (City/Municipality)</th>
          <th style="width: 23%; border-top: none;">POSITION</th>
          <th style="width: 10%; border-top: none;">NUMBER OF MONTHS</th>
          <th style="width: 18%; border-top: none; border-right: none;">
            <div>STATUS</div>
            <div style="font-size: 5.8pt; font-weight: normal;">(Permanent, Contractual, Part-time, Probationary)</div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border-left: none;" class="field-val">${escapeHtml(work1.company_name || '')}</td>
          <td class="field-val">${escapeHtml(work1.address || '')}</td>
          <td class="field-val">${escapeHtml(work1.position || work1.job_title || '')}</td>
          <td style="text-align: center;" class="field-val">${work1.number_of_months != null ? escapeHtml(work1.number_of_months) : ''}</td>
          <td style="border-right: none; text-align: center;" class="field-val">${escapeHtml(work1.status_of_appointment || '')}</td>
        </tr>
        <tr>
          <td style="border-left: none;" class="field-val">${escapeHtml(work2.company_name || '')}</td>
          <td class="field-val">${escapeHtml(work2.address || '')}</td>
          <td class="field-val">${escapeHtml(work2.position || work2.job_title || '')}</td>
          <td style="text-align: center;" class="field-val">${work2.number_of_months != null ? escapeHtml(work2.number_of_months) : ''}</td>
          <td style="border-right: none; text-align: center;" class="field-val">${escapeHtml(work2.status_of_appointment || '')}</td>
        </tr>
        <tr>
          <td style="border-left: none;" class="field-val">${escapeHtml(work3.company_name || '')}</td>
          <td class="field-val">${escapeHtml(work3.address || '')}</td>
          <td class="field-val">${escapeHtml(work3.position || work3.job_title || '')}</td>
          <td style="text-align: center;" class="field-val">${work3.number_of_months != null ? escapeHtml(work3.number_of_months) : ''}</td>
          <td style="border-right: none; text-align: center;" class="field-val">${escapeHtml(work3.status_of_appointment || '')}</td>
        </tr>
      </tbody>
    </table>

    <!-- ─── VIII. OTHER SKILLS ACQUIRED WITHOUT CERTIFICATE ─── -->
    <div class="section-banner" style="border-top: 1.5px solid #000;">VIII. OTHER SKILLS ACQUIRED WITHOUT CERTIFICATE</div>
    <div style="display: flex; border-bottom: 1.5px solid #000; padding: 4px 6px;">
      <div style="width: 33%; display: flex; flex-direction: column; gap: 3px; border-right: 1px solid #000; padding-right: 6px;">
        <span class="chk-label"><span class="${chk(hasSkill('mechanic'))}"></span>AUTO MECHANIC</span>
        <span class="chk-label"><span class="${chk(hasSkill('beautician'))}"></span>BEAUTICIAN</span>
        <span class="chk-label"><span class="${chk(hasSkill('carpentry'))}"></span>CARPENTRY WORK</span>
        <span class="chk-label"><span class="${chk(hasSkill('computer'))}"></span>COMPUTER LITERATE</span>
        <span class="chk-label"><span class="${chk(hasSkill('domestic'))}"></span>DOMESTIC CHORES</span>
        <span class="chk-label"><span class="${chk(hasSkill('driver'))}"></span>DRIVER</span>
      </div>
      <div style="width: 33%; display: flex; flex-direction: column; gap: 3px; border-right: 1px solid #000; padding-left: 8px; padding-right: 6px;">
        <span class="chk-label"><span class="${chk(hasSkill('electrician'))}"></span>ELECTRICIAN</span>
        <span class="chk-label"><span class="${chk(hasSkill('embroidery'))}"></span>EMBROIDERY</span>
        <span class="chk-label"><span class="${chk(hasSkill('gardening'))}"></span>GARDENING</span>
        <span class="chk-label"><span class="${chk(hasSkill('masonry'))}"></span>MASONRY</span>
        <span class="chk-label"><span class="${chk(hasSkill('paint'))}"></span>PAINTER/ARTIST</span>
        <span class="chk-label"><span class="${chk(hasSkill('painting jobs'))}"></span>PAINTING JOBS</span>
      </div>
      <div style="width: 34%; display: flex; flex-direction: column; gap: 3px; padding-left: 8px;">
        <span class="chk-label"><span class="${chk(hasSkill('photography'))}"></span>PHOTOGRAPHY</span>
        <span class="chk-label"><span class="${chk(hasSkill('plumbing'))}"></span>PLUMBING</span>
        <span class="chk-label"><span class="${chk(hasSkill('sewing'))}"></span>SEWING DRESSES</span>
        <span class="chk-label"><span class="${chk(hasSkill('stenography'))}"></span>STENOGRAPHY</span>
        <span class="chk-label"><span class="${chk(hasSkill('tailoring'))}"></span>TAILORING</span>
        <div style="display: flex; align-items: center; margin-top: 1px;">
          <span class="chk-label"><span class="${chk(Boolean(a.otherSkillsSpecified))}"></span>OTHERS:</span>
          <span class="field-val" style="border-bottom: 1px solid #000; flex: 1; margin-left: 4px;">${escapeHtml(a.otherSkillsSpecified || '')}</span>
        </div>
      </div>
    </div>

    <!-- ─── CERTIFICATION/AUTHORIZATION ─── -->
    <div style="padding: 4px 8px; border-bottom: 1.5px solid #000;">
      <div style="text-align: center; font-weight: bold; font-size: 8pt; margin-bottom: 3px;">CERTIFICATION/AUTHORIZATION</div>
      <p style="font-size: 7.2pt; text-align: justify; line-height: 1.25;">
        This is to certify that all data/information that I have provided in this form are true to the best of my knowledge. This is also to authorize DOLE to include my profile in the PESO Employment Information System and use my personal information for employment facilitation. I am also aware that DOLE is not obliged to seek employment on my behalf.
      </p>

      <div style="display: flex; justify-content: space-between; margin-top: 18px; padding: 0 20px;">
        <div style="width: 50%; text-align: center;">
          <div style="border-bottom: 1px solid #000; margin: 0 auto 3px auto; width: 85%; font-size: 8pt; font-weight: bold;">${firstName} ${middleName ? middleName[0] + '. ' : ''}${surname} ${suffix}</div>
          <div style="font-size: 7.5pt;">Signature of Applicant</div>
        </div>
        <div style="width: 35%; text-align: center;">
          <div style="border-bottom: 1px solid #000; margin: 0 auto 3px auto; width: 85%; font-weight: bold; font-size: 8pt;">${signDate}</div>
          <div style="font-size: 7.5pt;">Date</div>
        </div>
      </div>
    </div>

    <!-- ─── FOR USE OF PESO ONLY ─── -->
    <div style="text-align: center; font-weight: bold; font-size: 7.5pt; padding: 2px 6px; border-bottom: 1.5px solid #000; background: #fff;">
      FOR USE OF PESO ONLY. PLEASE DO NOT WRITE BELOW THIS DOTTED LINE.
    </div>
    <div style="display: flex; border-bottom: 1.5px solid #000; padding: 4px 8px;">
      <!-- Referred To -->
      <div style="width: 48%; border-right: 1px solid #000; padding-right: 8px;">
        <div style="font-weight: bold; font-size: 7.5pt; margin-bottom: 3px;">Referred to:</div>
        <div style="display: flex;">
          <div style="width: 50%; display: flex; flex-direction: column; gap: 2.5px;">
            <span class="chk-label"><span class="${chk(refSpes)}"></span>SPES</span>
            <span class="chk-label"><span class="${chk(refGip)}"></span>GIP</span>
            <span class="chk-label"><span class="${chk(refTupad)}"></span>TUPAD</span>
            <span class="chk-label"><span class="${chk(refJobstart)}"></span>JobStart</span>
          </div>
          <div style="width: 50%; display: flex; flex-direction: column; gap: 2.5px;">
            <span class="chk-label"><span class="${chk(refDileep)}"></span>DILEEP</span>
            <span class="chk-label"><span class="${chk(refTesda)}"></span>TESDA Training</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; margin-top: 3px;">
          <span class="chk-label"><span class="${chk(Boolean(refOthers))}"></span>Others, specify:</span>
          <span class="field-val" style="border-bottom: 1px solid #000; flex: 1; margin-left: 4px;">${escapeHtml(refOthers || '')}</span>
        </div>
      </div>

      <!-- Assessed By -->
      <div style="width: 52%; padding-left: 12px; display: flex; flex-direction: column; justify-content: space-between;">
        <div style="font-weight: bold; font-size: 7.5pt;">Assessed by:</div>
        <div style="margin-top: 14px;">
          <div style="border-bottom: 1px solid #000; text-align: center; font-size: 8pt; font-weight: bold;">${assessor}</div>
          <div style="text-align: center; font-size: 7pt; margin-top: 2px;">Signature over Printed Name of Assessor</div>
        </div>
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-top: 6px;">
          <span style="font-size: 7pt; font-weight: bold;">Date:</span>
          <span class="field-val" style="border-bottom: 1px solid #000; min-width: 90px; text-align: center; font-size: 7.5pt;">${assessDate}</span>
        </div>
      </div>
    </div>

    <!-- Footer Page 2 -->
    <div class="page-footer">
      <div class="iso-seal">
        <img src="/images/isoSeal.png" alt="ISO 9001:2015 PAB Accredited" class="iso-seal-img" onerror="this.src='/src/assets/images/isoSeal.png'">
      </div>

      <div style="text-align: left; line-height: 1.25;">
        <div><strong>Address :</strong> Nimfa Tiu Bldg. III, JP Rosales Ave., Butuan City</div>
        <div><strong>Email &nbsp;&nbsp;&nbsp;:</strong> dolecaraga13@gmail.com</div>
        <div><strong>Tel. No :</strong> (085) 225-3229/ 817-2358</div>
      </div>

      <div class="qf-box">
        <div style="font-weight: bold; font-size: 7.5pt;">QF-NSRP-001</div>
        <div>Revision No: 00</div>
        <div>Date Issued: 05/30/2022</div>
      </div>
    </div>

    <div class="page-num">Page 2 of 2</div>

  </div>

  <script src="https://cdn.jsdelivr.net/npm/html2canvas-pro@2.4.1/dist/html2canvas-pro.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script>
    async function downloadPdf() {
      var btn = document.getElementById('btn-download-pdf');
      var originalText = btn.innerHTML;
      btn.innerHTML = '⏳ Generating PDF...';
      btn.disabled = true;

      try {
        var jspdfObj = window.jspdf;
        var jsPDF = jspdfObj.jsPDF;
        var page1 = document.getElementById('page-1');
        var page2 = document.getElementById('page-2');

        var pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        var renderPage = async function(element, isFirst) {
          var canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: 1200
          });
          var imgData = canvas.toDataURL('image/jpeg', 0.98);
          if (!isFirst) {
            pdf.addPage('a4', 'portrait');
          }
          var ratio = canvas.width / canvas.height;
          var targetWidth = 195;
          var targetHeight = targetWidth / ratio;
          if (targetHeight > 287) {
            targetHeight = 287;
            targetWidth = targetHeight * ratio;
          }
          var marginX = (210 - targetWidth) / 2;
          var marginY = (297 - targetHeight) / 2;
          pdf.addImage(imgData, 'JPEG', marginX, marginY, targetWidth, targetHeight, undefined, 'FAST');
        };

        await renderPage(page1, true);
        await renderPage(page2, false);

        pdf.save('NSRP_Form1_${surname || 'applicant'}.pdf');
      } catch (err) {
        console.error('Error generating PDF:', err);
        alert('Failed to generate PDF. You can also use Print Form and select "Save as PDF".');
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`
}

/**
 * Internal helper to generate a 2-page A4 portrait jsPDF document from the NSRP HTML.
 */
async function createNsrpFormJsPdf(applicant: Partial<ApplicantEntryRecord>): Promise<jsPDF> {
  const htmlContent = generateNsrpFormHtml(applicant)

  // Use an isolated hidden iframe so no styles, Tailwind v4 CSS variables or oklch colors bleed into the renderer
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.left = '-99999px'
  iframe.style.top = '0'
  iframe.style.width = '1200px'
  iframe.style.height = '1600px'
  iframe.style.border = '0'
  iframe.style.opacity = '0'
  iframe.style.pointerEvents = 'none'
  iframe.style.zIndex = '-99999'
  document.body.appendChild(iframe)

  try {
    const iframeWin = iframe.contentWindow
    const iframeDoc = iframe.contentDocument || iframeWin?.document
    if (!iframeWin || !iframeDoc) {
      throw new Error('Unable to initialize rendering environment for PDF.')
    }

    // Strip any script tags from the injected HTML to prevent duplicate script execution inside the iframe
    const cleanHtml = htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    iframeDoc.open()
    iframeDoc.write(cleanHtml)
    iframeDoc.close()

    // Strip no-print elements from iframe
    iframeDoc.querySelectorAll('.no-print').forEach((el) => el.remove())

    // Normalize container pages so box-shadow or outer margins don't appear in canvas
    iframeDoc.querySelectorAll('.page-container').forEach((el) => {
      const pageEl = el as HTMLElement
      pageEl.style.boxShadow = 'none'
      pageEl.style.margin = '0 auto'
    })

    // Wait for images (seals, logos) to load
    const images = Array.from(iframeDoc.querySelectorAll('img'))
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalHeight !== 0) {
              resolve()
            } else {
              img.onload = () => resolve()
              img.onerror = () => resolve()
              setTimeout(resolve, 1500)
            }
          })
      )
    )

    // Wait for fonts
    if (iframeDoc.fonts) {
      await iframeDoc.fonts.ready
    }

    await new Promise((resolve) => setTimeout(resolve, 100))

    const page1 = iframeDoc.getElementById('page-1') as HTMLElement
    const page2 = iframeDoc.getElementById('page-2') as HTMLElement

    if (!page1 || !page2) {
      throw new Error('NSRP form pages (#page-1, #page-2) could not be located.')
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    const pdfWidth = 210
    const pdfHeight = 297

    const addElementToPdfPage = async (element: HTMLElement, isFirst: boolean) => {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.98)
      if (!isFirst) {
        pdf.addPage('a4', 'portrait')
      }

      const ratio = canvas.width / canvas.height
      let targetWidth = 195
      let targetHeight = targetWidth / ratio
      if (targetHeight > 287) {
        targetHeight = 287
        targetWidth = targetHeight * ratio
      }
      const marginX = (pdfWidth - targetWidth) / 2
      const marginY = (pdfHeight - targetHeight) / 2

      pdf.addImage(imgData, 'JPEG', marginX, marginY, targetWidth, targetHeight, undefined, 'FAST')
    }

    await addElementToPdfPage(page1, true)
    await addElementToPdfPage(page2, false)

    return pdf
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe)
    }
  }
}

/**
 * Generates and downloads the filled NSRP form as a genuine high-resolution PDF file.
 */
export async function downloadNsrpFormPdf(
  applicant: Partial<ApplicantEntryRecord>,
  customFilename?: string
): Promise<void> {
  const pdf = await createNsrpFormJsPdf(applicant)
  const safeName = (applicant.fullName || applicant.surname || 'applicant')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/gi, '_')
  const fileName = customFilename || `NSRP_Form1_${safeName}.pdf`
  pdf.save(fileName)
}

/**
 * Prepares the NSRP form as a PDF and triggers the browser print interface.
 */
export async function printNsrpForm(applicant: Partial<ApplicantEntryRecord>): Promise<void> {
  const pdf = await createNsrpFormJsPdf(applicant)
  pdf.autoPrint()
  const blob = pdf.output('blob')
  const blobUrl = URL.createObjectURL(blob)

  const printWindow = window.open(blobUrl, '_blank')
  if (!printWindow) {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.src = blobUrl
    document.body.appendChild(iframe)
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (err) {
        console.error('Error triggering iframe print:', err)
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
        URL.revokeObjectURL(blobUrl)
      }, 60000)
    }
  }
}

/**
 * Downloads the filled NSRP form as an HTML file (legacy fallback).
 */
export function downloadNsrpFormHtml(applicant: Partial<ApplicantEntryRecord>, customFilename?: string): void {
  const htmlContent = generateNsrpFormHtml(applicant)
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')

  const safeName = (applicant.fullName || applicant.surname || 'applicant')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/gi, '_')
  a.href = url
  a.download = customFilename || `NSRP_Form1_${safeName}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
