'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '../../components/TopBar'
import { createClient } from '../../lib/supabase-browser'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface TQuestion { type: string; title?: string; options?: string[] }
interface Template {
  id: string
  name: string
  category: string
  description: string
  structure: { title: string; questions: TQuestion[] }
}

const CATEGORY_ICONS: Record<string, string> = {
  Customer: '🤝',
  Employee: '👥',
  Event: '🎤',
  Research: '🔬',
  Product: '📦',
}

const TYPE_LABEL: Record<string, string> = {
  single_choice: 'Single choice', multi_select: 'Multi-select', short_text: 'Short text',
  long_text: 'Open text', rating: 'Rating', nps: 'NPS', yes_no: 'Yes/No',
  ranking: 'Ranking', date_time: 'Date', likert_matrix: 'Matrix',
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Customer: { bg: '#EEF2FF', text: '#1F45D6' },
  Employee: { bg: '#E7F8EF', text: '#1E9E5A' },
  Event: { bg: '#FDF1E0', text: '#C9882E' },
  Research: { bg: '#F1E9F7', text: '#7B4FA0' },
  Product: { bg: '#FEF3F2', text: '#D23B3B' },
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [creating, setCreating] = useState<string | null>(null)
  const [preview, setPreview] = useState<Template | null>(null)

  useEffect(() => {
    fetch(`${API}/templates`)
      .then(r => r.json())
      .then(data => { setTemplates(data); setLoading(false) })
  }, [])

  const categories = ['All', ...Array.from(new Set(templates.map(t => t.category))).sort()]

  const filtered = activeCategory === 'All'
    ? templates
    : templates.filter(t => t.category === activeCategory)

  const useTemplate = async (t: Template) => {
    setCreating(t.id)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch(`${API}/templates/${t.id}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'classic', created_by: user?.id ?? null }),
      })
      const data = await res.json()
      router.push(`/surveys/${data.survey_id}`)
    } catch {
      alert('Failed to create survey from template.')
      setCreating(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopBar activeLabel="Templates" />

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, margin: '0 0 6px' }}>Templates</h1>
          <div style={{ color: 'var(--grey)', fontSize: 13 }}>
            Start with a proven survey — customise it in the builder after selecting.
          </div>
        </div>

        {/* Category filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                border: `1.5px solid ${activeCategory === cat ? 'var(--accent)' : 'var(--border)'}`,
                background: activeCategory === cat ? '#EEF2FF' : 'white',
                color: activeCategory === cat ? 'var(--accent)' : 'var(--grey)',
                cursor: 'pointer',
              }}
            >
              {cat !== 'All' && <span style={{ marginRight: 5 }}>{CATEGORY_ICONS[cat] ?? '📋'}</span>}
              {cat}
              {cat !== 'All' && (
                <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--grey)' }}>
                  {templates.filter(t => t.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Template grid */}
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--grey)', padding: 60 }}>Loading templates…</div>
        ) : (
          <div className="templates-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filtered.map(t => {
              const qCount = t.structure?.questions?.length ?? 0
              const catStyle = CATEGORY_COLORS[t.category] ?? { bg: 'var(--bg)', text: 'var(--grey)' }
              const isCreating = creating === t.id

              return (
                <div
                  key={t.id}
                  style={{
                    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
                    padding: 20, display: 'flex', flexDirection: 'column', gap: 10,
                    transition: 'box-shadow .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                >
                  {/* Category badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                      background: catStyle.bg, color: catStyle.text,
                    }}>
                      {CATEGORY_ICONS[t.category]} {t.category}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--grey)' }}>{qCount} questions</span>
                  </div>

                  {/* Name + description */}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{t.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.4 }}>{t.description}</div>
                  </div>

                  {/* Question type pills */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {Array.from(new Set(t.structure?.questions?.map(q => q.type) ?? [])).slice(0, 4).map(type => (
                      <span key={type} style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 20,
                        background: 'var(--bg)', color: 'var(--grey)', border: '1px solid var(--border)',
                      }}>
                        {TYPE_LABEL[type] ?? type}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      onClick={() => useTemplate(t)}
                      disabled={!!creating}
                      className="btn"
                      style={{ flex: 1, padding: '9px 0', fontSize: 13 }}
                    >
                      {isCreating ? <><span className="spinner" />Creating…</> : 'Use Template'}
                    </button>
                    <button
                      onClick={() => setPreview(preview?.id === t.id ? null : t)}
                      style={{
                        padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)',
                        background: 'white', fontSize: 13, cursor: 'pointer', color: 'var(--grey)',
                      }}
                    >
                      {preview?.id === t.id ? 'Close' : 'Preview'}
                    </button>
                  </div>

                  {/* Inline preview */}
                  {preview?.id === t.id && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', marginBottom: 8 }}>
                        Questions
                      </div>
                      {t.structure.questions.map((q, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: i < t.structure.questions.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
                          <span style={{ color: 'var(--grey)', flexShrink: 0, width: 18 }}>{i + 1}.</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: 'var(--text)', lineHeight: 1.3 }}>{q.title}</div>
                            <span style={{ fontSize: 10, color: 'var(--accent)', background: '#EEF2FF', padding: '1px 6px', borderRadius: 4, marginTop: 3, display: 'inline-block' }}>
                              {TYPE_LABEL[q.type] ?? q.type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
