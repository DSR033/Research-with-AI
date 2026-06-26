'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase-browser'

export default function SettingsPage() {
  const [orgName, setOrgName]       = useState('')
  const [timezone, setTimezone]     = useState('Asia/Kolkata')
  const [brandColor, setBrandColor] = useState('#2E5BFF')
  const [logoUrl, setLogoUrl]       = useState('')
  const [domain, setDomain]         = useState('')
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [loading, setLoading]       = useState(true)
  const [userId, setUserId]         = useState<string | null>(null)

  const supabase = createClient()

  // Load existing settings
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('org_name, brand_color, logo_url')
        .eq('id', user.id)
        .single()
      if (data) {
        setOrgName(data.org_name ?? '')
        setBrandColor(data.brand_color ?? '#2E5BFF')
        setLogoUrl(data.logo_url ?? '')
      }
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    await supabase.from('profiles').update({
      org_name: orgName,
      brand_color: brandColor,
      logo_url: logoUrl || null,
    }).eq('id', userId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <div style={{ color: 'var(--grey)', fontSize: 13, padding: '24px 0' }}>Loading…</div>

  return (
    <div>
      <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>Org Settings</h1>
      <div style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 28 }}>
        Configure your organisation&apos;s name, branding, and preferences.
        Branding is applied to all your survey respondent pages.
      </div>

      {/* General */}
      <Section title="General">
        <Field label="Organisation name" hint="Shown to respondents in survey headers.">
          <input value={orgName} onChange={e => setOrgName(e.target.value)}
            placeholder="e.g. Acme Corp" style={inputStyle} />
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
        <Field label="Brand colour" hint="Applied to buttons, progress bars, and accents in your survey pages.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="color"
              value={brandColor}
              onChange={e => setBrandColor(e.target.value)}
              style={{ width: 44, height: 40, border: '1px solid var(--border)', borderRadius: 8, padding: 3, cursor: 'pointer' }}
            />
            <input
              value={brandColor}
              onChange={e => setBrandColor(e.target.value)}
              style={{ ...inputStyle, width: 120, fontFamily: 'monospace' }}
            />
            <div style={{ width: 32, height: 32, borderRadius: 8, background: brandColor, flexShrink: 0, border: '1px solid rgba(0,0,0,0.08)' }} />
            <span style={{ fontSize: 12, color: 'var(--grey)' }}>Live preview</span>
          </div>
        </Field>

        <Field label="Logo URL" hint="Direct link to your logo image (PNG, SVG). Shown in survey headers instead of the default initial.">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <input
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://yourcompany.com/logo.png"
              style={{ ...inputStyle, flex: 1 }}
            />
            {logoUrl && (
              <div style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 8 }}>
            💡 Use a square or horizontal logo. Minimum 80×80px recommended.
          </div>
        </Field>

        {/* Branding preview */}
        <Field label="Respondent preview" hint="How your survey header will look to respondents.">
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', maxWidth: 380 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'white' }}>
              {logoUrl ? (
                <div style={{ width: 30, height: 30, borderRadius: 7, overflow: 'hidden', flexShrink: 0, background: brandColor }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              ) : (
                <div style={{ width: 30, height: 30, borderRadius: 7, background: brandColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {(orgName || 'S')[0].toUpperCase()}
                </div>
              )}
              <div style={{ fontWeight: 600, fontSize: 14 }}>{orgName || 'Your Survey Title'}</div>
            </div>
            <div style={{ height: 3, background: brandColor }} />
            <div style={{ padding: 14, background: '#F5F7FA' }}>
              <div style={{ padding: '10px 14px', background: '#F1F4F8', borderRadius: 10, fontSize: 13, marginBottom: 8, display: 'inline-block' }}>
                Hi! How can we help?
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button style={{ padding: '8px 16px', borderRadius: 8, background: brandColor, color: 'white', border: 'none', fontSize: 12, fontWeight: 600 }}>Option A</button>
                <button style={{ padding: '8px 16px', borderRadius: 8, background: 'white', color: brandColor, border: `1.5px solid ${brandColor}`, fontSize: 12, fontWeight: 600 }}>Option B</button>
              </div>
            </div>
          </div>
        </Field>
      </Section>

      {/* Custom domain */}
      <Section title="Custom Domain">
        <Field label="Survey domain" hint={<>Point a CNAME to <code style={{ background: 'var(--bg)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>surveys.surveyai.app</code> then enter your domain below.</>}>
          <input value={domain} onChange={e => setDomain(e.target.value)}
            placeholder="surveys.yourcompany.com" style={inputStyle} />
        </Field>
        <div style={{ fontSize: 12, color: 'var(--grey)', padding: '8px 12px', background: 'var(--amber-bg)', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          ⚠️ Custom domain is a Pro plan feature. <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>Upgrade</span>
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Danger Zone">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Delete organisation</div>
            <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 2 }}>Permanently deletes all surveys, responses, and data. Cannot be undone.</div>
          </div>
          <button onClick={() => alert('Contact support to delete your organisation.')}
            style={{ background: 'white', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Delete org
          </button>
        </div>
      </Section>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
        <button className="btn" onClick={handleSave} disabled={saving}>
          {saving ? <><span className="spinner" />Saving…</> : 'Save changes'}
        </button>
        {saved && <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>✓ Saved — branding is now live on all your surveys</span>}
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
