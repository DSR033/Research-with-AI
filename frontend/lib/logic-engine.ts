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
  source_question: string
  target_question: string | null    // skip_to: single target
  target_questions: string[]        // hide / show_only: multiple targets
  condition: Condition
  action: Action
  position: number
}

export interface EvalQuestion {
  id: string
  position: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns the effective list of target IDs for a rule. */
function targets(rule: LogicRule): string[] {
  if (rule.action === 'skip_to') {
    return rule.target_question ? [rule.target_question] : []
  }
  // hide / show_only: prefer target_questions array, fall back to legacy single field
  const arr = Array.isArray(rule.target_questions) ? rule.target_questions : []
  if (arr.length) return arr
  return rule.target_question ? [rule.target_question] : []
}

// ── Condition evaluator ────────────────────────────────────────────────────────

function evalSimple(cond: SimpleCondition, answers: Record<string, string>): boolean {
  const raw    = answers[cond.question_id] ?? ''
  const answer = raw.toLowerCase().trim()
  const value  = (cond.value ?? '').toLowerCase().trim()
  const num    = parseFloat(raw)
  const numVal = parseFloat(cond.value ?? '')

  switch (cond.operator) {
    case 'answered':      return raw.length > 0
    case 'not_answered':  return raw.length === 0
    case 'equals':        return answer === value
    case 'not_equals':    return answer !== value
    case 'contains':      return answer.includes(value)
    case 'not_contains':  return !answer.includes(value)
    case 'greater_than':  return !isNaN(num) && !isNaN(numVal) && num > numVal
    case 'less_than':     return !isNaN(num) && !isNaN(numVal) && num < numVal
    case 'greater_equal': return !isNaN(num) && !isNaN(numVal) && num >= numVal
    case 'less_equal':    return !isNaN(num) && !isNaN(numVal) && num <= numVal
    default: return false
  }
}

export function evalCondition(cond: Condition, answers: Record<string, string>): boolean {
  if (cond.type === 'simple') return evalSimple(cond, answers)
  const results = cond.conditions.map(c => evalSimple(c, answers))
  return cond.logic === 'AND' ? results.every(Boolean) : results.some(Boolean)
}

// ── Classic mode: compute visible question IDs ─────────────────────────────────

export function visibleQuestions(
  questions: EvalQuestion[],
  rules: LogicRule[],
  answers: Record<string, string>
): string[] {
  const ordered = [...questions].sort((a, b) => a.position - b.position)
  const hidden  = new Set<string>()

  for (const rule of rules) {
    const met = evalCondition(rule.condition, answers)
    const tgts = targets(rule)

    if (rule.action === 'end_survey' && met) {
      const srcIdx = ordered.findIndex(q => q.id === rule.source_question)
      if (srcIdx !== -1) ordered.slice(srcIdx + 1).forEach(q => hidden.add(q.id))
      continue
    }

    for (const t of tgts) {
      if (rule.action === 'hide'      &&  met) hidden.add(t)
      if (rule.action === 'show_only' && !met) hidden.add(t)
    }
  }

  return ordered.filter(q => !hidden.has(q.id)).map(q => q.id)
}

// Sentinel returned when a logic rule terminates the respondent (screen-out)
export const LOGIC_TERMINATED = '__logic_terminated__'

// ── Conversational mode: next question after answering ─────────────────────────

export function nextQuestion(
  questions: EvalQuestion[],
  rules: LogicRule[],
  answers: Record<string, string>,
  currentQId: string
): string | null {
  const ordered = [...questions].sort((a, b) => a.position - b.position)
  const currentIdx = ordered.findIndex(q => q.id === currentQId)
  if (currentIdx === -1) return null

  // Check rules triggered by the current question (skip_to / end_survey)
  const applicable = rules.filter(r => r.source_question === currentQId)
  for (const rule of applicable) {
    const met = evalCondition(rule.condition, answers)
    if (!met) continue
    if (rule.action === 'end_survey') return LOGIC_TERMINATED
    if (rule.action === 'skip_to' && rule.target_question) return rule.target_question
  }

  // No skip fired — find next question that isn't hidden
  const hiddenSet = new Set<string>()
  for (const rule of rules) {
    const met = evalCondition(rule.condition, answers)
    for (const t of targets(rule)) {
      if (rule.action === 'hide'      &&  met) hiddenSet.add(t)
      if (rule.action === 'show_only' && !met) hiddenSet.add(t)
    }
  }

  for (let i = currentIdx + 1; i < ordered.length; i++) {
    if (!hiddenSet.has(ordered[i].id)) return ordered[i].id
  }
  return null
}
