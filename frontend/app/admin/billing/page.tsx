'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../../lib/supabase-browser'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface BillingProfile {
  plan: 'free' | 'starter' | 'pro'
  plan_status: string
  plan_period_end: string | null
}

interface BillingLog {
  id: string
  plan: string
  prev_plan: string
  token: string
  amount: string
  status: string
  note: string
  created_at: string
}

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/mo',
    features: ['500 responses/mo', '1 org member', 'Basic analytics', 'Web & embed distribution'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$29',
    period: '/mo',
    highlight: true,
    features: ['5,000 responses/mo', '5 org members', 'Advanced analytics', 'Email distribution', 'Custom branding'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$79',
    period: '/mo',
    features: ['Unlimited responses', 'Unlimited members', 'Full analytics suite', 'Advanced logic & TURF', 'Custom domain'],
  },
]

const LIMITS: Record<string, number> = { free: 500, starter: 5000, pro: Infinity }
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:   { bg: 'var(--green-bg)', color: 'var(--green)' },
  past_due: { bg: 'var(--amber-bg)', color: 'var(--amber)' },
  canceled: { bg: 'var(--red-bg)',   color: 'var(--red)'   },
}

export default function BillingPage() {
  const [profile, setProfile]     = useState<BillingProfile | null>(null)
  const [logs, setLogs]           = useState<BillingLog[]>([])
  const [userId, setUserId]       = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [banner, setBanner]       = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Token modal state
  const [tokenModal, setTokenModal] = useState<{ planId: string; planName: string } | null>(null)
  const [token, setToken]           = useState('')
  const [processing, setProcessing] = useState(false)
  const inFlight = useRef(false)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      await refreshBilling(user.id)
    })
  }, [])

  const refreshBilling = async (uid: string) => {
    setLoading(true)
    const [planRes, logsRes] = await Promise.all([
      fetch(`${API}/billing/plan?user_id=${uid}`),
      fetch(`${API}/billing/logs?user_id=${uid}`),
    ])
    if (planRes.ok) setProfile(await planRes.json())
    if (logsRes.ok) setLogs(await logsRes.json())
    setLoading(false)
  }

  const openTokenModal = (planId: string, planName: string) => {
    setToken('')
    setBanner(null)
    setTokenModal({ planId, planName })
  }

  const handleTokenUpgrade = async () => {
    if (!userId || !tokenModal || inFlight.current) return
    if (!token.trim()) { setBanner({ type: 'error', msg: 'Please enter a payment token.' }); return }

    inFlight.current = true
    setProcessing(true)
    setBanner(null)

    try {
      const res = await fetch(`${API}/billing/token-upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, plan: tokenModal.planId, token: token.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setBanner({ type: 'error', msg: data.detail ?? 'Upgrade failed. Please try again.' })
      } else {
        setTokenModal(null)
        setBanner({ type: 'success', msg: `🎉 Successfully upgraded to ${tokenModal.planName}! Your new limits are now active.` })
        await refreshBilling(userId)
      }
    } catch {
      setBanner({ type: 'error', msg: 'Network error. Please try again.' })
    }
    setProcessing(false)
    inFlight.current = false
  }

  const currentPlan = profile?.plan ?? 'free'
  const planStatus  = profile?.plan_status ?? 'active'
  const limit       = LIMITS[currentPlan] ?? 500
  const usagePct    = limit === Infinity ? 0 : 0  // real usage tracked in responses table

  return (
    <div>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Billing & Plan</h1>
      <div style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 24 }}>Manage your subscription and view transaction history.</div>

      {/* Banner */}
      {banner && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, fontWeight: 600,
          background: banner.type === 'success' ? 'var(--green-bg)' : 'var(--red-bg)',
          color: banner.type === 'success' ? 'var(--green)' : 'var(--red)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {banner.msg}
          <span onClick={() => setBanner(null)} style={{ cursor: 'pointer', opacity: 0.6, fontWeight: 400 }}>✕</span>
        </div>
      )}

      {/* Current plan card */}
      {loading ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', marginBottom: 28, color: 'var(--grey)', fontSize: 13 }}>
          Loading…
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 4 }}>Current plan</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 22, fontWeight: 700, textTransform: 'capitalize' }}>{currentPlan}</div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, ...(STATUS_STYLE[planStatus] ?? STATUS_STYLE.active) }}>
                  {planStatus.replace('_', ' ')}
                </span>
              </div>
              {currentPlan === 'free' && <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 4 }}>No payment on file</div>}
              {currentPlan !== 'free' && <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>✓ Paid plan active</div>}
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 6 }}>Monthly response limit</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {limit === Infinity ? 'Unlimited' : `${limit.toLocaleString()} / mo`}
              </div>
              {limit !== Infinity && (
                <div style={{ marginTop: 8, width: 200, height: 6, background: 'var(--bg)', borderRadius: 3 }}>
                  <div style={{ width: `${usagePct}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Choose a plan</div>
      <div className="plan-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 32 }}>
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id
          return (
            <div key={plan.id} style={{
              background: plan.highlight ? '#F0F4FF' : 'var(--card)',
              border: `2px solid ${plan.highlight ? 'var(--accent)' : isCurrent ? 'var(--green)' : 'var(--border)'}`,
              borderRadius: 12, padding: 20,
            }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{plan.name}</div>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 26, fontWeight: 700 }}>{plan.price}</span>
                <span style={{ fontSize: 13, color: 'var(--grey)' }}>{plan.period}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--green)', marginTop: 1 }}>✓</span><span>{f}</span>
                  </div>
                ))}
              </div>
              {isCurrent ? (
                <div style={{ textAlign: 'center', padding: '9px 0', borderRadius: 8, background: 'var(--bg)', color: 'var(--grey)', fontSize: 13, fontWeight: 600 }}>✓ Current plan</div>
              ) : plan.id === 'free' ? (
                <div style={{ textAlign: 'center', padding: '9px 0', borderRadius: 8, background: 'var(--bg)', color: 'var(--grey)', fontSize: 13 }}>Contact support to downgrade</div>
              ) : (
                <button onClick={() => openTokenModal(plan.id, plan.name)} disabled={loading}
                  className="btn" style={{ width: '100%', padding: '9px 0', fontSize: 13, background: plan.highlight ? 'var(--accent)' : 'var(--text)' }}>
                  Upgrade to {plan.name}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Transaction history */}
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Transaction history</div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
        {logs.length === 0 ? (
          <div style={{ padding: '24px', color: 'var(--grey)', fontSize: 13, textAlign: 'center' }}>
            No transactions yet. Upgrade a plan to see your history here.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px 80px', padding: '10px 18px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--grey)', textTransform: 'uppercase' }}>
              <span>Plan change</span><span style={{ textAlign: 'right' }}>Amount</span><span style={{ textAlign: 'center' }}>Status</span><span style={{ textAlign: 'center' }}>Token</span><span style={{ textAlign: 'right' }}>Date</span>
            </div>
            {logs.map((log, i) => (
              <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px 80px', padding: '12px 18px', borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13, alignItems: 'center' }}>
                <div>
                  <span style={{ textTransform: 'capitalize' }}>{log.prev_plan}</span>
                  <span style={{ color: 'var(--grey)', margin: '0 6px' }}>→</span>
                  <span style={{ fontWeight: 700, textTransform: 'capitalize', color: 'var(--accent)' }}>{log.plan}</span>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 600 }}>{log.amount}</div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--green-bg)', color: 'var(--green)' }}>{log.status}</span>
                </div>
                <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 11, color: 'var(--grey)' }}>{log.token}</div>
                <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--grey)' }}>
                  {new Date(log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--grey)', padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
        💳 Payments use a secure token-based system. Each upgrade is logged and visible here. Contact support to downgrade or for refunds.
      </div>

      {/* Token upgrade modal */}
      {tokenModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setTokenModal(null) }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>Upgrade to {tokenModal.planName}</h2>
            <div style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 24 }}>
              Enter your payment token to activate the {tokenModal.planName} plan.
              Your plan updates immediately upon successful token verification.
            </div>

            {banner?.type === 'error' && (
              <div style={{ padding: '10px 14px', background: 'var(--red-bg)', color: 'var(--red)', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{banner.msg}</div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Payment Token</label>
              <input
                autoFocus
                value={token}
                onChange={e => setToken(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTokenUpgrade()}
                placeholder="e.g. PAY-2026-XXXX-XXXX"
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'monospace', outline: 'none' }}
              />
              <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 6 }}>
                Token provided by your account manager or billing team.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => { setTokenModal(null); setBanner(null) }} disabled={processing}>Cancel</button>
              <button className="btn" onClick={handleTokenUpgrade} disabled={!token.trim() || processing}
                style={{ minWidth: 140 }}>
                {processing ? <><span className="spinner" />Processing…</> : `Activate ${tokenModal.planName}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
