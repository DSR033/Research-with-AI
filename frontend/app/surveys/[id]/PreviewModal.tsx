'use client'
import { useState } from 'react'
import type { QuestionData } from './QuestionEditor'

interface PreviewModalProps {
  questions: QuestionData[]
  selectedId: string | null
  branding?: { brand_color: string; logo_url?: string | null; org_name?: string }
  surveyTitle: string
  onClose: () => void
}

const inp: React.CSSProperties = {
  width: '100%', border: '1px solid #E3E8EF', borderRadius: 8,
  padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: 'white',
}

function PreviewQuestion({ q, color }: { q: QuestionData; color: string }) {
  const s = q.settings ?? {}
  const [starHover, setStarHover] = useState(0)
  const [val, setVal] = useState('')
  const [checked, setChecked] = useState<string[]>([])

  const opts = q.question_options?.sort((a, b) => a.position - b.position).map(o => o.label) ?? []
  const yesLabel = s.yes_label ?? 'Yes'
  const noLabel  = s.no_label  ?? 'No'
  const choiceOpts = q.type === 'yes_no' ? [yesLabel, noLabel] : opts

  return (
    <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #E3E8EF' }}>
      {/* Title */}
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, lineHeight: 1.4 }}>
        {q.title || <em style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No question text</em>}
        {q.required && <span style={{ color: '#D23B3B', marginLeft: 4 }}>*</span>}
      </div>

      {/* Help text */}
      {(s.help_text ?? q.help_text) && (
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>{s.help_text ?? q.help_text}</div>
      )}

      {/* Single / multi / yes-no */}
      {(q.type === 'single_choice' || q.type === 'yes_no') && choiceOpts.map(opt => (
        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', cursor: 'pointer', fontSize: 14 }}>
          <input type="radio" name={`prev-${q.id}`} readOnly />
          {opt}
        </label>
      ))}

      {q.type === 'multi_select' && opts.map(opt => (
        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', cursor: 'pointer', fontSize: 14 }}>
          <input type="checkbox" checked={checked.includes(opt)}
            onChange={e => setChecked(prev => e.target.checked ? [...prev, opt] : prev.filter(v => v !== opt))} />
          {opt}
        </label>
      ))}

      {/* NPS */}
      {q.type === 'nps' && (
        <div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {Array.from({ length: (s.scale_max ?? 10) - (s.scale_min ?? 0) + 1 }, (_, i) => {
              const n = (s.scale_min ?? 0) + i
              return (
                <button key={n} style={{
                  width: 40, height: 40, borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  border: `1.5px solid ${val === String(n) ? color : '#E3E8EF'}`,
                  background: val === String(n) ? color + '22' : 'white',
                  color: val === String(n) ? color : '#1F2937', fontWeight: val === String(n) ? 700 : 400,
                }} onClick={() => setVal(String(n))}>{n}</button>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#6B7280' }}>
            <span>{s.label_min || 'Not likely'}</span>
            <span>{s.label_max || 'Very likely'}</span>
          </div>
          {s.follow_up_prompt && val && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{s.follow_up_prompt}</div>
              <textarea rows={2} placeholder="Your reason…" style={{ ...inp, resize: 'none' }} />
            </div>
          )}
        </div>
      )}

      {/* Rating */}
      {q.type === 'rating' && (
        <div>
          <div style={{ display: 'flex', gap: 8, fontSize: 30 }}>
            {Array.from({ length: (s.scale_max ?? 5) - (s.scale_min ?? 1) + 1 }, (_, i) => {
              const n = (s.scale_min ?? 1) + i
              return (
                <span key={n} onMouseEnter={() => setStarHover(n)} onMouseLeave={() => setStarHover(0)}
                  onClick={() => setVal(String(n))} style={{ cursor: 'pointer', color: n <= (starHover || Number(val) || 0) ? '#F0B429' : '#D9DEE5' }}>★</span>
              )
            })}
          </div>
          {(s.label_min || s.label_max) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#6B7280' }}>
              <span>{s.label_min}</span><span>{s.label_max}</span>
            </div>
          )}
        </div>
      )}

      {/* Short text */}
      {q.type === 'short_text' && (
        <input type={(s.input_type as React.HTMLInputTypeAttribute) ?? 'text'}
          value={val} onChange={e => setVal(e.target.value)}
          placeholder={s.placeholder ?? 'Your answer…'} style={inp} />
      )}

      {/* Long text */}
      {q.type === 'long_text' && (
        <div>
          <textarea value={val} onChange={e => { if (!s.char_limit || e.target.value.length <= s.char_limit) setVal(e.target.value) }}
            placeholder={s.placeholder ?? 'Your answer…'} rows={3}
            style={{ ...inp, resize: 'vertical' }} />
          {s.char_limit && (
            <div style={{ textAlign: 'right', fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{val.length} / {s.char_limit}</div>
          )}
        </div>
      )}

      {/* Matrix */}
      {q.type === 'likert_matrix' && (s.rows ?? []).length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: '6px 10px', textAlign: 'left', width: 140 }} />
                {(s.columns ?? []).map(col => (
                  <th key={col} style={{ padding: '6px 8px', textAlign: 'center', fontSize: 11, color: '#6B7280', fontWeight: 600, whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(s.rows ?? []).map(row => (
                <tr key={row} style={{ borderTop: '1px solid #E3E8EF' }}>
                  <td style={{ padding: '9px 10px', fontWeight: 500 }}>{row}</td>
                  {(s.columns ?? []).map(col => (
                    <td key={col} style={{ padding: '9px 8px', textAlign: 'center' }}>
                      <input type="radio" name={`prev-${q.id}-${row}`} readOnly />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ranking */}
      {q.type === 'ranking' && (s.items ?? opts).length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
            {s.order_direction === 'lowest_first' ? '1 = Least important' : '1 = Most important'}
          </div>
          {(s.items ?? opts).map((item, i) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: '#F5F7FA', borderRadius: 8, marginBottom: 6, fontSize: 14 }}>
              <span style={{ color: '#9CA3AF', width: 20 }}>{i + 1}.</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}

      {/* Date/time */}
      {q.type === 'date_time' && (
        <input type={s.date_format === 'time' ? 'time' : s.date_format === 'datetime' ? 'datetime-local' : 'date'}
          style={{ ...inp, width: 'auto' }} />
      )}

      {/* Yes/No already handled above; this catches edge case */}
      {q.type === 'yes_no' && choiceOpts.length === 0 && (
        <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', cursor: 'pointer', fontSize: 14 }}>
            <input type="radio" readOnly /> Yes
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', cursor: 'pointer', fontSize: 14 }}>
            <input type="radio" readOnly /> No
          </label>
        </>
      )}

      {/* Error message hint */}
      {q.error_message && (
        <div style={{ fontSize: 11, color: '#D23B3B', marginTop: 6, fontStyle: 'italic' }}>{q.error_message}</div>
      )}
    </div>
  )
}

export default function PreviewModal({ questions, selectedId, branding, surveyTitle, onClose }: PreviewModalProps) {
  const [viewMode, setViewMode] = useState<'selected' | 'all'>(selectedId ? 'selected' : 'all')
  const color = branding?.brand_color ?? '#2E5BFF'
  const displayQs = viewMode === 'selected' && selectedId
    ? questions.filter(q => q.id === selectedId)
    : questions.filter(q => q.title?.trim())

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>

        {/* Modal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #E3E8EF' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Respondent Preview</span>
            <span style={{ fontSize: 11, padding: '2px 8px', background: '#EEF2FF', color: color, borderRadius: 20, fontWeight: 600 }}>Draft</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {selectedId && (
              <div style={{ display: 'flex', border: '1px solid #E3E8EF', borderRadius: 8, overflow: 'hidden', fontSize: 12 }}>
                {(['selected', 'all'] as const).map(m => (
                  <button key={m} onClick={() => setViewMode(m)} style={{
                    padding: '5px 12px', border: 'none', cursor: 'pointer', fontWeight: 600,
                    background: viewMode === m ? color : 'white', color: viewMode === m ? 'white' : '#6B7280',
                  }}>
                    {m === 'selected' ? 'This question' : 'All questions'}
                  </button>
                ))}
              </div>
            )}
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, color: '#9CA3AF', cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* Survey header preview */}
        <div style={{ borderBottom: '1px solid #E3E8EF' }}>
          <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
              {branding?.logo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={branding.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : (branding?.org_name?.[0] ?? 'S').toUpperCase()}
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{surveyTitle}</div>
          </div>
          <div style={{ height: 3, background: color }} />
        </div>

        {/* Questions */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 8px' }}>
          {displayQs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0', fontSize: 14 }}>
              No questions to preview yet. Add questions in the Build tab.
            </div>
          ) : (
            displayQs.map(q => <PreviewQuestion key={q.id} q={q} color={color} />)
          )}
        </div>

        {/* Mock submit */}
        {displayQs.length > 0 && (
          <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #E3E8EF' }}>
            <button style={{ background: color, color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'default', opacity: 0.85 }}>
              Submit ↗
            </button>
            <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 12 }}>Preview only — no responses recorded</span>
          </div>
        )}
      </div>
    </div>
  )
}
