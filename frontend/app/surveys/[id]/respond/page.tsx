'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Question {
  id: string
  type: string
  title: string
  required: boolean
  position: number
  question_options?: Array<{ id: string; label: string; position: number }>
}

interface Survey {
  id: string
  title: string
  mode: string
  status: string
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

// ─── AI follow-up generator (pattern-based; real AI wires in Phase 4) ──────
function generateFollowup(answer: string): string {
  const lower = answer.toLowerCase()
  if (/price|expensive|cost|cheap|afford/.test(lower))
    return 'Got it — roughly what price point would feel fair to you?'
  if (/slow|bug|issue|problem|crash|error/.test(lower))
    return 'Sorry to hear that. Could you tell me a bit more about what went wrong?'
  if (/love|great|good|easy|excellent|amazing|perfect/.test(lower))
    return "Glad to hear it! What's the one feature you'd miss most if it went away?"
  return "Thanks for sharing — is there anything specific that would make this even better?"
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
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'classic' | 'conversational'>('conversational')

  useEffect(() => {
    fetch(`${API}/surveys/${id}`)
      .then(r => r.json())
      .then(data => {
        setSurvey(data)
        const qs = (data.questions || []).sort(
          (a: Question, b: Question) => a.position - b.position
        )
        setQuestions(qs)
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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', gap: 12 }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <div style={{ fontWeight: 600, fontSize: 16 }}>This survey isn&apos;t available yet</div>
        <div style={{ color: 'var(--grey)', fontSize: 13 }}>It may not be published, or the link may be incorrect.</div>
      </div>
    )
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
    return <ConversationalMode survey={survey} questions={questions} />
  }
  return <ClassicMode survey={survey} questions={questions} />
}

// ─── CONVERSATIONAL MODE ──────────────────────────────────────────────────────
function ConversationalMode({ survey, questions }: { survey: Survey; questions: Question[] }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [qIndex, setQIndex] = useState(-1) // -1 = not started yet
  const [inputDisabled, setInputDisabled] = useState(false)
  const [done, setDone] = useState(false)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [pendingFollowup, setPendingFollowup] = useState<string | null>(null)
  const [starHover, setStarHover] = useState(0)
  const [textVal, setTextVal] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  const addMsg = (text: string, role: 'bot' | 'user', isAiFollowup = false) => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, role, text, isAiFollowup }])
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

  const submitAnswer = (value: string, numericValue?: number) => {
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
    setAnswers(prev => [...prev, answer])

    // AI follow-up for open text
    if ((q.type === 'short_text' || q.type === 'long_text') && !pendingFollowup) {
      const followup = generateFollowup(value)
      setPendingFollowup(followup)
      setInputDisabled(true)
      showTypingThen(() => {
        addMsg(followup, 'bot', true)
        setInputDisabled(false)
      }, 1100)
      return
    }

    // Clear pending followup and advance
    setPendingFollowup(null)
    const next = qIndex + 1
    if (next >= questions.length) {
      finishSurvey([...answers, answer])
    } else {
      showTypingThen(() => {
        addMsg(questions[next].title, 'bot')
        setQIndex(next)
      })
    }
  }

  // When following up on AI question, advance after that answer
  const submitFollowupAnswer = (value: string) => {
    addMsg(value, 'user')
    setTextVal('')
    setPendingFollowup(null)
    const next = qIndex + 1
    if (next >= questions.length) {
      finishSurvey(answers)
    } else {
      showTypingThen(() => {
        addMsg(questions[next].title, 'bot')
        setQIndex(next)
      })
    }
  }

  const finishSurvey = async (finalAnswers: Answer[]) => {
    setInputDisabled(true)
    try {
      await fetch(`${API}/surveys/${survey.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'complete', answers: finalAnswers }),
      })
    } catch (_) {}
    showTypingThen(() => {
      setDone(true)
    }, 700)
  }

  const progress = qIndex < 0 ? 0 : Math.round((qIndex / questions.length) * 100)
  const currentQ = qIndex >= 0 && qIndex < questions.length ? questions[qIndex] : null

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg)', padding: 24 }}>
      {/* Phone frame */}
      <div style={{ width: 420, height: 760, background: 'var(--card)', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>S</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{survey.title}</div>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--grey)' }}>
            {qIndex < 0 ? '' : `Q${Math.min(qIndex + 1, questions.length)} of ${questions.length}`}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--border)' }}>
          <div style={{ height: '100%', background: 'var(--accent)', width: `${progress}%`, transition: 'width .3s' }} />
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
              <div key={m.id} style={{ maxWidth: '82%', padding: '10px 14px', borderRadius: 14, fontSize: 14, lineHeight: 1.4, background: 'var(--accent)', color: 'white', alignSelf: 'flex-end', borderBottomRightRadius: 4 }}>
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
              <div style={{ fontSize: 10.5, color: 'var(--ai)', marginTop: 8 }}>AI follow-ups are pattern-based — real AI wires in Phase 4.</div>
            </div>
          ) : pendingFollowup && !inputDisabled ? (
            // After AI follow-up, take the follow-up answer
            <TextInput
              multiline={false}
              value={textVal}
              onChange={setTextVal}
              onSubmit={() => { if (textVal.trim()) submitFollowupAnswer(textVal.trim()) }}
              disabled={inputDisabled}
            />
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
  const opts = q.question_options?.sort((a, b) => a.position - b.position).map(o => o.label)
    ?? (q.type === 'yes_no' ? ['Yes', 'No'] : [])

  if (isScale(q.type)) {
    return (
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            onClick={() => onSubmit(String(n), n)}
            disabled={disabled}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 13 }}
          >{n}</button>
        ))}
      </div>
    )
  }

  if (isRating(q.type)) {
    return (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', fontSize: 30, cursor: 'pointer' }}>
        {[1, 2, 3, 4, 5].map(n => (
          <span
            key={n}
            onMouseEnter={() => setStarHover(n)}
            onMouseLeave={() => setStarHover(0)}
            onClick={() => onSubmit(`${n} / 5 stars`, n)}
            style={{ color: n <= (starHover || 0) ? '#F0B429' : '#D9DEE5' }}
          >★</span>
        ))}
      </div>
    )
  }

  if (hasOptions(q.type) && opts.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {opts.map(opt => (
          <button
            key={opt}
            onClick={() => onSubmit(opt)}
            disabled={disabled}
            style={{ border: '1.5px solid var(--border)', background: 'white', borderRadius: 10, padding: '10px 14px', fontSize: 13, textAlign: 'left', cursor: 'pointer' }}
          >{opt}</button>
        ))}
      </div>
    )
  }

  return (
    <TextInput
      multiline={q.type === 'long_text'}
      value={textVal}
      onChange={setTextVal}
      onSubmit={() => { if (textVal.trim()) onSubmit(textVal.trim()) }}
      disabled={disabled}
    />
  )
}

function TextInput({ multiline, value, onChange, onSubmit, disabled }: {
  multiline: boolean; value: string; onChange: (v: string) => void; onSubmit: () => void; disabled: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {multiline ? (
        <textarea
          rows={2}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Type your answer…"
          style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'none' }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
          placeholder="Type your answer…"
          style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit' }}
        />
      )}
      <button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        style={{ background: 'var(--accent)', color: 'white', border: 'none', width: 38, height: 38, borderRadius: '50%', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}
      >➤</button>
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
function ClassicMode({ survey, questions }: { survey: Survey; questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const setValue = (qid: string, val: string | string[]) =>
    setAnswers(prev => ({ ...prev, [qid]: val }))

  const handleSubmit = async () => {
    setSubmitting(true)
    const payload = questions.map(q => ({
      question_id: q.id,
      value: Array.isArray(answers[q.id])
        ? { options: answers[q.id] as string[] }
        : typeof answers[q.id] === 'string'
        ? { text: answers[q.id] as string }
        : {},
    }))
    try {
      await fetch(`${API}/surveys/${survey.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'complete', answers: payload }),
      })
    } catch (_) {}
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
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, margin: '0 0 8px' }}>{survey.title}</h1>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
            <div style={{ height: '100%', background: 'var(--accent)', width: '0%', borderRadius: 2 }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {questions.map((q, i) => (
            <ClassicQuestion key={q.id} q={q} index={i} value={answers[q.id]} onChange={val => setValue(q.id, val)} />
          ))}
        </div>

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
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
  const opts = q.question_options?.sort((a, b) => a.position - b.position).map(o => o.label)
    ?? (q.type === 'yes_no' ? ['Yes', 'No'] : [])
  const [starHover, setStarHover] = useState(0)

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>
        {index + 1}. {q.title}
        {q.required && <span style={{ color: 'var(--red)', marginLeft: 4 }}>*</span>}
      </div>

      {isScale(q.type) && (
        <div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Array.from({ length: 11 }, (_, n) => (
              <button
                key={n}
                onClick={() => onChange(String(n))}
                style={{
                  width: 40, height: 40, borderRadius: 8, fontSize: 13,
                  border: `1.5px solid ${value === String(n) ? 'var(--accent)' : 'var(--border)'}`,
                  background: value === String(n) ? '#EEF2FF' : 'white',
                  color: value === String(n) ? 'var(--accent)' : 'var(--text)',
                  fontWeight: value === String(n) ? 700 : 400, cursor: 'pointer',
                }}
              >{n}</button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--grey)' }}>
            <span>Not likely</span><span>Very likely</span>
          </div>
        </div>
      )}

      {isRating(q.type) && (
        <div style={{ display: 'flex', gap: 8, fontSize: 32 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <span
              key={n}
              onMouseEnter={() => setStarHover(n)}
              onMouseLeave={() => setStarHover(0)}
              onClick={() => onChange(String(n))}
              style={{ cursor: 'pointer', color: n <= (starHover || Number(value) || 0) ? '#F0B429' : '#D9DEE5' }}
            >★</span>
          ))}
        </div>
      )}

      {q.type === 'single_choice' && opts.map(opt => (
        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer', fontSize: 14 }}>
          <input type="radio" name={q.id} value={opt} checked={value === opt} onChange={() => onChange(opt)} />
          {opt}
        </label>
      ))}

      {q.type === 'yes_no' && ['Yes', 'No'].map(opt => (
        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer', fontSize: 14 }}>
          <input type="radio" name={q.id} value={opt} checked={value === opt} onChange={() => onChange(opt)} />
          {opt}
        </label>
      ))}

      {q.type === 'multi_select' && opts.map(opt => {
        const selected = Array.isArray(value) ? value : []
        return (
          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={e => onChange(e.target.checked ? [...selected, opt] : selected.filter(v => v !== opt))}
            />
            {opt}
          </label>
        )
      })}

      {q.type === 'short_text' && (
        <input
          type="text"
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Your answer…"
          style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
        />
      )}

      {q.type === 'long_text' && (
        <textarea
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Your answer…"
          rows={4}
          style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
        />
      )}

      {q.type === 'date_time' && (
        <input
          type="datetime-local"
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
          style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit' }}
        />
      )}
    </div>
  )
}
