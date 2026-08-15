'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '../../../lib/supabase-browser'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type PlanId = 'free' | 'pro' | 'team' | 'enterprise'

interface BillingProfile {
  plan: PlanId
  plan_status: string
  plan_period_end: string | null
  responses_used?: number
  storage_used_mb?: number
  seats_used?: number
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

const PLANS: {
  id: PlanId
  name: string
  price: string
  period: string
  color: string
  highlight?: boolean
  enterprise?: boolean
  limits: { responses: number | null; storage_gb: number | null; seats: number | null }
  features: string[]
}[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/forever',
    color: '#64748b',
    limits: { responses: 100, storage_gb: 0.5, seats: 1 },
    features: [
      '3 active surveys',
      '10 questions / survey',
      'Basic question types',
      'Public link sharing',
      'Basic analytics',
      'Admin completion notification',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    period: '/mo',
    color: '#db2777',
    highlight: true,
    limits: { responses: 1000, storage_gb: 5, seats: 1 },
    features: [
      'Unlimited surveys',
      'All question types',
      'Logic & branching',
      'CSV export',
      'AI Insights (unlimited)',
      'Expert Review (unlimited)',
      'Remove branding',
      'Embed + QR + Email share',
      'Redirect URL & Thank You page',
      'Password & Email auth',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    price: '$79',
    period: '/mo',
    color: '#4f46e5',
    limits: { responses: 10000, storage_gb: 25, seats: 10 },
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Role-based access control',
      'Shared survey folders',
      'Media Library (25 GB)',
      'REST API access',
      'Zapier / Make integration',
      'Webhooks & automations',
      'CSV + Excel + SPSS export',
      'Cross-tab analysis',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    color: '#b45309',
    enterprise: true,
    limits: { responses: null, storage_gb: null, seats: null },
    features: [
      'Everything in Team',
      'Unlimited seats',
      'SSO / SAML',
      'White-label & custom domain',
      'Unlimited storage',
      'Audit log',
      'Data residency',
      'Dedicated support & SLA',
    ],
  },
]

const PLAN_LIMITS = {
  free:       { responses: 100,   storage_gb: 0.5,  seats: 1    },
  pro:        { responses: 1000,  storage_gb: 5,    seats: 1    },
  team:       { responses: 10000, storage_gb: 25,   seats: 10   },
  enterprise: { responses: null,  storage_gb: null, seats: null },
} as const

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:   { bg: 'var(--green-bg)', color: 'var(--green)' },
  past_due: { bg: '#fffbeb',         color: '#d97706'      },
  canceled: { bg: 'var(--red-bg)',   color: 'var(--red)'   },
}

// Feature comparison matrix — shown in collapsible section
const COMPARE_SECTIONS = [
  {
    label: 'Survey Builder',
    rows: [
      { feature: 'Active surveys',        free: '3',      pro: '∞',   team: '∞',   ent: '∞'   },
      { feature: 'Questions / survey',    free: '10',     pro: '∞',   team: '∞',   ent: '∞'   },
      { feature: 'Basic question types',  free: '✓',      pro: '✓',   team: '✓',   ent: '✓'   },
      { feature: 'Advanced types',        free: '—',      pro: '✓',   team: '✓',   ent: '✓'   },
      { feature: 'Expert types',          free: '—',      pro: '—',   team: '✓',   ent: '✓'   },
      { feature: 'Logic & branching',     free: '—',      pro: '✓',   team: '✓',   ent: '✓'   },
      { feature: 'Question templates',    free: '—',      pro: '✓',   team: '✓',   ent: '✓'   },
    ],
  },
  {
    label: 'Responses & Limits',
    rows: [
      { feature: 'Responses / month',     free: '100',    pro: '1,000', team: '10,000', ent: '∞' },
      { feature: 'Storage',               free: '500 MB', pro: '5 GB',  team: '25 GB',  ent: '∞' },
      { feature: 'Response export CSV',   free: '—',      pro: '✓',   team: '✓',   ent: '✓'   },
      { feature: 'Excel / SPSS export',   free: '—',      pro: '—',   team: '✓',   ent: '✓'   },
      { feature: 'API access',            free: '—',      pro: '—',   team: '✓',   ent: '✓'   },
    ],
  },
  {
    label: 'Design & Sharing',
    rows: [
      { feature: 'Theme gallery',         free: '3 presets', pro: 'All', team: 'All', ent: 'All' },
      { feature: 'Custom colors & fonts', free: '—',         pro: '✓',   team: '✓',   ent: '✓'   },
      { feature: 'Remove branding',       free: '—',         pro: '✓',   team: '✓',   ent: '✓'   },
      { feature: 'White-label',           free: '—',         pro: '—',   team: '—',   ent: '✓'   },
      { feature: 'Public link',           free: '✓',         pro: '✓',   team: '✓',   ent: '✓'   },
      { feature: 'Embed + QR + Email',    free: '—',         pro: '✓',   team: '✓',   ent: '✓'   },
      { feature: 'Custom domain',         free: '—',         pro: '—',   team: '—',   ent: '✓'   },
    ],
  },
  {
    label: 'AI & Analytics',
    rows: [
      { feature: 'Basic analytics',       free: '✓',      pro: '✓',   team: '✓',   ent: '✓'   },
      { feature: 'AI Insights',           free: '3/mo',   pro: '✓',   team: '✓',   ent: '✓'   },
      { feature: 'Expert Review',         free: '3/mo',   pro: '✓',   team: '✓',   ent: '✓'   },
      { feature: 'Cross-tab analysis',    free: '—',      pro: '—',   team: '✓',   ent: '✓'   },
      { feature: 'Custom reports',        free: '—',      pro: '—',   team: '✓',   ent: '✓'   },
    ],
  },
  {
    label: 'Team & Security',
    rows: [
      { feature: 'Team seats',            free: '1',      pro: '1',   team: '10',  ent: '∞'   },
      { feature: 'Role-based access',     free: '—',      pro: '—',   team: '✓',   ent: '✓'   },
      { feature: 'Shared folders',        free: '—',      pro: '—',   team: '✓',   ent: '✓'   },
      { feature: 'SSO / SAML',           free: '—',      pro: '—',   team: '—',   ent: '✓'   },
      { feature: 'Audit log',             free: '—',      pro: '—',   team: '—',   ent: '✓'   },
    ],
  },
]

function UsageMeter({ label, used, limit, unit }: { label: string; used: number; limit: number | null; unit: string }) {
  const pct = limit == null ? 0 : Math.min((used / limit) * 100, 100)
  const isHigh = pct >= 95
  const isMid  = pct >= 80 && !isHigh
  const barColor = isHigh ? '#ef4444' : isMid ? '#f59e0b' : 'var(--accent)'

  return (
    <div style={{ flex: 1, minWidth: 0, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--grey)', marginBottom: 6 }}>{label}</div>
      {limit == null ? (
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>Unlimited</div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: isHigh ? '#ef4444' : 'var(--text)' }}>
              {used.toLocaleString()}
            </span>
            <span style={{ fontSize: 12, color: 'var(--grey)' }}>/ {limit.toLocaleString()} {unit}</span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width .4s ease' }} />
          </div>
          {isHigh && (
            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 5, fontWeight: 600 }}>
              Almost at limit — consider upgrading
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function BillingPage() {
  const [profile, setProfile]       = useState<BillingProfile | null>(null)
  const [logs, setLogs]             = useState<BillingLog[]>([])
  const [userId, setUserId]         = useState<string | null>(null)
  const [loading, setLoading]       = useState(true)
  const [banner, setBanner]         = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [showCompare, setShowCompare] = useState(false)

  const [tokenModal, setTokenModal] = useState<{ planId: PlanId; planName: string } | null>(null)
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

  const openTokenModal = (planId: PlanId, planName: string) => {
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
        setBanner({ type: 'success', msg: `Successfully upgraded to ${tokenModal.planName}! Your new limits are now active.` })
        await refreshBilling(userId)
      }
    } catch {
      setBanner({ type: 'error', msg: 'Network error. Please try again.' })
    }
    setProcessing(false)
    inFlight.current = false
  }

  const currentPlanId = profile?.plan ?? 'free'
  const planStatus    = profile?.plan_status ?? 'active'
  const limits        = PLAN_LIMITS[currentPlanId]
  const currentPlanData = PLANS.find(p => p.id === currentPlanId)

  const responsesUsed  = profile?.responses_used  ?? 0
  const storageMb      = profile?.storage_used_mb ?? 0
  const storageGb      = storageMb / 1024
  const seatsUsed      = profile?.seats_used      ?? 1

  const planOrder: PlanId[] = ['free', 'pro', 'team', 'enterprise']
  const currentPlanIndex = planOrder.indexOf(currentPlanId)

  return (
    <div>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Billing & Plan</h1>
      <div style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 24 }}>Manage your subscription, view usage, and compare plans.</div>

      {/* Banner */}
      {banner && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, fontWeight: 600,
          background: banner.type === 'success' ? 'var(--green-bg)' : 'var(--red-bg)',
          color: banner.type === 'success' ? 'var(--green)' : 'var(--red)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {banner.msg}
          <span onClick={() => setBanner(null)} style={{ cursor: 'pointer', opacity: .6, fontWeight: 400 }}>✕</span>
        </div>
      )}

      {/* ── Current plan card ── */}
      {loading ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', marginBottom: 20, color: 'var(--grey)', fontSize: 13 }}>Loading…</div>
      ) : (
        <div style={{
          background: 'var(--card)',
          border: `2px solid ${currentPlanData?.color ?? 'var(--border)'}`,
          borderRadius: 14, padding: '20px 24px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--grey)', marginBottom: 4 }}>Current plan</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: currentPlanData?.color }}>{currentPlanData?.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, ...(STATUS_STYLE[planStatus] ?? STATUS_STYLE.active) }}>
                  {planStatus.replace('_', ' ')}
                </span>
              </div>
              {currentPlanId === 'free' && <div style={{ fontSize: 12, color: 'var(--grey)' }}>No payment on file</div>}
              {currentPlanId !== 'free' && profile?.plan_period_end && (
                <div style={{ fontSize: 12, color: 'var(--green)' }}>
                  Renews {new Date(profile.plan_period_end).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {currentPlanId !== 'enterprise' && (
                <button
                  className="btn"
                  style={{ background: 'var(--accent)', padding: '8px 18px', fontSize: 13 }}
                  onClick={() => {
                    const next = PLANS[currentPlanIndex + 1]
                    if (next && !next.enterprise) openTokenModal(next.id, next.name)
                    else window.open('mailto:support@surveyai.com?subject=Enterprise Plan', '_blank')
                  }}
                >
                  {currentPlanIndex < 2 ? `Upgrade to ${PLANS[currentPlanIndex + 1]?.name}` : 'Contact us'}
                </button>
              )}
              {currentPlanId !== 'free' && (
                <button className="btn ghost" style={{ padding: '8px 16px', fontSize: 13 }}>Manage billing</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Usage meters ── */}
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Usage this month</div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <UsageMeter label="Responses" used={responsesUsed} limit={limits.responses} unit="/mo" />
        <UsageMeter label="Storage" used={parseFloat(storageGb.toFixed(2))} limit={limits.storage_gb} unit="GB" />
        <UsageMeter label="Team seats" used={seatsUsed} limit={limits.seats} unit="seats" />
      </div>

      {/* ── Plan comparison cards ── */}
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Plans</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {PLANS.map((plan, i) => {
          const isCurrent    = currentPlanId === plan.id
          const isDowngrade  = i < currentPlanIndex
          return (
            <div key={plan.id} style={{
              background: 'var(--card)',
              border: `2px solid ${isCurrent ? plan.color : 'var(--border)'}`,
              borderRadius: 12, padding: '18px 16px',
              position: 'relative',
              opacity: isDowngrade ? 0.55 : 1,
            }}>
              {plan.highlight && !isCurrent && (
                <div style={{
                  position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                  background: plan.color, color: 'white', fontSize: 10, fontWeight: 800,
                  letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 10px', borderRadius: 20,
                }}>Most popular</div>
              )}
              {isCurrent && (
                <div style={{
                  position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                  background: plan.color, color: 'white', fontSize: 10, fontWeight: 800,
                  letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 10px', borderRadius: 20,
                }}>Current plan</div>
              )}

              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, color: plan.color }}>{plan.name}</div>
              <div style={{ marginBottom: 14 }}>
                <span style={{ fontSize: plan.enterprise ? 18 : 24, fontWeight: 800 }}>{plan.price}</span>
                <span style={{ fontSize: 12, color: 'var(--grey)' }}>{plan.period}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, minHeight: 160 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12 }}>
                    <span style={{ color: plan.color, marginTop: 1, flexShrink: 0 }}>✓</span>
                    <span style={{ color: 'var(--text-2, var(--grey))' }}>{f}</span>
                  </div>
                ))}
              </div>

              {isCurrent ? (
                <div style={{ textAlign: 'center', padding: '8px 0', borderRadius: 8, background: `${plan.color}18`, color: plan.color, fontSize: 12, fontWeight: 700 }}>
                  ✓ Active
                </div>
              ) : plan.enterprise ? (
                <a href="mailto:support@surveyai.com?subject=Enterprise Plan" style={{
                  display: 'block', textAlign: 'center', padding: '8px 0', borderRadius: 8,
                  background: plan.color, color: 'white', fontSize: 12, fontWeight: 700,
                  textDecoration: 'none',
                }}>
                  Contact us
                </a>
              ) : isDowngrade ? (
                <div style={{ textAlign: 'center', padding: '8px 0', borderRadius: 8, background: 'var(--bg)', color: 'var(--grey)', fontSize: 12 }}>
                  Contact support to downgrade
                </div>
              ) : (
                <button
                  onClick={() => openTokenModal(plan.id, plan.name)}
                  disabled={loading}
                  className="btn"
                  style={{ width: '100%', padding: '8px 0', fontSize: 12, background: plan.color, border: 'none' }}
                >
                  Upgrade to {plan.name}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Compare all features ── */}
      <button
        onClick={() => setShowCompare(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: 'var(--accent)',
          padding: '6px 0', marginBottom: showCompare ? 16 : 28,
        }}
      >
        <span style={{ transform: showCompare ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform .2s' }}>▶</span>
        {showCompare ? 'Hide' : 'Compare all features'}
      </button>

      {showCompare && (
        <div style={{ overflow: 'auto', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--card)', fontSize: 12.5 }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--grey)', borderBottom: '2px solid var(--border)', background: 'var(--bg)' }}>Feature</th>
                {PLANS.map(p => (
                  <th key={p.id} style={{
                    padding: '10px 14px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: '.06em', color: p.color, borderBottom: '2px solid var(--border)',
                    background: 'var(--bg)', textAlign: 'center', borderTop: `3px solid ${p.color}`,
                    whiteSpace: 'nowrap',
                  }}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_SECTIONS.map((section, si) => (
                <>
                  <tr key={`s-${si}`}>
                    <td colSpan={5} style={{
                      padding: '8px 16px 5px',
                      fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em',
                      color: 'var(--grey)', background: 'var(--bg)',
                      borderTop: si > 0 ? '1px solid var(--border)' : 'none',
                      borderBottom: '1px solid var(--border)',
                    }}>{section.label}</td>
                  </tr>
                  {section.rows.map((row, ri) => {
                    const vals = [row.free, row.pro, row.team, row.ent]
                    return (
                      <tr key={`${si}-${ri}`} style={{ background: ri % 2 === 0 ? 'var(--card)' : 'var(--bg)' }}>
                        <td style={{ padding: '9px 16px', fontWeight: 500, color: 'var(--text)', borderBottom: '1px solid var(--border)' }}>{row.feature}</td>
                        {vals.map((v, vi) => {
                          const planId = planOrder[vi]
                          const isCur = planId === currentPlanId
                          return (
                            <td key={vi} style={{
                              padding: '9px 14px', textAlign: 'center',
                              borderBottom: '1px solid var(--border)',
                              fontWeight: isCur ? 700 : 400,
                              color: v === '✓' ? '#16a34a' : v === '—' ? 'var(--grey)' : isCur ? PLANS[vi].color : 'var(--text)',
                            }}>
                              {v}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Transaction history ── */}
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Transaction history</div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
        {logs.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--grey)', fontSize: 13, textAlign: 'center' }}>
            No transactions yet. Upgrade to see your billing history here.
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 80px 110px 80px',
              padding: '10px 18px', borderBottom: '1px solid var(--border)',
              fontSize: 10, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '.06em',
            }}>
              <span>Plan change</span>
              <span style={{ textAlign: 'right' }}>Amount</span>
              <span style={{ textAlign: 'center' }}>Status</span>
              <span style={{ textAlign: 'center' }}>Token</span>
              <span style={{ textAlign: 'right' }}>Date</span>
            </div>
            {logs.map((log, i) => (
              <div key={log.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 80px 110px 80px',
                padding: '11px 18px', borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none',
                fontSize: 13, alignItems: 'center',
              }}>
                <div>
                  <span style={{ textTransform: 'capitalize', color: 'var(--grey)' }}>{log.prev_plan}</span>
                  <span style={{ color: 'var(--grey)', margin: '0 6px' }}>→</span>
                  <span style={{ fontWeight: 700, textTransform: 'capitalize', color: 'var(--accent)' }}>{log.plan}</span>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{log.amount}</div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--green-bg)', color: 'var(--green)' }}>{log.status}</span>
                </div>
                <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 11, color: 'var(--grey)' }}>{log.token}</div>
                <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--grey)', fontVariantNumeric: 'tabular-nums' }}>
                  {new Date(log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--grey)', padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
        💳 Payments use a secure token-based system. Each upgrade is logged above. Contact <a href="mailto:support@surveyai.com" style={{ color: 'var(--accent)' }}>support@surveyai.com</a> to downgrade or for refunds.
      </div>

      {/* ── Token upgrade modal ── */}
      {tokenModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setTokenModal(null) }}
        >
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(0,0,0,.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 800 }}>Upgrade to {tokenModal.planName}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: PLANS.find(p => p.id === tokenModal.planId)?.color + '20', color: PLANS.find(p => p.id === tokenModal.planId)?.color }}>
                {PLANS.find(p => p.id === tokenModal.planId)?.price}{PLANS.find(p => p.id === tokenModal.planId)?.period}
              </span>
            </div>
            <div style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 24 }}>
              Enter your payment token to activate the {tokenModal.planName} plan. Your plan updates immediately upon successful verification.
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
                style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'monospace', outline: 'none', background: 'var(--bg)', color: 'var(--text)' }}
              />
              <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 6 }}>Token provided by your account manager or billing team.</div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => { setTokenModal(null); setBanner(null) }} disabled={processing}>Cancel</button>
              <button
                className="btn"
                onClick={handleTokenUpgrade}
                disabled={!token.trim() || processing}
                style={{ minWidth: 150, background: PLANS.find(p => p.id === tokenModal.planId)?.color }}
              >
                {processing ? <><span className="spinner" />Processing…</> : `Activate ${tokenModal.planName}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
