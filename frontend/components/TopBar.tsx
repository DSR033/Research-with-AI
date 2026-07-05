'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '../lib/supabase-browser'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface NavItem { label: string; href: string }

const NAV: NavItem[] = [
  { label: 'Surveys', href: '/' },
  { label: 'Templates', href: '/templates' },
  { label: 'Team', href: '/admin/team' },
  { label: 'Billing', href: '/admin/billing' },
]

interface Notification {
  id: string
  type: string
  title: string
  message?: string
  survey_id?: string
  link?: string
  read: boolean
  created_at: string
}

const TYPE_ICON: Record<string, string> = {
  new_response: '📩',
  milestone:    '🎉',
  plan_upgrade: '💳',
  team_invite:  '👥',
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60)   return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export default function TopBar({ activeLabel }: { activeLabel?: string }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const [user, setUser]           = useState<{ id?: string; email?: string; name?: string } | null>(null)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [bellOpen, setBellOpen]   = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread]       = useState(0)

  const menuRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser({ id: user.id, email: user.email, name: user.user_metadata?.full_name })
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) setUser({ id: session.user.id, email: session.user.email, name: session.user.user_metadata?.full_name })
      else setUser(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Fetch notifications (poll every 30s) ──────────────────────────────────
  const fetchNotifications = useCallback(async (uid: string) => {
    try {
      const [notifRes, countRes] = await Promise.all([
        fetch(`${API}/notifications?user_id=${uid}&limit=15`),
        fetch(`${API}/notifications/unread-count?user_id=${uid}`),
      ])
      if (notifRes.ok) setNotifications(await notifRes.json())
      if (countRes.ok) setUnread((await countRes.json()).count)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    fetchNotifications(user.id)
    const interval = setInterval(() => fetchNotifications(user.id!), 30000)
    return () => clearInterval(interval)
  }, [user?.id, fetchNotifications])

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const markRead = async (n: Notification) => {
    if (!user?.id || n.read) return
    await fetch(`${API}/notifications/${n.id}/read`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    })
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
    setUnread(u => Math.max(0, u - 1))
    if (n.link) { setBellOpen(false); router.push(n.link) }
  }

  const markAllRead = async () => {
    if (!user?.id) return
    await fetch(`${API}/notifications/read-all`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    })
    setNotifications(prev => prev.map(x => ({ ...x, read: true })))
    setUnread(0)
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?'

  const active = activeLabel ?? (pathname === '/' ? 'Surveys' : NAV.find(n => n.href !== '/' && pathname.startsWith(n.href))?.label)

  return (
    <div className="topbar-inner" style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(219,39,119,.12)', padding: '0 24px', height: 62, position: 'sticky', top: 0, zIndex: 40 }}>

      {/* Logo */}
      <div onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(219,39,119,.35)' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        </div>
        <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 18, letterSpacing: '-.02em', color: '#18181b' }}>SurveyAI</span>
      </div>

      <div style={{ width: 1, height: 28, background: '#e4e4e7', margin: '0 18px', flexShrink: 0 }} />

      <div className="topbar-nav" style={{ display: 'flex', gap: 2, flex: 1 }}>
        {NAV.map(n => (
          <span key={n.label} onClick={() => router.push(n.href)}
            style={{ cursor: 'pointer', padding: '7px 12px', borderRadius: 8, color: active === n.label ? 'var(--accent)' : '#52525b', fontWeight: active === n.label ? 700 : 500, background: active === n.label ? '#fdf2f8' : 'transparent', fontSize: 14, whiteSpace: 'nowrap' }}>
            {n.label}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* ── Bell icon ── */}
        {user?.id && (
          <div ref={bellRef} style={{ position: 'relative' }}>
            <div onClick={() => { setBellOpen(o => !o); setMenuOpen(false) }}
              style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
              <span style={{ fontSize: 16 }}>🔔</span>
              {unread > 0 && (
                <span style={{
                  position: 'absolute', top: -3, right: -3, minWidth: 17, height: 17,
                  background: 'var(--red)', color: 'white', borderRadius: 99,
                  fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </div>

            {bellOpen && (
              <div style={{ position: 'absolute', top: '110%', right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 340, zIndex: 50, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Notifications {unread > 0 && <span style={{ fontSize: 11, background: 'var(--red)', color: 'white', padding: '1px 6px', borderRadius: 99, marginLeft: 6 }}>{unread}</span>}</div>
                  {unread > 0 && (
                    <button onClick={markAllRead} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--grey)', fontSize: 13 }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                      No notifications yet
                    </div>
                  ) : notifications.map(n => (
                    <div key={n.id} onClick={() => markRead(n)}
                      style={{
                        display: 'flex', gap: 10, padding: '12px 16px', cursor: n.link ? 'pointer' : 'default',
                        background: n.read ? 'white' : '#F5F8FF',
                        borderBottom: '1px solid var(--border)',
                        borderLeft: `3px solid ${n.read ? 'transparent' : 'var(--accent)'}`,
                      }}
                      onMouseEnter={e => { if (n.link) (e.currentTarget as HTMLElement).style.background = 'var(--bg)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = n.read ? 'white' : '#F5F8FF' }}>
                      <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{TYPE_ICON[n.type] ?? '📌'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: 'var(--text)', lineHeight: 1.3 }}>{n.title}</div>
                        {n.message && <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 2, lineHeight: 1.4 }}>{n.message}</div>}
                        <div style={{ fontSize: 10, color: 'var(--grey)', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                      </div>
                      {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 6 }} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── User avatar + dropdown ── */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <div onClick={() => { setMenuOpen(o => !o); setBellOpen(false) }}
            style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#db2777,#be185d)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, cursor: 'pointer', userSelect: 'none', fontFamily: "'Schibsted Grotesk', system-ui", boxShadow: '0 2px 8px rgba(219,39,119,.35)' }}>
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
                <div key={item.href} onClick={() => { router.push(item.href); setMenuOpen(false) }}
                  style={{ padding: '10px 16px', fontSize: 13, cursor: 'pointer', color: 'var(--text)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                  {item.label}
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)' }}>
                <div onClick={handleSignOut}
                  style={{ padding: '10px 16px', fontSize: 13, cursor: 'pointer', color: 'var(--red)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--red-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                  Sign out
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
