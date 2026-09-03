'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase-browser'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const SPECIALIZATIONS = [
  'Survey Design', 'Data Analysis', 'Translation', 'Research Ops',
  'UX Research', 'Market Research', 'Statistical Analysis', 'Report Writing',
  'Focus Groups', 'Qualitative Research', 'NPS & CX', 'HR / Engagement',
]

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Mandarin', 'Arabic', 'Hindi', 'Japanese', 'Italian']

const STEPS = ['Welcome', 'Basic Info', 'Expertise', 'Rate & Availability', 'Portfolio', 'Done']

type Profile = {
  name: string
  bio: string
  location: string
  specializations: string[]
  years_experience: string
  hourly_rate: string
  languages: string[]
  availability: 'full' | 'part' | 'occasional'
  portfolio: Array<{ title: string; url: string; description: string }>
  certifications: Array<{ title: string; issuer: string; year: string }>
}

const empty: Profile = {
  name: '', bio: '', location: '',
  specializations: [], years_experience: '', hourly_rate: '',
  languages: ['English'], availability: 'part',
  portfolio: [], certifications: [],
}

const inp: React.CSSProperties = {
  width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10,
  padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
  background: '#fff', boxSizing: 'border-box',
}

const label: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#52525b', marginBottom: 6,
}

export default function ExpertOnboarding() {
  const router = useRouter()
  const [step, setStep]       = useState(0)
  const [profile, setProfile] = useState<Profile>(empty)
  const [saving, setSaving]   = useState(false)

  const set = (patch: Partial<Profile>) => setProfile(p => ({ ...p, ...patch }))

  const toggleSpec = (s: string) =>
    set({ specializations: profile.specializations.includes(s)
      ? profile.specializations.filter(x => x !== s)
      : [...profile.specializations, s] })

  const toggleLang = (l: string) =>
    set({ languages: profile.languages.includes(l)
      ? profile.languages.filter(x => x !== l)
      : [...profile.languages, l] })

  const addPortfolio = () => set({ portfolio: [...profile.portfolio, { title: '', url: '', description: '' }] })
  const updatePortfolio = (i: number, patch: Partial<Profile['portfolio'][0]>) => {
    const n = [...profile.portfolio]; n[i] = { ...n[i], ...patch }; set({ portfolio: n })
  }
  const removePortfolio = (i: number) => set({ portfolio: profile.portfolio.filter((_, j) => j !== i) })

  const addCert = () => set({ certifications: [...profile.certifications, { title: '', issuer: '', year: '' }] })
  const updateCert = (i: number, patch: Partial<Profile['certifications'][0]>) => {
    const n = [...profile.certifications]; n[i] = { ...n[i], ...patch }; set({ certifications: n })
  }
  const removeCert = (i: number) => set({ certifications: profile.certifications.filter((_, j) => j !== i) })

  const canNext = () => {
    if (step === 1) return profile.name.trim().length > 0 && profile.bio.trim().length > 20
    if (step === 2) return profile.specializations.length > 0
    if (step === 3) return profile.hourly_rate.trim().length > 0
    return true
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await fetch(`${API}/profiles/${user.id}/onboarding`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'expert', ...profile }),
        })
      }
    } catch (_) {}
    setSaving(false)
    setStep(5)
  }

  // Score calculation
  const score = Math.min(100, 20
    + (profile.name ? 10 : 0)
    + (profile.bio.length > 50 ? 15 : 0)
    + (profile.specializations.length > 0 ? 15 : 0)
    + (profile.hourly_rate ? 10 : 0)
    + (profile.years_experience ? 10 : 0)
    + (profile.portfolio.length > 0 ? 15 : 0)
    + (profile.certifications.length > 0 ? 10 : 0)
  )

  const circumference = 2 * Math.PI * 44
  const dash = (score / 100) * circumference

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 18% 12%, #fce7f3, #ede9fe 55%, #e0e7ff)', fontFamily: "'Hanken Grotesk', system-ui", display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <header style={{ background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(14px)', borderBottom: '1.5px solid rgba(219,39,119,.10)', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 18, letterSpacing: '-.02em' }}>SurveyAI</span>
          <span style={{ fontSize: 12, background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>Expert</span>
        </div>
        {step > 0 && step < 5 && (
          <div style={{ fontSize: 13, color: '#71717a' }}>Step {step} of {STEPS.length - 2}</div>
        )}
      </header>

      {/* Progress bar */}
      {step > 0 && step < 5 && (
        <div style={{ height: 3, background: '#fce7f3' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg,#db2777,#be185d)', width: `${((step) / (STEPS.length - 2)) * 100}%`, transition: 'width .4s ease' }} />
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>

        {/* ── STEP 0: WELCOME ── */}
        {step === 0 && (
          <div style={{ maxWidth: 580, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/><path d="M16 11l2 2 4-4"/></svg>
            </div>
            <h1 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 36, letterSpacing: '-.03em', color: '#18181b', marginBottom: 16 }}>
              Become a SurveyAI Expert
            </h1>
            <p style={{ fontSize: 16, color: '#52525b', lineHeight: 1.7, marginBottom: 36 }}>
              Join our marketplace of vetted survey professionals. Get matched with clients who need your skills in survey design, data analysis, translation, and more.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 40 }}>
              {[
                { icon: '💼', title: 'Flexible work', desc: 'Take on projects that fit your schedule' },
                { icon: '💰', title: 'Set your rate', desc: 'You decide what your expertise is worth' },
                { icon: '⭐', title: 'Build reputation', desc: 'Earn ratings and grow your client base' },
              ].map(f => (
                <div key={f.title} style={{ background: 'rgba(255,255,255,.8)', borderRadius: 14, padding: '20px 16px', border: '1.5px solid rgba(219,39,119,.1)' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#18181b', marginBottom: 4 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(1)} style={{ background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 40px', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Get started →
            </button>
            <div style={{ marginTop: 16, fontSize: 13, color: '#a1a1aa' }}>Takes about 5 minutes</div>
          </div>
        )}

        {/* ── STEP 1: BASIC INFO ── */}
        {step === 1 && (
          <div style={{ maxWidth: 640, width: '100%' }}>
            <div style={{ background: 'rgba(255,255,255,.9)', borderRadius: 20, padding: '36px 40px', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>
              <h2 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 26, letterSpacing: '-.02em', color: '#18181b', marginBottom: 6 }}>Tell us about yourself</h2>
              <p style={{ fontSize: 14, color: '#71717a', marginBottom: 28 }}>This is what clients will see on your profile.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={label}>Full name *</label>
                    <input value={profile.name} onChange={e => set({ name: e.target.value })} placeholder="Jane Smith" style={inp} />
                  </div>
                  <div>
                    <label style={label}>Location</label>
                    <input value={profile.location} onChange={e => set({ location: e.target.value })} placeholder="San Francisco, CA" style={inp} />
                  </div>
                </div>

                <div>
                  <label style={label}>Professional bio * <span style={{ fontWeight: 400, color: '#a1a1aa' }}>({profile.bio.length}/400 chars)</span></label>
                  <textarea
                    value={profile.bio}
                    onChange={e => { if (e.target.value.length <= 400) set({ bio: e.target.value }) }}
                    placeholder="Experienced survey researcher with 5+ years designing mixed-method studies for Fortune 500 companies. Specializing in customer experience and employee engagement research…"
                    rows={5}
                    style={{ ...inp, resize: 'vertical' }}
                  />
                  {profile.bio.length > 0 && profile.bio.length < 20 && (
                    <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Please write at least 20 characters.</div>
                  )}
                </div>

                <div>
                  <label style={label}>LinkedIn or website URL</label>
                  <input value={''} onChange={() => {}} placeholder="https://linkedin.com/in/yourname" style={inp} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: EXPERTISE ── */}
        {step === 2 && (
          <div style={{ maxWidth: 680, width: '100%' }}>
            <div style={{ background: 'rgba(255,255,255,.9)', borderRadius: 20, padding: '36px 40px', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>
              <h2 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 26, letterSpacing: '-.02em', color: '#18181b', marginBottom: 6 }}>Your expertise</h2>
              <p style={{ fontSize: 14, color: '#71717a', marginBottom: 24 }}>Select all the areas you can confidently deliver work in.</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
                {SPECIALIZATIONS.map(s => {
                  const on = profile.specializations.includes(s)
                  return (
                    <button key={s} onClick={() => toggleSpec(s)}
                      style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: `1.5px solid ${on ? '#db2777' : '#e4e4e7'}`, background: on ? '#fce7f3' : '#fff', color: on ? '#db2777' : '#52525b', cursor: 'pointer', transition: 'all .12s', fontFamily: 'inherit' }}>
                      {on ? '✓ ' : ''}{s}
                    </button>
                  )
                })}
              </div>

              {profile.specializations.length === 0 && (
                <div style={{ fontSize: 13, color: '#ef4444', marginBottom: 20 }}>Please select at least one specialization.</div>
              )}

              <div style={{ borderTop: '1.5px solid #f4f4f5', paddingTop: 24 }}>
                <label style={label}>Languages you work in</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {LANGUAGES.map(l => {
                    const on = profile.languages.includes(l)
                    return (
                      <button key={l} onClick={() => toggleLang(l)}
                        style={{ padding: '6px 14px', borderRadius: 16, fontSize: 13, fontWeight: 500, border: `1.5px solid ${on ? '#2563eb' : '#e4e4e7'}`, background: on ? '#eff6ff' : '#fff', color: on ? '#2563eb' : '#52525b', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {on ? '✓ ' : ''}{l}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: RATE & AVAILABILITY ── */}
        {step === 3 && (
          <div style={{ maxWidth: 640, width: '100%' }}>
            <div style={{ background: 'rgba(255,255,255,.9)', borderRadius: 20, padding: '36px 40px', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>
              <h2 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 26, letterSpacing: '-.02em', color: '#18181b', marginBottom: 6 }}>Rate & availability</h2>
              <p style={{ fontSize: 14, color: '#71717a', marginBottom: 28 }}>Help clients understand your pricing and schedule.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={label}>Hourly rate (USD) *</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#71717a', fontSize: 15 }}>$</span>
                      <input type="number" min={10} value={profile.hourly_rate} onChange={e => set({ hourly_rate: e.target.value })} placeholder="80" style={{ ...inp, paddingLeft: 28 }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>Platform fee: 15%. You keep 85%.</div>
                  </div>
                  <div>
                    <label style={label}>Years of experience</label>
                    <select value={profile.years_experience} onChange={e => set({ years_experience: e.target.value })} style={{ ...inp, cursor: 'pointer' }}>
                      <option value="">Select…</option>
                      {['0–1', '1–3', '3–5', '5–10', '10+'].map(v => <option key={v} value={v}>{v} years</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={label}>Availability</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {([
                      { value: 'full', label: 'Full-time', desc: '30+ hours/week available for projects' },
                      { value: 'part', label: 'Part-time', desc: '10–30 hours/week alongside other commitments' },
                      { value: 'occasional', label: 'Occasional', desc: 'A few hours/week for select projects' },
                    ] as const).map(opt => (
                      <label key={opt.value} onClick={() => set({ availability: opt.value })}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 12, border: `2px solid ${profile.availability === opt.value ? '#db2777' : '#e4e4e7'}`, background: profile.availability === opt.value ? '#fdf2f8' : '#fff', cursor: 'pointer', transition: 'all .12s' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${profile.availability === opt.value ? '#db2777' : '#d4d4d8'}`, background: profile.availability === opt.value ? '#db2777' : '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {profile.availability === opt.value && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#18181b' }}>{opt.label}</div>
                          <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: PORTFOLIO & CERTS ── */}
        {step === 4 && (
          <div style={{ maxWidth: 680, width: '100%' }}>
            <div style={{ background: 'rgba(255,255,255,.9)', borderRadius: 20, padding: '36px 40px', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>
              <h2 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 26, letterSpacing: '-.02em', color: '#18181b', marginBottom: 6 }}>Portfolio & certifications</h2>
              <p style={{ fontSize: 14, color: '#71717a', marginBottom: 28 }}>Showcase your best work. You can skip this and add it later.</p>

              {/* Portfolio */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#18181b' }}>Portfolio samples</div>
                  <button onClick={addPortfolio} style={{ fontSize: 13, color: '#db2777', background: 'none', border: '1.5px solid #db2777', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>+ Add sample</button>
                </div>
                {profile.portfolio.length === 0 ? (
                  <div style={{ padding: '24px', border: '2px dashed #e4e4e7', borderRadius: 12, textAlign: 'center', color: '#a1a1aa', fontSize: 13 }}>
                    No samples yet — add links to Google Drive, Dropbox, or a personal site.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {profile.portfolio.map((p, i) => (
                      <div key={i} style={{ border: '1.5px solid #e4e4e7', borderRadius: 12, padding: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                          <input value={p.title} onChange={e => updatePortfolio(i, { title: e.target.value })} placeholder="Project title" style={inp} />
                          <input value={p.url} onChange={e => updatePortfolio(i, { url: e.target.value })} placeholder="https://drive.google.com/…" style={inp} />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input value={p.description} onChange={e => updatePortfolio(i, { description: e.target.value })} placeholder="Short description of the work…" style={{ ...inp, flex: 1 }} />
                          <button onClick={() => removePortfolio(i)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 20, flexShrink: 0 }}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Certifications */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#18181b' }}>Certifications</div>
                  <button onClick={addCert} style={{ fontSize: 13, color: '#db2777', background: 'none', border: '1.5px solid #db2777', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>+ Add certification</button>
                </div>
                {profile.certifications.length === 0 ? (
                  <div style={{ padding: '24px', border: '2px dashed #e4e4e7', borderRadius: 12, textAlign: 'center', color: '#a1a1aa', fontSize: 13 }}>
                    Add any relevant certifications (e.g. Google Analytics, Qualtrics Research Core).
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {profile.certifications.map((c, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: 10, alignItems: 'center' }}>
                        <input value={c.title} onChange={e => updateCert(i, { title: e.target.value })} placeholder="Certification title" style={inp} />
                        <input value={c.issuer} onChange={e => updateCert(i, { issuer: e.target.value })} placeholder="Issuing body" style={inp} />
                        <input value={c.year} onChange={e => updateCert(i, { year: e.target.value })} placeholder="Year" style={inp} />
                        <button onClick={() => removeCert(i)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 20 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: DONE ── */}
        {step === 5 && (
          <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,.9)', borderRadius: 20, padding: '48px 40px', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>
              {/* Score ring */}
              <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 28px' }}>
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="44" fill="none" stroke="#fce7f3" strokeWidth="10" />
                  <circle cx="60" cy="60" r="44" fill="none" stroke="#db2777" strokeWidth="10"
                    strokeDasharray={`${dash} ${circumference}`} strokeDashoffset={circumference * 0.25}
                    strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 26, color: '#db2777' }}>{score}%</div>
                </div>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 20, padding: '8px 20px', marginBottom: 24 }}>
                <span style={{ fontSize: 18 }}>🎉</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#16a34a' }}>Profile created!</span>
              </div>

              <h2 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 28, letterSpacing: '-.02em', color: '#18181b', marginBottom: 12 }}>
                Welcome to the Expert Marketplace
              </h2>
              <p style={{ fontSize: 15, color: '#52525b', lineHeight: 1.7, marginBottom: 32 }}>
                Your profile score is <strong>{score}%</strong>. Complete the remaining sections to unlock more job opportunities.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', marginBottom: 36 }}>
                {[
                  { label: 'Basic info', done: !!profile.name },
                  { label: 'Specializations', done: profile.specializations.length > 0 },
                  { label: 'Portfolio samples', done: profile.portfolio.length > 0 },
                  { label: 'Certifications', done: profile.certifications.length > 0 },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: item.done ? '#f0fdf4' : '#fafafa', borderRadius: 10, border: `1.5px solid ${item.done ? '#bbf7d0' : '#e4e4e7'}` }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: item.done ? '#16a34a' : '#e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {item.done ? <svg width="11" height="11" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg> : null}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: item.done ? '#15803d' : '#52525b' }}>{item.label}</span>
                    {!item.done && <span style={{ marginLeft: 'auto', fontSize: 12, color: '#a1a1aa' }}>Incomplete</span>}
                  </div>
                ))}
              </div>

              <button onClick={() => router.push('/expert')}
                style={{ width: '100%', background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Go to Expert Dashboard →
              </button>
            </div>
          </div>
        )}

        {/* Nav buttons */}
        {step > 0 && step < 5 && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(12px)', borderTop: '1.5px solid rgba(219,39,119,.08)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setStep(s => s - 1)}
              style={{ background: 'none', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#52525b', fontFamily: 'inherit' }}>
              ← Back
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1,2,3,4].map(s => (
                <div key={s} style={{ width: 8, height: 8, borderRadius: '50%', background: s === step ? '#db2777' : s < step ? '#fca5a5' : '#e4e4e7', transition: 'all .2s' }} />
              ))}
            </div>
            {step < 4 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                style={{ background: canNext() ? 'linear-gradient(135deg,#db2777,#be185d)' : '#e4e4e7', color: canNext() ? '#fff' : '#a1a1aa', border: 'none', borderRadius: 10, padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: canNext() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all .15s' }}>
                Continue →
              </button>
            ) : (
              <button onClick={handleFinish} disabled={saving}
                style={{ background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Creating profile…' : 'Finish & go to dashboard →'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
