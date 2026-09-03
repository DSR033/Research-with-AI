'use client'
import { useState, useEffect } from 'react'
import {
  PERMISSION_GROUPS,
  ALL_PERMISSIONS,
  SYSTEM_ROLES,
  roleColorFor,
  hasFullAccess,
  slugify,
} from '../../../lib/permissions'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Role {
  id: string
  slug: string
  name: string
  description: string
  permissions: string[]
  is_system: boolean
  member_count: number
}

/** Shape used by the create/edit modal. `id` is null when creating. */
interface RoleDraft {
  id: string | null
  name: string
  description: string
  permissions: string[]
  is_system: boolean
  slug: string
}

const FALLBACK_ROLES: Role[] = SYSTEM_ROLES.map(r => ({
  id: `system-${r.slug}`,
  slug: r.slug,
  name: r.name,
  description: r.description,
  permissions: r.permissions,
  is_system: true,
  member_count: r.slug === 'owner' ? 1 : 0,
}))

export default function RolesPage() {
  const [roles, setRoles]     = useState<Role[]>(FALLBACK_ROLES)
  const [loading, setLoading] = useState(true)
  const [banner, setBanner]   = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const [draft, setDraft]           = useState<RoleDraft | null>(null)
  const [saving, setSaving]         = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Role | null>(null)

  useEffect(() => { loadRoles() }, [])

  const loadRoles = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/admin/roles`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.roles) && data.roles.length > 0) setRoles(data.roles)
      }
    } catch {
      // Backend not reachable — keep the system-role fallback so the page stays usable.
    }
    setLoading(false)
  }

  const flash = (type: 'success' | 'error', msg: string) => {
    setBanner({ type, msg })
    setTimeout(() => setBanner(null), 5000)
  }

  // ── Draft helpers ──────────────────────────────────────────────────────────

  const openCreate = () => setDraft({
    id: null, name: '', description: '', permissions: [], is_system: false, slug: '',
  })

  const openEdit = (role: Role) => setDraft({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: [...role.permissions],
    is_system: role.is_system,
    slug: role.slug,
  })

  const openDuplicate = (role: Role) => setDraft({
    id: null,
    name: `${role.name} (copy)`,
    description: role.description,
    permissions: [...role.permissions],
    is_system: false,
    slug: '',
  })

  const togglePerm = (key: string) => {
    if (!draft) return
    setDraft({
      ...draft,
      permissions: draft.permissions.includes(key)
        ? draft.permissions.filter(p => p !== key)
        : [...draft.permissions, key],
    })
  }

  const toggleGroup = (groupKeys: string[], allOn: boolean) => {
    if (!draft) return
    setDraft({
      ...draft,
      permissions: allOn
        ? draft.permissions.filter(p => !groupKeys.includes(p))
        : Array.from(new Set([...draft.permissions, ...groupKeys])),
    })
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  const saveDraft = async () => {
    if (!draft) return
    const name = draft.name.trim()
    if (!name) { flash('error', 'Role name is required.'); return }
    if (draft.permissions.length === 0) { flash('error', 'Select at least one permission.'); return }

    const clashes = roles.some(r =>
      r.id !== draft.id && r.name.toLowerCase() === name.toLowerCase()
    )
    if (clashes) { flash('error', `A role named "${name}" already exists.`); return }

    setSaving(true)
    const isNew = draft.id === null
    const body = {
      name,
      description: draft.description.trim(),
      permissions: draft.permissions,
      slug: draft.slug || slugify(name),
    }

    try {
      const res = await fetch(
        isNew ? `${API}/admin/roles` : `${API}/admin/roles/${draft.id}`,
        {
          method: isNew ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      if (res.ok) {
        const saved = await res.json()
        setRoles(prev => isNew
          ? [...prev, saved.role]
          : prev.map(r => r.id === draft.id ? { ...r, ...saved.role } : r))
      } else {
        // Backend unavailable — apply locally so the workflow can still be exercised.
        applyDraftLocally(isNew, body)
      }
    } catch {
      applyDraftLocally(isNew, body)
    }

    flash('success', isNew ? `Role "${name}" created.` : `Role "${name}" updated.`)
    setDraft(null)
    setSaving(false)
  }

  const applyDraftLocally = (isNew: boolean, body: { name: string; description: string; permissions: string[]; slug: string }) => {
    if (isNew) {
      setRoles(prev => [...prev, {
        id: `local-${Date.now()}`,
        slug: body.slug,
        name: body.name,
        description: body.description,
        permissions: body.permissions,
        is_system: false,
        member_count: 0,
      }])
    } else {
      setRoles(prev => prev.map(r => r.id === draft?.id ? { ...r, ...body } : r))
    }
  }

  const deleteRole = async (role: Role) => {
    setConfirmDelete(null)
    try {
      await fetch(`${API}/admin/roles/${role.id}`, { method: 'DELETE' })
    } catch {
      // fall through — remove locally regardless
    }
    setRoles(prev => prev.filter(r => r.id !== role.id))
    flash('success', `Role "${role.name}" deleted.`)
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const customCount = roles.filter(r => !r.is_system).length
  const draftIsOwner = draft?.slug === 'owner'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Roles &amp; Permissions</h1>
          <div style={{ color: 'var(--grey)', fontSize: 13 }}>
            Define what each role can do, then assign roles to members from Team.
          </div>
        </div>
        <button className="btn" onClick={openCreate}>+ Create Role</button>
      </div>

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

      {/* Plan notice — informational only while everything is unlocked */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 10,
        padding: '12px 16px', marginBottom: 24, fontSize: 12.5, lineHeight: 1.5,
      }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>🔑</span>
        <div style={{ color: 'var(--text)' }}>
          <strong style={{ color: '#4f46e5' }}>Custom roles are a Team plan feature.</strong>{' '}
          They are open to everyone during the current release — no limits applied yet. The four
          system roles below stay available on every plan.
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total roles',    value: roles.length },
          { label: 'System roles',   value: roles.length - customCount },
          { label: 'Custom roles',   value: customCount },
          { label: 'Permissions',    value: ALL_PERMISSIONS.length },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 120, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--grey)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Role list */}
      {loading ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, color: 'var(--grey)', fontSize: 13 }}>
          Loading roles…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {roles.map((role, i) => {
            const color = roleColorFor(role.slug, i)
            const full  = hasFullAccess(role.permissions)
            const isOwner = role.slug === 'owner'
            return (
              <div key={role.id} style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderLeft: `4px solid ${color}`, borderRadius: 10,
                padding: '16px 18px', display: 'flex', alignItems: 'flex-start',
                justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color }}>{role.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: 20,
                      background: role.is_system ? 'var(--bg)' : `${color}18`,
                      color: role.is_system ? 'var(--grey)' : color,
                      border: `1px solid ${role.is_system ? 'var(--border)' : color + '40'}`,
                    }}>
                      {role.is_system ? 'System' : 'Custom'}
                    </span>
                    {isOwner && <span style={{ fontSize: 11, color: 'var(--grey)' }}>🔒 Locked</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--grey)', marginBottom: 8, lineHeight: 1.45 }}>
                    {role.description || 'No description.'}
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: 'var(--grey)', flexWrap: 'wrap' }}>
                    <span>
                      <strong style={{ color: 'var(--text)' }}>
                        {full ? 'All' : role.permissions.length}
                      </strong>{' '}
                      of {ALL_PERMISSIONS.length} permissions
                    </span>
                    <span>
                      <strong style={{ color: 'var(--text)' }}>{role.member_count}</strong>{' '}
                      {role.member_count === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => openEdit(role)}
                    disabled={isOwner}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 7,
                      border: '1px solid var(--border)', background: 'var(--card)',
                      color: isOwner ? 'var(--grey)' : 'var(--text)',
                      cursor: isOwner ? 'not-allowed' : 'pointer', opacity: isOwner ? .5 : 1,
                    }}
                  >
                    {role.is_system ? 'Edit permissions' : 'Edit'}
                  </button>
                  <button
                    onClick={() => openDuplicate(role)}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 7,
                      border: '1px solid var(--border)', background: 'var(--card)',
                      color: 'var(--text)', cursor: 'pointer',
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => setConfirmDelete(role)}
                    disabled={role.is_system}
                    title={role.is_system ? 'System roles cannot be deleted' : 'Delete role'}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 7,
                      border: `1px solid ${role.is_system ? 'var(--border)' : 'var(--red)'}`,
                      background: 'var(--card)',
                      color: role.is_system ? 'var(--grey)' : 'var(--red)',
                      cursor: role.is_system ? 'not-allowed' : 'pointer',
                      opacity: role.is_system ? .5 : 1,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create / edit modal ── */}
      {draft && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget && !saving) setDraft(null) }}
        >
          <div style={{
            background: 'var(--card)', borderRadius: 16, width: '100%', maxWidth: 720,
            maxHeight: '88vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,.2)', overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>
                {draft.id ? `Edit ${draft.name}` : 'Create a role'}
              </h2>
              <div style={{ fontSize: 12.5, color: 'var(--grey)' }}>
                {draft.is_system
                  ? 'This is a system role. Its name is fixed, but you can adjust what it grants.'
                  : 'Give the role a name, then pick exactly what it can do.'}
              </div>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px 26px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Role name</label>
                  <input
                    autoFocus={!draft.is_system}
                    value={draft.name}
                    disabled={draft.is_system}
                    onChange={e => setDraft({ ...draft, name: e.target.value })}
                    placeholder="e.g. Survey Analyst"
                    style={{
                      width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
                      padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                      background: draft.is_system ? 'var(--bg)' : 'var(--card)',
                      color: draft.is_system ? 'var(--grey)' : 'var(--text)',
                    }}
                  />
                </div>
                <div style={{ flex: 2, minWidth: 240 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Description</label>
                  <input
                    value={draft.description}
                    onChange={e => setDraft({ ...draft, description: e.target.value })}
                    placeholder="What this role is for"
                    style={{
                      width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
                      padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
                      background: 'var(--card)', color: 'var(--text)',
                    }}
                  />
                </div>
              </div>

              {/* Permission matrix */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600 }}>
                  Permissions
                  <span style={{ color: 'var(--grey)', fontWeight: 400, marginLeft: 6 }}>
                    {draft.permissions.length} of {ALL_PERMISSIONS.length} selected
                  </span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setDraft({ ...draft, permissions: [...ALL_PERMISSIONS] })}
                    style={{ fontSize: 11.5, fontWeight: 600, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}
                  >
                    Select all
                  </button>
                  <span style={{ color: 'var(--border)' }}>|</span>
                  <button
                    onClick={() => setDraft({ ...draft, permissions: [] })}
                    style={{ fontSize: 11.5, fontWeight: 600, background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PERMISSION_GROUPS.map(group => {
                  const groupKeys = group.perms.map(p => p.key)
                  const selected  = groupKeys.filter(k => draft.permissions.includes(k))
                  const allOn     = selected.length === groupKeys.length
                  const someOn    = selected.length > 0 && !allOn

                  return (
                    <div key={group.key} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div
                        onClick={() => toggleGroup(groupKeys, allOn)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', cursor: 'pointer',
                          background: allOn ? '#EEF2FF' : someOn ? 'var(--bg)' : 'var(--bg)',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <span style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          border: `1.5px solid ${allOn || someOn ? 'var(--accent)' : 'var(--border)'}`,
                          background: allOn ? 'var(--accent)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontSize: 11, fontWeight: 800, lineHeight: 1,
                        }}>
                          {allOn ? '✓' : someOn ? <span style={{ width: 7, height: 2, background: 'var(--accent)', borderRadius: 1 }} /> : ''}
                        </span>
                        <span style={{ fontSize: 13 }}>{group.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{group.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--grey)', fontVariantNumeric: 'tabular-nums' }}>
                          {selected.length}/{groupKeys.length}
                        </span>
                      </div>

                      <div>
                        {group.perms.map((perm, pi) => {
                          const on = draft.permissions.includes(perm.key)
                          return (
                            <div
                              key={perm.key}
                              onClick={() => togglePerm(perm.key)}
                              style={{
                                display: 'flex', alignItems: 'flex-start', gap: 10,
                                padding: '9px 14px 9px 40px', cursor: 'pointer',
                                borderBottom: pi < group.perms.length - 1 ? '1px solid var(--border)' : 'none',
                                background: on ? 'rgba(79,70,229,0.04)' : 'transparent',
                              }}
                            >
                              <span style={{
                                width: 15, height: 15, borderRadius: 4, flexShrink: 0, marginTop: 1,
                                border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                                background: on ? 'var(--accent)' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: 10, fontWeight: 800, lineHeight: 1,
                              }}>
                                {on ? '✓' : ''}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{perm.label}</div>
                                <div style={{ fontSize: 11.5, color: 'var(--grey)', lineHeight: 1.4 }}>{perm.desc}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Modal footer */}
            <div style={{
              padding: '14px 26px', borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
              background: 'var(--bg)',
            }}>
              <div style={{ fontSize: 11.5, color: 'var(--grey)' }}>
                {draft.permissions.length === 0
                  ? 'Select at least one permission to save.'
                  : `${draft.permissions.length} permission${draft.permissions.length === 1 ? '' : 's'} granted`}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn ghost" onClick={() => setDraft(null)} disabled={saving}>Cancel</button>
                <button
                  className="btn"
                  onClick={saveDraft}
                  disabled={saving || !draft.name.trim() || draft.permissions.length === 0}
                  style={{ minWidth: 130 }}
                >
                  {saving ? <><span className="spinner" />Saving…</> : draft.id ? 'Save changes' : 'Create role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {confirmDelete && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}
        >
          <div style={{ background: 'var(--card)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,.2)' }}>
            <h2 style={{ fontSize: 17, margin: '0 0 8px' }}>Delete &ldquo;{confirmDelete.name}&rdquo;?</h2>
            {confirmDelete.member_count > 0 ? (
              <>
                <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.5, marginBottom: 18 }}>
                  <strong style={{ color: 'var(--red)' }}>
                    {confirmDelete.member_count} {confirmDelete.member_count === 1 ? 'member is' : 'members are'} still assigned to this role.
                  </strong>{' '}
                  Reassign them from the Team page before deleting, or they will fall back to Viewer access.
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button className="btn ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
                  <button
                    className="btn"
                    onClick={() => deleteRole(confirmDelete)}
                    style={{ background: 'var(--red)' }}
                  >
                    Delete anyway
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.5, marginBottom: 18 }}>
                  No members are assigned to this role, so nothing loses access. This cannot be undone.
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button className="btn ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
                  <button
                    className="btn"
                    onClick={() => deleteRole(confirmDelete)}
                    style={{ background: 'var(--red)' }}
                  >
                    Delete role
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
