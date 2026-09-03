const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms)
}

export async function fetchSurveys() {
  try {
    const r = await fetch(`${API}/surveys`, { signal: withTimeout(5000) })
    if (!r.ok) return []
    return r.json()
  } catch {
    return []
  }
}

export async function createSurvey(payload: Record<string, unknown>) {
  const r = await fetch(`${API}/surveys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: withTimeout(8000),
  })
  if (!r.ok) throw new Error(`Server error ${r.status}`)
  return r.json()
}

export async function getSurvey(id: string) {
  try {
    const r = await fetch(`${API}/surveys/${id}`, { signal: withTimeout(5000) })
    if (!r.ok) return null
    return r.json()
  } catch {
    return null
  }
}

export async function updateSurvey(id: string, payload: Record<string, unknown>) {
  const r = await fetch(`${API}/surveys/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: withTimeout(8000),
  })
  return r.json()
}

export async function createQuestion(surveyId: string, payload: Record<string, unknown>) {
  try {
    const r = await fetch(`${API}/surveys/${surveyId}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: withTimeout(8000),
    })
    if (!r.ok) throw new Error(`Server error ${r.status}`)
    return r.json()
  } catch (e) {
    console.error('createQuestion failed:', e)
    throw e
  }
}

export async function getResults(surveyId: string) {
  try {
    const r = await fetch(`${API}/surveys/${surveyId}/results`, { signal: withTimeout(5000) })
    if (!r.ok) return []
    return r.json()
  } catch {
    return []
  }
}
