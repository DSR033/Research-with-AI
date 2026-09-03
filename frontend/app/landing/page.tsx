'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const RESEARCHER_FEATURES = [
  { icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2', title: 'Multi-type builder', desc: '12 question types — single choice, rating, NPS, matrix, slider, and more. Drag and drop to reorder.' },
  { icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', title: 'Skip logic', desc: 'Branch and route respondents dynamically based on their answers. Build sophisticated survey flows.' },
  { icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', title: 'AI suggestions', desc: 'Auto-rephrase questions, detect bias, generate answer options, and improve clarity with one click.' },
  { icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8', title: 'Audience panel', desc: 'Access 250,000+ verified respondents. Filter by demographics, profession, interests, and more.' },
  { icon: 'M18 20V10M12 20V4M6 20v-6', title: 'Real-time results', desc: 'Watch responses stream in live. Completion rates, drop-off points, and answer distributions at a glance.' },
  { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', title: 'Expert review', desc: 'Automated quality checks plus on-demand methodology feedback from verified survey specialists.' },
]

const AUDIENCE_FEATURES = [
  { icon: 'M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0', title: 'Browse surveys', desc: 'Find paid surveys that match your profile and interests. New studies added daily.' },
  { icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', title: 'Instant payouts', desc: 'Earn tokens for every completed survey and cash out within 24 hours. No minimums.' },
  { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', title: 'Verified privacy', desc: 'One-time identity verification. Your personal data is never shared with researchers.' },
  { icon: 'M13 10V3L4 14h7v7l9-11h-7', title: 'Smart matching', desc: 'AI matches you to studies that fit your background so you always qualify for the surveys you see.' },
  { icon: 'M12 18h.01M8 21h8a2 2 0 0 0 2-2v-14a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z', title: 'Mobile-first', desc: 'Take surveys anywhere, anytime. Fully responsive design optimised for any screen size.' },
  { icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 0 0 .95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 0 0-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 0 0-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 0 0-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 0 0 .951-.69l1.519-4.674z', title: 'Reputation score', desc: 'Build a respondent profile. High-quality completions unlock better-paying, more exclusive studies.' },
]

const EXPERT_FEATURES = [
  { icon: 'M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0', title: 'Browse projects', desc: 'Find methodology consulting, analysis, and design gigs that match your expertise.' },
  { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', title: 'Secure escrow', desc: '85% payout held in escrow and released upon delivery confirmation. No chasing invoices.' },
  { icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z', title: 'Verified badges', desc: 'Build specialist credibility with verified credentials in statistics, UX, psychology, and more.' },
  { icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0', title: 'Flexible work', desc: 'Set your own rates and availability. Accept or decline projects that fit your schedule.' },
  { icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', title: 'Phase tracking', desc: 'Accepted → In Progress → Review → Delivered. Clear milestones for every project.' },
  { icon: 'M3 3h18M3 12h18M3 21h18', title: 'Marketplace listing', desc: 'Get discovered by researchers who need your expertise. Your profile shows ratings, reviews, and past work.' },
]

const PRICING = [
  {
    name: 'Free', tagline: 'For individuals getting started', price: '$0', period: '',
    features: ['3 active surveys', '100 responses / month', 'Basic question types', 'CSV export'],
    btn: 'Get started', btnPrimary: false, popular: false,
  },
  {
    name: 'Pro', tagline: 'For serious researchers', price: '$29', period: '/mo',
    features: ['Unlimited surveys', '2,000 responses / month', 'All 12 question types', 'Skip logic', 'Custom branding', 'Expert review'],
    btn: 'Start free trial', btnPrimary: true, popular: true,
  },
  {
    name: 'Scale', tagline: 'For teams and agencies', price: '$79', period: '/mo',
    features: ['Unlimited surveys', '10,000 responses / month', 'Team seats (5 included)', 'Audience panel access', 'Priority support'],
    btn: 'Start free trial', btnPrimary: false, popular: false,
  },
  {
    name: 'Enterprise', tagline: 'Custom for large organisations', price: 'Custom', period: '',
    features: ['Unlimited everything', 'SSO & SAML', 'Dedicated CSM', 'SLA guarantee', 'Custom integrations'],
    btn: 'Contact sales', btnPrimary: false, popular: false,
  },
]

type Role = 'researcher' | 'audience' | 'expert'

export default function LandingPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role>('researcher')

  const features = role === 'researcher' ? RESEARCHER_FEATURES : role === 'audience' ? AUDIENCE_FEATURES : EXPERT_FEATURES
  const featureBg   = role === 'researcher' ? 'radial-gradient(ellipse at top left,#fce7f3,#fff 60%)' : role === 'audience' ? 'radial-gradient(ellipse at top left,#f0fdf4,#fff 60%)' : 'radial-gradient(ellipse at top left,#f5f3ff,#fff 60%)'
  const featureBdr  = role === 'researcher' ? 'rgba(219,39,119,.12)' : role === 'audience' ? 'rgba(16,185,129,.12)' : 'rgba(139,92,246,.12)'
  const iconGrad    = role === 'researcher' ? 'linear-gradient(135deg,#db2777,#be185d)' : role === 'audience' ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#8b5cf6,#7c3aed)'
  const ctaColor    = role === 'researcher' ? '#db2777' : role === 'audience' ? '#10b981' : '#8b5cf6'
  const ctaHref     = role === 'researcher' ? '/' : role === 'audience' ? '/audience' : '/expert'
  const ctaLabel    = role === 'researcher' ? 'See the survey builder →' : role === 'audience' ? 'Browse available tasks →' : 'See the expert dashboard →'

  const tabStyle = (r: Role): React.CSSProperties => ({
    fontFamily: "'Hanken Grotesk', system-ui",
    fontSize: 14, fontWeight: 600, padding: '10px 22px', borderRadius: 12, border: 'none', cursor: 'pointer',
    background: role === r ? (r === 'researcher' ? 'linear-gradient(135deg,#db2777,#be185d)' : r === 'audience' ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#8b5cf6,#7c3aed)') : '#f4f4f5',
    color: role === r ? '#fff' : '#52525b',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Hanken Grotesk', system-ui", background: '#fff' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;600;700;800;900&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── NAV ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 24, padding: '0 48px', height: 64, background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 19, letterSpacing: '-.02em', color: '#18181b' }}>SurveyAI</span>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 24, marginLeft: 16 }}>
          {['Features', 'For whom', 'Pricing'].map(label => (
            <a key={label} href={`#${label === 'For whom' ? 'roles' : label.toLowerCase()}`}
              style={{ fontSize: 14, fontWeight: 600, color: '#52525b', textDecoration: 'none' }}>{label}</a>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.push('/login')}
            style={{ fontSize: 14, fontWeight: 600, color: '#52525b', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 9 }}>
            Sign in
          </button>
          <button onClick={() => router.push('/onboarding')}
            style={{ fontSize: 14, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#db2777,#be185d)', border: 'none', padding: '10px 20px', borderRadius: 10, cursor: 'pointer' }}>
            Get started free
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ background: 'radial-gradient(ellipse at 20% 10%,#fce7f3,#ede9fe 55%,#e0e7ff)', padding: '80px 48px 64px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.8)', border: '1px solid rgba(219,39,119,.2)', padding: '6px 14px', borderRadius: 99, marginBottom: 24 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#db2777' }}>✨ AI-powered</span>
              <span style={{ fontSize: 11, color: '#71717a' }}>Rule-based expert review available now</span>
            </div>
            <h1 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 900, fontSize: 56, lineHeight: 1.1, letterSpacing: '-.03em', color: '#18181b', marginBottom: 20 }}>
              Build smarter<br />
              <span style={{ background: 'linear-gradient(135deg,#db2777,#9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>surveys, faster</span>
            </h1>
            <p style={{ fontSize: 18, color: '#52525b', lineHeight: 1.6, maxWidth: 480, marginBottom: 36 }}>
              The all-in-one platform for creating surveys, reaching the right audience, and getting expert support — all in one place.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/onboarding')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#db2777,#be185d)', border: 'none', padding: '15px 28px', borderRadius: 13, cursor: 'pointer', boxShadow: '0 8px 24px rgba(219,39,119,.35)' }}>
                Start free — no card needed →
              </button>
              <button onClick={() => router.push('/login')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: '#52525b', background: 'rgba(255,255,255,.85)', border: '1px solid #e4e4e7', padding: '15px 24px', borderRadius: 13, cursor: 'pointer' }}>
                Sign in
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 24, fontSize: 13, color: '#71717a', flexWrap: 'wrap' }}>
              {['Free plan forever', 'GDPR compliant', 'Cancel anytime'].map(t => (
                <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.4} strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* floating survey card */}
          <div style={{ flex: '0 0 400px', maxWidth: 400 }}>
            <div style={{ background: 'rgba(255,255,255,.95)', borderRadius: 24, padding: 28, boxShadow: '0 24px 64px rgba(219,39,119,.15)', border: '1px solid rgba(219,39,119,.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 15, color: '#18181b' }}>Customer Feedback</div>
                  <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 2 }}>7 questions · 234 responses</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#be185d', background: '#fdf2f8', padding: '4px 10px', borderRadius: 99, border: '1px solid #fbcfe8' }}>Published</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
                <div style={{ background: '#f8f8fc', borderRadius: 12, padding: '12px 14px', border: '1px solid #f1f1f4' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#71717a', marginBottom: 4 }}>Q1 · Short text</div>
                  <div style={{ fontSize: 13, color: '#18181b' }}>What's your first name?</div>
                </div>
                <div style={{ background: '#fdf2f8', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #fbcfe8' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#db2777', marginBottom: 4 }}>Q2 · Rating · Active</div>
                  <div style={{ fontSize: 13, color: '#18181b' }}>Rate your overall experience</div>
                  <div style={{ marginTop: 6, fontSize: 18, letterSpacing: 2, color: '#db2777' }}>★★★★☆</div>
                </div>
                <div style={{ background: '#f8f8fc', borderRadius: 12, padding: '12px 14px', border: '1px solid #f1f1f4', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#71717a', marginBottom: 4 }}>Q3 · Multiple choice</div>
                    <div style={{ fontSize: 13, color: '#18181b' }}>How did you hear about us?</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#9333ea', background: '#fdf4ff', padding: '3px 8px', borderRadius: 6 }}>Logic</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {[['234', '#18181b', 'Responses'], ['78%', '#16a34a', 'Completion'], ['4.2★', '#f59e0b', 'Avg. NPS']].map(([val, clr, lbl]) => (
                  <div key={lbl} style={{ background: '#f8f8fc', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 18, color: clr }}>{val}</div>
                    <div style={{ fontSize: 10, color: '#a1a1aa' }}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div style={{ background: '#18181b', padding: '24px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[['12,000+', '#fff', 'Surveys created'], ['250K+', '#fff', 'Verified respondents'], ['1,800+', '#fff', 'Expert agents'], ['$2.4M+', '#db2777', 'Paid to respondents']].map(([num, clr, lbl], i) => (
            <div key={lbl} style={{ textAlign: 'center', padding: 12, borderRight: i < 3 ? '1px solid #2a2a35' : 'none' }}>
              <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 28, color: clr }}>{num}</div>
              <div style={{ fontSize: 13, color: '#71717a', marginTop: 3 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: '72px 48px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 38, color: '#18181b', letterSpacing: '-.02em', marginBottom: 12 }}>Everything you need</div>
            <div style={{ fontSize: 16, color: '#71717a', maxWidth: 480, margin: '0 auto' }}>From first question to final insight — the full research workflow in one tool.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 20 }}>
            {RESEARCHER_FEATURES.map(f => (
              <div key={f.title} style={{ background: 'radial-gradient(ellipse at top left,#fce7f3,#fff 60%)', border: '1px solid rgba(219,39,119,.1)', borderRadius: 20, padding: 24 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: '0 4px 12px rgba(219,39,119,.25)' }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
                </div>
                <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 15, color: '#18181b', marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: '#71717a', lineHeight: 1.55 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section id="roles" style={{ padding: '72px 48px', background: '#fafafa' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 38, color: '#18181b', letterSpacing: '-.02em', marginBottom: 12 }}>Built for every role</div>
            <div style={{ fontSize: 16, color: '#71717a', maxWidth: 520, margin: '0 auto' }}>One platform. Three paths. Each role gets a dedicated, tailored experience.</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 40, flexWrap: 'wrap' }}>
            <button style={tabStyle('researcher')} onClick={() => setRole('researcher')}>📊 Researcher</button>
            <button style={tabStyle('audience')} onClick={() => setRole('audience')}>✅ Respondent</button>
            <button style={tabStyle('expert')} onClick={() => setRole('expert')}>🛠 Expert</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 20 }}>
            {features.map(f => (
              <div key={f.title} style={{ background: featureBg, border: `1px solid ${featureBdr}`, borderRadius: 20, padding: 24 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: iconGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: '0 4px 12px rgba(0,0,0,.15)' }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
                </div>
                <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 15, color: '#18181b', marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: '#71717a', lineHeight: 1.55 }}>{f.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <button onClick={() => router.push(ctaHref)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#fff', background: iconGrad, border: 'none', padding: '12px 24px', borderRadius: 11, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,.15)' }}>
              {ctaLabel}
            </button>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: '72px 48px', background: 'radial-gradient(ellipse at 18% 12%,#fce7f3,#ede9fe 55%,#e0e7ff)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 38, color: '#18181b', letterSpacing: '-.02em', marginBottom: 12 }}>Simple pricing</div>
            <div style={{ fontSize: 16, color: '#52525b' }}>Start free. Scale when you're ready. No lock-in.</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, alignItems: 'start' }}>
            {PRICING.map(plan => (
              <div key={plan.name} style={{ position: 'relative', background: plan.popular ? 'rgba(255,255,255,.98)' : 'rgba(255,255,255,.75)', borderRadius: 20, padding: '28px 24px', border: plan.popular ? '2px solid #db2777' : '1px solid rgba(219,39,119,.15)', boxShadow: plan.popular ? '0 12px 40px rgba(219,39,119,.2)' : 'none' }}>
                {plan.popular && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 14px', borderRadius: 99, whiteSpace: 'nowrap' }}>Most popular</div>
                )}
                <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 17, color: '#18181b', marginBottom: 3 }}>{plan.name}</div>
                <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 14 }}>{plan.tagline}</div>
                <div style={{ marginBottom: 18 }}>
                  <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 32, color: '#18181b' }}>{plan.price}</span>
                  <span style={{ fontSize: 12, color: '#a1a1aa' }}>{plan.period}</span>
                </div>
                <ul style={{ listStyle: 'none', margin: '0 0 20px', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#52525b' }}>
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2.5} strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => router.push(plan.name === 'Enterprise' ? '/login' : '/onboarding')}
                  style={{ width: '100%', fontSize: 14, fontWeight: 700, color: plan.btnPrimary ? '#fff' : '#db2777', background: plan.btnPrimary ? 'linear-gradient(135deg,#db2777,#be185d)' : 'transparent', border: plan.btnPrimary ? 'none' : '1.5px solid #db2777', padding: '12px', borderRadius: 11, cursor: 'pointer' }}>
                  {plan.btn}
                </button>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#71717a' }}>Respondents &amp; experts join free. No subscription needed.</div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '80px 48px', background: '#18181b', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 40, color: '#fff', letterSpacing: '-.02em', marginBottom: 16 }}>Ready to get started?</div>
          <div style={{ fontSize: 16, color: '#71717a', marginBottom: 36 }}>Join thousands of researchers, respondents, and experts already on SurveyAI.</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/onboarding')}
              style={{ fontSize: 16, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#db2777,#be185d)', border: 'none', padding: '16px 32px', borderRadius: 13, cursor: 'pointer', boxShadow: '0 8px 24px rgba(219,39,119,.35)' }}>
              Create free account →
            </button>
            <button onClick={() => router.push('/login')}
              style={{ fontSize: 16, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', padding: '16px 28px', borderRadius: 13, cursor: 'pointer' }}>
              Sign in
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0b0b12', padding: '32px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
          </div>
          <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 15, color: '#fff' }}>SurveyAI</span>
        </div>
        <div style={{ fontSize: 12, color: '#52525b' }}>© 2026 SurveyAI. All rights reserved.</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Privacy', 'Terms', 'Support'].map(lbl => (
            <a key={lbl} href="#" style={{ fontSize: 12, color: '#52525b', textDecoration: 'none' }}>{lbl}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}
