import { supabase } from '@/lib/supabaseClient'
import { mediaService } from '@/services/common/mediaService'
import type { Database } from '@/types/common/database.types'
import type {
  DirectoryProfileRow,
  CompanyRow,
  ApplicantRow,
  SubmittedDocument,
} from '@/types/admin/systemDirectory'

export const systemDirectoryService = {
  async fetchAllDirectoryRecords(): Promise<DirectoryProfileRow[]> {
    // 1. Fetch profiles for applicants and companies
    const { data: profiles, error: profileErr } = await supabase
      .schema('core')
      .from('profiles')
      .select('*')
      .in('role', ['applicant', 'company_owner', 'company_member'])
      .order('created_at', { ascending: false })

    if (profileErr) {
      throw new Error(profileErr.message || 'Failed to fetch directory profiles')
    }

    if (!profiles || profiles.length === 0) {
      return []
    }

    // 2. Fetch email map from get_user_emails RPC
    let emailMap = new Map<string, string>()
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: emailRows } = await (supabase.schema('core') as any).rpc('get_user_emails')
      if (emailRows && Array.isArray(emailRows)) {
        emailMap = new Map<string, string>(
          emailRows.map((row: { id: string; email: string }) => [row.id, row.email])
        )
      }
    } catch {
      // RPC error fallback
    }

    // 3. Fetch requirement templates
    const templateMap = new Map<number, string>()
    try {
      const { data: templates } = await supabase
        .schema('public')
        .from('requirement_templates')
        .select('id, name')

      if (templates) {
        templates.forEach((t) => {
          if (t.id && t.name) templateMap.set(t.id, t.name)
        })
      }
    } catch {
      // Templates fetch fallback
    }

    // 4. Fetch linked companies from employers.companies
    const companyMap = new Map<string, CompanyRow>()
    const companyByIdMap = new Map<number, CompanyRow>()
    try {
      const { data: companiesData } = await supabase
        .schema('employers')
        .from('companies')
        .select('*')

      if (companiesData && companiesData.length > 0) {
        companiesData.forEach((c) => {
          companyByIdMap.set(c.id, c as CompanyRow)
          if (c.profile_id) {
            companyMap.set(c.profile_id, c as CompanyRow)
          }
        })
      }

      // Check company_members to link members to company
      const { data: membersData } = await supabase
        .schema('employers')
        .from('company_members')
        .select('profile_id, company_id')

      if (membersData && membersData.length > 0) {
        membersData.forEach((m) => {
          if (m.profile_id && m.company_id && !companyMap.has(m.profile_id)) {
            const comp = companyByIdMap.get(m.company_id)
            if (comp) companyMap.set(m.profile_id, comp)
          }
        })
      }
    } catch {
      // Employers fetch fallback
    }

    // 5. Fetch linked applicant profiles from applicants.applicants
    const applicantMap = new Map<string, ApplicantRow>()
    try {
      const { data: applicantsData } = await supabase
        .schema('applicants')
        .from('applicants')
        .select('*')

      if (applicantsData && applicantsData.length > 0) {
        applicantsData.forEach((a) => {
          if (a.profile_id) {
            applicantMap.set(a.profile_id, a as ApplicantRow)
          }
        })
      }
    } catch {
      // Applicants fetch fallback
    }

    // 6. Fetch applicant requirements & requirement media
    const applicantDocsMap = new Map<string, SubmittedDocument[]>()
    try {
      const { data: appReqs } = await supabase
        .schema('applicants')
        .from('applicant_requirements')
        .select('*')

      const { data: appMedia } = await supabase
        .schema('applicants')
        .from('applicant_requirement_media')
        .select('*')

      if (appReqs || appMedia) {
        const reqByIdMap = new Map<number, any>(appReqs?.map((r) => [r.id, r]) ?? [])

        if (appMedia) {
          appMedia.forEach((m) => {
            const profileId = m.profiles_id
            const reqRow = m.applicant_requirement_id ? reqByIdMap.get(m.applicant_requirement_id) : null
            const reqTemplateName = reqRow?.requirement_id ? templateMap.get(reqRow.requirement_id) : null
            const docName = reqTemplateName || m.description || m.filename || 'Applicant Document'

            if (profileId) {
              const currentDocs = applicantDocsMap.get(profileId) || []
              const publicUrl = m.path ? mediaService.getPublicUrl(m.path, 'media') : null

              currentDocs.push({
                id: m.id,
                name: docName,
                filename: m.filename,
                mime_type: m.mime_type,
                size: m.size,
                path: m.path,
                publicUrl,
                status: reqRow?.status || 'submitted',
                remarks: m.description || reqRow?.remarks || null,
                created_at: m.created_at,
              })
              applicantDocsMap.set(profileId, currentDocs)
            }
          })
        }
      }
    } catch {
      // Applicant requirements fetch fallback
    }

    // 7. Fetch employer requirements & requirement media
    const employerDocsMap = new Map<number, SubmittedDocument[]>()
    const employerProfileDocsMap = new Map<string, SubmittedDocument[]>()
    try {
      const { data: empReqs } = await supabase
        .schema('employers')
        .from('employer_requirements')
        .select('*')

      const { data: empMedia } = await supabase
        .schema('employers')
        .from('employer_requirement_media')
        .select('*')

      if (empReqs || empMedia) {
        const reqByIdMap = new Map<number, any>(empReqs?.map((r) => [r.id, r]) ?? [])

        if (empMedia) {
          empMedia.forEach((m) => {
            const reqRow = m.employer_requirement_id ? reqByIdMap.get(m.employer_requirement_id) : null
            const reqTemplateName = reqRow?.requirement_id ? templateMap.get(reqRow.requirement_id) : null
            const docName = reqTemplateName || m.description || m.filename || 'Company Requirement'
            const companyId = reqRow?.employer_id
            const profileId = m.profile_id
            const publicUrl = m.path ? mediaService.getPublicUrl(m.path, 'media') : null

            const docItem: SubmittedDocument = {
              id: m.id,
              name: docName,
              filename: m.filename,
              mime_type: m.mime_type,
              size: m.size,
              path: m.path,
              publicUrl,
              status: reqRow?.status || 'submitted',
              remarks: m.description || reqRow?.remarks || null,
              created_at: m.created_at,
            }

            if (companyId) {
              const list = employerDocsMap.get(companyId) || []
              list.push(docItem)
              employerDocsMap.set(companyId, list)
            }
            if (profileId) {
              const list = employerProfileDocsMap.get(profileId) || []
              list.push(docItem)
              employerProfileDocsMap.set(profileId, list)
            }
          })
        }
      }
    } catch {
      // Employer requirements fetch fallback
    }

    // 8. Assemble combined records
    return profiles.map((p) => {
      const isCompanyRole = p.role === 'company_owner' || p.role === 'company_member'
      const category = isCompanyRole ? 'company' : 'applicant'
      const company = companyMap.get(p.id) ?? null
      const applicant = applicantMap.get(p.id) ?? null

      let documents: SubmittedDocument[] = []

      if (category === 'company') {
        if (company?.id && employerDocsMap.has(company.id)) {
          documents = employerDocsMap.get(company.id)!
        } else if (employerProfileDocsMap.has(p.id)) {
          documents = employerProfileDocsMap.get(p.id)!
        }
      } else {
        if (applicantDocsMap.has(p.id)) {
          documents = applicantDocsMap.get(p.id)!
        }
      }

      return {
        ...p,
        email: emailMap.get(p.id) ?? null,
        category,
        companyDetails: company,
        applicantDetails: applicant,
        documents,
        documentCount: documents.length,
        hasDocuments: documents.length > 0,
      } as DirectoryProfileRow
    })
  },

  async updateAccountStatus(profileId: string, status: string): Promise<DirectoryProfileRow> {
    const { data, error } = await supabase
      .schema('core')
      .from('profiles')
      .update({ status: status as Database['core']['Enums']['status_type'], updated_at: new Date().toISOString() })
      .eq('id', profileId)
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update account status')
    }

    const isCompanyRole = data.role === 'company_owner' || data.role === 'company_member'
    const category = isCompanyRole ? 'company' : 'applicant'

    return {
      ...data,
      category,
    } as DirectoryProfileRow
  },
}
