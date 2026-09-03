'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase-browser'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const CAT_COLOR: Record<string, string> = {
  Consumer: '#f59e0b', Technology: '#3b82f6', Healthcare: '#10b981',
  Finance: '#8b5cf6', Lifestyle: '#db2777', Education: '#f97316',
}

interface Task {
  id: number | string
  cat: string
  title: string
  reward: string
  time: string
  diff: number
  eligible: boolean
  company: string
  filled: number
  quota: number
  desc: string
  eligReason?: string | null
  survey_id?: string
}

const DEMO_TASKS: Task[] = [
  { id: 1, cat: 'Consumer', title: 'New Energy Drink Taste Test', reward: '8.50', time: '8 min', diff: 1, eligible: true, company: 'Beverage Co.', filled: 142, quota: 200, desc: 'Help a leading beverage brand evaluate a new product line. Answer questions about taste, packaging, and brand perception.' },
  { id: 2, cat: 'Technology', title: 'Smartphone App Usability Study', reward: '12.00', time: '12 min', diff: 2, eligible: true, company: 'TechStart Inc.', filled: 89, quota: 150, desc: 'Evaluate the usability of a new productivity app. Share feedback on navigation, features, and overall experience.' },
  { id: 3, cat: 'Healthcare', title: 'Mental Wellness Check-in', reward: '6.00', time: '6 min', diff: 1, eligible: true, company: 'HealthTrack', filled: 201, quota: 300, desc: 'A quick wellness survey exploring daily habits and mental health awareness. All responses are anonymous.' },
  { id: 4, cat: 'Finance', title: 'Investment Behaviour Patterns', reward: '18.50', time: '18 min', diff: 3, eligible: false, company: 'FinTech Research', filled: 45, quota: 100, desc: 'Share your experience with investment apps and financial decision-making. Requires age 35+.', eligReason: 'Age 35+ required' },
  { id: 5, cat: 'Lifestyle', title: 'Remote Work Habits 2026', reward: '9.00', time: '9 min', diff: 2, eligible: true, company: 'Workforce Analytics', filled: 312, quota: 500, desc: 'Help researchers understand how remote work is evolving. Share your daily routines and collaboration habits.' },
  { id: 6, cat: 'Education', title: 'Online Learning Preferences', reward: '7.00', time: '7 min', diff: 1, eligible: true, company: 'EduInsights', filled: 78, quota: 200, desc: 'A short survey about your online learning habits, preferred formats, and experiences with e-learning platforms.' },
]

const DEMO_MY_TASKS: { id: number; title: string; reward: string; status: string; date: string; survey_id?: string }[] = [
  { id: 10, title: 'Brand Perception Survey', reward: '11.00', status: 'completed', date: 'Jun 28, 2026' },
  { id: 11, title: 'Food Delivery App Feedback', reward: '7.50', status: 'completed', date: 'Jun 25, 2026' },
  { id: 12, title: 'Social Media Usage Tracker', reward: '9.50', status: 'in_progress', date: 'Jun 30, 2026' },
]

const PAYOUTS = [
  { desc: 'Survey batch payout', date: 'Jun 28', method: 'PayPal', amount: '38.00' },
  { desc: 'Technology survey bonus', date: 'Jun 20', method: 'Bank transfer', amount: '22.50' },
  { desc: 'Consumer panel rewards', date: 'Jun 12', method: 'PayPal', amount: '55.00' },
  { desc: 'Weekly payout', date: 'Jun 5', method: 'PayPal', amount: '28.00' },
]

function DiffDots({ diff }: { diff: number }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3].map(i => <span key={i} style={{ color: i <= diff ? '#db2777' : '#e4e4e7', fontSize: 14 }}>●</span>)}
    </div>
  )
}

export default function AudienceDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<'tasks' | 'mytasks' | 'earnings' | 'profile'>('tasks')
  const [user, setUser] = useState<{ id?: string; email?: string; name?: string } | null>(null)
  const [filterCat, setFilterCat] = useState('all')
  const [filterReward, setFilterReward] = useState('all')
  const [filterTime, setFilterTime] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<number | string | null>(null)
  const [tasks, setTasks] = useState<Task[]>(DEMO_TASKS)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push('/login'); return }
      setUser({ id: u.id, email: u.email, name: u.user_metadata?.full_name })
      // load live tasks from active surveys
      fetch(`${API}/audience/tasks`).then(r => r.json()).then((d: Task[]) => { if (Array.isArray(d) && d.length) setTasks(d) }).catch(() => {})
    })
  }, [])

  const tabS = (on: boolean) => ({
    fontSize: 12, fontWeight: 600 as const, padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer' as const,
    background: on ? '#fff' : 'transparent', color: on ? '#18181b' : '#71717a',
    boxShadow: on ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
  })

  const catBadge = (cat: string) => ({
    display: 'inline-flex' as const, alignItems: 'center' as const, fontSize: 10, fontWeight: 700 as const,
    color: '#fff', background: CAT_COLOR[cat] || '#a1a1aa', padding: '3px 10px', borderRadius: 99,
  })

  const filtered = tasks.filter(t => {
    if (filterCat !== 'all' && t.cat !== filterCat) return false
    if (filterReward === 'low' && parseFloat(t.reward) > 8) return false
    if (filterReward === 'mid' && (parseFloat(t.reward) <= 8 || parseFloat(t.reward) > 15)) return false
    if (filterReward === 'high' && parseFloat(t.reward) <= 15) return false
    const mins = parseInt(t.time)
    if (filterTime === 'short' && mins >= 5) return false
    if (filterTime === 'medium' && (mins < 5 || mins > 15)) return false
    if (filterTime === 'long' && mins <= 15) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const sel = tasks.find(t => t.id === selectedTaskId) || null
  const profileItems = [
    { label: 'Basic info', done: true }, { label: 'Age & country', done: true },
    { label: 'Languages spoken', done: true }, { label: 'Interests added', done: false }, { label: 'Email verified', done: false },
  ]
  const profilePct = Math.round(profileItems.filter(p => p.done).length / profileItems.length * 100)

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : (user?.email?.[0]?.toUpperCase() ?? '?')

  const signOut = async () => { await supabase.auth.signOut(); router.push('/login') }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 18, padding: '0 24px', height: 60, background: 'rgba(255,255,255,.82)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(219,39,119,.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }} onClick={() => router.push('/audience')}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(219,39,119,.35)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 17, letterSpacing: '-.02em', color: '#18181b' }}>SurveyAI</span>
        </div>

        <nav style={{ display: 'flex', gap: 2, background: '#f4f4f5', padding: 3, borderRadius: 10 }}>
          {([['tasks', 'Tasks'], ['mytasks', 'My Tasks'], ['earnings', 'Earnings'], ['profile', 'Profile']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={tabS(tab === k)}>{l}</button>
          ))}
        </nav>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.9)', border: '1px solid rgba(219,39,119,.15)', padding: '8px 14px', borderRadius: 99 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#18181b' }}>$142.50</span>
            <button onClick={() => setTab('earnings')} style={{ fontSize: 11, fontWeight: 700, color: '#be185d', background: '#fdf2f8', border: 'none', padding: '3px 8px', borderRadius: 6, cursor: 'pointer' }}>Withdraw</button>
          </div>
          <div onClick={signOut} style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 14, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(219,39,119,.35)' }}>
            {initials}
          </div>
        </div>
      </header>

      {/* Tasks Tab */}
      {tab === 'tasks' && (
        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 24px 48px' }}>
            {/* Welcome banner */}
            <div style={{ background: 'linear-gradient(135deg,rgba(219,39,119,.08),rgba(147,51,234,.08))', border: '1px solid rgba(219,39,119,.12)', borderRadius: 18, padding: '18px 22px', marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 16, color: '#18181b' }}>Good morning, {user?.name?.split(' ')[0] || 'there'}! 👋</div>
                <div style={{ fontSize: 13, color: '#71717a', marginTop: 3 }}>You have <strong style={{ color: '#db2777' }}>{filtered.filter(t => t.eligible).length}</strong> surveys available matching your profile.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#52525b', background: 'rgba(255,255,255,.8)', padding: '8px 14px', borderRadius: 10, border: '1px solid #e4e4e7' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />Profile completeness: <strong style={{ color: '#18181b' }}>{profilePct}%</strong>
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.85)', border: '1px solid #e4e4e7', borderRadius: 10, padding: '8px 12px', flex: 1, minWidth: 200 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search surveys…" style={{ fontSize: 13, color: '#27272a', background: 'transparent', border: 'none', outline: 'none', width: '100%' }} />
              </div>
              {[
                { val: filterCat, set: setFilterCat, opts: [['all', 'All categories'], ['Consumer', 'Consumer'], ['Technology', 'Technology'], ['Healthcare', 'Healthcare'], ['Finance', 'Finance'], ['Lifestyle', 'Lifestyle'], ['Education', 'Education']] },
                { val: filterReward, set: setFilterReward, opts: [['all', 'Any reward'], ['low', '$1–$8'], ['mid', '$8–$15'], ['high', '$15+']] },
                { val: filterTime, set: setFilterTime, opts: [['all', 'Any duration'], ['short', 'Under 5 min'], ['medium', '5–15 min'], ['long', '15+ min']] },
              ].map((f, fi) => (
                <select key={fi} value={f.val} onChange={e => f.set(e.target.value)} style={{ fontSize: 13, color: '#27272a', background: 'rgba(255,255,255,.85)', border: '1px solid #e4e4e7', borderRadius: 10, padding: '9px 12px', outline: 'none' }}>
                  {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#18181b' }}>{filtered.length} surveys available</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#db2777', fontWeight: 600, background: '#fdf2f8', padding: '5px 11px', borderRadius: 8, border: '1px solid #fbcfe8' }}>✨ AI matching — Phase 2</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
              {filtered.map(tk => {
                const pct = Math.round(tk.filled / tk.quota * 100)
                const hot = pct > 75
                return (
                  <div key={tk.id} style={{ background: 'rgba(255,255,255,.92)', border: '1px solid rgba(0,0,0,.06)', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'box-shadow .15s,border-color .15s', cursor: 'default' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(219,39,119,.1)'; (e.currentTarget as HTMLElement).style.borderColor = '#fbcfe8' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,.06)' }}>
                    <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f5f5f8' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                        <span style={catBadge(tk.cat)}>{tk.cat}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, ...(tk.eligible ? { color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0' } : { color: '#ef4444', background: '#fff1f2', border: '1px solid #fecdd3' }) }}>
                          {tk.eligible ? '✓ Eligible' : (tk as { eligReason?: string }).eligReason || 'Locked'}
                        </span>
                      </div>
                      <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 15, color: '#18181b', lineHeight: 1.35, marginBottom: 5 }}>{tk.title}</div>
                      <div style={{ fontSize: 12, color: '#a1a1aa' }}>{tk.company}</div>
                    </div>
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 20, color: '#16a34a' }}>${tk.reward}</span>
                          <span style={{ fontSize: 10, color: '#a1a1aa' }}>reward</span>
                        </div>
                        <div style={{ width: 1, height: 28, background: '#f1f1f4' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#27272a' }}>{tk.time}</span>
                          <span style={{ fontSize: 10, color: '#a1a1aa' }}>duration</span>
                        </div>
                        <div style={{ width: 1, height: 28, background: '#f1f1f4' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                          <DiffDots diff={tk.diff} />
                          <span style={{ fontSize: 10, color: '#a1a1aa' }}>{['', 'Easy', 'Medium', 'Hard'][tk.diff]}</span>
                        </div>
                      </div>
                      <button onClick={() => tk.eligible && setSelectedTaskId(tk.id)} style={{ fontSize: 13, fontWeight: 700, padding: '9px 16px', borderRadius: 10, cursor: tk.eligible ? 'pointer' : 'not-allowed', flexShrink: 0, border: 'none', ...(tk.eligible ? { color: '#fff', background: 'linear-gradient(135deg,#db2777,#be185d)' } : { color: '#a1a1aa', background: '#f4f4f5', border: '1px solid #e4e4e7' }) }}>
                        {tk.eligible ? 'Start →' : 'Locked'}
                      </button>
                    </div>
                    <div style={{ padding: '0 16px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: '#a1a1aa' }}>{tk.filled}/{tk.quota} spots filled</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: hot ? '#f59e0b' : '#10b981' }}>{hot ? 'Filling fast!' : 'Spots left'}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: '#f1f1f4', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: hot ? '#f59e0b' : '#db2777', borderRadius: 99 }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ width: 300, flexShrink: 0, borderLeft: '1px solid rgba(0,0,0,.06)', background: 'rgba(255,255,255,.6)', backdropFilter: 'blur(8px)', overflowY: 'auto', padding: 20 }}>
            <div style={{ background: 'linear-gradient(135deg,#db2777,#9333ea)', borderRadius: 16, padding: 20, color: '#fff', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', opacity: .8, marginBottom: 10 }}>Your earnings</div>
              <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 32, marginBottom: 2 }}>$892.50</div>
              <div style={{ fontSize: 12, opacity: .75, marginBottom: 16 }}>total earned · all time</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 10, padding: 10 }}><div style={{ fontSize: 10, opacity: .8, marginBottom: 3 }}>Available</div><div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 18 }}>$142.50</div></div>
                <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 10, padding: 10 }}><div style={{ fontSize: 10, opacity: .8, marginBottom: 3 }}>Pending</div><div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 18 }}>$38.00</div></div>
              </div>
              <button onClick={() => setTab('earnings')} style={{ width: '100%', fontSize: 13, fontWeight: 700, color: '#db2777', background: '#fff', border: 'none', padding: 10, borderRadius: 10, cursor: 'pointer' }}>Withdraw funds</button>
            </div>

            <div style={{ background: 'rgba(255,255,255,.9)', border: '1px solid #f1f1f4', borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#18181b' }}>Profile completeness</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#db2777' }}>{profilePct}%</div>
              </div>
              <div style={{ height: 6, background: '#f1f1f4', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ height: '100%', width: `${profilePct}%`, background: 'linear-gradient(90deg,#db2777,#9333ea)', borderRadius: 99 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profileItems.map(pi => (
                  <div key={pi.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: pi.done ? '#27272a' : '#a1a1aa' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={pi.done ? '#10b981' : '#d4d4d8'} strokeWidth="2.6" strokeLinecap="round"><path d={pi.done ? 'M20 6 9 17l-5-5' : 'M18 6 6 18M6 6l12 12'}/></svg>
                    {pi.label}
                    {!pi.done && <button onClick={() => setTab('profile')} style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#be185d', background: '#fdf2f8', border: 'none', padding: '2px 8px', borderRadius: 6, cursor: 'pointer' }}>Add</button>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My Tasks Tab */}
      {tab === 'mytasks' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 48px', maxWidth: 860, margin: '0 auto', width: '100%' }}>
          <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 20, color: '#18181b', marginBottom: 20 }}>My Tasks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DEMO_MY_TASKS.map(mt => (
              <div key={mt.id} style={{ background: 'rgba(255,255,255,.92)', border: '1px solid rgba(0,0,0,.06)', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 99, ...(mt.status === 'completed' ? { color: '#16a34a', background: '#f0fdf4' } : { color: '#f59e0b', background: '#fffbeb' }) }}>
                  {mt.status === 'completed' ? 'Completed' : 'In Progress'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#18181b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mt.title}</div>
                  <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 2 }}>{mt.date}</div>
                </div>
                <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 16, color: '#16a34a' }}>${mt.reward}</div>
                {mt.status === 'in_progress' && (
                  <button
                    onClick={() => mt.survey_id && router.push(`/surveys/${mt.survey_id}/respond`)}
                    disabled={!mt.survey_id}
                    style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#db2777', border: 'none', padding: '7px 14px', borderRadius: 8, cursor: mt.survey_id ? 'pointer' : 'not-allowed', opacity: mt.survey_id ? 1 : .6 }}>
                    Continue →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earnings Tab */}
      {tab === 'earnings' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 48px', maxWidth: 860, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 20, color: '#18181b' }}>Earnings &amp; Payouts</div>
            <button style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#db2777,#be185d)', border: 'none', padding: '10px 20px', borderRadius: 10, cursor: 'pointer' }}>Withdraw $142.50</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
            {[['Available to withdraw', '$142.50', '#18181b'], ['Pending clearance', '$38.00', '#18181b'], ['Total earned', '$892.50', '#16a34a']].map(([l, v, c]) => (
              <div key={l} style={{ background: 'rgba(255,255,255,.92)', borderRadius: 16, padding: 20, border: '1px solid rgba(0,0,0,.06)' }}>
                <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 6 }}>{l}</div>
                <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 28, color: c }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,.92)', border: '1px solid rgba(0,0,0,.06)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f1f4', fontSize: 13, fontWeight: 700, color: '#18181b' }}>Payout history</div>
            {PAYOUTS.map((py, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid #f7f7f9' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#27272a' }}>{py.desc}</div>
                  <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 1 }}>{py.date} · {py.method}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>+${py.amount}</div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '3px 8px', borderRadius: 6 }}>Paid</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 48px', maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 20, color: '#18181b', marginBottom: 20 }}>My Profile</div>
          <div style={{ background: 'rgba(255,255,255,.92)', border: '1px solid rgba(0,0,0,.06)', borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 16, borderBottom: '1px solid #f1f1f4' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#db2777,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 24, color: '#fff' }}>{initials}</div>
              <div>
                <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 18, color: '#18181b' }}>{user?.name || 'Respondent'}</div>
                <div style={{ fontSize: 13, color: '#a1a1aa' }}>Respondent · {user?.email}</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#db2777' }}>{profilePct}% complete</div>
            </div>
            <div style={{ fontSize: 13, color: '#71717a', fontStyle: 'italic' }}>Complete your profile to unlock more surveys and earn higher rewards.</div>
            <button onClick={signOut} style={{ alignSelf: 'flex-start', fontSize: 13, fontWeight: 600, color: '#ef4444', background: 'none', border: '1px solid #fecdd3', padding: '8px 16px', borderRadius: 9, cursor: 'pointer' }}>Sign out</button>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {sel && (
        <div onClick={() => setSelectedTaskId(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(9,9,18,.5)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 24, width: 540, maxWidth: '100%', boxShadow: '0 32px 80px rgba(0,0,0,.2)', overflow: 'hidden' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f1f4', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <span style={catBadge(sel.cat)}>{sel.cat}</span>
                <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 20, color: '#18181b', marginTop: 8, lineHeight: 1.25 }}>{sel.title}</div>
                <div style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4 }}>{sel.company}</div>
              </div>
              <button onClick={() => setSelectedTaskId(null)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#f4f4f5', color: '#71717a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                <div style={{ background: '#f8f8fc', borderRadius: 12, padding: 14, textAlign: 'center' }}><div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 22, color: '#16a34a' }}>${sel.reward}</div><div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>Reward</div></div>
                <div style={{ background: '#f8f8fc', borderRadius: 12, padding: 14, textAlign: 'center' }}><div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 18, color: '#18181b' }}>{sel.time}</div><div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>Est. time</div></div>
                <div style={{ background: '#f8f8fc', borderRadius: 12, padding: 14, textAlign: 'center' }}><div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 18, color: '#18181b' }}>{['', 'Easy', 'Medium', 'Hard'][sel.diff]}</div><div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>Difficulty</div></div>
              </div>
              <div style={{ fontSize: 13, color: '#52525b', lineHeight: 1.6, marginBottom: 16 }}>{sel.desc}</div>
              <div style={{ background: '#f8f8fc', border: '1px solid #e8e8f0', borderRadius: 12, padding: 14, marginBottom: 20, fontSize: 12, color: '#52525b', lineHeight: 1.6 }}>
                <strong style={{ color: '#18181b' }}>${sel.reward} fixed reward</strong> — paid regardless of survey outcome. After you submit, it moves to <strong>Pending</strong> for 24–48h quality review, then clears to your <strong>Available</strong> balance.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setSelectedTaskId(null)} style={{ flexShrink: 0, fontSize: 14, fontWeight: 600, color: '#71717a', background: '#f4f4f5', border: 'none', padding: '12px 20px', borderRadius: 11, cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={() => {
                    if (sel!.survey_id) {
                      setSelectedTaskId(null)
                      router.push(`/surveys/${sel!.survey_id}/respond`)
                    }
                  }}
                  disabled={!sel!.survey_id}
                  style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#db2777,#be185d)', border: 'none', padding: 13, borderRadius: 11, cursor: sel!.survey_id ? 'pointer' : 'not-allowed', boxShadow: '0 4px 14px rgba(219,39,119,.3)', opacity: sel!.survey_id ? 1 : .7 }}>
                  Start survey →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
