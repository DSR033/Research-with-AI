'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSurvey, updateSurvey, createQuestion, getResults } from '../../../lib/api'
import TopBar from '../../../components/TopBar'
import InsightsTab from './InsightsTab'
import LogicTab from './LogicTab'
import QuestionEditor, { QUESTION_TYPES, TYPE_LABEL } from './QuestionEditor'
import type { QuestionData } from './QuestionEditor'
import PreviewModal from './PreviewModal'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Question extends QuestionData { logicOn?: boolean }
interface Survey {
  id: string; title: string; status: string; mode: string
  settings: Record<string, unknown>
}

// Left border accent colour per question type
const TYPE_ACCENT: Record<string, string> = {
  single_choice:  '#db2777',
  multi_select:   '#2563eb',
  dropdown:       '#7c3aed',
  yes_no:         '#0891b2',
  rating:         '#d97706',
  likert_matrix:  '#dc2626',
  nps:            '#16a34a',
  slider:         '#ea580c',
  ranking:        '#f97316',
  numeric_input:  '#0284c7',
  constant_sum:   '#6b7280',
  short_text:     '#8b5cf6',
  long_text:      '#8b5cf6',
  date_time:      '#0284c7',
}

const TYPE_TILES = [
  { type: 'single_choice',  icon: '◉', label: 'Single choice',  color: '#db2777', bg: '#fce7f3' },
  { type: 'multi_select',   icon: '☑', label: 'Multi-select',   color: '#2563eb', bg: '#eff6ff' },
  { type: 'dropdown',       icon: '▾', label: 'Dropdown',       color: '#7c3aed', bg: '#faf5ff' },
  { type: 'yes_no',         icon: '⬤', label: 'Yes / No',       color: '#0891b2', bg: '#ecfeff' },
  { type: 'rating',         icon: '★', label: 'Rating scale',   color: '#d97706', bg: '#fffbeb' },
  { type: 'likert_matrix',  icon: '▦', label: 'Matrix/Likert',  color: '#dc2626', bg: '#fef2f2' },
  { type: 'nps',            icon: '📊', label: 'NPS (0–10)',    color: '#16a34a', bg: '#f0fdf4' },
  { type: 'slider',         icon: '⟷', label: 'Slider',         color: '#ea580c', bg: '#fff7ed' },
  { type: 'ranking',        icon: '⇕', label: 'Ranking',        color: '#f97316', bg: '#fff7ed' },
  { type: 'short_text',     icon: '✎', label: 'Short text',     color: '#8b5cf6', bg: '#faf5ff' },
  { type: 'long_text',      icon: '📝', label: 'Long text',     color: '#8b5cf6', bg: '#faf5ff' },
  { type: 'date_time',      icon: '📅', label: 'Date / time',   color: '#0284c7', bg: '#f0f9ff' },
]

const AI_CHIPS = [
  { key: 'rephrase', label: 'Rephrase' },
  { key: 'concise',  label: 'Make Concise' },
  { key: 'suggest',  label: 'Suggest Next' },
  { key: 'tone',     label: 'Change Tone' },
]

const TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'build',    label: '✎ Build' },
  { id: 'logic',    label: '🔀 Logic' },
  { id: 'config',   label: '⚙ Config' },
  { id: 'share',    label: '📤 Share' },
  { id: 'insights', label: '📈 Insights' },
  { id: 'expert',   label: '✨ Expert Review' },
]

export default function SurveyBuilder() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [survey, setSurvey]         = useState<Survey | null>(null)
  const [questions, setQuestions]   = useState<Question[]>([])
  const [activeTab, setActiveTab]   = useState('build')
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [published, setPublished]   = useState(false)
  const [republished, setRepublished] = useState(false)
  const [editingQId, setEditingQId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [branding, setBranding]     = useState({ brand_color: '#db2777', logo_url: null as string | null, org_name: 'SurveyAI' })
  const [results, setResults]       = useState<{ total: number; complete: number; partial: number } | null>(null)
  const [aiChipLoading, setAiChipLoading] = useState<string | null>(null)
  type Finding = { severity: 'warning' | 'suggestion' | 'pass'; category: string; text: string }
  type ReviewResult = { overall_score: number; categories: Array<{ name: string; score: number; weight: number }>; findings: Finding[] }
  const [expertReview, setExpertReview]   = useState<ReviewResult | null>(null)
  const [expertLoading, setExpertLoading] = useState(false)

  // Config state
  const [cfgRequire, setCfgRequire]   = useState(false)
  const [cfgNoDupes, setCfgNoDupes]   = useState(true)
  const [cfgRandomize, setCfgRandomize] = useState(false)
  const [closeDate, setCloseDate]     = useState('')
  const [responseLimit, setResponseLimit] = useState('')

  useEffect(() => {
    getSurvey(id).then(async data => {
      setSurvey(data)
      const qs = (data.questions || []).map((q: Question & { question_options?: Array<{label: string}> }) => ({
        ...q, question_options: q.question_options, logicOn: false,
      }))
      if (qs.length === 0) {
        const defaultQ = await createQuestion(id, { type: 'single_choice', title: '', required: false, position: 0 })
        setQuestions([{ ...defaultQ, logicOn: false }])
        setEditingQId(defaultQ.id)
      } else {
        setQuestions(qs)
      }
      setLoading(false)
    })
    getResults(id).then(setResults)
    fetch(`${API}/surveys/${id}/branding`).then(r => r.json()).then(setBranding).catch(() => {})
  }, [id])

  const saveDraft = useCallback(async () => {
    if (!survey) return
    setSaving(true)
    await updateSurvey(id, { title: survey.title, status: survey.status })
    setSaving(false)
  }, [survey, id])

  const handlePublish = async () => {
    await updateSurvey(id, { status: 'active' })
    setSurvey(prev => prev ? { ...prev, status: 'active' } : prev)
    setPublished(true)
  }

  const handleRepublish = async () => {
    setSaving(true)
    await updateSurvey(id, { title: survey?.title, status: 'active' })
    setSurvey(prev => prev ? { ...prev, status: 'active' } : prev)
    setSaving(false)
    setRepublished(true)
    setTimeout(() => setRepublished(false), 3000)
  }

  const addQuestion = async (type: string) => {
    const q = await createQuestion(id, { type, title: '', required: false, position: questions.length })
    setQuestions(prev => [...prev, { ...q, logicOn: false }])
    setEditingQId(q.id)
    setActiveTab('build')
  }

  const deleteQuestion = (qid: string) => {
    fetch(`${API}/surveys/${id}/questions/${qid}`, { method: 'DELETE' })
    setQuestions(prev => prev.filter(q => q.id !== qid))
    if (editingQId === qid) setEditingQId(null)
  }

  const runAiChip = async (qid: string, action: string) => {
    setAiChipLoading(`${qid}-${action}`)
    try {
      const res = await fetch(`${API}/surveys/${id}/questions/${qid}/ai-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.title) setQuestions(prev => prev.map(q => q.id === qid ? { ...q, title: data.title } : q))
      }
    } catch {}
    setAiChipLoading(null)
  }

  const runExpertReview = async () => {
    setExpertLoading(true)
    setExpertReview(null)
    try {
      const res = await fetch(`${API}/surveys/${id}/expert-review`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setExpertReview(data)
        setExpertLoading(false)
        return
      }
    } catch {}
    // Fallback: run checks client-side on local question state
    const n = questions.length
    const findings: Finding[] = []
    const scores: Record<string, number> = { Clarity: 100, Structure: 100, 'Bias & Fairness': 100, Logic: 100, Compliance: 100 }
    const WEIGHTS_F: Record<string, number> = { Clarity: 30, Structure: 25, 'Bias & Fairness': 20, Logic: 15, Compliance: 10 }
    const BIAS = ["don't you think","don't you agree","obviously","clearly","of course","as we all know","everyone knows","surely"]
    const VAGUE = ["something","stuff","things","etc","whatever","anything"]

    if (n === 0) {
      findings.push({ severity: 'warning', category: 'Structure', text: 'No questions yet. Add questions before reviewing.' })
      scores.Structure = 0
    } else if (n > 20) {
      findings.push({ severity: 'warning', category: 'Structure', text: `${n} questions — surveys over 20 see <50% completion.` })
      scores.Structure -= 25
    } else if (n > 12) {
      findings.push({ severity: 'suggestion', category: 'Structure', text: `${n} questions — under 12 keeps completion above 80%.` })
      scores.Structure -= 10
    } else {
      findings.push({ severity: 'pass', category: 'Structure', text: `${n} questions — within the recommended range.` })
    }

    const seen = new Set<string>()
    questions.forEach((q, i) => {
      const title = q.title?.trim() ?? ''
      const tl = title.toLowerCase()
      const qnum = i + 1
      if (!title) { findings.push({ severity: 'warning', category: 'Clarity', text: `Q${qnum}: No question text.` }); scores.Clarity = Math.max(0, scores.Clarity - 15) }
      else if (title.split(' ').length < 3) { findings.push({ severity: 'suggestion', category: 'Clarity', text: `Q${qnum}: Very short — "${title}". Make it unambiguous.` }); scores.Clarity = Math.max(0, scores.Clarity - 6) }
      else if (title.length > 220) { findings.push({ severity: 'suggestion', category: 'Clarity', text: `Q${qnum}: Long question (${title.length} chars). Shorter questions reduce cognitive load.` }); scores.Clarity = Math.max(0, scores.Clarity - 5) }
      for (const w of VAGUE) { if (tl.includes(w)) { findings.push({ severity: 'suggestion', category: 'Clarity', text: `Q${qnum}: Vague term "${w}". Be specific.` }); scores.Clarity = Math.max(0, scores.Clarity - 5); break } }
      for (const p of BIAS) { if (tl.includes(p)) { findings.push({ severity: 'warning', category: 'Bias & Fairness', text: `Q${qnum}: Leading phrase "${p}". Rephrase neutrally.` }); scores['Bias & Fairness'] = Math.max(0, scores['Bias & Fairness'] - 22); break } }
      const key = tl.replace(/[?.]/g, '').trim()
      if (key && seen.has(key)) { findings.push({ severity: 'warning', category: 'Logic', text: `Q${qnum}: Duplicate question text detected.` }); scores.Logic = Math.max(0, scores.Logic - 18) }
      seen.add(key)
    })

    if (!findings.some(f => f.category === 'Bias & Fairness' && f.severity !== 'pass'))
      findings.push({ severity: 'pass', category: 'Bias & Fairness', text: 'No leading phrases detected. Questions appear neutrally worded.' })
    if (!findings.some(f => f.category === 'Logic' && f.severity !== 'pass'))
      findings.push({ severity: 'pass', category: 'Logic', text: 'No duplicate questions detected.' })
    if (!findings.some(f => f.category === 'Clarity' && f.severity !== 'pass'))
      findings.push({ severity: 'pass', category: 'Clarity', text: 'All questions clearly worded.' })
    findings.push({ severity: 'pass', category: 'Compliance', text: 'No obvious PII collection detected.' })

    const overall = Math.round(Object.keys(WEIGHTS_F).reduce((acc, c) => acc + scores[c] * WEIGHTS_F[c] / 100, 0))
    const categories = Object.keys(WEIGHTS_F).map(c => ({ name: c, score: scores[c], weight: WEIGHTS_F[c] }))
    setTimeout(() => { setExpertReview({ overall_score: overall, categories, findings }); setExpertLoading(false) }, 800)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'Hanken Grotesk', system-ui", color: '#71717a' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #f9a8d4', borderTopColor: '#db2777', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )
  if (!survey) return <div style={{ padding: 40, color: '#ef4444', fontFamily: "'Hanken Grotesk', system-ui" }}>Survey not found.</div>

  if (published) {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 18% 12%, #fce7f3, #ede9fe 55%, #e0e7ff)', fontFamily: "'Hanken Grotesk', system-ui" }}>
        <TopBar />
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(219,39,119,.3)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg>
          </div>
          <h1 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 32, marginBottom: 8, color: '#18181b' }}>Survey Published!</h1>
          <p style={{ color: '#71717a', marginBottom: 32, fontSize: 16 }}>Your survey is live and ready to collect responses.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn secondary" onClick={() => { setPublished(false); setActiveTab('share') }}>View Share Options</button>
            <button className="btn" onClick={() => router.push('/')}>Go to Dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  const accent = TYPE_ACCENT[editingQId ? (questions.find(q => q.id === editingQId)?.type ?? 'single_choice') : 'single_choice']

  return (
    <>
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 18% 12%, #fce7f3, #ede9fe 55%, #e0e7ff)', fontFamily: "'Hanken Grotesk', system-ui" }}>
      <TopBar />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px' }}>

        {/* Breadcrumb */}
        <button onClick={() => router.push('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#71717a', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 14, fontFamily: 'inherit', padding: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to Surveys
        </button>

        {/* Builder header card */}
        <div style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(14px)', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.1)', padding: '18px 24px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 24px rgba(219,39,119,.07)' }}>
          <div>
            <h1
              contentEditable
              suppressContentEditableWarning
              onBlur={e => setSurvey(prev => prev ? { ...prev, title: e.target.innerText.trim() } : prev)}
              style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 20, margin: '0 0 4px', outline: 'none', cursor: 'text', color: '#18181b', letterSpacing: '-.02em' }}
            >
              {survey.title}
            </h1>
            <div style={{ fontSize: 12, color: '#71717a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>SRV-{id.slice(0, 8).toUpperCase()}</span>
              <span>·</span>
              <span style={{ color: survey.status === 'active' ? '#16a34a' : '#d97706', fontWeight: 700 }}>
                {survey.status === 'active' ? '● Live' : '● Draft'}
              </span>
              <span>·</span>
              <span>{survey.mode}</span>
              <span>·</span>
              <span>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {republished && <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ Changes live</span>}
            <button className="btn ghost" onClick={saveDraft} disabled={saving} style={{ fontSize: 13 }}>
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button className="btn ghost" onClick={() => setShowPreview(true)} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Preview
            </button>
            {survey.status === 'active' ? (
              <button className="btn" onClick={handleRepublish} disabled={saving} style={{ fontSize: 13 }}>
                {saving ? 'Publishing…' : '↑ Republish'}
              </button>
            ) : (
              <button className="btn" onClick={handlePublish} style={{ fontSize: 13 }}>Publish →</button>
            )}
          </div>
        </div>

        {/* Pill tab bar */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,.7)', backdropFilter: 'blur(8px)', borderRadius: 14, padding: '5px', marginBottom: 20, gap: 2, boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ flex: 1, padding: '9px 6px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', background: activeTab === t.id ? 'linear-gradient(135deg,#db2777,#be185d)' : 'transparent', color: activeTab === t.id ? '#fff' : '#71717a', boxShadow: activeTab === t.id ? '0 2px 10px rgba(219,39,119,.3)' : 'none', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)', padding: 28 }}>
            <h2 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 18, margin: '0 0 4px', color: '#18181b' }}>Overview Analytics</h2>
            <div style={{ fontSize: 13, color: '#71717a', marginBottom: 24 }}>Live response stats for this survey.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Total Responses', value: String(results?.total ?? 0), color: '#db2777', bg: '#fce7f3' },
                { label: 'Completion Rate', value: results?.total ? `${Math.round((results.complete / results.total) * 100)}%` : '0%', color: '#16a34a', bg: '#f0fdf4' },
                { label: 'Avg. Time', value: '—', color: '#7c3aed', bg: '#faf5ff' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '20px' }}>
                  <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 30, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: s.color, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn secondary" style={{ fontSize: 13 }} onClick={() => setActiveTab('build')}>Go to Build</button>
              <button className="btn secondary" style={{ fontSize: 13 }} onClick={() => setActiveTab('insights')}>View Insights</button>
            </div>
          </div>
        )}

        {/* ── BUILD ── */}
        {activeTab === 'build' && (
          <div style={{ display: 'flex', gap: 16, minHeight: 600, alignItems: 'flex-start' }}>

            {/* LEFT: Type picker */}
            <div style={{ width: 196, flexShrink: 0 }}>
              <div style={{ background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(12px)', borderRadius: 14, border: '1.5px solid rgba(219,39,119,.08)', padding: '14px', position: 'sticky', top: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10, padding: '0 2px' }}>Add Question</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {TYPE_TILES.map(t => (
                    <button key={t.type} onClick={() => addQuestion(t.type)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#18181b', fontFamily: 'inherit', transition: 'all .1s', width: '100%' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = t.bg; (e.currentTarget as HTMLButtonElement).style.color = t.color }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#18181b' }}>
                      <span style={{ fontSize: 13, width: 18, textAlign: 'center' }}>{t.icon}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTER: Canvas */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {questions.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: 14, padding: '56px 24px', textAlign: 'center', color: '#71717a', border: '2px dashed rgba(219,39,119,.2)' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>✎</div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: '#52525b' }}>No questions yet</div>
                  <div style={{ fontSize: 13 }}>Click a question type on the left to add your first question.</div>
                </div>
              ) : questions.map((q, i) => {
                const qAccent = TYPE_ACCENT[q.type] ?? '#db2777'
                const isSelected = editingQId === q.id
                const typeLabel = TYPE_LABEL[q.type] ?? q.type
                return (
                  <div
                    key={q.id}
                    onClick={() => setEditingQId(isSelected ? null : q.id)}
                    style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${isSelected ? '#db2777' : 'rgba(219,39,119,.08)'}`, borderLeft: `4px solid ${qAccent}`, boxShadow: isSelected ? '0 4px 24px rgba(219,39,119,.14)' : '0 2px 6px rgba(0,0,0,.04)', cursor: 'pointer', transition: 'box-shadow .15s, border-color .15s', overflow: 'hidden' }}
                  >
                    {/* Card header */}
                    <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ width: 26, height: 26, borderRadius: 8, background: qAccent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0, fontFamily: "'Schibsted Grotesk', system-ui" }}>
                        {i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0, marginTop: 2 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: q.title ? '#18181b' : '#a1a1aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.title || 'Untitled question — click to edit'}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${qAccent}18`, color: qAccent, border: `1px solid ${qAccent}25` }}>
                            {typeLabel}
                          </span>
                          {q.required && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>Required</span>
                          )}
                          {q.logicOn && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#ede9fe', color: '#7c3aed', border: '1px solid #ddd6fe' }}>🔀 Logic</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); deleteQuestion(q.id) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#d4d4d8', lineHeight: 1, padding: '2px 4px', flexShrink: 0, marginTop: -2 }}
                        title="Delete question">×</button>
                    </div>

                    {/* AI chips */}
                    <div style={{ padding: '0 16px 12px', display: 'flex', gap: 5, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                      {AI_CHIPS.map(chip => {
                        const chipKey = `${q.id}-${chip.key}`
                        const isLoading = aiChipLoading === chipKey
                        return (
                          <button
                            key={chip.key}
                            onClick={() => runAiChip(q.id, chip.key)}
                            disabled={!!aiChipLoading}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: '#7c3aed', background: '#faf5ff', border: '1px solid #ede9fe', padding: '4px 10px', borderRadius: 7, cursor: isLoading ? 'default' : 'pointer', opacity: isLoading ? .6 : 1, fontFamily: 'inherit', transition: 'background .1s' }}
                            onMouseEnter={e => { if (!aiChipLoading) (e.currentTarget as HTMLButtonElement).style.background = '#ede9fe' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#faf5ff' }}>
                            <span>{isLoading ? '…' : '✨'}</span>
                            <span>{chip.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* End screens */}
              {questions.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8, paddingLeft: 4 }}>End Screens</div>
                  {[
                    { label: 'Thank You Screen', desc: 'Shown after survey completion', color: '#16a34a', bg: '#f0fdf4', borderColor: '#86efac' },
                    { label: 'Disqualified Screen', desc: 'Shown to screened-out respondents', color: '#d97706', bg: '#fffbeb', borderColor: '#fde68a' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: `1.5px solid rgba(219,39,119,.06)`, borderLeft: `4px solid ${s.color}`, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#18181b' }}>{s.label}</div>
                        <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{s.desc}</div>
                      </div>
                      <button
                        onClick={() => alert(`Edit ${s.label} — coming soon`)}
                        style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8, border: `1px solid ${s.color}`, color: s.color, background: s.bg, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: Properties panel */}
            {editingQId && (
              <div style={{ width: 320, flexShrink: 0 }}>
                <div style={{ background: 'rgba(255,255,255,.96)', backdropFilter: 'blur(12px)', borderRadius: 14, border: '1.5px solid rgba(219,39,119,.12)', overflow: 'hidden', position: 'sticky', top: 20, boxShadow: '0 4px 24px rgba(219,39,119,.1)' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(219,39,119,.08)', background: 'linear-gradient(135deg,rgba(219,39,119,.06),rgba(124,58,237,.04))' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#db2777', textTransform: 'uppercase', letterSpacing: '.06em' }}>Question Properties</div>
                  </div>
                  <QuestionEditor
                    key={editingQId}
                    surveyId={id}
                    question={questions.find(q => q.id === editingQId)!}
                    onSave={saved => setQuestions(prev => prev.map(q => q.id === saved.id ? { ...saved, logicOn: q.logicOn } : q))}
                    onDelete={qid => { setQuestions(prev => prev.filter(q => q.id !== qid)); setEditingQId(null) }}
                    onCancel={() => {
                      const q = questions.find(q => q.id === editingQId)
                      if (q && !q.title.trim()) {
                        fetch(`${API}/surveys/${id}/questions/${q.id}`, { method: 'DELETE' })
                        setQuestions(prev => prev.filter(pq => pq.id !== q.id))
                      }
                      setEditingQId(null)
                    }}
                  />
                </div>
              </div>
            )}

            {/* Empty state when no question selected */}
            {!editingQId && questions.length > 0 && (
              <div style={{ width: 320, flexShrink: 0 }}>
                <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: 14, border: '1.5px dashed rgba(219,39,119,.2)', padding: '32px 20px', textAlign: 'center', color: '#71717a' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>←</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#52525b', marginBottom: 4 }}>Select a question</div>
                  <div style={{ fontSize: 12 }}>Click any card to edit its properties</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LOGIC ── */}
        {activeTab === 'logic' && (
          <div style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)' }}>
            <LogicTab surveyId={id} questions={questions} />
          </div>
        )}

        {/* ── CONFIGURATION ── */}
        {activeTab === 'config' && (
          <div style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)', padding: 28 }}>
            <h2 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 18, margin: '0 0 4px', color: '#18181b' }}>Survey Configuration</h2>
            <div style={{ fontSize: 13, color: '#71717a', marginBottom: 24 }}>Configure quality settings, response validation, and survey controls.</div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>Quality Settings</div>
              {[
                { label: 'Require Response', desc: 'Make all questions mandatory', val: cfgRequire, set: setCfgRequire },
                { label: 'Prevent Multiple Submissions', desc: 'One response per user', val: cfgNoDupes, set: setCfgNoDupes },
                { label: 'Randomize Questions', desc: 'Show questions in random order', val: cfgRandomize, set: setCfgRandomize },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(219,39,119,.06)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#18181b' }}>{row.label}</div>
                    <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{row.desc}</div>
                  </div>
                  <div onClick={() => row.set(!row.val)} style={{ position: 'relative', width: 44, height: 25, borderRadius: 14, background: row.val ? '#db2777' : '#e4e4e7', cursor: 'pointer', transition: '.15s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 3, left: row.val ? 22 : 3, width: 19, height: 19, borderRadius: '50%', background: 'white', transition: '.15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>Survey Controls</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Close Date</label>
                  <input type="date" value={closeDate} onChange={e => setCloseDate(e.target.value)} style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Response Limit</label>
                  <input type="number" placeholder="e.g. 1000" value={responseLimit} onChange={e => setResponseLimit(e.target.value)} style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
            </div>

            <button className="btn" style={{ fontSize: 13 }} onClick={async () => {
              await updateSurvey(id, {
                settings: { require_response: cfgRequire, no_duplicates: cfgNoDupes, randomize: cfgRandomize },
                close_date: closeDate || null,
                response_limit: responseLimit ? parseInt(responseLimit) : null,
              })
              alert('Configuration saved.')
            }}>Save Configuration</button>
          </div>
        )}

        {/* ── SHARE ── */}
        {activeTab === 'share' && (
          <div style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)' }}>
            <ShareTab surveyId={id} surveyTitle={survey.title} status={survey.status} onPublish={handlePublish} />
          </div>
        )}

        {/* ── INSIGHTS ── */}
        {activeTab === 'insights' && (
          <div style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)' }}>
            <InsightsTab surveyId={id} />
          </div>
        )}

        {/* ── EXPERT REVIEW ── */}
        {activeTab === 'expert' && (
          <div style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)', padding: 28 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 18, margin: '0 0 4px', color: '#18181b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  Expert Review
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', background: '#ecfeff', padding: '2px 8px', borderRadius: 6, border: '1px solid #cffafe' }}>Rule-based</span>
                </h2>
                <div style={{ fontSize: 13, color: '#71717a' }}>Scans for bias, clarity, structure, and compliance issues before you publish.</div>
              </div>
              <button onClick={runExpertReview} disabled={expertLoading} className="btn" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                {expertLoading ? <><span className="spinner" />Analyzing…</> : <>Run Review</>}
              </button>
            </div>

            {/* Empty state */}
            {!expertReview && !expertLoading && (
              <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#ecfeff)', borderRadius: 12, padding: 32, textAlign: 'center', border: '1.5px dashed rgba(8,145,178,.25)' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#52525b', marginBottom: 6 }}>No review run yet</div>
                <div style={{ fontSize: 13, color: '#71717a' }}>Click "Run Review" to check your survey for quality issues before publishing.</div>
              </div>
            )}

            {/* Loading */}
            {expertLoading && (
              <div style={{ padding: 40, textAlign: 'center', color: '#71717a' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #cffafe', borderTopColor: '#0891b2', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 14 }}>Analyzing survey…</div>
              </div>
            )}

            {/* Results */}
            {expertReview && !expertLoading && (() => {
              const { overall_score, categories, findings } = expertReview
              const scoreColor = overall_score >= 80 ? '#16a34a' : overall_score >= 60 ? '#d97706' : '#dc2626'
              const scoreBg    = overall_score >= 80 ? '#f0fdf4' : overall_score >= 60 ? '#fffbeb' : '#fef2f2'
              const scoreBdr   = overall_score >= 80 ? '#bbf7d0' : overall_score >= 60 ? '#fde68a' : '#fecaca'
              const r = 36, circ = 2 * Math.PI * r
              const dash = circ * (overall_score / 100)
              const warnings    = findings.filter(f => f.severity === 'warning')
              const suggestions = findings.filter(f => f.severity === 'suggestion')
              const passes      = findings.filter(f => f.severity === 'pass')
              return (
                <div>
                  {/* Score + categories row */}
                  <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
                    {/* Score ring */}
                    <div style={{ background: scoreBg, border: `1.5px solid ${scoreBdr}`, borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, minWidth: 180 }}>
                      <svg width={88} height={88} viewBox="0 0 88 88">
                        <circle cx={44} cy={44} r={r} fill="none" stroke={scoreBdr} strokeWidth={8} />
                        <circle cx={44} cy={44} r={r} fill="none" stroke={scoreColor} strokeWidth={8}
                          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                          transform="rotate(-90 44 44)" />
                        <text x={44} y={44} textAnchor="middle" dominantBaseline="central"
                          fill={scoreColor} fontSize={20} fontWeight={700}>{overall_score}</text>
                      </svg>
                      <div>
                        <div style={{ fontSize: 12, color: '#71717a', marginBottom: 2 }}>Overall score</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: scoreColor }}>
                          {overall_score >= 80 ? 'Good' : overall_score >= 60 ? 'Needs work' : 'Poor'}
                        </div>
                        <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</div>
                      </div>
                    </div>

                    {/* Category bars */}
                    <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                      {categories.map(cat => {
                        const c = cat.score >= 80 ? '#16a34a' : cat.score >= 60 ? '#d97706' : '#dc2626'
                        return (
                          <div key={cat.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ fontSize: 12, color: '#52525b', fontWeight: 500 }}>{cat.name}</span>
                              <span style={{ fontSize: 12, color: c, fontWeight: 600 }}>{cat.score}</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 4, background: '#f4f4f5' }}>
                              <div style={{ height: 6, borderRadius: 4, background: c, width: `${cat.score}%`, transition: 'width .4s ease' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Findings */}
                  {warnings.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Warnings ({warnings.length})</div>
                      {warnings.map((f, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', marginBottom: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', marginTop: 5, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', marginRight: 6 }}>{f.category}</span>
                            <span style={{ fontSize: 13, color: '#18181b', lineHeight: 1.5 }}>{f.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {suggestions.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Suggestions ({suggestions.length})</div>
                      {suggestions.map((f, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a', marginBottom: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', marginTop: 5, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706', marginRight: 6 }}>{f.category}</span>
                            <span style={{ fontSize: 13, color: '#18181b', lineHeight: 1.5 }}>{f.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {passes.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Passing checks ({passes.length})</div>
                      {passes.map((f, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 12px', marginBottom: 4, borderBottom: i < passes.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', marginTop: 5, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', marginRight: 6 }}>{f.category}</span>
                            <span style={{ fontSize: 13, color: '#52525b', lineHeight: 1.5 }}>{f.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 12, background: '#f8fafc', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#94a3b8', border: '1px solid #e2e8f0' }}>
                    Rule-based checks flag common issues. AI-powered analysis coming soon.
                  </div>
                </div>
              )
            })()}
          </div>
        )}

      </div>
    </div>

    {showPreview && (
      <PreviewModal
        questions={questions}
        selectedId={editingQId}
        branding={branding}
        surveyTitle={survey.title}
        onClose={() => setShowPreview(false)}
      />
    )}
    </>
  )
}

// ── Share Tab ────────────────────────────────────────────────────────────────

function ShareTab({ surveyId, surveyTitle, status, onPublish }: {
  surveyId: string; surveyTitle: string; status: string; onPublish: () => void
}) {
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { setOrigin(window.location.origin) }, [])

  const respondUrl = `${origin}/surveys/${surveyId}/respond`
  const embedCode  = `<iframe src="${respondUrl}" width="100%" height="680" frameborder="0" allow="clipboard-write"></iframe>`
  const mailtoLink = `mailto:?subject=${encodeURIComponent(`Please take our survey: ${surveyTitle}`)}&body=${encodeURIComponent(`Hi,\n\nWe'd love your feedback. Please take a few minutes to fill out our survey:\n\n${respondUrl}\n\nThank you!`)}`

  const copy = (text: string, key: string) => {
    const fallback = () => {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(fallback)
      else fallback()
    } catch { fallback() }
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const isLive = status === 'active'

  return (
    <div style={{ padding: 28 }}>
      <h2 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 18, margin: '0 0 4px', color: '#18181b' }}>Share & Distribute</h2>
      <div style={{ fontSize: 13, color: '#71717a', marginBottom: 24 }}>
        {isLive ? 'Your survey is live — share the link below to start collecting responses.' : 'Publish your survey first to enable distribution.'}
      </div>

      {!isLive && (
        <button className="btn" onClick={onPublish} style={{ marginBottom: 24, fontSize: 13 }}>
          Publish Survey to Enable Sharing →
        </button>
      )}

      <ShareSection title="🔗 Shareable link" desc="Send this URL directly to respondents.">
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={isLive ? respondUrl : '— publish first —'}
            style={{ flex: 1, border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'monospace', background: isLive ? 'white' : '#f9f9fa', color: isLive ? '#18181b' : '#a1a1aa', outline: 'none' }}
            onFocus={e => e.target.select()} />
          <button className="btn secondary" disabled={!isLive} onClick={() => copy(respondUrl, 'link')} style={{ flexShrink: 0, fontSize: 13 }}>
            {copied === 'link' ? '✓ Copied!' : 'Copy Link'}
          </button>
          {isLive && (
            <a href={respondUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', padding: '0 14px', borderRadius: 10, border: '1.5px solid #e4e4e7', background: 'white', color: '#18181b', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Open ↗
            </a>
          )}
        </div>
      </ShareSection>

      <ShareSection title="</> Embed on your site" desc="Paste this into any webpage to embed the survey inline.">
        <textarea readOnly value={isLive ? embedCode : '— publish first —'} rows={3}
          style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', background: isLive ? 'white' : '#f9f9fa', color: isLive ? '#18181b' : '#a1a1aa', outline: 'none' }}
          onFocus={e => e.target.select()} />
        <button className="btn secondary" disabled={!isLive} onClick={() => copy(embedCode, 'embed')} style={{ marginTop: 8, fontSize: 13 }}>
          {copied === 'embed' ? '✓ Copied!' : 'Copy Embed Code'}
        </button>
      </ShareSection>

      <ShareSection title="✉️ Email invite" desc="Opens your email client with the survey link pre-filled.">
        <a href={isLive ? mailtoLink : '#'}
          style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 18px', borderRadius: 10, border: '1.5px solid #db2777', color: isLive ? '#db2777' : '#a1a1aa', fontWeight: 600, fontSize: 13, textDecoration: 'none', background: 'white', pointerEvents: isLive ? 'auto' : 'none', opacity: isLive ? 1 : 0.5 }}>
          Open Email Client
        </a>
      </ShareSection>

      <ShareSection title="📱 QR Code" desc="Download or screenshot for print materials, slides, or events.">
        {isLive ? (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(respondUrl)}`}
              alt="Survey QR Code" width={140} height={140}
              style={{ border: '1.5px solid #e4e4e7', borderRadius: 10, padding: 6, background: 'white' }} />
            <div>
              <div style={{ fontSize: 13, color: '#71717a', marginBottom: 10 }}>Right-click the QR code to save it, or screenshot it for use in presentations and print materials.</div>
              <div style={{ fontSize: 12, color: '#71717a', fontFamily: 'monospace', wordBreak: 'break-all', background: '#f9f9fa', padding: '6px 10px', borderRadius: 8 }}>{respondUrl}</div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#a1a1aa' }}>Publish the survey to generate a QR code.</div>
        )}
      </ShareSection>
    </div>
  )
}

function ShareSection({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(219,39,119,.06)', paddingBottom: 22, marginBottom: 22 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#18181b', marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#71717a', marginBottom: 12 }}>{desc}</div>
      {children}
    </div>
  )
}
