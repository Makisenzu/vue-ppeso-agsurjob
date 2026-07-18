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
  public: {
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
          id?: number
          job_title?: string | null
          profile_id?: string | null
          start_date?: string | null
        }
        Update: {
          company_name?: string | null
          description?: string
          end_date?: string | null
          id?: number
          job_title?: string | null
          profile_id?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applicant_experiences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          id?: number
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
          id?: number
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
          {
            foreignKeyName: "applicant_requirement_media_profiles_id_fkey"
            columns: ["profiles_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        }
        Insert: {
          created_at?: string
          id?: number
          profile_id?: string | null
          remarks?: string | null
          requirement_id?: number | null
          status?: Database["public"]["Enums"]["status_type"] | null
        }
        Update: {
          created_at?: string
          id?: number
          profile_id?: string | null
          remarks?: string | null
          requirement_id?: number | null
          status?: Database["public"]["Enums"]["status_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "applicant_requirements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applicant_verification_requirements_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirement_templates"
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
          id?: number
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
          id?: number
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
          id?: number
          profile_id?: string | null
          skill_category: string
          skill_name: string
        }
        Update: {
          id?: number
          profile_id?: string | null
          skill_category?: string
          skill_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "applicant_skills_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applicants: {
        Row: {
          course: string | null
          created_at: string
          education_level: string | null
          employment_status: string | null
          expected_salary: number | null
          id: number
          preferred_job: string | null
          preferred_location: string | null
          profile_id: string | null
          updated_at: string | null
          years_experience: number | null
        }
        Insert: {
          course?: string | null
          created_at?: string
          education_level?: string | null
          employment_status?: string | null
          expected_salary?: number | null
          id?: number
          preferred_job?: string | null
          preferred_location?: string | null
          profile_id?: string | null
          updated_at?: string | null
          years_experience?: number | null
        }
        Update: {
          course?: string | null
          created_at?: string
          education_level?: string | null
          employment_status?: string | null
          expected_salary?: number | null
          id?: number
          preferred_job?: string | null
          preferred_location?: string | null
          profile_id?: string | null
          updated_at?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "applicants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          id?: number
          registered_at?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          biometric_type?: string | null
          face_embedding?: string | null
          id?: number
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
          size: number | null
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          employer_requirement_id?: number | null
          filename?: string | null
          id?: number
          mime_type?: string | null
          path?: string | null
          size?: number | null
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          description?: string | null
          employer_requirement_id?: number | null
          filename?: string | null
          id?: number
          mime_type?: string | null
          path?: string | null
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
          id?: number
          remarks?: string | null
          requirement_id?: number | null
          status?: Database["public"]["Enums"]["status_type"] | null
          submitted_at?: string
        }
        Update: {
          employer_id?: number | null
          id?: number
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
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_requirements_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirement_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      employers: {
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
          id?: number
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
          id?: number
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
        Relationships: [
          {
            foreignKeyName: "employers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          id?: number
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
          id?: number
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
            | Database["public"]["Enums"]["application_stage_type"]
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
            | Database["public"]["Enums"]["application_stage_type"]
            | null
          id?: number
          job_posting_id?: number | null
          status?: Database["public"]["Enums"]["status_type"] | null
          updated_at?: string | null
        }
        Update: {
          applicant_id?: number | null
          created_at?: string
          current_stage?:
            | Database["public"]["Enums"]["application_stage_type"]
            | null
          id?: number
          job_posting_id?: number | null
          status?: Database["public"]["Enums"]["status_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_posting"
            referencedColumns: ["id"]
          },
        ]
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
          id?: number
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
          id?: number
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
          id?: number
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
          id?: number
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
        Relationships: [
          {
            foreignKeyName: "job_posting_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
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
          id?: number
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
          id?: number
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
          id?: number
          job_posting_id?: number | null
          requirement_id?: number | null
        }
        Update: {
          additional_requirement?: string | null
          id?: number
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
          id?: number
          is_read?: boolean | null
          message?: string | null
          recipient_id?: string | null
          title?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          is_read?: boolean | null
          message?: string | null
          recipient_id?: string | null
          title?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
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
          id?: number
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
          id?: number
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
          updated_At: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          profile_id?: string | null
          social_link?: string | null
          social_name?: string | null
          updated_At?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          profile_id?: string | null
          social_link?: string | null
          social_name?: string | null
          updated_At?: string | null
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
          contact_number: string | null
          created_at: string
          firstname: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          geographic: string | null
          id: string
          is_4ps: boolean | null
          is_pwd: boolean | null
          last_login: string | null
          lastname: string | null
          middlename: string | null
          province: string | null
          region: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          status: Database["public"]["Enums"]["status_type"] | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          barangay?: string | null
          birthdate?: string | null
          contact_number?: string | null
          created_at?: string
          firstname?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          geographic?: string | null
          id?: string
          is_4ps?: boolean | null
          is_pwd?: boolean | null
          last_login?: string | null
          lastname?: string | null
          middlename?: string | null
          province?: string | null
          region?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["status_type"] | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          barangay?: string | null
          birthdate?: string | null
          contact_number?: string | null
          created_at?: string
          firstname?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          geographic?: string | null
          id?: string
          is_4ps?: boolean | null
          is_pwd?: boolean | null
          last_login?: string | null
          lastname?: string | null
          middlename?: string | null
          province?: string | null
          region?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["status_type"] | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          applicant_id: number | null
          created_at: string
          feedback_remarks: string | null
          id: number
          job_posting_id: number | null
          outcome: Database["public"]["Enums"]["referral_outcome_type"] | null
          referral_letter: string | null
          referred_by: string | null
          updated_at: string | null
        }
        Insert: {
          applicant_id?: number | null
          created_at?: string
          feedback_remarks?: string | null
          id?: number
          job_posting_id?: number | null
          outcome?: Database["public"]["Enums"]["referral_outcome_type"] | null
          referral_letter?: string | null
          referred_by?: string | null
          updated_at?: string | null
        }
        Update: {
          applicant_id?: number | null
          created_at?: string
          feedback_remarks?: string | null
          id?: number
          job_posting_id?: number | null
          outcome?: Database["public"]["Enums"]["referral_outcome_type"] | null
          referral_letter?: string | null
          referred_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_posting"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      system_audit_logs: {
        Row: {
          action: string | null
          created_at: string
          id: number
          ip_address: string | null
          new_values: string[] | null
          old_values: string[] | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          id?: number
          ip_address?: string | null
          new_values?: string[] | null
          old_values?: string[] | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          id?: number
          ip_address?: string | null
          new_values?: string[] | null
          old_values?: string[] | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      gender_type: "male" | "female" | "non-binary" | "prefer_not_to_say"
      job_status_type: "draft" | "active" | "paused" | "closed"
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
      gender_type: ["male", "female", "non-binary", "prefer_not_to_say"],
      job_status_type: ["draft", "active", "paused", "closed"],
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
} as const
