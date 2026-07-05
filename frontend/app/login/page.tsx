'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase-browser'

type Mode = 'signin' | 'signup' | 'forgot'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect   = searchParams.get('redirect') ?? '/'
  const errorParam = searchParams.get('error')
  const deleted    = searchParams.get('deleted')

  const [mode, setMode]         = useState<Mode>('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(errorParam === 'auth_callback_failed' ? 'Authentication failed. Please try again.' : '')
  const [message, setMessage]   = useState(deleted ? 'Your account has been deleted. Thank you for using SurveyAI.' : '')
  const [cooldown, setCooldown] = useState(0)  // seconds remaining before resend allowed

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(redirect)
    })
  }, [])

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const switchMode = (m: Mode) => { setMode(m); setError(''); setMessage(''); if (m !== 'forgot') setCooldown(0) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setMessage(''); setLoading(true)

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      if (error) setError(error.message)
      else { setMessage('Password reset email sent! Check your inbox and follow the link to set a new password.'); setCooldown(120) }
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirect}`,
        },
      })
      if (error) setError(error.message)
      else setMessage('Check your email for a confirmation link to complete sign-up.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else { router.push(redirect); router.refresh() }
    }
    setLoading(false)
  }

  const headerText: Record<Mode, { title: string; sub: string }> = {
    signin: { title: 'Welcome back',     sub: 'Sign in to your SurveyAI account' },
    signup: { title: 'Create account',   sub: 'Start building better surveys for free' },
    forgot: { title: 'Reset password',   sub: "We'll email you a link to set a new password" },
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(219,39,119,.35)' }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        </div>
        <span style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 22, letterSpacing: '-.02em', color: '#18181b' }}>SurveyAI</span>
      </div>

      {/* Card */}
      <div style={{ background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(219,39,119,.1)', borderRadius: 20, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(219,39,119,.12)', overflow: 'hidden' }}>

        {/* Gradient header */}
        <div style={{ background: 'linear-gradient(135deg,#db2777,#be185d)', padding: '24px 32px 20px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 21, color: '#fff', letterSpacing: '-.02em' }}>
            {headerText[mode].title}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', marginTop: 4 }}>
            {headerText[mode].sub}
          </div>
        </div>

        <div style={{ padding: '28px 32px' }}>
          {/* Mode tabs — only for signin/signup */}
          {mode !== 'forgot' && (
            <div style={{ display: 'flex', borderBottom: '1px solid #f1f1f4', marginBottom: 24 }}>
              {(['signin', 'signup'] as const).map(m => (
                <button key={m} onClick={() => switchMode(m)}
                  style={{ flex: 1, padding: '9px 0', fontSize: 14, fontWeight: 600, border: 'none', background: 'transparent', cursor: 'pointer', color: mode === m ? '#db2777' : '#71717a', borderBottom: `2px solid ${mode === m ? '#db2777' : 'transparent'}`, marginBottom: -1 }}>
                  {m === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          )}

          {/* Back link for forgot mode */}
          {mode === 'forgot' && (
            <button onClick={() => switchMode('signin')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#71717a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 20, fontWeight: 500 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Back to sign in
            </button>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <div>
                <label style={labelStyle}>Full name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Durgesh Singh" required style={inputStyle} onFocus={e => (e.target.style.borderColor = '#f9a8d4')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')} />
              </div>
            )}

            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoFocus={mode !== 'signup'} style={inputStyle} onFocus={e => (e.target.style.borderColor = '#f9a8d4')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')} />
            </div>

            {mode !== 'forgot' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <label style={labelStyle}>Password</label>
                  {mode === 'signin' && (
                    <button type="button" onClick={() => switchMode('forgot')}
                      style={{ fontSize: 12, color: '#db2777', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'} required minLength={mode === 'signup' ? 8 : 1} style={inputStyle} onFocus={e => (e.target.style.borderColor = '#f9a8d4')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')} />
              </div>
            )}

            {error   && <div style={{ fontSize: 13, color: '#ef4444', background: '#fef2f2', borderRadius: 8, padding: '10px 14px' }}>{error}</div>}
            {message && <div style={{ fontSize: 13, color: '#16a34a', background: '#f0fdf4', borderRadius: 8, padding: '10px 14px' }}>{message}</div>}

            {/* Submit button — for forgot mode, show resend with cooldown after first send */}
            {mode === 'forgot' && message ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                <button
                  type="submit"
                  disabled={loading || cooldown > 0}
                  className="btn"
                  style={{ width: '100%', padding: '12px 0', fontSize: 15, justifyContent: 'center', opacity: cooldown > 0 ? 0.6 : 1 }}
                >
                  {loading ? <><span className="spinner" />Sending…</> : cooldown > 0
                    ? `Resend in ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, '0')}`
                    : 'Resend reset link →'}
                </button>
                {cooldown > 0 && (
                  <div style={{ textAlign: 'center', fontSize: 12, color: '#a1a1aa' }}>
                    Didn&apos;t receive it? You can resend in {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, '0')}
                  </div>
                )}
              </div>
            ) : (
              <button type="submit" disabled={loading} className="btn" style={{ marginTop: 6, width: '100%', padding: '12px 0', fontSize: 15, justifyContent: 'center' }}>
                {loading ? (
                  <><span className="spinner" />{mode === 'signup' ? 'Creating…' : mode === 'forgot' ? 'Sending…' : 'Signing in…'}</>
                ) : mode === 'signup' ? 'Create account →'
                  : mode === 'forgot' ? 'Send reset link →'
                  : 'Sign in →'}
              </button>
            )}
          </form>

          {mode === 'signin' && (
            <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#71717a' }}>
              Don&apos;t have an account?{' '}
              <span onClick={() => switchMode('signup')} style={{ color: '#db2777', cursor: 'pointer', fontWeight: 700 }}>Sign up free</span>
            </div>
          )}
          {mode === 'signup' && (
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>
              By creating an account you agree to our Terms of Service and Privacy Policy.
            </div>
          )}
          {mode === 'forgot' && message && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button onClick={() => switchMode('signin')} className="btn ghost" style={{ fontSize: 13 }}>
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24, fontSize: 12, color: '#71717a', textAlign: 'center' }}>
        Respondents don&apos;t need an account — survey links are public.
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', transition: 'border-color .15s' }
