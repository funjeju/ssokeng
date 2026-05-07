'use client'

import { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase'
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth'

export default function ExtensionAuthPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const [extId, setExtId] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setExtId(params.get('ext'))

    // 이미 로그인된 경우 바로 토큰 전송
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await sendToken(user, params.get('ext'))
      }
    })
    return () => unsub()
  }, [])

  async function sendToken(user: any, eid: string | null) {
    if (!eid) {
      setError('Extension ID is missing. Please try again from the SSOKENG extension.')
      setStatus('error')
      return
    }
    try {
      setStatus('loading')
      const idToken = await user.getIdToken(true)

      await new Promise<void>((resolve, reject) => {
        const w = window as any
        if (typeof w.chrome === 'undefined' || !w.chrome?.runtime) {
          reject(new Error('Chrome extension environment not detected.'))
          return
        }
        w.chrome.runtime.sendMessage(eid, {
          type: 'ssoktube_auth',
          idToken,
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }, (response: any) => {
          if (w.chrome.runtime.lastError) {
            reject(new Error(w.chrome.runtime.lastError.message))
          } else {
            resolve()
          }
        })
      })

      setStatus('success')
    } catch (e: any) {
      setError(e.message || 'An error occurred while connecting.')
      setStatus('error')
    }
  }

  async function handleLogin() {
    try {
      setStatus('loading')
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      await sendToken(result.user, extId)
    } catch (e: any) {
      setError(e.message || 'An error occurred while signing in.')
      setStatus('error')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1c1a18',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, sans-serif',
    }}>
      <div style={{
        background: '#26231f',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '36px 32px',
        maxWidth: '360px',
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff', marginBottom: '6px' }}>
          SSOK<span style={{ color: '#8b5cf6' }}>ENG</span>
        </div>
        <div style={{ fontSize: '13px', color: '#75716e', marginBottom: '28px' }}>
          Chrome Extension Sign-In
        </div>

        {status === 'success' ? (
          <div>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>✅</div>
            <div style={{ color: '#a4a09c', fontSize: '14px', marginBottom: '8px' }}>
              Signed in!
            </div>
            <div style={{ color: '#75716e', fontSize: '12px' }}>
              Close this tab and return to the extension.
            </div>
          </div>
        ) : status === 'error' ? (
          <div>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>❌</div>
            <div style={{ color: '#fca5a5', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </div>
            <button
              onClick={() => setStatus('idle')}
              style={{
                background: '#7c3aed', color: '#fff', border: 'none',
                borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '13px',
              }}
            >
              Try again
            </button>
          </div>
        ) : (
          <div>
            <div style={{ color: '#a4a09c', fontSize: '13px', marginBottom: '24px', lineHeight: 1.6 }}>
              Sign in to save and manage<br />
              YouTube summaries<br />
              with the SSOKENG extension.
            </div>
            <button
              onClick={handleLogin}
              disabled={status === 'loading'}
              style={{
                width: '100%',
                background: status === 'loading' ? 'rgba(124,58,237,0.5)' : '#7c3aed',
                color: '#fff', border: 'none',
                borderRadius: '10px', padding: '12px',
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: 700,
              }}
            >
              {status === 'loading' ? 'Connecting...' : 'Sign in with Google'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
