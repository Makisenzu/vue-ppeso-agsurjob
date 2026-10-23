import agsurSeal from '@/assets/images/agsur.png'
import pesoLogo from '@/assets/images/pesologo.png'

export interface LandingAboutPoint {
  lead: string
  emphasis: string
  tail: string
}

export interface LandingAboutLogo {
  src: string
  alt: string
  /** Shown by the Avatar if the image fails to load */
  fallback: string
}

// Program facts match the hero slides (SPES: students 15-30, GIP: 18-30). PESO services are
// non-fee charging under the PESO Act (RA 8759)
const POINTS: LandingAboutPoint[] = [
  { lead: 'We connect Agsurnons with employers through ', emphasis: 'job matching', tail: ', referrals, and job fairs.' },
  {
    lead: 'Programs like SPES and GIP give students and young graduates their ',
    emphasis: 'first work experience',
    tail: '.',
  },
  { lead: 'Every service, from career guidance to skills training, is ', emphasis: 'free of charge', tail: '.' },
]

// The province and the office it runs: the Agusan del Sur seal on the left, the PESO logo on the right
const LOGOS: [LandingAboutLogo, LandingAboutLogo] = [
  { src: agsurSeal, alt: 'Seal of the Province of Agusan del Sur', fallback: 'ADS' },
  { src: pesoLogo, alt: 'Provincial PESO logo', fallback: 'PESO' },
]

/** "What is PESO?" section under the hero: eyebrow, two-line title, three key points, two logo avatars side by side. */
export function useLandingAbout() {
  return {
    eyebrow: 'What is PESO?',
    titleLead: 'Provincial PESO',
    titleAccent: 'Agusan del Sur',
    points: POINTS,
    logos: LOGOS,
  }
}
