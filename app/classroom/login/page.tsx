'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { buildStudentEmail } from '@/lib/classroom'
import Header from '@/components/common/Header'
import Link from 'next/link'

interface LookupResult {
  classCode: string
  schoolName: string
  teacherName: string
  grade: number
  classNum: number
}

export default function StudentLoginPage() {
  const { signInStudent } = useAuth()
  const router = useRouter()

  const [studentName, setStudentName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 동명이인 disambiguation
  const [step, setStep] = useState<'input' | 'school' | 'teacher'>('input')
  const [results, setResults] = useState<LookupResult[]>([])
  const [selectedSchool, setSelectedSchool] = useState('')
  const [selectedClassCode, setSelectedClassCode] = useState('')

  const uniqueSchools = [...new Set(results.map(r => r.schoolName).filter(Boolean))]

  const filteredBySchool = selectedSchool
    ? results.filter(r => r.schoolName === selectedSchool)
    : results

  async function doLogin(classCode: string, name: string, pw: string) {
    const email = buildStudentEmail(classCode, name.trim())
    await signInStudent(email, pw)
    router.push('/mypage')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!studentName.trim() || !password) {
      setError('이름과 비밀번호를 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/classroom/lookup-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName: studentName.trim() }),
      })
      const data = await res.json()
      const found: LookupResult[] = data.results ?? []

      if (found.length === 0) {
        setError('해당 이름의 학생을 찾을 수 없습니다. 선생님께 확인하세요.')
        return
      }

      if (found.length === 1) {
        await doLogin(found[0].classCode, studentName, password)
        return
      }

      // 동명이인 — 학교 선택 단계
      setResults(found)
      setSelectedSchool('')
      setSelectedClassCode('')
      setStep('school')
    } catch (e: any) {
      const code = e.code
      const msg = code === 'auth/invalid-credential' || code === 'auth/wrong-password'
        ? '비밀번호가 올바르지 않습니다.'
        : e.message || '로그인에 실패했습니다.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSchoolSelect = (school: string) => {
    setSelectedSchool(school)
    setError('')
    const inSchool = results.filter(r => r.schoolName === school)
    if (inSchool.length === 1) {
      // 학교 선택만으로 특정 됨 → 바로 로그인
      setLoading(true)
      doLogin(inSchool[0].classCode, studentName, password)
        .catch(e => {
          const msg = e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password'
            ? '비밀번호가 올바르지 않습니다.'
            : e.message || '로그인에 실패했습니다.'
          setError(msg)
          setStep('school')
        })
        .finally(() => setLoading(false))
    } else {
      setStep('teacher')
    }
  }

  const handleTeacherSelect = async (classCode: string) => {
    setSelectedClassCode(classCode)
    setError('')
    setLoading(true)
    try {
      await doLogin(classCode, studentName, password)
    } catch (e: any) {
      const msg = e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password'
        ? '비밀번호가 올바르지 않습니다.'
        : e.message || '로그인에 실패했습니다.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-white">
      <Header title="📖 학생 로그인" />
      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-[var(--bg-surface)] rounded-[28px] border border-[var(--border-default)] p-8">

          {/* ── Step 1: 이름 + 비밀번호 ── */}
          {step === 'input' && (
            <>
              <h1 className="text-2xl font-black mb-2">학생 로그인</h1>
              <p className="text-gray-400 text-sm mb-8">이름과 비밀번호로 로그인하세요.</p>

              <form onSubmit={handleSubmit} className="space-y-5">
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
                  {loading ? '확인 중...' : '로그인'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] text-center">
                <p className="text-xs text-gray-500">
                  처음 참여하는 학생이라면{' '}
                  <Link href="/classroom/join" className="text-orange-400 hover:underline">여기서 가입</Link>
                </p>
              </div>
            </>
          )}

          {/* ── Step 2: 학교 선택 ── */}
          {step === 'school' && (
            <>
              <button
                onClick={() => { setStep('input'); setError('') }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white mb-6 transition-colors"
              >
                ← 이름 다시 입력
              </button>
              <h1 className="text-xl font-black mb-1">학교를 선택해주세요</h1>
              <p className="text-gray-400 text-sm mb-6">같은 이름의 학생이 여러 반에 있어요.</p>

              <div className="space-y-2">
                {uniqueSchools.map(school => (
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

              {error && <p className="mt-4 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
            </>
          )}

          {/* ── Step 3: 선생님 선택 ── */}
          {step === 'teacher' && (
            <>
              <button
                onClick={() => { setStep('school'); setSelectedSchool(''); setError('') }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white mb-6 transition-colors"
              >
                ← 학교 다시 선택
              </button>
              <h1 className="text-xl font-black mb-1">선생님을 선택해주세요</h1>
              <p className="text-gray-400 text-sm mb-6">
                <span className="text-white font-bold">{selectedSchool}</span>에 같은 이름의 학생이 여러 반에 있어요.
              </p>

              <div className="space-y-2">
                {filteredBySchool.map(r => (
                  <button
                    key={r.classCode}
                    onClick={() => handleTeacherSelect(r.classCode)}
                    disabled={loading}
                    className="w-full text-left px-4 py-4 rounded-xl border border-[var(--border-default)] hover:border-orange-500/50 hover:bg-orange-500/5 transition-all disabled:opacity-50"
                  >
                    <span className="font-bold text-white">{r.teacherName} 선생님</span>
                    <span className="ml-2 text-xs text-gray-400">{r.grade}학년 {r.classNum}반</span>
                  </button>
                ))}
              </div>

              {error && <p className="mt-4 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
            </>
          )}

        </div>
      </main>
    </div>
  )
}
