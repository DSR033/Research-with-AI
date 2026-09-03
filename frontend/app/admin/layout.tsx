'use client'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import TopBar from '../../components/TopBar'
import { createClient } from '../../lib/supabase-browser'

const NAV = [
  { href: '/admin/billing', icon: '💳', label: 'Billing & Plan' },
  { href: '/admin/team', icon: '👥', label: 'Team' },
  { href: '/admin/roles', icon: '🔑', label: 'Roles & Permissions' },
  { href: '/admin/settings', icon: '⚙️', label: 'Org Settings' },
  { href: '/admin/usage', icon: '📊', label: 'Usage & Costs' },
  { href: '/admin/gdpr', icon: '🔒', label: 'Privacy & Data' },
]

const ADMIN_ROLES = ['owner', 'admin']

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading')
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    // Dev bypass — skip auth so any tester can access admin panel
    if (process.env.NODE_ENV === 'development') {
      setRole('owner')
      setStatus('allowed')
      return
    }
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const userRole = profile?.role ?? 'member'
      setRole(userRole)
      setStatus(ADMIN_ROLES.includes(userRole) ? 'allowed' : 'denied')
    })
  }, [router])

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--grey)' }}>
        Checking permissions…
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <TopBar activeLabel="Admin" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 57px)', gap: 12 }}>
          <div style={{ fontSize: 40 }}>🔒</div>
          <h2 style={{ fontSize: 20, margin: 0 }}>Access Denied</h2>
          <p style={{ color: 'var(--grey)', margin: 0, fontSize: 14 }}>
            Your role (<strong>{role}</strong>) doesn't have permission to access the Admin Panel.
          </p>
          <p style={{ color: 'var(--grey)', margin: 0, fontSize: 13 }}>Contact your workspace owner to request access.</p>
          <button className="btn secondary" style={{ marginTop: 8 }} onClick={() => router.push('/')}>
            Back to Surveys
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopBar activeLabel="Admin" />

      {/* Mobile nav — horizontal scrollable tabs, hidden on desktop via CSS */}
      <div className="admin-mobile-nav" style={{
        display: 'none', overflowX: 'auto' as const, borderBottom: '1px solid var(--border)',
        background: 'var(--card)', padding: '0 16px', gap: 0,
        scrollbarWidth: 'none' as const,
      }}>
        {NAV.map(n => (
          <div key={n.href} onClick={() => router.push(n.href)} style={{
            padding: '12px 16px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            borderBottom: `2px solid ${pathname === n.href ? 'var(--accent)' : 'transparent'}`,
            color: pathname === n.href ? 'var(--accent)' : 'var(--grey)', cursor: 'pointer', flexShrink: 0,
          }}>
            {n.icon} {n.label}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', maxWidth: 1120, margin: '0 auto', padding: '32px 24px', gap: 28 }}>
        {/* Sidebar */}
        <div className="admin-sidebar" style={{ width: 210, flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Admin Panel</div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map(n => {
              const active = pathname === n.href
              return (
                <div
                  key={n.href}
                  onClick={() => router.push(n.href)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: active ? 600 : 400,
                    background: active ? '#EEF2FF' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text)',
                  }}
                >
                  <span>{n.icon}</span>
                  <span>{n.label}</span>
                </div>
              )
            })}
          </nav>

          <div style={{ marginTop: 24, padding: '14px', background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ai)', marginBottom: 6 }}>Free Plan</div>
            <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>500 responses / mo · 1 org member</div>
            <button
              onClick={() => router.push('/admin/billing')}
              style={{ width: '100%', background: 'var(--ai)', color: 'white', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Upgrade Plan
            </button>
          </div>

          {role && (
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--grey)', textAlign: 'center' }}>
              Your role: <strong style={{ color: 'var(--accent)' }}>{role}</strong>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="admin-content" style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </div>
  )
}
