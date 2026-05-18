'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { buildStudentEmail } from '@/lib/classroom'
import { signInAnonymously } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

type View = 'login' | 'signup' | 'forgot' | 'verify_sent' | 'student' | 'student_teacher' | 'student_credentials' | 'student_forgot' | 'student_forgot_sent' | 'pin' | 'pin_name'

interface Teacher {
  classCode: string
  teacherName: string
  grade: number
  classNum: number
}

export default function AuthModal() {
  const { authModalOpen, authModalView, closeAuthModal, signInWithGoogle, signInStudent, signInWithEmail, signUpWithEmail, sendPasswordReset } = useAuth()
  const [view, setView] = useState<View>(authModalView)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  // 학생 로그인 전용 state
  const [studentName, setStudentName] = useState('')
  const [studentPassword, setStudentPassword] = useState('')
  const [schools, setSchools] = useState<string[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedSchool, setSelectedSchool] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [studentHint, setStudentHint] = useState('')
  const [helpMessage, setHelpMessage] = useState('I forgot my name or password.')

  // PIN 로그인 전용 state
  const [pinCode, setPinCode] = useState('')
  const [pinClassCode, setPinClassCode] = useState('')
  const [pinTeacherName, setPinTeacherName] = useState('')
  const [pinDisplayName, setPinDisplayName] = useState('')

  // 모달이 열릴 때마다 view와 폼 상태를 authModalView로 리셋
  useEffect(() => {
    if (authModalOpen) {
      setView(authModalView)
      setEmail(''); setPassword(''); setPasswordConfirm(''); setDisplayName(''); setError(''); setResetSent(false)
      setStudentName(''); setStudentPassword(''); setSchools([]); setTeachers([]); setSelectedSchool(''); setSelectedTeacher(null)
      setStudentHint(''); setHelpMessage('I forgot my name or password.')
      setPinCode(''); setPinClassCode(''); setPinTeacherName(''); setPinDisplayName('')
    }
  }, [authModalOpen, authModalView])

  if (!authModalOpen) return null

  const resetForm = () => {
    setEmail(''); setPassword(''); setPasswordConfirm(''); setDisplayName(''); setError('')
  }

  const switchView = (v: View) => {
    resetForm()
    if (!v.startsWith('student')) {
      setStudentName(''); setStudentPassword(''); setSchools([]); setTeachers([]); setSelectedSchool(''); setSelectedTeacher(null)
      setStudentHint(''); setHelpMessage('I forgot my name or password.')
    }
    if (!v.startsWith('pin')) {
      setPinCode(''); setPinClassCode(''); setPinTeacherName(''); setPinDisplayName('')
    }
    setView(v)
  }

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pinCode.trim()) { setError('Please enter your PIN.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/pin/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Invalid PIN.'); return }
      setPinClassCode(data.classCode)
      setPinTeacherName(data.teacherName)
      setView('pin_name')
    } catch {
      setError('Network error. Please try again.')
    } finally { setLoading(false) }
  }

  const handlePinNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pinDisplayName.trim()) { setError('Please enter your name.'); return }
    setLoading(true); setError('')
    try {
      const cred = await signInAnonymously(auth)
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        displayName: pinDisplayName.trim(),
        role: 'student',
        classCode: pinClassCode,
        isAnonymous: true,
        createdAt: serverTimestamp(),
        profileCompleted: true,
      }, { merge: true })
      closeAuthModal()
    } catch {
      setError('Sign in failed. Please try again.')
    } finally { setLoading(false) }
  }

  const goToStudentLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/classroom/schools')
      const data = await res.json()
      setSchools(data.schools ?? [])
      setView('student')
    } catch {
      setError('Failed to load school list.')
    } finally { setLoading(false) }
  }

  const handleSchoolSelect = async (school: string) => {
    setSelectedSchool(school)
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/classroom/teachers?school=${encodeURIComponent(school)}`)
      const data = await res.json()
      setTeachers(data.teachers ?? [])
      setView('student_teacher')
    } catch {
      setError('Failed to load teacher list.')
    } finally { setLoading(false) }
  }

  const handleTeacherSelect = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setError('')
    setView('student_credentials')
  }

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentName.trim() || !studentPassword) { setError('Please enter your name and password.'); return }
    if (!selectedTeacher) return
    setLoading(true); setError('')
    try {
      const email = buildStudentEmail(selectedTeacher.classCode, studentName.trim())
      await signInStudent(email, studentPassword)
    } catch (e: any) {
      const code = e.code
      setError(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password'
          ? 'Incorrect password.'
          : code === 'auth/user-not-found'
          ? 'Name not registered. Please check with your teacher.'
          : e.message || 'Login failed.'
      )
    } finally { setLoading(false) }
  }

  const handleHelpRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeacher) return
    setLoading(true); setError('')
    try {
      await fetch('/api/classroom/help-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classCode: selectedTeacher.classCode, studentHint, message: helpMessage }),
      })
      setView('student_forgot_sent')
    } catch {
      setError('Failed to send request.')
    } finally { setLoading(false) }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try { await signInWithGoogle() } catch { setError('Google sign-in failed. Please try again.') }
    finally { setLoading(false) }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError('')
    try {
      await signInWithEmail(email, password)
    } catch (err: any) {
      if (err.message === 'EMAIL_NOT_VERIFIED') {
        setError('Email not verified. Please check your inbox.')
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Incorrect email or password.')
      } else {
        setError('Login failed. Please try again.')
      }
    } finally { setLoading(false) }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) { setError('Please enter your name.'); return }
    if (!email) { setError('Please enter your email.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== passwordConfirm) { setError('Passwords do not match.'); return }
    setLoading(true); setError('')
    try {
      await signUpWithEmail(email, password, displayName.trim())
      setView('verify_sent')
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
      } else {
        setError('Sign up failed. Please try again.')
      }
    } finally { setLoading(false) }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Please enter your email.'); return }
    setLoading(true); setError('')
    try {
      await sendPasswordReset(email)
      setResetSent(true)
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.')
      } else {
        setError('An error occurred. Please try again.')
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* 백드롭 */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeAuthModal} />

      <div className="relative w-full max-w-sm bg-[var(--bg-base)] rounded-3xl border border-[var(--border-default)] shadow-2xl overflow-hidden">
        {/* 닫기 */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-[var(--text-subtle)] hover:text-white transition-colors text-xl leading-none z-10"
        >✕</button>

        <div className="p-8">
          {/* 로고 */}
          <div className="text-center mb-7">
            <span className="text-2xl font-black tracking-tight">
              <span className="text-orange-400">SSOK</span><span className="text-white">TUBE</span>
            </span>
          </div>

          {/* ── 로그인 ── */}
          {view === 'login' && (
            <>
              <h2 className="text-lg font-bold text-white text-center mb-6">Log In</h2>

              {/* Google */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 bg-white hover:bg-zinc-100 text-black font-semibold text-sm rounded-2xl transition-colors disabled:opacity-50 mb-4"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[var(--overlay-default)]" />
                <span className="text-[11px] text-[var(--text-subtle)]">or</span>
                <div className="flex-1 h-px bg-[var(--overlay-default)]" />
              </div>

              <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 transition-colors"
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 transition-colors"
                />
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm transition-colors disabled:opacity-50 mt-1"
                >
                  {loading ? 'Logging in...' : 'Log In'}
                </button>
              </form>

              <button
                onClick={() => switchView('forgot')}
                className="w-full text-center text-xs text-[var(--text-subtle)] hover:text-white mt-3 transition-colors"
              >
                Forgot your password?
              </button>

              <p className="text-center text-xs text-[var(--text-subtle)] mt-4">
                Don't have an account?{' '}
                <button onClick={() => switchView('signup')} className="text-orange-400 hover:text-orange-300 font-semibold transition-colors">
                  Sign Up
                </button>
              </p>

              <div className="flex items-center gap-3 mt-5">
                <div className="flex-1 h-px bg-[var(--overlay-default)]" />
                <span className="text-[11px] text-[var(--text-subtle)]">Are you a student?</span>
                <div className="flex-1 h-px bg-[var(--overlay-default)]" />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={goToStudentLogin}
                  disabled={loading}
                  className="flex-1 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/60 text-blue-300 font-semibold text-sm rounded-2xl transition-all disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Student Login'}
                </button>
                <button
                  onClick={() => switchView('pin')}
                  disabled={loading}
                  className="flex-1 py-3 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 hover:border-violet-500/60 text-violet-300 font-semibold text-sm rounded-2xl transition-all disabled:opacity-50"
                >
                  PIN Login
                </button>
              </div>
            </>
          )}

          {/* ── 학생 로그인 Step 1: 학교 선택 ── */}
          {view === 'student' && (
            <>
              <button
                onClick={() => switchView('login')}
                className="flex items-center gap-1 text-xs text-[var(--text-subtle)] hover:text-white mb-5 transition-colors"
              >
                ← Back to Login
              </button>
              <h2 className="text-lg font-bold text-white text-center mb-1">Student Login</h2>
              <p className="text-[var(--text-subtle)] text-xs text-center mb-5">Select your school to continue.</p>
              {schools.length === 0 ? (
                <p className="text-[var(--text-subtle)] text-xs text-center py-4">No registered schools found.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {schools.map(school => (
                    <button
                      key={school}
                      onClick={() => handleSchoolSelect(school)}
                      disabled={loading}
                      className="w-full text-left px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-blue-500/50 hover:bg-blue-500/5 transition-all disabled:opacity-50"
                    >
                      <span className="font-semibold text-white text-sm">{school}</span>
                    </button>
                  ))}
                </div>
              )}
              {error && <p className="mt-3 text-red-400 text-xs text-center">{error}</p>}
            </>
          )}

          {/* ── 학생 로그인 Step 2: 선생님 선택 ── */}
          {view === 'student_teacher' && (
            <>
              <button
                onClick={() => { setView('student'); setError('') }}
                className="flex items-center gap-1 text-xs text-[var(--text-subtle)] hover:text-white mb-5 transition-colors"
              >
                ← Change School
              </button>
              <h2 className="text-lg font-bold text-white text-center mb-1">Select Your Teacher</h2>
              <p className="text-[var(--text-subtle)] text-xs text-center mb-5">
                Teachers at <span className="text-white font-semibold">{selectedSchool}</span>
              </p>
              <div className="flex flex-col gap-2">
                {teachers.map(t => (
                  <button
                    key={t.classCode}
                    onClick={() => handleTeacherSelect(t)}
                    className="w-full text-left px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
                  >
                    <span className="font-semibold text-white text-sm">{t.teacherName}</span>
                    <span className="ml-2 text-xs text-[var(--text-subtle)]">Grade {t.grade} · Class {t.classNum}</span>
                  </button>
                ))}
              </div>
              {error && <p className="mt-3 text-red-400 text-xs text-center">{error}</p>}
            </>
          )}

          {/* ── 학생 로그인 Step 3: 이름 + 비밀번호 ── */}
          {view === 'student_credentials' && (
            <>
              <button
                onClick={() => { setView('student_teacher'); setError('') }}
                className="flex items-center gap-1 text-xs text-[var(--text-subtle)] hover:text-white mb-5 transition-colors"
              >
                ← Change Teacher
              </button>
              <div className="mb-5 text-center">
                <p className="text-xs text-[var(--text-subtle)]">{selectedSchool}</p>
                <h2 className="text-base font-bold text-white">{selectedTeacher?.teacherName}'s Class</h2>
                <p className="text-xs text-[var(--text-subtle)]">Grade {selectedTeacher?.grade} · Class {selectedTeacher?.classNum}</p>
              </div>
              <form onSubmit={handleStudentLogin} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                <input
                  type="password"
                  value={studentPassword}
                  onChange={e => setStudentPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition-colors disabled:opacity-50 mt-1"
                >
                  {loading ? 'Logging in...' : 'Log In'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <button
                  onClick={() => { setView('student_forgot'); setError('') }}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                >
                  Ask {selectedTeacher?.teacherName} for help →
                </button>
              </div>
            </>
          )}

          {/* ── 학생 로그인 Step 4: 도움 요청 ── */}
          {view === 'student_forgot' && (
            <>
              <button
                onClick={() => { setView('student_credentials'); setError('') }}
                className="flex items-center gap-1 text-xs text-[var(--text-subtle)] hover:text-white mb-5 transition-colors"
              >
                ← Go Back
              </button>
              <h2 className="text-base font-bold text-white text-center mb-1">Ask Your Teacher for Help</h2>
              <p className="text-[var(--text-subtle)] text-xs text-center mb-5">
                Your message will be sent to <span className="text-white font-semibold">{selectedTeacher?.teacherName}</span>.
              </p>
              <form onSubmit={handleHelpRequest} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={studentHint}
                  onChange={e => setStudentHint(e.target.value)}
                  placeholder="Your name (optional, if you remember)"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                <select
                  value={helpMessage}
                  onChange={e => setHelpMessage(e.target.value)}
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                >
                  <option value="I forgot my name or password.">I forgot my name or password.</option>
                  <option value="I forgot my password.">I forgot my password.</option>
                  <option value="I forgot my registered name.">I forgot my registered name.</option>
                </select>
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition-colors disabled:opacity-50 mt-1"
                >
                  {loading ? 'Sending...' : 'Send Request to Teacher'}
                </button>
              </form>
            </>
          )}

          {/* ── 학생 로그인 Step 5: 요청 완료 ── */}
          {view === 'student_forgot_sent' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="text-4xl">📩</div>
              <h2 className="text-base font-bold text-white">Request Sent!</h2>
              <p className="text-[var(--text-subtle)] text-xs leading-relaxed">
                Your help request has been sent to<br/>
                <span className="text-white font-semibold">{selectedTeacher?.teacherName}</span>.
              </p>
              <button
                onClick={() => setView('student_credentials')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition-colors mt-2"
              >
                Back to Login
              </button>
            </div>
          )}

          {/* ── 회원가입 ── */}
          {view === 'signup' && (
            <>
              <h2 className="text-lg font-bold text-white text-center mb-6">Sign Up</h2>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 bg-white hover:bg-zinc-100 text-black font-semibold text-sm rounded-2xl transition-colors disabled:opacity-50 mb-4"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[var(--overlay-default)]" />
                <span className="text-[11px] text-[var(--text-subtle)]">or sign up with email</span>
                <div className="flex-1 h-px bg-[var(--overlay-default)]" />
              </div>

              <form onSubmit={handleSignUp} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 transition-colors"
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 transition-colors"
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password (min. 6 characters)"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 transition-colors"
                />
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 transition-colors"
                />
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm transition-colors disabled:opacity-50 mt-1"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              <p className="text-center text-xs text-[var(--text-subtle)] mt-4">
                Already have an account?{' '}
                <button onClick={() => switchView('login')} className="text-orange-400 hover:text-orange-300 font-semibold transition-colors">
                  Log In
                </button>
              </p>
            </>
          )}

          {/* ── 이메일 인증 발송 완료 ── */}
          {view === 'verify_sent' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="text-5xl">📧</div>
              <h2 className="text-lg font-bold text-white text-center">Check your email</h2>
              <p className="text-[var(--text-muted)] text-sm text-center leading-relaxed">
                We sent a verification link to<br/>
                <span className="text-orange-400 font-semibold">{email}</span>.<br/>
                Click the link to complete your sign-up.
              </p>
              <p className="text-[var(--text-subtle)] text-xs text-center">Don't forget to check your spam folder</p>
              <button
                onClick={() => switchView('login')}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm transition-colors mt-2"
              >
                Go to Login
              </button>
            </div>
          )}

          {/* ── PIN 로그인 Step 1: PIN 입력 ── */}
          {view === 'pin' && (
            <>
              <button
                onClick={() => switchView('login')}
                className="flex items-center gap-1 text-xs text-[var(--text-subtle)] hover:text-white mb-5 transition-colors"
              >
                ← Back to Login
              </button>
              <h2 className="text-lg font-bold text-white text-center mb-1">PIN Login</h2>
              <p className="text-[var(--text-subtle)] text-xs text-center mb-5">Enter the PIN code from your teacher.</p>
              <form onSubmit={handlePinSubmit} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={pinCode}
                  onChange={e => setPinCode(e.target.value)}
                  placeholder="Enter PIN code"
                  maxLength={8}
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white text-center tracking-widest placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-violet-500/50 transition-colors"
                />
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !pinCode.trim()}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl text-sm transition-colors disabled:opacity-50 mt-1"
                >
                  {loading ? 'Checking...' : 'Next →'}
                </button>
              </form>
            </>
          )}

          {/* ── PIN 로그인 Step 2: 이름 입력 ── */}
          {view === 'pin_name' && (
            <>
              <button
                onClick={() => { setView('pin'); setError('') }}
                className="flex items-center gap-1 text-xs text-[var(--text-subtle)] hover:text-white mb-5 transition-colors"
              >
                ← Change PIN
              </button>
              <div className="mb-5 text-center">
                <div className="text-3xl mb-2">👋</div>
                <h2 className="text-base font-bold text-white">{pinTeacherName ? `${pinTeacherName}'s Class` : 'Class Found!'}</h2>
                <p className="text-xs text-[var(--text-subtle)] mt-1">Enter your name to join.</p>
              </div>
              <form onSubmit={handlePinNameSubmit} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={pinDisplayName}
                  onChange={e => setPinDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-violet-500/50 transition-colors"
                />
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !pinDisplayName.trim()}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl text-sm transition-colors disabled:opacity-50 mt-1"
                >
                  {loading ? 'Joining...' : 'Join Class'}
                </button>
              </form>
            </>
          )}

          {/* ── 비밀번호 찾기 ── */}
          {view === 'forgot' && (
            <>
              <h2 className="text-lg font-bold text-white text-center mb-2">Reset Password</h2>
              <p className="text-[var(--text-muted)] text-xs text-center mb-6">
                Enter your email and we'll send you a reset link.
              </p>

              {resetSent ? (
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="text-4xl">✉️</div>
                  <p className="text-white text-sm text-center">
                    We sent a reset link to<br/>
                    <span className="text-orange-400 font-semibold">{email}</span>.
                  </p>
                  <button
                    onClick={() => { setResetSent(false); switchView('login') }}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm transition-colors mt-2"
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="flex flex-col gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Your email address"
                    className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 transition-colors"
                  />
                  {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm transition-colors disabled:opacity-50 mt-1"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="w-full text-center text-xs text-[var(--text-subtle)] hover:text-white transition-colors"
                  >
                    Back to Login
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
