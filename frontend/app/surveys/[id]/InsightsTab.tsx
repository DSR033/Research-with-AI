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

// ── helpers ──────────────────────────────────────────────────────────────────
function avgCompletionTime(responses: ResponseRow[]): string {
  const times = responses
    .filter(r => r.status === 'complete' && r.started_at && r.completed_at)
    .map(r => (new Date(r.completed_at!).getTime() - new Date(r.started_at).getTime()) / 1000)
  if (!times.length) return '—'
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  if (avg < 60) return `${Math.round(avg)}s`
  return `${Math.round(avg / 60)}m ${Math.round(avg % 60)}s`
}

function weekCount(responses: ResponseRow[], weeksAgo: number): number {
  const now = Date.now()
  const start = now - (weeksAgo + 1) * 7 * 86400000
  const end   = now - weeksAgo * 7 * 86400000
  return responses.filter(r => {
    const t = new Date(r.started_at).getTime()
    return t >= start && t < end
  }).length
}

// ── Daily timeline ────────────────────────────────────────────────────────────
function TimelineChart({ responses }: { responses: ResponseRow[] }) {
  if (!responses.length) return <div style={{ color: 'var(--grey)', fontSize: 13, padding: '20px 0' }}>No responses yet.</div>
  const buckets: Record<string, number> = {}
  responses.forEach(r => {
    const day = r.started_at?.slice(0, 10) ?? ''
    if (day) buckets[day] = (buckets[day] ?? 0) + 1
  })
  const days = Object.keys(buckets).sort()
  const max = Math.max(...Object.values(buckets), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 90, marginTop: 8, paddingBottom: 18 }}>
      {days.map(day => (
        <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', minWidth: 20 }}>
          <div style={{ fontSize: 9, color: 'var(--grey)', marginBottom: 2 }}>{buckets[day]}</div>
          <div style={{ width: '80%', maxWidth: 28, background: 'var(--accent)', borderRadius: '3px 3px 0 0', height: `${Math.round((buckets[day] / max) * 64)}px` }} />
          <div style={{ fontSize: 8, color: 'var(--grey)', marginTop: 3, transform: 'rotate(-35deg)', whiteSpace: 'nowrap' }}>{day.slice(5)}</div>
        </div>
      ))}
    </div>
  )
}

// ── Hourly distribution ────────────────────────────────────────────────────────
function HourlyChart({ responses }: { responses: ResponseRow[] }) {
  if (!responses.length) return null
  const hours = Array(24).fill(0)
  responses.forEach(r => { if (r.started_at) hours[new Date(r.started_at).getHours()]++ })
  const max = Math.max(...hours, 1)
  const peak = hours.indexOf(Math.max(...hours))
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60, marginBottom: 4 }}>
        {hours.map((cnt, h) => (
          <div key={h} title={`${h}:00 — ${cnt} responses`} style={{
            flex: 1, background: h === peak ? 'var(--accent)' : '#C7D3F8',
            borderRadius: '2px 2px 0 0', height: `${Math.round((cnt / max) * 56)}px`,
            cursor: 'default',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--grey)' }}>
        {['12am','6am','12pm','6pm','11pm'].map(l => <span key={l}>{l}</span>)}
      </div>
      <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 6 }}>
        Peak hour: <strong style={{ color: 'var(--accent)' }}>{peak}:00–{peak + 1}:00</strong> · {hours[peak]} response{hours[peak] !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

// ── Completion funnel ─────────────────────────────────────────────────────────
function CompletionFunnel({ questions, responses }: { questions: Question[]; responses: ResponseRow[] }) {
  const active = responses.filter(r => r.status !== 'disqualified')
  if (!active.length || !questions.length) return <div style={{ color: 'var(--grey)', fontSize: 13 }}>No data yet.</div>
  const total = active.length
  const counts = questions.map(q => active.filter(r => r.answers[q.id]).length)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {questions.map((q, i) => {
        const pct = Math.round((counts[i] / total) * 100)
        const dropFromPrev = i > 0 ? counts[i - 1] - counts[i] : 0
        return (
          <div key={q.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
              <div style={{ fontSize: 11, color: 'var(--grey)', width: 24, flexShrink: 0 }}>Q{i + 1}</div>
              <div style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)', width: 36, textAlign: 'right' }}>{pct}%</div>
              <div style={{ fontSize: 11, color: 'var(--grey)', width: 28, textAlign: 'right' }}>{counts[i]}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, flexShrink: 0 }} />
              <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)', borderRadius: 4, transition: 'width .4s' }} />
              </div>
              {dropFromPrev > 0 && (
                <div style={{ fontSize: 10, color: 'var(--red)', width: 60, flexShrink: 0 }}>−{dropFromPrev} dropped</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Per-question breakdown ─────────────────────────────────────────────────────
function QuestionBreakdown({ question, responses }: { question: Question; responses: ResponseRow[] }) {
  const active = responses.filter(r => r.status !== 'disqualified')
  const answered = active.filter(r => r.answers[question.id])
  const skipped = active.length - answered.length
  const skipRate = active.length > 0 ? Math.round((skipped / active.length) * 100) : 0
  const answers = answered.map(r => r.answers[question.id])

  return (
    <div>
      {/* Skip rate badge */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12 }}>
        <span style={{ color: 'var(--grey)' }}>{answered.length} answered</span>
        {skipped > 0 && (
          <span style={{ color: 'var(--amber)', fontWeight: 600 }}>⚠ {skipRate}% skipped ({skipped})</span>
        )}
      </div>

      {answers.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--grey)' }}>No answers yet.</div>
      ) : CHOICE_TYPES.includes(question.type) ? (
        <ChoiceBreakdown answers={answers} />
      ) : question.type === 'nps' ? (
        <NpsBreakdown answers={answers} />
      ) : question.type === 'rating' ? (
        <RatingBreakdown answers={answers} />
      ) : (
        <TextBreakdown answers={answers} />
      )}
    </div>
  )
}

function ChoiceBreakdown({ answers }: { answers: string[] }) {
  const counts: Record<string, number> = {}
  answers.forEach(a => a.split(', ').forEach(v => { counts[v] = (counts[v] ?? 0) + 1 }))
  const total = answers.length
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const topPct = sorted.length > 0 ? Math.round((sorted[0][1] / total) * 100) : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sorted.map(([opt, cnt], i) => {
        const pct = Math.round((cnt / total) * 100)
        return (
          <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
            <div style={{ width: 140, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: i === 0 ? 600 : 400 }}>{opt}</div>
            <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 5, height: 10, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: i === 0 ? 'var(--accent)' : '#C7D3F8', borderRadius: 5, transition: 'width .3s' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--grey)', width: 80, textAlign: 'right' }}>{pct}% · {cnt}</div>
          </div>
        )
      })}
      <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>
        Most selected: <strong>"{sorted[0]?.[0]}"</strong> at {topPct}%
      </div>
    </div>
  )
}

function NpsBreakdown({ answers }: { answers: string[] }) {
  const nums = answers.map(Number).filter(n => !isNaN(n))
  const promoters = nums.filter(n => n >= 9)
  const passives  = nums.filter(n => n >= 7 && n <= 8)
  const detractors = nums.filter(n => n <= 6)
  const score = Math.round(((promoters.length - detractors.length) / nums.length) * 100)
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length

  const dist: Record<number, number> = {}
  for (let i = 0; i <= 10; i++) dist[i] = 0
  nums.forEach(n => { if (dist[n] !== undefined) dist[n]++ })
  const maxCount = Math.max(...Object.values(dist), 1)

  return (
    <div>
      {/* Score headline */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 700, color: score >= 50 ? 'var(--green)' : score >= 0 ? 'var(--amber)' : 'var(--red)' }}>
            {score >= 0 ? '+' : ''}{score}
          </div>
          <div style={{ fontSize: 11, color: 'var(--grey)' }}>NPS Score</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{avg.toFixed(1)}</div>
          <div style={{ fontSize: 11, color: 'var(--grey)' }}>Avg. Score</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>{promoters.length}</div>
          <div style={{ fontSize: 11, color: 'var(--grey)' }}>Promoters (9–10)</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--amber)' }}>{passives.length}</div>
          <div style={{ fontSize: 11, color: 'var(--grey)' }}>Passives (7–8)</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--red)' }}>{detractors.length}</div>
          <div style={{ fontSize: 11, color: 'var(--grey)' }}>Detractors (0–6)</div>
        </div>
      </div>

      {/* Stacked bar */}
      <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ width: `${Math.round((detractors.length / nums.length) * 100)}%`, background: 'var(--red)' }} />
        <div style={{ width: `${Math.round((passives.length / nums.length) * 100)}%`, background: 'var(--amber)' }} />
        <div style={{ width: `${Math.round((promoters.length / nums.length) * 100)}%`, background: 'var(--green)' }} />
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--grey)', marginBottom: 14 }}>
        <span>🔴 Detractors {Math.round((detractors.length / nums.length) * 100)}%</span>
        <span>🟡 Passives {Math.round((passives.length / nums.length) * 100)}%</span>
        <span>🟢 Promoters {Math.round((promoters.length / nums.length) * 100)}%</span>
      </div>

      {/* Distribution */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 52 }}>
        {Object.entries(dist).map(([val, cnt]) => (
          <div key={val} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{
              width: '100%', borderRadius: '3px 3px 0 0',
              height: `${maxCount > 0 ? Math.round((cnt / maxCount) * 44) : 0}px`,
              background: Number(val) >= 9 ? 'var(--green)' : Number(val) <= 6 ? 'var(--red)' : 'var(--amber)',
            }} />
            <div style={{ fontSize: 9, color: 'var(--grey)', marginTop: 2 }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RatingBreakdown({ answers }: { answers: string[] }) {
  const nums = answers.map(Number).filter(n => !isNaN(n) && n >= 1 && n <= 5)
  if (!nums.length) return null
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length
  const dist = [1, 2, 3, 4, 5].map(v => nums.filter(n => n === v).length)
  const maxCount = Math.max(...dist, 1)

  return (
    <div>
      <div style={{ display: 'flex', gap: 20, marginBottom: 14, alignItems: 'baseline' }}>
        <div>
          <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)' }}>{avg.toFixed(1)}</span>
          <span style={{ fontSize: 13, color: 'var(--grey)', marginLeft: 6 }}>/ 5</span>
        </div>
        <div style={{ fontSize: 18, letterSpacing: 2 }}>
          {[1,2,3,4,5].map(s => (
            <span key={s} style={{ color: s <= Math.round(avg) ? '#F0B429' : '#D9DEE5' }}>★</span>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--grey)' }}>{nums.length} responses</div>
      </div>
      {[5,4,3,2,1].map((star, i) => {
        const cnt = dist[star - 1]
        const pct = Math.round((cnt / nums.length) * 100)
        return (
          <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 12 }}>
            <span style={{ width: 16, color: '#F0B429' }}>{star}★</span>
            <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: '#F0B429', borderRadius: 4 }} />
            </div>
            <span style={{ width: 60, textAlign: 'right', color: 'var(--grey)' }}>{pct}% ({cnt})</span>
          </div>
        )
      })}
    </div>
  )
}

function TextBreakdown({ answers }: { answers: string[] }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? answers : answers.slice(0, 6)
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.map((a, i) => (
          <div key={i} style={{ fontSize: 13, padding: '8px 11px', background: 'var(--bg)', borderRadius: 7, color: 'var(--text)', lineHeight: 1.45, borderLeft: '3px solid var(--border)' }}>
            {a}
          </div>
        ))}
      </div>
      {answers.length > 6 && (
        <button onClick={() => setShowAll(v => !v)} style={{ marginTop: 10, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          {showAll ? '↑ Show less' : `↓ Show all ${answers.length} responses`}
        </button>
      )}
    </div>
  )
}

// ── Main InsightsTab ───────────────────────────────────────────────────────────
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
  const thisWeek = weekCount(responses, 0)
  const lastWeek = weekCount(responses, 1)
  const weekDelta = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null

  const SUB_TABS = [
    { id: 'overview' as const,  label: 'Overview' },
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
        >↓ Export CSV</a>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Stat tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                  { label: 'Total Responses', value: String(total), sub: weekDelta !== null ? `${weekDelta >= 0 ? '▲' : '▼'} ${Math.abs(weekDelta)}% vs last week` : 'No data yet', color: 'var(--accent-dark)', bg: '#EEF2FF' },
                  { label: 'Completion Rate', value: `${completionRate}%`, sub: `${complete} complete · ${partial} partial`, color: 'var(--green)', bg: 'var(--green-bg)' },
                  { label: 'Avg. Completion Time', value: avgCompletionTime(responses), sub: 'For complete responses', color: 'var(--ai)', bg: 'var(--ai-bg)' },
                  { label: 'Discarded', value: String(discarded), sub: discarded > 0 ? `${Math.round((discarded / total) * 100)}% of total` : 'None discarded', color: 'var(--red)', bg: 'var(--red-bg)' },
                ].map(t => (
                  <div key={t.label} style={{ background: t.bg, borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: t.color }}>{t.value}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.color, marginTop: 2 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: t.color, opacity: 0.7, marginTop: 3 }}>{t.sub}</div>
                  </div>
                ))}
              </div>

              {/* Week comparison */}
              {(thisWeek > 0 || lastWeek > 0) && (
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 24, fontSize: 13 }}>
                  <div><span style={{ color: 'var(--grey)' }}>This week:</span> <strong>{thisWeek}</strong></div>
                  <div><span style={{ color: 'var(--grey)' }}>Last week:</span> <strong>{lastWeek}</strong></div>
                  {weekDelta !== null && (
                    <div style={{ color: weekDelta >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                      {weekDelta >= 0 ? '▲' : '▼'} {Math.abs(weekDelta)}% week-over-week
                    </div>
                  )}
                </div>
              )}

              {/* Daily timeline */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Daily response volume</div>
                <TimelineChart responses={responses} />
              </div>

              {/* Hourly distribution */}
              {responses.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>When responses come in (hour of day)</div>
                  <HourlyChart responses={responses} />
                </div>
              )}

              {/* Completion funnel */}
              {questions.length > 0 && responses.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Completion funnel</div>
                  <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 12 }}>% of active respondents who answered each question</div>
                  <CompletionFunnel questions={questions} responses={responses} />
                </div>
              )}
            </div>
          )}

          {/* ── RESPONSES TABLE ── */}
          {subTab === 'responses' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
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
                {selected.size > 0 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--grey)' }}>{selected.size} selected</span>
                    <button onClick={() => updateStatus([...selected], 'disqualified')} disabled={acting} className="btn ghost" style={{ fontSize: 12, padding: '5px 12px' }}>Discard</button>
                    <button onClick={() => updateStatus([...selected], 'complete')} disabled={acting} className="btn ghost" style={{ fontSize: 12, padding: '5px 12px' }}>Restore</button>
                    <button onClick={() => deleteResponses([...selected])} disabled={acting} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--red)', background: 'white', color: 'var(--red)', cursor: 'pointer' }}>Delete</button>
                  </div>
                )}
              </div>

              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--grey)', padding: '32px 0', fontSize: 13 }}>No {statusFilter !== 'all' ? statusFilter : ''} responses.</div>
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
                        <th style={{ padding: '8px 6px', textAlign: 'left', color: 'var(--grey)', fontWeight: 600 }}>#</th>
                        <th style={{ padding: '8px 6px', textAlign: 'left', color: 'var(--grey)', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '8px 6px', textAlign: 'left', color: 'var(--grey)', fontWeight: 600, whiteSpace: 'nowrap' }}>Started</th>
                        <th style={{ padding: '8px 6px', textAlign: 'left', color: 'var(--grey)', fontWeight: 600, whiteSpace: 'nowrap' }}>Time</th>
                        {questions.slice(0, 5).map((q, i) => (
                          <th key={q.id} style={{ padding: '8px 6px', textAlign: 'left', color: 'var(--grey)', fontWeight: 600, maxWidth: 120 }}>
                            Q{i + 1}: {q.title.slice(0, 22)}{q.title.length > 22 ? '…' : ''}
                          </th>
                        ))}
                        {questions.length > 5 && <th style={{ padding: '8px 6px', color: 'var(--grey)', fontWeight: 600 }}>+{questions.length - 5} more</th>}
                        <th style={{ padding: '8px 6px', textAlign: 'right', color: 'var(--grey)', fontWeight: 600 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => {
                        const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.partial
                        const isSelected = selected.has(r.id)
                        const timeTaken = r.started_at && r.completed_at
                          ? (() => { const secs = (new Date(r.completed_at!).getTime() - new Date(r.started_at).getTime()) / 1000; return secs < 60 ? `${Math.round(secs)}s` : `${Math.round(secs / 60)}m` })()
                          : '—'
                        return (
                          <tr key={r.id} style={{
                            borderBottom: '1px solid var(--border)',
                            background: isSelected ? '#F5F7FF' : r.status === 'disqualified' ? '#FDF5F5' : 'transparent',
                            opacity: r.status === 'disqualified' ? 0.6 : 1,
                          }}>
                            <td style={{ padding: '8px 10px' }}>
                              <input type="checkbox" checked={isSelected} onChange={e => {
                                const next = new Set(selected)
                                e.target.checked ? next.add(r.id) : next.delete(r.id)
                                setSelected(next)
                              }} />
                            </td>
                            <td style={{ padding: '8px 6px', color: 'var(--grey)' }}>{i + 1}</td>
                            <td style={{ padding: '8px 6px' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
                            </td>
                            <td style={{ padding: '8px 6px', color: 'var(--grey)', whiteSpace: 'nowrap' }}>{r.started_at ? r.started_at.slice(0, 16).replace('T', ' ') : '—'}</td>
                            <td style={{ padding: '8px 6px', color: 'var(--grey)' }}>{timeTaken}</td>
                            {questions.slice(0, 5).map(q => (
                              <td key={q.id} style={{ padding: '8px 6px', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {questions.length === 0 ? (
                <div style={{ color: 'var(--grey)', fontSize: 13 }}>No questions in this survey yet.</div>
              ) : questions.map((q, i) => (
                <div key={q.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--grey)', marginRight: 8 }}>Q{i + 1}</span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{q.title}</span>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--accent)', background: '#EEF2FF', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap', marginLeft: 10, flexShrink: 0 }}>
                      {q.type.replace(/_/g, ' ')}
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
