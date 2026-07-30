import { supabase } from '@/lib/supabaseClient'
import { fileHelpers } from '@/helpers/common/fileHelpers'
import { DOCUMENT_UPLOAD_BUCKET } from '@/helpers/common/uploadHelpers'
import { mediaService } from '@/services/common/mediaService'
import type {
  ApplicantRequirementUploadExecutorOptions,
  ApplicantRequirementUploadResult,
  UploadDocumentDefinition,
} from '@/types/common/fileUpload'
import type { Tables, TablesInsert } from '@/types/common/database.types'
import {
  APPLICANT_REQUIREMENT_TYPE,
  getApplicantRequirementTypeCandidates,
  normalizeRequirementTypeValue,
} from '@/helpers/applicant/applicantRequirementTypes'

export type ApplicantRequirementRow = Tables<{ schema: 'applicants' }, 'applicant_requirements'>
export type ApplicantRequirementMediaRow = Tables<{ schema: 'applicants' }, 'applicant_requirement_media'>
export type ApplicantRequirementInsert = TablesInsert<{ schema: 'applicants' }, 'applicant_requirements'>
export type ApplicantRequirementMediaInsert = TablesInsert<{ schema: 'applicants' }, 'applicant_requirement_media'>
export type RequirementTemplateRow = Tables<{ schema: 'public' }, 'requirement_templates'>

function isAllowedRequirementType(templateRequirementType: string | null | undefined, requirementTypeCandidates: string[]) {
  if (!templateRequirementType) {
    return true
  }

  const normalizedTemplateType = normalizeRequirementTypeValue(templateRequirementType)
  return requirementTypeCandidates.some(
    (candidate) => normalizeRequirementTypeValue(candidate) === normalizedTemplateType
  )
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

async function findRequirementTemplateId(document: UploadDocumentDefinition) {
  const requirementTypeCandidates = getApplicantRequirementTypeCandidates(APPLICANT_REQUIREMENT_TYPE)

  if (document.requirementTemplateId) {
    const { data: byConfiguredId, error: byConfiguredIdError } = await supabase
      .schema('public')
      .from('requirement_templates')
      .select('id, requirement_type')
      .eq('id', document.requirementTemplateId)
      .maybeSingle()

    if (byConfiguredIdError) {
      throw byConfiguredIdError
    }

    if (!byConfiguredId?.id) {
      // eslint-disable-next-line no-console
      console.warn(
        `Requirement template ID ${document.requirementTemplateId} not found for ${document.label}, falling back to name lookup.`
      )
    }

    if (byConfiguredId?.id) {
      if (
        byConfiguredId.requirement_type &&
        !isAllowedRequirementType(byConfiguredId.requirement_type, requirementTypeCandidates)
      ) {
        throw new Error(
          `Requirement template ID ${document.requirementTemplateId} is not an applicant requirement template.`
        )
      }

      return byConfiguredId.id
    }
  }

  const exactLabel = normalizeLabel(document.label)
  const exactId = normalizeLabel(document.id)

  // Try exact name match first (case-insensitive)
  const { data: byName, error: byNameError } = await supabase
    .schema('public')
    .from('requirement_templates')
    .select('id, name, requirement_type')
    .ilike('name', document.label)
    .maybeSingle()

  if (byNameError) {
    throw byNameError
  }

  if (byName?.id && isAllowedRequirementType(byName.requirement_type, requirementTypeCandidates)) {
    return byName.id
  }

  // Try wildcard/partial matches (e.g. 'Resume' -> 'Resume / CV')
  const { data: wildcardMatches, error: wildcardError } = await supabase
    .schema('public')
    .from('requirement_templates')
    .select('id, name, requirement_type')
    .ilike('name', `%${document.label}%`)

  if (wildcardError) {
    throw wildcardError
  }

  if (wildcardMatches && wildcardMatches.length > 0) {
    // Prefer a requirement-type template when available
    const requirementMatch = wildcardMatches.find((t) =>
      isAllowedRequirementType(t.requirement_type, requirementTypeCandidates)
    )
    return (requirementMatch ?? wildcardMatches[0]).id
  }

  // As a last resort, fetch all templates and try normalized comparisons
  const { data: allTemplates, error: listError } = await supabase
    .schema('public')
    .from('requirement_templates')
    .select('id, name, requirement_type')

  if (listError) {
    throw listError
  }

  const matchedTemplate = (allTemplates ?? []).find((template) => {
    const templateName = normalizeLabel(template.name ?? '')
    const templateType = normalizeLabel(template.requirement_type ?? '')

    const isApplicantTemplate = isAllowedRequirementType(template.requirement_type, requirementTypeCandidates)

    // allow partial and exact normalized matches
    return (
      isApplicantTemplate &&
      (templateName === exactLabel ||
        templateName === exactId ||
        templateType === exactLabel ||
        templateType === exactId ||
        templateName.includes(exactLabel) ||
        exactLabel.includes(templateName))
    )
  })

  if (matchedTemplate?.id) {
    return matchedTemplate.id
  }

  // As a last resort, create a requirement-type requirement template so
  // uploads for this label can proceed.
  try {
    const payload = {
      name: document.label,
      requirement_type: APPLICANT_REQUIREMENT_TYPE,
    }

    const { data: created, error: createError } = await supabase
      .schema('public')
      .from('requirement_templates')
      .insert([payload])
      .select()
      .maybeSingle()

    if (createError) {
      // eslint-disable-next-line no-console
      console.warn('Failed to create fallback requirement_template:', createError)
      return null
    }

    // eslint-disable-next-line no-console
    console.warn(`Created fallback requirement_template '${document.label}' with id ${created?.id}`)
    return created?.id ?? null
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Error creating fallback requirement template', err)
    return null
  }
}

async function findExistingApplicantRequirement(profileId: string, requirementTemplateId: number) {
  const query = supabase
    .schema('applicants')
    .from('applicant_requirements')
    .select('*')
    .eq('profile_id', profileId)

  const { data, error } = await query.eq('requirement_id', requirementTemplateId).maybeSingle()
  if (error) throw error
  return data ?? null
}

async function createApplicantRequirement(profileId: string, requirementTemplateId: number, remarks: string) {
  const payload: ApplicantRequirementInsert = {
    profile_id: profileId,
    requirement_id: requirementTemplateId,
    remarks,
    status: 'pending',
  }

  const { data, error } = await supabase
    .schema('applicants')
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
    .schema('applicants')
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
  profileId: string,
  file: File,
  storagePath: string
) {
  const payload: ApplicantRequirementMediaInsert = {
    applicant_requirement_id: applicantRequirementId,
    profiles_id: profileId,
    filename: file.name,
    path: storagePath,
    mime_type: file.type,
    size: file.size,
    alt_text: file.name,
    description: 'Applicant requirement document',
  }

  const { data, error } = await supabase
    .schema('applicants')
    .from('applicant_requirement_media')
    .insert([payload])
    .select()
    .single()

  if (error) {
    throw error
  }

  return data as ApplicantRequirementMediaRow
}

async function deleteApplicantRequirementDocument(
  options: Pick<ApplicantRequirementUploadExecutorOptions, 'profileId' | 'document'>
) {
  const { profileId, document } = options
  const requirementTemplateId = await findRequirementTemplateId(document)

  if (!requirementTemplateId) {
    throw new Error(`No requirement template matched for ${document.label}.`)
  }

  const { data: applicantRequirement, error: requirementError } = await supabase
    .schema('applicants')
    .from('applicant_requirements')
    .select('id')
    .eq('profile_id', profileId)
    .eq('requirement_id', requirementTemplateId)
    .maybeSingle()

  if (requirementError) {
    throw requirementError
  }

  if (!applicantRequirement?.id) {
    return {
      deleted: false,
      applicantRequirementId: null,
      removedMediaCount: 0,
    }
  }

  const { data: mediaRows, error: mediaError } = await supabase
    .schema('applicants')
    .from('applicant_requirement_media')
    .select('*')
    .eq('applicant_requirement_id', applicantRequirement.id)

  if (mediaError) {
    throw mediaError
  }

  for (const mediaRow of mediaRows ?? []) {
    if (mediaRow.path) {
      try {
        await supabase.storage.from(DOCUMENT_UPLOAD_BUCKET).remove([mediaRow.path])
      } catch {
        // ignore storage cleanup errors
      }
    }
  }

  if ((mediaRows ?? []).length > 0) {
    const { error: deleteMediaError } = await supabase
      .schema('applicants')
      .from('applicant_requirement_media')
      .delete()
      .eq('applicant_requirement_id', applicantRequirement.id)

    if (deleteMediaError) {
      throw deleteMediaError
    }
  }

  const { error: deleteRequirementError } = await supabase
    .schema('applicants')
    .from('applicant_requirements')
    .delete()
    .eq('id', applicantRequirement.id)

  if (deleteRequirementError) {
    throw deleteRequirementError
  }

  return {
    deleted: true,
    applicantRequirementId: applicantRequirement.id,
    removedMediaCount: (mediaRows ?? []).length,
  }
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
    .schema('applicants')
    .from('applicant_requirement_media')
    .delete()
    .eq('id', previousMedia.id)
}

async function uploadApplicantRequirementDocument(
  options: ApplicantRequirementUploadExecutorOptions
): Promise<ApplicantRequirementUploadResult> {
  const { profileId, document, file, onProgress } = options

  onProgress(10)

  const requirementTemplateId = await findRequirementTemplateId(document)

  if (!requirementTemplateId) {
    throw new Error(`No requirement template matched for ${document.label}.`)
  }

  onProgress(25)

  // Upload file to storage first (bucket: documents)
  const storagePath = fileHelpers.generateUniquePath(profileId, file.name)

  const { error: storageUploadError } = await supabase.storage.from(DOCUMENT_UPLOAD_BUCKET).upload(storagePath, file, {
    upsert: true,
  })

  if (storageUploadError) {
    throw storageUploadError
  }

  onProgress(50)

  // Ensure there is an applicant_requirements row for this profile + template
  const existingRequirement = await findExistingApplicantRequirement(
    profileId,
    requirementTemplateId
  )

  const applicantRequirement = existingRequirement ?? await createApplicantRequirement(
    profileId,
    requirementTemplateId,
    document.label
  )

  onProgress(65)

  const previousMedia = await findLatestRequirementMedia(applicantRequirement.id)

  const mediaRecord = await saveApplicantRequirementMedia(applicantRequirement.id, profileId, file, storagePath)
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
  deleteApplicantRequirementDocument,
}
