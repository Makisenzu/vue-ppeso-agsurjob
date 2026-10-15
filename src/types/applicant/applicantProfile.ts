/** A step of the applicant profile's document progress stepper. */
export interface DocumentFile {
  name: string
  type: 'form' | 'application' | 'resume' | 'certificate'
  uploaded: boolean
}
