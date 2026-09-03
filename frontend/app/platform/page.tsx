'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase-browser'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Stats {
  accounts: number
  paying_accounts: number
  conversion_pct: number
  mrr: number
  surveys: number
  responses: number
  past_due: number
  distribution: Record<string, number>
}

const PLAN_META: { id: string; label: string; color: string; price: number }[] = [
  { id: 'free',       label: 'Free',       color: '#64748b', price: 0  },
  { id: 'pro',        label: 'Pro',        color: '#db2777', price: 29 },
  { id: 'team',       label: 'Team',       color: '#4f46e5', price: 79 },
  { id: 'enterprise', label: 'Enterprise', color: '#b45309', price: 0  },
]

const EMPTY: Stats = {
  accounts: 0, paying_accounts: 0, conversion_pct: 0, mrr: 0,
  surveys: 0, responses: 0, past_due: 0,
  distribution: { free: 0, pro: 0, team: 0, enterprise: 0 },
}

export default function PlatformOverview() {
  const router = useRouter()
  const [stats, setStats]     = useState<Stats>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      try {
        const res = await fetch(`${API}/platform/stats?user_id=${user?.id ?? ''}`)
        if (res.ok) setStats(await res.json())
        else setError('Stats unavailable — the backend rejected the request or is not running.')
      } catch {
        setError('Could not reach the backend. Showing zeroes.')
      }
      setLoading(false)
    })
  }, [])

  const totalAccounts = stats.accounts || 0

  return (
    <div>
      <h1 style={{ fontSize: 21, margin: '0 0 4px', color: '#0f172a' }}>Overview</h1>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
        Instance-wide totals across every account.
      </div>

      {error && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 10, padding: '11px 16px', fontSize: 12.5, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Headline metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Accounts',       value: stats.accounts.toLocaleString(),        sub: `${stats.paying_accounts} paying` },
          { label: 'MRR',            value: `$${stats.mrr.toLocaleString()}`,       sub: 'active subscriptions' },
          { label: 'Conversion',     value: `${stats.conversion_pct}%`,             sub: 'free → paid' },
          { label: 'Surveys',        value: stats.surveys.toLocaleString(),         sub: 'created all-time' },
          { label: 'Responses',      value: stats.responses.toLocaleString(),       sub: 'collected all-time' },
        ].map(m => (
          <div key={m.label} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 11, padding: '15px 17px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#94a3b8', marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 25, fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
              {loading ? '—' : m.value}
            </div>
            <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Past-due callout only when it matters */}
      {stats.past_due > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
          padding: '12px 16px', marginBottom: 22, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 13, color: '#991b1b' }}>
            <strong>{stats.past_due}</strong> {stats.past_due === 1 ? 'account is' : 'accounts are'} past due on payment.
          </div>
          <button
            onClick={() => router.push('/platform/accounts')}
            style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
          >
            Review accounts
          </button>
        </div>
      )}

      {/* Plan distribution */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 20px', marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Plan distribution</div>
          <button
            onClick={() => router.push('/platform/accounts')}
            style={{ background: 'none', border: 'none', color: '#b45309', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
          >
            Manage accounts →
          </button>
        </div>

        {/* Stacked bar */}
        <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: '#f1f5f9', marginBottom: 16 }}>
          {PLAN_META.map(p => {
            const n = stats.distribution?.[p.id] ?? 0
            const pct = totalAccounts ? (n / totalAccounts) * 100 : 0
            if (pct === 0) return null
            return <div key={p.id} title={`${p.label}: ${n}`} style={{ width: `${pct}%`, background: p.color }} />
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {PLAN_META.map(p => {
            const n = stats.distribution?.[p.id] ?? 0
            const pct = totalAccounts ? Math.round((n / totalAccounts) * 100) : 0
            return (
              <div key={p.id} style={{ borderLeft: `3px solid ${p.color}`, paddingLeft: 11 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                  <span style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
                  <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{pct}%</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: p.color }}>{p.label}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  {p.price > 0 ? `$${(n * p.price).toLocaleString()} / mo` : p.id === 'enterprise' ? 'custom pricing' : 'no revenue'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
