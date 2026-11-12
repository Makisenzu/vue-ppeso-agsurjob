/**
 * Skills Training (migration 118): the trainings Provincial PESO conducted with a training agency, their
 * participants (registry applicants) with the status PESO tracks, and the skills demand / gap that tells
 * PESO which training to conduct next.
 */

export type TrainingCompletionStatus = 'Enrolled' | 'Completed' | 'Did Not Finish'
export type TrainingEmploymentStatus = 'Not Yet Employed' | 'Hired' | 'Self-Employed' | 'Unreachable'

/** One row of Trainings Conducted (esmdd.skills_trainings_search) */
export interface SkillsTraining {
  id: string
  title: string
  /** The skills it teaches (one or more), A to Z */
  skill_ids: number[]
  skill_names: string[]
  agency: string
  /** ISO dates */
  start_date: string
  end_date: string
  venue: string | null
  municipality: string | null
  remarks: string | null
  participant_count: number
  completed_count: number
  /** Hired or self-employed */
  employed_count: number
  created_at: string
}

export interface SkillsTrainingFilters {
  search: string
  agency: string
  /** A skill id, or 'ALL' */
  skill: string
  /** A year, or 'ALL' */
  year: string
}

/** Agencies and years on file (esmdd.skills_training_filters) */
export interface SkillsTrainingFilterOptions {
  agencies: string[]
  years: number[]
}

/** The Add / Edit Training form */
export interface SkillsTrainingFormValues {
  title: string
  /** One or more skills from the Skill List */
  skillIds: number[]
  agency: string
  startDate: string
  endDate: string
  venue: string
  municipality: string
  remarks: string
}

/** One participant of a training (esmdd.skills_training_participants_search) */
export interface SkillsTrainingParticipant {
  id: string
  applicant_id: string
  full_name: string
  municipality: string | null
  completion_status: TrainingCompletionStatus
  employment_status: TrainingEmploymentStatus
  employer_name: string | null
  date_hired: string | null
  status_remarks: string | null
  status_updated_at: string | null
  created_at: string
}

export interface SkillsTrainingParticipantFilters {
  search: string
  completion: string
  employment: string
}

/** The Update Status form of a participant */
export interface ParticipantStatusFormValues {
  completionStatus: TrainingCompletionStatus
  employmentStatus: TrainingEmploymentStatus
  employerName: string
  dateHired: string
  remarks: string
}

/** A registry applicant who can be added to a training (esmdd.skills_training_candidates) */
export interface SkillsTrainingCandidate {
  applicant_id: string
  full_name: string
  municipality: string | null
  employment_status: string
  /** Already has every skill of the training on their record */
  has_skill: boolean
}

export interface Paged<T> {
  rows: T[]
  total: number
}

// ─── Skills Demand ───

/** Who counts as supply: unemployed jobseekers (default) or every registered jobseeker */
export type SkillsDemandSupply = 'UNEMPLOYED' | 'ALL'

/** One skill of the demand / gap table (esmdd.skills_demand_search) */
export interface SkillsDemandRow {
  skill_id: number
  skill_name: string
  category: string
  /** Vacancies that require the skill, open or closed, and their slots (in the municipality filtered, else everywhere) */
  vacancies: number
  demand_slots: number
  /** Agusan del Sur jobseekers with the skill on their record, province-wide */
  supply: number
  /** Training completers who don't have it on their record yet (counted as supply too), province-wide */
  trained: number
  /** The municipalities' own shortages added up: each one's demand minus the jobseekers living there */
  gap: number
  /** The municipalities that need it, biggest gap first */
  places: string[]
  /** The closed share (closed, filled, cancelled, expired) of vacancies / demand_slots (migrations 122, 123) */
  closed_vacancies: number
  closed_slots: number
}

/** One municipality of a skill (esmdd.skills_demand_places) */
export interface SkillsDemandPlace {
  place_key: string
  place: string
  vacancies: number
  demand: number
  /** Jobseekers living there with the skill, and training completers */
  supply: number
  trained: number
  /** Demand not covered by its own jobseekers */
  gap: number
  /** Its jobseekers beyond its own demand: people other municipalities could draw on */
  surplus: number
}

export interface SkillsDemandFilters {
  search: string
  municipality: string
  category: string
  supply: SkillsDemandSupply
  onlyGaps: boolean
  /** 'ALL', or one open vacancy's id: the table lists that vacancy's skills instead */
  vacancy: string
}

/** Totals above the table (esmdd.skills_demand_summary) */
export interface SkillsDemandSummary {
  skills_in_demand: number
  skills_with_gap: number
  total_demand: number
  total_gap: number
  categories: string[]
  /** Required vacancy skills not on the Skill List yet, which the gap can't count */
  unlinked_wordings: number
}

/** An open vacancy behind a skill's demand (esmdd.skills_demand_vacancies) */
export interface SkillsDemandVacancy {
  vacancy_id: string
  position_title: string
  employer_name: string
  place: string
  slots: number
  valid_until: string | null
  /** Open (status open, not expired); closed, filled, cancelled or expired postings are listed too (migration 121) */
  is_open: boolean
}

/** An open vacancy to pick on the By Skill tab (esmdd.skills_demand_vacancy_options, migration 120) */
export interface SkillsDemandVacancyOption extends SkillsDemandVacancy {
  /** Its required skills that are on the Skill List */
  skills: number
}

/** One required skill of a picked vacancy, counted in the vacancy's municipality (esmdd.skills_demand_vacancy_skills) */
export interface SkillsDemandVacancySkill {
  skill_id: number
  skill_name: string
  category: string
  /** The vacancy's slots */
  demand: number
  /** Jobseekers living in the vacancy's municipality with the skill, and training completers there */
  supply: number
  trained: number
  /** Jobseekers there beyond the vacancy's slots */
  surplus: number
  /** Slots its municipality's jobseekers can't cover */
  gap: number
  /** Jobseekers with it across the province (record + training) */
  province_supply: number
}

/** A jobseeker counted in a skill's supply (esmdd.skills_demand_supply) */
export interface SkillsDemandSupplier {
  applicant_id: string
  /** Upper case, as on the NSRP */
  surname: string
  first_name: string
  middle_name: string | null
  suffix: string | null
  /** Contact numbers, comma-separated */
  contact_number: string | null
  email: string | null
  municipality: string | null
  /** Counted because they completed a training that teaches the skill */
  from_training: boolean
}

// ─── Skills Demand → By Course (migration 119) ───

/** core.courses level, or null for a course only vacancies name */
export type SkillsDemandCourseLevel = 'shs_strand' | 'techvoc' | 'tertiary' | 'graduate'

/** One course of the By Course table (esmdd.skills_demand_courses_search) */
export interface SkillsDemandCourseRow {
  course_key: string
  course: string
  level: SkillsDemandCourseLevel | null
  /** Agusan del Sur jobseekers with the course on their education record, province-wide */
  applicants: number
  /** The same count per municipality, in LANDING_MUNICIPALITIES order (Bayugan … Veruela) */
  places: number[]
  /** Open vacancies that ask for the course, and their slots */
  vacancies: number
  demand_slots: number
  /** The municipalities' own shortages added up: each one's demand minus the jobseekers living there */
  gap: number
}

export interface SkillsDemandCourseFilters {
  search: string
  /** 'ALL', a course level, or 'OTHER' (no level) */
  level: string
  municipality: string
  supply: SkillsDemandSupply
}

/** Totals above the course table (esmdd.skills_demand_courses_summary) */
export interface SkillsDemandCourseSummary {
  courses_on_record: number
  courses_in_demand: number
  /** Asked for by open vacancies, and no jobseeker in the province has it */
  courses_without_supply: number
  total_demand: number
}

/** One municipality of a course (esmdd.skills_demand_course_places) */
export type SkillsDemandCoursePlace = Omit<SkillsDemandPlace, 'trained'>

/** A jobseeker who has a course (esmdd.skills_demand_course_supply) */
export type SkillsDemandCourseSupplier = Omit<SkillsDemandSupplier, 'from_training'>
