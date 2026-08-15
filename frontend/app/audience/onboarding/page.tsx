'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase-browser'

const TOPICS = [
  'Consumer Products', 'Technology', 'Healthcare & Pharma', 'Finance & Banking',
  'Lifestyle & Wellness', 'Education', 'Food & Beverage', 'Travel & Tourism',
  'Entertainment & Media', 'Automotive', 'Fashion & Beauty', 'Real Estate',
]

const LANGUAGES = [
  'English', 'Hindi', 'Spanish', 'French', 'German',
  'Portuguese', 'Mandarin', 'Arabic', 'Japanese', 'Korean',
]

const PARTICIPATE_MODES = [
  { id: 'surveys', label: 'Online Surveys', desc: 'Short to medium surveys, earn per completion', icon: '📋' },
  { id: 'panels', label: 'Research Panels', desc: 'Ongoing panel membership for regular studies', icon: '👥' },
  { id: 'focus_groups', label: 'Focus Groups', desc: 'Live discussions with researchers via video call', icon: '🎙️' },
  { id: 'ux_testing', label: 'UX Testing', desc: 'Test products and apps and share feedback', icon: '🖥️' },
]

const EMPLOYMENT = ['Student', 'Employed full-time', 'Employed part-time', 'Self-employed', 'Unemployed', 'Retired', 'Prefer not to say']
const EDUCATION_LEVELS = ["High school", "Some college", "Bachelor's degree", "Master's degree", 'Doctorate', 'Trade / vocational', 'Prefer not to say']
const INCOME_RANGES = ['Under $25k', '$25k – $50k', '$50k – $75k', '$75k – $100k', '$100k – $150k', 'Over $150k', 'Prefer not to say']
const AVAILABILITY = ['Less than 1 hr/week', '1 – 3 hrs/week', '3 – 5 hrs/week', '5 – 10 hrs/week', 'More than 10 hrs/week']

const PAYOUT_METHODS = [
  { id: 'paypal', label: 'PayPal', desc: 'Instant transfers to your PayPal account', icon: '💸' },
  { id: 'bank', label: 'Bank Transfer', desc: 'Direct to your bank (2–3 business days)', icon: '🏦' },
  { id: 'gift_cards', label: 'Gift Cards', desc: 'Amazon, Flipkart, or major retailers', icon: '🎁' },
]

const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Singapore', 'United Arab Emirates', 'Other']
const MIN_PAYOUTS = ['$10', '$25', '$50', '$100']
const TOTAL_STEPS = 5

function ScoreRing({ pct }: { pct: number }) {
  const r = 38, circ = 2 * Math.PI * r, dash = (pct / 100) * circ
  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={r} fill="none" stroke="#f3e8ff" strokeWidth="8" />
      <circle cx="48" cy="48" r={r} fill="none" stroke="url(#ao-grad)" strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
      <defs>
        <linearGradient id="ao-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#db2777" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
      </defs>
      <text x="48" y="53" textAnchor="middle" fontFamily="'Schibsted Grotesk',system-ui" fontWeight="800" fontSize="18" fill="#18181b">{pct}%</text>
    </svg>
  )
}

export default function AudienceOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)

  // Step 1 — Basic Info
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')

  // Step 2 — Interests & Languages
  const [topics, setTopics] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>(['English'])

  // Step 3 — Participation
  const [modes, setModes] = useState<string[]>(['surveys'])
  const [availability, setAvailability] = useState('')

  // Step 4 — Demographics
  const [employment, setEmployment] = useState('')
  const [education, setEducation] = useState('')
  const [income, setIncome] = useState('')

  // Step 5 — Payout
  const [payoutMethod, setPayoutMethod] = useState('')
  const [minPayout, setMinPayout] = useState('$25')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u && process.env.NODE_ENV !== 'development') {
        router.push('/login')
        return
      }
      setUser(u ? { id: u.id, email: u.email } : { id: 'dev', email: 'dev@local' })
    })
  }, [])

  const toggleArr = (arr: string[], val: string, set: (v: string[]) => void) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])

  const canNext = () => {
    if (step === 1) return name.trim().length >= 2 && country !== ''
    if (step === 2) return topics.length > 0 && languages.length > 0
    if (step === 3) return modes.length > 0 && availability !== ''
    if (step === 4) return true
    if (step === 5) return payoutMethod !== ''
    return true
  }

  const profileScore = () => {
    let pts = 0
    if (name.trim()) pts += 20
    if (country) pts += 10
    if (dob) pts += 5
    if (topics.length > 0) pts += 15
    if (languages.length > 1) pts += 5
    if (modes.length > 0) pts += 10
    if (availability) pts += 5
    if (employment) pts += 10
    if (education) pts += 5
    if (income) pts += 5
    if (payoutMethod) pts += 10
    return Math.min(pts, 100)
  }

  const completedSections = [
    { label: 'Name & location', done: name.trim().length >= 2 && !!country },
    { label: 'Research interests added', done: topics.length > 0 },
    { label: 'Languages set', done: languages.length > 0 },
    { label: 'Participation mode chosen', done: modes.length > 0 },
    { label: 'Availability set', done: !!availability },
    { label: 'Demographic profile', done: !!employment || !!education },
    { label: 'Payout method selected', done: !!payoutMethod },
  ]

  const pillStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px',
    borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
    transition: 'all .15s',
    background: active ? '#fdf2f8' : 'rgba(255,255,255,.85)',
    color: active ? '#be185d' : '#52525b',
    boxShadow: active ? '0 0 0 2px #db2777' : '0 0 0 1.5px #e4e4e7',
  })

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,.85)',
    border: '1.5px solid #e4e4e7', borderRadius: 12, padding: '11px 14px',
    fontSize: 14, color: '#18181b', outline: 'none', fontFamily: "'Hanken Grotesk', system-ui",
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle, appearance: 'none' as const, cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: '#52525b', textTransform: 'uppercase',
    letterSpacing: '.06em', marginBottom: 7, display: 'block',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 18% 12%, #fce7f3, #ede9fe 55%, #e0e7ff)', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'Hanken Grotesk', system-ui" }}>

      {/* Top bar */}
      <header style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 56, background: 'rgba(255,255,255,.7)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(219,39,119,.1)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 16, letterSpacing: '-.02em', color: '#18181b' }}>SurveyAI</span>
        </div>
        {step > 0 && step <= TOTAL_STEPS && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#71717a' }}>Step {step} of {TOTAL_STEPS}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div key={i} style={{ width: i < step ? 20 : 8, height: 8, borderRadius: 99, transition: 'all .3s', background: i < step ? 'linear-gradient(90deg,#db2777,#9333ea)' : i === step - 1 ? '#db2777' : '#e4e4e7' }} />
              ))}
            </div>
          </div>
        )}
        <button onClick={() => router.push('/audience')} style={{ fontSize: 13, color: '#71717a', background: 'none', border: 'none', cursor: 'pointer' }}>Skip for now</button>
      </header>

      {/* Progress bar */}
      {step > 0 && step <= TOTAL_STEPS && (
        <div style={{ width: '100%', height: 3, background: '#f1e8f8' }}>
          <div style={{ height: '100%', width: `${(step / TOTAL_STEPS) * 100}%`, background: 'linear-gradient(90deg,#db2777,#9333ea)', transition: 'width .4s ease' }} />
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', width: '100%' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>

          {/* ── STEP 0: WELCOME ── */}
          {step === 0 && (
            <div style={{ background: 'rgba(255,255,255,.9)', borderRadius: 28, padding: '44px 40px', boxShadow: '0 8px 40px rgba(219,39,119,.12)', textAlign: 'center' }}>
              <div style={{ width: 68, height: 68, borderRadius: 20, background: 'linear-gradient(135deg,#db2777,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', boxShadow: '0 4px 20px rgba(219,39,119,.35)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 28, color: '#18181b', letterSpacing: '-.03em', marginBottom: 10 }}>Join the SurveyAI panel</div>
              <div style={{ fontSize: 15, color: '#52525b', lineHeight: 1.6, marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
                Get paid to share your opinions. Earn rewards by completing surveys matched to your profile.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 36 }}>
                {[
                  { icon: '💰', title: 'Earn cash rewards', desc: 'Get paid for every survey you complete' },
                  { icon: '🎯', title: 'AI-matched surveys', desc: 'Only relevant studies based on your profile' },
                  { icon: '⏱️', title: 'Quick & flexible', desc: 'Complete surveys on your own schedule' },
                ].map(c => (
                  <div key={c.title} style={{ background: 'linear-gradient(135deg,rgba(219,39,119,.04),rgba(147,51,234,.04))', border: '1px solid rgba(219,39,119,.1)', borderRadius: 16, padding: '16px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{c.icon}</div>
                    <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 13, color: '#18181b', marginBottom: 4 }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>{c.desc}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(1)} style={{ width: '100%', fontSize: 16, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#db2777,#be185d)', border: 'none', padding: '15px 28px', borderRadius: 14, cursor: 'pointer', boxShadow: '0 4px 20px rgba(219,39,119,.35)', fontFamily: "'Schibsted Grotesk', system-ui" }}>
                Get started →
              </button>
              <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 12 }}>Takes about 3 minutes · Free to join</div>
            </div>
          )}

          {/* ── STEP 1: BASIC INFO ── */}
          {step === 1 && (
            <div style={{ background: 'rgba(255,255,255,.9)', borderRadius: 28, padding: '40px', boxShadow: '0 8px 40px rgba(219,39,119,.1)' }}>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 24, color: '#18181b', letterSpacing: '-.02em', marginBottom: 6 }}>Tell us about yourself</div>
                <div style={{ fontSize: 14, color: '#71717a' }}>This helps us verify your eligibility for surveys and send payouts correctly.</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={labelStyle}>Full name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Country / Region <span style={{ color: '#ef4444' }}>*</span></label>
                  <select value={country} onChange={e => setCountry(e.target.value)} style={selectStyle}>
                    <option value="">Select your country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Date of birth</label>
                    <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inputStyle} max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0]} />
                    <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>Must be 18+. Used for age-gated surveys only.</div>
                  </div>
                  <div>
                    <label style={labelStyle}>Gender (optional)</label>
                    <select value={gender} onChange={e => setGender(e.target.value)} style={selectStyle}>
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non_binary">Non-binary</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: INTERESTS & LANGUAGES ── */}
          {step === 2 && (
            <div style={{ background: 'rgba(255,255,255,.9)', borderRadius: 28, padding: '40px', boxShadow: '0 8px 40px rgba(219,39,119,.1)' }}>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 24, color: '#18181b', letterSpacing: '-.02em', marginBottom: 6 }}>Your interests</div>
                <div style={{ fontSize: 14, color: '#71717a' }}>Select research topics you're interested in. We'll match surveys accordingly.</div>
              </div>
              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>Research topics <span style={{ color: '#ef4444' }}>*</span> <span style={{ color: '#a1a1aa', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— pick at least 1</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {TOPICS.map(t => (
                    <button key={t} onClick={() => toggleArr(topics, t, setTopics)} style={pillStyle(topics.includes(t))}>
                      {topics.includes(t) && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="3" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>}
                      {t}
                    </button>
                  ))}
                </div>
                {topics.length > 0 && <div style={{ fontSize: 12, color: '#db2777', marginTop: 8, fontWeight: 600 }}>{topics.length} selected</div>}
              </div>
              <div>
                <label style={labelStyle}>Languages you can respond in <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {LANGUAGES.map(l => (
                    <button key={l} onClick={() => toggleArr(languages, l, setLanguages)} style={pillStyle(languages.includes(l))}>
                      {languages.includes(l) && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="3" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>}
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: PARTICIPATION MODE ── */}
          {step === 3 && (
            <div style={{ background: 'rgba(255,255,255,.9)', borderRadius: 28, padding: '40px', boxShadow: '0 8px 40px rgba(219,39,119,.1)' }}>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 24, color: '#18181b', letterSpacing: '-.02em', marginBottom: 6 }}>How you'll participate</div>
                <div style={{ fontSize: 14, color: '#71717a' }}>Choose the types of research you're open to. Select all that apply.</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {PARTICIPATE_MODES.map(m => {
                  const on = modes.includes(m.id)
                  return (
                    <button key={m.id} onClick={() => toggleArr(modes, m.id, setModes)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14, cursor: 'pointer', border: 'none', textAlign: 'left' as const, transition: 'all .15s', background: on ? 'linear-gradient(135deg,rgba(219,39,119,.06),rgba(147,51,234,.04))' : 'rgba(255,255,255,.75)', boxShadow: on ? '0 0 0 2px #db2777' : '0 0 0 1.5px #e4e4e7' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: on ? 'linear-gradient(135deg,rgba(219,39,119,.15),rgba(147,51,234,.12))' : '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{m.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 14, color: '#18181b', marginBottom: 2 }}>{m.label}</div>
                        <div style={{ fontSize: 12, color: '#71717a' }}>{m.desc}</div>
                      </div>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${on ? '#db2777' : '#d4d4d8'}`, background: on ? '#db2777' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div>
                <label style={labelStyle}>How much time can you give per week? <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {AVAILABILITY.map(a => (
                    <button key={a} onClick={() => setAvailability(a)} style={pillStyle(availability === a)}>{a}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: DEMOGRAPHICS ── */}
          {step === 4 && (
            <div style={{ background: 'rgba(255,255,255,.9)', borderRadius: 28, padding: '40px', boxShadow: '0 8px 40px rgba(219,39,119,.1)' }}>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 24, color: '#18181b', letterSpacing: '-.02em', marginBottom: 6 }}>Demographic profile</div>
                <div style={{ fontSize: 14, color: '#71717a' }}>All fields are optional. This helps us match you with more relevant, higher-paying surveys.</div>
              </div>
              <div style={{ background: 'rgba(219,39,119,.04)', border: '1px solid rgba(219,39,119,.1)', borderRadius: 12, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
                <div style={{ fontSize: 13, color: '#52525b' }}>Completing this section can <strong style={{ color: '#db2777' }}>unlock 3× more surveys</strong> and higher reward tiers.</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={labelStyle}>Employment status</label>
                  <select value={employment} onChange={e => setEmployment(e.target.value)} style={selectStyle}>
                    <option value="">Select…</option>
                    {EMPLOYMENT.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Highest education level</label>
                  <select value={education} onChange={e => setEducation(e.target.value)} style={selectStyle}>
                    <option value="">Select…</option>
                    {EDUCATION_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Household annual income (USD)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {INCOME_RANGES.map(r => (
                      <button key={r} onClick={() => setIncome(r)} style={pillStyle(income === r)}>{r}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 5: PAYOUT SETUP ── */}
          {step === 5 && (
            <div style={{ background: 'rgba(255,255,255,.9)', borderRadius: 28, padding: '40px', boxShadow: '0 8px 40px rgba(219,39,119,.1)' }}>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 24, color: '#18181b', letterSpacing: '-.02em', marginBottom: 6 }}>Set up payouts</div>
                <div style={{ fontSize: 14, color: '#71717a' }}>Choose how you'd like to receive your earnings. You can change this anytime.</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {PAYOUT_METHODS.map(m => {
                  const on = payoutMethod === m.id
                  return (
                    <button key={m.id} onClick={() => setPayoutMethod(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 14, cursor: 'pointer', border: 'none', textAlign: 'left' as const, transition: 'all .15s', background: on ? 'linear-gradient(135deg,rgba(219,39,119,.06),rgba(147,51,234,.04))' : 'rgba(255,255,255,.75)', boxShadow: on ? '0 0 0 2px #db2777' : '0 0 0 1.5px #e4e4e7' }}>
                      <div style={{ fontSize: 28 }}>{m.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 15, color: '#18181b', marginBottom: 3 }}>{m.label}</div>
                        <div style={{ fontSize: 13, color: '#71717a' }}>{m.desc}</div>
                      </div>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${on ? '#db2777' : '#d4d4d8'}`, background: on ? '#db2777' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div>
                <label style={labelStyle}>Minimum payout threshold</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {MIN_PAYOUTS.map(mp => (
                    <button key={mp} onClick={() => setMinPayout(mp)} style={{ ...pillStyle(minPayout === mp), flex: 1, justifyContent: 'center' }}>{mp}</button>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 8 }}>We'll automatically process your payout when your balance reaches this amount.</div>
              </div>
            </div>
          )}

          {/* ── STEP 6: DONE ── */}
          {step === 6 && (
            <div style={{ background: 'rgba(255,255,255,.9)', borderRadius: 28, padding: '44px 40px', boxShadow: '0 8px 40px rgba(219,39,119,.12)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <ScoreRing pct={profileScore()} />
              </div>
              <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 26, color: '#18181b', letterSpacing: '-.02em', marginBottom: 8 }}>You're all set!</div>
              <div style={{ fontSize: 14, color: '#71717a', marginBottom: 28 }}>Your panel profile is live. Start earning by completing matched surveys.</div>

              <div style={{ background: 'rgba(255,255,255,.7)', border: '1px solid #f1f1f4', borderRadius: 16, padding: '18px 20px', marginBottom: 28, textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Profile checklist</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {completedSections.map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: s.done ? '#27272a' : '#a1a1aa' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.done ? '#10b981' : '#d4d4d8'} strokeWidth="2.6" strokeLinecap="round">
                        <path d={s.done ? 'M20 6 9 17l-5-5' : 'M18 6 6 18M6 6l12 12'} />
                      </svg>
                      {s.label}
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => router.push('/audience')} style={{ width: '100%', fontSize: 16, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#db2777,#be185d)', border: 'none', padding: '15px 28px', borderRadius: 14, cursor: 'pointer', boxShadow: '0 4px 20px rgba(219,39,119,.35)', fontFamily: "'Schibsted Grotesk', system-ui" }}>
                Go to Audience Dashboard →
              </button>
              <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 12 }}>You can update your profile any time from the dashboard.</div>
            </div>
          )}

          {/* Navigation buttons */}
          {step > 0 && step <= TOTAL_STEPS && (
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setStep(s => s - 1)} style={{ fontSize: 14, fontWeight: 600, color: '#52525b', background: 'rgba(255,255,255,.85)', border: '1.5px solid #e4e4e7', padding: '12px 22px', borderRadius: 12, cursor: 'pointer' }}>← Back</button>
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                style={{ flex: 1, fontSize: 15, fontWeight: 700, color: canNext() ? '#fff' : '#a1a1aa', background: canNext() ? 'linear-gradient(135deg,#db2777,#be185d)' : 'rgba(255,255,255,.6)', border: canNext() ? 'none' : '1.5px solid #e4e4e7', padding: '12px 28px', borderRadius: 12, cursor: canNext() ? 'pointer' : 'not-allowed', boxShadow: canNext() ? '0 4px 14px rgba(219,39,119,.3)' : 'none', transition: 'all .15s', fontFamily: "'Schibsted Grotesk', system-ui" }}
              >
                {step === TOTAL_STEPS ? 'Finish setup →' : 'Continue →'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
