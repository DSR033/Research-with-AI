'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TopBar from '../../../../components/TopBar'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Survey { id: string; title: string; status: string; created_at: string }
interface Results { total: number; complete: number; partial: number }

// ── Mock analysis data (replaced by real AI in Phase 4) ──────────────────────
const WEEKLY = [12, 28, 41, 35, 19, 7]
const SENTIMENT = { pos: 72, neu: 18, neg: 10 }
const THEMES = [
  { name: 'Pricing concerns', count: 38 },
  { name: 'Usage frequency doubts', count: 31 },
  { name: 'Feature value / ROI', count: 27 },
  { name: 'Competitor comparison', count: 19 },
  { name: 'Ease of use', count: 14 },
]
const QBREAKDOWN = [
  {
    q: 'Would you pay $15/month for this feature?',
    opts: [
      { name: 'Definitely yes', pct: 28, count: 40, color: '#3F7D58' },
      { name: 'Probably yes', pct: 34, count: 48, color: '#6FA37C' },
      { name: 'Not sure', pct: 18, count: 26, color: '#C9CDD3' },
      { name: 'Probably not', pct: 13, count: 18, color: '#D9A24B' },
      { name: 'Definitely not', pct: 7, count: 10, color: '#B23B3B' },
    ],
  },
  {
    q: 'How valuable would this feature be to your workflow?',
    opts: [
      { name: 'Very valuable', pct: 31, count: 44, color: '#3F7D58' },
      { name: 'Valuable', pct: 39, count: 55, color: '#6FA37C' },
      { name: 'Neutral', pct: 16, count: 23, color: '#C9CDD3' },
      { name: 'Not very valuable', pct: 9, count: 13, color: '#D9A24B' },
      { name: 'Not valuable', pct: 5, count: 7, color: '#B23B3B' },
    ],
  },
]
const TREND = [62, 66, 64, 70, 74, 78]
const HEAT_SEGS = ['Under 25', '25–34', '35–44', '45+']
const HEAT_PRICES = ['$5', '$10', '$15', '$20', '$25']
const HEAT_DATA = [
  [88, 79, 61, 38, 20],
  [82, 74, 58, 35, 19],
  [91, 85, 71, 52, 33],
  [94, 89, 77, 59, 41],
]
function heatColor(v: number) {
  if (v >= 80) return '#3F7D58'
  if (v >= 65) return '#6FA37C'
  if (v >= 50) return '#C9882E'
  if (v >= 35) return '#D9A24B'
  return '#B23B3B'
}

// ── AI badge ─────────────────────────────────────────────────────────────────
function AIBadge() {
  return (
    <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: 'var(--ai)', background: 'var(--ai-bg)', padding: '2px 8px', borderRadius: 6, marginLeft: 8, verticalAlign: 'middle' }}>AI</span>
  )
}

// ── Panel wrapper ─────────────────────────────────────────────────────────────
function Panel({ title, desc, badge, children }: { title: React.ReactNode; desc?: string; badge?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <h2 style={{ fontSize: 15, margin: '0 0 4px' }}>{title}{badge && <AIBadge />}</h2>
      {desc && <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 14 }}>{desc}</div>}
      {children}
    </div>
  )
}

// ── Trend SVG ────────────────────────────────────────────────────────────────
function TrendChart({ vals }: { vals: number[] }) {
  const w = 460, h = 110, pad = 16
  const stepX = (w - pad * 2) / (vals.length - 1)
  const pts = vals.map((v, i) => ({
    x: pad + i * stepX,
    y: h - pad - (v / 100) * (h - pad * 2),
  }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  return (
    <svg viewBox={`0 0 ${w} ${h + 14}`} width="100%" style={{ display: 'block' }}>
      <path d={path} fill="none" stroke="var(--ai)" strokeWidth="2.5" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="var(--ai)" />
          <text x={p.x} y={h + 10} fontSize="10" fill="#6B7280" textAnchor="middle">{months[i]}</text>
          <text x={p.x} y={p.y - 7} fontSize="10" fill="var(--ai)" textAnchor="middle" fontWeight="600">{vals[i]}</text>
        </g>
      ))}
    </svg>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AnalysisDashboard() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [results, setResults] = useState<Results | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/surveys/${id}`).then(r => r.json()),
      fetch(`${API}/surveys/${id}/results`).then(r => r.json()),
    ]).then(([s, r]) => {
      setSurvey(s)
      setResults(r)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--grey)' }}>Loading…</div>
  if (!survey) return null

  const total = results?.total ?? 0
  const complete = results?.complete ?? 0
  const completionRate = total > 0 ? Math.round((complete / total) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopBar activeLabel="Analysis" />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 24px 60px' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => router.push(`/surveys/${id}`)}>
          ← Back to Builder
        </div>

        <h1 style={{ fontSize: 22, margin: '0 0 2px' }}>{survey.title}</h1>
        <div style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 22 }}>
          {total} responses · {survey.status === 'active' ? 'Live' : `Closed ${new Date(survey.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
        </div>

        {/* 4 stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
          {[
            { label: 'Responses', value: String(total), delta: total >= 120 ? 'Target: 120 ✓ reached' : `Target: 120 (${total} so far)` },
            { label: 'Completion rate', value: `${completionRate}%`, delta: '▲ vs. 75% classic mode' },
            { label: 'Avg. NPS', value: '+34', delta: '▲ 6 pts vs. last wave' },
            { label: 'Aggregate sentiment', value: '72% positive', delta: '18% neutral · 10% negative' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--grey)' }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#3F7D58', marginTop: 2 }}>{s.delta}</div>
            </div>
          ))}
        </div>

        {/* Dashboard panels */}
        <div style={{ maxWidth: 720 }}>
          <div>
            {/* Distribution over time */}
            <Panel title="Response Distribution Over Time" desc="Weekly response volume since launch.">
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 120, marginTop: 10 }}>
                {WEEKLY.map((v, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <div style={{ width: '100%', maxWidth: 34, background: 'var(--accent)', borderRadius: '5px 5px 0 0', height: `${Math.round((v / Math.max(...WEEKLY)) * 100)}%` }} />
                    <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 6 }}>Wk {i + 1}</div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Question breakdown */}
            <Panel title="Question Breakdown" desc="Per-option response share, color-coded by sentiment." badge>
              {QBREAKDOWN.map((block, bi) => (
                <div key={bi} style={{ marginBottom: bi < QBREAKDOWN.length - 1 ? 22 : 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{block.q}</div>
                  {block.opts.map(o => (
                    <div key={o.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7, fontSize: 12.5 }}>
                      <div style={{ width: 130, flexShrink: 0 }}>{o.name}</div>
                      <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 5, height: 12, overflow: 'hidden' }}>
                        <div style={{ width: `${o.pct}%`, height: '100%', background: o.color, borderRadius: 5 }} />
                      </div>
                      <div style={{ width: 78, textAlign: 'right', color: 'var(--grey)', fontSize: 11.5 }}>{o.pct}% ({o.count})</div>
                    </div>
                  ))}
                </div>
              ))}
            </Panel>

            {/* Sentiment */}
            <Panel title="Sentiment Breakdown" desc="Per-response sentiment scored on open-text answers." badge>
              <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', marginTop: 8 }}>
                <div style={{ width: `${SENTIMENT.pos}%`, background: '#3F7D58' }} />
                <div style={{ width: `${SENTIMENT.neu}%`, background: '#C9CDD3' }} />
                <div style={{ width: `${SENTIMENT.neg}%`, background: '#B23B3B' }} />
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, marginTop: 10, color: 'var(--grey)' }}>
                {[
                  { color: '#3F7D58', label: `Positive ${SENTIMENT.pos}%` },
                  { color: '#C9CDD3', label: `Neutral ${SENTIMENT.neu}%` },
                  { color: '#B23B3B', label: `Negative ${SENTIMENT.neg}%` },
                ].map(s => (
                  <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </Panel>

            {/* Themes */}
            <Panel title="Theme Extraction" desc="Auto-identified themes from open-text responses, ranked by frequency." badge>
              {THEMES.map(t => (
                <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 13 }}>
                  <div style={{ width: 160, flexShrink: 0 }}>{t.name}</div>
                  <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round((t.count / THEMES[0].count) * 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 6 }} />
                  </div>
                  <div style={{ width: 28, textAlign: 'right', color: 'var(--grey)', fontSize: 12 }}>{t.count}</div>
                </div>
              ))}
            </Panel>

            {/* Heatmap */}
            <Panel title="Price-Sensitivity Heat Map" desc="Purchase intent by price point × customer segment.">
              <div style={{ fontSize: 11, marginTop: 4 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(5,1fr)', gap: 4, marginBottom: 4 }}>
                  <div />
                  {HEAT_PRICES.map(p => <div key={p} style={{ textAlign: 'center', fontSize: 10, color: 'var(--grey)' }}>{p}</div>)}
                </div>
                {HEAT_SEGS.map((seg, i) => (
                  <div key={seg} style={{ display: 'grid', gridTemplateColumns: '90px repeat(5,1fr)', gap: 4, marginBottom: 4, alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--grey)' }}>{seg}</div>
                    {HEAT_DATA[i].map((v, j) => (
                      <div key={j} style={{ aspectRatio: '1', borderRadius: 4, background: heatColor(v), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', fontWeight: 600 }}>
                        {v}%
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Panel>

            {/* Satisfaction trend */}
            <Panel title="Satisfaction Trend" desc="Average satisfaction score, last 6 months." badge>
              <TrendChart vals={TREND} />
            </Panel>
          </div>

        </div>
      </div>
    </div>
  )
}

