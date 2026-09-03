'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase-browser'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const S = {
  input: {
    width: '100%', fontSize: 14, color: '#18181b',
    border: '1.5px solid #e4e4e7', borderRadius: 11, padding: '11px 14px', background: '#fff',
    fontFamily: 'inherit', outline: 'none', transition: 'border-color .15s',
  } as React.CSSProperties,
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 5 } as React.CSSProperties,
}

const STEPS = ['Account', 'Role', 'Intent', 'Profile', 'Plan']

type Role = 'researcher' | 'audience' | 'expert'

const ROLE_CARDS = [
  { key: 'researcher' as Role, emoji: '📊', title: 'Researcher', desc: 'Create, launch & analyse surveys. Hire expert help when you need it.' },
  { key: 'audience' as Role, emoji: '✅', title: 'Respondent', desc: 'Complete surveys and earn real rewards for your time and opinions.' },
  { key: 'expert' as Role, emoji: '🛠', title: 'Expert / Agent', desc: 'Offer translation, analysis, or design services to research teams.' },
]

const INTENTS: Record<Role, string[]> = {
  researcher: ['Create & launch surveys', 'Hire expert help', 'Analyse survey results', 'All of the above'],
  audience: ['Earn money from surveys', 'Contribute to research', 'Both — earn & contribute'],
  expert: ['Survey design & creation', 'Survey translation', 'Data analysis & reporting', 'Research operations support'],
}

const INTENT_TITLES: Record<Role, string> = {
  researcher: 'What brings you to SurveyAI?',
  audience: 'How do you want to contribute?',
  expert: 'What services do you offer?',
}

const RESEARCHER_ROLES = [
  { emoji: '📊', label: 'Marketer' }, { emoji: '🔬', label: 'Researcher' },
  { emoji: '👥', label: 'HR / People' }, { emoji: '🛠', label: 'Product' },
  { emoji: '🏫', label: 'Education' }, { emoji: '💼', label: 'Consultant' },
]

const PLANS = [
  { id: 'free', name: 'Free', tagline: 'Forever free', priceM: '$0', priceY: '$0', period: '/mo', popular: false,
    features: ['3 surveys', '100 responses/mo', '5 question types', 'Basic analytics'] },
  { id: 'pro', name: 'Pro', tagline: 'For growing teams', priceM: '$29', priceY: '$23', period: '/mo', popular: true,
    features: ['Unlimited surveys', '1,000 responses/mo', 'All question types', 'Logic & branching', 'Advanced analytics', '5 integrations'] },
  { id: 'business', name: 'Business', tagline: 'Scale with your team', priceM: '$79', priceY: '$63', period: '/mo', popular: false,
    features: ['Unlimited surveys', '10,000 responses/mo', 'Team collaboration', 'Unlimited integrations', 'Custom branding'] },
  { id: 'enterprise', name: 'Enterprise', tagline: 'Large organisations', priceM: 'Custom', priceY: 'Custom', period: '', popular: false,
    features: ['Everything in Business', 'SSO / SAML', 'Dedicated support', 'SLA guarantee', 'Audit logs'] },
]

function pwStrength(pw: string) {
  if (!pw) return { pct: 0, color: '#e4e4e7', label: '' }
  if (pw.length < 6) return { pct: 25, color: '#ef4444', label: 'Too short' }
  if (pw.length < 8) return { pct: 50, color: '#f59e0b', label: 'Weak' }
  if (/[^a-zA-Z0-9]/.test(pw) && pw.length >= 10) return { pct: 100, color: '#10b981', label: 'Strong' }
  return { pct: 75, color: '#f59e0b', label: 'Good' }
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [role, setRole] = useState<Role | ''>('')
  const [intents, setIntents] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  // Step 1 fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Step 4 researcher
  const [resRole, setResRole] = useState('')
  const [company, setCompany] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [useCase, setUseCase] = useState('')

  // Step 4 audience
  const [country, setCountry] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [interests, setInterests] = useState<string[]>([])

  // Step 4 expert
  const [specializations, setSpecializations] = useState<string[]>([])
  const [expertBio, setExpertBio] = useState('')
  const [rateType, setRateType] = useState<'hourly' | 'fixed'>('hourly')
  const [rate, setRate] = useState('')
  const [availability, setAvailability] = useState('Full-time')

  const pw = pwStrength(password)
  const stepCount = role === 'researcher' ? 5 : 4

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // If already logged in but no role, keep onboarding
        // If has role, redirect
        fetch(`${API}/profiles/${user.id}/onboarding`)
          .then(r => r.json())
          .then(d => { if (d.role) router.replace(roleRedirect(d.role)) })
          .catch(() => {})
      }
    })
  }, [])

  function roleRedirect(r: string) {
    if (r === 'audience') return '/audience'
    if (r === 'expert') return '/expert'
    return '/'
  }

  function toggleArr<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]
  }

  const circleStyle = (s: 'done' | 'cur' | 'future') => ({
    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700,
    ...(s === 'done' ? { background: '#db2777', color: '#fff' } :
       s === 'cur'  ? { background: '#fff', border: '2px solid #db2777', color: '#db2777' } :
                     { background: 'rgba(255,255,255,.6)', border: '2px solid #e4e4e7', color: '#a1a1aa' })
  } as React.CSSProperties)

  const next = async () => {
    setError('')
    if (step === 1) {
      if (!firstName || !email || !password) { setError('Please fill in all required fields.'); return }
      if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
      setLoading(true)
      const { error: e } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: `${firstName} ${lastName}`.trim() } },
      })
      setLoading(false)
      if (e) { setError(e.message); return }
      setStep(2)
    } else if (step === 2) {
      if (!role) { setError('Please select your role to continue.'); return }
      setStep(3)
    } else if (step === 3) {
      setStep(4)
    } else if (step === 4) {
      if (role === 'researcher') setStep(5)
      else await finishOnboarding()
    } else if (step === 5) {
      await finishOnboarding('free')
    }
  }

  const finishOnboarding = async (plan?: string) => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const profileData = {
      role,
      intents,
      plan: plan || 'free',
      ...(role === 'researcher' ? { resRole, company, teamSize, useCase } : {}),
      ...(role === 'audience' ? { country, ageRange, languages, interests } : {}),
      ...(role === 'expert' ? { specializations, expertBio, rateType, rate, availability } : {}),
    }

    await fetch(`${API}/profiles/${user.id}/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    }).catch(() => {})

    setLoading(false)
    router.push(roleRedirect(role))
  }

  const selectPlan = async (planId: string) => {
    await finishOnboarding(planId)
  }

  const chipStyle = (on: boolean) => ({
    width: '100%', textAlign: 'left' as const, fontSize: 14, fontWeight: 600,
    padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
    border: `${on ? 2 : 1.5}px solid ${on ? '#db2777' : '#e4e4e7'}`,
    background: on ? '#fdf2f8' : 'rgba(255,255,255,.9)', color: on ? '#be185d' : '#27272a',
  } as React.CSSProperties)

  const pillStyle = (on: boolean) => ({
    fontSize: 12, fontWeight: 600, padding: '7px 13px', borderRadius: 99, cursor: 'pointer',
    border: `1.5px solid ${on ? '#db2777' : '#e4e4e7'}`,
    background: on ? '#fdf2f8' : '#fff', color: on ? '#be185d' : '#52525b',
  } as React.CSSProperties)

  const visStep = Math.min(step, stepCount)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', height: 62, background: 'rgba(255,255,255,.75)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(219,39,119,.1)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }} onClick={() => router.push('/login')}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(219,39,119,.35)' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 18, letterSpacing: '-.02em', color: '#18181b' }}>SurveyAI</span>
        </div>
        <div style={{ fontSize: 13, color: '#71717a' }}>Already have an account? <span onClick={() => router.push('/login')} style={{ color: '#db2777', fontWeight: 700, cursor: 'pointer' }}>Sign in</span></div>
      </header>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0, padding: '28px 0 0' }}>
        {STEPS.slice(0, stepCount).map((label, i) => {
          const k = i + 1
          const state: 'done' | 'cur' | 'future' = visStep > k ? 'done' : visStep === k ? 'cur' : 'future'
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={circleStyle(state)}>{state === 'done' ? '✓' : k}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: state === 'cur' ? '#db2777' : state === 'done' ? '#18181b' : '#a1a1aa', whiteSpace: 'nowrap' }}>{label}</div>
              </div>
              {i < stepCount - 1 && (
                <div style={{ width: 64, height: 2, background: visStep > k ? '#db2777' : '#e4e4e7', marginTop: 15, flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 20px 48px' }}>

        {/* Step 1: Account */}
        {step === 1 && (
          <div style={{ background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(12px)', borderRadius: 24, padding: 40, width: 480, maxWidth: '100%', boxShadow: '0 20px 60px rgba(219,39,119,.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 26, color: '#18181b', letterSpacing: '-.02em' }}>Create your account</div>
              <div style={{ fontSize: 14, color: '#71717a', marginTop: 6 }}>No credit card needed to get started.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={S.label}>First name</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" style={S.input}
                    onFocus={e => (e.target.style.borderColor = '#f9a8d4')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')} />
                </div>
                <div>
                  <label style={S.label}>Last name</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" style={S.input}
                    onFocus={e => (e.target.style.borderColor = '#f9a8d4')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')} />
                </div>
              </div>
              <div>
                <label style={S.label}>Work email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" style={S.input}
                  onFocus={e => (e.target.style.borderColor = '#f9a8d4')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')} />
              </div>
              <div>
                <label style={S.label}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" style={S.input}
                  onFocus={e => (e.target.style.borderColor = '#f9a8d4')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')} />
                {password && (
                  <>
                    <div style={{ height: 4, borderRadius: 99, background: pw.color, width: `${pw.pct}%`, marginTop: 8, transition: 'all .3s' }} />
                    <div style={{ fontSize: 11, color: pw.color, marginTop: 3, fontWeight: 600 }}>{pw.label}</div>
                  </>
                )}
              </div>
              {error && <div style={{ fontSize: 13, color: '#e11d48', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '10px 14px', fontWeight: 600 }}>{error}</div>}
              <button onClick={next} disabled={loading} style={{ width: '100%', fontSize: 15, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#db2777,#be185d)', border: 'none', padding: 14, borderRadius: 12, cursor: 'pointer', marginTop: 4, boxShadow: '0 6px 20px rgba(219,39,119,.35)' }}>
                {loading ? 'Creating account…' : 'Continue →'}
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: '#a1a1aa' }}>
              By continuing you agree to our <span style={{ color: '#db2777' }}>Terms</span> and <span style={{ color: '#db2777' }}>Privacy Policy</span>.
            </div>
          </div>
        )}

        {/* Step 2: Role */}
        {step === 2 && (
          <div style={{ width: '100%', maxWidth: 840 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 28, color: '#18181b', letterSpacing: '-.02em' }}>Who are you?</div>
              <div style={{ fontSize: 14, color: '#71717a', marginTop: 6 }}>Choose your role. You can always switch later.</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
              {ROLE_CARDS.map(rc => (
                <button key={rc.key} onClick={() => setRole(rc.key)} style={{ textAlign: 'center', padding: '28px 20px', borderRadius: 20, cursor: 'pointer', border: `${role === rc.key ? 2 : 1.5}px solid ${role === rc.key ? '#db2777' : 'rgba(0,0,0,.08)'}`, background: role === rc.key ? '#fdf2f8' : 'rgba(255,255,255,.85)', boxShadow: role === rc.key ? '0 8px 24px rgba(219,39,119,.15)' : '0 2px 8px rgba(0,0,0,.04)' }}>
                  <div style={{ fontSize: 48, marginBottom: 14 }}>{rc.emoji}</div>
                  <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 18, color: '#18181b', marginBottom: 8 }}>{rc.title}</div>
                  <div style={{ fontSize: 13, color: '#71717a', lineHeight: 1.55 }}>{rc.desc}</div>
                  {role === rc.key && (
                    <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#be185d', background: '#fdf2f8', padding: '5px 12px', borderRadius: 99 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>Selected
                    </div>
                  )}
                </button>
              ))}
            </div>
            {error && <div style={{ textAlign: 'center', fontSize: 13, color: '#e11d48', fontWeight: 600, marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button onClick={() => setStep(1)} style={{ fontSize: 14, fontWeight: 600, color: '#71717a', background: 'rgba(255,255,255,.8)', border: '1px solid #e4e4e7', padding: '13px 24px', borderRadius: 12, cursor: 'pointer' }}>← Back</button>
              <button onClick={next} style={{ fontSize: 15, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#db2777,#be185d)', border: 'none', padding: '13px 36px', borderRadius: 12, cursor: 'pointer', boxShadow: '0 6px 20px rgba(219,39,119,.35)' }}>Continue →</button>
            </div>
          </div>
        )}

        {/* Step 3: Intent */}
        {step === 3 && role && (
          <div style={{ background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(12px)', borderRadius: 24, padding: 40, width: 540, maxWidth: '100%', boxShadow: '0 20px 60px rgba(219,39,119,.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 24, color: '#18181b', letterSpacing: '-.02em' }}>{INTENT_TITLES[role]}</div>
              <div style={{ fontSize: 13, color: '#71717a', marginTop: 5 }}>Select all that apply.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {INTENTS[role].map(intent => (
                <button key={intent} onClick={() => setIntents(toggleArr(intents, intent))} style={chipStyle(intents.includes(intent))}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{intent}</span>
                    {intents.includes(intent) && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>}
                  </div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ flexShrink: 0, fontSize: 14, fontWeight: 600, color: '#71717a', background: '#f4f4f5', border: 'none', padding: '13px 20px', borderRadius: 12, cursor: 'pointer' }}>← Back</button>
              <button onClick={next} style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#db2777,#be185d)', border: 'none', padding: 13, borderRadius: 12, cursor: 'pointer', boxShadow: '0 6px 20px rgba(219,39,119,.35)' }}>Set up my profile →</button>
            </div>
          </div>
        )}

        {/* Step 4a: Researcher profile */}
        {step === 4 && role === 'researcher' && (
          <div style={{ background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(12px)', borderRadius: 24, padding: 40, width: 520, maxWidth: '100%', boxShadow: '0 20px 60px rgba(219,39,119,.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 24, color: '#18181b' }}>Your profile</div>
              <div style={{ fontSize: 13, color: '#71717a', marginTop: 5 }}>Help us personalise SurveyAI for your workflow.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={S.label}>Your role</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {RESEARCHER_ROLES.map(r => (
                    <button key={r.label} onClick={() => setResRole(r.label)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px', borderRadius: 12, cursor: 'pointer', border: `1.5px solid ${resRole === r.label ? '#db2777' : '#e4e4e7'}`, background: resRole === r.label ? '#fdf2f8' : 'transparent' }}>
                      <span style={{ fontSize: 18 }}>{r.emoji}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#27272a' }}>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={S.label}>Company / Organisation</label>
                <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Inc." style={S.input}
                  onFocus={e => (e.target.style.borderColor = '#f9a8d4')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')} />
              </div>
              <div>
                <label style={S.label}>Team size</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['1–5', '6–20', '21–100', '100+'].map(sz => (
                    <button key={sz} onClick={() => setTeamSize(sz)} style={pillStyle(teamSize === sz)}>{sz}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={S.label}>Primary use case</label>
                <select value={useCase} onChange={e => setUseCase(e.target.value)} style={{ ...S.input }}
                  onFocus={e => (e.target.style.borderColor = '#f9a8d4')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')}>
                  <option value="">Select primary use case…</option>
                  <option value="cx">Customer experience / NPS</option>
                  <option value="research">Market research</option>
                  <option value="hr">Employee feedback / HR</option>
                  <option value="product">Product feedback</option>
                  <option value="lead">Lead generation</option>
                  <option value="event">Event registration</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setStep(3)} style={{ flexShrink: 0, fontSize: 14, fontWeight: 600, color: '#71717a', background: '#f4f4f5', border: 'none', padding: '13px 20px', borderRadius: 12, cursor: 'pointer' }}>← Back</button>
                <button onClick={next} disabled={loading} style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#db2777,#be185d)', border: 'none', padding: 13, borderRadius: 12, cursor: 'pointer', boxShadow: '0 6px 20px rgba(219,39,119,.35)' }}>
                  {loading ? 'Saving…' : 'Choose your plan →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4b: Audience profile */}
        {step === 4 && role === 'audience' && (
          <div style={{ background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(12px)', borderRadius: 24, padding: 40, width: 580, maxWidth: '100%', boxShadow: '0 20px 60px rgba(219,39,119,.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 24, color: '#18181b' }}>Set up your respondent profile</div>
              <div style={{ fontSize: 13, color: '#71717a', marginTop: 5 }}>This determines which surveys you're eligible for.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={S.label}>Country</label>
                  <select value={country} onChange={e => setCountry(e.target.value)} style={{ ...S.input }}
                    onFocus={e => (e.target.style.borderColor = '#f9a8d4')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')}>
                    <option value="">Select country…</option>
                    {['United States', 'United Kingdom', 'India', 'Canada', 'Australia', 'Germany', 'France'].map(c => <option key={c}>{c}</option>)}
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Age range</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['18–24', '25–34', '35–44', '45–54', '55–64', '65+'].map(r => (
                      <button key={r} onClick={() => setAgeRange(r)} style={{ ...pillStyle(ageRange === r), fontSize: 11, padding: '6px 12px' }}>{r}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label style={S.label}>Languages you speak</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {['English', 'Spanish', 'French', 'German', 'Hindi', 'Arabic', 'Chinese', 'Portuguese', 'Italian', 'Japanese'].map(l => (
                    <button key={l} onClick={() => setLanguages(toggleArr(languages, l))} style={pillStyle(languages.includes(l))}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={S.label}>Topics you're interested in</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {['Technology', 'Health & wellness', 'Finance', 'Food & drink', 'Travel', 'Education', 'Gaming', 'Fashion', 'Sports'].map(t => (
                    <button key={t} onClick={() => setInterests(toggleArr(interests, t))} style={pillStyle(interests.includes(t))}>{t}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setStep(3)} style={{ flexShrink: 0, fontSize: 14, fontWeight: 600, color: '#71717a', background: '#f4f4f5', border: 'none', padding: '13px 20px', borderRadius: 12, cursor: 'pointer' }}>← Back</button>
                <button onClick={next} disabled={loading} style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#db2777,#be185d)', border: 'none', padding: 13, borderRadius: 12, cursor: 'pointer', boxShadow: '0 6px 20px rgba(219,39,119,.35)' }}>
                  {loading ? 'Saving…' : 'Go to my tasks →'}
                </button>
              </div>
              <div style={{ textAlign: 'center' }}>
                <button onClick={() => finishOnboarding()} style={{ fontSize: 12, color: '#a1a1aa', background: 'none', border: 'none', cursor: 'pointer' }}>Skip for now →</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4c: Expert profile */}
        {step === 4 && role === 'expert' && (
          <div style={{ background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(12px)', borderRadius: 24, padding: 40, width: 600, maxWidth: '100%', boxShadow: '0 20px 60px rgba(219,39,119,.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 24, color: '#18181b' }}>Set up your expert profile</div>
              <div style={{ fontSize: 13, color: '#71717a', marginTop: 5 }}>Help researchers find and hire you.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={S.label}>Specializations <span style={{ fontWeight: 400, color: '#a1a1aa' }}>select all that apply</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {['Survey design', 'Questionnaire writing', 'Data analysis', 'Translation', 'CAWI/CATI setup', 'Panel management', 'Research ops', 'Report writing', 'Focus groups', 'UX research'].map(s => (
                    <button key={s} onClick={() => setSpecializations(toggleArr(specializations, s))} style={pillStyle(specializations.includes(s))}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={S.label}>Short bio</label>
                <textarea value={expertBio} onChange={e => setExpertBio(e.target.value)} rows={3} placeholder="e.g. Survey methodology specialist with 8 years in consumer research…"
                  style={{ ...S.input, resize: 'none', lineHeight: 1.5 }}
                  onFocus={e => (e.target.style.borderColor = '#f9a8d4')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={S.label}>Rate type</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['hourly', 'fixed'] as const).map(t => (
                      <button key={t} onClick={() => setRateType(t)} style={{ fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', background: rateType === t ? '#fdf2f8' : '#f4f4f5', color: rateType === t ? '#be185d' : '#71717a', ...(rateType === t ? { border: '1.5px solid #db2777' } : {}) }}>
                        {t === 'hourly' ? 'Hourly' : 'Per project'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={S.label}>{rateType === 'hourly' ? 'Hourly rate ($)' : 'Project rate ($)'}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #e4e4e7', borderRadius: 11, padding: '2px 10px', background: '#fff' }}>
                    <span style={{ fontSize: 14, color: '#71717a' }}>$</span>
                    <input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="85" style={{ flex: 1, fontSize: 14, color: '#18181b', border: 'none', padding: '9px 0', background: 'transparent', outline: 'none' }} />
                  </div>
                </div>
              </div>
              <div>
                <label style={S.label}>Availability</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Full-time', 'Part-time', 'Weekends only'].map(a => (
                    <button key={a} onClick={() => setAvailability(a)} style={pillStyle(availability === a)}>{a}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setStep(3)} style={{ flexShrink: 0, fontSize: 14, fontWeight: 600, color: '#71717a', background: '#f4f4f5', border: 'none', padding: '13px 20px', borderRadius: 12, cursor: 'pointer' }}>← Back</button>
                <button onClick={next} disabled={loading} style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#db2777,#be185d)', border: 'none', padding: 13, borderRadius: 12, cursor: 'pointer', boxShadow: '0 6px 20px rgba(219,39,119,.35)' }}>
                  {loading ? 'Saving…' : 'Go to my jobs →'}
                </button>
              </div>
              <div style={{ textAlign: 'center' }}>
                <button onClick={() => finishOnboarding()} style={{ fontSize: 12, color: '#a1a1aa', background: 'none', border: 'none', cursor: 'pointer' }}>Skip for now →</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Plan (Researcher only) */}
        {step === 5 && (
          <div style={{ width: '100%', maxWidth: 920 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 28, color: '#18181b', letterSpacing: '-.02em' }}>Choose your plan</div>
              <div style={{ fontSize: 14, color: '#71717a', marginTop: 6 }}>Start free. Upgrade anytime. No lock-in.</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14, background: 'rgba(255,255,255,.8)', border: '1px solid rgba(219,39,119,.15)', padding: '5px 5px 5px 14px', borderRadius: 99 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#52525b' }}>Billing:</span>
                {(['monthly', 'yearly'] as const).map(b => (
                  <button key={b} onClick={() => setBilling(b)} style={{ fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', background: billing === b ? 'linear-gradient(135deg,#db2777,#be185d)' : 'transparent', color: billing === b ? '#fff' : '#71717a', boxShadow: billing === b ? '0 2px 8px rgba(219,39,119,.25)' : 'none' }}>
                    {b === 'monthly' ? 'Monthly' : <>Yearly <span style={{ fontSize: 10, fontWeight: 700, color: billing === 'yearly' ? '#fff' : '#db2777', background: billing === 'yearly' ? 'rgba(255,255,255,.2)' : '#fdf2f8', padding: '2px 6px', borderRadius: 6, marginLeft: 2 }}>-20%</span></>}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, alignItems: 'start' }}>
              {PLANS.map(pl => {
                const price = billing === 'yearly' ? pl.priceY : pl.priceM
                return (
                  <div key={pl.id} style={{ position: 'relative', background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: pl.popular ? '28px 20px 22px' : '22px 20px', border: pl.popular ? '2px solid #db2777' : '1.5px solid rgba(0,0,0,.06)', boxShadow: pl.popular ? '0 16px 48px rgba(219,39,119,.18)' : '0 4px 14px rgba(0,0,0,.05)', marginTop: pl.popular ? 0 : 12 }}>
                    {pl.popular && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 99, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(219,39,119,.3)' }}>Most popular</div>}
                    <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 16, color: '#18181b', marginBottom: 4 }}>{pl.name}</div>
                    <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 16 }}>{pl.tagline}</div>
                    <div style={{ marginBottom: 18 }}>
                      <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 32, color: '#18181b' }}>{price}</span>
                      <span style={{ fontSize: 12, color: '#a1a1aa' }}>{pl.period}</span>
                    </div>
                    <button onClick={() => selectPlan(pl.id)} disabled={loading} style={{ width: '100%', fontSize: 13, fontWeight: 700, padding: 10, borderRadius: 10, cursor: 'pointer', border: 'none', ...(pl.popular ? { color: '#fff', background: 'linear-gradient(135deg,#db2777,#be185d)', boxShadow: '0 4px 14px rgba(219,39,119,.3)' } : pl.id === 'business' ? { color: '#fff', background: '#18181b' } : pl.id === 'enterprise' ? { color: '#52525b', background: '#f4f4f5', border: '1px solid #e4e4e7' } : { color: '#be185d', background: '#fdf2f8', border: '1.5px solid #fbcfe8' }) }}>
                      {pl.id === 'free' ? 'Start free trial' : pl.id === 'enterprise' ? 'Contact sales' : 'Start 14-day trial'}
                    </button>
                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {pl.features.map(f => (
                        <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.6" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M20 6 9 17l-5-5"/></svg>
                          <span style={{ color: '#27272a' }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ textAlign: 'center', marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, fontSize: 13, color: '#a1a1aa' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>No credit card for free trial</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>Cancel anytime</span>
            </div>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button onClick={() => setStep(4)} style={{ fontSize: 13, color: '#a1a1aa', background: 'transparent', border: 'none', cursor: 'pointer' }}>← Back</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
