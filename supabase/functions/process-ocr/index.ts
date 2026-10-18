// ==============================================================================
// Supabase Edge Function: process-ocr
// Description: Extracts structured data from handwritten & printed forms using
//              Google Gemini Vision API (Multimodal OCR).
// Access:      Provincial PESO and admin only. The caller's JWT is verified and every
//              storage / database call runs as the caller, so RLS (033 / 034) applies.
//              No service-role key is used.
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const GEMINI_MODEL = 'gemini-3.7-flash'
const ALLOWED_ROLES = ['provincial_peso', 'admin']
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
const MAX_IMAGES = 4
const MAX_IMAGE_BYTES = 20 * 1024 * 1024 // same limit as the 'applicant-forms' bucket
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Comma-separated list in the ALLOWED_ORIGINS secret (e.g. "https://agsurjobs.example,http://localhost:5173").
// When unset, any origin may call it; the JWT + role check still applies.
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowOrigin = allowedOrigins.length === 0 ? '*' : allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

// Errors whose message is safe to show the caller, with their HTTP status
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

// Convert ArrayBuffer / Uint8Array to Base64 in Deno
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Accepts raw base64 or a data URL; validates type and decoded size
function toImagePart(value: unknown, fallbackMimeType: unknown): { mime_type: string; data: string } {
  if (typeof value !== 'string' || value.length === 0) {
    throw new HttpError(400, 'Image data is empty.')
  }

  let data = value
  let mimeType = typeof fallbackMimeType === 'string' ? fallbackMimeType : 'image/jpeg'
  if (value.includes(';base64,')) {
    const [header, payload] = value.split(';base64,')
    const match = header.match(/^data:(.*?)$/)
    if (match) mimeType = match[1]
    data = payload
  }

  mimeType = mimeType.toLowerCase()
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new HttpError(400, `Unsupported file type: ${mimeType}.`)
  }
  if (!/^[A-Za-z0-9+/=\s]+$/.test(data)) {
    throw new HttpError(400, 'Image data is not valid base64.')
  }
  if ((data.length * 3) / 4 > MAX_IMAGE_BYTES) {
    throw new HttpError(413, 'Image is larger than 20 MB.')
  }

  return { mime_type: mimeType, data }
}

serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req)
  const jsonResponse = (body: Record<string, unknown>, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    if (req.method !== 'POST') {
      throw new HttpError(405, 'Method not allowed')
    }

    // 2. Authenticate the caller and require Provincial PESO / admin
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      throw new HttpError(401, 'Sign in to use OCR.')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY are not available to the function.')
    }

    // Client acting as the caller: storage and table access go through their RLS
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      throw new HttpError(401, 'Your session has expired. Sign in again.')
    }

    const { data: profile } = await supabase
      .schema('core')
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (!profile || !ALLOWED_ROLES.includes(String(profile.role))) {
      throw new HttpError(403, 'Only Provincial PESO and admin accounts can use OCR.')
    }

    // 3. Validate Gemini API Key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the Supabase project secrets.')
    }

    // 4. Parse Request Payload
    const body = await req.json().catch(() => ({}))
    const { image_path, image_base64, image_base64_list, mime_type = 'image/jpeg', applicant_id } = body

    const hasMultiImage = Array.isArray(image_base64_list) && image_base64_list.length > 0

    if (!image_path && !image_base64 && !hasMultiImage) {
      throw new HttpError(400, 'Missing image input. Provide image_path, image_base64, or image_base64_list.')
    }
    if (hasMultiImage && image_base64_list.length > MAX_IMAGES) {
      throw new HttpError(400, `Send at most ${MAX_IMAGES} images per request.`)
    }

    // 5. Retrieve Image(s) as Base64 Data
    const imageParts: Array<{ mime_type: string; data: string }> = []

    if (hasMultiImage) {
      for (const item of image_base64_list) {
        imageParts.push(toImagePart(item?.data, item?.mime_type))
      }
    } else if (image_base64) {
      imageParts.push(toImagePart(image_base64, mime_type))
    } else if (image_path) {
      if (typeof image_path !== 'string' || image_path.startsWith('/') || image_path.split('/').includes('..')) {
        throw new HttpError(400, 'Invalid image_path.')
      }

      // Downloaded as the caller, so the 'applicant-forms' bucket policies decide access
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('applicant-forms')
        .download(image_path)

      if (downloadError || !fileData) {
        throw new HttpError(404, 'The uploaded form could not be found.')
      }
      if (fileData.size > MAX_IMAGE_BYTES) {
        throw new HttpError(413, 'Image is larger than 20 MB.')
      }

      const detectedMimeType = (fileData.type || mime_type || 'image/jpeg').toLowerCase()
      if (!ALLOWED_MIME_TYPES.includes(detectedMimeType)) {
        throw new HttpError(400, `Unsupported file type: ${detectedMimeType}.`)
      }
      const arrayBuffer = await fileData.arrayBuffer()
      imageParts.push({ mime_type: detectedMimeType, data: arrayBufferToBase64(arrayBuffer) })
    }

    if (imageParts.length === 0) {
      throw new HttpError(400, 'Image data is empty or could not be loaded.')
    }

    // 5. Build Gemini Multimodal Prompt & System Instructions
    const systemPrompt = `You are an expert OCR AI specializing in reading scanned Philippine DOLE NSRP Form 1 (National Skills Registration Program Jobseeker Registration Form).
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
   - "dateOfBirth": Date written in DATE OF BIRTH field formatted as YYYY-MM-DD (e.g., "1998-05-14"). If format is ambiguous, return the string.
   - "age": The handwritten integer age (e.g., 24).
   - "civilStatus": "Single", "Married", "Widowed", or "Separated" based on checkbox/text.
   - "religion": Handwritten religion (e.g., "Roman Catholic", "Islam", "Christian").
   - "tin", "sss", "philhealth": ID numbers if written, else null.
   - "contactNumber": Mobile/cellphone number (e.g., "09123456789").
   - "email": Email address if written, else null.
   - "address.houseStreet": House No., Street, Purok (e.g., "Purok 3", "Sitio Riverside").
   - "address.barangay": Barangay name (e.g., "Poblacion", "Patin-ay", "San Teodoro", "Bajuoan").
   - "address.municipality": Agusan del Sur municipality (e.g., "Prosperidad", "Bayugan", "San Francisco", "Trento", "Bunawan", "Rosario", "Talacogon", "Esperanza", "Loreto", "La Paz", "San Luis", "Veruela", "Santa Josefa", "Sibagat").
   - "address.province": Province (defaults to "Agusan del Sur").
   - "educationalLevel": Highest educational level (e.g., "College Graduate", "High School Graduate", "Senior High School", "Vocational").
   - "course": Degree/course studied (e.g., "Bachelor of Science in Information Technology", "BS Criminology", "BS Business Administration", "BS Agriculture", "General Academic Strand").
   - "school": School or university name (e.g., "ASSCAT", "PNU Mindanao", "Agusan del Sur College").
   - "yearGraduated": Year graduated (e.g., "2023", "2022").

3. FIELD-BY-FIELD INSTRUCTIONS (Page 2):
   - "workExperience": Array of handwritten work experience rows [{ jobTitle, company, duration, description }]. If none, return [].
   - "skills": Array of handwritten skills (e.g., ["Computer Literacy", "Driving", "Carpentry"]).
   - "is4ps": true if 4Ps box is checked, false otherwise.
   - "hasDisability": true if PWD box is checked, false otherwise.
   - "employmentStatus": "Unemployed", "Employed", "Self-employed", etc.
   - "preferredOccupations": Array of handwritten preferred occupations.

4. CONFIDENCE & NOTES:
   - "confidenceScore": 0.0 to 1.0 based on legibility of handwriting.
   - "extractedNotes": Any notes regarding readability.`

    const promptText = `Extract all filled-in applicant information from this NSRP Form 1 document into this exact JSON schema:
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

REMEMBER: Extract ONLY handwritten or filled-in values. NEVER output printed form labels (e.g. SURNAME, FIRST NAME, Date of Assessor) as values.`

    // 6. Call Google Gemini Vision API (structured JSON output). The key goes in a header so it
    //    never appears in URLs or logs.
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

    const contentParts: Array<Record<string, any>> = [
      { text: `${systemPrompt}\n\n${promptText}` },
    ]
    for (const img of imageParts) {
      contentParts.push({
        inline_data: {
          mime_type: img.mime_type,
          data: img.data,
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

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey },
      body: JSON.stringify(requestPayload),
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('Gemini API Error:', errText)
      throw new HttpError(502, `The OCR service could not read the form (Gemini ${geminiRes.status}). Try again.`)
    }

    const geminiData = await geminiRes.json()
    const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawContent) {
      throw new HttpError(502, 'The OCR service returned no result. Try again.')
    }

    // 7. Parse Extracted JSON
    let extractedJson: any = {}
    try {
      extractedJson = JSON.parse(rawContent)
    } catch {
      try {
        const cleaned = rawContent.replace(/```json\n?|\n?```/g, '').trim()
        extractedJson = JSON.parse(cleaned)
      } catch {
        throw new HttpError(502, 'The OCR result could not be read. Try again.')
      }
    }

    // 8. Persist to applicant_forms as the caller (RLS: Provincial PESO / admin)
    let savedRecordId: string | null = null
    try {
      const { data: record, error: insertError } = await supabase
        .from('applicant_forms')
        .insert({
          user_id: typeof applicant_id === 'string' && UUID_PATTERN.test(applicant_id) ? applicant_id : null,
          file_path: typeof image_path === 'string' ? image_path : 'direct_upload',
          status: 'processed',
          extracted_data: extractedJson,
          raw_ocr_response: geminiData,
        })
        .select('id')
        .single()

      if (record) {
        savedRecordId = record.id
      } else if (insertError) {
        console.warn('Could not persist to applicant_forms table (continuing):', insertError.message)
      }
    } catch (dbErr) {
      console.warn('Database insert skipped:', dbErr)
    }

    // 9. Return JSON Response to Client
    return jsonResponse(
      {
        success: true,
        data: extractedJson,
        form_id: savedRecordId,
        metadata: {
          file_path: typeof image_path === 'string' ? image_path : null,
          model: GEMINI_MODEL,
          processed_at: new Date().toISOString(),
        },
      },
      200
    )
  } catch (error: any) {
    if (error instanceof HttpError) {
      return jsonResponse({ success: false, error: error.message }, error.status)
    }

    // Unexpected failures are logged in full but not echoed to the caller
    console.error('OCR Processing Error:', error)
    return jsonResponse(
      { success: false, error: 'An unexpected error occurred while processing the form.' },
      500
    )
  }
})
