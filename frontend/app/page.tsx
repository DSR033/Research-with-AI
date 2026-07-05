'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { fetchSurveys, createSurvey } from '../lib/api'
import TopBar from '../components/TopBar'
import { createClient } from '../lib/supabase-browser'

interface Survey {
  id: string
  title: string
  status: string
  created_at: string
  mode?: string
}

const STRIP_COLORS = ['#db2777', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#ef4444', '#14b8a6']

const METHODS = [
  { id: 'classic',        icon: '📄', name: 'Classic Survey',   desc: 'Traditional form-based questionnaire' },
  { id: 'conversational', icon: '💬', name: 'Conversational',   desc: 'Chat-based adaptive survey' },
  { id: 'pulse',          icon: '📈', name: 'Pulse / NPS',      desc: 'Quick satisfaction metrics' },
  { id: 'poll',           icon: '📊', name: 'Poll',             desc: 'Single-question quick poll' },
  { id: 'video',          icon: '🎥', name: 'Video Review',     desc: 'Video-based feedback collection' },
  { id: 'onetoone',       icon: '🙋', name: 'One-to-One',       desc: 'Individual interview format' },
]

function statusBadge(status: string) {
  if (status === 'active' || status === 'published') return { label: 'Published', style: 'display:inline-flex;align-items:center;font-size:11px;font-weight:700;color:#dcfce7;background:rgba(22,163,74,.25);padding:3px 10px;border-radius:99px;border:1px solid rgba(134,239,172,.4)' }
  if (status === 'draft')  return { label: 'Draft', style: 'display:inline-flex;align-items:center;font-size:11px;font-weight:700;color:#fef9c3;background:rgba(202,138,4,.25);padding:3px 10px;border-radius:99px;border:1px solid rgba(253,224,71,.4)' }
  return { label: 'Closed', style: 'display:inline-flex;align-items:center;font-size:11px;font-weight:700;color:#e4e4e7;background:rgba(100,100,100,.25);padding:3px 10px;border-radius:99px;border:1px solid rgba(200,200,200,.3)' }
}

export default function Dashboard() {
  const [surveys, setSurveys]   = useState<Survey[]>([])
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter]     = useState<'all' | 'active' | 'draft'>('all')
  const [loading, setLoading]   = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchSurveys().then(data => { setSurveys(data); setLoading(false) })
  }, [])

  const handleCreate = async (title: string, mode: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const s = await createSurvey({ title, mode, status: 'draft', created_by: user?.id ?? null })
    router.push(`/surveys/${s.id}`)
  }

  const filtered = surveys.filter(s => {
    if (filter === 'all') return true
    if (filter === 'active') return s.status === 'active' || s.status === 'published'
    return s.status === 'draft'
  })

  const totalPublished = surveys.filter(s => s.status === 'active' || s.status === 'published').length

  const tabStyle = (on: boolean) => ({
    fontSize: 13, fontWeight: on ? 600 : 500, padding: '7px 16px', borderRadius: 8, border: 'none',
    cursor: 'pointer' as const,
    background: on ? '#fff' : 'transparent',
    color: on ? '#18181b' : '#71717a',
    boxShadow: on ? '0 1px 3px rgba(0,0,0,.10)' : 'none',
  })

  return (
    <div style={{ minHeight: '100vh' }}>
      <TopBar activeLabel="Surveys" />

      <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 28px 80px' }}>

        {/* Stats row */}
        <div className="stat-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 32 }}>
          {[
            { label: 'Total surveys',    value: surveys.length,      delta: `${totalPublished} published` },
            { label: 'Published',        value: totalPublished,      delta: 'currently live' },
            { label: 'Drafts',           value: surveys.length - totalPublished, delta: 'in progress' },
            { label: 'Avg. completion',  value: '—',                 delta: 'across all surveys' },
          ].map(st => (
            <div key={st.label} style={{ background: '#fff', border: '1px solid #ececf0', borderRadius: 16, padding: '18px 20px' }}>
              <div style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 600, marginBottom: 8 }}>{st.label}</div>
              <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 28, letterSpacing: '-.02em', color: '#18181b' }}>{st.value}</div>
              <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>{st.delta}</div>
            </div>
          ))}
        </div>

        {/* Filter + Create */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 2, background: '#f4f4f5', padding: 4, borderRadius: 11 }}>
            <button onClick={() => setFilter('all')}    style={tabStyle(filter === 'all')}>All surveys</button>
            <button onClick={() => setFilter('active')} style={tabStyle(filter === 'active')}>Published</button>
            <button onClick={() => setFilter('draft')}  style={tabStyle(filter === 'draft')}>Draft</button>
          </div>
          <button className="btn" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            New survey
          </button>
        </div>

        {/* Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#a1a1aa', padding: 60, fontSize: 14 }}>Loading…</div>
        ) : filtered.length === 0 && surveys.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,.85)', border: '1.5px dashed #d4d4d8', borderRadius: 20, padding: '60px 32px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#f4f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 17, color: '#18181b', marginBottom: 6 }}>No surveys yet</div>
            <div style={{ color: '#71717a', fontSize: 13, marginBottom: 22 }}>Create your first survey to get started</div>
            <button className="btn" onClick={() => setShowModal(true)}>Create new survey</button>
          </div>
        ) : (
          <div className="survey-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {filtered.map((s, i) => {
              const color = STRIP_COLORS[i % STRIP_COLORS.length]
              const badge = statusBadge(s.status)
              const date = new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
              return (
                <div key={s.id}
                  style={{ background: '#fff', border: '1px solid #ececf0', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'box-shadow .15s, border-color .15s', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(0,0,0,.08)'; (e.currentTarget as HTMLElement).style.borderColor = '#d4d4d8' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.borderColor = '#ececf0' }}
                  onClick={() => router.push(`/surveys/${s.id}`)}
                >
                  {/* Colorful strip */}
                  <div style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, padding: '22px 20px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span dangerouslySetInnerHTML={{ __html: badge.style ? `<span style="${badge.style}">${badge.label}</span>` : '' }} />
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>{date}</span>
                    </div>
                    <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 18, color: '#fff', lineHeight: 1.25, letterSpacing: '-.01em' }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 4 }}>{s.mode ?? 'classic'} survey</div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '14px 16px', marginTop: 'auto' }}>
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/surveys/${s.id}`) }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#be185d', background: '#fdf2f8', border: 'none', padding: 9, borderRadius: 9, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fce7f3')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fdf2f8')}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                      Edit
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/surveys/${s.id}?tab=results`) }}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#18181b', background: '#f4f4f5', border: 'none', padding: 9, borderRadius: 9, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#ececf0')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#f4f4f5')}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                      Results
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Create new card */}
            <div
              onClick={() => setShowModal(true)}
              style={{ background: 'transparent', border: '1.5px dashed #d4d4d8', borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 200, cursor: 'pointer', padding: 32 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#f9a8d4'; (e.currentTarget as HTMLElement).style.background = 'rgba(253,242,248,.5)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#d4d4d8'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f4f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 15, color: '#27272a' }}>Create new survey</div>
                <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 3 }}>Start from scratch or use a template</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && <CreateModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}
    </div>
  )
}

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (title: string, mode: string) => void }) {
  const [title, setTitle]               = useState('')
  const [selectedMethod, setSelectedMethod] = useState('classic')
  const [creating, setCreating]         = useState(false)
  const inFlight = useRef(false)

  const handleCreate = async () => {
    if (!title.trim() || inFlight.current) return
    inFlight.current = true
    setCreating(true)
    await onCreate(title.trim(), selectedMethod)
    inFlight.current = false
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,9,18,.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px 16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 20, width: 680, maxWidth: '96vw', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,.22)' }}>
        {/* Header strip */}
        <div style={{ background: 'linear-gradient(135deg,#db2777,#9333ea)', padding: '28px 32px 24px' }}>
          <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 22, color: '#fff', letterSpacing: '-.02em' }}>Create new survey</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', marginTop: 4 }}>Give your survey a title and choose a type to get started.</div>
        </div>

        <div style={{ padding: '28px 32px' }}>
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Survey Title *</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Customer Satisfaction Q3 2026"
              style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', transition: 'border-color .15s' }}
              onFocus={e => (e.target.style.borderColor = '#f9a8d4')}
              onBlur={e => (e.target.style.borderColor = '#e4e4e7')}
            />
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 12 }}>Survey Method</div>
          <div className="methods-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
            {METHODS.map(m => (
              <div
                key={m.id}
                onClick={() => setSelectedMethod(m.id)}
                style={{
                  border: `1.5px solid ${selectedMethod === m.id ? '#db2777' : '#e4e4e7'}`,
                  borderRadius: 12, padding: 14, cursor: 'pointer',
                  background: selectedMethod === m.id ? '#fdf2f8' : 'transparent',
                  transition: 'all .12s',
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 7 }}>{m.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#18181b' }}>{m.name}</div>
                <div style={{ fontSize: 11, color: '#71717a', marginTop: 3 }}>{m.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn ghost" onClick={onClose} disabled={creating}>Cancel</button>
            <button className="btn" onClick={handleCreate} disabled={!title.trim() || creating}>
              {creating ? <><span className="spinner" />Creating…</> : 'Create & Build →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
