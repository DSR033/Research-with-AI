'use client'
import { useState } from 'react'

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("Durgesh's Workspace")
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [domain, setDomain] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500) }, 800)
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Org Settings</h1>
      <div style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 28 }}>Configure your organisation&apos;s name, branding, and preferences.</div>

      {/* General */}
      <Section title="General">
        <Field label="Organisation name" hint="Shown to respondents and in reports.">
          <input value={orgName} onChange={e => setOrgName(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Time zone" hint="Used for response timestamps and scheduled reports.">
          <select value={timezone} onChange={e => setTimezone(e.target.value)} style={inputStyle}>
            {['Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Australia/Sydney'].map(tz => (
              <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
            ))}
          </select>
        </Field>
      </Section>

      {/* Branding */}
      <Section title="Branding">
        <Field label="Logo" hint="Displayed in survey headers and email invites (PNG or SVG, max 2 MB).">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18 }}>S</div>
            <button className="btn ghost" style={{ fontSize: 13 }}>Upload logo</button>
            <span style={{ fontSize: 12, color: 'var(--grey)' }}>No logo uploaded yet</span>
          </div>
        </Field>
        <Field label="Brand colour" hint="Used for buttons and progress bars in your surveys.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="color" defaultValue="#2E5BFF" style={{ width: 40, height: 36, border: '1px solid var(--border)', borderRadius: 6, padding: 2, cursor: 'pointer' }} />
            <input defaultValue="#2E5BFF" style={{ ...inputStyle, width: 110, fontFamily: 'monospace' }} />
          </div>
        </Field>
      </Section>

      {/* Custom domain */}
      <Section title="Custom Domain">
        <Field label="Survey domain" hint={<>Point a CNAME to <code style={{ background: 'var(--bg)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>surveys.surveyai.app</code> then enter your domain below.</>}>
          <input
            value={domain}
            onChange={e => setDomain(e.target.value)}
            placeholder="surveys.yourcompany.com"
            style={inputStyle}
          />
        </Field>
        <div style={{ fontSize: 12, color: 'var(--grey)', padding: '8px 12px', background: 'var(--amber-bg)', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span>⚠️</span> Custom domain is a Pro plan feature.{' '}
          <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>Upgrade</span>
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Danger Zone">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Delete organisation</div>
            <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>Permanently deletes all surveys, responses, and data. Cannot be undone.</div>
          </div>
          <button
            onClick={() => alert('Contact support to delete your organisation.')}
            style={{ background: 'white', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >Delete org</button>
        </div>
      </Section>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
        <button className="btn" onClick={handleSave} disabled={saving}>
          {saving ? <><span className="spinner" />Saving…</> : 'Save changes'}
        </button>
        {saved && <span style={{ fontSize: 13, color: 'var(--green)' }}>✓ Saved</span>}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid var(--border)', borderRadius: 8,
  padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px', marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--grey)', letterSpacing: '0.05em', marginBottom: 16 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'start' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 3, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}
