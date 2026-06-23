'use client'
import { useState } from 'react'

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    current: true,
    features: ['500 responses/mo', '1 org member', 'Basic analytics', 'Web & embed distribution'],
    color: 'var(--border)',
    textColor: 'var(--text)',
  },
  {
    name: 'Starter',
    price: '$29',
    period: '/mo',
    current: false,
    features: ['5,000 responses/mo', '5 org members', 'AI analysis (sentiment + themes)', 'Email distribution', 'Custom branding'],
    color: 'var(--accent)',
    textColor: 'white',
    highlight: true,
  },
  {
    name: 'Pro',
    price: '$79',
    period: '/mo',
    current: false,
    features: ['Unlimited responses', 'Unlimited members', 'Full AI suite + Verdict Reports', 'Advanced logic & TURF', 'Custom domain + white-label'],
    color: 'var(--ai)',
    textColor: 'white',
  },
]

const INVOICES = [
  { date: 'Jun 1, 2026', plan: 'Free', amount: '$0.00', status: 'paid' },
  { date: 'May 1, 2026', plan: 'Free', amount: '$0.00', status: 'paid' },
  { date: 'Apr 1, 2026', plan: 'Free', amount: '$0.00', status: 'paid' },
]

export default function BillingPage() {
  const [upgrading, setUpgrading] = useState<string | null>(null)

  return (
    <div>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Billing & Plan</h1>
      <div style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 28 }}>Manage your subscription, plan, and payment details.</div>

      {/* Current plan banner */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 4 }}>Current plan</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Free</div>
          <div style={{ fontSize: 13, color: 'var(--grey)', marginTop: 4 }}>Renews automatically · no credit card on file</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 6 }}>This month's usage</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>0 / 500 responses</div>
          <div style={{ marginTop: 8, width: 180, height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: '0%', height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Choose a plan</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 32 }}>
        {PLANS.map(plan => (
          <div
            key={plan.name}
            style={{
              background: plan.highlight ? '#F0F4FF' : 'var(--card)',
              border: `2px solid ${plan.highlight ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 12, padding: 20,
            }}
          >
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
            {plan.current ? (
              <div style={{ textAlign: 'center', padding: '9px 0', borderRadius: 8, background: 'var(--bg)', color: 'var(--grey)', fontSize: 13, fontWeight: 600 }}>Current plan</div>
            ) : (
              <button
                onClick={() => { setUpgrading(plan.name); setTimeout(() => { alert(`Stripe checkout for ${plan.name} plan — wires in with billing integration.`); setUpgrading(null) }, 400) }}
                disabled={upgrading === plan.name}
                style={{
                  width: '100%', padding: '9px 0', borderRadius: 8, border: 'none',
                  background: plan.highlight ? 'var(--accent)' : 'var(--text)',
                  color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {upgrading === plan.name ? 'Redirecting…' : `Upgrade to ${plan.name}`}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Invoice history */}
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Invoice history</div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px', padding: '10px 18px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--grey)', textTransform: 'uppercase' }}>
          <span>Date</span><span>Plan</span><span>Amount</span><span>Status</span>
        </div>
        {INVOICES.map((inv, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px', padding: '12px 18px', borderBottom: i < INVOICES.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13, alignItems: 'center' }}>
            <span>{inv.date}</span>
            <span>{inv.plan}</span>
            <span>{inv.amount}</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: 'var(--green-bg)', color: 'var(--green)', width: 'fit-content' }}>{inv.status}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--grey)' }}>
        Billing powered by Stripe · <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>Manage payment method</span>
      </div>
    </div>
  )
}
