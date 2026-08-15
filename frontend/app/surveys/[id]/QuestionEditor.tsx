'use client'
import { useState, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface QuestionSettings {
  // Common
  help_text?: string
  error_message?: string
  // Single / Multi choice / Dropdown options
  options?: string[]
  min_selections?: number
  max_selections?: number
  // Rating / Slider
  scale_min?: number
  scale_max?: number
  label_min?: string
  label_max?: string
  step?: number
  start_value?: number
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
  // Numeric Input
  numeric_type?: 'integer' | 'decimal'
  min_val?: number
  max_val?: number
  unit_label?: string
  // Constant Sum
  constant_items?: string[]
  constant_total?: number
  // Picture Choice
  image_options?: Array<{ label: string; image_url: string }>
  image_columns?: number
  allow_multiple?: boolean
  // Card Sort
  cards?: string[]
  sort_categories?: string[]
  // Pick, Group & Rank
  pg_items?: string[]
  pg_groups?: string[]
  pg_max_picks?: number
  // Drill-down
  drill_levels?: string[]
  drill_options?: Record<string, string[]>
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
  // Basic
  { type: 'single_choice',   label: '◉ Single Select' },
  { type: 'multi_select',    label: '☑ Multi Select' },
  { type: 'dropdown',        label: '▾ Dropdown' },
  { type: 'short_text',      label: '✎ Short Answer' },
  { type: 'long_text',       label: '📝 Long Text' },
  { type: 'numeric_input',   label: '# Number' },
  { type: 'email',           label: '✉ Email' },
  { type: 'date_time',       label: '📅 Date & Time' },
  { type: 'rating',          label: '★ Rating' },
  { type: 'nps',             label: '📊 NPS (0–10)' },
  { type: 'likert_matrix',   label: '▦ Likert Scale' },
  { type: 'yes_no',          label: '⬤ Yes / No' },
  // Advanced
  { type: 'matrix',          label: '⊟ Matrix / Grid' },
  { type: 'ranking',         label: '⇕ Ranking' },
  { type: 'constant_sum',    label: 'Σ Constant Sum' },
  { type: 'maxdiff',         label: '⤢ MaxDiff' },
  { type: 'conjoint',        label: '⊕ Conjoint Analysis' },
  { type: 'heatmap',         label: '🌡 Heatmap' },
  { type: 'picture_choice',  label: '🖼 Image Choice' },
  { type: 'image_upload',    label: '📷 Image Upload' },
  { type: 'file_upload',     label: '📎 File Upload' },
  { type: 'video_response',  label: '🎥 Video Response' },
  { type: 'audio_response',  label: '🎙 Audio Response' },
  { type: 'signature',       label: '✍ Signature' },
  { type: 'slider',          label: '⟷ Slider' },
  { type: 'barcode_scanner', label: '▣ Barcode / QR' },
  { type: 'map_location',    label: '📍 Map / Location' },
  { type: 'contact_form',    label: '👤 Contact Form' },
  // Legacy
  { type: 'card_sort',       label: '🃏 Card sort' },
  { type: 'pick_group_rank', label: '⊞ Pick, group & rank' },
  { type: 'drill_down',      label: '▶▶ Drill-down' },
  // Research
  { type: 'semantic_differential',  label: '↔ Semantic Differential' },
  { type: 'bipolar_scale',          label: '⟺ Bipolar Scale' },
  { type: 'side_by_side_matrix',    label: '⫧ Side-by-Side Matrix' },
  { type: 'multiple_rating_matrix', label: '⊞ Multiple Rating Matrix' },
  { type: 'kano_model',             label: '◎ Kano Model' },
  { type: 'best_worst_scaling',     label: '⊸ Best-Worst Scaling' },
  { type: 'turf_inputs',            label: '⊳ TURF Inputs' },
  { type: 'gap_analysis',           label: '⊿ Gap Analysis' },
  { type: 'demographic_block',      label: '👥 Demographic Block' },
  { type: 'screening_question',     label: '⊘ Screening Question' },
  { type: 'quota_question',         label: '⊙ Quota Question' },
  { type: 'randomized_block',       label: '⇄ Randomized Block' },
  // Multimedia
  { type: 'image_gallery',             label: '🖼 Image Gallery' },
  { type: 'video_embed',               label: '▶ Video Embed' },
  { type: 'audio_embed',               label: '♪ Audio Embed' },
  { type: 'interactive_image',         label: '⊕ Interactive Image' },
  { type: 'carousel',                  label: '↻ Carousel' },
  { type: 'flip_cards',                label: '⟳ Flip Cards' },
  { type: 'rich_text',                 label: 'T Rich Text' },
  { type: 'embedded_html',             label: '⟨⟩ Embedded HTML' },
  { type: 'website_embed',             label: '⊙ Website Embed' },
  { type: 'interactive_product_cards', label: '🛍 Product Cards' },
]

const TYPE_LABEL: Record<string, string> = Object.fromEntries(QUESTION_TYPES.map(t => [t.type, t.label]))

const HAS_OPTIONS   = ['single_choice', 'multi_select', 'dropdown']
const HAS_ITEMS     = ['ranking', 'constant_sum']
const HAS_MATRIX    = ['likert_matrix', 'matrix']
const CONSTANT_SUM_KEY = 'constant_items'

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
    items:      question.settings?.items ?? (question.type === 'ranking' ? ['Item 1', 'Item 2', 'Item 3'] : undefined),
    constant_items: question.settings?.constant_items ?? (question.type === 'constant_sum' ? ['Option 1', 'Option 2', 'Option 3'] : undefined),
    rows:       question.settings?.rows ?? (HAS_MATRIX.includes(question.type) ? ['Row 1', 'Row 2'] : undefined),
    columns:    question.settings?.columns ?? (HAS_MATRIX.includes(question.type) ? ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] : undefined),
    min_selections: question.settings?.min_selections,
    max_selections: question.settings?.max_selections,
    scale_min:  question.settings?.scale_min ?? (type === 'nps' ? 0 : type === 'slider' ? 0 : 1),
    scale_max:  question.settings?.scale_max ?? (type === 'nps' ? 10 : type === 'slider' ? 100 : 5),
    step:       question.settings?.step ?? 1,
    start_value: question.settings?.start_value ?? 50,
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
    numeric_type: question.settings?.numeric_type ?? 'integer',
    min_val:    question.settings?.min_val,
    max_val:    question.settings?.max_val,
    unit_label: question.settings?.unit_label ?? '',
    constant_total: question.settings?.constant_total ?? 100,
    // Picture choice
    image_options: question.settings?.image_options ?? (question.type === 'picture_choice' ? [{ label: 'Option 1', image_url: '' }, { label: 'Option 2', image_url: '' }] : undefined),
    image_columns: question.settings?.image_columns ?? 2,
    allow_multiple: question.settings?.allow_multiple ?? false,
    // Card sort
    cards: question.settings?.cards ?? (question.type === 'card_sort' ? ['Card 1', 'Card 2', 'Card 3'] : undefined),
    sort_categories: question.settings?.sort_categories ?? (question.type === 'card_sort' ? ['Category A', 'Category B'] : undefined),
    // Pick, group & rank
    pg_items: question.settings?.pg_items ?? (question.type === 'pick_group_rank' ? ['Item 1', 'Item 2', 'Item 3', 'Item 4'] : undefined),
    pg_groups: question.settings?.pg_groups ?? (question.type === 'pick_group_rank' ? ['Group A', 'Group B'] : undefined),
    pg_max_picks: question.settings?.pg_max_picks ?? 3,
    // Drill-down
    drill_levels: question.settings?.drill_levels ?? (question.type === 'drill_down' ? ['Level 1', 'Level 2'] : undefined),
    drill_options: question.settings?.drill_options ?? (question.type === 'drill_down' ? { 'Option A': ['Sub A1', 'Sub A2'], 'Option B': ['Sub B1', 'Sub B2'] } : undefined),
  })
  const [saving, setSaving] = useState(false)

  const set = (patch: Partial<QuestionSettings>) => setSettings(s => ({ ...s, ...patch }))

  // When type changes, set sensible defaults
  const changeType = (t: string) => {
    setType(t)
    if (HAS_OPTIONS.includes(t) && !settings.options?.length) set({ options: ['Option 1', 'Option 2'] })
    if (t === 'yes_no')        set({ yes_label: settings.yes_label || 'Yes', no_label: settings.no_label || 'No' })
    if (t === 'nps')           set({ scale_min: 0, scale_max: 10, label_min: settings.label_min || 'Not at all likely', label_max: settings.label_max || 'Extremely likely' })
    if (t === 'rating')        set({ scale_min: 1, scale_max: 5, label_min: settings.label_min || 'Poor', label_max: settings.label_max || 'Excellent' })
    if (t === 'slider')        set({ scale_min: 0, scale_max: 100, step: 1, start_value: 50 })
    if (t === 'numeric_input') set({ numeric_type: 'integer', unit_label: '' })
    if (t === 'constant_sum')  set({ constant_items: settings.constant_items?.length ? settings.constant_items : ['Option 1', 'Option 2', 'Option 3'], constant_total: 100 })
    if (HAS_MATRIX.includes(t) && !settings.rows?.length) set({ rows: ['Row 1', 'Row 2'], columns: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] })
    if (t === 'ranking' && !settings.items?.length) set({ items: ['Item 1', 'Item 2', 'Item 3'] })
    if (t === 'picture_choice' && !settings.image_options?.length)
      set({ image_options: [{ label: 'Option 1', image_url: '' }, { label: 'Option 2', image_url: '' }], image_columns: 2, allow_multiple: false })
    if (t === 'card_sort' && !settings.cards?.length)
      set({ cards: ['Card 1', 'Card 2', 'Card 3'], sort_categories: ['Category A', 'Category B'] })
    if (t === 'pick_group_rank' && !settings.pg_items?.length)
      set({ pg_items: ['Item 1', 'Item 2', 'Item 3', 'Item 4'], pg_groups: ['Group A', 'Group B'], pg_max_picks: 3 })
    if (t === 'drill_down' && !settings.drill_levels?.length)
      set({ drill_levels: ['Level 1', 'Level 2'], drill_options: { 'Option A': ['Sub A1', 'Sub A2'], 'Option B': ['Sub B1', 'Sub B2'] } })
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

    // Save options for choice/dropdown, ranking items, matrix rows, constant sum items
    const optionValues = HAS_OPTIONS.includes(type)
      ? (settings.options ?? []).filter(Boolean)
      : type === 'ranking'
      ? (settings.items ?? []).filter(Boolean)
      : type === 'constant_sum'
      ? (settings.constant_items ?? []).filter(Boolean)
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

        {/* ── DROPDOWN ── same as single choice with search note */}
        {type === 'dropdown' && (<>
          <OptionsEditor label="Options" values={s.options ?? []} onChange={v => set({ options: v })} />
          <div style={{ fontSize: 11, color: 'var(--grey)', padding: '6px 10px', background: 'var(--bg)', borderRadius: 6 }}>
            💡 Dropdown is ideal for long lists (10+ options). For short lists use Single Choice instead.
          </div>
        </>)}

        {/* ── SLIDER ── */}
        {type === 'slider' && (<>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Row label="Minimum"><input type="number" value={s.scale_min ?? 0} onChange={e => set({ scale_min: +e.target.value })} style={inp} /></Row>
            <Row label="Maximum"><input type="number" value={s.scale_max ?? 100} onChange={e => set({ scale_max: +e.target.value })} style={inp} /></Row>
            <Row label="Step size"><input type="number" min={1} value={s.step ?? 1} onChange={e => set({ step: +e.target.value })} style={inp} /></Row>
          </div>
          <Row label="Default start position" hint="Where the handle sits when the question first appears.">
            <input type="number" value={s.start_value ?? 50} onChange={e => set({ start_value: +e.target.value })} style={{ ...inp, width: 120 }} />
          </Row>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Row label="Left label (low end)"><input value={s.label_min ?? ''} onChange={e => set({ label_min: e.target.value })} placeholder="e.g. Not at all" style={inp} /></Row>
            <Row label="Right label (high end)"><input value={s.label_max ?? ''} onChange={e => set({ label_max: e.target.value })} placeholder="e.g. Completely" style={inp} /></Row>
          </div>
          {/* Live preview */}
          <Row label="Preview">
            <div style={{ padding: '12px 0' }}>
              <input type="range" min={s.scale_min ?? 0} max={s.scale_max ?? 100} step={s.step ?? 1} defaultValue={s.start_value ?? 50} style={{ width: '100%', accentColor: 'var(--accent)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>
                <span>{s.label_min || String(s.scale_min ?? 0)}</span>
                <span>{s.label_max || String(s.scale_max ?? 100)}</span>
              </div>
            </div>
          </Row>
        </>)}

        {/* ── NUMERIC INPUT ── */}
        {type === 'numeric_input' && (<>
          <Row label="Number type">
            <select value={s.numeric_type ?? 'integer'} onChange={e => set({ numeric_type: e.target.value as 'integer' | 'decimal' })} style={{ ...inp, width: 'auto' }}>
              <option value="integer">Integer (whole numbers only)</option>
              <option value="decimal">Decimal (allows fractions)</option>
            </select>
          </Row>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Row label="Min value"><input type="number" value={s.min_val ?? ''} onChange={e => set({ min_val: e.target.value ? +e.target.value : undefined })} placeholder="No minimum" style={inp} /></Row>
            <Row label="Max value"><input type="number" value={s.max_val ?? ''} onChange={e => set({ max_val: e.target.value ? +e.target.value : undefined })} placeholder="No maximum" style={inp} /></Row>
            <Row label="Unit label" hint="e.g. USD, kg, %"><input value={s.unit_label ?? ''} onChange={e => set({ unit_label: e.target.value })} placeholder="e.g. USD" style={inp} /></Row>
          </div>
          <Row label="Placeholder text"><input value={s.placeholder ?? ''} onChange={e => set({ placeholder: e.target.value })} placeholder="e.g. Enter amount" style={inp} /></Row>
        </>)}

        {/* ── CONSTANT SUM ── */}
        {type === 'constant_sum' && (<>
          <OptionsEditor
            label="Items to allocate"
            values={s.constant_items ?? []}
            onChange={v => set({ constant_items: v })}
            addLabel="+ Add item"
          />
          <Row label="Total must equal" hint="Respondents distribute this total across all items.">
            <input type="number" min={1} value={s.constant_total ?? 100} onChange={e => set({ constant_total: +e.target.value })}
              style={{ ...inp, width: 120 }} />
          </Row>
          <Row label="Unit label" hint="e.g. points, %, $, hours"><input value={s.unit_label ?? ''} onChange={e => set({ unit_label: e.target.value })} placeholder="e.g. points" style={inp} /></Row>
          <div style={{ fontSize: 11, color: 'var(--grey)', padding: '6px 10px', background: 'var(--bg)', borderRadius: 6 }}>
            💡 Best for budget allocation and importance weighting. Keep items to 7 or fewer.
          </div>
        </>)}

        {/* ── PICTURE CHOICE ── */}
        {type === 'picture_choice' && (<>
          <Row label="Layout">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={s.allow_multiple ?? false} onChange={e => set({ allow_multiple: e.target.checked })} />
                Allow multiple selections
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                Columns:&nbsp;
                <select value={s.image_columns ?? 2} onChange={e => set({ image_columns: +e.target.value })} style={{ ...inp, width: 80 }}>
                  {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>
          </Row>
          <Row label="Image options" hint="Enter a label and image URL for each option.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(s.image_options ?? []).map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input
                      value={opt.label}
                      onChange={e => { const n = [...(s.image_options ?? [])]; n[i] = { ...n[i], label: e.target.value }; set({ image_options: n }) }}
                      placeholder={`Label ${i + 1}`}
                      style={inp}
                    />
                    <input
                      value={opt.image_url}
                      onChange={e => { const n = [...(s.image_options ?? [])]; n[i] = { ...n[i], image_url: e.target.value }; set({ image_options: n }) }}
                      placeholder="https://example.com/image.png"
                      style={inp}
                    />
                    {opt.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={opt.image_url} alt={opt.label} style={{ height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                    )}
                  </div>
                  <button
                    onClick={() => set({ image_options: (s.image_options ?? []).filter((_, j) => j !== i) })}
                    style={{ border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>×</button>
                </div>
              ))}
              <button
                onClick={() => set({ image_options: [...(s.image_options ?? []), { label: '', image_url: '' }] })}
                style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600, padding: 0 }}>
                + Add image option
              </button>
            </div>
          </Row>
        </>)}

        {/* ── EMAIL ── */}
        {type === 'email' && (
          <div style={{ padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1d4ed8' }}>
            Email format is validated automatically. The respondent must enter a valid email address.
          </div>
        )}

        {/* ── MATRIX / GRID ── */}
        {type === 'matrix' && (<>
          <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#991b1b' }}>
            Multiple sub-questions share the same response scale. Reduces survey length and improves consistency.
          </div>
          <OptionsEditor label="Rows (sub-questions)" values={s.rows ?? ['Row 1', 'Row 2']} onChange={v => set({ rows: v })} addLabel="+ Add row" />
          <OptionsEditor label="Columns (scale)" values={s.columns ?? ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent']} onChange={v => set({ columns: v })} addLabel="+ Add column" />
        </>)}

        {/* ── IMAGE UPLOAD ── */}
        {type === 'image_upload' && (<>
          <Row label="Accepted formats" hint="Leave blank to accept all image types.">
            <input value={s.placeholder ?? 'JPG, PNG, GIF, WebP'} onChange={e => set({ placeholder: e.target.value })} style={inp} />
          </Row>
          <Row label="Max file size (MB)">
            <input type="number" min={1} max={50} value={s.max_val ?? 10} onChange={e => set({ max_val: +e.target.value })} style={{ ...inp, width: 120 }} />
          </Row>
        </>)}

        {/* ── FILE UPLOAD ── */}
        {type === 'file_upload' && (<>
          <Row label="Accepted file types" hint="e.g. PDF, DOCX, XLSX. Leave blank to accept any.">
            <input value={s.placeholder ?? 'PDF, DOCX, XLSX'} onChange={e => set({ placeholder: e.target.value })} style={inp} />
          </Row>
          <Row label="Max file size (MB)">
            <input type="number" min={1} max={100} value={s.max_val ?? 20} onChange={e => set({ max_val: +e.target.value })} style={{ ...inp, width: 120 }} />
          </Row>
        </>)}

        {/* ── SIGNATURE ── */}
        {type === 'signature' && (
          <div style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, color: '#166534', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontWeight: 600 }}>Digital signature capture</div>
            <div>Respondents draw their signature using mouse or touch. Saved as a PNG image.</div>
          </div>
        )}

        {/* ── CONTACT FORM ── */}
        {type === 'contact_form' && (<>
          <div style={{ padding: '8px 12px', background: '#fce7f3', border: '1px solid #fbcfe8', borderRadius: 8, fontSize: 12, color: '#9d174d' }}>
            Groups common contact fields into a structured block. Configure which fields to show.
          </div>
          {['First name', 'Last name', 'Email', 'Phone', 'Company', 'Job title', 'Address'].map(field => (
            <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked={['First name', 'Last name', 'Email'].includes(field)} />
              {field}
            </label>
          ))}
        </>)}

        {/* ── COMING SOON fallback ── */}
        {!['single_choice','multi_select','dropdown','short_text','long_text','numeric_input','email','date_time','rating','nps','likert_matrix','yes_no','matrix','ranking','constant_sum','picture_choice','image_upload','file_upload','signature','slider','contact_form','card_sort','pick_group_rank','drill_down'].includes(type) && (
          <div style={{ padding: '20px 16px', background: '#fafafa', border: '1.5px dashed #e4e4e7', borderRadius: 10, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 28 }}>🚧</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#18181b' }}>Coming Soon</div>
            <div style={{ fontSize: 12, color: '#71717a', maxWidth: 220 }}>
              The full editor for this question type is in development. The title and required setting are saved now.
            </div>
          </div>
        )}

        {/* ── CARD SORT ── */}
        {type === 'card_sort' && (<>
          <div style={{ padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1d4ed8' }}>
            Respondents drag each card into one of the categories you define below.
          </div>
          <OptionsEditor label="Cards" values={s.cards ?? []} onChange={v => set({ cards: v })} addLabel="+ Add card" />
          <OptionsEditor label="Categories" values={s.sort_categories ?? []} onChange={v => set({ sort_categories: v })} addLabel="+ Add category" />
        </>)}

        {/* ── PICK, GROUP & RANK ── */}
        {type === 'pick_group_rank' && (<>
          <div style={{ padding: '8px 12px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
            Step 1: respondents pick items. Step 2: drag them into groups. Step 3: rank within each group.
          </div>
          <OptionsEditor label="Items (pool)" values={s.pg_items ?? []} onChange={v => set({ pg_items: v })} addLabel="+ Add item" />
          <OptionsEditor label="Groups" values={s.pg_groups ?? []} onChange={v => set({ pg_groups: v })} addLabel="+ Add group" />
          <Row label="Max picks" hint="How many items the respondent must select in Step 1. Leave blank for all.">
            <input type="number" min={1} value={s.pg_max_picks ?? ''} onChange={e => set({ pg_max_picks: e.target.value ? +e.target.value : undefined })} placeholder="No limit" style={{ ...inp, width: 120 }} />
          </Row>
        </>)}

        {/* ── DRILL-DOWN ── */}
        {type === 'drill_down' && (<>
          <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, color: '#166534' }}>
            Cascading dropdowns — the second dropdown's options depend on the first selection.
          </div>
          <Row label="Level labels" hint="Name each dropdown level (e.g. Country, State, City).">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(s.drill_levels ?? []).map((lv, i) => (
                <div key={i} style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={lv}
                    onChange={e => { const n = [...(s.drill_levels ?? [])]; n[i] = e.target.value; set({ drill_levels: n }) }}
                    placeholder={`Level ${i + 1} label`}
                    style={{ ...inp, flex: 1 }}
                  />
                  {(s.drill_levels ?? []).length > 2 && (
                    <button onClick={() => set({ drill_levels: (s.drill_levels ?? []).filter((_, j) => j !== i) })}
                      style={{ border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>×</button>
                  )}
                </div>
              ))}
              {(s.drill_levels ?? []).length < 4 && (
                <button onClick={() => set({ drill_levels: [...(s.drill_levels ?? []), `Level ${(s.drill_levels ?? []).length + 1}`] })}
                  style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600, padding: 0 }}>
                  + Add level (max 4)
                </button>
              )}
            </div>
          </Row>
          <Row label="Top-level options & their sub-options" hint="For each top-level choice, list the sub-options (comma-separated).">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(s.drill_options ?? {}).map(([parent, children]) => (
                <div key={parent} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      value={parent}
                      onChange={e => {
                        const updated: Record<string, string[]> = {}
                        Object.entries(s.drill_options ?? {}).forEach(([k, v]) => { updated[k === parent ? e.target.value : k] = v })
                        set({ drill_options: updated })
                      }}
                      placeholder="Parent option"
                      style={{ ...inp, flex: 1, fontWeight: 600 }}
                    />
                    <button
                      onClick={() => { const updated = { ...s.drill_options }; delete updated[parent]; set({ drill_options: updated }) }}
                      style={{ border: 'none', background: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>×</button>
                  </div>
                  <input
                    value={children.join(', ')}
                    onChange={e => set({ drill_options: { ...s.drill_options, [parent]: e.target.value.split(',').map(x => x.trim()).filter(Boolean) } })}
                    placeholder="Sub A1, Sub A2, Sub A3"
                    style={inp}
                  />
                  <div style={{ fontSize: 11, color: 'var(--grey)' }}>Comma-separated sub-options for "{parent}"</div>
                </div>
              ))}
              <button
                onClick={() => set({ drill_options: { ...(s.drill_options ?? {}), [`Option ${Object.keys(s.drill_options ?? {}).length + 1}`]: [] } })}
                style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600, padding: 0 }}>
                + Add parent option
              </button>
            </div>
          </Row>
        </>)}

      </div>
    </div>
  )
}

export { TYPE_LABEL, QUESTION_TYPES }
