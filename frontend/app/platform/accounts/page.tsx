'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase-browser'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Account {
  id: string
  name: string
  org_name: string
  role: string
  plan: string
  plan_status: string
  plan_period_end: string | null
  surveys: number
  created_at: string | null
  is_super_admin: boolean
}

const PLANS = [
  { id: 'free',       label: 'Free',       color: '#64748b', price: '$0'     },
  { id: 'pro',        label: 'Pro',        color: '#db2777', price: '$29/mo' },
  { id: 'team',       label: 'Team',       color: '#4f46e5', price: '$79/mo' },
  { id: 'enterprise', label: 'Enterprise', color: '#b45309', price: 'Custom' },
]

const planMeta = (id: string) => PLANS.find(p => p.id === id) ?? PLANS[0]

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:   { bg: '#f0fdf4', color: '#16a34a' },
  past_due: { bg: '#fffbeb', color: '#d97706' },
  canceled: { bg: '#fef2f2', color: '#dc2626' },
}

export default function PlatformAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [banner, setBanner]     = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const [search, setSearch]     = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [adminId, setAdminId]   = useState('')

  // Plan-change modal
  const [target, setTarget]     = useState<Account | null>(null)
  const [newPlan, setNewPlan]   = useState('')
  const [reason, setReason]     = useState('')
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      const uid = user?.id ?? ''
      setAdminId(uid)
      loadAccounts(uid)
    })
  }, [])

  const loadAccounts = async (uid: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/platform/accounts?user_id=${uid}`)
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.accounts ?? [])
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.detail ?? 'Could not load accounts.')
      }
    } catch {
      setError('Could not reach the backend. Start it to manage accounts.')
    }
    setLoading(false)
  }

  const flash = (type: 'success' | 'error', msg: string) => {
    setBanner({ type, msg })
    setTimeout(() => setBanner(null), 5000)
  }

  const openPlanModal = (account: Account) => {
    setTarget(account)
    setNewPlan(account.plan)
    setReason('')
  }

  const applyPlan = async () => {
    if (!target || !reason.trim() || newPlan === target.plan) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/platform/accounts/${target.id}/plan?user_id=${adminId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan, reason: reason.trim() }),
      })
      if (res.ok) {
        setAccounts(prev => prev.map(a =>
          a.id === target.id ? { ...a, plan: newPlan, plan_status: 'active' } : a))
        flash('success', `${target.name} moved to ${planMeta(newPlan).label}.`)
        setTarget(null)
      } else {
        const body = await res.json().catch(() => ({}))
        flash('error', body.detail ?? 'Plan change failed.')
      }
    } catch {
      flash('error', 'Could not reach the backend.')
    }
    setSaving(false)
  }

  const visible = accounts.filter(a => {
    if (planFilter && a.plan !== planFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return a.name.toLowerCase().includes(q)
        || a.org_name.toLowerCase().includes(q)
        || a.id.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 21, margin: '0 0 4px', color: '#0f172a' }}>Accounts</h1>
          <div style={{ color: '#64748b', fontSize: 13 }}>
            Every account on the instance. Plan changes apply immediately and are written to the billing log.
          </div>
        </div>
        <button
          onClick={() => loadAccounts(adminId)}
          style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 15px', fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
        >
          ↻ Refresh
        </button>
      </div>

      {banner && (
        <div style={{
          padding: '11px 16px', borderRadius: 10, marginBottom: 18, fontSize: 13, fontWeight: 600,
          background: banner.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: banner.type === 'success' ? '#16a34a' : '#dc2626',
          border: `1px solid ${banner.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {banner.msg}
          <span onClick={() => setBanner(null)} style={{ cursor: 'pointer', opacity: .6, fontWeight: 400 }}>✕</span>
        </div>
      )}

      {error && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 10, padding: '11px 16px', fontSize: 12.5, marginBottom: 18 }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, org or account ID"
          style={{
            flex: 1, minWidth: 220, border: '1px solid #cbd5e1', borderRadius: 8,
            padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'white',
          }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setPlanFilter('')}
            style={{
              border: `1px solid ${planFilter === '' ? '#0f172a' : '#cbd5e1'}`,
              background: planFilter === '' ? '#0f172a' : 'white',
              color: planFilter === '' ? 'white' : '#334155',
              borderRadius: 8, padding: '8px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            All
          </button>
          {PLANS.map(p => (
            <button
              key={p.id}
              onClick={() => setPlanFilter(planFilter === p.id ? '' : p.id)}
              style={{
                border: `1px solid ${planFilter === p.id ? p.color : '#cbd5e1'}`,
                background: planFilter === p.id ? p.color : 'white',
                color: planFilter === p.id ? 'white' : '#334155',
                borderRadius: 8, padding: '8px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Account table */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Account', 'Organisation', 'Plan', 'Status', 'Surveys', 'Joined', ''].map((h, i) => (
                  <th key={h + i} style={{
                    textAlign: i >= 4 && i <= 5 ? 'right' : 'left',
                    padding: '10px 16px', fontSize: 10.5, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8',
                    borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#94a3b8' }}>Loading accounts…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#94a3b8' }}>
                  {accounts.length === 0 ? 'No accounts found.' : 'No accounts match these filters.'}
                </td></tr>
              ) : visible.map((a, i) => {
                const meta = planMeta(a.plan)
                const st = STATUS_STYLE[a.plan_status] ?? STATUS_STYLE.active
                return (
                  <tr key={a.id} style={{ borderBottom: i < visible.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                          background: meta.color, color: 'white', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                        }}>
                          {a.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {a.name}
                            {a.is_super_admin && (
                              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.05em', padding: '1px 6px', borderRadius: 20, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                                PLATFORM
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{a.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{a.org_name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}35`,
                      }}>
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: st.bg, color: st.color }}>
                        {a.plan_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#334155' }}>{a.surveys}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 11.5, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {a.created_at ? new Date(a.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => openPlanModal(a)}
                        style={{
                          border: '1px solid #cbd5e1', background: 'white', color: '#334155',
                          borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        Change plan
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && accounts.length > 0 && (
        <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 10 }}>
          Showing {visible.length} of {accounts.length} accounts
        </div>
      )}

      {/* ── Plan change modal ── */}
      {target && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget && !saving) setTarget(null) }}
        >
          <div style={{ background: 'white', borderRadius: 15, width: '100%', maxWidth: 460, boxShadow: '0 24px 64px rgba(0,0,0,.25)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: 17, margin: '0 0 3px', color: '#0f172a' }}>Change plan</h2>
              <div style={{ fontSize: 12.5, color: '#64748b' }}>
                {target.name} · currently on <strong style={{ color: planMeta(target.plan).color }}>{planMeta(target.plan).label}</strong>
              </div>
            </div>

            <div style={{ padding: '18px 24px' }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 8, color: '#0f172a' }}>New plan</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 18 }}>
                {PLANS.map(p => {
                  const selected = newPlan === p.id
                  const current  = target.plan === p.id
                  return (
                    <div
                      key={p.id}
                      onClick={() => setNewPlan(p.id)}
                      style={{
                        border: `1.5px solid ${selected ? p.color : '#e2e8f0'}`,
                        background: selected ? `${p.color}0e` : 'white',
                        borderRadius: 9, padding: '10px 12px', cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: p.color }}>{p.label}</span>
                        {current && <span style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700 }}>CURRENT</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{p.price}</div>
                    </div>
                  )
                })}
              </div>

              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: '#0f172a' }}>
                Reason <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                autoFocus
                value={reason}
                onChange={e => setReason(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyPlan()}
                placeholder="e.g. Annual deal signed, 3-month trial extension"
                style={{
                  width: '100%', border: '1.5px solid #cbd5e1', borderRadius: 8,
                  padding: '9px 12px', fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
                }}
              />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                Written to the account billing log and shown in their transaction history.
              </div>
            </div>

            <div style={{ padding: '13px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setTarget(null)}
                disabled={saving}
                style={{ border: '1px solid #cbd5e1', background: 'white', color: '#334155', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={applyPlan}
                disabled={saving || !reason.trim() || newPlan === target.plan}
                style={{
                  border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600,
                  minWidth: 120, color: 'white',
                  background: (!reason.trim() || newPlan === target.plan) ? '#cbd5e1' : planMeta(newPlan).color,
                  cursor: (saving || !reason.trim() || newPlan === target.plan) ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Applying…' : `Move to ${planMeta(newPlan).label}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
