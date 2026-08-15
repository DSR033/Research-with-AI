'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { visibleQuestions, nextQuestion, LOGIC_TERMINATED } from '../../../../lib/logic-engine'
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
  // Slider
  step?: number
  start_value?: number
  // Numeric Input
  numeric_type?: string
  min_val?: number
  max_val?: number
  unit_label?: string
  // Constant Sum
  constant_items?: string[]
  constant_total?: number
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

interface QuotaRule { id: string; name: string; question_id: string; answer_value: string; limit: number; action: string }
interface SurveySettings {
  require_response?: boolean
  no_duplicates?: boolean
  randomize?: boolean
  access_mode?: 'public' | 'password' | 'email_password' | 'invite_only'
  password?: string
  invite_emails?: string
  screen_out_msg?: string
  quota_full_msg?: string
  over_quota_msg?: string
  quotas?: QuotaRule[]
  // End screens — authored in the builder under Build → End Screens
  thank_you_heading?: string
  thank_you_text?: string
  disqualified_heading?: string
  redirect_url?: string | null
  redirect_delay?: number
  // Survey behaviour
  capture_location?: boolean
  age_verification?: boolean
  closed_message?: string
}

const THANK_YOU_HEADING = 'Thank you!'
const THANK_YOU_TEXT    = 'Your answers have been recorded.'
const DISQUALIFIED_HEADING = 'You do not qualify'
const DISQUALIFIED_TEXT = "We're sorry, but you don't qualify for this survey."

/** Send the respondent on to the configured URL once the survey completes. */
function useCompletionRedirect(settings: SurveySettings | undefined, active: boolean) {
  useEffect(() => {
    const url = settings?.redirect_url
    if (!active || !url) return
    const delayMs = Math.max(0, (settings?.redirect_delay ?? 0)) * 1000
    const t = setTimeout(() => { window.location.href = url }, delayMs)
    return () => clearTimeout(t)
  }, [active, settings?.redirect_url, settings?.redirect_delay])
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
type TerminationType = 'complete' | 'screen_out' | 'quota_full' | 'over_quota' | 'info'
function SurveyGate({ icon, title, desc, type = 'info', footer }: { icon: string; title: string; desc: string; type?: TerminationType; footer?: string }) {
  const palette: Record<TerminationType, { accent: string; bg: string; badge?: string }> = {
    complete:   { accent: '#16a34a', bg: '#f0fdf4', badge: 'Completed' },
    screen_out: { accent: '#dc2626', bg: '#fef2f2', badge: 'Not qualified' },
    quota_full: { accent: '#d97706', bg: '#fffbeb', badge: 'Quota filled' },
    over_quota: { accent: '#7c3aed', bg: '#faf5ff', badge: 'Over quota' },
    info:       { accent: '#71717a', bg: 'var(--bg)' },
  }
  const p = palette[type]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: p.bg, gap: 12, padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 48 }}>{icon}</div>
      {p.badge && (
        <span style={{ fontSize: 11, fontWeight: 700, color: p.accent, background: `${p.accent}18`, padding: '3px 10px', borderRadius: 20, border: `1px solid ${p.accent}33`, textTransform: 'uppercase', letterSpacing: '.05em' }}>{p.badge}</span>
      )}
      <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 20, color: '#18181b', maxWidth: 340, lineHeight: 1.3 }}>{title}</div>
      <div style={{ color: '#71717a', fontSize: 14, maxWidth: 320, lineHeight: 1.5 }}>{desc}</div>
      {footer && <div style={{ color: '#a1a1aa', fontSize: 12, marginTop: 6 }}>{footer}</div>}
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

// ─── Access Gate ──────────────────────────────────────────────────────────────
function AccessGateForm({ settings, onUnlock }: { settings: SurveySettings; onUnlock: () => void }) {
  const mode = settings.access_mode ?? 'public'
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [err, setErr] = useState('')

  const submit = () => {
    setErr('')
    if (mode === 'password' || mode === 'email_password') {
      if (!pwd || pwd !== settings.password) { setErr('Incorrect password. Please try again.'); return }
      onUnlock()
    } else if (mode === 'invite_only') {
      const list = (settings.invite_emails ?? '').split(/[\s,]+/).map(e => e.trim().toLowerCase()).filter(Boolean)
      if (!list.includes(email.trim().toLowerCase())) { setErr('Your email is not on the invite list.'); return }
      onUnlock()
    }
  }

  const icon = mode === 'invite_only' ? '📩' : '🔒'
  const title = mode === 'invite_only' ? 'Invite-only survey' : 'Password protected'
  const desc = mode === 'invite_only'
    ? 'Enter the email address you were invited with to continue.'
    : mode === 'email_password'
    ? 'Enter your email and the survey password to continue.'
    : 'Enter the password to access this survey.'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '36px 40px', maxWidth: 400, width: '100%', boxShadow: '0 16px 48px rgba(0,0,0,.12)', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
        <div style={{ fontFamily: "var(--font-display,'Schibsted Grotesk',sans-serif)", fontWeight: 800, fontSize: 20, marginBottom: 6 }}>{title}</div>
        <div style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>{desc}</div>

        {(mode === 'email_password' || mode === 'invite_only') && (
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
            style={{ width: '100%', fontSize: 14, padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', marginBottom: 10, outline: 'none', boxSizing: 'border-box' as const }} />
        )}

        {(mode === 'password' || mode === 'email_password') && (
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input type={showPwd ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Enter password"
              onKeyDown={e => e.key === 'Enter' && submit()}
              style={{ width: '100%', fontSize: 14, padding: '10px 42px 10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', outline: 'none', boxSizing: 'border-box' as const }} />
            <button onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey)', fontSize: 12 }}>
              {showPwd ? 'Hide' : 'Show'}
            </button>
          </div>
        )}

        {err && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{err}</div>}

        <button onClick={submit} style={{ width: '100%', fontSize: 14, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#db2777,#be185d)', border: 'none', padding: '12px 0', borderRadius: 10, cursor: 'pointer' }}>
          {mode === 'invite_only' ? 'Verify access' : 'Unlock survey'}
        </button>
      </div>
    </div>
  )
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
  const [unlocked, setUnlocked] = useState(false)

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

  // Survey manually paused or closed by its owner
  if (survey.status === 'paused' || survey.status === 'closed') {
    return <SurveyGate icon="🔒" title="This survey is closed" desc={survey.settings?.closed_message || 'This survey is currently closed. Thank you for your interest.'} />
  }

  // Close date enforcement
  if (survey.close_date && new Date(survey.close_date) < new Date()) {
    return <SurveyGate icon="📅" title="This survey has closed" desc={survey.settings?.closed_message || 'The submission window for this survey has ended.'} />
  }

  // Duplicate submission gate (client-side fast path)
  if (survey.settings?.no_duplicates && hasResponded(id)) {
    return <SurveyGate icon="✅" title="Already submitted" desc="You've already completed this survey. Thank you for your response!" />
  }

  // Access control gate
  const accessMode = survey.settings?.access_mode ?? 'public'
  if (accessMode !== 'public' && !unlocked) {
    return <AccessGateForm settings={survey.settings!} onUnlock={() => setUnlocked(true)} />
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
  const [done, setDone] = useState<false | 'complete' | 'screen_out' | 'quota_full' | 'over_quota'>(false)
  useCompletionRedirect(survey.settings, done === 'complete')
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

    // Check quotas
    const quotas = survey.settings?.quotas ?? []
    for (const quota of quotas) {
      if (quota.answer_value && value === quota.answer_value) {
        // Optimistically terminate — real enforcement is server-side
        const action = quota.action as 'screen_out' | 'quota_full' | 'over_quota'
        showTypingThen(() => {
          const msg = action === 'screen_out' ? (survey.settings?.screen_out_msg ?? "You don't qualify for this survey.")
            : action === 'quota_full' ? (survey.settings?.quota_full_msg ?? "We've filled all available spots.")
            : (survey.settings?.over_quota_msg ?? "We've reached our quota for your profile.")
          addMsg(msg, 'bot')
          setTimeout(() => setDone(action), 800)
        }, 600)
        return
      }
    }

    // Use logic engine to find next question
    const nextId = nextQuestion(questions, rules, newMap, q.id)
    if (nextId === LOGIC_TERMINATED) {
      finishSurvey(newAnswers, 'screen_out')
      return
    }
    if (nextId === null) {
      finishSurvey(newAnswers, 'complete')
      return
    }
    const nextQ = questions.find(qi => qi.id === nextId)
    if (!nextQ) { finishSurvey(newAnswers, 'complete'); return }
    const nextIdx = questions.indexOf(nextQ)

    showTypingThen(() => {
      addMsg(nextQ.title, 'bot')
      setQIndex(nextIdx)
    })
  }

  const finishSurvey = async (finalAnswers: Answer[], termType: 'complete' | 'screen_out' = 'complete') => {
    setInputDisabled(true)
    const respondentId = getRespondentId(survey.id)
    const status = termType === 'complete' ? 'complete' : 'disqualified'
    try {
      const res = await fetch(`${API}/surveys/${survey.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, answers: finalAnswers, respondent_id: respondentId }),
      })
      if (!res.ok) {
        const err = await res.json()
        showTypingThen(() => {
          setMessages(prev => [...prev, { id: 'err', role: 'bot', text: `⚠️ ${err.detail ?? 'Submission failed.'}` }])
          setDone('complete')
        }, 400)
        return
      }
      if (termType === 'complete') markResponded(survey.id)
    } catch (_) {}
    showTypingThen(() => { setDone(termType) }, 700)
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
          {done === 'complete' ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <div style={{ fontSize: 34, marginBottom: 6 }}>✅</div>
              <div style={{ fontWeight: 700 }}>{survey.settings?.thank_you_heading || THANK_YOU_HEADING}</div>
              <div style={{ color: 'var(--grey)', fontSize: 13, marginTop: 4 }}>{survey.settings?.thank_you_text || THANK_YOU_TEXT}</div>
              {survey.settings?.redirect_url && (
                <div style={{ color: 'var(--grey)', fontSize: 11.5, marginTop: 12 }}>
                  {(survey.settings.redirect_delay ?? 0) === 0
                    ? 'Redirecting…'
                    : `Redirecting in ${survey.settings.redirect_delay} seconds…`}
                </div>
              )}
            </div>
          ) : done === 'screen_out' ? (
            <div style={{ textAlign: 'center', padding: '24px 10px' }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>🚫</div>
              <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>{survey.settings?.disqualified_heading || DISQUALIFIED_HEADING}</div>
              <div style={{ color: 'var(--grey)', fontSize: 13 }}>{survey.settings?.screen_out_msg ?? DISQUALIFIED_TEXT}</div>
            </div>
          ) : done === 'quota_full' ? (
            <div style={{ textAlign: 'center', padding: '24px 10px' }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>📊</div>
              <div style={{ fontWeight: 700, color: '#d97706', marginBottom: 4 }}>Quota filled</div>
              <div style={{ color: 'var(--grey)', fontSize: 13 }}>{survey.settings?.quota_full_msg ?? "We've filled all available spots."}</div>
            </div>
          ) : done === 'over_quota' ? (
            <div style={{ textAlign: 'center', padding: '24px 10px' }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>⚖️</div>
              <div style={{ fontWeight: 700, color: '#7c3aed', marginBottom: 4 }}>Over quota</div>
              <div style={{ color: 'var(--grey)', fontSize: 13 }}>{survey.settings?.over_quota_msg ?? "We've reached our quota for your profile."}</div>
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

  // Slider — range input with live value display
  if (q.type === 'slider') {
    const min = s.scale_min ?? 0; const max = s.scale_max ?? 100; const step = s.step ?? 1
    const current = textVal || String(s.start_value ?? Math.round((min + max) / 2))
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--grey)' }}>
          <span>{s.label_min || String(min)}</span>
          <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 15 }}>{current}</span>
          <span>{s.label_max || String(max)}</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={current}
          onChange={e => setTextVal(e.target.value)} disabled={disabled}
          style={{ width: '100%', accentColor: 'var(--accent)' }} />
        <button onClick={() => onSubmit(current, Number(current))} disabled={disabled}
          style={{ alignSelf: 'flex-end', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', fontSize: 16 }}>
          ➤
        </button>
      </div>
    )
  }

  // Numeric input
  if (q.type === 'numeric_input') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="number" min={s.min_val} max={s.max_val}
          step={s.numeric_type === 'decimal' ? 0.01 : 1}
          value={textVal} onChange={e => setTextVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && textVal && onSubmit(textVal, Number(textVal))}
          placeholder={s.placeholder ?? 'Enter number…'}
          disabled={disabled}
          style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit' }} />
        {s.unit_label && <span style={{ fontSize: 13, color: 'var(--grey)', fontWeight: 600 }}>{s.unit_label}</span>}
        <button onClick={() => textVal && onSubmit(textVal, Number(textVal))} disabled={disabled || !textVal}
          style={{ background: 'var(--accent)', color: 'white', border: 'none', width: 38, height: 38, borderRadius: '50%', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>
          ➤
        </button>
      </div>
    )
  }

  // Constant sum — per-item allocation in chat
  if (q.type === 'constant_sum') {
    const items = s.constant_items ?? opts
    const total = s.constant_total ?? 100
    // Parse current allocations from textVal (stored as "item1:val,item2:val")
    const allocMap: Record<string, number> = {}
    if (textVal) textVal.split(',').forEach(pair => {
      const [k, v] = pair.split(':'); if (k && v) allocMap[k] = Number(v)
    })
    const used = items.reduce((sum, item) => sum + (allocMap[item] ?? 0), 0)
    const remaining = total - used
    const updateAlloc = (item: string, val: number) => {
      const next = { ...allocMap, [item]: val }
      setTextVal(items.map(it => `${it}:${next[it] ?? 0}`).join(','))
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 2 }}>
          Distribute {total} {s.unit_label || 'points'} · Remaining: <strong style={{ color: remaining < 0 ? 'var(--red)' : remaining === 0 ? 'var(--green)' : 'var(--accent)' }}>{remaining}</strong>
        </div>
        {items.map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ flex: 1 }}>{item}</span>
            <input type="number" min={0} max={total} value={allocMap[item] ?? 0}
              onChange={e => updateAlloc(item, +e.target.value)}
              style={{ width: 64, border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12, textAlign: 'right' as const }} />
            <span style={{ fontSize: 11, color: 'var(--grey)', width: 28 }}>{s.unit_label || 'pts'}</span>
          </div>
        ))}
        <button onClick={() => remaining === 0 && onSubmit(textVal)} disabled={disabled || remaining !== 0}
          style={{ alignSelf: 'flex-end', marginTop: 4, background: remaining === 0 ? 'var(--accent)' : 'var(--border)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: remaining === 0 ? 'pointer' : 'not-allowed' }}>
          {remaining === 0 ? 'Submit ➤' : `${remaining} left to assign`}
        </button>
      </div>
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
  const [submitted, setSubmitted] = useState<false | 'complete' | 'screen_out' | 'quota_full' | 'over_quota'>(false)
  const [submitting, setSubmitting] = useState(false)
  useCompletionRedirect(survey.settings, submitted === 'complete')

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

    // Check quotas before submitting
    const quotas = survey.settings?.quotas ?? []
    for (const quota of quotas) {
      const ans = flatAnswers[quota.question_id] ?? ''
      if (quota.answer_value && ans === quota.answer_value) {
        const action = quota.action as 'screen_out' | 'quota_full' | 'over_quota'
        setSubmitted(action)
        return
      }
    }

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
    setSubmitted('complete')
    setSubmitting(false)
  }

  if (submitted === 'complete') {
    return (
      <SurveyGate
        type="complete"
        icon="✅"
        title={survey.settings?.thank_you_heading || THANK_YOU_HEADING}
        desc={survey.settings?.thank_you_text || THANK_YOU_TEXT}
        footer={survey.settings?.redirect_url
          ? ((survey.settings.redirect_delay ?? 0) === 0
              ? 'Redirecting…'
              : `Redirecting in ${survey.settings.redirect_delay} seconds…`)
          : undefined}
      />
    )
  }
  if (submitted === 'screen_out') {
    return <SurveyGate type="screen_out" icon="🚫" title={survey.settings?.disqualified_heading || DISQUALIFIED_HEADING} desc={survey.settings?.screen_out_msg ?? DISQUALIFIED_TEXT} />
  }
  if (submitted === 'quota_full') {
    return <SurveyGate type="quota_full" icon="📊" title="Quota filled" desc={survey.settings?.quota_full_msg ?? "We've filled all available spots. Thank you for your interest."} />
  }
  if (submitted === 'over_quota') {
    return <SurveyGate type="over_quota" icon="⚖️" title="Over quota" desc={survey.settings?.over_quota_msg ?? "We've reached our quota for your profile segment."} />
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
        <input type={s.date_format === 'time' ? 'time' : s.date_format === 'datetime' ? 'datetime-local' : 'date'}
          value={charVal} onChange={e => onChange(e.target.value)}
          min={s.min_date} max={s.max_date} style={{ ...inpStyle, width: 'auto' }} />
      )}

      {/* Dropdown */}
      {q.type === 'dropdown' && (
        <select value={charVal} onChange={e => onChange(e.target.value)} style={{ ...inpStyle, width: '100%', cursor: 'pointer' }}>
          <option value="">— Select an option —</option>
          {(s.options ?? opts).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )}

      {/* Slider */}
      {q.type === 'slider' && (
        <div style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--grey)', marginBottom: 6 }}>
            <span>{s.label_min || String(s.scale_min ?? 0)}</span>
            <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>{charVal || String(s.start_value ?? 50)}</span>
            <span>{s.label_max || String(s.scale_max ?? 100)}</span>
          </div>
          <input type="range" min={s.scale_min ?? 0} max={s.scale_max ?? 100} step={s.step ?? 1}
            value={charVal || String(s.start_value ?? 50)}
            onChange={e => onChange(e.target.value)}
            style={{ width: '100%', accentColor: 'var(--accent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--grey)', marginTop: 2 }}>
            <span>{s.scale_min ?? 0}</span><span>{s.scale_max ?? 100}</span>
          </div>
        </div>
      )}

      {/* Numeric Input */}
      {q.type === 'numeric_input' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="number" min={s.min_val} max={s.max_val}
            step={s.numeric_type === 'decimal' ? 0.01 : 1}
            value={charVal} onChange={e => onChange(e.target.value)}
            placeholder={s.placeholder ?? 'Enter a number'}
            style={{ ...inpStyle, width: 200 }} />
          {s.unit_label && <span style={{ fontSize: 14, color: 'var(--grey)', fontWeight: 600 }}>{s.unit_label}</span>}
        </div>
      )}

      {/* Constant Sum */}
      {q.type === 'constant_sum' && (() => {
        const items = s.constant_items ?? opts
        const total = s.constant_total ?? 100
        const alloc: number[] = Array.isArray(value) ? value.map(Number) : items.map(() => 0)
        const used = alloc.reduce((a, b) => a + (b || 0), 0)
        const remaining = total - used
        return (
          <div>
            <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 10 }}>
              Distribute <strong>{total}</strong> {s.unit_label || 'points'} across the items.
              Remaining: <strong style={{ color: remaining < 0 ? 'var(--red)' : remaining === 0 ? 'var(--green)' : 'var(--accent)' }}>{remaining}</strong>
            </div>
            {items.map((item, i) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, fontSize: 14 }}>
                <div style={{ flex: 1 }}>{item}</div>
                <input type="number" min={0} max={total} value={alloc[i] ?? 0}
                  onChange={e => {
                    const next = [...alloc]
                    next[i] = +e.target.value
                    onChange(next.map(String) as unknown as string)
                  }}
                  style={{ width: 80, border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 13, textAlign: 'right' as const }} />
                <span style={{ color: 'var(--grey)', fontSize: 12, width: 40 }}>{s.unit_label || 'pts'}</span>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Error message */}
      {q.error_message && (
        <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 6, fontStyle: 'italic' }}>{q.error_message}</div>
      )}
    </div>
  )
}
