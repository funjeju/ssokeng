'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { buildStudentEmail } from '@/lib/classroom'

type View = 'login' | 'signup' | 'forgot' | 'verify_sent' | 'student' | 'student_school' | 'student_teacher'

interface StudentLookupResult {
  classCode: string
  schoolName: string
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
  const [studentResults, setStudentResults] = useState<StudentLookupResult[]>([])
  const [selectedSchool, setSelectedSchool] = useState('')

  // 모달이 열릴 때마다 view와 폼 상태를 authModalView로 리셋
  useEffect(() => {
    if (authModalOpen) {
      setView(authModalView)
      setEmail(''); setPassword(''); setPasswordConfirm(''); setDisplayName(''); setError(''); setResetSent(false)
      setStudentName(''); setStudentPassword(''); setStudentResults([]); setSelectedSchool('')
    }
  }, [authModalOpen, authModalView])

  if (!authModalOpen) return null

  const resetForm = () => {
    setEmail(''); setPassword(''); setPasswordConfirm(''); setDisplayName(''); setError('')
  }

  const switchView = (v: View) => {
    resetForm()
    if (v !== 'student' && v !== 'student_school' && v !== 'student_teacher') {
      setStudentName(''); setStudentPassword(''); setStudentResults([]); setSelectedSchool('')
    }
    setView(v)
  }

  const doStudentLogin = async (classCode: string) => {
    const email = buildStudentEmail(classCode, studentName.trim())
    await signInStudent(email, studentPassword)
  }

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!studentName.trim() || !studentPassword) { setError('이름과 비밀번호를 입력해주세요.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/classroom/lookup-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName: studentName.trim() }),
      })
      const data = await res.json()
      const found: StudentLookupResult[] = data.results ?? []
      if (found.length === 0) { setError('해당 이름의 학생을 찾을 수 없습니다. 선생님께 확인하세요.'); return }
      if (found.length === 1) { await doStudentLogin(found[0].classCode); return }
      setStudentResults(found)
      setSelectedSchool('')
      setView('student_school')
    } catch (e: any) {
      const code = e.code
      setError(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password'
          ? '비밀번호가 올바르지 않습니다.'
          : e.message || '로그인에 실패했습니다.'
      )
    } finally { setLoading(false) }
  }

  const handleSchoolSelect = (school: string) => {
    setSelectedSchool(school)
    setError('')
    const inSchool = studentResults.filter(r => r.schoolName === school)
    if (inSchool.length === 1) {
      setLoading(true)
      doStudentLogin(inSchool[0].classCode)
        .catch(e => {
          setError(e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' ? '비밀번호가 올바르지 않습니다.' : e.message || '로그인에 실패했습니다.')
          setView('student_school')
        })
        .finally(() => setLoading(false))
    } else {
      setView('student_teacher')
    }
  }

  const handleTeacherSelect = async (classCode: string) => {
    setError('')
    setLoading(true)
    try {
      await doStudentLogin(classCode)
    } catch (e: any) {
      setError(e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' ? '비밀번호가 올바르지 않습니다.' : e.message || '로그인에 실패했습니다.')
    } finally { setLoading(false) }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try { await signInWithGoogle() } catch { setError('Google 로그인 중 오류가 발생했습니다.') }
    finally { setLoading(false) }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('이메일과 비밀번호를 입력해주세요.'); return }
    setLoading(true); setError('')
    try {
      await signInWithEmail(email, password)
    } catch (err: any) {
      if (err.message === 'EMAIL_NOT_VERIFIED') {
        setError('이메일 인증이 완료되지 않았습니다. 받은 메일함을 확인해주세요.')
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else {
        setError('로그인 중 오류가 발생했습니다.')
      }
    } finally { setLoading(false) }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) { setError('이름(닉네임)을 입력해주세요.'); return }
    if (!email) { setError('이메일을 입력해주세요.'); return }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return }
    if (password !== passwordConfirm) { setError('비밀번호가 일치하지 않습니다.'); return }
    setLoading(true); setError('')
    try {
      await signUpWithEmail(email, password, displayName.trim())
      setView('verify_sent')
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('이미 사용 중인 이메일입니다.')
      } else if (err.code === 'auth/invalid-email') {
        setError('올바른 이메일 형식이 아닙니다.')
      } else {
        setError('회원가입 중 오류가 발생했습니다.')
      }
    } finally { setLoading(false) }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('이메일을 입력해주세요.'); return }
    setLoading(true); setError('')
    try {
      await sendPasswordReset(email)
      setResetSent(true)
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('등록되지 않은 이메일입니다.')
      } else {
        setError('오류가 발생했습니다. 다시 시도해주세요.')
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
              <h2 className="text-lg font-bold text-white text-center mb-6">로그인</h2>

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
                Google로 로그인
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[var(--overlay-default)]" />
                <span className="text-[11px] text-[var(--text-subtle)]">또는</span>
                <div className="flex-1 h-px bg-[var(--overlay-default)]" />
              </div>

              <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="이메일"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 transition-colors"
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 transition-colors"
                />
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm transition-colors disabled:opacity-50 mt-1"
                >
                  {loading ? '로그인 중...' : '로그인'}
                </button>
              </form>

              <button
                onClick={() => switchView('forgot')}
                className="w-full text-center text-xs text-[var(--text-subtle)] hover:text-white mt-3 transition-colors"
              >
                비밀번호를 잊으셨나요?
              </button>

              <p className="text-center text-xs text-[var(--text-subtle)] mt-4">
                계정이 없으신가요?{' '}
                <button onClick={() => switchView('signup')} className="text-orange-400 hover:text-orange-300 font-semibold transition-colors">
                  회원가입
                </button>
              </p>

              <div className="flex items-center gap-3 mt-5">
                <div className="flex-1 h-px bg-[var(--overlay-default)]" />
                <span className="text-[11px] text-[var(--text-subtle)]">학생이라면</span>
                <div className="flex-1 h-px bg-[var(--overlay-default)]" />
              </div>
              <button
                onClick={() => switchView('student')}
                className="w-full mt-3 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/60 text-blue-300 font-semibold text-sm rounded-2xl transition-all"
              >
                학생 로그인
              </button>
            </>
          )}

          {/* ── 학생 로그인 Step 1: 이름 + 비밀번호 ── */}
          {view === 'student' && (
            <>
              <button
                onClick={() => switchView('login')}
                className="flex items-center gap-1 text-xs text-[var(--text-subtle)] hover:text-white mb-5 transition-colors"
              >
                ← 일반 로그인
              </button>
              <h2 className="text-lg font-bold text-white text-center mb-1">학생 로그인</h2>
              <p className="text-[var(--text-subtle)] text-xs text-center mb-6">이름과 선생님이 알려준 비밀번호로 로그인하세요.</p>

              <form onSubmit={handleStudentSubmit} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="본인 이름"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                <input
                  type="password"
                  value={studentPassword}
                  onChange={e => setStudentPassword(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-blue-500/50 transition-colors"
                />
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition-colors disabled:opacity-50 mt-1"
                >
                  {loading ? '확인 중...' : '로그인'}
                </button>
              </form>
            </>
          )}

          {/* ── 학생 로그인 Step 2: 학교 선택 ── */}
          {view === 'student_school' && (() => {
            const uniqueSchools = [...new Set(studentResults.map(r => r.schoolName).filter(Boolean))]
            return (
              <>
                <button
                  onClick={() => { setView('student'); setError('') }}
                  className="flex items-center gap-1 text-xs text-[var(--text-subtle)] hover:text-white mb-5 transition-colors"
                >
                  ← 이름 다시 입력
                </button>
                <h2 className="text-lg font-bold text-white text-center mb-1">학교를 선택해주세요</h2>
                <p className="text-[var(--text-subtle)] text-xs text-center mb-5">같은 이름의 학생이 여러 반에 있어요.</p>
                <div className="flex flex-col gap-2">
                  {uniqueSchools.map(school => (
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
                {error && <p className="mt-3 text-red-400 text-xs text-center">{error}</p>}
              </>
            )
          })()}

          {/* ── 학생 로그인 Step 3: 선생님 선택 ── */}
          {view === 'student_teacher' && (() => {
            const filtered = studentResults.filter(r => r.schoolName === selectedSchool)
            return (
              <>
                <button
                  onClick={() => { setView('student_school'); setSelectedSchool(''); setError('') }}
                  className="flex items-center gap-1 text-xs text-[var(--text-subtle)] hover:text-white mb-5 transition-colors"
                >
                  ← 학교 다시 선택
                </button>
                <h2 className="text-lg font-bold text-white text-center mb-1">선생님을 선택해주세요</h2>
                <p className="text-[var(--text-subtle)] text-xs text-center mb-5">
                  <span className="text-white font-semibold">{selectedSchool}</span>에 같은 이름의 학생이 여러 반에 있어요.
                </p>
                <div className="flex flex-col gap-2">
                  {filtered.map(r => (
                    <button
                      key={r.classCode}
                      onClick={() => handleTeacherSelect(r.classCode)}
                      disabled={loading}
                      className="w-full text-left px-4 py-3.5 rounded-xl border border-[var(--border-default)] hover:border-blue-500/50 hover:bg-blue-500/5 transition-all disabled:opacity-50"
                    >
                      <span className="font-semibold text-white text-sm">{r.teacherName} 선생님</span>
                      <span className="ml-2 text-xs text-[var(--text-subtle)]">{r.grade}학년 {r.classNum}반</span>
                    </button>
                  ))}
                </div>
                {error && <p className="mt-3 text-red-400 text-xs text-center">{error}</p>}
              </>
            )
          })()}

          {/* ── 회원가입 ── */}
          {view === 'signup' && (
            <>
              <h2 className="text-lg font-bold text-white text-center mb-6">회원가입</h2>

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
                Google로 가입하기
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[var(--overlay-default)]" />
                <span className="text-[11px] text-[var(--text-subtle)]">또는 이메일로 가입</span>
                <div className="flex-1 h-px bg-[var(--overlay-default)]" />
              </div>

              <form onSubmit={handleSignUp} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="이름 (닉네임)"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 transition-colors"
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="이메일"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 transition-colors"
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="비밀번호 (6자 이상)"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 transition-colors"
                />
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호 확인"
                  className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 transition-colors"
                />
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm transition-colors disabled:opacity-50 mt-1"
                >
                  {loading ? '처리 중...' : '가입 완료'}
                </button>
              </form>

              <p className="text-center text-xs text-[var(--text-subtle)] mt-4">
                이미 계정이 있으신가요?{' '}
                <button onClick={() => switchView('login')} className="text-orange-400 hover:text-orange-300 font-semibold transition-colors">
                  로그인
                </button>
              </p>
            </>
          )}

          {/* ── 이메일 인증 발송 완료 ── */}
          {view === 'verify_sent' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="text-5xl">📧</div>
              <h2 className="text-lg font-bold text-white text-center">이메일을 확인해주세요</h2>
              <p className="text-[var(--text-muted)] text-sm text-center leading-relaxed">
                <span className="text-orange-400 font-semibold">{email}</span>로<br/>
                인증 메일을 보냈습니다.<br/>
                메일의 링크를 클릭하면 가입이 완료됩니다.
              </p>
              <p className="text-[var(--text-subtle)] text-xs text-center">스팸 폴더도 확인해보세요</p>
              <button
                onClick={() => switchView('login')}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm transition-colors mt-2"
              >
                로그인 하러 가기
              </button>
            </div>
          )}

          {/* ── 비밀번호 찾기 ── */}
          {view === 'forgot' && (
            <>
              <h2 className="text-lg font-bold text-white text-center mb-2">비밀번호 재설정</h2>
              <p className="text-[var(--text-muted)] text-xs text-center mb-6">
                가입한 이메일을 입력하면 재설정 링크를 보내드립니다.
              </p>

              {resetSent ? (
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="text-4xl">✉️</div>
                  <p className="text-white text-sm text-center">
                    <span className="text-orange-400 font-semibold">{email}</span>로<br/>
                    재설정 링크를 보냈습니다.
                  </p>
                  <button
                    onClick={() => { setResetSent(false); switchView('login') }}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm transition-colors mt-2"
                  >
                    로그인으로 돌아가기
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="flex flex-col gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="가입한 이메일"
                    className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 transition-colors"
                  />
                  {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm transition-colors disabled:opacity-50 mt-1"
                  >
                    {loading ? '발송 중...' : '재설정 링크 보내기'}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="w-full text-center text-xs text-[var(--text-subtle)] hover:text-white transition-colors"
                  >
                    로그인으로 돌아가기
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
