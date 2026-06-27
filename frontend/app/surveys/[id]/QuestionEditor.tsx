'use client'
import { useState, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface QuestionSettings {
  // Common
  help_text?: string
  error_message?: string
  // Single / Multi choice options
  options?: string[]
  min_selections?: number
  max_selections?: number
  // Rating
  scale_min?: number
  scale_max?: number
  label_min?: string
  label_max?: string
  // NPS
  follow_up_prompt?: string
  // Short / Long text
  placeholder?: string
  input_type?: 'text' | 'email' | 'phone' | 'number' | 'url'
  validation_rule?: string
  char_limit?: number
  // Yes/No
  yes_label?: string
  no_label?: string
  // Matrix/Likert
  rows?: string[]
  columns?: string[]
  // Ranking
  items?: string[]
  order_direction?: 'highest_first' | 'lowest_first'
  // Date/Time
  date_format?: 'date' | 'time' | 'datetime'
  min_date?: string
  max_date?: string
}

export interface QuestionData {
  id: string
  type: string
  title: string
  required: boolean
  position: number
  help_text?: string
  error_message?: string
  settings?: QuestionSettings
  question_options?: Array<{ id: string; label: string; position: number }>
}

const QUESTION_TYPES = [
  { type: 'single_choice',  label: '◉ Single choice' },
  { type: 'multi_select',   label: '☑ Multi-select' },
  { type: 'rating',         label: '★ Rating scale' },
  { type: 'nps',            label: '📊 NPS (0–10)' },
  { type: 'short_text',     label: '✎ Short text' },
  { type: 'long_text',      label: '📝 Long text' },
  { type: 'yes_no',         label: '⬤ Yes / No' },
  { type: 'likert_matrix',  label: '▦ Matrix / Likert' },
  { type: 'ranking',        label: '⇕ Ranking' },
  { type: 'date_time',      label: '📅 Date / time' },
]

const TYPE_LABEL: Record<string, string> = Object.fromEntries(QUESTION_TYPES.map(t => [t.type, t.label]))

const HAS_OPTIONS   = ['single_choice', 'multi_select']
const HAS_ITEMS     = ['ranking']
const HAS_MATRIX    = ['likert_matrix']

// ── Reusable small UI ──────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', border: '1px solid var(--border)', borderRadius: 8,
  padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'white',
}
const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
    {hint && <div style={{ fontSize: 11, color: 'var(--grey)' }}>{hint}</div>}
    {children}
  </div>
)

function OptionsEditor({ label, values, onChange, addLabel = '+ Add option' }: {
  label: string; values: string[]; onChange: (v: string[]) => void; addLabel?: string
}) {
  return (
    <Row label={label}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {values.map((v, i) => (
          <div key={i} style={{ display: 'flex', gap: 6 }}>
            <input value={v} onChange={e => { const n = [...values]; n[i] = e.target.value; onChange(n) }}
              style={{ ...inp, flex: 1 }} placeholder={`${label.slice(0,-1)} ${i + 1}`} />
            <button onClick={() => onChange(values.filter((_, j) => j !== i))}
              style={{ border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>×</button>
          </div>
        ))}
        <button onClick={() => onChange([...values, ''])}
          style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600, padding: 0 }}>
          {addLabel}
        </button>
      </div>
    </Row>
  )
}

// ── Main QuestionEditor ────────────────────────────────────────────────────────
export default function QuestionEditor({
  surveyId, question, onSave, onDelete, onCancel,
}: {
  surveyId: string
  question: QuestionData
  onSave: (q: QuestionData) => void
  onDelete: (id: string) => void
  onCancel: () => void
}) {
  const [type,    setType]    = useState(question.type)
  const [title,   setTitle]   = useState(question.title)
  const [required, setRequired] = useState(question.required)
  const [helpText, setHelpText] = useState(question.help_text ?? '')
  const [errMsg,   setErrMsg]   = useState(question.error_message ?? '')
  const [settings, setSettings] = useState<QuestionSettings>({
    options:    question.question_options?.map(o => o.label) ?? (HAS_OPTIONS.includes(question.type) ? ['Option 1', 'Option 2'] : undefined),
    items:      question.settings?.items ?? (HAS_ITEMS.includes(question.type) ? ['Item 1', 'Item 2', 'Item 3'] : undefined),
    rows:       question.settings?.rows ?? (HAS_MATRIX.includes(question.type) ? ['Row 1', 'Row 2'] : undefined),
    columns:    question.settings?.columns ?? (HAS_MATRIX.includes(question.type) ? ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] : undefined),
    min_selections: question.settings?.min_selections,
    max_selections: question.settings?.max_selections,
    scale_min:  question.settings?.scale_min ?? (type === 'nps' ? 0 : 1),
    scale_max:  question.settings?.scale_max ?? (type === 'nps' ? 10 : 5),
    label_min:  question.settings?.label_min ?? '',
    label_max:  question.settings?.label_max ?? '',
    follow_up_prompt: question.settings?.follow_up_prompt ?? '',
    placeholder: question.settings?.placeholder ?? '',
    input_type: question.settings?.input_type ?? 'text',
    validation_rule: question.settings?.validation_rule ?? '',
    char_limit: question.settings?.char_limit,
    yes_label:  question.settings?.yes_label ?? 'Yes',
    no_label:   question.settings?.no_label ?? 'No',
    order_direction: question.settings?.order_direction ?? 'highest_first',
    date_format: question.settings?.date_format ?? 'date',
    min_date:   question.settings?.min_date ?? '',
    max_date:   question.settings?.max_date ?? '',
  })
  const [saving, setSaving] = useState(false)

  const set = (patch: Partial<QuestionSettings>) => setSettings(s => ({ ...s, ...patch }))

  // When type changes, set sensible defaults
  const changeType = (t: string) => {
    setType(t)
    if (HAS_OPTIONS.includes(t) && !settings.options?.length) set({ options: ['Option 1', 'Option 2'] })
    if (t === 'yes_no')       set({ yes_label: settings.yes_label || 'Yes', no_label: settings.no_label || 'No' })
    if (t === 'nps')          set({ scale_min: 0, scale_max: 10, label_min: settings.label_min || 'Not at all likely', label_max: settings.label_max || 'Extremely likely' })
    if (t === 'rating')       set({ scale_min: 1, scale_max: 5, label_min: settings.label_min || 'Poor', label_max: settings.label_max || 'Excellent' })
    if (HAS_MATRIX.includes(t) && !settings.rows?.length) set({ rows: ['Row 1', 'Row 2'], columns: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] })
    if (HAS_ITEMS.includes(t) && !settings.items?.length) set({ items: ['Item 1', 'Item 2', 'Item 3'] })
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)

    // Save question fields
    const qPayload: Record<string, unknown> = {
      type, title: title.trim(), required,
      help_text: helpText || null,
      error_message: errMsg || null,
      settings: {
        ...settings,
        options: undefined, // options stored separately
      },
    }
    await fetch(`${API}/surveys/${surveyId}/questions/${question.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(qPayload),
    })

    // Save options (for choice/ranking/matrix types)
    const optionValues = HAS_OPTIONS.includes(type)
      ? (settings.options ?? []).filter(Boolean)
      : HAS_ITEMS.includes(type)
      ? (settings.items ?? []).filter(Boolean)
      : HAS_MATRIX.includes(type)
      ? (settings.rows ?? []).filter(Boolean)
      : null

    if (optionValues !== null) {
      await fetch(`${API}/surveys/${surveyId}/questions/${question.id}/options`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: optionValues }),
      })
    }

    // Matrix columns stored in settings (not options table)
    setSaving(false)
    onSave({ ...question, type, title: title.trim(), required, help_text: helpText, error_message: errMsg, settings })
  }

  const handleDelete = async () => {
    if (!confirm('Delete this question?')) return
    await fetch(`${API}/surveys/${surveyId}/questions/${question.id}`, { method: 'DELETE' })
    onDelete(question.id)
  }

  const s = settings

  return (
    <div style={{ background: 'white', border: '2px solid var(--accent)', borderRadius: 12, padding: 20, marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>Editing question</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleDelete} style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
          <button className="btn ghost" onClick={onCancel} style={{ fontSize: 12, padding: '5px 12px' }}>Cancel</button>
          <button className="btn" onClick={handleSave} disabled={!title.trim() || saving} style={{ fontSize: 12, padding: '5px 14px' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Question type */}
        <Row label="Question type">
          <select value={type} onChange={e => changeType(e.target.value)} style={{ ...inp, width: 'auto' }}>
            {QUESTION_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
          </select>
        </Row>

        {/* Question title */}
        <Row label="Question text *" hint="The question respondents will see.">
          <textarea value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Enter your question here…" rows={2}
            style={{ ...inp, resize: 'vertical' }} />
        </Row>

        {/* Common: required, help text, error message */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} />
            Required
          </label>
        </div>

        <Row label="Help text / caption" hint="Optional hint shown below the question.">
          <input value={helpText} onChange={e => setHelpText(e.target.value)}
            placeholder="e.g. Select all that apply" style={inp} />
        </Row>

        <Row label="Error / validation message" hint="Shown when validation fails.">
          <input value={errMsg} onChange={e => setErrMsg(e.target.value)}
            placeholder="e.g. Please select an option" style={inp} />
        </Row>

        {/* ── TYPE-SPECIFIC FIELDS ── */}

        {/* Single choice & Multi-select */}
        {HAS_OPTIONS.includes(type) && (
          <OptionsEditor label="Options" values={s.options ?? []} onChange={v => set({ options: v })} />
        )}
        {type === 'multi_select' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Row label="Min selections">
              <input type="number" min={0} value={s.min_selections ?? ''} onChange={e => set({ min_selections: e.target.value ? +e.target.value : undefined })} style={inp} placeholder="No minimum" />
            </Row>
            <Row label="Max selections">
              <input type="number" min={1} value={s.max_selections ?? ''} onChange={e => set({ max_selections: e.target.value ? +e.target.value : undefined })} style={inp} placeholder="No maximum" />
            </Row>
          </div>
        )}

        {/* Rating */}
        {type === 'rating' && (<>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Row label="Scale minimum"><input type="number" value={s.scale_min ?? 1} onChange={e => set({ scale_min: +e.target.value })} style={inp} /></Row>
            <Row label="Scale maximum"><input type="number" value={s.scale_max ?? 5} onChange={e => set({ scale_max: +e.target.value })} style={inp} /></Row>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Row label="Left label (low end)"><input value={s.label_min ?? ''} onChange={e => set({ label_min: e.target.value })} placeholder="e.g. Poor" style={inp} /></Row>
            <Row label="Right label (high end)"><input value={s.label_max ?? ''} onChange={e => set({ label_max: e.target.value })} placeholder="e.g. Excellent" style={inp} /></Row>
          </div>
        </>)}

        {/* NPS */}
        {type === 'nps' && (<>
          <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 12, color: 'var(--grey)' }}>
            NPS always uses a 0–10 scale (industry standard).
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Row label="Low end label"><input value={s.label_min ?? ''} onChange={e => set({ label_min: e.target.value })} placeholder="Not at all likely" style={inp} /></Row>
            <Row label="High end label"><input value={s.label_max ?? ''} onChange={e => set({ label_max: e.target.value })} placeholder="Extremely likely" style={inp} /></Row>
          </div>
          <Row label="Follow-up prompt" hint="Asked after the 0–10 score.">
            <input value={s.follow_up_prompt ?? ''} onChange={e => set({ follow_up_prompt: e.target.value })} placeholder="What's the main reason for your score?" style={inp} />
          </Row>
        </>)}

        {/* Short text */}
        {type === 'short_text' && (<>
          <Row label="Placeholder text"><input value={s.placeholder ?? ''} onChange={e => set({ placeholder: e.target.value })} placeholder="Type your answer…" style={inp} /></Row>
          <Row label="Input type">
            <select value={s.input_type ?? 'text'} onChange={e => set({ input_type: e.target.value as QuestionSettings['input_type'] })} style={{ ...inp, width: 'auto' }}>
              {['text', 'email', 'phone', 'number', 'url'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Row>
          <Row label="Validation rule" hint="Optional regex pattern, e.g. ^[A-Z]{2,4}$">
            <input value={s.validation_rule ?? ''} onChange={e => set({ validation_rule: e.target.value })} placeholder="Leave blank for no validation" style={inp} />
          </Row>
        </>)}

        {/* Long text */}
        {type === 'long_text' && (<>
          <Row label="Placeholder text"><input value={s.placeholder ?? ''} onChange={e => set({ placeholder: e.target.value })} placeholder="Type your answer…" style={inp} /></Row>
          <Row label="Character limit" hint="Leave blank for no limit.">
            <input type="number" min={1} value={s.char_limit ?? ''} onChange={e => set({ char_limit: e.target.value ? +e.target.value : undefined })} placeholder="e.g. 500" style={{ ...inp, width: 120 }} />
          </Row>
        </>)}

        {/* Yes / No */}
        {type === 'yes_no' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Row label="Yes label"><input value={s.yes_label ?? 'Yes'} onChange={e => set({ yes_label: e.target.value })} style={inp} /></Row>
            <Row label="No label"><input value={s.no_label ?? 'No'} onChange={e => set({ no_label: e.target.value })} style={inp} /></Row>
          </div>
        )}

        {/* Matrix / Likert */}
        {type === 'likert_matrix' && (<>
          <OptionsEditor label="Row labels" values={s.rows ?? []} onChange={v => set({ rows: v })} addLabel="+ Add row" />
          <OptionsEditor label="Column labels (scale points)" values={s.columns ?? []} onChange={v => set({ columns: v })} addLabel="+ Add column" />
        </>)}

        {/* Ranking */}
        {type === 'ranking' && (<>
          <OptionsEditor label="Items to rank" values={s.items ?? []} onChange={v => set({ items: v })} addLabel="+ Add item" />
          <Row label="Ranking order">
            <select value={s.order_direction ?? 'highest_first'} onChange={e => set({ order_direction: e.target.value as QuestionSettings['order_direction'] })} style={{ ...inp, width: 'auto' }}>
              <option value="highest_first">1 = Highest / Most important</option>
              <option value="lowest_first">1 = Lowest / Least important</option>
            </select>
          </Row>
        </>)}

        {/* Date / Time */}
        {type === 'date_time' && (<>
          <Row label="Format">
            <select value={s.date_format ?? 'date'} onChange={e => set({ date_format: e.target.value as QuestionSettings['date_format'] })} style={{ ...inp, width: 'auto' }}>
              <option value="date">Date only</option>
              <option value="time">Time only</option>
              <option value="datetime">Date and time</option>
            </select>
          </Row>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Row label="Min date / time"><input type={s.date_format === 'time' ? 'time' : 'date'} value={s.min_date ?? ''} onChange={e => set({ min_date: e.target.value })} style={inp} /></Row>
            <Row label="Max date / time"><input type={s.date_format === 'time' ? 'time' : 'date'} value={s.max_date ?? ''} onChange={e => set({ max_date: e.target.value })} style={inp} /></Row>
          </div>
        </>)}

      </div>
    </div>
  )
}

export { TYPE_LABEL, QUESTION_TYPES }
