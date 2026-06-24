'use client'
import { usePathname, useRouter } from 'next/navigation'
import TopBar from '../../components/TopBar'

const NAV = [
  { href: '/admin/billing', icon: '💳', label: 'Billing & Plan' },
  { href: '/admin/team', icon: '👥', label: 'Team & Roles' },
  { href: '/admin/settings', icon: '⚙️', label: 'Org Settings' },
  { href: '/admin/usage', icon: '📊', label: 'Usage & Costs' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopBar activeLabel="Admin" />

      <div style={{ display: 'flex', maxWidth: 1120, margin: '0 auto', padding: '32px 24px', gap: 28 }}>
        {/* Sidebar */}
        <div style={{ width: 210, flexShrink: 0 }}>
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
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </div>
  )
}
