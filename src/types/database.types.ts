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
    PostgrestVersion: "14.5"
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
          status: Database["public"]["Enums"]["status_type"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          profile_id?: string | null
          remarks?: string | null
          requirement_id?: number | null
          status?: Database["public"]["Enums"]["status_type"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          profile_id?: string | null
          remarks?: string | null
          requirement_id?: number | null
          status?: Database["public"]["Enums"]["status_type"] | null
          updated_at?: string | null
        }
        Relationships: []
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
          company_name: string | null
          created_at: string
          employee_count: number | null
          id: number
          industry: string | null
          latitude: number | null
          longitude: number | null
          profile_id: string | null
          registration_number: string | null
          updated_at: string | null
          verification_status: Database["public"]["Enums"]["status_type"] | null
          website: string | null
        }
        Insert: {
          business_type?: string | null
          company_address?: string | null
          company_contact?: string | null
          company_description?: string | null
          company_email?: string | null
          company_name?: string | null
          created_at?: string
          employee_count?: number | null
          id?: never
          industry?: string | null
          latitude?: number | null
          longitude?: number | null
          profile_id?: string | null
          registration_number?: string | null
          updated_at?: string | null
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
          company_name?: string | null
          created_at?: string
          employee_count?: number | null
          id?: never
          industry?: string | null
          latitude?: number | null
          longitude?: number | null
          profile_id?: string | null
          registration_number?: string | null
          updated_at?: string | null
          verification_status?:
            | Database["public"]["Enums"]["status_type"]
            | null
          website?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: number | null
          created_at: string | null
          id: number
          profile_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["status_type"] | null
          updated_at: string | null
        }
        Insert: {
          company_id?: number | null
          created_at?: string | null
          id?: never
          profile_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["status_type"] | null
          updated_at?: string | null
        }
        Update: {
          company_id?: number | null
          created_at?: string | null
          id?: never
          profile_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["status_type"] | null
          updated_at?: string | null
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
      employer_requirement_media: {
        Row: {
          alt_text: string | null
          created_at: string
          description: string | null
          employer_requirement_id: number | null
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
          employer_requirement_id?: number | null
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
          employer_requirement_id?: number | null
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
            foreignKeyName: "employer_requirement_media_employer_requirement_id_fkey"
            columns: ["employer_requirement_id"]
            isOneToOne: false
            referencedRelation: "employer_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_requirements: {
        Row: {
          employer_id: number | null
          id: number
          remarks: string | null
          requirement_id: number | null
          status: Database["public"]["Enums"]["status_type"] | null
          submitted_at: string
        }
        Insert: {
          employer_id?: number | null
          id?: never
          remarks?: string | null
          requirement_id?: number | null
          status?: Database["public"]["Enums"]["status_type"] | null
          submitted_at?: string
        }
        Update: {
          employer_id?: number | null
          id?: never
          remarks?: string | null
          requirement_id?: number | null
          status?: Database["public"]["Enums"]["status_type"] | null
          submitted_at?: string
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
          status: Database["public"]["Enums"]["status_type"] | null
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
          status?: Database["public"]["Enums"]["status_type"] | null
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
          status?: Database["public"]["Enums"]["status_type"] | null
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
          status: Database["public"]["Enums"]["status_type"] | null
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
          status?: Database["public"]["Enums"]["status_type"] | null
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
          status?: Database["public"]["Enums"]["status_type"] | null
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  applicants: {
    Enums: {},
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
