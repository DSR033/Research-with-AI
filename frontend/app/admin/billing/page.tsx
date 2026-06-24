'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '../../../lib/supabase-browser'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface BillingProfile {
  plan: 'free' | 'starter' | 'pro'
  plan_status: string
  plan_period_end: string | null
  stripe_customer_id: string | null
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

const LIMITS: Record<string, { responses: number; limit: number }> = {
  free: { responses: 0, limit: 500 },
  starter: { responses: 0, limit: 5000 },
  pro: { responses: 0, limit: Infinity },
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active: { bg: 'var(--green-bg)', color: 'var(--green)' },
  past_due: { bg: 'var(--amber-bg)', color: 'var(--amber)' },
  canceled: { bg: 'var(--red-bg)', color: 'var(--red)' },
  trialing: { bg: '#EEF2FF', color: 'var(--accent)' },
}

export default function BillingPage() {
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<BillingProfile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [openingPortal, setOpeningPortal] = useState(false)
  const [banner, setBanner] = useState<{ type: 'success' | 'info'; msg: string } | null>(null)

  useEffect(() => {
    if (searchParams.get('success')) {
      const plan = searchParams.get('plan') ?? 'starter'
      setBanner({ type: 'success', msg: `🎉 Welcome to the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan! Your subscription is now active.` })
    } else if (searchParams.get('canceled')) {
      setBanner({ type: 'info', msg: 'Checkout was cancelled — no charge was made.' })
    }
  }, [searchParams])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      setUserEmail(user.email ?? '')

      const res = await fetch(`${API}/billing/plan?user_id=${user.id}`)
      if (res.ok) setProfile(await res.json())
      setLoading(false)
    })
  }, [])

  const handleUpgrade = async (planId: string) => {
    if (!userId) return
    setUpgrading(planId)
    try {
      const res = await fetch(`${API}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, user_id: userId, email: userEmail }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.detail ?? 'Checkout failed.')
        setUpgrading(null)
        return
      }
      const { url } = await res.json()
      window.location.href = url
    } catch {
      alert('Could not connect to billing. Ensure STRIPE_SECRET_KEY is set in backend/.env')
      setUpgrading(null)
    }
  }

  const handlePortal = async () => {
    if (!userId) return
    setOpeningPortal(true)
    try {
      const res = await fetch(`${API}/billing/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      if (!res.ok) { alert((await res.json()).detail); setOpeningPortal(false); return }
      const { url } = await res.json()
      window.location.href = url
    } catch {
      alert('Could not open billing portal.')
      setOpeningPortal(false)
    }
  }

  const currentPlan = profile?.plan ?? 'free'
  const planStatus = profile?.plan_status ?? 'active'
  const usageLimit = LIMITS[currentPlan]
  const usagePct = usageLimit.limit === Infinity ? 0 : Math.min(Math.round((usageLimit.responses / usageLimit.limit) * 100), 100)

  return (
    <div>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Billing & Plan</h1>
      <div style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 24 }}>Manage your subscription, plan, and payment details.</div>

      {/* Banner */}
      {banner && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, fontWeight: 600,
          background: banner.type === 'success' ? 'var(--green-bg)' : '#EEF2FF',
          color: banner.type === 'success' ? 'var(--green)' : 'var(--accent)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {banner.msg}
          <span onClick={() => setBanner(null)} style={{ cursor: 'pointer', opacity: 0.6, fontWeight: 400 }}>✕</span>
        </div>
      )}

      {/* Current plan */}
      {loading ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', marginBottom: 28, color: 'var(--grey)', fontSize: 13 }}>
          Loading billing info…
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 4 }}>Current plan</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 20, fontWeight: 700, textTransform: 'capitalize' }}>{currentPlan}</div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                  ...(STATUS_STYLE[planStatus] ?? STATUS_STYLE.active),
                }}>
                  {planStatus.replace('_', ' ')}
                </span>
              </div>
              {profile?.plan_period_end && (
                <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 4 }}>
                  Renews {new Date(profile.plan_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
              {currentPlan === 'free' && (
                <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 4 }}>No credit card on file</div>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 6 }}>This month&apos;s usage</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {usageLimit.responses.toLocaleString()} / {usageLimit.limit === Infinity ? '∞' : usageLimit.limit.toLocaleString()} responses
              </div>
              {usageLimit.limit !== Infinity && (
                <div style={{ marginTop: 8, width: 200, height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${usagePct}%`, height: '100%', background: usagePct > 80 ? 'var(--amber)' : 'var(--accent)', borderRadius: 3, transition: 'width .4s' }} />
                </div>
              )}
            </div>
          </div>

          {profile?.stripe_customer_id && currentPlan !== 'free' && (
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <button
                className="btn ghost"
                style={{ fontSize: 13 }}
                onClick={handlePortal}
                disabled={openingPortal}
              >
                {openingPortal ? <><span className="spinner" />Opening portal…</> : '⚙️ Manage subscription & invoices'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Plan cards */}
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Choose a plan</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 32 }}>
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
                    <span style={{ color: 'var(--green)', marginTop: 1 }}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {isCurrent ? (
                <div style={{ textAlign: 'center', padding: '9px 0', borderRadius: 8, background: 'var(--bg)', color: 'var(--grey)', fontSize: 13, fontWeight: 600 }}>
                  ✓ Current plan
                </div>
              ) : plan.id === 'free' ? (
                <div style={{ textAlign: 'center', padding: '9px 0', borderRadius: 8, background: 'var(--bg)', color: 'var(--grey)', fontSize: 13 }}>
                  Downgrade via support
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={!!upgrading || loading}
                  className="btn"
                  style={{ width: '100%', padding: '9px 0', fontSize: 13, background: plan.highlight ? 'var(--accent)' : 'var(--text)' }}
                >
                  {upgrading === plan.id ? <><span className="spinner" />Redirecting…</> : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Stripe note */}
      <div style={{ fontSize: 12, color: 'var(--grey)', padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
        Billing powered by <strong>Stripe</strong> · Payments are processed securely. Add <code>STRIPE_SECRET_KEY</code> and Price IDs to <code>backend/.env</code> to enable checkout.
      </div>
    </div>
  )
}
