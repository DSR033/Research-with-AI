'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase-browser'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/'
  const errorParam = searchParams.get('error')

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(errorParam === 'auth_callback_failed' ? 'Authentication failed. Please try again.' : '')
  const [message, setMessage] = useState('')

  const supabase = createClient()

  useEffect(() => {
    // If already logged in, redirect
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
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirect}`,
        },
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email for a confirmation link to complete sign-up.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push(redirect)
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>

      {/* Logo */}
      <div style={{ fontWeight: 700, fontSize: 24, color: 'var(--accent)', marginBottom: 32 }}>SurveyAI</div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '32px 36px', width: '100%', maxWidth: 420 }}>

        {/* Mode toggle */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
          {(['signin', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); setMessage('') }}
              style={{
                flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 600, border: 'none', background: 'transparent', cursor: 'pointer',
                color: mode === m ? 'var(--accent)' : 'var(--grey)',
                borderBottom: `2px solid ${mode === m ? 'var(--accent)' : 'transparent'}`,
                marginBottom: -1,
              }}
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'signup' && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Durgesh Singh"
                required
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoFocus
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
              required
              minLength={mode === 'signup' ? 8 : 1}
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', borderRadius: 8, padding: '10px 14px' }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{ fontSize: 13, color: 'var(--green)', background: 'var(--green-bg)', borderRadius: 8, padding: '10px 14px' }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn"
            style={{ marginTop: 4, width: '100%', padding: '11px 0', fontSize: 15 }}
          >
            {loading
              ? <><span className="spinner" />{mode === 'signup' ? 'Creating account…' : 'Signing in…'}</>
              : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {mode === 'signin' && (
          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--grey)' }}>
            Don&apos;t have an account?{' '}
            <span onClick={() => setMode('signup')} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
              Sign up free
            </span>
          </div>
        )}

        {mode === 'signup' && (
          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: 'var(--grey)', lineHeight: 1.5 }}>
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, fontSize: 12, color: 'var(--grey)', textAlign: 'center' }}>
        Respondents don&apos;t need an account — survey links are public.
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
}
