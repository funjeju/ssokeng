'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import Header from '@/components/common/Header'
import Link from 'next/link'

export default function ClassroomSetupPage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  const [schoolName, setSchoolName] = useState('')
  const [grade, setGrade] = useState('')
  const [classNum, setClassNum] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolName.trim()) { setError('Please enter your school name.'); return }
    if (!grade || !classNum) { setError('Please select a grade and class number.'); return }
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/classroom/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user!.uid,
          teacherName: userProfile?.displayName || user!.displayName || '',
          schoolName: schoolName.trim(),
          schoolCode: '',
          schoolType: '',
          region: '',
          grade: Number(grade),
          classNum: Number(classNum),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/classroom/${data.classCode}`)
    } catch (e: any) {
      setError(e.message || 'An error occurred. Please try again.')
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
      <p className="text-white mb-4">Please sign in to continue.</p>
      <Link href="/" className="text-orange-400 underline">Go Home</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-white">
      <Header title="🏫 Create Class" />
      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-[var(--bg-surface)] rounded-[28px] border border-[var(--border-default)] p-8">
          <h1 className="text-2xl font-black mb-2">Create New Class</h1>
          <p className="text-gray-400 text-sm mb-8">Enter your school, grade, and class info to get a unique code to share with students.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">School Name</label>
              <input
                type="text"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                placeholder="Enter your school name"
                className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Grade</label>
                <select value={grade} onChange={e => setGrade(e.target.value)}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors">
                  <option value="">Select</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Class</label>
                <select value={classNum} onChange={e => setClassNum(e.target.value)}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors">
                  <option value="">Select</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>Class {n}</option>)}
                </select>
              </div>
            </div>

            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}

            <button type="submit" disabled={submitting || !schoolName.trim()}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
              {submitting ? 'Creating...' : 'Get Class Code'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
