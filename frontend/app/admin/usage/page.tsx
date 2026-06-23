'use client'
import { useState, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const MONTHLY_RESPONSES = [
  { month: 'Jan', count: 0 }, { month: 'Feb', count: 0 }, { month: 'Mar', count: 0 },
  { month: 'Apr', count: 0 }, { month: 'May', count: 0 }, { month: 'Jun', count: 0 },
]

const AI_CALLS = [
  { feature: 'Prompt-to-survey generation', calls: 0, tokens: 0, cost: '$0.00' },
  { feature: 'Expert Review', calls: 0, tokens: 0, cost: '$0.00' },
  { feature: 'Sentiment analysis', calls: 0, tokens: 0, cost: '$0.00' },
  { feature: 'Theme extraction', calls: 0, tokens: 0, cost: '$0.00' },
  { feature: 'Ask Your Data (Q&A)', calls: 0, tokens: 0, cost: '$0.00' },
  { feature: 'Verdict Report', calls: 0, tokens: 0, cost: '$0.00' },
]

export default function UsagePage() {
  const [totalSurveys, setTotalSurveys] = useState(0)
  const [totalResponses, setTotalResponses] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/surveys`).then(r => r.json()),
    ]).then(([surveys]) => {
      setTotalSurveys(surveys.length)
      Promise.all(surveys.map((s: { id: string }) =>
        fetch(`${API}/surveys/${s.id}/results`).then(r => r.json())
      )).then(results => {
        const total = results.reduce((sum: number, r: { total: number }) => sum + (r.total || 0), 0)
        setTotalResponses(total)
        setLoading(false)
      })
    }).catch(() => setLoading(false))
  }, [])

  const LIMIT = 500
  const usagePct = Math.min(Math.round((totalResponses / LIMIT) * 100), 100)

  return (
    <div>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Usage & Costs</h1>
      <div style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 28 }}>Monitor your response usage and AI API costs this billing period.</div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Responses this month', value: loading ? '…' : String(totalResponses), sub: `${LIMIT} included on Free plan`, pct: usagePct },
          { label: 'Surveys created', value: loading ? '…' : String(totalSurveys), sub: 'All time', pct: null },
          { label: 'AI cost this month', value: '$0.00', sub: 'AI integration not yet active', pct: null },
        ].map(t => (
          <div key={t.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 6 }}>{t.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>{t.value}</div>
            {t.pct !== null && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${t.pct}%`, height: '100%', background: t.pct > 80 ? 'var(--amber)' : 'var(--accent)', borderRadius: 3, transition: 'width .4s' }} />
                </div>
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--grey)' }}>{t.sub}</div>
          </div>
        ))}
      </div>

      {/* Monthly response chart */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Monthly response volume</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 120 }}>
          {MONTHLY_RESPONSES.map((m, i) => {
            const isLast = i === MONTHLY_RESPONSES.length - 1
            const h = m.count > 0 ? Math.max(Math.round((m.count / Math.max(...MONTHLY_RESPONSES.map(x => x.count), 1)) * 100), 4) : 4
            return (
              <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ fontSize: 10, color: 'var(--grey)', marginBottom: 4 }}>{m.count || ''}</div>
                <div style={{ width: '100%', maxWidth: 40, borderRadius: '4px 4px 0 0', height: `${h}%`, background: isLast ? 'var(--accent)' : '#C7D3F8', transition: 'height .3s' }} />
                <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 6 }}>{m.month}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* AI usage breakdown */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            AI usage breakdown
            <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: 'var(--ai)', background: 'var(--ai-bg)', padding: '2px 8px', borderRadius: 6, marginLeft: 8, verticalAlign: 'middle' }}>AI</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--grey)' }}>Billed per token · powered by Claude</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px', padding: '10px 20px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--grey)', textTransform: 'uppercase' }}>
          <span>Feature</span><span style={{ textAlign: 'right' }}>API calls</span><span style={{ textAlign: 'right' }}>Tokens used</span><span style={{ textAlign: 'right' }}>Est. cost</span>
        </div>
        {AI_CALLS.map((row, i) => (
          <div key={row.feature} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px', padding: '12px 20px', borderBottom: i < AI_CALLS.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13, alignItems: 'center' }}>
            <span>{row.feature}</span>
            <span style={{ textAlign: 'right', color: 'var(--grey)' }}>{row.calls}</span>
            <span style={{ textAlign: 'right', color: 'var(--grey)' }}>{row.tokens.toLocaleString()}</span>
            <span style={{ textAlign: 'right', fontWeight: 600 }}>{row.cost}</span>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px', padding: '12px 20px', fontSize: 13, fontWeight: 700, background: 'var(--bg)', borderTop: '2px solid var(--border)' }}>
          <span>Total</span>
          <span style={{ textAlign: 'right' }}>0</span>
          <span style={{ textAlign: 'right' }}>0</span>
          <span style={{ textAlign: 'right' }}>$0.00</span>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--grey)', padding: '10px 14px', background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', borderRadius: 8 }}>
        AI usage tracking activates once Claude API integration is enabled (Phase 4). Costs will reflect actual token usage per feature.
      </div>
    </div>
  )
}
