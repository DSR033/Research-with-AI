// Pure logic evaluator — no side effects, no API calls.

export type Operator =
  | 'equals' | 'not_equals' | 'contains' | 'not_contains'
  | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal'
  | 'answered' | 'not_answered'

export type Action = 'skip_to' | 'hide' | 'show_only' | 'end_survey'

export interface SimpleCondition {
  type: 'simple'
  question_id: string
  operator: Operator
  value?: string
}

export interface CompoundCondition {
  type: 'compound'
  logic: 'AND' | 'OR'
  conditions: SimpleCondition[]
}

export type Condition = SimpleCondition | CompoundCondition

export interface LogicRule {
  id: string
  survey_id: string
  source_question: string        // question whose answer triggers evaluation
  target_question: string | null // question to skip to / hide / show
  condition: Condition
  action: Action
  position: number
}

export interface EvalQuestion {
  id: string
  position: number
}

// ── Condition evaluator ────────────────────────────────────────────────────────

function evalSimple(cond: SimpleCondition, answers: Record<string, string>): boolean {
  const raw = answers[cond.question_id] ?? ''
  const answer = raw.toLowerCase().trim()
  const value  = (cond.value ?? '').toLowerCase().trim()
  const num    = parseFloat(raw)
  const numVal = parseFloat(cond.value ?? '')

  switch (cond.operator) {
    case 'answered':     return raw.length > 0
    case 'not_answered': return raw.length === 0
    case 'equals':       return answer === value
    case 'not_equals':   return answer !== value
    case 'contains':     return answer.includes(value)
    case 'not_contains': return !answer.includes(value)
    case 'greater_than':   return !isNaN(num) && !isNaN(numVal) && num > numVal
    case 'less_than':      return !isNaN(num) && !isNaN(numVal) && num < numVal
    case 'greater_equal':  return !isNaN(num) && !isNaN(numVal) && num >= numVal
    case 'less_equal':     return !isNaN(num) && !isNaN(numVal) && num <= numVal
    default: return false
  }
}

export function evalCondition(cond: Condition, answers: Record<string, string>): boolean {
  if (cond.type === 'simple') return evalSimple(cond, answers)
  const results = cond.conditions.map(c => evalSimple(c, answers))
  return cond.logic === 'AND' ? results.every(Boolean) : results.some(Boolean)
}

// ── Classic mode: compute visible question IDs ─────────────────────────────────
// Returns ordered array of question IDs that should be rendered in the form.

export function visibleQuestions(
  questions: EvalQuestion[],
  rules: LogicRule[],
  answers: Record<string, string>
): string[] {
  const ordered = [...questions].sort((a, b) => a.position - b.position)
  const hidden  = new Set<string>()
  const showOnly = new Set<string>()   // if non-empty, only these are shown

  for (const rule of rules) {
    const met = evalCondition(rule.condition, answers)
    if (!rule.target_question) continue

    if (rule.action === 'hide' && met)       hidden.add(rule.target_question)
    if (rule.action === 'show_only' && !met) hidden.add(rule.target_question)
    if (rule.action === 'end_survey' && met) {
      // hide everything after source question
      const srcIdx = ordered.findIndex(q => q.id === rule.source_question)
      if (srcIdx !== -1) ordered.slice(srcIdx + 1).forEach(q => hidden.add(q.id))
    }
  }

  return ordered.filter(q => !hidden.has(q.id)).map(q => q.id)
}

// ── Conversational mode: next question after answering ─────────────────────────
// Returns next question ID, or null to end the survey.

export function nextQuestion(
  questions: EvalQuestion[],
  rules: LogicRule[],
  answers: Record<string, string>,   // includes the answer just given
  currentQId: string
): string | null {
  const ordered = [...questions].sort((a, b) => a.position - b.position)
  const currentIdx = ordered.findIndex(q => q.id === currentQId)
  if (currentIdx === -1) return null

  // Evaluate rules triggered by the current question
  const applicable = rules.filter(r => r.source_question === currentQId)
  for (const rule of applicable) {
    const met = evalCondition(rule.condition, answers)
    if (!met) continue

    if (rule.action === 'end_survey') return null
    if (rule.action === 'skip_to' && rule.target_question) {
      return rule.target_question
    }
  }

  // No skip rule fired — find the next visible question
  const hiddenSet = new Set<string>()
  for (const rule of rules) {
    if (!rule.target_question) continue
    if ((rule.action === 'hide' || rule.action === 'show_only')) {
      const met = evalCondition(rule.condition, answers)
      if (rule.action === 'hide'      &&  met) hiddenSet.add(rule.target_question)
      if (rule.action === 'show_only' && !met) hiddenSet.add(rule.target_question)
    }
  }

  for (let i = currentIdx + 1; i < ordered.length; i++) {
    if (!hiddenSet.has(ordered[i].id)) return ordered[i].id
  }
  return null
}
