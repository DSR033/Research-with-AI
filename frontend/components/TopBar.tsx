'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../lib/supabase-browser'

interface NavItem { label: string; href: string }

const NAV: NavItem[] = [
  { label: 'Surveys', href: '/' },
  { label: 'Templates', href: '/templates' },
  { label: 'Team', href: '/admin/team' },
  { label: 'Billing', href: '/admin/billing' },
]

export default function TopBar({ activeLabel }: { activeLabel?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({
          email: user.email,
          name: user.user_metadata?.full_name as string | undefined,
        })
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ email: session.user.email, name: session.user.user_metadata?.full_name })
      } else {
        setUser(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?'

  const active = activeLabel ?? (pathname === '/' ? 'Surveys' : NAV.find(n => n.href !== '/' && pathname.startsWith(n.href))?.label)

  return (
    <div className="topbar-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '12px 24px', position: 'sticky', top: 0, zIndex: 40 }}>

      <div onClick={() => router.push('/')} style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent)', cursor: 'pointer' }}>
        SurveyAI
      </div>

      <div className="topbar-nav" style={{ display: 'flex', gap: 24, fontSize: 14 }}>
        {NAV.map(n => (
          <span
            key={n.label}
            onClick={() => router.push(n.href)}
            style={{ cursor: 'pointer', color: active === n.label ? 'var(--accent)' : 'var(--grey)', fontWeight: active === n.label ? 600 : 400 }}
          >
            {n.label}
          </span>
        ))}
      </div>

      {/* User avatar + dropdown */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <div
          onClick={() => setMenuOpen(o => !o)}
          style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
        >
          {initials}
        </div>

        {menuOpen && (
          <div style={{ position: 'absolute', top: '110%', right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 200, zIndex: 50, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{user?.name ?? 'User'}</div>
              <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2, wordBreak: 'break-all' }}>{user?.email}</div>
            </div>
            {[
              { label: '⚙️ Org Settings', href: '/admin/settings' },
              { label: '👥 Team', href: '/admin/team' },
              { label: '💳 Billing', href: '/admin/billing' },
            ].map(item => (
              <div
                key={item.href}
                onClick={() => { router.push(item.href); setMenuOpen(false) }}
                style={{ padding: '10px 16px', fontSize: 13, cursor: 'pointer', color: 'var(--text)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                {item.label}
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <div
                onClick={handleSignOut}
                style={{ padding: '10px 16px', fontSize: 13, cursor: 'pointer', color: 'var(--red)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--red-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                Sign out
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
