'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSurvey, updateSurvey, createQuestion, getResults } from '../../../lib/api'
import TopBar from '../../../components/TopBar'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Question {
  id: string
  type: string
  title: string
  required: boolean
  position: number
  options?: string[]
  logicOn?: boolean
}

interface Survey {
  id: string
  title: string
  status: string
  mode: string
  settings: Record<string, unknown>
}

const QUESTION_TYPES = [
  { type: 'single_choice', label: '◉ Single choice' },
  { type: 'multi_select', label: '☑ Multi-select' },
  { type: 'rating', label: '★ Rating scale' },
  { type: 'nps', label: '📊 NPS (0–10)' },
  { type: 'short_text', label: '✎ Short text' },
  { type: 'long_text', label: '📝 Long text' },
  { type: 'yes_no', label: '⬤ Yes / No' },
  { type: 'likert_matrix', label: '▦ Matrix / Likert' },
  { type: 'ranking', label: '⇕ Ranking' },
  { type: 'date_time', label: '📅 Date / time' },
]

const TYPE_LABEL: Record<string, string> = {
  single_choice: 'Single Choice', multi_select: 'Multi-Select', rating: 'Rating Scale',
  nps: 'NPS', short_text: 'Short Text', long_text: 'Long Text',
  yes_no: 'Yes/No', likert_matrix: 'Matrix/Likert', ranking: 'Ranking', date_time: 'Date/Time',
}

export default function SurveyBuilder() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [published, setPublished] = useState(false)
  const [results, setResults] = useState<{ total: number; complete: number; partial: number } | null>(null)

  // Build tab state

  // Config tab state
  const [cfgRequire, setCfgRequire] = useState(false)
  const [cfgNoDupes, setCfgNoDupes] = useState(true)
  const [cfgRandomize, setCfgRandomize] = useState(false)
  const [closeDate, setCloseDate] = useState('')
  const [responseLimit, setResponseLimit] = useState('')

  // Logic tab state
  const [logicSubtab, setLogicSubtab] = useState('skip')

  useEffect(() => {
    getSurvey(id).then(data => {
      setSurvey(data)
      setQuestions(
        (data.questions || []).map((q: Question & { question_options?: Array<{label: string}> }) => ({
          ...q,
          options: q.question_options?.map((o: {label: string}) => o.label) ?? defaultOptions(q.type),
          logicOn: false,
        }))
      )
      setLoading(false)
    })
    getResults(id).then(setResults)
  }, [id])

  function defaultOptions(type: string) {
    return ['single_choice', 'multi_select', 'ranking'].includes(type) ? ['Option 1', 'Option 2'] : undefined
  }

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

  const addQuestion = async (type: string) => {
    const payload = {
      type,
      title: `Untitled ${TYPE_LABEL[type] ?? type} question`,
      required: false,
      position: questions.length,
    }
    const q = await createQuestion(id, payload)
    setQuestions(prev => [...prev, { ...q, options: defaultOptions(type), logicOn: false }])
    setActiveTab('build')
  }

  const removeQuestion = (qid: string) => setQuestions(prev => prev.filter(q => q.id !== qid))

  const updateTitle = (qid: string, val: string) =>
    setQuestions(prev => prev.map(q => q.id === qid ? { ...q, title: val } : q))

  const toggleLogic = (qid: string) =>
    setQuestions(prev => prev.map(q => q.id === qid ? { ...q, logicOn: !q.logicOn } : q))


  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--grey)' }}>Loading…</div>
  if (!survey) return <div style={{ padding: 40, color: 'var(--red)' }}>Survey not found.</div>

  if (published) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <TopBar />
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Survey Published!</h1>
          <p style={{ color: 'var(--grey)', marginBottom: 24 }}>Your survey is live and ready to collect responses.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn secondary" onClick={() => { setPublished(false); setActiveTab('share') }}>View Share Options</button>
            <button className="btn" onClick={() => router.push('/')}>Go to Dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  const TABS = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'build', label: '✎ Build' },
    { id: 'logic', label: '🔀 Logic' },
    { id: 'config', label: '⚙ Configuration' },
    { id: 'share', label: '📤 Share' },
    { id: 'insights', label: '📈 Insights' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopBar />
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px' }}>

        {/* Breadcrumb */}
        <div onClick={() => router.push('/')} style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 10, cursor: 'pointer' }}>
          ← Back to Overview
        </div>

        {/* Builder Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <h1
              contentEditable
              suppressContentEditableWarning
              onBlur={e => setSurvey(prev => prev ? { ...prev, title: e.target.innerText } : prev)}
              style={{ fontSize: 22, margin: '0 0 4px', outline: 'none', cursor: 'text' }}
            >
              {survey.title}
            </h1>
            <div style={{ color: 'var(--grey)', fontSize: 12 }}>
              Survey ID: SRV-{id.slice(0, 8).toUpperCase()} · {survey.status === 'active' ? 'Live' : 'Draft'} · {survey.mode}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn ghost" onClick={saveDraft} disabled={saving}>{saving ? 'Saving…' : 'Save Draft'}</button>
            <button className="btn" onClick={handlePublish} disabled={survey.status === 'active'}>
              {survey.status === 'active' ? '✓ Published' : 'Publish Survey'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', margin: '18px 0 22px', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <div
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                fontSize: 13.5, fontWeight: 600, padding: '10px 14px', cursor: 'pointer',
                color: activeTab === t.id ? 'var(--accent)' : 'var(--grey)',
                borderBottom: `2px solid ${activeTab === t.id ? 'var(--accent)' : 'transparent'}`,
              }}
            >
              {t.label}
            </div>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>Overview Analytics</h2>
            <div style={{ fontSize: 12.5, color: 'var(--grey)', marginBottom: 18 }}>Live response stats for this survey.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              <StatTile color="blue" num={String(results?.total ?? 0)} label="Total Responses" />
              <StatTile color="green" num={results?.total ? `${Math.round((results.complete / results.total) * 100)}%` : '0%'} label="Completion Rate" />
              <StatTile color="purple" num="--" label="Avg. Time" />
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button className="btn secondary" onClick={() => setActiveTab('build')}>Go to Build</button>
              <button className="btn secondary" onClick={() => setActiveTab('insights')}>View Insights</button>
            </div>
          </div>
        )}

        {/* ── BUILD TAB ── */}
        {activeTab === 'build' && (
          <div>
            {/* Builder layout */}
            <div style={{ display: 'flex', gap: 18 }}>
              {/* Question type panel */}
              <div style={{ width: 190, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, height: 'fit-content', flexShrink: 0 }}>
                <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--grey)', margin: '0 0 10px' }}>Add Question</h3>
                {QUESTION_TYPES.map(qt => (
                  <div
                    key={qt.type}
                    onClick={() => addQuestion(qt.type)}
                    style={{ fontSize: 13, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {qt.label}
                  </div>
                ))}
              </div>

              {/* Question canvas */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                {questions.length === 0 ? (
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 40, textAlign: 'center', color: 'var(--grey)', fontSize: 13 }}>
                    No questions yet — add one from the left, or use AI generation above.
                  </div>
                ) : questions.map((q, i) => (
                  <div key={q.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <input
                        value={q.title}
                        onChange={e => updateTitle(q.id, e.target.value)}
                        style={{ border: 'none', fontSize: 15, fontWeight: 600, width: '100%', outline: 'none', background: 'transparent', fontFamily: 'inherit' }}
                        placeholder={`Q${i + 1} — enter question text`}
                      />
                      <span style={{ fontSize: 11, color: 'var(--accent)', background: '#EEF2FF', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap', marginLeft: 10 }}>
                        {TYPE_LABEL[q.type] ?? q.type}
                      </span>
                    </div>

                    {q.options && q.options.map((opt, oi) => (
                      <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 13, color: 'var(--grey)' }}>
                        ○ <input
                          type="text"
                          defaultValue={opt}
                          style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontSize: 13, flex: 1, fontFamily: 'inherit' }}
                        />
                      </div>
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                      <span
                        onClick={() => toggleLogic(q.id)}
                        style={{ fontSize: 12, color: 'var(--grey)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        {q.logicOn ? '🔀 Skip logic: ON (go to Q+2 if "No")' : '+ Add skip logic'}
                      </span>
                      <span onClick={() => removeQuestion(q.id)} style={{ fontSize: 12, color: 'var(--red)', cursor: 'pointer' }}>Remove</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LOGIC TAB ── */}
        {activeTab === 'logic' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>Logic & Flow Control</h2>
            <div style={{ fontSize: 12.5, color: 'var(--grey)', marginBottom: 18 }}>Set up conditional logic and branching based on responses.</div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid var(--border)' }}>
              {['skip', 'compound', 'showq', 'showo'].map(sub => (
                <div
                  key={sub}
                  onClick={() => setLogicSubtab(sub)}
                  style={{ fontSize: 13, fontWeight: 600, padding: '8px 4px', marginRight: 22, cursor: 'pointer', color: logicSubtab === sub ? 'var(--accent)' : 'var(--grey)', borderBottom: `2px solid ${logicSubtab === sub ? 'var(--accent)' : 'transparent'}` }}
                >
                  {sub === 'skip' ? 'Skip Logic' : sub === 'compound' ? 'Compound Logic' : sub === 'showq' ? 'Show/Hide Questions' : 'Show/Hide Options'}
                </div>
              ))}
            </div>

            {logicSubtab === 'skip' && (
              <div>
                <div style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 12 }}>Simple per-question skip rules, set from each question in the Build tab.</div>
                {questions.filter(q => q.logicOn).length === 0 ? (
                  <div style={{ color: 'var(--grey)', fontSize: 13, padding: '16px 0' }}>No skip logic rules set yet. Enable them per-question in the Build tab.</div>
                ) : questions.filter(q => q.logicOn).map(q => (
                  <div key={q.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>🔀 {q.title.slice(0, 40)} → if &quot;No&quot;, skip to next</div>
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', fontSize: 12.5 }}>
                      If <strong style={{ color: 'var(--accent-dark)' }}>{q.title.slice(0, 30)}…</strong> equals <strong style={{ color: 'var(--accent-dark)' }}>&quot;No&quot;</strong> → jump to next question
                    </div>
                  </div>
                ))}
              </div>
            )}

            {logicSubtab === 'compound' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ color: 'var(--grey)', fontSize: 13 }}>Create complex conditions using multiple filters and named variables.</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn ghost">⚛ Create Variable</button>
                    <button className="btn purple">+ Add Compound Logic</button>
                  </div>
                </div>
                <div style={{ background: '#EEF2FF', border: '1px solid #D7E0FF', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent-dark)', marginBottom: 8 }}>⚛ Available Variables</div>
                  {['$user_segment', '$satisfaction_score', '$product_usage'].map(v => (
                    <span key={v} style={{ display: 'inline-block', fontSize: 12, fontFamily: 'monospace', background: 'white', border: '1px solid #C7D3FF', color: 'var(--accent-dark)', padding: '4px 10px', borderRadius: 20, margin: '0 6px 6px 0' }}>{v}</span>
                  ))}
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>🔻 Rule #1: Premium User Pathway</div>
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', fontSize: 12.5 }}>
                    <div style={{ fontWeight: 600, color: 'var(--grey)', fontSize: 11.5, textTransform: 'uppercase', marginBottom: 4 }}>Conditions (ALL must be true)</div>
                    <div style={{ padding: '5px 0' }}>▽ <strong style={{ color: 'var(--accent-dark)' }}>Subscription Type</strong> equals <strong style={{ color: 'var(--accent-dark)' }}>&quot;Premium&quot;</strong></div>
                    <div style={{ padding: '5px 0' }}>▽ Variable: <strong style={{ color: 'var(--accent-dark)' }}>$satisfaction_score</strong> greater than <strong style={{ color: 'var(--accent-dark)' }}>8</strong></div>
                  </div>
                  <div style={{ background: '#F1E9F7', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, marginTop: 8, color: '#5A3A78', fontWeight: 600 }}>
                    THEN → Route to &quot;Power User&quot; follow-up branch
                  </div>
                </div>
              </div>
            )}

            {(logicSubtab === 'showq' || logicSubtab === 'showo') && (
              <div style={{ color: 'var(--grey)', fontSize: 13 }}>
                {logicSubtab === 'showq'
                  ? 'Show or hide entire questions based on prior answers — configure per question from the Build tab.'
                  : 'Show or hide individual answer options dynamically based on earlier responses or variables.'}
              </div>
            )}
          </div>
        )}

        {/* ── CONFIGURATION TAB ── */}
        {activeTab === 'config' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>Survey Configuration</h2>
            <div style={{ fontSize: 12.5, color: 'var(--grey)', marginBottom: 18 }}>Configure quality settings, response validation, and survey controls.</div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--grey)', margin: '0 0 12px' }}>Quality Settings</h3>
              {[
                { label: 'Require Response', desc: 'Make all questions mandatory', val: cfgRequire, set: setCfgRequire },
                { label: 'Prevent Multiple Submissions', desc: 'One response per user', val: cfgNoDupes, set: setCfgNoDupes },
                { label: 'Randomize Questions', desc: 'Show questions in random order', val: cfgRandomize, set: setCfgRandomize },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{row.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>{row.desc}</div>
                  </div>
                  <div
                    onClick={() => row.set(!row.val)}
                    style={{ position: 'relative', width: 42, height: 24, borderRadius: 14, background: row.val ? 'var(--accent)' : 'var(--border)', cursor: 'pointer', transition: '.15s', flexShrink: 0 }}
                  >
                    <div style={{ position: 'absolute', top: 3, left: row.val ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: '.15s' }} />
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--grey)', margin: '0 0 12px' }}>Survey Controls</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Close Date</label>
                  <input type="date" value={closeDate} onChange={e => setCloseDate(e.target.value)} style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Response Limit</label>
                  <input type="number" placeholder="e.g. 1000" value={responseLimit} onChange={e => setResponseLimit(e.target.value)} style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit' }} />
                </div>
              </div>
              <div style={{ marginTop: 18 }}>
                <button className="btn" onClick={async () => {
                  await updateSurvey(id, {
                    settings: { require_response: cfgRequire, no_duplicates: cfgNoDupes, randomize: cfgRandomize },
                    close_date: closeDate || null,
                    response_limit: responseLimit ? parseInt(responseLimit) : null,
                  })
                  alert('Configuration saved.')
                }}>Save Configuration</button>
              </div>
            </div>
          </div>
        )}

        {/* ── SHARE TAB ── */}
        {activeTab === 'share' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>Share & Distribute</h2>
            <div style={{ fontSize: 12.5, color: 'var(--grey)', marginBottom: 18 }}>
              {survey.status === 'active' ? 'Your survey is live and ready to collect responses.' : 'Publish your survey first to enable distribution.'}
            </div>
            {[
              { title: 'Shareable link', meta: `surveyai.app/s/${id.slice(0, 8)}`, action: 'Copy Link', onClick: () => { navigator.clipboard.writeText(`https://surveyai.app/s/${id.slice(0, 8)}`); alert('Link copied!') } },
              { title: 'Embed on your site', meta: `<iframe src="surveyai.app/embed/${id.slice(0, 8)}">`, action: 'Copy Code', onClick: () => { navigator.clipboard.writeText(`<iframe src="https://surveyai.app/embed/${id.slice(0, 8)}" width="100%" height="600"></iframe>`); alert('Embed code copied!') } },
              { title: 'Email invite', meta: 'Send to a list via your provider', action: 'Send Invite', onClick: () => alert('Email invite flow — coming in Phase 3.') },
            ].map(row => (
              <div key={row.title} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{row.title}</div>
                  <div style={{ color: 'var(--grey)', fontSize: 12, marginTop: 2, fontFamily: 'monospace' }}>{row.meta}</div>
                </div>
                <button className="btn secondary" onClick={row.onClick} disabled={survey.status !== 'active'}>{row.action}</button>
              </div>
            ))}
            {survey.status !== 'active' && (
              <button className="btn" onClick={handlePublish} style={{ marginTop: 8 }}>Publish Survey to Enable Sharing</button>
            )}
          </div>
        )}

        {/* ── INSIGHTS TAB ── */}
        {activeTab === 'insights' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>
              Insights <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: 'var(--ai)', background: 'var(--ai-bg)', padding: '2px 8px', borderRadius: 6, marginLeft: 8, verticalAlign: 'middle' }}>AI</span>
            </h2>
            <div style={{ fontSize: 12.5, color: 'var(--grey)', marginBottom: 18 }}>Live response analytics and AI-generated insights.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
              <StatTile color="blue" num={String(results?.total ?? 0)} label="Total Responses" />
              <StatTile color="green" num={results?.total ? `${Math.round((results.complete / results.total) * 100)}%` : '0%'} label="Completion Rate" />
              <StatTile color="purple" num={String(results?.partial ?? 0)} label="Partial Responses" />
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
              <button className="btn" onClick={() => router.push(`/surveys/${id}/analysis`)}>
                Open AI Analysis Dashboard →
              </button>
              <button className="btn secondary" onClick={() => router.push(`/surveys/${id}/respond`)}>
                Preview as Respondent
              </button>
            </div>
          </div>
        )}


      </div>
    </div>
  )
}

// TopBar imported from components/TopBar

function StatTile({ color, num, label }: { color: 'blue' | 'green' | 'purple'; num: string; label: string }) {
  const colors = {
    blue: { bg: '#EEF2FF', num: 'var(--accent-dark)', label: 'var(--accent-dark)' },
    green: { bg: 'var(--green-bg)', num: 'var(--green)', label: 'var(--green)' },
    purple: { bg: 'var(--ai-bg)', num: 'var(--ai)', label: 'var(--ai)' },
  }
  const c = colors[color]
  return (
    <div style={{ background: c.bg, borderRadius: 10, padding: 18 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: c.num }}>{num}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 4, color: c.label }}>{label}</div>
    </div>
  )
}
