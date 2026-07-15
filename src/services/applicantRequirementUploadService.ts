import { supabase } from '@/lib/supabaseClient'
import { fileHelpers } from '@/helpers/fileHelpers'
import { DOCUMENT_UPLOAD_BUCKET } from '@/helpers/uploadHelpers'
import { mediaService } from '@/services/mediaService'
import type {
  ApplicantRequirementUploadExecutorOptions,
  ApplicantRequirementUploadResult,
  UploadDocumentDefinition,
} from '@/types/fileUpload'
import type { Tables, TablesInsert } from '@/types/database.types'

export type ApplicantRequirementRow = Tables<'applicant_requirements'>
export type ApplicantRequirementMediaRow = Tables<'applicant_requirement_media'>
export type ApplicantRequirementInsert = TablesInsert<'applicant_requirements'>
export type ApplicantRequirementMediaInsert = TablesInsert<'applicant_requirement_media'>
export type RequirementTemplateRow = Tables<'requirement_templates'>

function normalizeLabel(value: string) {
  return value.trim().toLowerCase()
}

async function findRequirementTemplateId(document: UploadDocumentDefinition) {
  const exactLabel = normalizeLabel(document.label)
  const exactId = normalizeLabel(document.id)

  const { data: byName, error: byNameError } = await supabase
    .from('requirement_templates')
    .select('id')
    .ilike('name', document.label)
    .maybeSingle()

  if (byNameError) {
    throw byNameError
  }

  if (byName?.id) {
    return byName.id
  }

  const { data: byType, error: byTypeError } = await supabase
    .from('requirement_templates')
    .select('id')
    .or(`name.ilike.${document.id},requirement_type.ilike.${document.id}`)
    .maybeSingle()

  if (byTypeError) {
    throw byTypeError
  }

  if (byType?.id) {
    return byType.id
  }

  const { data: allTemplates, error: listError } = await supabase
    .from('requirement_templates')
    .select('id, name, requirement_type')

  if (listError) {
    throw listError
  }

  const matchedTemplate = (allTemplates ?? []).find((template) => {
    const templateName = normalizeLabel(template.name ?? '')
    const templateType = normalizeLabel(template.requirement_type ?? '')
    return templateName === exactLabel || templateType === exactId
  })

  return matchedTemplate?.id ?? null
}

async function findExistingApplicantRequirement(applicantId: number, requirementTemplateId: number | null, remarks: string) {
  const query = supabase
    .from('applicant_requirements')
    .select('*')
    .eq('applicant_id', applicantId)

  if (requirementTemplateId !== null) {
    const { data, error } = await query.eq('requirement_id', requirementTemplateId).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  const { data, error } = await query.is('requirement_id', null).ilike('remarks', remarks).maybeSingle()
  if (error) throw error
  return data ?? null
}

async function createApplicantRequirement(applicantId: number, requirementTemplateId: number | null, remarks: string) {
  const payload: ApplicantRequirementInsert = {
    applicant_id: applicantId,
    requirement_id: requirementTemplateId,
    remarks,
    status: 'pending',
  }

  const { data, error } = await supabase
    .from('applicant_requirements')
    .insert([payload])
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as ApplicantRequirementRow
}

async function findLatestRequirementMedia(applicantRequirementId: number) {
  const { data, error } = await supabase
    .from('applicant_requirement_media')
    .select('*')
    .eq('applicant_requirement_id', applicantRequirementId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ?? null
}

async function saveApplicantRequirementMedia(
  applicantRequirementId: number,
  file: File,
  storagePath: string
) {
  const payload: ApplicantRequirementMediaInsert = {
    applicant_requirement_id: applicantRequirementId,
    filename: file.name,
    path: storagePath,
    mime_type: file.type,
    size: file.size,
    alt_text: file.name,
    description: 'Applicant requirement document',
  }

  const { data, error } = await supabase
    .from('applicant_requirement_media')
    .insert([payload])
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as ApplicantRequirementMediaRow
}

async function removePreviousRequirementMedia(previousMedia: ApplicantRequirementMediaRow | null) {
  if (!previousMedia) {
    return
  }

  if (previousMedia.path) {
    try {
      await supabase.storage.from(DOCUMENT_UPLOAD_BUCKET).remove([previousMedia.path])
    } catch {
      // ignore storage cleanup errors
    }
  }

  await supabase
    .from('applicant_requirement_media')
    .delete()
    .eq('id', previousMedia.id)
}

async function uploadApplicantRequirementDocument(
  options: ApplicantRequirementUploadExecutorOptions
): Promise<ApplicantRequirementUploadResult> {
  const { applicantId, document, file, onProgress } = options

  onProgress(10)

  const requirementTemplateId = await findRequirementTemplateId(document)
  onProgress(25)

  const existingRequirement = await findExistingApplicantRequirement(
    applicantId,
    requirementTemplateId,
    document.label
  )

  const applicantRequirement = existingRequirement ?? await createApplicantRequirement(
    applicantId,
    requirementTemplateId,
    document.label
  )

  onProgress(40)

  const previousMedia = await findLatestRequirementMedia(applicantRequirement.id)
  const storagePath = fileHelpers.generateUniquePath(
    String(applicantId),
    file.name,
    DOCUMENT_UPLOAD_BUCKET
  )

  await supabase.storage.from(DOCUMENT_UPLOAD_BUCKET).upload(storagePath, file, {
    upsert: true,
  })

  onProgress(75)

  const mediaRecord = await saveApplicantRequirementMedia(applicantRequirement.id, file, storagePath)
  const publicUrl = mediaService.getPublicUrl(storagePath, DOCUMENT_UPLOAD_BUCKET)

  await removePreviousRequirementMedia(previousMedia)

  onProgress(100)

  return {
    applicantRequirementId: applicantRequirement.id,
    mediaId: mediaRecord.id,
    storagePath,
    publicUrl,
    metadata: {
      requirementTemplateId,
      applicantRequirementId: applicantRequirement.id,
      mediaId: mediaRecord.id,
    },
  }
}

export const applicantRequirementUploadService = {
  uploadApplicantRequirementDocument,
}
