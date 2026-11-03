// Content of the applicant / employer Job Fairs pages, laid out like the GIP / SPES / TUPAD pages.
// The hero text and photo are PESO's, from Site Contents → Job Fairs page (108–109; defaults in PUBLIC_PAGES).

export interface JobFairProgramFact {
  label: string
  value: string
}

export interface JobFairProgramStep {
  title: string
  note: string
}

export const JOB_FAIR_ABOUT = {
  title: 'What is a Job Fair?',
  definition:
    'A job fair brings employers and jobseekers together in one venue. Companies set up booths, accept applications and often interview on the spot.',
  purpose:
    'PESO Agusan del Sur organizes job fairs with partner companies so Agsurnons can meet many employers in a single visit.',
}

export const JOB_FAIR_FACTS: readonly JobFairProgramFact[] = [
  { label: 'Organized by', value: 'PESO Agusan del Sur' },
  { label: 'Registration', value: 'Online, through AGSURJOBS' },
  { label: 'Open to', value: 'Jobseekers and verified companies' },
]

export const APPLICANT_JOB_FAIR_PAGE = {
  steps: [
    { title: 'Find a job fair', note: 'Browse the job fairs PESO posted below for the date and venue.' },
    { title: 'Register', note: 'Pre-register online. PESO must verify your account first.' },
    { title: 'Check the companies', note: 'See the confirmed companies, their vacancies and the documents to bring.' },
    { title: 'Attend', note: 'Bring your documents and meet the employers at their booths.' },
  ] satisfies JobFairProgramStep[],
}

export const EMPLOYER_JOB_FAIR_PAGE = {
  steps: [
    { title: 'Join a job fair', note: 'Pick a job fair below and join. Your company must be verified by PESO.' },
    { title: 'Wait for confirmation', note: 'PESO confirms your participation. Applicants see your company after that.' },
    { title: 'Offer vacancies', note: 'Add your open postings or post a new job for the fair.' },
    { title: 'Meet applicants', note: 'Interview jobseekers at your booth on the day.' },
  ] satisfies JobFairProgramStep[],
}
