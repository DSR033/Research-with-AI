'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase-browser'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function GdprPage() {
  const [userId, setUserId]       = useState<string | null>(null)
  const [email, setEmail]         = useState('')
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [confirm, setConfirm]     = useState('')
  const [showDel, setShowDel]     = useState(false)
  const [banner, setBanner]       = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const inFlight = useRef(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); setEmail(user.email ?? '') }
    })
  }, [])

  const handleExport = async (format: 'json' | 'csv') => {
    if (!userId || exporting) return
    setExporting(true)
    setBanner(null)
    try {
      const res = await fetch(`${API}/gdpr/export?user_id=${userId}&format=${format}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `surveyai_data.${format}`
      a.click()
      URL.revokeObjectURL(url)
      setBanner({ type: 'success', msg: `Your data has been downloaded as ${format.toUpperCase()}.` })
    } catch {
      setBanner({ type: 'error', msg: 'Export failed. Please try again.' })
    }
    setExporting(false)
  }

  const handleDelete = async () => {
    if (!userId || inFlight.current) return
    if (confirm !== 'DELETE MY ACCOUNT') {
      setBanner({ type: 'error', msg: 'Please type DELETE MY ACCOUNT exactly to confirm.' })
      return
    }
    inFlight.current = true
    setDeleting(true)
    setBanner(null)
    try {
      const res = await fetch(`${API}/gdpr/delete-account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, confirm }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail ?? 'Deletion failed')
      }
      await supabase.auth.signOut()
      router.push('/login?deleted=1')
    } catch (e: unknown) {
      setBanner({ type: 'error', msg: e instanceof Error ? e.message : 'Deletion failed. Please try again.' })
      setDeleting(false)
      inFlight.current = false
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Privacy & Data (GDPR)</h1>
      <div style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 28 }}>
        Manage your personal data in line with GDPR and privacy regulations.
      </div>

      {banner && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, fontWeight: 600,
          background: banner.type === 'success' ? 'var(--green-bg)' : 'var(--red-bg)',
          color: banner.type === 'success' ? 'var(--green)' : 'var(--red)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {banner.msg}
          <span onClick={() => setBanner(null)} style={{ cursor: 'pointer', opacity: 0.6, fontWeight: 400 }}>✕</span>
        </div>
      )}

      {/* Account info */}
      <Section title="Your Account">
        <Row label="Email address" value={email || '—'} />
        <Row label="User ID" value={userId ? userId.slice(0, 8) + '…' : '—'} mono />
        <Row label="Data stored" value="Surveys, questions, responses, answers, billing logs, notifications" />
      </Section>

      {/* Export */}
      <Section title="Export Your Data">
        <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16, lineHeight: 1.6 }}>
          Download a full copy of all data associated with your account — surveys, questions,
          all responses, answers, and your profile. This is your right under GDPR Article 20
          (Right to Data Portability).
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            className="btn"
            onClick={() => handleExport('json')}
            disabled={exporting || !userId}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {exporting ? <><span className="spinner" />Preparing…</> : '⬇ Download JSON'}
          </button>
          <button
            className="btn ghost"
            onClick={() => handleExport('csv')}
            disabled={exporting || !userId}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {exporting ? <><span className="spinner" />Preparing…</> : '⬇ Download CSV'}
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 10 }}>
          JSON is best for developers. CSV opens in Excel / Google Sheets.
        </div>
      </Section>

      {/* Data retention */}
      <Section title="Data Retention">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Active survey data', retention: 'Retained while your account is active' },
            { label: 'Response data', retention: 'Retained while survey exists; deleted with survey' },
            { label: 'Billing logs', retention: '7 years (legal obligation)' },
            { label: 'Notification logs', retention: '90 days, then auto-purged' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{item.label}</span>
              <span style={{ color: 'var(--grey)' }}>{item.retention}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Delete Account">
        <div style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 16, lineHeight: 1.6 }}>
          Permanently deletes your account and all associated data — surveys, questions, responses,
          and your profile. <strong style={{ color: 'var(--red)' }}>This cannot be undone.</strong> Billing logs
          may be retained for legal compliance.
        </div>

        {!showDel ? (
          <button
            onClick={() => { setShowDel(true); setBanner(null) }}
            style={{ background: 'white', color: 'var(--red)', border: '1.5px solid var(--red)', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Request account deletion
          </button>
        ) : (
          <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', marginBottom: 12 }}>
              ⚠️ This will permanently delete all your data
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 14 }}>
              Type <code style={{ background: 'white', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}>DELETE MY ACCOUNT</code> to confirm:
            </div>
            <input
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              style={{ width: '100%', border: '1.5px solid var(--red)', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'monospace', outline: 'none', marginBottom: 14, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn ghost"
                onClick={() => { setShowDel(false); setConfirm(''); setBanner(null) }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirm !== 'DELETE MY ACCOUNT' || deleting}
                style={{
                  background: confirm === 'DELETE MY ACCOUNT' ? 'var(--red)' : '#ccc',
                  color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px',
                  fontSize: 13, fontWeight: 600,
                  cursor: confirm === 'DELETE MY ACCOUNT' ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {deleting ? <><span className="spinner" />Deleting…</> : 'Delete my account'}
              </button>
            </div>
          </div>
        )}
      </Section>

      <div style={{ fontSize: 12, color: 'var(--grey)', padding: '12px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', lineHeight: 1.6 }}>
        🔒 Your data is stored securely in Supabase (PostgreSQL) with row-level security.
        For privacy questions, contact <strong>privacy@surveyai.app</strong>.
        We comply with GDPR, CCPA, and PDPA.
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px', marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--grey)', letterSpacing: '0.05em', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <span style={{ color: 'var(--grey)' }}>{label}</span>
      <span style={{ fontWeight: 500, fontFamily: mono ? 'monospace' : 'inherit', fontSize: mono ? 12 : 13 }}>{value}</span>
    </div>
  )
}
