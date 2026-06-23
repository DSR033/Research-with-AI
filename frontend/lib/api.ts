const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function fetchSurveys() {
  const r = await fetch(`${API}/surveys`)
  if (!r.ok) return []
  return r.json()
}

export async function createSurvey(payload: Record<string, unknown>) {
  const r = await fetch(`${API}/surveys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return r.json()
}

export async function getSurvey(id: string) {
  const r = await fetch(`${API}/surveys/${id}`)
  return r.json()
}

export async function updateSurvey(id: string, payload: Record<string, unknown>) {
  const r = await fetch(`${API}/surveys/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return r.json()
}

export async function createQuestion(surveyId: string, payload: Record<string, unknown>) {
  const r = await fetch(`${API}/surveys/${surveyId}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return r.json()
}

export async function getResults(surveyId: string) {
  const r = await fetch(`${API}/surveys/${surveyId}/results`)
  return r.json()
}
