import { computed } from 'vue'
import { useAuthStore } from '@/stores/common/auth'
import { PRIVACY_NOTICE_VERSION } from '@/types/common/privacy'
import { formatPrivacyDate } from '@/helpers/common/privacyHelper'

export interface PrivacyNoticeSection {
  id: string
  title: string
  paragraphs?: string[]
  items?: string[]
}

/** Who answers privacy questions. Replace the email with the designated DPO's once one is assigned (PRIVACY.md §1). */
export const PRIVACY_CONTACT = {
  controller: 'Provincial Government of Agusan del Sur, through the Provincial Public Employment Service Office (PESO)',
  office: 'Government Center, Patin-ay, Prosperidad, Agusan del Sur',
  dpoTitle: 'Data Protection Officer, Provincial PESO Agusan del Sur',
  email: 'peso.agusandelsur13@gmail.com',
}

/**
 * The Privacy Notice (RA 10173 Sec. 16(a) and 18; IRR Sec. 34). Changing what it
 * says about collection, purposes, sharing or retention means bumping PRIVACY_NOTICE_VERSION and
 * core.privacy_notice_version() together, so every account is asked to accept the new version.
 */
const SECTIONS: PrivacyNoticeSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    paragraphs: [
      `AGSURJOBS is run by the ${PRIVACY_CONTACT.controller}, ${PRIVACY_CONTACT.office}. We are the personal information controller: we decide why and how your personal information is processed, and we answer for it under the Data Privacy Act of 2012 (Republic Act No. 10173).`,
    ],
  },
  {
    id: 'what-we-collect',
    title: 'What we collect',
    items: [
      'Account details: name, email address, mobile number, username, date of birth, sex and address.',
      'Your NSRP registration: civil status, religion, height, TIN, disability, 4Ps and OFW status, education, trainings, eligibilities, work experience, skills, preferred jobs and employment status.',
      'Documents you upload: resume, application letter, transcript or diploma, birth certificate, certificates, IDs and photos.',
      'Program records: your GIP, SPES, TUPAD and job applications, their status, appointments and deployments.',
      'For employers: company details and the contact details of company representatives.',
      'Security records: when PESO staff view or change your record, and the network address they used.',
    ],
  },
  {
    id: 'sensitive',
    title: 'Sensitive personal information',
    paragraphs: [
      'Your age, civil status, religion, disability, education and government-issued numbers are sensitive personal information under the law. We process them only to deliver employment services under the PESO Act (Republic Act No. 8759, as amended by Republic Act No. 10691) and with your consent, which you give separately when you sign up.',
      'We do not collect biometric data such as face scans. If we ever do, we will ask for your separate consent first, and you can withdraw it at any time.',
    ],
  },
  {
    id: 'why',
    title: 'Why we use it',
    items: [
      'To register you in the National Skills Registration Program (NSRP) and keep your record up to date.',
      'To match you with job vacancies and refer you to employers.',
      'To process your applications to PESO programs (GIP, SPES, TUPAD and others) and manage deployments.',
      'To contact you about your account, applications and appointments.',
      'To prepare reports for the Department of Labor and Employment, using totals that do not identify you.',
      'To keep the portal secure and to meet audit and records requirements of the government.',
    ],
  },
  {
    id: 'legal-basis',
    title: 'Our legal basis',
    paragraphs: [
      'We process your personal information because you consented to it (Sec. 12(a) and 13(a) of the Data Privacy Act), and because it is needed to carry out PESO\'s functions under the law (Sec. 12(e) and 13(b)). We only collect what these purposes need.',
    ],
  },
  {
    id: 'sharing',
    title: 'Who we share it with',
    items: [
      'PESO staff of the province and your municipality, only for the work they need it for.',
      'The Department of Labor and Employment, for programs it funds or supervises.',
      'Employers, only when you apply for or are referred to their vacancy, and only the details that application needs.',
      'Government offices where you are deployed as a GIP intern or SPES beneficiary.',
      'Service providers that process data for us under our instructions: Supabase (database, file storage and sign-in), Google (reading text from scanned forms entered by PESO staff) and Mapbox (maps). Some of them store data outside the Philippines; we remain responsible for it.',
    ],
    paragraphs: ['We never sell your personal information or use it for advertising.'],
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    items: [
      'Your account and NSRP record: while your account is active, and afterwards for as long as government records rules require.',
      'Read notifications: 1 year.',
      'Records of staff access to your data: 5 years.',
      'Your privacy requests: 5 years after they are closed.',
    ],
    paragraphs: ['When you delete your account, your records and uploaded files are removed from the portal.'],
  },
  {
    id: 'security',
    title: 'How we protect it',
    paragraphs: [
      'Your data travels over encrypted connections. Each staff role can only reach the records its work needs, your documents are stored privately and opened through links that expire, and every time staff view or change your record it is logged. We do not use advertising or tracking cookies; your browser only keeps your sign-in session and public reference lists such as place names.',
      'If a breach puts your personal information at risk, we will notify you and the National Privacy Commission within 72 hours of knowing about it, as the law requires.',
    ],
  },
  {
    id: 'rights',
    title: 'Your rights',
    items: [
      'Be informed about how your personal information is processed.',
      'Access your personal information and get a copy of it, including in a format you can reuse.',
      'Correct inaccurate or outdated information.',
      'Object to processing, and withdraw consent you gave.',
      'Have your personal information deleted or blocked when there is no longer a reason to keep it.',
      'Claim damages and file a complaint with the National Privacy Commission (privacy.gov.ph).',
    ],
    paragraphs: [
      'Signed in, open Privacy & My Data to download your data or send a request. You can also email our Data Protection Officer.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this notice',
    paragraphs: ['When this notice changes in a way that affects you, we will ask you to read and accept it again the next time you sign in.'],
  },
]

/** Public Privacy Notice page: sections, version date and contact. */
export function usePrivacyNotice() {
  const authStore = useAuthStore()

  return {
    sections: SECTIONS,
    contact: PRIVACY_CONTACT,
    effectiveOn: formatPrivacyDate(`${PRIVACY_NOTICE_VERSION}T00:00:00`),
    /** The signed-in account's Privacy & My Data page; staff ask the DPO directly */
    privacyCenterRoute: computed(() => {
      if (!authStore.isAuthenticated) return null
      if (authStore.userRole === 'applicant') return { name: 'privacy-center' }
      if (authStore.userRole === 'company_owner') return { name: 'employer-privacy-center' }
      return null
    }),
  }
}
