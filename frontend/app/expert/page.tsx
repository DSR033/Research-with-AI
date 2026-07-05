'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase-browser'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const DEMO_JOBS = [
  { id: 'j1', title: 'Employee Engagement Survey Design', client: 'TechCorp Inc.', type: 'Survey Design', budget: 850, deadline: '2026-07-20', questions: 45, respondents: 500, status: 'pending', description: 'Design a comprehensive 45-question employee engagement survey covering culture, management, benefits and growth opportunities. Must include skip logic and branching.' },
  { id: 'j2', title: 'Market Research Data Analysis', client: 'Retail Brand Co.', type: 'Data Analysis', budget: 1200, deadline: '2026-07-18', questions: 0, respondents: 1200, status: 'pending', description: 'Analyze 1,200 survey responses from a consumer preference study. Provide statistical analysis, segmentation, and actionable insights report.' },
  { id: 'j3', title: 'Healthcare Survey Translation (Spanish)', client: 'MedResearch LLC', type: 'Translation', budget: 400, deadline: '2026-07-25', questions: 60, respondents: 0, status: 'pending', description: 'Translate a 60-question patient satisfaction survey from English to Spanish. Medical terminology expertise required.' },
]

const DEMO_ACTIVE = [
  { id: 'a1', title: 'Customer Journey Mapping Survey', client: 'E-Commerce Plus', type: 'Survey Design', budget: 1050, phase: 1, dueDate: '2026-07-15', paid: 525, remaining: 525 },
  { id: 'a2', title: 'Product Feedback Analysis Q2', client: 'SaaS Startup', type: 'Data Analysis', budget: 980, phase: 2, dueDate: '2026-07-12', paid: 490, remaining: 490 },
]

const DEMO_COMPLETED = [
  { id: 'c1', title: 'Brand Perception Survey 2025', client: 'Fashion Brand X', type: 'Survey Design', budget: 750, rating: 5, completedDate: '2026-06-10' },
  { id: 'c2', title: 'NPS Analysis — Enterprise', client: 'B2B SaaS Co.', type: 'Data Analysis', budget: 1100, rating: 5, completedDate: '2026-06-02' },
  { id: 'c3', title: 'EU Market Survey Translation', client: 'Global Research', type: 'Translation', budget: 380, rating: 4, completedDate: '2026-05-28' },
]

const INVOICES = [
  { id: 'INV-001', project: 'Brand Perception Survey 2025', amount: 637.50, date: '2026-06-12', status: 'paid' },
  { id: 'INV-002', project: 'NPS Analysis — Enterprise', amount: 935.00, date: '2026-06-04', status: 'paid' },
  { id: 'INV-003', project: 'EU Market Survey Translation', amount: 323.00, date: '2026-05-30', status: 'paid' },
  { id: 'INV-004', project: 'Customer Journey Mapping Survey', amount: 446.25, date: '2026-07-01', status: 'pending' },
]

const PHASES = ['Accepted', 'In Progress', 'Review', 'Delivered']

function buildPhases(currentIdx: number) {
  return PHASES.map((label, i) => ({
    label,
    done: i < currentIdx,
    active: i === currentIdx,
  }))
}

function typeBadge(t: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    'Survey Design': { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
    'Data Analysis': { background: '#faf5ff', color: '#7c3aed', border: '1px solid #ddd6fe' },
    'Translation':   { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' },
    'Research ops':  { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' },
  }
  return map[t] ?? { background: '#f4f4f5', color: '#52525b', border: '1px solid #e4e4e7' }
}

export default function ExpertPage() {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<'jobs' | 'active' | 'earnings' | 'profile'>('jobs')
  const [jobsSubTab, setJobsSubTab] = useState<'new' | 'active' | 'completed'>('new')
  const [jobs, setJobs] = useState(DEMO_JOBS)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [selectedJob, setSelectedJob] = useState<typeof DEMO_JOBS[0] | null>(null)
  const [available, setAvailable] = useState(true)
  const profileScore = 82

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push('/login'); return }
      setUser({ id: u.id, email: u.email ?? '' })
      fetch(`${API}/expert/jobs?user_id=${u.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.jobs) setJobs(d.jobs) })
        .catch(() => {})
        .finally(() => setLoading(false))
    })
  }, [])

  const scoreCircumference = 2 * Math.PI * 40
  const scoreDash = (profileScore / 100) * scoreCircumference

  const totalEarned = INVOICES.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const pendingPay  = INVOICES.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 18% 12%, #fce7f3, #ede9fe 55%, #e0e7ff)', fontFamily: "'Hanken Grotesk', system-ui" }}>
      {/* Header */}
      <header style={{ background: 'rgba(255,255,255,.82)', backdropFilter: 'blur(14px)', borderBottom: '1.5px solid rgba(219,39,119,.10)', position: 'sticky', top: 0, zIndex: 40, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 18, letterSpacing: '-.02em', color: '#18181b' }}>SurveyAI</span>
          <span style={{ fontSize: 12, background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontWeight: 700, marginLeft: 4 }}>Expert</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setAvailable(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${available ? '#86efac' : '#e4e4e7'}`, background: available ? '#f0fdf4' : '#f9f9fa', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: available ? '#16a34a' : '#71717a' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: available ? '#22c55e' : '#d4d4d8', display: 'inline-block' }} />
            {available ? 'Available' : 'Unavailable'}
          </button>
          <button onClick={() => router.push('/')} style={{ fontSize: 13, color: '#71717a', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Dashboard</button>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ fontSize: 13, color: '#71717a', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px', display: 'flex', gap: 24 }}>
        {/* Main */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Welcome Banner */}
          <div style={{ background: 'linear-gradient(135deg,#db2777,#be185d)', borderRadius: 16, padding: '24px 28px', marginBottom: 24, color: '#fff' }}>
            <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 22, letterSpacing: '-.02em', marginBottom: 4 }}>Expert Marketplace</div>
            <div style={{ fontSize: 14, opacity: .85 }}>Browse and apply to survey projects that match your expertise.</div>
            <div style={{ display: 'flex', gap: 24, marginTop: 18 }}>
              {[
                { label: 'Active Projects', value: '2' },
                { label: 'Total Earned', value: `$${totalEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
                { label: 'Avg. Rating', value: '4.8 ★' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 24 }}>{s.value}</div>
                  <div style={{ fontSize: 12, opacity: .75 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1.5px solid rgba(219,39,119,.10)', marginBottom: 20, gap: 2 }}>
            {(['jobs', 'active', 'earnings', 'profile'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '10px 18px', fontSize: 14, fontWeight: 600, border: 'none', background: 'transparent', cursor: 'pointer', color: tab === t ? '#db2777' : '#71717a', borderBottom: `2px solid ${tab === t ? '#db2777' : 'transparent'}`, marginBottom: -1.5 }}>
                {t === 'jobs' ? 'Job Board' : t === 'active' ? 'Active Projects' : t === 'earnings' ? 'Earnings' : 'My Profile'}
              </button>
            ))}
          </div>

          {/* ── JOB BOARD ── */}
          {tab === 'jobs' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {(['new', 'active', 'completed'] as const).map(st => (
                  <button key={st} onClick={() => setJobsSubTab(st)}
                    style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: `1.5px solid ${jobsSubTab === st ? '#db2777' : '#e4e4e7'}`, background: jobsSubTab === st ? '#fce7f3' : '#fff', color: jobsSubTab === st ? '#db2777' : '#71717a', cursor: 'pointer' }}>
                    {st === 'new' ? 'New Requests' : st === 'active' ? 'Active Projects' : 'Completed'}
                  </button>
                ))}
              </div>

              {jobsSubTab === 'new' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {jobs.map(job => (
                    <div key={job.id} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid rgba(219,39,119,.08)', padding: '20px 22px', boxShadow: '0 2px 8px rgba(0,0,0,.04)', cursor: 'pointer' }} onClick={() => setSelectedJob(job)}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: '#18181b', marginBottom: 4 }}>{job.title}</div>
                          <div style={{ fontSize: 13, color: '#71717a' }}>{job.client}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 22, color: '#16a34a' }}>${job.budget}</div>
                          <div style={{ fontSize: 12, color: '#71717a' }}>Budget</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: '#52525b', marginBottom: 14, lineHeight: 1.5 }}>{job.description}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span style={{ ...typeBadge(job.type), fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{job.type}</span>
                          <span style={{ fontSize: 12, background: '#f4f4f5', color: '#52525b', padding: '3px 10px', borderRadius: 20, border: '1px solid #e4e4e7' }}>Due {job.deadline}</span>
                        </div>
                        <button onClick={e => { e.stopPropagation(); setSelectedJob(job) }} style={{ padding: '7px 16px', borderRadius: 20, background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Apply Now</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {jobsSubTab === 'active' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {DEMO_ACTIVE.map(p => (
                    <div key={p.id} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid rgba(219,39,119,.08)', padding: '20px 22px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: '#18181b', marginBottom: 4 }}>{p.title}</div>
                          <div style={{ fontSize: 13, color: '#71717a' }}>{p.client}</div>
                        </div>
                        <span style={{ ...typeBadge(p.type), fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{p.type}</span>
                      </div>
                      <PhaseTracker phase={p.phase} />
                      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#71717a', marginTop: 14 }}>
                        <span>Due: <strong style={{ color: '#18181b' }}>{p.dueDate}</strong></span>
                        <span>Paid: <strong style={{ color: '#16a34a' }}>${p.paid}</strong></span>
                        <span>Remaining: <strong style={{ color: '#18181b' }}>${p.remaining}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {jobsSubTab === 'completed' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {DEMO_COMPLETED.map(p => (
                    <div key={p.id} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid rgba(219,39,119,.08)', padding: '20px 22px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#18181b', marginBottom: 4 }}>{p.title}</div>
                          <div style={{ fontSize: 13, color: '#71717a' }}>{p.client} · {p.completedDate}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 18, color: '#16a34a' }}>${(p.budget * 0.85).toFixed(2)}</div>
                          <div style={{ fontSize: 12, color: '#f59e0b' }}>{'★'.repeat(p.rating)}{'☆'.repeat(5 - p.rating)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ACTIVE PROJECTS ── */}
          {tab === 'active' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {DEMO_ACTIVE.map(p => (
                <div key={p.id} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid rgba(219,39,119,.08)', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 17, color: '#18181b', marginBottom: 4 }}>{p.title}</div>
                      <div style={{ fontSize: 13, color: '#71717a' }}>{p.client}</div>
                    </div>
                    <span style={{ ...typeBadge(p.type), fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20 }}>{p.type}</span>
                  </div>
                  <PhaseTracker phase={p.phase} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 20 }}>
                    {[
                      { label: 'Total Budget', value: `$${p.budget}`, color: '#18181b' },
                      { label: 'Paid (in escrow)', value: `$${p.paid}`, color: '#16a34a' },
                      { label: 'On Completion', value: `$${p.remaining}`, color: '#db2777' },
                    ].map(s => (
                      <div key={s.label} style={{ background: '#f9f9fa', borderRadius: 10, padding: '12px 16px' }}>
                        <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 20, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── EARNINGS ── */}
          {tab === 'earnings' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
                {[
                  { label: 'Total Earned', value: `$${totalEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: '#16a34a', sub: 'After platform fees' },
                  { label: 'Pending Payout', value: `$${pendingPay.toFixed(2)}`, color: '#db2777', sub: 'Upon delivery' },
                  { label: 'Projects Done', value: '3', color: '#7c3aed', sub: 'Lifetime total' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '20px', border: '1.5px solid rgba(219,39,119,.08)' }}>
                    <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 26, color: s.color }}>{s.value}</div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#18181b', marginTop: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid rgba(219,39,119,.08)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f4f4f5', fontWeight: 700, fontSize: 15, color: '#18181b' }}>Payment History</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9f9fa' }}>
                      {['Invoice', 'Project', 'Amount', 'Date', 'Status'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: '#71717a', textAlign: 'left', borderBottom: '1px solid #f1f1f4' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {INVOICES.map(inv => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #f9f9fa' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#18181b', fontWeight: 600 }}>{inv.id}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#52525b' }}>{inv.project}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#18181b' }}>${inv.amount.toFixed(2)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#71717a' }}>{inv.date}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: inv.status === 'paid' ? '#f0fdf4' : '#fef9c3', color: inv.status === 'paid' ? '#16a34a' : '#ca8a04', border: `1px solid ${inv.status === 'paid' ? '#bbf7d0' : '#fde68a'}` }}>
                            {inv.status === 'paid' ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── PROFILE ── */}
          {tab === 'profile' && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid rgba(219,39,119,.08)', padding: '28px' }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: '#18181b', marginBottom: 20 }}>Expert Profile</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Full Name', placeholder: 'Your name' },
                  { label: 'Email', placeholder: user?.email ?? '' },
                  { label: 'Specializations', placeholder: 'e.g. Survey Design, NPS Analysis' },
                  { label: 'Hourly Rate', placeholder: '$80/hr' },
                  { label: 'Years of Experience', placeholder: '5' },
                  { label: 'Languages', placeholder: 'English, Spanish' },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 5 }}>{f.label}</label>
                    <input defaultValue={f.placeholder} style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 5 }}>Bio</label>
                <textarea defaultValue="Experienced survey researcher with 5+ years designing mixed-method studies for Fortune 500 companies." style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: 100, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <button style={{ padding: '10px 24px', borderRadius: 20, background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Save Profile</button>
              </div>
            </div>
          )}
        </div>

        {/* ── SIDEBAR ── */}
        <div style={{ width: 280, flexShrink: 0 }}>
          {/* Profile Score Ring */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)', padding: '22px', marginBottom: 16, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.04)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#18181b', marginBottom: 16 }}>Profile Score</div>
            <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#db2777" strokeWidth="10"
                strokeDasharray={`${scoreDash.toFixed(2)} ${scoreCircumference.toFixed(2)}`} strokeLinecap="round" />
            </svg>
            <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 32, color: '#db2777', marginTop: 8 }}>{profileScore}%</div>
            <div style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>Complete your profile to get more jobs</div>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
              {[
                { label: 'Basic info', done: true },
                { label: 'Specializations', done: true },
                { label: 'Portfolio samples', done: false },
                { label: 'Certifications', done: false },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: item.done ? '#db2777' : '#f4f4f5', border: item.done ? 'none' : '2px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg>}
                  </div>
                  <span style={{ color: item.done ? '#18181b' : '#a1a1aa', fontWeight: item.done ? 600 : 400 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)', padding: '20px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#18181b', marginBottom: 14 }}>This Month</div>
            {[
              { label: 'Jobs Applied', value: '4' },
              { label: 'Response Rate', value: '75%' },
              { label: 'Avg. Project Value', value: '$943' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f4f4f5' }}>
                <span style={{ fontSize: 13, color: '#71717a' }}>{s.label}</span>
                <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 15, color: '#18181b' }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Escrow Info */}
          <div style={{ background: 'linear-gradient(135deg,#fdf4ff,#fce7f3)', borderRadius: 14, border: '1px solid rgba(219,39,119,.12)', padding: '16px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#18181b', marginBottom: 8 }}>How Payments Work</div>
            <div style={{ fontSize: 12, color: '#52525b', lineHeight: 1.6 }}>
              50% is held in escrow on acceptance. The remaining 50% releases upon project delivery and client approval.
              <br /><br />
              <strong>Platform fee: 15%</strong> on all earnings.
            </div>
          </div>
        </div>
      </div>

      {/* Job Apply Modal */}
      {selectedJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setSelectedJob(null)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 540, padding: '28px', boxShadow: '0 32px 80px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#18181b', marginBottom: 4, fontFamily: "'Schibsted Grotesk', system-ui" }}>{selectedJob.title}</div>
                <div style={{ fontSize: 13, color: '#71717a' }}>{selectedJob.client}</div>
              </div>
              <button onClick={() => setSelectedJob(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#71717a', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <span style={{ ...typeBadge(selectedJob.type), fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20 }}>{selectedJob.type}</span>
              <span style={{ fontSize: 12, background: '#f4f4f5', color: '#52525b', padding: '4px 12px', borderRadius: 20, border: '1px solid #e4e4e7' }}>Due {selectedJob.deadline}</span>
            </div>
            <div style={{ fontSize: 14, color: '#52525b', lineHeight: 1.6, marginBottom: 20 }}>{selectedJob.description}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Budget', value: `$${selectedJob.budget}` },
                { label: 'You Earn', value: `$${(selectedJob.budget * 0.85).toFixed(0)}` },
                { label: 'Platform Fee', value: `$${(selectedJob.budget * 0.15).toFixed(0)}` },
              ].map(s => (
                <div key={s.label} style={{ background: '#f9f9fa', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 18, color: '#18181b' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: '#fdf4ff', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#7c3aed', marginBottom: 20 }}>
              <strong>Escrow:</strong> 50% (${(selectedJob.budget * 0.5 * 0.85).toFixed(0)}) released on acceptance · 50% on delivery
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Cover Letter</label>
              <textarea placeholder="Introduce yourself and explain why you're the best fit for this project..." style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', minHeight: 100, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setSelectedJob(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e4e4e7', background: '#fff', fontSize: 14, fontWeight: 600, color: '#71717a', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { alert('Application submitted!'); setSelectedJob(null) }} style={{ flex: 2, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Submit Application →</button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #f9a8d4', borderTopColor: '#db2777', animation: 'spin 0.7s linear infinite' }} />
        </div>
      )}
    </div>
  )
}

function PhaseTracker({ phase }: { phase: number }) {
  const phases = buildPhases(phase)
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {phases.map((ph, i) => (
        <div key={ph.label} style={{ display: 'flex', alignItems: 'center', flex: i < phases.length - 1 ? 1 : 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: ph.done ? '#db2777' : ph.active ? '#fff' : '#f4f4f5', border: ph.active ? '2.5px solid #db2777' : ph.done ? 'none' : '2px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
              {ph.done && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                  <path d="M5 13l4 4L19 7"/>
                </svg>
              )}
              {ph.active && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#db2777' }} />}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: ph.active ? '#db2777' : ph.done ? '#52525b' : '#a1a1aa', whiteSpace: 'nowrap' }}>{ph.label}</div>
          </div>
          {i < phases.length - 1 && (
            <div style={{ flex: 1, height: 2, background: ph.done ? '#db2777' : '#e4e4e7', margin: '0 4px', marginBottom: 18 }} />
          )}
        </div>
      ))}
    </div>
  )
}
