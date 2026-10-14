export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  applicants: {
    Tables: {
      applicant_experiences: {
        Row: {
          company_name: string | null
          description: string
          end_date: string | null
          id: number
          job_title: string | null
          profile_id: string | null
          start_date: string | null
        }
        Insert: {
          company_name?: string | null
          description: string
          end_date?: string | null
          id?: never
          job_title?: string | null
          profile_id?: string | null
          start_date?: string | null
        }
        Update: {
          company_name?: string | null
          description?: string
          end_date?: string | null
          id?: never
          job_title?: string | null
          profile_id?: string | null
          start_date?: string | null
        }
        Relationships: []
      }
      applicant_requirement_media: {
        Row: {
          alt_text: string | null
          applicant_requirement_id: number | null
          created_at: string
          description: string | null
          filename: string | null
          id: number
          mime_type: string | null
          path: string | null
          profiles_id: string | null
          size: number | null
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          applicant_requirement_id?: number | null
          created_at?: string
          description?: string | null
          filename?: string | null
          id?: never
          mime_type?: string | null
          path?: string | null
          profiles_id?: string | null
          size?: number | null
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          applicant_requirement_id?: number | null
          created_at?: string
          description?: string | null
          filename?: string | null
          id?: never
          mime_type?: string | null
          path?: string | null
          profiles_id?: string | null
          size?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applicant_requirement_media_applicant_requirement_id_fkey"
            columns: ["applicant_requirement_id"]
            isOneToOne: false
            referencedRelation: "applicant_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      applicant_requirements: {
        Row: {
          created_at: string
          id: number
          profile_id: string | null
          remarks: string | null
          requirement_id: number | null
          spes_form_id: string | null
          status: Database["core"]["Enums"]["status_type"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          profile_id?: string | null
          remarks?: string | null
          requirement_id?: number | null
          spes_form_id?: string | null
          status?: Database["core"]["Enums"]["status_type"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          profile_id?: string | null
          remarks?: string | null
          requirement_id?: number | null
          spes_form_id?: string | null
          status?: Database["core"]["Enums"]["status_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applicant_requirements_spes_form_id_fkey"
            columns: ["spes_form_id"]
            isOneToOne: false
            referencedRelation: "spes_form"
            referencedColumns: ["id"]
          },
        ]
      }
      applicant_skill_media: {
        Row: {
          alt_text: string | null
          applicant_skill_id: number | null
          created_at: string
          description: string | null
          filename: string | null
          id: number
          mime_type: string | null
          path: string | null
          size: number | null
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          applicant_skill_id?: number | null
          created_at?: string
          description?: string | null
          filename?: string | null
          id?: never
          mime_type?: string | null
          path?: string | null
          size?: number | null
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          applicant_skill_id?: number | null
          created_at?: string
          description?: string | null
          filename?: string | null
          id?: never
          mime_type?: string | null
          path?: string | null
          size?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applicant_attachment_media_applicant_skill_id_fkey"
            columns: ["applicant_skill_id"]
            isOneToOne: false
            referencedRelation: "applicant_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      applicant_skills: {
        Row: {
          id: number
          profile_id: string | null
          skill_category: string
          skill_name: string
        }
        Insert: {
          id?: never
          profile_id?: string | null
          skill_category: string
          skill_name: string
        }
        Update: {
          id?: never
          profile_id?: string | null
          skill_category?: string
          skill_name?: string
        }
        Relationships: []
      }
      applicants: {
        Row: {
          address: Json
          age: number | null
          assessed_by_name: string | null
          assessment_date: string | null
          civil_status: string | null
          contact_numbers: string[] | null
          created_at: string | null
          currently_in_school: boolean | null
          date_of_birth: string
          disabilities: string[] | null
          disability_others: string | null
          documents_submitted: string[] | null
          educational_background: Json | null
          eligibilities: Json | null
          email: string | null
          employment_status: string | null
          employment_type: string | null
          first_name: string
          former_ofw_country: string | null
          former_ofw_return_date: string | null
          has_disability: boolean | null
          height_ft: number | null
          household_id_4ps: string | null
          id: string
          is_4ps_beneficiary: boolean | null
          is_former_ofw: boolean | null
          is_ofw: boolean | null
          job_type_preference: string[] | null
          language_proficiencies: Json | null
          middle_name: string | null
          months_looking_for_work: number | null
          ofw_country: string | null
          other_skills: string[] | null
          other_skills_specified: string | null
          preferred_local_locations: string[] | null
          preferred_occupations: string[] | null
          preferred_overseas_locations: string[] | null
          profile_id: string | null
          referred_programs: string[] | null
          religion: string | null
          self_employed_type: string | null
          sex: string | null
          suffix: string | null
          surname: string
          tin: string | null
          unemployed_reason: string | null
          updated_at: string | null
          vocational_trainings: Json | null
          work_experiences: Json | null
        }
        Insert: {
          address?: Json
          age?: number | null
          assessed_by_name?: string | null
          assessment_date?: string | null
          civil_status?: string | null
          contact_numbers?: string[] | null
          created_at?: string | null
          currently_in_school?: boolean | null
          date_of_birth: string
          disabilities?: string[] | null
          disability_others?: string | null
          documents_submitted?: string[] | null
          educational_background?: Json | null
          eligibilities?: Json | null
          email?: string | null
          employment_status?: string | null
          employment_type?: string | null
          first_name: string
          former_ofw_country?: string | null
          former_ofw_return_date?: string | null
          has_disability?: boolean | null
          height_ft?: number | null
          household_id_4ps?: string | null
          id?: string
          is_4ps_beneficiary?: boolean | null
          is_former_ofw?: boolean | null
          is_ofw?: boolean | null
          job_type_preference?: string[] | null
          language_proficiencies?: Json | null
          middle_name?: string | null
          months_looking_for_work?: number | null
          ofw_country?: string | null
          other_skills?: string[] | null
          other_skills_specified?: string | null
          preferred_local_locations?: string[] | null
          preferred_occupations?: string[] | null
          preferred_overseas_locations?: string[] | null
          profile_id?: string | null
          referred_programs?: string[] | null
          religion?: string | null
          self_employed_type?: string | null
          sex?: string | null
          suffix?: string | null
          surname: string
          tin?: string | null
          unemployed_reason?: string | null
          updated_at?: string | null
          vocational_trainings?: Json | null
          work_experiences?: Json | null
        }
        Update: {
          address?: Json
          age?: number | null
          assessed_by_name?: string | null
          assessment_date?: string | null
          civil_status?: string | null
          contact_numbers?: string[] | null
          created_at?: string | null
          currently_in_school?: boolean | null
          date_of_birth?: string
          disabilities?: string[] | null
          disability_others?: string | null
          documents_submitted?: string[] | null
          educational_background?: Json | null
          eligibilities?: Json | null
          email?: string | null
          employment_status?: string | null
          employment_type?: string | null
          first_name?: string
          former_ofw_country?: string | null
          former_ofw_return_date?: string | null
          has_disability?: boolean | null
          height_ft?: number | null
          household_id_4ps?: string | null
          id?: string
          is_4ps_beneficiary?: boolean | null
          is_former_ofw?: boolean | null
          is_ofw?: boolean | null
          job_type_preference?: string[] | null
          language_proficiencies?: Json | null
          middle_name?: string | null
          months_looking_for_work?: number | null
          ofw_country?: string | null
          other_skills?: string[] | null
          other_skills_specified?: string | null
          preferred_local_locations?: string[] | null
          preferred_occupations?: string[] | null
          preferred_overseas_locations?: string[] | null
          profile_id?: string | null
          referred_programs?: string[] | null
          religion?: string | null
          self_employed_type?: string | null
          sex?: string | null
          suffix?: string | null
          surname?: string
          tin?: string | null
          unemployed_reason?: string | null
          updated_at?: string | null
          vocational_trainings?: Json | null
          work_experiences?: Json | null
        }
        Relationships: []
      }
      spes_form: {
        Row: {
          age: number | null
          applicant_id: string | null
          availment_1_establishment: string | null
          availment_1_spes_id: string | null
          availment_1_year: string | null
          availment_2_establishment: string | null
          availment_2_spes_id: string | null
          availment_2_year: string | null
          availment_3_establishment: string | null
          availment_3_spes_id: string | null
          availment_3_year: string | null
          availment_4_establishment: string | null
          availment_4_spes_id: string | null
          availment_4_year: string | null
          citizenship: string | null
          civil_status:
            | Database["applicants"]["Enums"]["spes_civil_status_type"]
            | null
          contact_number: string | null
          created_at: string
          date_of_birth: string
          elementary_date_of_attendance: string | null
          elementary_degree_course: string | null
          elementary_school_name: string | null
          elementary_year_level: string | null
          email_address: string | null
          father_contact_no: string | null
          father_name: string | null
          father_occupation: string | null
          first_name: string
          gsis_beneficiary_relationship: string | null
          has_birth_certificate: boolean
          has_income_proof: boolean
          has_osy_certification: boolean
          has_passing_grade_proof: boolean
          has_registrar_certification: boolean
          id: string
          middle_name: string | null
          mother_contact_no: string | null
          mother_maiden_name: string | null
          mother_occupation: string | null
          municipality: string | null
          other_dole_interventions: string | null
          parents_status: Database["applicants"]["Enums"]["spes_parents_status_type"][]
          permanent_address: string | null
          place_of_birth: string | null
          present_address: string | null
          profile_id: string | null
          remarks: string | null
          secondary_date_of_attendance: string | null
          secondary_degree_course: string | null
          secondary_school_name: string | null
          secondary_year_level: string | null
          sex: Database["applicants"]["Enums"]["spes_sex_type"] | null
          social_media_account: string | null
          special_skills: string[]
          status: string
          student_category:
            | Database["applicants"]["Enums"]["spes_student_category_type"]
            | null
          surname: string
          techvoc_date_of_attendance: string | null
          techvoc_degree_course: string | null
          techvoc_school_name: string | null
          techvoc_year_level: string | null
          tertiary_date_of_attendance: string | null
          tertiary_degree_course: string | null
          tertiary_school_name: string | null
          tertiary_year_level: string | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          applicant_id?: string | null
          availment_1_establishment?: string | null
          availment_1_spes_id?: string | null
          availment_1_year?: string | null
          availment_2_establishment?: string | null
          availment_2_spes_id?: string | null
          availment_2_year?: string | null
          availment_3_establishment?: string | null
          availment_3_spes_id?: string | null
          availment_3_year?: string | null
          availment_4_establishment?: string | null
          availment_4_spes_id?: string | null
          availment_4_year?: string | null
          citizenship?: string | null
          civil_status?:
            | Database["applicants"]["Enums"]["spes_civil_status_type"]
            | null
          contact_number?: string | null
          created_at?: string
          date_of_birth: string
          elementary_date_of_attendance?: string | null
          elementary_degree_course?: string | null
          elementary_school_name?: string | null
          elementary_year_level?: string | null
          email_address?: string | null
          father_contact_no?: string | null
          father_name?: string | null
          father_occupation?: string | null
          first_name: string
          gsis_beneficiary_relationship?: string | null
          has_birth_certificate?: boolean
          has_income_proof?: boolean
          has_osy_certification?: boolean
          has_passing_grade_proof?: boolean
          has_registrar_certification?: boolean
          id?: string
          middle_name?: string | null
          mother_contact_no?: string | null
          mother_maiden_name?: string | null
          mother_occupation?: string | null
          municipality?: string | null
          other_dole_interventions?: string | null
          parents_status?: Database["applicants"]["Enums"]["spes_parents_status_type"][]
          permanent_address?: string | null
          place_of_birth?: string | null
          present_address?: string | null
          profile_id?: string | null
          remarks?: string | null
          secondary_date_of_attendance?: string | null
          secondary_degree_course?: string | null
          secondary_school_name?: string | null
          secondary_year_level?: string | null
          sex?: Database["applicants"]["Enums"]["spes_sex_type"] | null
          social_media_account?: string | null
          special_skills?: string[]
          status?: string
          student_category?:
            | Database["applicants"]["Enums"]["spes_student_category_type"]
            | null
          surname: string
          techvoc_date_of_attendance?: string | null
          techvoc_degree_course?: string | null
          techvoc_school_name?: string | null
          techvoc_year_level?: string | null
          tertiary_date_of_attendance?: string | null
          tertiary_degree_course?: string | null
          tertiary_school_name?: string | null
          tertiary_year_level?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          applicant_id?: string | null
          availment_1_establishment?: string | null
          availment_1_spes_id?: string | null
          availment_1_year?: string | null
          availment_2_establishment?: string | null
          availment_2_spes_id?: string | null
          availment_2_year?: string | null
          availment_3_establishment?: string | null
          availment_3_spes_id?: string | null
          availment_3_year?: string | null
          availment_4_establishment?: string | null
          availment_4_spes_id?: string | null
          availment_4_year?: string | null
          citizenship?: string | null
          civil_status?:
            | Database["applicants"]["Enums"]["spes_civil_status_type"]
            | null
          contact_number?: string | null
          created_at?: string
          date_of_birth?: string
          elementary_date_of_attendance?: string | null
          elementary_degree_course?: string | null
          elementary_school_name?: string | null
          elementary_year_level?: string | null
          email_address?: string | null
          father_contact_no?: string | null
          father_name?: string | null
          father_occupation?: string | null
          first_name?: string
          gsis_beneficiary_relationship?: string | null
          has_birth_certificate?: boolean
          has_income_proof?: boolean
          has_osy_certification?: boolean
          has_passing_grade_proof?: boolean
          has_registrar_certification?: boolean
          id?: string
          middle_name?: string | null
          mother_contact_no?: string | null
          mother_maiden_name?: string | null
          mother_occupation?: string | null
          municipality?: string | null
          other_dole_interventions?: string | null
          parents_status?: Database["applicants"]["Enums"]["spes_parents_status_type"][]
          permanent_address?: string | null
          place_of_birth?: string | null
          present_address?: string | null
          profile_id?: string | null
          remarks?: string | null
          secondary_date_of_attendance?: string | null
          secondary_degree_course?: string | null
          secondary_school_name?: string | null
          secondary_year_level?: string | null
          sex?: Database["applicants"]["Enums"]["spes_sex_type"] | null
          social_media_account?: string | null
          special_skills?: string[]
          status?: string
          student_category?:
            | Database["applicants"]["Enums"]["spes_student_category_type"]
            | null
          surname?: string
          techvoc_date_of_attendance?: string | null
          techvoc_degree_course?: string | null
          techvoc_school_name?: string | null
          techvoc_year_level?: string | null
          tertiary_date_of_attendance?: string | null
          tertiary_degree_course?: string | null
          tertiary_school_name?: string | null
          tertiary_year_level?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spes_form_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_spes_form: { Args: { p_form_id: string }; Returns: boolean }
      owns_spes_form: { Args: { p_form_id: string }; Returns: boolean }
    }
    Enums: {
      spes_civil_status_type: "Single" | "Married" | "Widow/er" | "Separated"
      spes_parents_status_type:
        | "Living together"
        | "Solo Parent"
        | "Separated"
        | "Person With Disability"
        | "Senior Citizen"
        | "Sugar Plantation Worker"
        | "Indigenous People"
        | "Displaced Worker (1) Local"
        | "Displaced Worker (2) OFW"
      spes_sex_type: "Male" | "Female"
      spes_student_category_type:
        | "Student"
        | "ALS student"
        | "out-of-school (OSY)"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  core: {
    Tables: {
      biometrics: {
        Row: {
          biometric_type: string | null
          face_embedding: string | null
          id: number
          registered_at: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          biometric_type?: string | null
          face_embedding?: string | null
          id?: never
          registered_at?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          biometric_type?: string | null
          face_embedding?: string | null
          id?: never
          registered_at?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biometrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_media: {
        Row: {
          alt_text: string | null
          created_at: string
          description: string | null
          filename: string | null
          id: number
          mime_type: string | null
          path: string | null
          profile_id: string | null
          size: number | null
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          filename?: string | null
          id?: never
          mime_type?: string | null
          path?: string | null
          profile_id?: string | null
          size?: number | null
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          filename?: string | null
          id?: never
          mime_type?: string | null
          path?: string | null
          profile_id?: string | null
          size?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_media_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_socials: {
        Row: {
          created_at: string
          id: number
          profile_id: string | null
          social_link: string | null
          social_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          profile_id?: string | null
          social_link?: string | null
          social_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          profile_id?: string | null
          social_link?: string | null
          social_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_socials_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          barangay: string | null
          birthdate: string | null
          civil_status: string | null
          contact_number: string | null
          created_at: string
          firstname: string | null
          gender: Database["core"]["Enums"]["gender_type"] | null
          geographic: string | null
          height: string | null
          id: string
          is_4ps: boolean | null
          is_pwd: boolean | null
          last_login: string | null
          lastname: string | null
          middlename: string | null
          province: string | null
          region: string | null
          religion: string | null
          role: Database["core"]["Enums"]["user_role"] | null
          status: Database["core"]["Enums"]["status_type"] | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          barangay?: string | null
          birthdate?: string | null
          civil_status?: string | null
          contact_number?: string | null
          created_at?: string
          firstname?: string | null
          gender?: Database["core"]["Enums"]["gender_type"] | null
          geographic?: string | null
          height?: string | null
          id?: string
          is_4ps?: boolean | null
          is_pwd?: boolean | null
          last_login?: string | null
          lastname?: string | null
          middlename?: string | null
          province?: string | null
          region?: string | null
          religion?: string | null
          role?: Database["core"]["Enums"]["user_role"] | null
          status?: Database["core"]["Enums"]["status_type"] | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          barangay?: string | null
          birthdate?: string | null
          civil_status?: string | null
          contact_number?: string | null
          created_at?: string
          firstname?: string | null
          gender?: Database["core"]["Enums"]["gender_type"] | null
          geographic?: string | null
          height?: string | null
          id?: string
          is_4ps?: boolean | null
          is_pwd?: boolean | null
          last_login?: string | null
          lastname?: string | null
          middlename?: string | null
          province?: string | null
          region?: string | null
          religion?: string | null
          role?: Database["core"]["Enums"]["user_role"] | null
          status?: Database["core"]["Enums"]["status_type"] | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_emails: {
        Args: never
        Returns: {
          email: string
          id: string
        }[]
      }
    }
    Enums: {
      gender_type:
        | "woman"
        | "man"
        | "cisgender_woman"
        | "cisgender_man"
        | "transgender_woman"
        | "transgender_man"
        | "non_binary"
        | "genderqueer"
        | "genderfluid"
        | "agender"
        | "two_spirit"
        | "intersex"
        | "different_identity"
        | "prefer_not_to_say"
      status_type: "pending" | "approved" | "rejected" | "active" | "inactive"
      user_role:
        | "admin"
        | "applicant"
        | "company_owner"
        | "company_member"
        | "provincial_peso"
        | "municipal_peso"
        | "dole"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  employers: {
    Tables: {
      companies: {
        Row: {
          business_type: string | null
          company_address: string | null
          company_contact: string | null
          company_description: string | null
          company_email: string | null
          company_name: string
          created_at: string
          employee_count: number | null
          id: string
          industry: string | null
          latitude: number | null
          longitude: number | null
          profile_id: string | null
          registration_number: string | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["status_type"] | null
          website: string | null
        }
        Insert: {
          business_type?: string | null
          company_address?: string | null
          company_contact?: string | null
          company_description?: string | null
          company_email?: string | null
          company_name: string
          created_at?: string
          employee_count?: number | null
          id?: string
          industry?: string | null
          latitude?: number | null
          longitude?: number | null
          profile_id?: string | null
          registration_number?: string | null
          updated_at?: string
          verification_status?:
            | Database["public"]["Enums"]["status_type"]
            | null
          website?: string | null
        }
        Update: {
          business_type?: string | null
          company_address?: string | null
          company_contact?: string | null
          company_description?: string | null
          company_email?: string | null
          company_name?: string
          created_at?: string
          employee_count?: number | null
          id?: string
          industry?: string | null
          latitude?: number | null
          longitude?: number | null
          profile_id?: string | null
          registration_number?: string | null
          updated_at?: string
          verification_status?:
            | Database["public"]["Enums"]["status_type"]
            | null
          website?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string | null
          created_at: string
          id: number
          profile_id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          status: Database["public"]["Enums"]["status_type"] | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: number
          profile_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["status_type"] | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: number
          profile_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["status_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_requirement_files: {
        Row: {
          alt_text: string | null
          created_at: string
          description: string | null
          employer_requirement_id: number | null
          filename: string
          id: number
          mime_type: string | null
          path: string
          profile_id: string | null
          size: number | null
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          employer_requirement_id?: number | null
          filename: string
          id?: number
          mime_type?: string | null
          path: string
          profile_id?: string | null
          size?: number | null
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          employer_requirement_id?: number | null
          filename?: string
          id?: number
          mime_type?: string | null
          path?: string
          profile_id?: string | null
          size?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employer_requirement_files_employer_requirement_id_fkey"
            columns: ["employer_requirement_id"]
            isOneToOne: false
            referencedRelation: "employer_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_requirements: {
        Row: {
          employer_id: string | null
          id: number
          remarks: string | null
          requirement_id: number | null
          status: Database["public"]["Enums"]["status_type"] | null
          submitted_at: string | null
        }
        Insert: {
          employer_id?: string | null
          id?: number
          remarks?: string | null
          requirement_id?: number | null
          status?: Database["public"]["Enums"]["status_type"] | null
          submitted_at?: string | null
        }
        Update: {
          employer_id?: string | null
          id?: number
          remarks?: string | null
          requirement_id?: number | null
          status?: Database["public"]["Enums"]["status_type"] | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employer_requirements_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  esmdd: {
    Tables: {
      gip_applicants: {
        Row: {
          applicant_id: string | null
          created_at: string | null
          document_submitted: string[] | null
          id: string
          remarks: string[] | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          applicant_id?: string | null
          created_at?: string | null
          document_submitted?: string[] | null
          id?: string
          remarks?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          applicant_id?: string | null
          created_at?: string | null
          document_submitted?: string[] | null
          id?: string
          remarks?: string[] | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gip_applicants_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "gip_applicant_priority_scores"
            referencedColumns: ["applicant_id"]
          },
        ]
      }
      gip_appointments: {
        Row: {
          appointment_code: string
          assigned_office: string
          created_at: string
          daily_stipend: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          end_date: string
          gip_id: string
          id: string
          program: string
          start_date: string
          status: string
          supervisor: string | null
          term_number: number
          updated_at: string
        }
        Insert: {
          appointment_code: string
          assigned_office: string
          created_at?: string
          daily_stipend?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          end_date: string
          gip_id: string
          id?: string
          program: string
          start_date: string
          status?: string
          supervisor?: string | null
          term_number?: number
          updated_at?: string
        }
        Update: {
          appointment_code?: string
          assigned_office?: string
          created_at?: string
          daily_stipend?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          end_date?: string
          gip_id?: string
          id?: string
          program?: string
          start_date?: string
          status?: string
          supervisor?: string | null
          term_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gip_appointments_gip_id_fkey"
            columns: ["gip_id"]
            isOneToOne: false
            referencedRelation: "gips"
            referencedColumns: ["id"]
          },
        ]
      }
      gips: {
        Row: {
          application_id: string | null
          created_at: string | null
          id: string
          remarks: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string | null
          id?: string
          remarks?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          created_at?: string | null
          id?: string
          remarks?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gips_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "gip_applicant_priority_scores"
            referencedColumns: ["gip_applicant_id"]
          },
          {
            foreignKeyName: "gips_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "gip_applicants"
            referencedColumns: ["id"]
          },
        ]
      }
      hots: {
        Row: {
          applicant_contact_phone: string
          applicant_email: string | null
          applicant_first_name: string
          applicant_last_name: string
          applicant_middle_name: string | null
          applicant_profile_id: string | null
          company_id: string | null
          company_name: string
          created_at: string
          hired_date: string
          id: string
          job_fair_id: string
          job_vacancy_id: string | null
          position_hired: string
          remarks: string | null
          updated_at: string
        }
        Insert: {
          applicant_contact_phone: string
          applicant_email?: string | null
          applicant_first_name: string
          applicant_last_name: string
          applicant_middle_name?: string | null
          applicant_profile_id?: string | null
          company_id?: string | null
          company_name: string
          created_at?: string
          hired_date?: string
          id?: string
          job_fair_id: string
          job_vacancy_id?: string | null
          position_hired: string
          remarks?: string | null
          updated_at?: string
        }
        Update: {
          applicant_contact_phone?: string
          applicant_email?: string | null
          applicant_first_name?: string
          applicant_last_name?: string
          applicant_middle_name?: string | null
          applicant_profile_id?: string | null
          company_id?: string | null
          company_name?: string
          created_at?: string
          hired_date?: string
          id?: string
          job_fair_id?: string
          job_vacancy_id?: string | null
          position_hired?: string
          remarks?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hots_job_fair_id_fkey"
            columns: ["job_fair_id"]
            isOneToOne: false
            referencedRelation: "job_fairs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_fair_attachments: {
        Row: {
          created_at: string
          filename: string
          id: string
          job_fair_id: string
          mime_type: string | null
          path: string
          size: number | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          job_fair_id: string
          mime_type?: string | null
          path: string
          size?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          job_fair_id?: string
          mime_type?: string | null
          path?: string
          size?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_fair_attachments_job_fair_id_fkey"
            columns: ["job_fair_id"]
            isOneToOne: false
            referencedRelation: "job_fairs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_fair_participants: {
        Row: {
          acronym: string | null
          barangay: string | null
          business_name: string
          city_municipality: string | null
          company_id: string | null
          contact_person_name: string | null
          contact_person_position: string | null
          created_at: string | null
          email_address: string | null
          employer_category: Database["esmdd"]["Enums"]["employer_category_enum"]
          fax_number: string | null
          id: string
          industry_line: string | null
          is_main_office: boolean | null
          job_fair_id: string
          mobile_number: string | null
          owner_president_name: string | null
          private_employer_type:
            | Database["esmdd"]["Enums"]["private_employer_type_enum"]
            | null
          province: string | null
          public_employer_type:
            | Database["esmdd"]["Enums"]["public_employer_type_enum"]
            | null
          registered_at: string | null
          status: string | null
          street: string | null
          telephone_number: string | null
          tin: string | null
          total_workforce:
            | Database["esmdd"]["Enums"]["total_workforce_enum"]
            | null
          trade_name: string | null
          updated_at: string | null
        }
        Insert: {
          acronym?: string | null
          barangay?: string | null
          business_name: string
          city_municipality?: string | null
          company_id?: string | null
          contact_person_name?: string | null
          contact_person_position?: string | null
          created_at?: string | null
          email_address?: string | null
          employer_category?: Database["esmdd"]["Enums"]["employer_category_enum"]
          fax_number?: string | null
          id?: string
          industry_line?: string | null
          is_main_office?: boolean | null
          job_fair_id: string
          mobile_number?: string | null
          owner_president_name?: string | null
          private_employer_type?:
            | Database["esmdd"]["Enums"]["private_employer_type_enum"]
            | null
          province?: string | null
          public_employer_type?:
            | Database["esmdd"]["Enums"]["public_employer_type_enum"]
            | null
          registered_at?: string | null
          status?: string | null
          street?: string | null
          telephone_number?: string | null
          tin?: string | null
          total_workforce?:
            | Database["esmdd"]["Enums"]["total_workforce_enum"]
            | null
          trade_name?: string | null
          updated_at?: string | null
        }
        Update: {
          acronym?: string | null
          barangay?: string | null
          business_name?: string
          city_municipality?: string | null
          company_id?: string | null
          contact_person_name?: string | null
          contact_person_position?: string | null
          created_at?: string | null
          email_address?: string | null
          employer_category?: Database["esmdd"]["Enums"]["employer_category_enum"]
          fax_number?: string | null
          id?: string
          industry_line?: string | null
          is_main_office?: boolean | null
          job_fair_id?: string
          mobile_number?: string | null
          owner_president_name?: string | null
          private_employer_type?:
            | Database["esmdd"]["Enums"]["private_employer_type_enum"]
            | null
          province?: string | null
          public_employer_type?:
            | Database["esmdd"]["Enums"]["public_employer_type_enum"]
            | null
          registered_at?: string | null
          status?: string | null
          street?: string | null
          telephone_number?: string | null
          tin?: string | null
          total_workforce?:
            | Database["esmdd"]["Enums"]["total_workforce_enum"]
            | null
          trade_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_fair_participants_job_fair_id_fkey"
            columns: ["job_fair_id"]
            isOneToOne: false
            referencedRelation: "job_fairs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_fairs: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          registration_link: string | null
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          registration_link?: string | null
          start_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          registration_link?: string | null
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_vacancies: {
        Row: {
          accepts_pwd: boolean | null
          accepts_returning_ofw: boolean | null
          certification: string | null
          course_shs_strand: string | null
          created_at: string | null
          educational_level: string | null
          eligibility: string | null
          id: string
          job_description: string | null
          job_fair_id: string
          language_dialect_spoken: string[] | null
          license: string | null
          nature_of_work: Database["esmdd"]["Enums"]["nature_of_work_enum"]
          other_qualifications: string[] | null
          participant_id: string
          place_of_work: string | null
          position_title: string
          posting_date: string | null
          pwd_disabilities:
            | Database["esmdd"]["Enums"]["disability_type_enum"][]
            | null
          pwd_other_disability: string | null
          salary: string | null
          status: string | null
          updated_at: string | null
          vacancy_count: number | null
          valid_until: string | null
          work_experience_months: number | null
        }
        Insert: {
          accepts_pwd?: boolean | null
          accepts_returning_ofw?: boolean | null
          certification?: string | null
          course_shs_strand?: string | null
          created_at?: string | null
          educational_level?: string | null
          eligibility?: string | null
          id?: string
          job_description?: string | null
          job_fair_id: string
          language_dialect_spoken?: string[] | null
          license?: string | null
          nature_of_work?: Database["esmdd"]["Enums"]["nature_of_work_enum"]
          other_qualifications?: string[] | null
          participant_id: string
          place_of_work?: string | null
          position_title: string
          posting_date?: string | null
          pwd_disabilities?:
            | Database["esmdd"]["Enums"]["disability_type_enum"][]
            | null
          pwd_other_disability?: string | null
          salary?: string | null
          status?: string | null
          updated_at?: string | null
          vacancy_count?: number | null
          valid_until?: string | null
          work_experience_months?: number | null
        }
        Update: {
          accepts_pwd?: boolean | null
          accepts_returning_ofw?: boolean | null
          certification?: string | null
          course_shs_strand?: string | null
          created_at?: string | null
          educational_level?: string | null
          eligibility?: string | null
          id?: string
          job_description?: string | null
          job_fair_id?: string
          language_dialect_spoken?: string[] | null
          license?: string | null
          nature_of_work?: Database["esmdd"]["Enums"]["nature_of_work_enum"]
          other_qualifications?: string[] | null
          participant_id?: string
          place_of_work?: string | null
          position_title?: string
          posting_date?: string | null
          pwd_disabilities?:
            | Database["esmdd"]["Enums"]["disability_type_enum"][]
            | null
          pwd_other_disability?: string | null
          salary?: string | null
          status?: string | null
          updated_at?: string | null
          vacancy_count?: number | null
          valid_until?: string | null
          work_experience_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_vacancies_job_fair_id_fkey"
            columns: ["job_fair_id"]
            isOneToOne: false
            referencedRelation: "job_fairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_vacancies_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "job_fair_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      spes: {
        Row: {
          application_id: string | null
          beneficiary: string | null
          created_at: string | null
          days_duration: string | null
          id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          beneficiary?: string | null
          created_at?: string | null
          days_duration?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          beneficiary?: string | null
          created_at?: string | null
          days_duration?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      spes_appointments: {
        Row: {
          appointment_code: string
          assigned_barangay: string | null
          assigned_municipality: string
          assigned_province: string | null
          created_at: string
          days_duration: number
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          end_date: string
          id: string
          spes_id: string
          spes_year: number
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_code: string
          assigned_barangay?: string | null
          assigned_municipality: string
          assigned_province?: string | null
          created_at?: string
          days_duration: number
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          end_date: string
          id?: string
          spes_id: string
          spes_year: number
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_code?: string
          assigned_barangay?: string | null
          assigned_municipality?: string
          assigned_province?: string | null
          created_at?: string
          days_duration?: number
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          end_date?: string
          id?: string
          spes_id?: string
          spes_year?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spes_appointments_spes_id_fkey"
            columns: ["spes_id"]
            isOneToOne: false
            referencedRelation: "spes"
            referencedColumns: ["id"]
          },
        ]
      }
      spes_completion_reports: {
        Row: {
          appointment_id: string
          created_at: string
          filename: string
          id: string
          mime_type: string
          path: string
          report_type: string
          size: number | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          filename: string
          id?: string
          mime_type: string
          path: string
          report_type: string
          size?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          filename?: string
          id?: string
          mime_type?: string
          path?: string
          report_type?: string
          size?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spes_completion_reports_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "spes_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      gip_applicant_priority_scores: {
        Row: {
          academic_score: number | null
          address: Json | null
          age: number | null
          applicant_id: string | null
          assessed_by_name: string | null
          assessment_date: string | null
          cert_score: number | null
          civil_status: string | null
          contact_numbers: string[] | null
          currently_in_school: boolean | null
          date_of_birth: string | null
          disabilities: string[] | null
          disability_others: string | null
          document_submitted: string[] | null
          educational_background: Json | null
          eligibilities: Json | null
          eligibility_score: number | null
          email: string | null
          employment_status: string | null
          employment_type: string | null
          first_name: string | null
          former_ofw_country: string | null
          former_ofw_return_date: string | null
          gip_applicant_id: string | null
          gip_created_at: string | null
          gip_status: string | null
          gip_updated_at: string | null
          has_disability: boolean | null
          height_ft: number | null
          household_id_4ps: string | null
          is_4ps_beneficiary: boolean | null
          is_former_ofw: boolean | null
          is_ofw: boolean | null
          job_type_preference: string[] | null
          language_proficiencies: Json | null
          middle_name: string | null
          months_looking_for_work: number | null
          ofw_country: string | null
          other_skills: string[] | null
          other_skills_specified: string | null
          poverty_score: number | null
          preferred_local_locations: string[] | null
          preferred_occupations: string[] | null
          preferred_overseas_locations: string[] | null
          profile_id: string | null
          referred_programs: string[] | null
          religion: string | null
          remarks: string[] | null
          self_employed_type: string | null
          sex: string | null
          status_score: number | null
          suffix: string | null
          surname: string | null
          tin: string | null
          total_priority_score: number | null
          unemployed_reason: string | null
          unemployment_score: number | null
          vocational_trainings: Json | null
          work_experiences: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      disability_type_enum:
        | "Visual"
        | "Physical"
        | "Hearing"
        | "Mental"
        | "Speech"
        | "Others"
      employer_category_enum: "Public" | "Private"
      job_type:
        | "full_time"
        | "part_time"
        | "contract"
        | "internship"
        | "temporary"
      job_vacancy_status: "open" | "closed" | "filled" | "cancelled"
      location_type: "onsite" | "remote" | "hybrid"
      nature_of_work_enum:
        | "Permanent"
        | "Contractual"
        | "Project-based"
        | "Internship / OJT"
        | "Part-time"
        | "Work from home / online job"
      private_employer_type_enum:
        | "Direct Hire"
        | "Local Recruitment Agency"
        | "Overseas Recruitment Agency"
        | "D.O. 174"
      public_employer_type_enum:
        | "National Government Agency"
        | "Local Government Unit"
        | "Government-owned and Controlled Corporation"
        | "State/Local University or College"
      total_workforce_enum:
        | "Micro (1-9)"
        | "Small (10-99)"
        | "Medium (100-199)"
        | "Large (200 and up)"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  jobs: {
    Tables: {
      job_application_attachments: {
        Row: {
          alt_text: string | null
          created_at: string
          description: string | null
          filename: string | null
          id: number
          job_application_id: number | null
          mime_type: string | null
          path: string | null
          size: number | null
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          filename?: string | null
          id?: never
          job_application_id?: number | null
          mime_type?: string | null
          path?: string | null
          size?: number | null
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          filename?: string | null
          id?: never
          job_application_id?: number | null
          mime_type?: string | null
          path?: string | null
          size?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_application_attachments_job_application_id_fkey"
            columns: ["job_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applicant_id: number | null
          created_at: string
          current_stage:
            | Database["jobs"]["Enums"]["application_stage_type"]
            | null
          id: number
          job_posting_id: number | null
          status: Database["core"]["Enums"]["status_type"] | null
          updated_at: string | null
        }
        Insert: {
          applicant_id?: number | null
          created_at?: string
          current_stage?:
            | Database["jobs"]["Enums"]["application_stage_type"]
            | null
          id?: never
          job_posting_id?: number | null
          status?: Database["core"]["Enums"]["status_type"] | null
          updated_at?: string | null
        }
        Update: {
          applicant_id?: number | null
          created_at?: string
          current_stage?:
            | Database["jobs"]["Enums"]["application_stage_type"]
            | null
          id?: never
          job_posting_id?: number | null
          status?: Database["core"]["Enums"]["status_type"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      job_interview_schedules: {
        Row: {
          created_at: string
          duration_minute: number | null
          employer_notes: string | null
          id: number
          job_application_id: number | null
          meeting_link: string | null
          scheduled_time: string | null
          status: Database["core"]["Enums"]["status_type"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          duration_minute?: number | null
          employer_notes?: string | null
          id?: never
          job_application_id?: number | null
          meeting_link?: string | null
          scheduled_time?: string | null
          status?: Database["core"]["Enums"]["status_type"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          duration_minute?: number | null
          employer_notes?: string | null
          id?: never
          job_application_id?: number | null
          meeting_link?: string | null
          scheduled_time?: string | null
          status?: Database["core"]["Enums"]["status_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_interview_schedules_job_application_id_fkey"
            columns: ["job_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          applicant_id: number | null
          created_at: string
          feedback_remarks: string | null
          id: number
          job_posting_id: number | null
          outcome: Database["jobs"]["Enums"]["referral_outcome_type"] | null
          referral_letter: string | null
          referred_by: string | null
          updated_at: string | null
        }
        Insert: {
          applicant_id?: number | null
          created_at?: string
          feedback_remarks?: string | null
          id?: never
          job_posting_id?: number | null
          outcome?: Database["jobs"]["Enums"]["referral_outcome_type"] | null
          referral_letter?: string | null
          referred_by?: string | null
          updated_at?: string | null
        }
        Update: {
          applicant_id?: number | null
          created_at?: string
          feedback_remarks?: string | null
          id?: never
          job_posting_id?: number | null
          outcome?: Database["jobs"]["Enums"]["referral_outcome_type"] | null
          referral_letter?: string | null
          referred_by?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      application_stage_type:
        | "applied"
        | "screening"
        | "interview"
        | "offered"
        | "hired"
        | "rejected"
      referral_outcome_type: "pending_feedback" | "accepted" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      barangays: {
        Row: {
          code: string
          created_at: string | null
          id: string
          lpii_tag: Database["public"]["Enums"]["lpii_type"]
          municipality_id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          lpii_tag?: Database["public"]["Enums"]["lpii_type"]
          municipality_id: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          lpii_tag?: Database["public"]["Enums"]["lpii_type"]
          municipality_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "barangays_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
        ]
      }
      directories: {
        Row: {
          created_at: string
          id: string
          office_code: string
          office_head: string | null
          office_name: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          office_code: string
          office_head?: string | null
          office_name: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          office_code?: string
          office_head?: string | null
          office_name?: string
          status?: string
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: number
          is_active: boolean | null
          mime_type: string | null
          target_role: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: number
          is_active?: boolean | null
          mime_type?: string | null
          target_role?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: number
          is_active?: boolean | null
          mime_type?: string | null
          target_role?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      job_posting: {
        Row: {
          application_deadline: string | null
          created_at: string
          education_required: string | null
          employer_id: number | null
          experience_required: string | null
          id: number
          job_description: string | null
          job_title: string | null
          job_type: string | null
          location: string | null
          salary_max: number | null
          salary_min: number | null
          status: Database["public"]["Enums"]["job_status_type"] | null
          updated_at: string | null
          vacancies: number | null
          work_setup: string | null
        }
        Insert: {
          application_deadline?: string | null
          created_at?: string
          education_required?: string | null
          employer_id?: number | null
          experience_required?: string | null
          id?: never
          job_description?: string | null
          job_title?: string | null
          job_type?: string | null
          location?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status_type"] | null
          updated_at?: string | null
          vacancies?: number | null
          work_setup?: string | null
        }
        Update: {
          application_deadline?: string | null
          created_at?: string
          education_required?: string | null
          employer_id?: number | null
          experience_required?: string | null
          id?: never
          job_description?: string | null
          job_title?: string | null
          job_type?: string | null
          location?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status_type"] | null
          updated_at?: string | null
          vacancies?: number | null
          work_setup?: string | null
        }
        Relationships: []
      }
      job_posting_attachments: {
        Row: {
          alt_text: string | null
          created_at: string
          description: string | null
          filename: string | null
          id: number
          job_posting_id: number
          mime_type: string | null
          path: string
          size: number | null
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          filename?: string | null
          id?: never
          job_posting_id: number
          mime_type?: string | null
          path: string
          size?: number | null
          updated_at?: string | null
          uploaded_by?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          filename?: string | null
          id?: never
          job_posting_id?: number
          mime_type?: string | null
          path?: string
          size?: number | null
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_posting_attachments_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_posting"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posting_media: {
        Row: {
          alt_text: string | null
          created_at: string
          description: string | null
          filename: string | null
          id: number
          job_posting_id: number | null
          mime_type: string | null
          path: string | null
          size: number | null
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          filename?: string | null
          id?: never
          job_posting_id?: number | null
          mime_type?: string | null
          path?: string | null
          size?: number | null
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          filename?: string | null
          id?: never
          job_posting_id?: number | null
          mime_type?: string | null
          path?: string | null
          size?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_posting_media_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_posting"
            referencedColumns: ["id"]
          },
        ]
      }
      job_requirements: {
        Row: {
          additional_requirement: string | null
          id: number
          job_posting_id: number | null
          requirement_id: number | null
        }
        Insert: {
          additional_requirement?: string | null
          id?: never
          job_posting_id?: number | null
          requirement_id?: number | null
        }
        Update: {
          additional_requirement?: string | null
          id?: never
          job_posting_id?: number | null
          requirement_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_requirements_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_posting"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_requirements_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirement_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      municipalities: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_city: boolean | null
          name: string
          province_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_city?: boolean | null
          name: string
          province_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_city?: boolean | null
          name?: string
          province_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipalities_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      provinces: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
          region_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
          region_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provinces_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      requirement_templates: {
        Row: {
          created_at: string
          description: string | null
          id: number
          name: string | null
          requirement_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string | null
          requirement_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          name?: string | null
          requirement_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_if_email_exists: {
        Args: { target_email: string }
        Returns: boolean
      }
    }
    Enums: {
      application_stage_type:
        | "applied"
        | "screened"
        | "interviewing"
        | "offered"
        | "hired"
        | "rejected"
      company_role_type: "owner" | "admin" | "hr" | "employee"
      gender_type: "male" | "female" | "non-binary" | "prefer_not_to_say"
      job_status_type: "draft" | "active" | "paused" | "closed"
      lpii_type: "LOWLAND" | "UPLAND" | "WETLAND"
      notification_type:
        | "application_status"
        | "interview_alert"
        | "referral_update"
        | "compliance_alert"
        | "system_announcement"
      referral_outcome_type:
        | "pending_feedback"
        | "hired"
        | "rejected"
        | "no_show"
      status_type: "pending" | "approved" | "rejected" | "active" | "closed"
      user_role: "applicant" | "employer" | "peso_staff" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  system: {
    Tables: {
      notifications: {
        Row: {
          created_at: string
          id: number
          is_read: boolean | null
          message: string | null
          recipient_id: string | null
          title: string | null
          type: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          is_read?: boolean | null
          message?: string | null
          recipient_id?: string | null
          title?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          is_read?: boolean | null
          message?: string | null
          recipient_id?: string | null
          title?: string | null
          type?: string | null
        }
        Relationships: []
      }
      system_audit_logs: {
        Row: {
          action: string | null
          created_at: string
          id: number
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          id?: never
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          id?: never
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  applicants: {
    Enums: {
      spes_civil_status_type: ["Single", "Married", "Widow/er", "Separated"],
      spes_parents_status_type: [
        "Living together",
        "Solo Parent",
        "Separated",
        "Person With Disability",
        "Senior Citizen",
        "Sugar Plantation Worker",
        "Indigenous People",
        "Displaced Worker (1) Local",
        "Displaced Worker (2) OFW",
      ],
      spes_sex_type: ["Male", "Female"],
      spes_student_category_type: [
        "Student",
        "ALS student",
        "out-of-school (OSY)",
      ],
    },
  },
  core: {
    Enums: {
      gender_type: [
        "woman",
        "man",
        "cisgender_woman",
        "cisgender_man",
        "transgender_woman",
        "transgender_man",
        "non_binary",
        "genderqueer",
        "genderfluid",
        "agender",
        "two_spirit",
        "intersex",
        "different_identity",
        "prefer_not_to_say",
      ],
      status_type: ["pending", "approved", "rejected", "active", "inactive"],
      user_role: [
        "admin",
        "applicant",
        "company_owner",
        "company_member",
        "provincial_peso",
        "municipal_peso",
        "dole",
      ],
    },
  },
  employers: {
    Enums: {},
  },
  esmdd: {
    Enums: {
      disability_type_enum: [
        "Visual",
        "Physical",
        "Hearing",
        "Mental",
        "Speech",
        "Others",
      ],
      employer_category_enum: ["Public", "Private"],
      job_type: [
        "full_time",
        "part_time",
        "contract",
        "internship",
        "temporary",
      ],
      job_vacancy_status: ["open", "closed", "filled", "cancelled"],
      location_type: ["onsite", "remote", "hybrid"],
      nature_of_work_enum: [
        "Permanent",
        "Contractual",
        "Project-based",
        "Internship / OJT",
        "Part-time",
        "Work from home / online job",
      ],
      private_employer_type_enum: [
        "Direct Hire",
        "Local Recruitment Agency",
        "Overseas Recruitment Agency",
        "D.O. 174",
      ],
      public_employer_type_enum: [
        "National Government Agency",
        "Local Government Unit",
        "Government-owned and Controlled Corporation",
        "State/Local University or College",
      ],
      total_workforce_enum: [
        "Micro (1-9)",
        "Small (10-99)",
        "Medium (100-199)",
        "Large (200 and up)",
      ],
    },
  },
  jobs: {
    Enums: {
      application_stage_type: [
        "applied",
        "screening",
        "interview",
        "offered",
        "hired",
        "rejected",
      ],
      referral_outcome_type: ["pending_feedback", "accepted", "rejected"],
    },
  },
  public: {
    Enums: {
      application_stage_type: [
        "applied",
        "screened",
        "interviewing",
        "offered",
        "hired",
        "rejected",
      ],
      company_role_type: ["owner", "admin", "hr", "employee"],
      gender_type: ["male", "female", "non-binary", "prefer_not_to_say"],
      job_status_type: ["draft", "active", "paused", "closed"],
      lpii_type: ["LOWLAND", "UPLAND", "WETLAND"],
      notification_type: [
        "application_status",
        "interview_alert",
        "referral_update",
        "compliance_alert",
        "system_announcement",
      ],
      referral_outcome_type: [
        "pending_feedback",
        "hired",
        "rejected",
        "no_show",
      ],
      status_type: ["pending", "approved", "rejected", "active", "closed"],
      user_role: ["applicant", "employer", "peso_staff", "admin"],
    },
  },
  system: {
    Enums: {},
  },
} as const
