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
}

const METHODS = [
  { id: 'classic', icon: '📄', name: 'Classic Survey', desc: 'Traditional form-based questionnaire' },
  { id: 'conversational', icon: '💬', name: 'Conversational', desc: 'Chat-based adaptive survey' },
  { id: 'pulse', icon: '📈', name: 'Pulse / NPS', desc: 'Quick satisfaction metrics' },
  { id: 'poll', icon: '📊', name: 'Poll', desc: 'Single-question quick poll' },
  { id: 'video', icon: '🎥', name: 'Video Review', desc: 'Video-based feedback collection' },
  { id: 'onetoone', icon: '🙋', name: 'One-to-One', desc: 'Individual interview format' },
]

export default function Dashboard() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopBar activeLabel="Surveys" />

      <div className="page-container" style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Surveys</h1>
            <div style={{ color: 'var(--grey)', fontSize: 13 }}>Org: Durgesh&apos;s Workspace · Free plan</div>
          </div>
          <button className="btn" onClick={() => setShowModal(true)}>+ Create New</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--grey)', padding: 40 }}>Loading...</div>
        ) : surveys.length === 0 ? (
          <div style={{ background: 'var(--card)', border: '1px dashed var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No surveys yet</div>
            <div style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 20 }}>Create your first survey to get started</div>
            <button className="btn" onClick={() => setShowModal(true)}>+ Create New Survey</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {surveys.map(s => (
              <div
                key={s.id}
                onClick={() => router.push(`/surveys/${s.id}`)}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</div>
                  <div style={{ color: 'var(--grey)', fontSize: 12, marginTop: 2 }}>
                    Created {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                  background: s.status === 'active' ? 'var(--green-bg)' : 'var(--amber-bg)',
                  color: s.status === 'active' ? 'var(--green)' : 'var(--amber)',
                }}>
                  {s.status === 'active' ? 'Live' : 'Draft'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && <CreateModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}
    </div>
  )
}

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (title: string, mode: string) => void }) {
  const [title, setTitle] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('classic')
  const [creating, setCreating] = useState(false)
  const inFlight = useRef(false)  // sync guard — prevents double-submit before React re-renders

  const handleCreate = async () => {
    if (!title.trim() || inFlight.current) return
    inFlight.current = true
    setCreating(true)
    await onCreate(title.trim(), selectedMethod)
    inFlight.current = false
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, overflowY: 'auto', padding: '40px 16px' }}>
      <div style={{ background: 'white', borderRadius: 14, padding: 28, width: 680, maxWidth: '94vw' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>Create New Survey</h2>
        <div style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 20 }}>Give your survey a title and pick a type.</div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Survey Title *</label>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="e.g. Customer Satisfaction Q3 2026"
            style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
          />
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Survey Method <span style={{ color: 'var(--red)' }}>*</span></div>
        <div className="methods-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {METHODS.map(m => (
            <div
              key={m.id}
              onClick={() => setSelectedMethod(m.id)}
              style={{
                border: `1.5px solid ${selectedMethod === m.id ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10, padding: 14, cursor: 'pointer',
                background: selectedMethod === m.id ? '#F0F4FF' : 'white',
                boxShadow: selectedMethod === m.id ? '0 0 0 1px var(--accent) inset' : 'none',
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>{m.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
              <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 3 }}>{m.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ fontSize: 11.5, color: 'var(--grey)', fontStyle: 'italic' }}>Draft will be auto-saved</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn" onClick={handleCreate} disabled={!title.trim() || creating}>
              {creating ? <><span className="spinner" />Creating…</> : 'Create & Continue to Build'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
