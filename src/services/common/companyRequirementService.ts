import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { mediaService } from '@/services/common/mediaService'
import { DOCUMENT_UPLOAD_BUCKET } from '@/helpers/common/uploadHelpers'
import {
  EMPLOYER_REQUIREMENT_TYPE,
  type CompanyReviewStatus,
  type EmployerRequirementFile,
  type EmployerRequirementWithFiles,
  type RequirementTemplate,
} from '@/types/employer/companyRequirement'

/**
 * The review RPCs (migration 079) are not in database.types.ts until `npm run types:gen` is re-run,
 * so the typed client rejects their names. Use `supabase.schema('employers').rpc` after regenerating.
 */
const untypedEmployers = () => (supabase as unknown as SupabaseClient).schema('employers')

/**
 * Company requirement documents (employers.employer_requirements + employer_requirement_files).
 * Files live in the private 'documents' bucket at <owner uid>/employer-requirements/<file> and open by
 * signed URL only (PRIVACY.md rule 4). The company owner submits; Provincial PESO reviews (migration 079).
 */
export const companyRequirementService = {
  async fetchTemplates(): Promise<RequirementTemplate[]> {
    const { data, error } = await supabase
      .schema('public')
      .from('requirement_templates')
      .select('id, name, description, sort_order')
      .eq('requirement_type', EMPLOYER_REQUIREMENT_TYPE)
      .order('sort_order', { ascending: true })

    if (error) throw new Error(error.message || 'Failed to load the requirement list.')
    return data ?? []
  },

  async fetchCompanyRequirements(companyId: string): Promise<EmployerRequirementWithFiles[]> {
    const { data, error } = await supabase
      .schema('employers')
      .from('employer_requirements')
      .select('*, employer_requirement_files (*)')
      .eq('employer_id', companyId)

    if (error) throw new Error(error.message || 'Failed to load the company documents.')
    return (data ?? []) as EmployerRequirementWithFiles[]
  },

  /**
   * Creates the requirement row or re-submits it. The guard trigger (079) sets it back to pending
   * and clears the rejection reason whenever the owner writes it.
   */
  async submitRequirement(companyId: string, templateId: number, existingId: number | null): Promise<number> {
    if (existingId) {
      const { error } = await supabase
        .schema('employers')
        .from('employer_requirements')
        .update({ status: 'pending', submitted_at: new Date().toISOString() })
        .eq('id', existingId)
      if (error) throw new Error(error.message || 'Failed to submit the document.')
      return existingId
    }

    const { data, error } = await supabase
      .schema('employers')
      .from('employer_requirements')
      .insert({ employer_id: companyId, requirement_id: templateId, status: 'pending' })
      .select('id')
      .single()
    if (error) throw new Error(error.message || 'Failed to submit the document.')
    return data.id
  },

  async deleteRequirement(requirementId: number): Promise<void> {
    const { error } = await supabase.schema('employers').from('employer_requirements').delete().eq('id', requirementId)
    if (error) throw new Error(error.message || 'Failed to remove the document.')
  },

  /** Uploads the file into the owner's documents folder and records it on the requirement */
  async addFile(requirementId: number, profileId: string, file: File, path: string): Promise<EmployerRequirementFile> {
    await mediaService.uploadToStorage(file, path, DOCUMENT_UPLOAD_BUCKET)
    const { data, error } = await supabase
      .schema('employers')
      .from('employer_requirement_files')
      .insert({
        employer_requirement_id: requirementId,
        profile_id: profileId,
        filename: file.name,
        path,
        mime_type: file.type,
        size: file.size,
        description: 'Company requirement document',
      })
      .select('*')
      .single()

    if (error) {
      await mediaService.removeFromStorage([path], DOCUMENT_UPLOAD_BUCKET).catch(() => {})
      throw new Error(error.message || 'Failed to save the file.')
    }
    return data
  },

  async deleteFile(file: Pick<EmployerRequirementFile, 'id' | 'path'>): Promise<void> {
    const { error } = await supabase.schema('employers').from('employer_requirement_files').delete().eq('id', file.id)
    if (error) throw new Error(error.message || 'Failed to remove the file.')
    await mediaService.removeFromStorage([file.path], DOCUMENT_UPLOAD_BUCKET).catch(() => {})
  },

  /** Provincial PESO: approve / reject / reset one document (remarks required for rejected) */
  async reviewRequirement(requirementId: number, status: CompanyReviewStatus, remarks: string | null): Promise<void> {
    const { error } = await untypedEmployers().rpc('review_employer_requirement', {
      p_requirement_id: requirementId,
      p_status: status,
      p_remarks: remarks,
    })
    if (error) throw new Error(error.message || 'Failed to update the document status.')
  },

  /** Provincial PESO: set the company's verification (remarks required for rejected) */
  async reviewCompany(companyId: string, status: CompanyReviewStatus, remarks: string | null): Promise<void> {
    const { error } = await untypedEmployers().rpc('review_company_verification', {
      p_company_id: companyId,
      p_status: status,
      p_remarks: remarks,
    })
    if (error) throw new Error(error.message || 'Failed to update the company status.')
  },
}
