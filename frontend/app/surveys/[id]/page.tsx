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

interface Question extends QuestionData {
  logicOn?: boolean
}

interface Survey {
  id: string
  title: string
  status: string
  mode: string
  settings: Record<string, unknown>
}

// QUESTION_TYPES and TYPE_LABEL imported from QuestionEditor

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
  const [republished, setRepublished] = useState(false)
  const [editingQId, setEditingQId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [branding, setBranding] = useState({ brand_color: '#2E5BFF', logo_url: null as string | null, org_name: 'SurveyAI' })
  const [results, setResults] = useState<{ total: number; complete: number; partial: number } | null>(null)

  // Build tab state

  // Config tab state
  const [cfgRequire, setCfgRequire] = useState(false)
  const [cfgNoDupes, setCfgNoDupes] = useState(true)
  const [cfgRandomize, setCfgRandomize] = useState(false)
  const [closeDate, setCloseDate] = useState('')
  const [responseLimit, setResponseLimit] = useState('')

  // Logic tab state (managed by LogicTab component)

  useEffect(() => {
    getSurvey(id).then(data => {
      setSurvey(data)
      setQuestions(
        (data.questions || []).map((q: Question & { question_options?: Array<{label: string}> }) => ({
          ...q,
          question_options: q.question_options,
          logicOn: false,
        }))
      )
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
    const payload = {
      type,
      title: '',   // empty — user will fill in the editor
      required: false,
      position: questions.length,
    }
    const q = await createQuestion(id, payload)
    setQuestions(prev => [...prev, { ...q, logicOn: false }])
    setEditingQId(q.id)  // open editor immediately
    setActiveTab('build')
  }



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
    <>
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
              Survey ID: SRV-{id.slice(0, 8).toUpperCase()} ·{' '}
              <span style={{ color: survey.status === 'active' ? 'var(--green)' : 'var(--amber)', fontWeight: 600 }}>
                {survey.status === 'active' ? '● Live' : '● Draft'}
              </span>
              {' '}· {survey.mode}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {republished && (
              <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>✓ Changes live</span>
            )}
            <button className="btn ghost" onClick={saveDraft} disabled={saving}>
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button className="btn ghost" onClick={() => setShowPreview(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              👁 Preview
            </button>
            {survey.status === 'active' ? (
              <button className="btn" onClick={handleRepublish} disabled={saving}>
                {saving ? 'Publishing…' : '↑ Republish'}
              </button>
            ) : (
              <button className="btn" onClick={handlePublish}>
                Publish Survey
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="builder-tabs" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', margin: '18px 0 22px', flexWrap: 'wrap' }}>
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
          <div style={{ display: 'flex', gap: 0, minHeight: 600 }}>

            {/* LEFT: Question list + type picker */}
            <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid var(--border)', paddingRight: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Add question — compact grid */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', marginBottom: 8 }}>Add question</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {QUESTION_TYPES.map(qt => (
                    <div key={qt.type} onClick={() => addQuestion(qt.type)}
                      style={{ fontSize: 12, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', color: 'var(--text)', border: '1px solid transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}>
                      {qt.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Question list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', marginBottom: 2 }}>
                  Questions ({questions.length})
                </div>
                {questions.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--grey)', padding: '16px 0', textAlign: 'center' }}>No questions yet</div>
                ) : questions.map((q, i) => {
                  const isSelected = editingQId === q.id
                  const typeLabel = TYPE_LABEL[q.type] ?? q.type
                  return (
                    <div key={q.id} onClick={() => setEditingQId(isSelected ? null : q.id)} style={{
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      background: isSelected ? '#EEF2FF' : 'var(--card)',
                      border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--grey)', width: 22, flexShrink: 0, fontWeight: 600 }}>Q{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: q.title ? 'var(--text)' : 'var(--grey)' }}>
                            {q.title || 'Untitled question'}
                          </div>
                          <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
                            <span style={{ fontSize: 10, color: isSelected ? 'var(--accent)' : 'var(--grey)', background: isSelected ? 'white' : 'var(--bg)', padding: '1px 6px', borderRadius: 4 }}>{typeLabel}</span>
                            {q.required && <span style={{ fontSize: 10, color: 'var(--red)', background: 'var(--red-bg)', padding: '1px 6px', borderRadius: 4 }}>Req</span>}
                          </div>
                        </div>
                        <button onClick={e => { e.stopPropagation(); fetch(`${API}/surveys/${id}/questions/${q.id}`, { method: 'DELETE' }); setQuestions(prev => prev.filter(pq => pq.id !== q.id)); if (editingQId === q.id) setEditingQId(null) }}
                          style={{ fontSize: 14, color: 'var(--grey)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, flexShrink: 0 }}
                          title="Remove question">×</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* RIGHT: Properties panel */}
            <div style={{ flex: 1, paddingLeft: 20, minWidth: 0 }}>
              {editingQId ? (
                <QuestionEditor
                  key={editingQId}
                  surveyId={id}
                  question={questions.find(q => q.id === editingQId)!}
                  onSave={saved => {
                    setQuestions(prev => prev.map(q => q.id === saved.id ? { ...saved, logicOn: q.logicOn } : q))
                  }}
                  onDelete={qid => {
                    setQuestions(prev => prev.filter(q => q.id !== qid))
                    setEditingQId(null)
                  }}
                  onCancel={() => {
                    const q = questions.find(q => q.id === editingQId)
                    if (q && !q.title.trim()) {
                      fetch(`${API}/surveys/${id}/questions/${q.id}`, { method: 'DELETE' })
                      setQuestions(prev => prev.filter(pq => pq.id !== q.id))
                    }
                    setEditingQId(null)
                  }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--grey)', textAlign: 'center', padding: '48px 24px' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✎</div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Select a question to edit</div>
                  <div style={{ fontSize: 13 }}>Click any question on the left, or add a new one using the type picker.</div>
                  <button className="btn secondary" style={{ marginTop: 20 }} onClick={() => setShowPreview(true)}>
                    👁 Preview survey
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── LOGIC TAB ── */}
        {activeTab === 'logic' && (
          <LogicTab surveyId={id} questions={questions} />
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
          <ShareTab surveyId={id} surveyTitle={survey.title} status={survey.status} onPublish={handlePublish} />
        )}

        {/* ── INSIGHTS TAB ── */}
        {activeTab === 'insights' && <InsightsTab surveyId={id} />}

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

// TopBar imported from components/TopBar

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
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const isLive = status === 'active'

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
      <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>Share & Distribute</h2>
      <div style={{ fontSize: 12.5, color: 'var(--grey)', marginBottom: 20 }}>
        {isLive ? 'Your survey is live — share the link below to start collecting responses.' : 'Publish your survey first to enable distribution.'}
      </div>

      {!isLive && (
        <button className="btn" onClick={onPublish} style={{ marginBottom: 20 }}>
          Publish Survey to Enable Sharing
        </button>
      )}

      {/* Shareable link */}
      <Section title="🔗 Shareable link" desc="Send this URL directly to respondents.">
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            readOnly
            value={isLive ? respondUrl : '— publish first —'}
            style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'monospace', background: isLive ? 'white' : 'var(--bg)', color: isLive ? 'var(--text)' : 'var(--grey)', outline: 'none' }}
            onFocus={e => e.target.select()}
          />
          <button className="btn secondary" disabled={!isLive} onClick={() => copy(respondUrl, 'link')} style={{ flexShrink: 0 }}>
            {copied === 'link' ? '✓ Copied!' : 'Copy Link'}
          </button>
          {isLive && (
            <a href={respondUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', color: 'var(--text)', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Open ↗
            </a>
          )}
        </div>
      </Section>

      {/* Embed */}
      <Section title="</> Embed on your site" desc="Paste this into any webpage to embed the survey inline.">
        <textarea
          readOnly
          value={isLive ? embedCode : '— publish first —'}
          rows={3}
          style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', background: isLive ? 'white' : 'var(--bg)', color: isLive ? 'var(--text)' : 'var(--grey)', outline: 'none' }}
          onFocus={e => e.target.select()}
        />
        <button className="btn secondary" disabled={!isLive} onClick={() => copy(embedCode, 'embed')} style={{ marginTop: 8 }}>
          {copied === 'embed' ? '✓ Copied!' : 'Copy Embed Code'}
        </button>
      </Section>

      {/* Email invite */}
      <Section title="✉️ Email invite" desc="Opens your email client with the survey link pre-filled.">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a
            href={isLive ? mailtoLink : '#'}
            style={{
              display: 'inline-flex', alignItems: 'center', padding: '9px 18px', borderRadius: 8,
              border: '1px solid var(--accent)', color: isLive ? 'var(--accent)' : 'var(--grey)',
              fontWeight: 600, fontSize: 14, textDecoration: 'none',
              background: 'white', pointerEvents: isLive ? 'auto' : 'none', opacity: isLive ? 1 : 0.5,
            }}
          >
            Open Email Client
          </a>
          <span style={{ fontSize: 12, color: 'var(--grey)' }}>or copy the link above and paste into any email tool</span>
        </div>
      </Section>

      {/* QR Code */}
      <Section title="📱 QR Code" desc="Download or screenshot for print materials, slides, or events.">
        {isLive ? (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(respondUrl)}`}
              alt="Survey QR Code"
              width={140}
              height={140}
              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 6, background: 'white' }}
            />
            <div>
              <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 10 }}>Right-click the QR code to save it, or screenshot it for use in presentations and print materials.</div>
              <div style={{ fontSize: 12, color: 'var(--grey)', fontFamily: 'monospace', wordBreak: 'break-all', background: 'var(--bg)', padding: '6px 10px', borderRadius: 6 }}>{respondUrl}</div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--grey)' }}>Publish the survey to generate a QR code.</div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 20 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 12 }}>{desc}</div>
      {children}
    </div>
  )
}

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
