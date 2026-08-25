// ==============================================================================
// Service: ocrVisionService.ts
// Description: Handles storage uploads and calls Gemini Vision API
//              (direct client-side API or Supabase Edge Function).
// ==============================================================================

import { supabase } from '@/lib/supabaseClient'
import type { ApplicantFormOcrData, OcrProcessResponse } from '@/types/common/ocrVision'

const SYSTEM_PROMPT = `You are an expert OCR AI specializing in reading scanned Philippine DOLE NSRP Form 1 (National Skills Registration Program Jobseeker Registration Form).
You are analyzing images belonging to ONE single applicant's application.
The images provided represent Page 1 (Front - Personal Information & Educational Background) and Page 2 (Back - Work Experience, Other Skills, and Signatures) of this applicant.

CRITICAL EXTRACTION RULES:
1. ABSOLUTE PROHIBITION AGAINST TEMPLATE LABELS:
   - You MUST NOT output pre-printed form guide labels, section titles, column headers, or instruction notes (such as "SURNAME", "FIRST NAME", "MIDDLE NAME", "1.1 SURNAME", "1.2 FIRST NAME", "OFMONTHS, ORES POSITION", "Date, of Assessor", "Signature over Printed Name", "JOBSEEKER REGISTRATION FORM", "NSRP Form 1").
   - Extract ONLY the HANDWRITTEN ink or typed responses filled in by the applicant or PESO officer.
   - If a field box is empty or has no handwritten response, you MUST return null. Never use the field label as the value.

2. FIELD-BY-FIELD INSTRUCTIONS (Page 1):
   - "surname": The applicant's handwritten last/family name written in the SURNAME box. (e.g., "DELA CRUZ", "RIVERA", "VILLAMOR").
   - "firstName": The applicant's handwritten given name written in the FIRST NAME box. (e.g., "JUAN", "DENMARK", "MARIA").
   - "middleName": The handwritten middle name or initial. (e.g., "SANTOS", "B.").
   - "suffix": Name suffix like "JR", "SR", "III", or null if blank.
   - "sex": "Male" or "Female" based on the checked box or written text.
   - "dateOfBirth": Date written in DATE OF BIRTH field formatted as YYYY-MM-DD (e.g., "1998-05-14").
   - "age": The handwritten integer age (e.g., 24).
   - "civilStatus": "Single", "Married", "Widowed", or "Separated".
   - "religion": Handwritten religion (e.g., "Roman Catholic", "Islam", "Christian").
   - "tin", "sss", "philhealth": ID numbers if written, else null.
   - "contactNumber": Mobile/cellphone number.
   - "email": Email address if written, else null.
   - "address.houseStreet": House No., Street, Purok.
   - "address.barangay": Barangay name (e.g., "Poblacion", "Patin-ay", "San Teodoro", "Bajuoan").
   - "address.municipality": Agusan del Sur municipality (e.g., "Prosperidad", "Bayugan", "San Francisco", "Trento", "Bunawan", "Rosario", "Talacogon", "Esperanza", "Loreto", "La Paz", "San Luis", "Veruela", "Santa Josefa", "Sibagat").
   - "address.province": "Agusan del Sur".
   - "educationalLevel": Highest educational level (e.g., "College Graduate", "High School Graduate", "Senior High School", "Vocational").
   - "course": Degree/course studied (e.g., "Bachelor of Science in Information Technology", "BS Criminology", "BS Business Administration", "BS Agriculture").
   - "school": School or university name.
   - "yearGraduated": Year graduated (e.g., "2023").

3. FIELD-BY-FIELD INSTRUCTIONS (Page 2):
   - "workExperience": Array of handwritten work experience rows [{ jobTitle, company, duration, description }].
   - "skills": Array of handwritten skills (e.g., ["Computer Literacy", "Driving"]).
   - "is4ps": true if 4Ps box is checked, false otherwise.
   - "hasDisability": true if PWD box is checked, false otherwise.
   - "employmentStatus": "Unemployed", "Employed", "Self-employed", etc.
   - "preferredOccupations": Array of handwritten preferred occupations.

4. Output strictly valid JSON matching the schema provided.`

const PROMPT_TEXT = `Extract all filled-in applicant information from this NSRP Form 1 document into this exact JSON schema:
{
  "personalInfo": {
    "surname": string | null,
    "firstName": string | null,
    "middleName": string | null,
    "suffix": string | null,
    "sex": "Male" | "Female" | null,
    "dateOfBirth": string | null,
    "age": number | null,
    "civilStatus": string | null,
    "religion": string | null,
    "tin": string | null,
    "sss": string | null,
    "philhealth": string | null,
    "contactNumber": string | null,
    "email": string | null,
    "address": {
      "houseStreet": string | null,
      "barangay": string | null,
      "municipality": string | null,
      "province": string | null
    }
  },
  "education": {
    "educationalLevel": string | null,
    "course": string | null,
    "school": string | null,
    "yearGraduated": string | null
  },
  "workExperience": [
    {
      "jobTitle": string,
      "company": string,
      "duration": string,
      "description": string
    }
  ],
  "skills": string[],
  "otherDetails": {
    "is4ps": boolean | null,
    "hasDisability": boolean | null,
    "employmentStatus": string | null,
    "preferredOccupations": string[]
  },
  "confidenceScore": number,
  "extractedNotes": string | null
}

REMEMBER: Extract ONLY handwritten or filled-in values. NEVER output printed form labels as values.`

export const ocrVisionService = {
  /**
   * Converts a File object to a base64 string
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Failed to read file as base64 string.'))
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  },

  /**
   * Uploads an applicant form image or scanned document to the 'applicant-forms' storage bucket
   */
  async uploadFormImage(file: File, folder = 'forms'): Promise<{ path: string; fullPath: string }> {
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${safeName}`

    const { data, error } = await supabase.storage
      .from('applicant-forms')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg',
      })

    if (error) {
      throw new Error(`Failed to upload form image to storage: ${error.message}`)
    }

    return {
      path: data.path,
      fullPath: data.fullPath,
    }
  },

  /**
   * Gets a temporary signed URL for a private storage image
   */
  async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from('applicant-forms')
        .createSignedUrl(filePath, expiresIn)

      if (error || !data) return null
      return data.signedUrl
    } catch {
      return null
    }
  },

  /**
   * Direct client-side Gemini Vision API call
   */
  async callDirectGeminiApi(
    imageParts: Array<{ data: string; mime_type: string }>,
    apiKey: string
  ): Promise<OcrProcessResponse> {
    const modelsToTry = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest']
    let lastError: Error | null = null

    for (const model of modelsToTry) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

        const contentParts: Array<Record<string, any>> = [
          { text: `${SYSTEM_PROMPT}\n\n${PROMPT_TEXT}` },
        ]
        for (const img of imageParts) {
          let b64 = img.data
          let mt = img.mime_type || 'image/jpeg'
          if (b64.includes(';base64,')) {
            const parts = b64.split(';base64,')
            const match = parts[0].match(/data:(.*?)$/)
            if (match) mt = match[1]
            b64 = parts[1]
          }
          contentParts.push({
            inline_data: {
              mime_type: mt,
              data: b64,
            },
          })
        }

        const requestPayload = {
          contents: [
            {
              role: 'user',
              parts: contentParts,
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1,
            max_output_tokens: 4096,
          },
        }

        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        })

        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`Gemini API (${model}) error ${res.status}: ${errText}`)
        }

        const geminiData = await res.json()
        const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
        if (!rawContent) {
          throw new Error(`Gemini API (${model}) returned empty response.`)
        }

        let parsed: any = {}
        try {
          parsed = JSON.parse(rawContent)
        } catch {
          const cleaned = rawContent.replace(/```json\n?|\n?```/g, '').trim()
          parsed = JSON.parse(cleaned)
        }

        return {
          success: true,
          data: parsed,
          metadata: {
            model,
            processed_at: new Date().toISOString(),
          },
        }
      } catch (err: any) {
        lastError = err
        console.warn(`Model ${model} failed, trying next fallback:`, err.message)
      }
    }

    throw lastError || new Error('Failed to call Gemini API across all model options.')
  },

  /**
   * Invokes Gemini Vision API:
   * Uses client-side direct API call when VITE_GEMINI_API_KEY is available (fast & reliable),
   * or delegates to Supabase Edge Function 'process-ocr'.
   */
  async processOcrWithGemini(params: {
    imagePath?: string
    imageUrl?: string
    imageBase64?: string
    imageBase64List?: Array<{ data: string; mime_type: string }>
    mimeType?: string
    applicantId?: string
  }): Promise<OcrProcessResponse> {
    const clientApiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY

    // Collect image parts
    let imageParts: Array<{ data: string; mime_type: string }> = []
    if (params.imageBase64List && params.imageBase64List.length > 0) {
      imageParts = params.imageBase64List
    } else if (params.imageBase64) {
      imageParts = [{ data: params.imageBase64, mime_type: params.mimeType || 'image/jpeg' }]
    }

    // Direct Gemini Vision API path (instant, works everywhere with VITE_GEMINI_API_KEY)
    if (clientApiKey && imageParts.length > 0) {
      try {
        return await this.callDirectGeminiApi(imageParts, clientApiKey)
      } catch (directErr: any) {
        console.warn('Direct Gemini API call error, falling back to Supabase function:', directErr.message)
      }
    }

    // Supabase Edge Function path
    const payload = {
      image_path: params.imagePath,
      image_url: params.imageUrl,
      image_base64: params.imageBase64 || (imageParts[0]?.data),
      image_base64_list: params.imageBase64List || imageParts,
      mime_type: params.mimeType || 'image/jpeg',
      applicant_id: params.applicantId,
    }

    const { data, error } = await supabase.functions.invoke<OcrProcessResponse>('process-ocr', {
      body: payload,
    })

    if (error) {
      throw new Error(error.message || 'Edge function process-ocr invocation failed.')
    }

    if (!data) {
      throw new Error('Received an empty response from process-ocr function.')
    }

    if (!data.success && data.error) {
      throw new Error(data.error)
    }

    return data
  },

  /**
   * Persists or updates the verified/edited form data into the 'applicant_forms' table
   */
  async saveApplicantFormRecord(params: {
    filePath: string
    extractedData: ApplicantFormOcrData
    applicantId?: string
    formId?: string | null
  }) {
    if (params.formId) {
      const { data, error } = await (supabase.from('applicant_forms' as any) as any)
        .update({
          extracted_data: params.extractedData,
          status: 'processed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.formId)
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    } else {
      const { data, error } = await (supabase.from('applicant_forms' as any) as any)
        .insert({
          user_id: params.applicantId || null,
          file_path: params.filePath,
          status: 'processed',
          extracted_data: params.extractedData,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      return data
    }
  },
}
