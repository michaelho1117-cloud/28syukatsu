const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  'gemini-3.1-flash-lite-preview',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-2.5-flash-lite'
].filter(Boolean)

let activeModel = GEMINI_MODEL_CANDIDATES[0] || 'gemini-2.5-flash-lite'

function extractTextFromGeminiResponse(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || '')
    .join('')
    .trim() || ''
}

function parseJsonText(text) {
  const cleaned = String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  return JSON.parse(cleaned)
}

export async function generateGeminiJson(prompt, fallback) {
  let lastError = null

  for (const model of GEMINI_MODEL_CANDIDATES) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: 'application/json'
        }
      })
    })

    if (!response.ok) {
      lastError = await response.text()
      continue
    }

    activeModel = model
    const data = await response.json()
    const rawText = extractTextFromGeminiResponse(data)
    if (!rawText) return fallback

    try {
      return parseJsonText(rawText)
    } catch {
      return fallback
    }
  }

  throw new Error(`Gemini request failed for all candidate models. Last error: ${lastError || 'unknown error'}`)
}

export function getGeminiRuntimeInfo() {
  return {
    model: activeModel,
    preferred_models: GEMINI_MODEL_CANDIDATES,
    configured: Boolean(GEMINI_API_KEY)
  }
}
