'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import Header from '@/components/common/Header'
import Link from 'next/link'
import SchoolSearchInput, { SchoolResult } from '@/components/classroom/SchoolSearchInput'

export default function ClassroomSetupPage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  const [selectedSchool, setSelectedSchool] = useState<SchoolResult | null>(null)
  const [grade, setGrade] = useState('')
  const [classNum, setClassNum] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSchool) { setError('학교를 목록에서 선택해주세요.'); return }
    if (!grade || !classNum) { setError('학년과 반을 선택해주세요.'); return }
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/classroom/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user!.uid,
          teacherName: userProfile?.displayName || user!.displayName || '',
          schoolName: selectedSchool.name,
          schoolCode: selectedSchool.code,
          schoolType: selectedSchool.type,
          region: selectedSchool.region,
          grade: Number(grade),
          classNum: Number(classNum),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/classroom/${data.classCode}`)
    } catch (e: any) {
      setError(e.message || '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500" />
    </div>
  )

  if (!user) return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-6 text-center">
      <p className="text-white mb-4">로그인이 필요합니다.</p>
      <Link href="/" className="text-orange-400 underline">홈으로</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-white">
      <Header title="🏫 클래스 만들기" />
      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-[var(--bg-surface)] rounded-[28px] border border-[var(--border-default)] p-8">
          <h1 className="text-2xl font-black mb-2">새 클래스 개설</h1>
          <p className="text-gray-400 text-sm mb-8">학교·학년·반 정보를 입력하면 학생들과 공유할 고유 코드가 발급됩니다.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">학교명</label>
              <SchoolSearchInput value={selectedSchool} onChange={setSelectedSchool} accentColor="orange" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">학년</label>
                <select value={grade} onChange={e => setGrade(e.target.value)}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors">
                  <option value="">선택</option>
                  {[1,2,3,4,5,6].map(g => <option key={g} value={g}>{g}학년</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">반</label>
                <select value={classNum} onChange={e => setClassNum(e.target.value)}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors">
                  <option value="">선택</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}반</option>)}
                </select>
              </div>
            </div>

            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}

            <button type="submit" disabled={submitting || !selectedSchool}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
              {submitting ? '생성 중...' : '클래스 코드 발급하기'}
            </button>
          </form>

          <p className="mt-5 text-center text-[10px] text-gray-600">학교 정보 출처: 교육부 나이스 학교정보 공개 포털</p>
        </div>
      </main>
    </div>
  )
}
