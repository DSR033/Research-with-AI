'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// Fallback demo for known slug-based IDs (backward compat / preview)
const DEMO_EXPERTS: Record<string, ExpertProfile> = {
  'jane-smith': {
    id: 'jane-smith',
    name: 'Jane Smith',
    title: 'Senior Survey Researcher & Data Analyst',
    location: 'San Francisco, CA',
    avatar: '',
    initials: 'JS',
    bio: 'Survey research professional with 7+ years designing enterprise-grade studies for Fortune 500 clients. I specialize in customer experience, employee engagement, and market research. My work has helped companies like TechCorp, RetailBrand, and MedResearch turn survey data into actionable strategy.\n\nI bring a rigorous, mixed-methods approach — combining quantitative design with qualitative depth — and deliver polished reports that non-researchers can actually use.',
    specializations: ['Survey Design', 'Data Analysis', 'UX Research', 'NPS & CX', 'Statistical Analysis', 'Report Writing'],
    languages: ['English', 'Spanish'],
    hourly_rate: 95,
    years_experience: '7',
    availability: 'part' as const,
    rating: 4.9,
    total_reviews: 28,
    total_projects: 34,
    response_rate: 98,
    profile_score: 96,
    member_since: 'Jan 2024',
    portfolio: [
      { title: 'Employee Engagement Study — TechCorp 2025', description: '45-question survey with skip logic for 500 respondents. Delivered 80%+ completion rate.', url: '#' },
      { title: 'Consumer Preference Report — RetailBrand', description: 'Segmentation analysis of 1,200 responses with cross-tab breakdowns by age, income, and region.', url: '#' },
      { title: 'Patient Satisfaction Survey — MedResearch', description: 'Bilingual (EN/ES) survey with medical terminology validation and HIPAA-compliant collection.', url: '#' },
    ],
    certifications: [
      { title: 'Qualtrics Research Core', issuer: 'Qualtrics', year: '2023' },
      { title: 'Google Analytics Certified', issuer: 'Google', year: '2022' },
      { title: 'RIVA Advanced Moderator', issuer: 'RIVA Training Institute', year: '2021' },
    ],
    reviews: [
      { client: 'TechCorp Inc.', project: 'Employee Engagement Survey Design', rating: 5, date: 'Jun 2026', text: 'Jane delivered exceptional work — thorough, on-time, and the final survey was exactly what our HR team needed. Will hire again.' },
      { client: 'Retail Brand Co.', project: 'Market Research Data Analysis', rating: 5, date: 'May 2026', text: 'Incredible analyst. The segmentation report she produced was clear enough for our C-suite to act on immediately.' },
      { client: 'E-Commerce Plus', project: 'Customer Journey Mapping Survey', rating: 5, date: 'Apr 2026', text: 'Professional, communicative, and delivered ahead of schedule. The survey design was creative and the completion rate blew us away.' },
      { client: 'SaaS Startup', project: 'Product Feedback Analysis Q2', rating: 4, date: 'Mar 2026', text: 'Great work overall. Minor revisions needed on the executive summary but Jane addressed them quickly.' },
    ],
  },
}

type ExpertProfile = {
  id: string; name: string; title: string; location: string
  avatar: string; initials: string; bio: string
  specializations: string[]; languages: string[]
  hourly_rate: number; years_experience: string
  availability: 'full' | 'part' | 'occasional'
  rating: number; total_reviews: number; total_projects: number
  response_rate: number; profile_score: number; member_since: string
  portfolio: Array<{ title: string; description: string; url: string }>
  certifications: Array<{ title: string; issuer: string; year: string }>
  reviews: Array<{ client: string; project: string; rating: number; date: string; text: string }>
}

const AVAIL_LABEL = { full: 'Available full-time', part: 'Available part-time', occasional: 'Available occasionally' }
const AVAIL_COLOR = { full: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' }, part: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' }, occasional: { bg: '#f4f4f5', color: '#71717a', border: '#e4e4e7' } }

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: size, color: i <= Math.round(rating) ? '#f59e0b' : '#e4e4e7' }}>★</span>
      ))}
    </span>
  )
}

export default function ExpertProfilePage() {
  const router = useRouter()
  const params = useParams()
  const expertId = params.id as string
  const [showHireModal, setShowHireModal] = useState(false)
  const [hireMsg, setHireMsg] = useState('')
  const [hireBudget, setHireBudget] = useState('')
  const [hireType, setHireType] = useState('Survey Design')
  const [hireSent, setHireSent] = useState(false)
  const [activeTab, setActiveTab] = useState<'about' | 'portfolio' | 'reviews'>('about')

  const [expert, setExpert] = useState<ExpertProfile | null>(DEMO_EXPERTS[expertId] ?? null)
  const [profileLoading, setProfileLoading] = useState(!DEMO_EXPERTS[expertId])
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (DEMO_EXPERTS[expertId]) return // skip for demo slugs
    fetch(`${API}/expert/profiles/${expertId}`)
      .then(r => { if (!r.ok) { setNotFound(true); setProfileLoading(false); return null } return r.json() })
      .then(data => { if (data) setExpert(data) })
      .catch(() => setNotFound(true))
      .finally(() => setProfileLoading(false))
  }, [expertId])

  if (profileLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'radial-gradient(ellipse at 18% 12%, #fce7f3, #ede9fe 55%, #e0e7ff)', color: '#71717a', fontSize: 14 }}>
        Loading profile…
      </div>
    )
  }

  if (notFound || !expert) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'radial-gradient(ellipse at 18% 12%, #fce7f3, #ede9fe 55%, #e0e7ff)', gap: 12 }}>
        <div style={{ fontSize: 40 }}>🔍</div>
        <div style={{ fontFamily: "'Schibsted Grotesk',system-ui", fontWeight: 800, fontSize: 20, color: '#18181b' }}>Expert profile not found</div>
        <div style={{ fontSize: 14, color: '#71717a' }}>This expert may not have completed their profile yet.</div>
        <button onClick={() => router.push('/expert')} style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: '#db2777', background: '#fce7f3', border: '1.5px solid #fbcfe8', borderRadius: 9, padding: '8px 18px', cursor: 'pointer' }}>
          Back to expert dashboard
        </button>
      </div>
    )
  }

  const avail = AVAIL_COLOR[expert.availability]

  const handleHire = async () => {
    await new Promise(r => setTimeout(r, 800))
    setHireSent(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 18% 12%, #fce7f3, #ede9fe 55%, #e0e7ff)', fontFamily: "'Hanken Grotesk', system-ui" }}>

      {/* Nav */}
      <header style={{ background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(14px)', borderBottom: '1.5px solid rgba(219,39,119,.10)', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 18, letterSpacing: '-.02em', color: '#18181b' }}>SurveyAI</span>
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => router.push('/expert')} style={{ fontSize: 13, color: '#71717a', background: 'none', border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Expert dashboard</button>
          <button onClick={() => setShowHireModal(true)} style={{ fontSize: 13, background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>Hire {expert.name.split(' ')[0]}</button>
        </div>
      </header>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28, alignItems: 'start' }}>

        {/* ── LEFT: Main content ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Profile header card */}
          <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid rgba(219,39,119,.08)', padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              {/* Avatar */}
              <div style={{ width: 88, height: 88, borderRadius: 24, background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 16px rgba(219,39,119,.3)' }}>
                <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 28, color: '#fff' }}>{expert.initials}</span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
                  <h1 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 26, letterSpacing: '-.02em', color: '#18181b', margin: 0 }}>{expert.name}</h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: avail.bg, border: `1.5px solid ${avail.border}`, borderRadius: 20, padding: '3px 10px' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: avail.color }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: avail.color }}>{AVAIL_LABEL[expert.availability]}</span>
                  </div>
                </div>
                <div style={{ fontSize: 15, color: '#52525b', marginBottom: 10 }}>{expert.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#71717a' }}>
                  <span>📍 {expert.location}</span>
                  <span>🗓 Member since {expert.member_since}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Stars rating={expert.rating} />
                    <strong style={{ color: '#18181b' }}>{expert.rating}</strong>
                    <span>({expert.total_reviews} reviews)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginTop: 24, background: '#f4f4f5', borderRadius: 12, overflow: 'hidden' }}>
              {[
                { label: 'Projects done', value: String(expert.total_projects) },
                { label: 'Response rate', value: `${expert.response_rate}%` },
                { label: 'Hourly rate', value: `$${expert.hourly_rate}/hr` },
                { label: 'Experience', value: `${expert.years_experience} yrs` },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', padding: '14px 18px', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 20, color: '#18181b' }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1.5px solid rgba(219,39,119,.10)', gap: 2 }}>
            {(['about', 'portfolio', 'reviews'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, border: 'none', background: 'transparent', cursor: 'pointer', color: activeTab === t ? '#db2777' : '#71717a', borderBottom: `2px solid ${activeTab === t ? '#db2777' : 'transparent'}`, marginBottom: -1.5, textTransform: 'capitalize', fontFamily: 'inherit' }}>
                {t === 'about' ? 'About' : t === 'portfolio' ? `Portfolio (${expert.portfolio.length})` : `Reviews (${expert.total_reviews})`}
              </button>
            ))}
          </div>

          {/* ── ABOUT TAB ── */}
          {activeTab === 'about' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Bio */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)', padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
                <h2 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 16, color: '#18181b', marginBottom: 14 }}>About</h2>
                {expert.bio.split('\n\n').map((p, i) => (
                  <p key={i} style={{ fontSize: 14, color: '#3f3f46', lineHeight: 1.75, margin: i > 0 ? '12px 0 0' : 0 }}>{p}</p>
                ))}
              </div>

              {/* Specializations */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)', padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
                <h2 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 16, color: '#18181b', marginBottom: 14 }}>Specializations</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {expert.specializations.map(s => (
                    <span key={s} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: '#fce7f3', color: '#db2777', border: '1.5px solid #fbcfe8' }}>{s}</span>
                  ))}
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#71717a', fontWeight: 500 }}>Languages:</span>
                  {expert.languages.map(l => (
                    <span key={l} style={{ padding: '4px 10px', borderRadius: 16, fontSize: 12, fontWeight: 600, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>{l}</span>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              {expert.certifications.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)', padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
                  <h2 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 16, color: '#18181b', marginBottom: 16 }}>Certifications</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {expert.certifications.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#fce7f3,#ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#18181b' }}>{c.title}</div>
                          <div style={{ fontSize: 12, color: '#71717a' }}>{c.issuer} · {c.year}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PORTFOLIO TAB ── */}
          {activeTab === 'portfolio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {expert.portfolio.map((p, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)', padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#18181b', marginBottom: 6 }}>{p.title}</div>
                      <div style={{ fontSize: 13, color: '#52525b', lineHeight: 1.6 }}>{p.description}</div>
                    </div>
                    <a href={p.url} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#db2777', fontWeight: 600, textDecoration: 'none', background: '#fce7f3', border: '1.5px solid #fbcfe8', borderRadius: 8, padding: '6px 12px', whiteSpace: 'nowrap' }}>
                      View work ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── REVIEWS TAB ── */}
          {activeTab === 'reviews' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Rating summary */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)', padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,.04)', display: 'flex', gap: 32, alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 48, color: '#18181b', lineHeight: 1 }}>{expert.rating}</div>
                  <Stars rating={expert.rating} size={18} />
                  <div style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>{expert.total_reviews} reviews</div>
                </div>
                <div style={{ flex: 1 }}>
                  {[5,4,3,2,1].map(star => {
                    const count = expert.reviews.filter(r => r.rating === star).length
                    const pct = expert.total_reviews > 0 ? (count / expert.reviews.length) * 100 : 0
                    return (
                      <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#71717a', width: 12 }}>{star}</span>
                        <span style={{ color: '#f59e0b', fontSize: 12 }}>★</span>
                        <div style={{ flex: 1, height: 6, background: '#f4f4f5', borderRadius: 3 }}>
                          <div style={{ height: '100%', background: '#f59e0b', borderRadius: 3, width: `${pct}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: '#a1a1aa', width: 16 }}>{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {expert.reviews.map((r, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)', padding: '22px 28px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#18181b' }}>{r.client}</div>
                      <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{r.project}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <Stars rating={r.rating} size={13} />
                      <span style={{ fontSize: 11, color: '#a1a1aa' }}>{r.date}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: '#3f3f46', lineHeight: 1.7, margin: 0 }}>"{r.text}"</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Hire sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 76 }}>

          {/* Hire card */}
          <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid rgba(219,39,119,.08)', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,.07)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 28, color: '#18181b' }}>${expert.hourly_rate}</span>
              <span style={{ fontSize: 13, color: '#71717a' }}>/hr</span>
            </div>
            <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 20 }}>You pay ${expert.hourly_rate}/hr · Platform fee 15%</div>

            <button onClick={() => setShowHireModal(true)}
              style={{ width: '100%', background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 }}>
              Request a project
            </button>
            <button style={{ width: '100%', background: '#fff', color: '#db2777', border: '1.5px solid #db2777', borderRadius: 12, padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Send message
            </button>

            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '⚡', text: `Responds within 2 hours` },
                { icon: '🛡', text: 'Escrow-protected payments' },
                { icon: '↩', text: 'Revision included' },
              ].map(i => (
                <div key={i.text} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: '#52525b' }}>
                  <span>{i.icon}</span><span>{i.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Profile score */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)', padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Profile completeness</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
                <svg width="48" height="48" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="18" fill="none" stroke="#fce7f3" strokeWidth="5" />
                  <circle cx="24" cy="24" r="18" fill="none" stroke="#db2777" strokeWidth="5"
                    strokeDasharray={`${(expert.profile_score / 100) * 2 * Math.PI * 18} ${2 * Math.PI * 18}`}
                    strokeDashoffset={2 * Math.PI * 18 * 0.25}
                    strokeLinecap="round" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#db2777' }}>{expert.profile_score}%</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#18181b' }}>Verified expert</div>
                <div style={{ fontSize: 12, color: '#71717a' }}>All sections complete</div>
              </div>
            </div>
          </div>

          {/* Share */}
          <button onClick={() => { navigator.clipboard.writeText(window.location.href) }}
            style={{ background: '#fff', border: '1.5px solid #e4e4e7', borderRadius: 12, padding: '10px', fontSize: 13, fontWeight: 600, color: '#52525b', cursor: 'pointer', fontFamily: 'inherit' }}>
            🔗 Copy profile link
          </button>
        </div>
      </div>

      {/* ── HIRE MODAL ── */}
      {showHireModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,9,18,.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px 16px' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowHireModal(false); setHireSent(false) } }}>
          <div style={{ background: '#fff', borderRadius: 20, width: 520, maxWidth: '96vw', padding: '36px', boxShadow: '0 32px 80px rgba(0,0,0,.2)' }}>
            {!hireSent ? (<>
              <h2 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 22, color: '#18181b', marginBottom: 6 }}>Request a project</h2>
              <p style={{ fontSize: 14, color: '#71717a', marginBottom: 24 }}>Describe what you need and {expert.name.split(' ')[0]} will respond within 2 hours.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#52525b', marginBottom: 6 }}>Project type</label>
                  <select value={hireType} onChange={e => setHireType(e.target.value)}
                    style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff' }}>
                    {['Survey Design', 'Data Analysis', 'Translation', 'Report Writing', 'Other'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#52525b', marginBottom: 6 }}>Budget (USD)</label>
                  <input type="number" value={hireBudget} onChange={e => setHireBudget(e.target.value)} placeholder="e.g. 500"
                    style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#52525b', marginBottom: 6 }}>Describe your project *</label>
                  <textarea value={hireMsg} onChange={e => setHireMsg(e.target.value)}
                    placeholder={`Tell ${expert.name.split(' ')[0]} what you need, your timeline, and any specific requirements…`}
                    rows={4}
                    style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button onClick={() => setShowHireModal(false)}
                  style={{ flex: 1, background: '#fff', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#52525b' }}>Cancel</button>
                <button onClick={handleHire} disabled={!hireMsg.trim()}
                  style={{ flex: 2, background: hireMsg.trim() ? 'linear-gradient(135deg,#db2777,#be185d)' : '#e4e4e7', color: hireMsg.trim() ? '#fff' : '#a1a1aa', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, cursor: hireMsg.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                  Send request →
                </button>
              </div>
            </>) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>
                <h2 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 22, color: '#18181b', marginBottom: 10 }}>Request sent!</h2>
                <p style={{ fontSize: 14, color: '#52525b', lineHeight: 1.7, marginBottom: 24 }}>
                  {expert.name.split(' ')[0]} will respond within 2 hours. You'll get a notification once they accept your project.
                </p>
                <button onClick={() => { setShowHireModal(false); setHireSent(false) }}
                  style={{ background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 32px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
