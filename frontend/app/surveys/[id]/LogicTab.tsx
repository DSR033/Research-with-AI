'use client'
import { useState, useEffect, useCallback } from 'react'
import type { LogicRule, Condition, SimpleCondition, Operator, Action } from '../../../lib/logic-engine'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Question { id: string; title: string; type: string; position: number }

const OPERATORS: { value: Operator; label: string; forTypes: string[] }[] = [
  { value: 'equals',       label: 'equals',             forTypes: ['all'] },
  { value: 'not_equals',   label: 'does not equal',     forTypes: ['all'] },
  { value: 'contains',     label: 'contains',           forTypes: ['text'] },
  { value: 'not_contains', label: 'does not contain',   forTypes: ['text'] },
  { value: 'greater_than', label: 'is greater than',    forTypes: ['numeric'] },
  { value: 'less_than',    label: 'is less than',       forTypes: ['numeric'] },
  { value: 'greater_equal',label: 'is ≥',               forTypes: ['numeric'] },
  { value: 'less_equal',   label: 'is ≤',               forTypes: ['numeric'] },
  { value: 'answered',     label: 'is answered',        forTypes: ['all'] },
  { value: 'not_answered', label: 'is not answered',    forTypes: ['all'] },
]

const ACTIONS: { value: Action; label: string }[] = [
  { value: 'skip_to',    label: 'Skip to' },
  { value: 'hide',       label: 'Hide question' },
  { value: 'show_only',  label: 'Show question only if' },
  { value: 'end_survey', label: 'End survey' },
]

const TEXT_TYPES    = ['short_text', 'long_text']
const NUMERIC_TYPES = ['rating', 'nps', 'likert_matrix']

function qTypeGroup(type: string): string {
  if (TEXT_TYPES.includes(type))    return 'text'
  if (NUMERIC_TYPES.includes(type)) return 'numeric'
  return 'all'
}

function availableOperators(q: Question | undefined) {
  if (!q) return OPERATORS.filter(o => o.forTypes.includes('all'))
  const group = qTypeGroup(q.type)
  return OPERATORS.filter(o => o.forTypes.includes('all') || o.forTypes.includes(group))
}

function needsValue(op: Operator): boolean {
  return !['answered', 'not_answered'].includes(op)
}

function needsTarget(action: Action): boolean {
  return action !== 'end_survey'
}

// ── blank rule factory ────────────────────────────────────────────────────────
function blankRule(surveyId: string, sourceId: string): Omit<LogicRule, 'id'> {
  return {
    survey_id: surveyId,
    source_question: sourceId,
    target_question: null,
    condition: { type: 'simple', question_id: sourceId, operator: 'equals', value: '' },
    action: 'skip_to',
    position: 0,
  }
}

// ── RuleEditor ────────────────────────────────────────────────────────────────
function RuleEditor({
  rule, questions, surveyId, onSave, onCancel, onDelete,
}: {
  rule: Partial<LogicRule> & { survey_id: string }
  questions: Question[]
  surveyId: string
  onSave: (r: Partial<LogicRule>) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [draft, setDraft] = useState<Partial<LogicRule>>({ ...rule })
  const cond = draft.condition ?? { type: 'simple', question_id: '', operator: 'equals' as Operator, value: '' }
  const isCompound = cond.type === 'compound'
  const [saving, setSaving] = useState(false)

  const srcQ    = questions.find(q => q.id === (isCompound ? undefined : (cond as SimpleCondition).question_id))
  const ops     = availableOperators(srcQ)

  function setSimple(patch: Partial<SimpleCondition>) {
    setDraft(d => ({ ...d, condition: { ...cond, type: 'simple', ...(cond.type === 'simple' ? cond : {}), ...patch } as Condition }))
  }

  function setCompoundLogic(logic: 'AND' | 'OR') {
    if (cond.type !== 'compound') return
    setDraft(d => ({ ...d, condition: { ...cond, logic } }))
  }

  function addCompoundCond() {
    if (cond.type !== 'compound') return
    setDraft(d => ({
      ...d,
      condition: {
        ...cond,
        conditions: [...cond.conditions, { type: 'simple', question_id: questions[0]?.id ?? '', operator: 'equals' as Operator, value: '' }],
      },
    }))
  }

  function updateCompoundCond(i: number, patch: Partial<SimpleCondition>) {
    if (cond.type !== 'compound') return
    const updated = cond.conditions.map((c, idx) => idx === i ? { ...c, ...patch } : c)
    setDraft(d => ({ ...d, condition: { ...cond, conditions: updated } }))
  }

  function removeCompoundCond(i: number) {
    if (cond.type !== 'compound') return
    setDraft(d => ({ ...d, condition: { ...cond, conditions: cond.conditions.filter((_, idx) => idx !== i) } }))
  }

  function switchToCompound() {
    const first: SimpleCondition = cond.type === 'simple'
      ? { ...cond }
      : { type: 'simple', question_id: questions[0]?.id ?? '', operator: 'equals', value: '' }
    setDraft(d => ({ ...d, condition: { type: 'compound', logic: 'AND', conditions: [first] } }))
  }

  function switchToSimple() {
    if (cond.type !== 'compound') return
    const first = cond.conditions[0] ?? { type: 'simple', question_id: questions[0]?.id ?? '', operator: 'equals' as Operator, value: '' }
    setDraft(d => ({ ...d, condition: { ...first, type: 'simple' } }))
  }

  const canSave = draft.action && (draft.action === 'end_survey' || draft.target_question)

  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 18, marginBottom: 12 }}>

      {/* Condition section */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase' }}>When</div>
          <button
            onClick={isCompound ? switchToSimple : switchToCompound}
            style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            {isCompound ? '→ Simple condition' : '+ Add compound (AND/OR)'}
          </button>
        </div>

        {!isCompound && (
          <ConditionRow
            cond={cond as SimpleCondition}
            questions={questions}
            ops={ops}
            onChange={setSimple}
          />
        )}

        {isCompound && cond.type === 'compound' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {(['AND', 'OR'] as const).map(l => (
                <button key={l} onClick={() => setCompoundLogic(l)} style={{
                  padding: '4px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  background: cond.logic === l ? 'var(--accent)' : 'var(--bg)',
                  color: cond.logic === l ? 'white' : 'var(--grey)',
                }}>{l}</button>
              ))}
              <span style={{ fontSize: 12, color: 'var(--grey)', alignSelf: 'center', marginLeft: 4 }}>
                {cond.logic === 'AND' ? 'All conditions must be true' : 'Any condition must be true'}
              </span>
            </div>
            {cond.conditions.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                {i > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', paddingTop: 10, width: 28, flexShrink: 0 }}>{cond.logic}</div>}
                {i === 0 && <div style={{ width: 28, flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <ConditionRow
                    cond={c}
                    questions={questions}
                    ops={availableOperators(questions.find(q => q.id === c.question_id))}
                    onChange={patch => updateCompoundCond(i, patch)}
                  />
                </div>
                <button onClick={() => removeCompoundCond(i)} style={{ fontSize: 16, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', paddingTop: 6 }}>×</button>
              </div>
            ))}
            <button onClick={addCompoundCond} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              + Add condition
            </button>
          </div>
        )}
      </div>

      {/* Action section */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', marginBottom: 10 }}>Then</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={draft.action ?? 'skip_to'}
            onChange={e => setDraft(d => ({ ...d, action: e.target.value as Action, target_question: e.target.value === 'end_survey' ? null : d.target_question }))}
            style={selStyle}
          >
            {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>

          {needsTarget(draft.action ?? 'skip_to') && (
            <select
              value={draft.target_question ?? ''}
              onChange={e => setDraft(d => ({ ...d, target_question: e.target.value || null }))}
              style={selStyle}
            >
              <option value="">— select question —</option>
              {questions.map((q, i) => (
                <option key={q.id} value={q.id}>Q{i + 1}: {q.title.slice(0, 40)}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div>
          {onDelete && (
            <button onClick={onDelete} style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Delete rule
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost" onClick={onCancel} style={{ fontSize: 13, padding: '7px 14px' }}>Cancel</button>
          <button
            className="btn"
            disabled={!canSave || saving}
            onClick={async () => { setSaving(true); await onSave(draft); setSaving(false) }}
            style={{ fontSize: 13, padding: '7px 14px' }}
          >
            {saving ? 'Saving…' : 'Save rule'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConditionRow({ cond, questions, ops, onChange }: {
  cond: SimpleCondition
  questions: Question[]
  ops: typeof OPERATORS
  onChange: (p: Partial<SimpleCondition>) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <select value={cond.question_id} onChange={e => onChange({ question_id: e.target.value })} style={selStyle}>
        <option value="">— question —</option>
        {questions.map((q, i) => <option key={q.id} value={q.id}>Q{i + 1}: {q.title.slice(0, 40)}</option>)}
      </select>
      <select value={cond.operator} onChange={e => onChange({ operator: e.target.value as Operator })} style={{ ...selStyle, minWidth: 160 }}>
        {ops.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {needsValue(cond.operator) && (
        <input
          value={cond.value ?? ''}
          onChange={e => onChange({ value: e.target.value })}
          placeholder="value"
          style={{ ...selStyle, minWidth: 100 }}
        />
      )}
    </div>
  )
}

const selStyle: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px',
  fontSize: 13, fontFamily: 'inherit', background: 'white', outline: 'none',
}

// ── Saved rule display ─────────────────────────────────────────────────────────
function RuleCard({ rule, questions, onEdit }: { rule: LogicRule; questions: Question[]; onEdit: () => void }) {
  function describeCondition(cond: Condition): string {
    if (cond.type === 'simple') {
      const q = questions.find(q => q.id === cond.question_id)
      const qLabel = q ? `Q${questions.indexOf(q) + 1}` : '?'
      const op = OPERATORS.find(o => o.value === cond.operator)?.label ?? cond.operator
      const val = needsValue(cond.operator) ? ` "${cond.value}"` : ''
      return `${qLabel} ${op}${val}`
    }
    const parts = cond.conditions.map(c => {
      const q = questions.find(q => q.id === c.question_id)
      const qLabel = q ? `Q${questions.indexOf(q) + 1}` : '?'
      const op = OPERATORS.find(o => o.value === c.operator)?.label ?? c.operator
      const val = needsValue(c.operator) ? ` "${c.value}"` : ''
      return `${qLabel} ${op}${val}`
    })
    return parts.join(` ${cond.logic} `)
  }

  function describeAction(): string {
    if (rule.action === 'end_survey') return 'end the survey'
    const tq = questions.find(q => q.id === rule.target_question)
    const tLabel = tq ? `Q${questions.indexOf(tq) + 1}: "${tq.title.slice(0, 30)}"` : '?'
    const a = ACTIONS.find(a => a.value === rule.action)?.label ?? rule.action
    return `${a} ${tLabel}`
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 8 }}>
      <div style={{ fontSize: 13 }}>
        <span style={{ color: 'var(--grey)', marginRight: 6 }}>If</span>
        <strong>{describeCondition(rule.condition)}</strong>
        <span style={{ color: 'var(--grey)', margin: '0 6px' }}>→</span>
        <strong style={{ color: 'var(--accent)' }}>{describeAction()}</strong>
      </div>
      <button onClick={onEdit} style={{ fontSize: 12, color: 'var(--grey)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>
        Edit
      </button>
    </div>
  )
}

// ── Main LogicTab ─────────────────────────────────────────────────────────────
export default function LogicTab({ surveyId, questions }: { surveyId: string; questions: Question[] }) {
  const [rules, setRules]         = useState<LogicRule[]>([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState<string | 'new' | null>(null)
  const [newSource, setNewSource] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`${API}/surveys/${surveyId}/logic`)
    if (r.ok) setRules(await r.json())
    setLoading(false)
  }, [surveyId])

  useEffect(() => { load() }, [load])

  const sorted = questions.slice().sort((a, b) => a.position - b.position)

  const saveRule = async (draft: Partial<LogicRule>) => {
    if (editing === 'new') {
      await fetch(`${API}/surveys/${surveyId}/logic`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, position: rules.length }),
      })
    } else if (editing) {
      await fetch(`${API}/surveys/${surveyId}/logic/${editing}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
    }
    setEditing(null)
    await load()
  }

  const deleteRule = async (id: string) => {
    if (!confirm('Delete this rule?')) return
    await fetch(`${API}/surveys/${surveyId}/logic/${id}`, { method: 'DELETE' })
    setEditing(null)
    await load()
  }

  const orderedBySource: Record<string, LogicRule[]> = {}
  for (const rule of rules) {
    orderedBySource[rule.source_question] = [...(orderedBySource[rule.source_question] ?? []), rule]
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>Logic & Flow Control</h2>
          <div style={{ fontSize: 12.5, color: 'var(--grey)' }}>Rules are evaluated in order after each answer.</div>
        </div>
        {editing !== 'new' && (
          <button className="btn" onClick={() => { setEditing('new'); setNewSource(sorted[0]?.id ?? '') }} style={{ fontSize: 13 }}>
            + Add Rule
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ color: 'var(--grey)', fontSize: 13, padding: '16px 0' }}>Loading…</div>
      ) : (
        <>
          {/* New rule form */}
          {editing === 'new' && (
            <RuleEditor
              rule={{ ...blankRule(surveyId, newSource || sorted[0]?.id || ''), source_question: newSource || sorted[0]?.id || '' }}
              questions={sorted}
              surveyId={surveyId}
              onSave={saveRule}
              onCancel={() => setEditing(null)}
            />
          )}

          {/* Existing rules grouped by source question */}
          {rules.length === 0 && editing !== 'new' ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--grey)', fontSize: 13 }}>
              No logic rules yet. Click <strong>+ Add Rule</strong> to create your first condition.
            </div>
          ) : sorted.map(q => {
            const qRules = orderedBySource[q.id] ?? []
            if (!qRules.length) return null
            return (
              <div key={q.id} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--grey)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Q{sorted.indexOf(q) + 1}: {q.title.slice(0, 50)}{q.title.length > 50 ? '…' : ''}
                </div>
                {qRules.map(rule => (
                  editing === rule.id ? (
                    <RuleEditor
                      key={rule.id}
                      rule={rule}
                      questions={sorted}
                      surveyId={surveyId}
                      onSave={saveRule}
                      onCancel={() => setEditing(null)}
                      onDelete={() => deleteRule(rule.id)}
                    />
                  ) : (
                    <RuleCard key={rule.id} rule={rule} questions={sorted} onEdit={() => setEditing(rule.id)} />
                  )
                ))}
              </div>
            )
          })}

          {/* Help */}
          {rules.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--grey)', marginTop: 8, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8 }}>
              💡 Rules are enforced live in both classic (form) and conversational respondent modes.
              <strong> Skip to</strong> jumps ahead in conversational mode. <strong>Hide / Show only if</strong> work in both modes.
            </div>
          )}
        </>
      )}
    </div>
  )
}
