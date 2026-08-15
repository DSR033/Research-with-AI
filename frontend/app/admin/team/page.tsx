'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SYSTEM_ROLES, roleColorFor } from '../../../lib/permissions'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Role = string

/** Roles available for assignment. Loaded from /admin/roles, seeded from the
 *  system presets so the page works before the backend is reachable. */
interface AssignableRole { slug: string; name: string; description: string; color: string }

const FALLBACK_ASSIGNABLE: AssignableRole[] = SYSTEM_ROLES.map(r => ({
  slug: r.slug, name: r.name, description: r.description, color: r.color,
}))

interface Member { id: string; name: string; email: string; role: Role; joined: string; avatar: string }

const INITIAL_MEMBERS: Member[] = [
  { id: '1', name: 'Durgesh Singh', email: 'durgeshsingh700@gmail.com', role: 'owner', joined: 'Jun 23, 2026', avatar: 'D' },
]

export default function TeamPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('member')
  const [inviting, setInviting] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [assignable, setAssignable] = useState<AssignableRole[]>(FALLBACK_ASSIGNABLE)

  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/admin/roles`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data?.roles?.length) return
        setAssignable(data.roles.map((r: { slug: string; name: string; description: string }, i: number) => ({
          slug: r.slug, name: r.name, description: r.description, color: roleColorFor(r.slug, i),
        })))
      })
      .catch(() => { /* keep the preset fallback */ })
  }, [])

  const roleMeta = (slug: string): AssignableRole =>
    assignable.find(r => r.slug === slug)
      ?? { slug, name: slug, description: '', color: 'var(--grey)' }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError(null)
    try {
      const res = await fetch(`${API}/admin/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      if (!res.ok) {
        const err = await res.json()
        setInviteError(err.detail ?? 'Invite failed. Please try again.')
        setInviting(false)
        return
      }
      const sentEmail = inviteEmail.trim()
      const name = sentEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      setMembers(prev => [...prev, {
        id: String(Date.now()),
        name,
        email: sentEmail,
        role: inviteRole,
        joined: '📩 Invite pending',
        avatar: name[0]?.toUpperCase() ?? '?',
      }])
      setInviteEmail('')
      setShowInvite(false)
      setInviteSuccess(`Invite sent to ${sentEmail} — they'll receive a magic-link email to join.`)
      setTimeout(() => setInviteSuccess(null), 6000)
    } catch {
      setInviteError('Network error — is the backend running?')
    }
    setInviting(false)
  }

  const changeRole = (id: string, role: Role) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m))
    setEditingRole(null)
  }

  const removeMember = (id: string) => {
    if (!confirm('Remove this member?')) return
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: inviteSuccess ? 16 : 28 }}>
        <div>
          <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Team</h1>
          <div style={{ color: 'var(--grey)', fontSize: 13 }}>Manage who has access to your workspace and which role they hold.</div>
        </div>
        <button className="btn" onClick={() => { setShowInvite(true); setInviteError(null) }}>+ Invite Member</button>
      </div>

      {inviteSuccess && (
        <div style={{ padding: '12px 16px', background: 'var(--green-bg)', color: 'var(--green)', borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
          ✓ {inviteSuccess}
          <span onClick={() => setInviteSuccess(null)} style={{ cursor: 'pointer', opacity: 0.6, fontWeight: 400 }}>✕</span>
        </div>
      )}

      {/* Role guide */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Roles in this workspace</div>
          <button
            onClick={() => router.push('/admin/roles')}
            style={{ fontSize: 12, fontWeight: 600, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}
          >
            Manage roles &amp; permissions →
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {assignable.map(r => (
            <div key={r.slug} style={{ padding: 12, background: 'var(--bg)', borderRadius: 8, borderLeft: `3px solid ${r.color}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${r.color}18`, color: r.color }}>{r.name}</span>
              <div style={{ fontSize: 11.5, color: 'var(--grey)', marginTop: 8, lineHeight: 1.4 }}>{r.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Member list */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px 120px', padding: '10px 18px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--grey)', textTransform: 'uppercase' }}>
          <span>Member</span><span>Email</span><span>Role</span><span>Joined</span>
        </div>
        {members.map((m, i) => (
          <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px 120px', padding: '14px 18px', borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{m.avatar}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                {m.role === 'owner' && <div style={{ fontSize: 11, color: 'var(--grey)' }}>You</div>}
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--grey)' }}>{m.email}</div>
            <div style={{ position: 'relative' }}>
              {m.joined.startsWith('📩') ? (
                <button
                  onClick={async () => {
                    await fetch(`${API}/admin/invite`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: m.email, role: m.role }),
                    })
                    setInviteSuccess(`Invite resent to ${m.email}`)
                    setTimeout(() => setInviteSuccess(null), 4000)
                  }}
                  style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--amber)', background: 'white', color: 'var(--amber)', cursor: 'pointer' }}
                >
                  Resend
                </button>
              ) : m.role === 'owner' ? (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${roleMeta('owner').color}18`, color: roleMeta('owner').color }}>{roleMeta('owner').name}</span>
              ) : (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    onClick={() => setEditingRole(editingRole === m.id ? null : m.id)}
                    style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${roleMeta(m.role).color}18`, color: roleMeta(m.role).color, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {roleMeta(m.role).name} ▾
                  </button>
                  {editingRole === m.id && (
                    <div style={{ position: 'absolute', top: '110%', left: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 10, minWidth: 150, overflow: 'hidden' }}>
                      {assignable.filter(r => r.slug !== 'owner').map(r => (
                        <div key={r.slug} onClick={() => changeRole(m.id, r.slug)} style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', fontWeight: m.role === r.slug ? 600 : 400, color: m.role === r.slug ? 'var(--accent)' : 'var(--text)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                        >{r.name}</div>
                      ))}
                      <div onClick={() => removeMember(m.id)} style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--red)', borderTop: '1px solid var(--border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--red-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                      >Remove member</div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, color: m.joined.startsWith('📩') ? 'var(--amber)' : 'var(--grey)', fontWeight: m.joined.startsWith('📩') ? 600 : 400 }}>
              {m.joined}
            </div>
          </div>
        ))}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 28, width: 460, maxWidth: '94vw' }}>
            <h2 style={{ fontSize: 18, margin: '0 0 6px' }}>Invite a team member</h2>
            <div style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 20 }}>They&apos;ll receive an email invite to join your workspace.</div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Email address</label>
              <input
                autoFocus
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                placeholder="colleague@company.com"
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Role</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
                {assignable.filter(r => r.slug !== 'owner').map(r => (
                  <div
                    key={r.slug}
                    onClick={() => setInviteRole(r.slug)}
                    style={{ padding: '10px 8px', borderRadius: 8, border: `1.5px solid ${inviteRole === r.slug ? 'var(--accent)' : 'var(--border)'}`, background: inviteRole === r.slug ? '#F0F4FF' : 'white', cursor: 'pointer', textAlign: 'center' }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.name}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--grey)', marginTop: 3, lineHeight: 1.3 }}>{r.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {inviteError && (
              <div style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                {inviteError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <button className="btn ghost" onClick={() => { setShowInvite(false); setInviteError(null) }}>Cancel</button>
              <button className="btn" onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>
                {inviting ? <><span className="spinner" />Sending…</> : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
