'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { visibleQuestions, nextQuestion } from '../../../../lib/logic-engine'
import type { LogicRule } from '../../../../lib/logic-engine'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface QuestionSettings {
  help_text?: string
  error_message?: string
  options?: string[]
  min_selections?: number
  max_selections?: number
  scale_min?: number
  scale_max?: number
  label_min?: string
  label_max?: string
  follow_up_prompt?: string
  placeholder?: string
  input_type?: string
  validation_rule?: string
  char_limit?: number
  yes_label?: string
  no_label?: string
  rows?: string[]
  columns?: string[]
  items?: string[]
  order_direction?: string
  date_format?: string
  min_date?: string
  max_date?: string
}

interface Question {
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

interface SurveySettings {
  require_response?: boolean
  no_duplicates?: boolean
  randomize?: boolean
}

interface Survey {
  id: string
  title: string
  mode: string
  status: string
  close_date?: string | null
  response_limit?: number | null
  settings?: SurveySettings
  questions?: Question[]
}

interface Message {
  id: string
  role: 'bot' | 'user'
  text: string
  isAiFollowup?: boolean
}

interface Answer {
  question_id: string
  value: { text?: string; choice?: string; number?: number; options?: string[] }
}

// ─── Respondent ID (localStorage, per-survey duplicate detection) ─────────────
function getRespondentId(surveyId: string): string {
  const key = `respondent_${surveyId}`
  let rid = typeof window !== 'undefined' ? localStorage.getItem(key) : null
  if (!rid) {
    rid = `r_${Date.now()}_${Math.random().toString(36).slice(2)}`
    if (typeof window !== 'undefined') localStorage.setItem(key, rid)
  }
  return rid
}

function markResponded(surveyId: string) {
  if (typeof window !== 'undefined')
    localStorage.setItem(`responded_${surveyId}`, '1')
}

function hasResponded(surveyId: string): boolean {
  return typeof window !== 'undefined'
    ? localStorage.getItem(`responded_${surveyId}`) === '1'
    : false
}

// ─── Gate screen ──────────────────────────────────────────────────────────────
function SurveyGate({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', gap: 12, padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: 16 }}>{title}</div>
      <div style={{ color: 'var(--grey)', fontSize: 13, maxWidth: 320 }}>{desc}</div>
    </div>
  )
}

// ─── Type helpers ────────────────────────────────────────────────────────────
function hasOptions(type: string) {
  return ['single_choice', 'multi_select', 'dropdown', 'yes_no', 'ranking'].includes(type)
}
function isScale(type: string) {
  return type === 'nps'
}
function isRating(type: string) {
  return type === 'rating'
}
function isText(type: string) {
  return ['short_text', 'long_text', 'date_time', 'contact', 'demographic'].includes(type)
}

export default function RespondPage() {
  const params = useParams()
  const id = params.id as string

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [logicRules, setLogicRules] = useState<LogicRule[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'classic' | 'conversational'>('conversational')
  const [branding, setBranding] = useState({ brand_color: '#2E5BFF', logo_url: null as string | null, org_name: 'SurveyAI' })

  useEffect(() => {
    Promise.all([
      fetch(`${API}/surveys/${id}`).then(r => r.json()),
      fetch(`${API}/surveys/${id}/logic`).then(r => r.json()).catch(() => []),
      fetch(`${API}/surveys/${id}/branding`).then(r => r.json()).catch(() => null),
    ]).then(([data, rules, brand]) => {
      if (brand) setBranding(brand)
      setSurvey(data)
      let qs: Question[] = (data.questions || []).sort(
        (a: Question, b: Question) => a.position - b.position
      )
      // Randomize if configured
      if (data.settings?.randomize) {
        qs = [...qs].sort(() => Math.random() - 0.5)
      }
      // Mark all required if require_response is on
      if (data.settings?.require_response) {
        qs = qs.map((q: Question) => ({ ...q, required: true }))
      }
      setQuestions(qs)
      setLogicRules(rules ?? [])
      setMode(data.mode === 'conversational' ? 'conversational' : 'classic')
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--grey)' }}>
        Loading survey…
      </div>
    )
  }

  if (!survey || survey.status === 'draft') {
    return <SurveyGate icon="🔒" title="This survey isn't available yet" desc="It may not be published, or the link may be incorrect." />
  }

  // Close date enforcement
  if (survey.close_date && new Date(survey.close_date) < new Date()) {
    return <SurveyGate icon="📅" title="This survey has closed" desc="The submission window for this survey has ended." />
  }

  // Duplicate submission gate (client-side fast path)
  if (survey.settings?.no_duplicates && hasResponded(id)) {
    return <SurveyGate icon="✅" title="Already submitted" desc="You've already completed this survey. Thank you for your response!" />
  }

  if (questions.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', gap: 12 }}>
        <div style={{ fontSize: 40 }}>📋</div>
        <div style={{ fontWeight: 600, fontSize: 16 }}>This survey has no questions yet</div>
      </div>
    )
  }

  if (mode === 'conversational') {
    return <ConversationalMode survey={survey} questions={questions} rules={logicRules} branding={branding} />
  }
  return <ClassicMode survey={survey} questions={questions} rules={logicRules} branding={branding} />
}

// ─── CONVERSATIONAL MODE ──────────────────────────────────────────────────────
interface Branding { brand_color: string; logo_url: string | null; org_name: string }

function ConversationalMode({ survey, questions, rules, branding }: { survey: Survey; questions: Question[]; rules: LogicRule[]; branding: Branding }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [qIndex, setQIndex] = useState(-1) // -1 = not started yet
  const [inputDisabled, setInputDisabled] = useState(false)
  const [done, setDone] = useState(false)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({})
  const [starHover, setStarHover] = useState(0)
  const [textVal, setTextVal] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  const addMsg = (text: string, role: 'bot' | 'user') => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, role, text }])
    setTimeout(scrollToBottom, 50)
  }

  const showTypingThen = (cb: () => void, delay = 900) => {
    setInputDisabled(true)
    const id = `typing-${Date.now()}`
    setMessages(prev => [...prev, { id, role: 'bot', text: '__typing__' }])
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== id))
      cb()
      setInputDisabled(false)
    }, delay)
  }

  // Start: greet then ask Q0
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    showTypingThen(() => {
      addMsg(`Hi! I have a few quick questions for you about "${survey.title}". Let's get started. 🙂`, 'bot')
      setTimeout(() => {
        showTypingThen(() => {
          addMsg(questions[0].title, 'bot')
          setQIndex(0)
        })
      }, 400)
    }, 800)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submitAnswer = async (value: string, numericValue?: number) => {
    if (inputDisabled) return
    addMsg(value, 'user')
    setTextVal('')

    const q = questions[qIndex]
    const answer: Answer = {
      question_id: q.id,
      value: numericValue !== undefined
        ? { number: numericValue }
        : hasOptions(q.type)
        ? { choice: value }
        : { text: value },
    }
    const newAnswers = [...answers, answer]
    setAnswers(newAnswers)

    // Build flat answer map for the logic engine
    const newMap = { ...answerMap, [q.id]: value }
    setAnswerMap(newMap)

    // Use logic engine to find next question
    const nextId = nextQuestion(questions, rules, newMap, q.id)
    if (nextId === null) {
      finishSurvey(newAnswers)
      return
    }
    const nextQ = questions.find(qi => qi.id === nextId)
    if (!nextQ) { finishSurvey(newAnswers); return }
    const nextIdx = questions.indexOf(nextQ)

    showTypingThen(() => {
      addMsg(nextQ.title, 'bot')
      setQIndex(nextIdx)
    })
  }



  const finishSurvey = async (finalAnswers: Answer[]) => {
    setInputDisabled(true)
    const respondentId = getRespondentId(survey.id)
    try {
      const res = await fetch(`${API}/surveys/${survey.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'complete', answers: finalAnswers, respondent_id: respondentId }),
      })
      if (!res.ok) {
        const err = await res.json()
        showTypingThen(() => {
          setMessages(prev => [...prev, { id: 'err', role: 'bot', text: `⚠️ ${err.detail ?? 'Submission failed.'}` }])
          setDone(true)
        }, 400)
        return
      }
      markResponded(survey.id)
    } catch (_) {}
    showTypingThen(() => { setDone(true) }, 700)
  }

  const progress = qIndex < 0 ? 0 : Math.round((qIndex / questions.length) * 100)
  const currentQ = qIndex >= 0 && qIndex < questions.length ? questions[qIndex] : null

  return (
    <div className="respondent-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg)', padding: 24 }}>
      {/* Phone frame */}
      <div className="respondent-phone" style={{ width: 420, height: 760, background: 'var(--card)', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: branding.brand_color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, overflow: 'hidden', flexShrink: 0 }}>
            {branding.logo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={branding.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : (branding.org_name?.[0] ?? 'S').toUpperCase()}
          </div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{survey.title}</div>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--grey)' }}>
            {qIndex < 0 ? '' : `Q${Math.min(qIndex + 1, questions.length)} of ${questions.length}`}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--border)' }}>
          <div style={{ height: '100%', background: branding.brand_color, width: `${progress}%`, transition: 'width .3s' }} />
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map(m => (
            m.text === '__typing__' ? (
              <TypingBubble key={m.id} />
            ) : m.role === 'bot' ? (
              <div
                key={m.id}
                style={{
                  maxWidth: '82%', padding: '10px 14px', borderRadius: 14, fontSize: 14, lineHeight: 1.4,
                  background: m.isAiFollowup ? 'var(--ai-bg)' : '#F1F4F8',
                  border: m.isAiFollowup ? '1px solid #E4D6F0' : 'none',
                  alignSelf: 'flex-start', borderBottomLeftRadius: 4,
                }}
              >
                {m.isAiFollowup && <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--ai)', marginBottom: 4 }}>⚡ AI follow-up</span>}
                {m.text}
              </div>
            ) : (
              <div key={m.id} style={{ maxWidth: '82%', padding: '10px 14px', borderRadius: 14, fontSize: 14, lineHeight: 1.4, background: branding.brand_color, color: 'white', alignSelf: 'flex-end', borderBottomRightRadius: 4 }}>
                {m.text}
              </div>
            )
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px' }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <div style={{ fontSize: 34, marginBottom: 6 }}>✅</div>
              <div style={{ fontWeight: 600 }}>Thanks for your time!</div>
              <div style={{ color: 'var(--grey)', fontSize: 13, marginTop: 4 }}>Your responses have been recorded.</div>
            </div>
          ) : currentQ && !inputDisabled ? (
            renderConversationalInput(currentQ, submitAnswer, starHover, setStarHover, textVal, setTextVal, inputDisabled)
          ) : (
            <div style={{ height: 38 }} />
          )}
        </div>
      </div>
    </div>
  )
}

function renderConversationalInput(
  q: Question,
  onSubmit: (val: string, num?: number) => void,
  starHover: number,
  setStarHover: (n: number) => void,
  textVal: string,
  setTextVal: (v: string) => void,
  disabled: boolean,
) {
  const s = q.settings ?? {}
  const yesLabel = s.yes_label ?? 'Yes'
  const noLabel  = s.no_label  ?? 'No'
  const opts = q.question_options?.sort((a, b) => a.position - b.position).map(o => o.label)
    ?? (q.type === 'yes_no' ? [yesLabel, noLabel] : [])
  const rankItems = s.items ?? opts

  // NPS / scale
  if (isScale(q.type)) {
    const min = s.scale_min ?? 0
    const max = s.scale_max ?? 10
    return (
      <div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
          {Array.from({ length: max - min + 1 }, (_, i) => {
            const n = min + i
            return (
              <button key={n} onClick={() => onSubmit(String(n), n)} disabled={disabled}
                style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 13 }}>
                {n}
              </button>
            )
          })}
        </div>
        {(s.label_min || s.label_max) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--grey)' }}>
            <span>{s.label_min}</span><span>{s.label_max}</span>
          </div>
        )}
      </div>
    )
  }

  // Rating stars
  if (isRating(q.type)) {
    const max = s.scale_max ?? 5
    const min = s.scale_min ?? 1
    return (
      <div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', fontSize: 30, cursor: 'pointer' }}>
          {Array.from({ length: max - min + 1 }, (_, i) => {
            const n = min + i
            return (
              <span key={n} onMouseEnter={() => setStarHover(n)} onMouseLeave={() => setStarHover(0)}
                onClick={() => onSubmit(`${n} / ${max} stars`, n)}
                style={{ color: n <= (starHover || 0) ? '#F0B429' : '#D9DEE5' }}>★</span>
            )
          })}
        </div>
        {(s.label_min || s.label_max) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--grey)' }}>
            <span>{s.label_min}</span><span>{s.label_max}</span>
          </div>
        )}
      </div>
    )
  }

  // Choice buttons (single_choice, yes_no, multi_select)
  if ((hasOptions(q.type) && opts.length > 0) || q.type === 'yes_no') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(q.type === 'yes_no' ? [yesLabel, noLabel] : opts).map(opt => (
          <button key={opt} onClick={() => onSubmit(opt)} disabled={disabled}
            style={{ border: '1.5px solid var(--border)', background: 'white', borderRadius: 10, padding: '10px 14px', fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>
            {opt}
          </button>
        ))}
      </div>
    )
  }

  // Ranking — show items as numbered select
  if (q.type === 'ranking' && rankItems.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--grey)' }}>
          {s.order_direction === 'lowest_first' ? 'Type ranks (1 = least important)' : 'Type ranks (1 = most important)'}
        </div>
        {rankItems.map((item) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>
            <input type="number" min={1} max={rankItems.length} placeholder="Rank"
              style={{ width: 56, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 13 }}
              onBlur={e => {
                if (e.target.value) onSubmit(`${item}: #${e.target.value}`)
              }} />
            <span>{item}</span>
          </div>
        ))}
        <button onClick={() => onSubmit(textVal || 'Ranked')} disabled={disabled}
          style={{ alignSelf: 'flex-end', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', fontSize: 16 }}>
          ➤
        </button>
      </div>
    )
  }

  // Date / time
  if (q.type === 'date_time') {
    const fmt = s.date_format ?? 'date'
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type={fmt === 'time' ? 'time' : fmt === 'datetime' ? 'datetime-local' : 'date'}
          value={textVal} onChange={e => setTextVal(e.target.value)}
          min={s.min_date} max={s.max_date}
          style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit' }} />
        <button onClick={() => { if (textVal) onSubmit(textVal) }} disabled={disabled || !textVal}
          style={{ background: 'var(--accent)', color: 'white', border: 'none', width: 38, height: 38, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>
          ➤
        </button>
      </div>
    )
  }

  // Matrix — show as message, then submit text
  if (q.type === 'likert_matrix') {
    return (
      <TextInput multiline value={textVal} onChange={setTextVal}
        onSubmit={() => { if (textVal.trim()) onSubmit(textVal.trim()) }} disabled={disabled}
        placeholder={s.placeholder ?? 'Describe your ratings…'} />
    )
  }

  // Short / long text
  return (
    <TextInput
      multiline={q.type === 'long_text'}
      value={textVal}
      onChange={v => {
        if (q.type === 'long_text' && s.char_limit && v.length > s.char_limit) return
        setTextVal(v)
      }}
      onSubmit={() => { if (textVal.trim()) onSubmit(textVal.trim()) }}
      disabled={disabled}
      inputType={(q.type === 'short_text' ? s.input_type : undefined) as React.HTMLInputTypeAttribute | undefined}
      placeholder={s.placeholder}
      charLimit={q.type === 'long_text' ? s.char_limit : undefined}
    />
  )
}

function TextInput({ multiline, value, onChange, onSubmit, disabled, inputType, placeholder, charLimit }: {
  multiline: boolean; value: string; onChange: (v: string) => void; onSubmit: () => void; disabled: boolean
  inputType?: React.HTMLInputTypeAttribute; placeholder?: string; charLimit?: number
}) {
  const ph = placeholder ?? 'Type your answer…'
  return (
    <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {multiline ? (
          <textarea rows={2} value={value} onChange={e => onChange(e.target.value)} placeholder={ph}
            style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'none' }} />
        ) : (
          <input type={inputType ?? 'text'} value={value} onChange={e => onChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSubmit()} placeholder={ph}
            style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit' }} />
        )}
        <button onClick={onSubmit} disabled={disabled || !value.trim()}
          style={{ background: 'var(--accent)', color: 'white', border: 'none', width: 38, height: 38, borderRadius: '50%', cursor: 'pointer', fontSize: 16, flexShrink: 0, alignSelf: 'flex-end' }}>
          ➤
        </button>
      </div>
      {charLimit && (
        <div style={{ textAlign: 'right', fontSize: 10, color: value.length > charLimit * 0.9 ? 'var(--amber)' : 'var(--grey)' }}>
          {value.length} / {charLimit}
        </div>
      )}
    </div>
  )
}

function TypingBubble() {
  return (
    <div style={{ alignSelf: 'flex-start', background: '#F1F4F8', padding: '12px 16px', borderRadius: 14, borderBottomLeftRadius: 4, display: 'flex', gap: 4 }}>
      {[0, 0.2, 0.4].map((delay, i) => (
        <span key={i} style={{
          display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--grey)',
          animation: `blink 1.2s ${delay}s infinite`,
        }} />
      ))}
      <style>{`@keyframes blink{0%,80%,100%{opacity:.3}40%{opacity:1}}`}</style>
    </div>
  )
}

// ─── CLASSIC MODE ─────────────────────────────────────────────────────────────
function ClassicMode({ survey, questions, rules, branding }: { survey: Survey; questions: Question[]; rules: LogicRule[]; branding: Branding }) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Flat string map for logic engine (single-value only; multi-select joins with ", ")
  const flatAnswers: Record<string, string> = {}
  for (const [qid, val] of Object.entries(answers)) {
    flatAnswers[qid] = Array.isArray(val) ? val.join(', ') : (val ?? '')
  }

  // Visible questions after logic evaluation
  const visibleIds = new Set(visibleQuestions(questions, rules, flatAnswers))
  const displayQuestions = questions.filter(q => visibleIds.has(q.id))

  const setValue = (qid: string, val: string | string[]) =>
    setAnswers(prev => ({ ...prev, [qid]: val }))

  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async () => {
    // Validate required questions
    const missing = displayQuestions.filter(q => q.required && !answers[q.id])
    if (missing.length > 0) {
      setSubmitError(`Please answer all required questions (${missing.length} remaining).`)
      return
    }
    setSubmitError(null)
    setSubmitting(true)
    const respondentId = getRespondentId(survey.id)
    const payload = questions.map(q => ({
      question_id: q.id,
      value: Array.isArray(answers[q.id])
        ? { options: answers[q.id] as string[] }
        : typeof answers[q.id] === 'string'
        ? { text: answers[q.id] as string }
        : {},
    }))
    try {
      const res = await fetch(`${API}/surveys/${survey.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'complete', answers: payload, respondent_id: respondentId }),
      })
      if (!res.ok) {
        const err = await res.json()
        setSubmitError(err.detail ?? 'Submission failed. Please try again.')
        setSubmitting(false)
        return
      }
      markResponded(survey.id)
    } catch (_) {
      setSubmitError('Network error. Please check your connection.')
      setSubmitting(false)
      return
    }
    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', gap: 12 }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <h2 style={{ fontSize: 22, margin: 0 }}>Thanks for your response!</h2>
        <p style={{ color: 'var(--grey)', margin: 0 }}>Your answers have been recorded.</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Branded header */}
      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: branding.brand_color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, overflow: 'hidden', flexShrink: 0 }}>
          {branding.logo_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={branding.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : (branding.org_name?.[0] ?? 'S').toUpperCase()}
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{survey.title}</div>
      </div>
      <div style={{ height: 3, background: branding.brand_color }} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 24 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {displayQuestions.map((q, i) => (
            <ClassicQuestion key={q.id} q={q} index={i} value={answers[q.id]} onChange={val => setValue(q.id, val)} />
          ))}
        </div>

        {submitError && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--red-bg)', color: 'var(--red)', borderRadius: 8, fontSize: 13 }}>
            {submitError}
          </div>
        )}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><span className="spinner" />Submitting…</> : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ClassicQuestion({ q, index, value, onChange }: {
  q: Question; index: number; value: string | string[] | undefined; onChange: (v: string | string[]) => void
}) {
  const s = q.settings ?? {}
  const opts = q.question_options?.sort((a, b) => a.position - b.position).map(o => o.label)
    ?? (q.type === 'yes_no' ? [s.yes_label ?? 'Yes', s.no_label ?? 'No'] : [])
  const [starHover, setStarHover] = useState(0)
  const charVal = (value as string) ?? ''

  const inpStyle: React.CSSProperties = {
    width: '100%', border: '1px solid var(--border)', borderRadius: 8,
    padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
      {/* Title */}
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: s.help_text ?? q.help_text ? 6 : 14, lineHeight: 1.4 }}>
        {index + 1}. {q.title}
        {q.required && <span style={{ color: 'var(--red)', marginLeft: 4 }}>*</span>}
      </div>

      {/* Help text */}
      {(s.help_text ?? q.help_text) && (
        <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 14, lineHeight: 1.4 }}>
          {s.help_text ?? q.help_text}
        </div>
      )}

      {/* NPS */}
      {isScale(q.type) && (
        <div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {Array.from({ length: (s.scale_max ?? 10) - (s.scale_min ?? 0) + 1 }, (_, i) => {
              const n = (s.scale_min ?? 0) + i
              return (
                <button key={n} onClick={() => onChange(String(n))} style={{
                  width: 40, height: 40, borderRadius: 8, fontSize: 13,
                  border: `1.5px solid ${value === String(n) ? 'var(--accent)' : 'var(--border)'}`,
                  background: value === String(n) ? '#EEF2FF' : 'white',
                  color: value === String(n) ? 'var(--accent)' : 'var(--text)',
                  fontWeight: value === String(n) ? 700 : 400, cursor: 'pointer',
                }}>{n}</button>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--grey)' }}>
            <span>{s.label_min || 'Not likely'}</span>
            <span>{s.label_max || 'Very likely'}</span>
          </div>
          {s.follow_up_prompt && value && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{s.follow_up_prompt}</div>
              <textarea value={''} onChange={() => {}} placeholder="Your reason…" rows={2}
                style={{ ...inpStyle, resize: 'vertical' }} />
            </div>
          )}
        </div>
      )}

      {/* Rating */}
      {isRating(q.type) && (
        <div>
          <div style={{ display: 'flex', gap: 8, fontSize: 32, alignItems: 'center' }}>
            {Array.from({ length: (s.scale_max ?? 5) - (s.scale_min ?? 1) + 1 }, (_, i) => {
              const n = (s.scale_min ?? 1) + i
              return (
                <span key={n} onMouseEnter={() => setStarHover(n)} onMouseLeave={() => setStarHover(0)}
                  onClick={() => onChange(String(n))}
                  style={{ cursor: 'pointer', color: n <= (starHover || Number(value) || 0) ? '#F0B429' : '#D9DEE5' }}>★</span>
              )
            })}
          </div>
          {(s.label_min || s.label_max) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--grey)' }}>
              <span>{s.label_min}</span><span>{s.label_max}</span>
            </div>
          )}
        </div>
      )}

      {/* Single choice */}
      {q.type === 'single_choice' && opts.map(opt => (
        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer', fontSize: 14 }}>
          <input type="radio" name={q.id} value={opt} checked={value === opt} onChange={() => onChange(opt)} />
          {opt}
        </label>
      ))}

      {/* Yes/No */}
      {q.type === 'yes_no' && [s.yes_label ?? 'Yes', s.no_label ?? 'No'].map(opt => (
        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer', fontSize: 14 }}>
          <input type="radio" name={q.id} value={opt} checked={value === opt} onChange={() => onChange(opt)} />
          {opt}
        </label>
      ))}

      {/* Multi-select */}
      {q.type === 'multi_select' && (
        <div>
          {opts.map(opt => {
            const selected = Array.isArray(value) ? value : []
            return (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" checked={selected.includes(opt)}
                  onChange={e => onChange(e.target.checked ? [...selected, opt] : selected.filter(v => v !== opt))} />
                {opt}
              </label>
            )
          })}
          {(s.min_selections || s.max_selections) && (
            <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 4 }}>
              {s.min_selections && `Min ${s.min_selections}`}{s.min_selections && s.max_selections && ' · '}{s.max_selections && `Max ${s.max_selections}`} selections
            </div>
          )}
        </div>
      )}

      {/* Short text */}
      {q.type === 'short_text' && (
        <input type={(s.input_type as React.HTMLInputTypeAttribute) ?? 'text'}
          value={charVal} onChange={e => onChange(e.target.value)}
          placeholder={s.placeholder ?? 'Your answer…'} style={inpStyle} />
      )}

      {/* Long text */}
      {q.type === 'long_text' && (
        <div>
          <textarea value={charVal} onChange={e => {
            if (!s.char_limit || e.target.value.length <= s.char_limit) onChange(e.target.value)
          }}
            placeholder={s.placeholder ?? 'Your answer…'} rows={4}
            style={{ ...inpStyle, resize: 'vertical' }} />
          {s.char_limit && (
            <div style={{ textAlign: 'right', fontSize: 11, color: charVal.length > s.char_limit * 0.9 ? 'var(--amber)' : 'var(--grey)', marginTop: 4 }}>
              {charVal.length} / {s.char_limit}
            </div>
          )}
        </div>
      )}

      {/* Matrix / Likert */}
      {q.type === 'likert_matrix' && (s.rows ?? []).length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'left', width: 160 }} />
                {(s.columns ?? []).map(col => (
                  <th key={col} style={{ padding: '8px 8px', textAlign: 'center', fontSize: 12, color: 'var(--grey)', fontWeight: 600, whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(s.rows ?? []).map((row, ri) => {
                const rowVal = Array.isArray(value) ? value[ri] : undefined
                return (
                  <tr key={row} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{row}</td>
                    {(s.columns ?? []).map(col => (
                      <td key={col} style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <input type="radio" name={`${q.id}-row-${ri}`} value={col} checked={rowVal === col}
                          onChange={() => {
                            const arr = Array.isArray(value) ? [...value] : (s.rows ?? []).map(() => '')
                            arr[ri] = col
                            onChange(arr)
                          }} />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Ranking */}
      {q.type === 'ranking' && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 8 }}>
            {s.order_direction === 'lowest_first' ? 'Rank from least to most important (1 = least)' : 'Rank from most to least important (1 = most)'}
          </div>
          {(s.items ?? opts).map((item, i) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, marginBottom: 6, fontSize: 14 }}>
              <select value={(Array.isArray(value) ? value[i] : undefined) ?? ''}
                onChange={e => {
                  const arr = Array.isArray(value) ? [...value] : (s.items ?? opts).map(() => '')
                  arr[i] = e.target.value
                  onChange(arr)
                }}
                style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 13, fontFamily: 'inherit' }}>
                <option value="">—</option>
                {(s.items ?? opts).map((_, rank) => <option key={rank + 1} value={String(rank + 1)}>{rank + 1}</option>)}
              </select>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}

      {/* Date / Time */}
      {q.type === 'date_time' && (
        <input
          type={s.date_format === 'time' ? 'time' : s.date_format === 'datetime' ? 'datetime-local' : 'date'}
          value={charVal} onChange={e => onChange(e.target.value)}
          min={s.min_date} max={s.max_date}
          style={{ ...inpStyle, width: 'auto' }}
        />
      )}

      {/* Error message */}
      {q.error_message && (
        <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 6, fontStyle: 'italic' }}>{q.error_message}</div>
      )}
    </div>
  )
}
