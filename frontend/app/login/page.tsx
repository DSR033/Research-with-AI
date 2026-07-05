'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase-browser'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect    = searchParams.get('redirect') ?? '/'
  const errorParam  = searchParams.get('error')
  const deleted     = searchParams.get('deleted')

  const [mode, setMode]         = useState<'signin' | 'signup'>('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(errorParam === 'auth_callback_failed' ? 'Authentication failed. Please try again.' : '')
  const [message, setMessage]   = useState(deleted ? 'Your account has been deleted. Thank you for using SurveyAI.' : '')

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(redirect)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (mode === 'signup') {
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
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', marginTop: 4 }}>
            {mode === 'signin' ? 'Sign in to your SurveyAI account' : 'Start building better surveys for free'}
          </div>
        </div>

        <div style={{ padding: '28px 32px' }}>
          {/* Mode tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #f1f1f4', marginBottom: 24 }}>
            {(['signin', 'signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setMessage('') }}
                style={{ flex: 1, padding: '9px 0', fontSize: 14, fontWeight: 600, border: 'none', background: 'transparent', cursor: 'pointer', color: mode === m ? '#db2777' : '#71717a', borderBottom: `2px solid ${mode === m ? '#db2777' : 'transparent'}`, marginBottom: -1 }}>
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 5 }}>Full name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Durgesh Singh" required style={inputStyle} onFocus={e => (e.target.style.borderColor = '#f9a8d4')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')} />
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 5 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required autoFocus style={inputStyle} onFocus={e => (e.target.style.borderColor = '#f9a8d4')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 5 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'} required minLength={mode === 'signup' ? 8 : 1} style={inputStyle} onFocus={e => (e.target.style.borderColor = '#f9a8d4')} onBlur={e => (e.target.style.borderColor = '#e4e4e7')} />
            </div>

            {error && <div style={{ fontSize: 13, color: '#ef4444', background: '#fef2f2', borderRadius: 8, padding: '10px 14px' }}>{error}</div>}
            {message && <div style={{ fontSize: 13, color: '#16a34a', background: '#f0fdf4', borderRadius: 8, padding: '10px 14px' }}>{message}</div>}

            <button type="submit" disabled={loading} className="btn" style={{ marginTop: 6, width: '100%', padding: '12px 0', fontSize: 15, justifyContent: 'center' }}>
              {loading
                ? <><span className="spinner" />{mode === 'signup' ? 'Creating…' : 'Signing in…'}</>
                : mode === 'signup' ? 'Create account →' : 'Sign in →'}
            </button>
          </form>

          {mode === 'signin' && (
            <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#71717a' }}>
              Don&apos;t have an account?{' '}
              <span onClick={() => setMode('signup')} style={{ color: '#db2777', cursor: 'pointer', fontWeight: 700 }}>Sign up free</span>
            </div>
          )}
          {mode === 'signup' && (
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#71717a', lineHeight: 1.5 }}>
              By creating an account you agree to our Terms of Service and Privacy Policy.
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

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10,
  padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none', transition: 'border-color .15s',
}
