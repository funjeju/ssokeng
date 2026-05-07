'use client'

import { useState, Suspense } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useRouter, useSearchParams } from 'next/navigation'
import { buildStudentEmail } from '@/lib/classroom'
import Header from '@/components/common/Header'
import Link from 'next/link'

type Step = 'form' | 'loading' | 'done'

function ClassroomJoinForm() {
  const { signInStudent } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [classCode, setClassCode] = useState((searchParams.get('code') ?? '').toUpperCase())
  const [studentName, setStudentName] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [error, setError] = useState('')
  const [teacherName, setTeacherName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!classCode.trim() || !studentName.trim() || !password) {
      setError('Please fill in all fields.')
      return
    }
    setStep('loading')

    try {
      // 1. 서버에서 Firebase Auth 계정 생성 + Firestore 문서 생성
      const res = await fetch('/api/classroom/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classCode: classCode.trim(), studentName: studentName.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setTeacherName(data.teacherName || '')

      // 2. 생성된 계정으로 로그인
      const email = buildStudentEmail(classCode.trim().toUpperCase(), studentName.trim())
      await signInStudent(email, password)

      // 3. 폴더 상속은 서버(enroll API)에서 Admin SDK로 처리 완료

      setStep('done')
      setTimeout(() => router.push('/mypage'), 2000)
    } catch (e: any) {
      setError(e.message || 'An error occurred.')
      setStep('form')
    }
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
        <p className="text-gray-400 text-sm">Creating your account...</p>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="text-5xl mb-2">🎉</div>
        <h2 className="text-xl font-black text-white">You're in!</h2>
        <p className="text-gray-400 text-sm">
          {teacherName ? `${teacherName}'s ` : ''}class materials have been added to your page.
        </p>
        <p className="text-gray-600 text-xs">Redirecting...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-white">
      <Header title="Join a Class" />
      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-[var(--bg-surface)] rounded-[28px] border border-[var(--border-default)] p-8">
          <h1 className="text-2xl font-black mb-2">Join Class</h1>
          <p className="text-gray-400 text-sm mb-8">Enter the class code from your teacher and your name.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Class Code</label>
              <input
                type="text"
                value={classCode}
                onChange={e => setClassCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB1C23"
                maxLength={6}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm font-mono tracking-widest focus:outline-none focus:border-orange-500 transition-colors uppercase"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Name</label>
              <input
                type="text"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Set Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="6+ characters"
                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}

            <button
              type="submit"
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-sm transition-colors"
            >
              Join Class
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] text-center">
            <p className="text-xs text-gray-500">
              Already joined?{' '}
              <Link href="/classroom/login" className="text-orange-400 hover:underline">Log In</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ClassroomJoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500" />
      </div>
    }>
      <ClassroomJoinForm />
    </Suspense>
  )
}
