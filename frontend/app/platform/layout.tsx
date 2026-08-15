'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase-browser'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const NAV = [
  { href: '/platform',           icon: '◈', label: 'Overview' },
  { href: '/platform/accounts',  icon: '◉', label: 'Accounts' },
]

// The platform panel is deliberately dark so it never reads as the customer-facing
// admin at /admin. If you can see this chrome, you are acting on every tenant.
const CHROME = '#0f172a'
const CHROME_2 = '#1e293b'
const EDGE = '#334155'
const ACCENT = '#f59e0b'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading')
  const [name, setName] = useState('')
  const [devBypass, setDevBypass] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        // No session. In dev, still open the panel so the UI can be built against
        // it — but flag it loudly so it is never mistaken for real authorisation.
        if (process.env.NODE_ENV === 'development') {
          setDevBypass(true); setStatus('allowed'); return
        }
        router.replace('/login'); return
      }
      try {
        const res = await fetch(`${API}/platform/me?user_id=${user.id}`)
        const data = res.ok ? await res.json() : { is_super_admin: false }
        setName(data.name || user.email || '')
        if (data.is_super_admin) { setStatus('allowed'); return }
      } catch {
        // Backend unreachable — fall through to the dev bypass below.
      }
      if (process.env.NODE_ENV === 'development') {
        setDevBypass(true); setStatus('allowed'); return
      }
      setStatus('denied')
    })
  }, [router])

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: CHROME, color: '#94a3b8', fontSize: 14 }}>
        Verifying platform access…
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div style={{ minHeight: '100vh', background: CHROME, color: '#e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>⛔</div>
        <h2 style={{ fontSize: 20, margin: 0 }}>Platform access required</h2>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: 14, maxWidth: 420, lineHeight: 1.5 }}>
          This panel manages every account on the instance and is restricted to platform
          administrators. Your account does not hold that flag.
        </p>
        <button
          onClick={() => router.push('/')}
          style={{ marginTop: 8, background: 'transparent', border: `1px solid ${EDGE}`, color: '#e2e8f0', borderRadius: 8, padding: '9px 18px', fontSize: 13, cursor: 'pointer' }}
        >
          Back to Surveys
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Top chrome */}
      <div style={{ background: CHROME, borderBottom: `1px solid ${EDGE}` }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: ACCENT, color: CHROME, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>◈</div>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>Platform Admin</span>
            </div>
            <span style={{ color: EDGE }}>|</span>
            <nav style={{ display: 'flex', gap: 4 }}>
              {NAV.map(n => {
                const active = pathname === n.href
                return (
                  <button
                    key={n.href}
                    onClick={() => router.push(n.href)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      background: active ? CHROME_2 : 'transparent',
                      border: 'none', borderRadius: 7, padding: '7px 13px',
                      color: active ? 'white' : '#94a3b8',
                      fontSize: 13, fontWeight: active ? 600 : 500, cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ color: active ? ACCENT : 'inherit' }}>{n.icon}</span>
                    {n.label}
                  </button>
                )
              })}
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {name && <span style={{ color: '#94a3b8', fontSize: 12.5 }}>{name}</span>}
            <button
              onClick={() => router.push('/admin/billing')}
              style={{ background: 'transparent', border: `1px solid ${EDGE}`, color: '#cbd5e1', borderRadius: 7, padding: '6px 13px', fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Exit to app
            </button>
          </div>
        </div>
      </div>

      {/* Scope warning — this panel writes across every tenant */}
      <div style={{
        background: devBypass ? '#7f1d1d' : '#78350f',
        borderBottom: `1px solid ${devBypass ? '#991b1b' : '#92400e'}`,
        color: devBypass ? '#fecaca' : '#fcd34d',
        fontSize: 12, fontWeight: 600, textAlign: 'center', padding: '7px 24px',
      }}>
        {devBypass
          ? '⚠ DEV BYPASS — access is not verified in development. Real access requires profiles.is_super_admin.'
          : '⚠ You are acting across all tenants. Plan changes take effect immediately and are logged.'}
      </div>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 64px' }}>
        {children}
      </div>
    </div>
  )
}
