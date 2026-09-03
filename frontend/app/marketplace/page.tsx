'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const EXPERT_SERVICES = [
  { id: 'e1', name: 'Priya Sharma', title: 'Survey Research Specialist', type: 'Survey Design', rating: 4.9, reviews: 47, rate: 95, turnaround: '3-5 days', skills: ['Conjoint Analysis', 'MaxDiff', 'Skip Logic'], completedJobs: 89, avatar: 'PS', bio: 'PhD researcher with 8 years designing enterprise surveys for Fortune 500. Specializes in complex branching logic and statistical validation.' },
  { id: 'e2', name: 'Marcus Chen', title: 'Data Scientist & Analyst', type: 'Data Analysis', rating: 4.8, reviews: 63, rate: 120, turnaround: '2-4 days', skills: ['R', 'SPSS', 'Tableau', 'Python'], completedJobs: 124, avatar: 'MC', bio: 'Former McKinsey analyst. Expert in turning raw survey data into C-suite ready insights with advanced statistical modeling.' },
  { id: 'e3', name: 'Sofia Reyes', title: 'Multilingual Survey Expert', type: 'Translation', rating: 5.0, reviews: 31, rate: 65, turnaround: '1-3 days', skills: ['Spanish', 'Portuguese', 'French', 'Medical'], completedJobs: 58, avatar: 'SR', bio: 'Certified translator with specialization in medical and academic survey localization. Native speaker of 3 languages.' },
  { id: 'e4', name: 'James Okafor', title: 'Research Operations Lead', type: 'Research ops', rating: 4.7, reviews: 28, rate: 110, turnaround: '5-7 days', skills: ['Panel Management', 'IRB', 'Qualtrics'], completedJobs: 41, avatar: 'JO', bio: 'End-to-end research ops for academic and enterprise studies. Manages respondent panels, IRB compliance, and delivery timelines.' },
  { id: 'e5', name: 'Anna Kowalski', title: 'UX Survey Specialist', type: 'Survey Design', rating: 4.9, reviews: 52, rate: 85, turnaround: '2-4 days', skills: ['UX Research', 'NPS', 'CSAT', 'Card Sorting'], completedJobs: 97, avatar: 'AK', bio: 'Designs research-grade UX surveys with proven methodologies. Former Google UX researcher with deep expertise in product feedback loops.' },
  { id: 'e6', name: 'David Park', title: 'Quantitative Researcher', type: 'Data Analysis', rating: 4.6, reviews: 19, rate: 100, turnaround: '3-5 days', skills: ['SEM', 'Factor Analysis', 'Regression'], completedJobs: 33, avatar: 'DP', bio: 'Quantitative methods expert specializing in structural equation modeling and confirmatory factor analysis for academic research.' },
]

const AUDIENCE_PANELS = [
  { id: 'p1', name: 'General Consumer Panel', size: '2.4M', countries: 18, avgAge: '18-65', categories: ['Retail', 'Food', 'Tech', 'Health'], cpi: 2.50, ir: 85, turnaround: '24-48h', description: 'Broad consumer panel across 18 countries. High incidence rates for general consumer studies.' },
  { id: 'p2', name: 'B2B Decision Makers', size: '180K', countries: 12, avgAge: '30-55', categories: ['SaaS', 'Finance', 'Manufacturing', 'HR'], cpi: 18.00, ir: 42, turnaround: '3-5 days', description: 'Senior decision makers and C-suite executives. Verified via LinkedIn integration and employer data.' },
  { id: 'p3', name: 'Healthcare Professionals', size: '95K', countries: 8, avgAge: '28-60', categories: ['Doctors', 'Nurses', 'Pharma', 'Allied Health'], cpi: 35.00, ir: 38, turnaround: '5-7 days', description: 'Verified HCPs across specialties. Credentialing verified via NPI database and professional license records.' },
  { id: 'p4', name: 'Gen Z & Millennials', size: '820K', countries: 22, avgAge: '18-40', categories: ['Fashion', 'Gaming', 'Social Media', 'Finance'], cpi: 3.50, ir: 78, turnaround: '12-24h', description: 'Digitally native panel for youth-focused brands. High engagement rates and mobile-first respondents.' },
]

const TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Survey Design': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Data Analysis': { bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe' },
  'Translation':   { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  'Research ops':  { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
}

const EXPERT_TYPES = ['All', 'Survey Design', 'Data Analysis', 'Translation', 'Research ops']

export default function MarketplacePage() {
  const router = useRouter()
  const [mainTab, setMainTab] = useState<'experts' | 'panels'>('experts')
  const [typeFilter, setTypeFilter] = useState('All')
  const [maxRate, setMaxRate] = useState(200)
  const [sortBy, setSortBy] = useState<'rating' | 'rate' | 'jobs'>('rating')
  const [searchQ, setSearchQ] = useState('')
  const [selectedExpert, setSelectedExpert] = useState<typeof EXPERT_SERVICES[0] | null>(null)
  const [selectedPanel, setSelectedPanel] = useState<typeof AUDIENCE_PANELS[0] | null>(null)

  const filtered = EXPERT_SERVICES
    .filter(e => typeFilter === 'All' || e.type === typeFilter)
    .filter(e => e.rate <= maxRate)
    .filter(e => !searchQ || e.name.toLowerCase().includes(searchQ.toLowerCase()) || e.title.toLowerCase().includes(searchQ.toLowerCase()) || e.skills.some(s => s.toLowerCase().includes(searchQ.toLowerCase())))
    .sort((a, b) => sortBy === 'rating' ? b.rating - a.rating : sortBy === 'rate' ? a.rate - b.rate : b.completedJobs - a.completedJobs)

  const tc = (type: string) => TYPE_COLORS[type] ?? { bg: '#f4f4f5', color: '#52525b', border: '#e4e4e7' }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 18% 12%, #fce7f3, #ede9fe 55%, #e0e7ff)', fontFamily: "'Hanken Grotesk', system-ui" }}>
      {/* Header */}
      <header style={{ background: 'rgba(255,255,255,.82)', backdropFilter: 'blur(14px)', borderBottom: '1.5px solid rgba(219,39,119,.10)', position: 'sticky', top: 0, zIndex: 40, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 18, letterSpacing: '-.02em', color: '#18181b' }}>SurveyAI</span>
        </div>
        <nav style={{ display: 'flex', gap: 4 }}>
          {[{ label: 'Surveys', href: '/' }, { label: 'Templates', href: '/templates' }, { label: 'Marketplace', href: '/marketplace' }].map(n => (
            <button key={n.href} onClick={() => router.push(n.href)}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none', background: n.href === '/marketplace' ? '#fce7f3' : 'transparent', color: n.href === '/marketplace' ? '#db2777' : '#52525b', cursor: 'pointer' }}>
              {n.label}
            </button>
          ))}
        </nav>
        <button onClick={() => router.push('/')} style={{ fontSize: 13, color: '#71717a', background: 'none', border: 'none', cursor: 'pointer' }}>← Dashboard</button>
      </header>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#db2777,#be185d)', padding: '40px 24px', textAlign: 'center', color: '#fff' }}>
        <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 32, letterSpacing: '-.02em', marginBottom: 8 }}>Research Marketplace</div>
        <div style={{ fontSize: 16, opacity: .85, marginBottom: 24 }}>Expert survey researchers · Pre-screened audience panels · Fast turnaround</div>
        <div style={{ display: 'flex', gap: 8, maxWidth: 500, margin: '0 auto' }}>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search experts, skills, or panel types..." style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
          <button style={{ padding: '12px 20px', borderRadius: 12, background: 'rgba(255,255,255,.2)', border: '1.5px solid rgba(255,255,255,.4)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Search</button>
        </div>
        <div style={{ display: 'flex', gap: 28, justifyContent: 'center', marginTop: 28 }}>
          {[{ value: '500+', label: 'Verified Experts' }, { value: '3.2M+', label: 'Panelists' }, { value: '98%', label: 'Satisfaction Rate' }, { value: '48h', label: 'Avg. Turnaround' }].map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 22 }}>{s.value}</div>
              <div style={{ fontSize: 12, opacity: .75 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', borderBottom: '1.5px solid rgba(219,39,119,.10)', marginTop: 24, gap: 4 }}>
          {(['experts', 'panels'] as const).map(t => (
            <button key={t} onClick={() => setMainTab(t)}
              style={{ padding: '10px 20px', fontSize: 15, fontWeight: 600, border: 'none', background: 'transparent', cursor: 'pointer', color: mainTab === t ? '#db2777' : '#71717a', borderBottom: `2px solid ${mainTab === t ? '#db2777' : 'transparent'}`, marginBottom: -1.5 }}>
              {t === 'experts' ? '🎓 Expert Services' : '👥 Audience Panels'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px', display: 'flex', gap: 24 }}>
        {mainTab === 'experts' && (
          <>
            {/* Filter Sidebar */}
            <div style={{ width: 240, flexShrink: 0 }}>
              <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid rgba(219,39,119,.08)', padding: '20px', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#18181b', marginBottom: 14 }}>Expertise Type</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {EXPERT_TYPES.map(t => (
                    <button key={t} onClick={() => setTypeFilter(t)}
                      style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: `1.5px solid ${typeFilter === t ? '#db2777' : '#e4e4e7'}`, background: typeFilter === t ? '#fce7f3' : 'transparent', color: typeFilter === t ? '#db2777' : '#52525b', cursor: 'pointer', textAlign: 'left' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid rgba(219,39,119,.08)', padding: '20px', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#18181b', marginBottom: 8 }}>Max Rate</div>
                <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 20, color: '#db2777', marginBottom: 10 }}>${maxRate}/hr</div>
                <input type="range" min={30} max={200} step={10} value={maxRate} onChange={e => setMaxRate(+e.target.value)} style={{ width: '100%', accentColor: '#db2777' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>
                  <span>$30</span><span>$200</span>
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid rgba(219,39,119,.08)', padding: '20px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#18181b', marginBottom: 12 }}>Sort By</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[{ value: 'rating', label: 'Highest Rated' }, { value: 'rate', label: 'Lowest Rate' }, { value: 'jobs', label: 'Most Experienced' }].map(s => (
                    <button key={s.value} onClick={() => setSortBy(s.value as typeof sortBy)}
                      style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: `1.5px solid ${sortBy === s.value ? '#db2777' : '#e4e4e7'}`, background: sortBy === s.value ? '#fce7f3' : 'transparent', color: sortBy === s.value ? '#db2777' : '#52525b', cursor: 'pointer', textAlign: 'left' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Expert Cards Grid */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: '#71717a', marginBottom: 14 }}>{filtered.length} experts found</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
                {filtered.map(expert => {
                  const t = tc(expert.type)
                  return (
                    <div key={expert.id} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid rgba(219,39,119,.08)', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,.04)', cursor: 'pointer', transition: 'box-shadow .15s' }}
                      onClick={() => setSelectedExpert(expert)}>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                          {expert.avatar}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#18181b' }}>{expert.name}</div>
                          <div style={{ fontSize: 12, color: '#71717a', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{expert.title}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 16, color: '#18181b' }}>${expert.rate}</div>
                          <div style={{ fontSize: 11, color: '#71717a' }}>/hr</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: '#52525b', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {expert.bio}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                        {expert.skills.slice(0, 3).map(sk => (
                          <span key={sk} style={{ fontSize: 11, background: '#f4f4f5', color: '#52525b', padding: '2px 8px', borderRadius: 20, border: '1px solid #e4e4e7' }}>{sk}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#71717a' }}>
                          <span style={{ color: '#f59e0b' }}>★ {expert.rating}</span>
                          <span>({expert.reviews} reviews)</span>
                          <span>{expert.completedJobs} jobs</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: t.bg, color: t.color, border: `1px solid ${t.border}` }}>{expert.type}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {mainTab === 'panels' && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#71717a', marginBottom: 16 }}>Pre-screened audience panels for your research</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
              {AUDIENCE_PANELS.map(panel => (
                <div key={panel.id} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid rgba(219,39,119,.08)', padding: '22px', boxShadow: '0 2px 8px rgba(0,0,0,.04)', cursor: 'pointer' }}
                  onClick={() => setSelectedPanel(panel)}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#18181b', marginBottom: 6 }}>{panel.name}</div>
                  <div style={{ fontSize: 13, color: '#52525b', lineHeight: 1.5, marginBottom: 16 }}>{panel.description}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'Panel Size', value: panel.size },
                      { label: 'Countries', value: panel.countries.toString() },
                      { label: 'Incidence Rate', value: `${panel.ir}%` },
                      { label: 'Turnaround', value: panel.turnaround },
                    ].map(s => (
                      <div key={s.label} style={{ background: '#f9f9fa', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 16, color: '#18181b' }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: '#71717a' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}>
                    {panel.categories.map(c => (
                      <span key={c} style={{ fontSize: 11, background: '#fce7f3', color: '#db2777', padding: '2px 8px', borderRadius: 20, border: '1px solid #fbcfe8' }}>{c}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 20, color: '#16a34a' }}>${panel.cpi}</span>
                      <span style={{ fontSize: 12, color: '#71717a', marginLeft: 4 }}>CPI (cost per interview)</span>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setSelectedPanel(panel) }} style={{ padding: '8px 16px', borderRadius: 20, background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Get Quote</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expert Detail Modal */}
      {selectedExpert && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setSelectedExpert(null)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560, padding: '28px', boxShadow: '0 32px 80px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 22, flexShrink: 0 }}>
                {selectedExpert.avatar}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 800, fontSize: 20, color: '#18181b', fontFamily: "'Schibsted Grotesk', system-ui" }}>{selectedExpert.name}</div>
                  <button onClick={() => setSelectedExpert(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#71717a' }}>×</button>
                </div>
                <div style={{ fontSize: 14, color: '#71717a' }}>{selectedExpert.title}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 13 }}>
                  <span style={{ color: '#f59e0b' }}>★ {selectedExpert.rating}</span>
                  <span style={{ color: '#71717a' }}>({selectedExpert.reviews} reviews)</span>
                  <span style={{ color: '#71717a' }}>{selectedExpert.completedJobs} completed</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 14, color: '#52525b', lineHeight: 1.6, marginBottom: 20 }}>{selectedExpert.bio}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {selectedExpert.skills.map(sk => (
                <span key={sk} style={{ fontSize: 12, background: '#f4f4f5', color: '#52525b', padding: '4px 10px', borderRadius: 20, border: '1px solid #e4e4e7' }}>{sk}</span>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
              {[
                { label: 'Hourly Rate', value: `$${selectedExpert.rate}/hr` },
                { label: 'Turnaround', value: selectedExpert.turnaround },
                { label: 'Expertise', value: selectedExpert.type },
              ].map(s => (
                <div key={s.label} style={{ background: '#f9f9fa', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#18181b' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Project Description</label>
              <textarea placeholder="Describe your project requirements..." style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: 90, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setSelectedExpert(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e4e4e7', background: '#fff', fontSize: 14, fontWeight: 600, color: '#71717a', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { alert('Request sent!'); setSelectedExpert(null) }} style={{ flex: 2, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Send Request →</button>
            </div>
          </div>
        </div>
      )}

      {/* Panel Detail Modal */}
      {selectedPanel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setSelectedPanel(null)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500, padding: '28px', boxShadow: '0 32px 80px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#18181b', fontFamily: "'Schibsted Grotesk', system-ui" }}>{selectedPanel.name}</div>
              <button onClick={() => setSelectedPanel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#71717a' }}>×</button>
            </div>
            <div style={{ fontSize: 14, color: '#52525b', lineHeight: 1.6, marginBottom: 20 }}>{selectedPanel.description}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Panel Size', value: selectedPanel.size },
                { label: 'Countries', value: selectedPanel.countries.toString() },
                { label: 'Age Range', value: selectedPanel.avgAge },
                { label: 'Incidence Rate', value: `${selectedPanel.ir}%` },
                { label: 'Turnaround', value: selectedPanel.turnaround },
                { label: 'Cost Per Interview', value: `$${selectedPanel.cpi}` },
              ].map(s => (
                <div key={s.label} style={{ background: '#f9f9fa', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 16, color: '#18181b' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Sample Size Needed</label>
              <input type="number" defaultValue={200} min={50} style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#16a34a', marginBottom: 20 }}>
              Estimated cost: <strong>${(selectedPanel.cpi * 200).toFixed(0)}</strong> for 200 completes
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setSelectedPanel(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e4e4e7', background: '#fff', fontSize: 14, fontWeight: 600, color: '#71717a', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { alert('Quote requested!'); setSelectedPanel(null) }} style={{ flex: 2, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Request Quote →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
