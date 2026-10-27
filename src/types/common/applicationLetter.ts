/**
 * Where a program's Application Letter goes: the Governor, through the PESO Manager (GIP and SPES).
 * Names come from the org chart's top positions (Site Contents, migration 052) so they follow office changes.
 */
export const APPLICATION_LETTER_ROUTING = {
  addressee: {
    titlePattern: /^(?!.*vice).*governor/i,
    title: 'Provincial Governor',
    office: 'Province of Agusan del Sur',
    // address: 'Government Center, Patin-ay, Prosperidad, Agusan del Sur',
  },
  through: {
    titlePattern: /peso manager/i,
    title: 'Provincial Government Department Head (PESO Manager)',
    /** Shown when the org chart has no PESO Manager yet */
    fallbackName: 'Pauline J. Ang',
  },
  salutation: 'Dear Governor:',
}

/** A program's letter: the shared routing plus its own writing tips */
export type ApplicationLetterConfig = typeof APPLICATION_LETTER_ROUTING & { tips: readonly string[] }

/** The guide shown under a program's Application Letter requirement */
export interface ApplicationLetterGuide {
  addressLines: string[]
  /** Name, then the title on the line below it */
  through: { name: string; title: string }
  salutation: string
  tips: readonly string[]
}
