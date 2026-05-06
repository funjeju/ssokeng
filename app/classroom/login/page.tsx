'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { buildStudentEmail } from '@/lib/classroom'
import Header from '@/components/common/Header'
import Link from 'next/link'

type Step = 'school' | 'teacher' | 'credentials' | 'forgot' | 'forgot_sent'

interface Teacher {
  classCode: string
  teacherName: string
  grade: number
  classNum: number
}

export default function StudentLoginPage() {
  const { signInStudent } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState<Step>('school')
  const [schools, setSchools] = useState<string[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedSchool, setSelectedSchool] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)

  const [studentName, setStudentName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 도움 요청
  const [studentHint, setStudentHint] = useState('')
  const [helpMessage, setHelpMessage] = useState('이름 또는 비밀번호를 잊어버렸습니다.')

  useEffect(() => {
    fetch('/api/classroom/schools')
      .then(r => r.json())
      .then(d => setSchools(d.schools ?? []))
  }, [])

  const handleSchoolSelect = async (school: string) => {
    setSelectedSchool(school)
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/classroom/teachers?school=${encodeURIComponent(school)}`)
      const data = await res.json()
      setTeachers(data.teachers ?? [])
      setStep('teacher')
    } catch {
      setError('선생님 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleTeacherSelect = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setError('')
    setStep('credentials')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentName.trim() || !password) { setError('이름과 비밀번호를 입력해주세요.'); return }
    if (!selectedTeacher) return
    setLoading(true); setError('')
    try {
      const email = buildStudentEmail(selectedTeacher.classCode, studentName.trim())
      await signInStudent(email, password)
      router.push('/mypage')
    } catch (e: any) {
      const code = e.code
      setError(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password'
          ? '비밀번호가 올바르지 않습니다.'
          : code === 'auth/user-not-found'
          ? '등록되지 않은 이름입니다. 선생님께 확인하세요.'
          : e.message || '로그인에 실패했습니다.'
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
        body: JSON.stringify({
          classCode: selectedTeacher.classCode,
          studentHint,
          message: helpMessage,
        }),
      })
      setStep('forgot_sent')
    } catch {
      setError('요청 전송 중 오류가 발생했습니다.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-white">
      <Header title="학생 로그인" />
      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-[var(--bg-surface)] rounded-[28px] border border-[var(--border-default)] p-8">

          {/* ── Step 1: 학교 선택 ── */}
          {step === 'school' && (
            <>
              <h1 className="text-2xl font-black mb-1">학생 로그인</h1>
              <p className="text-gray-400 text-sm mb-6">먼저 학교를 선택해주세요.</p>
              {schools.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">등록된 학교가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {schools.map(school => (
                    <button
                      key={school}
                      onClick={() => handleSchoolSelect(school)}
                      disabled={loading}
                      className="w-full text-left px-4 py-4 rounded-xl border border-[var(--border-default)] hover:border-orange-500/50 hover:bg-orange-500/5 transition-all disabled:opacity-50"
                    >
                      <span className="font-bold text-white">{school}</span>
                    </button>
                  ))}
                </div>
              )}
              {error && <p className="mt-4 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
              <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] text-center">
                <p className="text-xs text-gray-500">
                  처음 참여하는 학생이라면{' '}
                  <Link href="/classroom/join" className="text-orange-400 hover:underline">여기서 가입</Link>
                </p>
              </div>
            </>
          )}

          {/* ── Step 2: 선생님 선택 ── */}
          {step === 'teacher' && (
            <>
              <button onClick={() => { setStep('school'); setError('') }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white mb-6 transition-colors">
                ← 학교 다시 선택
              </button>
              <h1 className="text-xl font-black mb-1">선생님을 선택해주세요</h1>
              <p className="text-gray-400 text-sm mb-6">
                <span className="text-white font-bold">{selectedSchool}</span>의 담임 선생님을 선택하세요.
              </p>
              <div className="space-y-2">
                {teachers.map(t => (
                  <button
                    key={t.classCode}
                    onClick={() => handleTeacherSelect(t)}
                    className="w-full text-left px-4 py-4 rounded-xl border border-[var(--border-default)] hover:border-orange-500/50 hover:bg-orange-500/5 transition-all"
                  >
                    <span className="font-bold text-white">{t.teacherName} 선생님</span>
                    <span className="ml-2 text-xs text-gray-400">{t.grade}학년 {t.classNum}반</span>
                  </button>
                ))}
              </div>
              {error && <p className="mt-4 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
            </>
          )}

          {/* ── Step 3: 이름 + 비밀번호 ── */}
          {step === 'credentials' && (
            <>
              <button onClick={() => { setStep('teacher'); setError('') }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white mb-6 transition-colors">
                ← 선생님 다시 선택
              </button>
              <div className="mb-6">
                <p className="text-xs text-gray-500">{selectedSchool}</p>
                <h1 className="text-xl font-black">{selectedTeacher?.teacherName} 선생님 반</h1>
                <p className="text-xs text-gray-400 mt-0.5">{selectedTeacher?.grade}학년 {selectedTeacher?.classNum}반</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">이름</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    placeholder="본인 이름"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">비밀번호</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="비밀번호"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {loading ? '로그인 중...' : '로그인'}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] text-center">
                <p className="text-xs text-gray-500 mb-2">이름이나 비밀번호를 잊으셨나요?</p>
                <button
                  onClick={() => { setStep('forgot'); setError('') }}
                  className="text-xs text-orange-400 hover:text-orange-300 hover:underline transition-colors"
                >
                  {selectedTeacher?.teacherName} 선생님께 도움 요청하기 →
                </button>
              </div>
            </>
          )}

          {/* ── Step 4: 도움 요청 ── */}
          {step === 'forgot' && (
            <>
              <button onClick={() => { setStep('credentials'); setError('') }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white mb-6 transition-colors">
                ← 돌아가기
              </button>
              <h1 className="text-xl font-black mb-1">선생님께 도움 요청</h1>
              <p className="text-gray-400 text-sm mb-6">
                <span className="text-white font-bold">{selectedTeacher?.teacherName} 선생님</span>께
                요청이 전달됩니다.
              </p>

              <form onSubmit={handleHelpRequest} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">이름 (기억나는 경우)</label>
                  <input
                    type="text"
                    value={studentHint}
                    onChange={e => setStudentHint(e.target.value)}
                    placeholder="본인 이름 (선택사항)"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">요청 내용</label>
                  <select
                    value={helpMessage}
                    onChange={e => setHelpMessage(e.target.value)}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="이름 또는 비밀번호를 잊어버렸습니다.">이름 또는 비밀번호를 잊어버렸습니다.</option>
                    <option value="비밀번호를 잊어버렸습니다.">비밀번호를 잊어버렸습니다.</option>
                    <option value="등록된 이름을 잊어버렸습니다.">등록된 이름을 잊어버렸습니다.</option>
                  </select>
                </div>
                {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {loading ? '전송 중...' : '선생님께 요청 보내기'}
                </button>
              </form>
            </>
          )}

          {/* ── Step 5: 요청 완료 ── */}
          {step === 'forgot_sent' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="text-5xl">📩</div>
              <h2 className="text-lg font-bold">요청이 전달됐어요!</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                <span className="text-white font-bold">{selectedTeacher?.teacherName} 선생님</span>께<br/>
                도움 요청이 전송됐습니다.<br/>
                선생님께 직접 확인해보세요.
              </p>
              <button
                onClick={() => setStep('credentials')}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-sm transition-colors mt-2"
              >
                다시 로그인하기
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
