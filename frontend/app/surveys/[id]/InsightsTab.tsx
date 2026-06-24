'use client'
import { useState, useEffect, useCallback } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Question { id: string; title: string; type: string; position: number }
interface ResponseRow {
  id: string
  status: 'complete' | 'partial' | 'disqualified'
  started_at: string
  completed_at: string | null
  answers: Record<string, string>
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  complete:     { bg: 'var(--green-bg)',  color: 'var(--green)',  label: 'Complete' },
  partial:      { bg: 'var(--amber-bg)',  color: 'var(--amber)',  label: 'Partial' },
  disqualified: { bg: 'var(--red-bg)',    color: 'var(--red)',    label: 'Discarded' },
}

const CHOICE_TYPES = ['single_choice', 'multi_select', 'yes_no', 'ranking', 'dropdown']
const SCALE_TYPES  = ['rating', 'nps', 'likert_matrix']
const TEXT_TYPES   = ['short_text', 'long_text', 'date_time', 'contact', 'demographic']

// ─── Timeline chart ───────────────────────────────────────────────────────────
function TimelineChart({ responses }: { responses: ResponseRow[] }) {
  if (!responses.length) return <div style={{ color: 'var(--grey)', fontSize: 13, padding: '20px 0' }}>No responses yet.</div>

  // Bucket by day
  const buckets: Record<string, number> = {}
  responses.forEach(r => {
    const day = r.started_at?.slice(0, 10) ?? ''
    if (day) buckets[day] = (buckets[day] ?? 0) + 1
  })
  const days = Object.keys(buckets).sort()
  const max = Math.max(...Object.values(buckets), 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, marginTop: 8 }}>
      {days.map(day => (
        <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', minWidth: 24 }}>
          <div style={{ fontSize: 10, color: 'var(--grey)', marginBottom: 3 }}>{buckets[day]}</div>
          <div style={{
            width: '100%', maxWidth: 32, background: 'var(--accent)', borderRadius: '4px 4px 0 0',
            height: `${Math.round((buckets[day] / max) * 80)}px`,
          }} />
          <div style={{ fontSize: 9, color: 'var(--grey)', marginTop: 4, transform: 'rotate(-30deg)', whiteSpace: 'nowrap' }}>
            {day.slice(5)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Per-question breakdown ───────────────────────────────────────────────────
function QuestionBreakdown({ question, responses }: { question: Question; responses: ResponseRow[] }) {
  const answers = responses
    .filter(r => r.status !== 'disqualified')
    .map(r => r.answers[question.id])
    .filter(Boolean)

  if (!answers.length) {
    return <div style={{ fontSize: 12, color: 'var(--grey)', padding: '8px 0' }}>No answers yet.</div>
  }

  if (CHOICE_TYPES.includes(question.type)) {
    const counts: Record<string, number> = {}
    answers.forEach(a => {
      a.split(', ').forEach(v => { counts[v] = (counts[v] ?? 0) + 1 })
    })
    const total = answers.length
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {sorted.map(([opt, cnt]) => (
          <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <div style={{ width: 130, flexShrink: 0, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt}</div>
            <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 5, height: 10, overflow: 'hidden' }}>
              <div style={{ width: `${Math.round((cnt / total) * 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 5, transition: 'width .3s' }} />
            </div>
            <div style={{ width: 70, textAlign: 'right', fontSize: 12, color: 'var(--grey)' }}>{Math.round((cnt / total) * 100)}% ({cnt})</div>
          </div>
        ))}
      </div>
    )
  }

  if (SCALE_TYPES.includes(question.type)) {
    const nums = answers.map(Number).filter(n => !isNaN(n))
    if (!nums.length) return null
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length

    // Distribution
    const maxVal = question.type === 'nps' ? 10 : 5
    const dist: Record<number, number> = {}
    for (let i = 0; i <= maxVal; i++) dist[i] = 0
    nums.forEach(n => { if (dist[n] !== undefined) dist[n]++ })
    const maxCount = Math.max(...Object.values(dist), 1)

    // NPS score
    let npsScore: number | null = null
    if (question.type === 'nps') {
      const promoters = nums.filter(n => n >= 9).length
      const detractors = nums.filter(n => n <= 6).length
      npsScore = Math.round(((promoters - detractors) / nums.length) * 100)
    }

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>
            {question.type === 'nps' ? (npsScore! >= 0 ? '+' : '') + npsScore : avg.toFixed(1)}
          </span>
          <span style={{ fontSize: 13, color: 'var(--grey)' }}>
            {question.type === 'nps' ? 'NPS score' : `avg out of ${maxVal}`} · {nums.length} response{nums.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 50 }}>
          {Object.entries(dist).map(([val, cnt]) => (
            <div key={val} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div style={{
                width: '100%', borderRadius: '3px 3px 0 0',
                height: `${maxCount > 0 ? Math.round((cnt / maxCount) * 44) : 0}px`,
                background: question.type === 'nps'
                  ? (Number(val) >= 9 ? 'var(--green)' : Number(val) <= 6 ? 'var(--red)' : 'var(--amber)')
                  : 'var(--accent)',
              }} />
              <div style={{ fontSize: 9, color: 'var(--grey)', marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Text responses
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {answers.slice(0, 8).map((a, i) => (
        <div key={i} style={{ fontSize: 13, padding: '7px 10px', background: 'var(--bg)', borderRadius: 6, color: 'var(--text)', lineHeight: 1.4 }}>
          "{a}"
        </div>
      ))}
      {answers.length > 8 && <div style={{ fontSize: 12, color: 'var(--grey)' }}>+{answers.length - 8} more responses in Export CSV</div>}
    </div>
  )
}

// ─── Main InsightsTab ─────────────────────────────────────────────────────────
export default function InsightsTab({ surveyId }: { surveyId: string }) {
  const [subTab, setSubTab] = useState<'overview' | 'responses' | 'breakdown'>('overview')
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<ResponseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`${API}/surveys/${surveyId}/responses-full`)
    if (res.ok) {
      const data = await res.json()
      setQuestions(data.questions ?? [])
      setResponses(data.responses ?? [])
    }
    setLoading(false)
  }, [surveyId])

  useEffect(() => { load() }, [load])

  const updateStatus = async (ids: string[], status: string) => {
    setActing(true)
    await Promise.all(ids.map(id =>
      fetch(`${API}/surveys/${surveyId}/responses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    ))
    setSelected(new Set())
    await load()
    setActing(false)
  }

  const deleteResponses = async (ids: string[]) => {
    if (!confirm(`Permanently delete ${ids.length} response${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return
    setActing(true)
    await Promise.all(ids.map(id =>
      fetch(`${API}/surveys/${surveyId}/responses/${id}`, { method: 'DELETE' })
    ))
    setSelected(new Set())
    await load()
    setActing(false)
  }

  const filtered = statusFilter === 'all' ? responses : responses.filter(r => r.status === statusFilter)
  const total = responses.length
  const complete = responses.filter(r => r.status === 'complete').length
  const partial = responses.filter(r => r.status === 'partial').length
  const discarded = responses.filter(r => r.status === 'disqualified').length
  const completionRate = total > 0 ? Math.round((complete / total) * 100) : 0

  const SUB_TABS = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'responses' as const, label: `Responses (${total})` },
    { id: 'breakdown' as const, label: 'Breakdown' },
  ]

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Insights</h2>
        <a
          href={`${API}/surveys/${surveyId}/export.csv`}
          download
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            borderRadius: 8, border: '1px solid var(--border)', background: 'white',
            color: total === 0 ? 'var(--grey)' : 'var(--text)', fontSize: 12, fontWeight: 600,
            textDecoration: 'none', opacity: total === 0 ? 0.4 : 1,
            pointerEvents: total === 0 ? 'none' : 'auto',
          }}
        >
          ↓ Export CSV
        </a>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20, gap: 0 }}>
        {SUB_TABS.map(t => (
          <div key={t.id} onClick={() => setSubTab(t.id)} style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            color: subTab === t.id ? 'var(--accent)' : 'var(--grey)',
            borderBottom: `2px solid ${subTab === t.id ? 'var(--accent)' : 'transparent'}`,
            marginBottom: -1,
          }}>{t.label}</div>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--grey)', fontSize: 13, padding: '24px 0' }}>Loading…</div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {subTab === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Total Responses', value: String(total), color: 'var(--accent-dark)', bg: '#EEF2FF' },
                  { label: 'Completion Rate', value: `${completionRate}%`, color: 'var(--green)', bg: 'var(--green-bg)' },
                  { label: 'Partial', value: String(partial), color: 'var(--amber)', bg: 'var(--amber-bg)' },
                  { label: 'Discarded', value: String(discarded), color: 'var(--red)', bg: 'var(--red-bg)' },
                ].map(t => (
                  <div key={t.label} style={{ background: t.bg, borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: t.color }}>{t.value}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.color, marginTop: 3 }}>{t.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 600 }}>Daily response volume</div>
              <TimelineChart responses={responses} />
            </div>
          )}

          {/* ── RESPONSES TABLE ── */}
          {subTab === 'responses' && (
            <div>
              {/* Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                {/* Status filter */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {['all', 'complete', 'partial', 'disqualified'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)} style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                      background: statusFilter === s ? 'var(--accent)' : 'var(--bg)',
                      color: statusFilter === s ? 'white' : 'var(--grey)',
                    }}>
                      {s === 'all' ? `All (${total})` : s === 'complete' ? `Complete (${complete})` : s === 'partial' ? `Partial (${partial})` : `Discarded (${discarded})`}
                    </button>
                  ))}
                </div>

                {/* Bulk actions */}
                {selected.size > 0 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--grey)' }}>{selected.size} selected</span>
                    <button onClick={() => updateStatus([...selected], 'disqualified')} disabled={acting} className="btn ghost" style={{ fontSize: 12, padding: '5px 12px' }}>
                      Discard
                    </button>
                    <button onClick={() => updateStatus([...selected], 'complete')} disabled={acting} className="btn ghost" style={{ fontSize: 12, padding: '5px 12px' }}>
                      Restore
                    </button>
                    <button onClick={() => deleteResponses([...selected])} disabled={acting} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--red)', background: 'white', color: 'var(--red)', cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--grey)', padding: '32px 0', fontSize: 13 }}>
                  No {statusFilter !== 'all' ? statusFilter : ''} responses yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', width: 32 }}>
                          <input type="checkbox"
                            checked={selected.size === filtered.length && filtered.length > 0}
                            onChange={e => setSelected(e.target.checked ? new Set(filtered.map(r => r.id)) : new Set())}
                          />
                        </th>
                        <th style={{ padding: '8px 6px', textAlign: 'left', color: 'var(--grey)', fontWeight: 600, whiteSpace: 'nowrap' }}>#</th>
                        <th style={{ padding: '8px 6px', textAlign: 'left', color: 'var(--grey)', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '8px 6px', textAlign: 'left', color: 'var(--grey)', fontWeight: 600, whiteSpace: 'nowrap' }}>Started</th>
                        {questions.slice(0, 5).map((q, i) => (
                          <th key={q.id} style={{ padding: '8px 6px', textAlign: 'left', color: 'var(--grey)', fontWeight: 600, maxWidth: 120 }}>
                            Q{i + 1}: {q.title.slice(0, 25)}{q.title.length > 25 ? '…' : ''}
                          </th>
                        ))}
                        {questions.length > 5 && (
                          <th style={{ padding: '8px 6px', color: 'var(--grey)', fontWeight: 600 }}>+{questions.length - 5} more</th>
                        )}
                        <th style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--grey)', fontWeight: 600 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => {
                        const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.partial
                        const isSelected = selected.has(r.id)
                        return (
                          <tr key={r.id} style={{
                            borderBottom: '1px solid var(--border)',
                            background: isSelected ? '#F5F7FF' : r.status === 'disqualified' ? '#FDF5F5' : 'transparent',
                            opacity: r.status === 'disqualified' ? 0.6 : 1,
                          }}>
                            <td style={{ padding: '8px 10px' }}>
                              <input type="checkbox" checked={isSelected}
                                onChange={e => {
                                  const next = new Set(selected)
                                  e.target.checked ? next.add(r.id) : next.delete(r.id)
                                  setSelected(next)
                                }}
                              />
                            </td>
                            <td style={{ padding: '8px 6px', color: 'var(--grey)' }}>{i + 1}</td>
                            <td style={{ padding: '8px 6px' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color }}>
                                {s.label}
                              </span>
                            </td>
                            <td style={{ padding: '8px 6px', color: 'var(--grey)', whiteSpace: 'nowrap' }}>
                              {r.started_at ? r.started_at.slice(0, 16).replace('T', ' ') : '—'}
                            </td>
                            {questions.slice(0, 5).map(q => (
                              <td key={q.id} style={{ padding: '8px 6px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                                {r.answers[q.id] ?? <span style={{ color: 'var(--grey)' }}>—</span>}
                              </td>
                            ))}
                            {questions.length > 5 && <td />}
                            <td style={{ padding: '8px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {r.status === 'disqualified' ? (
                                <button onClick={() => updateStatus([r.id], 'complete')} disabled={acting}
                                  style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'white', color: 'var(--green)', cursor: 'pointer', marginRight: 4 }}>
                                  Restore
                                </button>
                              ) : (
                                <button onClick={() => updateStatus([r.id], 'disqualified')} disabled={acting}
                                  style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'white', color: 'var(--amber)', cursor: 'pointer', marginRight: 4 }}>
                                  Discard
                                </button>
                              )}
                              <button onClick={() => deleteResponses([r.id])} disabled={acting}
                                style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'white', color: 'var(--red)', cursor: 'pointer' }}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── BREAKDOWN ── */}
          {subTab === 'breakdown' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {questions.length === 0 ? (
                <div style={{ color: 'var(--grey)', fontSize: 13 }}>No questions in this survey yet.</div>
              ) : questions.map((q, i) => (
                <div key={q.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--grey)', marginRight: 8 }}>Q{i + 1}</span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{q.title}</span>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--accent)', background: '#EEF2FF', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap', marginLeft: 10, flexShrink: 0 }}>
                      {q.type.replace('_', ' ')}
                    </span>
                  </div>
                  <QuestionBreakdown question={q} responses={responses} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
