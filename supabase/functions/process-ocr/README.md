# Supabase Edge Function: `process-ocr`

This Edge Function transcribes handwritten and printed applicant forms using **Google Gemini Vision API** (`gemini-1.5-flash`).

## 1. Prerequisites
- A Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/).
- Supabase CLI installed (`npm install -g supabase` or `scoop install supabase` / `brew install supabase/tap/supabase`).

---

## 2. Setting Secrets

### For Local Development
In the root directory of this repository, add your Gemini API key to `.env`:
```bash
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere...
```

Then serve the function locally:
```bash
supabase functions serve process-ocr --env-file .env
```

### For Production / Hosted Supabase
Set the secret in your linked Supabase project:
```bash
supabase secrets set GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere...
```

Deploy the function:
```bash
supabase functions deploy process-ocr
```

---

## 3. Invocation Payload Schema

### Request (POST)
```json
{
  "image_path": "uploads/applicant_123.jpg",
  "applicant_id": "optional-uuid"
}
```
*Or directly with `image_url` or `image_base64`:*
```json
{
  "image_base64": "data:image/jpeg;base64,...",
  "applicant_id": "optional-uuid"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "personalInfo": {
      "surname": "DELA CRUZ",
      "firstName": "JUAN",
      "middleName": "SANTOS",
      "suffix": null,
      "sex": "Male",
      "dateOfBirth": "1998-05-14",
      "age": 28,
      "civilStatus": "Single",
      "religion": "Roman Catholic",
      "tin": "123-456-789-000",
      "sss": null,
      "philhealth": null,
      "contactNumber": "09123456789",
      "email": "juan.delacruz@example.com",
      "address": {
        "houseStreet": "Purok 3",
        "barangay": "Patin-ay",
        "municipality": "Prosperidad",
        "province": "Agusan del Sur"
      }
    },
    "education": {
      "educationalLevel": "College Graduate",
      "course": "BS Information Technology",
      "school": "Agusan del Sur State College of Agriculture and Technology (ASSCAT)",
      "yearGraduated": "2020"
    },
    "workExperience": [
      {
        "jobTitle": "Administrative Assistant",
        "company": "Provincial Capitol of Agusan del Sur",
        "duration": "2021 - 2023",
        "description": "Handled document processing and record keeping"
      }
    ],
    "skills": ["Computer Literacy", "MS Excel", "Customer Service", "Data Entry"],
    "otherDetails": {
      "is4ps": false,
      "hasDisability": false,
      "employmentStatus": "Unemployed",
      "preferredOccupations": ["Data Encoder", "Administrative Aide"]
    },
    "confidenceScore": 0.95,
    "extractedNotes": null
  },
  "form_id": "8fa2...-uuid",
  "metadata": {
    "file_path": "uploads/applicant_123.jpg",
    "model": "gemini-1.5-flash",
    "processed_at": "2026-08-25T05:00:00.000Z"
  }
}
```
