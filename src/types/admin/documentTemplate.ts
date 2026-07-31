import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type DocumentTemplateRow = Tables<'document_templates'>
export type DocumentTemplateInsert = TablesInsert<'document_templates'>
export type DocumentTemplateUpdate = TablesUpdate<'document_templates'>

export interface DocumentTemplateFormState {
  title: string
  description: string
  category: string
  targetRole: string
  isActive: boolean
  file: File | null
}

export interface DocumentTemplateStoreState {
  templates: DocumentTemplateRow[]
  isLoading: boolean
  isSubmitting: boolean
  errorMessage: string | null
  successMessage: string | null
}
