'use client'
import { useState } from 'react'

const ROLES = ['owner', 'admin', 'member', 'viewer'] as const
type Role = typeof ROLES[number]

const ROLE_DESC: Record<Role, string> = {
  owner: 'Full access — billing, team, settings, all surveys',
  admin: 'Team management + org settings, no billing',
  member: 'Create and manage own surveys',
  viewer: 'Read-only access to surveys and results',
}

const ROLE_COLOR: Record<Role, { bg: string; text: string }> = {
  owner: { bg: 'var(--amber-bg)', text: 'var(--amber)' },
  admin: { bg: '#EEF2FF', text: 'var(--accent)' },
  member: { bg: 'var(--green-bg)', text: 'var(--green)' },
  viewer: { bg: 'var(--bg)', text: 'var(--grey)' },
}

interface Member { id: string; name: string; email: string; role: Role; joined: string; avatar: string }

const INITIAL_MEMBERS: Member[] = [
  { id: '1', name: 'Durgesh Singh', email: 'durgeshsingh700@gmail.com', role: 'owner', joined: 'Jun 23, 2026', avatar: 'D' },
]

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('member')
  const [inviting, setInviting] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [editingRole, setEditingRole] = useState<string | null>(null)

  const handleInvite = () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setTimeout(() => {
      const name = inviteEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      setMembers(prev => [...prev, {
        id: String(Date.now()),
        name,
        email: inviteEmail.trim(),
        role: inviteRole,
        joined: 'Pending invite',
        avatar: name[0]?.toUpperCase() ?? '?',
      }])
      setInviteEmail('')
      setShowInvite(false)
      setInviting(false)
    }, 700)
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Team & Roles</h1>
          <div style={{ color: 'var(--grey)', fontSize: 13 }}>Manage who has access to your workspace and what they can do.</div>
        </div>
        <button className="btn" onClick={() => setShowInvite(true)}>+ Invite Member</button>
      </div>

      {/* Role guide */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Role permissions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {ROLES.map(r => (
            <div key={r} style={{ padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: ROLE_COLOR[r].bg, color: ROLE_COLOR[r].text }}>{r}</span>
              <div style={{ fontSize: 11.5, color: 'var(--grey)', marginTop: 8, lineHeight: 1.4 }}>{ROLE_DESC[r]}</div>
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
              {m.role === 'owner' ? (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: ROLE_COLOR.owner.bg, color: ROLE_COLOR.owner.text }}>{m.role}</span>
              ) : (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    onClick={() => setEditingRole(editingRole === m.id ? null : m.id)}
                    style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: ROLE_COLOR[m.role].bg, color: ROLE_COLOR[m.role].text, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {m.role} ▾
                  </button>
                  {editingRole === m.id && (
                    <div style={{ position: 'absolute', top: '110%', left: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 10, minWidth: 130, overflow: 'hidden' }}>
                      {ROLES.filter(r => r !== 'owner').map(r => (
                        <div key={r} onClick={() => changeRole(m.id, r)} style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', fontWeight: m.role === r ? 600 : 400, color: m.role === r ? 'var(--accent)' : 'var(--text)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                        >{r}</div>
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
            <div style={{ fontSize: 12, color: 'var(--grey)' }}>{m.joined}</div>
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
              <div style={{ display: 'flex', gap: 8 }}>
                {(['admin', 'member', 'viewer'] as Role[]).map(r => (
                  <div
                    key={r}
                    onClick={() => setInviteRole(r)}
                    style={{ flex: 1, padding: '10px 8px', borderRadius: 8, border: `1.5px solid ${inviteRole === r ? 'var(--accent)' : 'var(--border)'}`, background: inviteRole === r ? '#F0F4FF' : 'white', cursor: 'pointer', textAlign: 'center' }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: ROLE_COLOR[r].text }}>{r}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--grey)', marginTop: 3, lineHeight: 1.3 }}>{ROLE_DESC[r].split(' — ')[1]}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <button className="btn ghost" onClick={() => setShowInvite(false)}>Cancel</button>
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
