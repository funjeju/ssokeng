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

  const [studentHint, setStudentHint] = useState('')
  const [helpMessage, setHelpMessage] = useState('I forgot my name or password.')

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
      setError('Failed to load teacher list.')
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
    if (!studentName.trim() || !password) { setError('Please enter your name and password.'); return }
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
        body: JSON.stringify({
          classCode: selectedTeacher.classCode,
          studentHint,
          message: helpMessage,
        }),
      })
      setStep('forgot_sent')
    } catch {
      setError('Failed to send request.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-white">
      <Header title="Student Login" />
      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-[var(--bg-surface)] rounded-[28px] border border-[var(--border-default)] p-8">

          {/* Step 1: Select School */}
          {step === 'school' && (
            <>
              <h1 className="text-2xl font-black mb-1">Student Login</h1>
              <p className="text-gray-400 text-sm mb-6">Select your school to continue.</p>
              {schools.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">No registered schools found.</p>
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
                  First time?{' '}
                  <Link href="/classroom/join" className="text-orange-400 hover:underline">Join here</Link>
                </p>
              </div>
            </>
          )}

          {/* Step 2: Select Teacher */}
          {step === 'teacher' && (
            <>
              <button onClick={() => { setStep('school'); setError('') }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white mb-6 transition-colors">
                ← Change School
              </button>
              <h1 className="text-xl font-black mb-1">Select Your Teacher</h1>
              <p className="text-gray-400 text-sm mb-6">
                Teachers at <span className="text-white font-bold">{selectedSchool}</span>
              </p>
              <div className="space-y-2">
                {teachers.map(t => (
                  <button
                    key={t.classCode}
                    onClick={() => handleTeacherSelect(t)}
                    className="w-full text-left px-4 py-4 rounded-xl border border-[var(--border-default)] hover:border-orange-500/50 hover:bg-orange-500/5 transition-all"
                  >
                    <span className="font-bold text-white">{t.teacherName}</span>
                    <span className="ml-2 text-xs text-gray-400">Grade {t.grade} · Class {t.classNum}</span>
                  </button>
                ))}
              </div>
              {error && <p className="mt-4 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
            </>
          )}

          {/* Step 3: Name + Password */}
          {step === 'credentials' && (
            <>
              <button onClick={() => { setStep('teacher'); setError('') }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white mb-6 transition-colors">
                ← Change Teacher
              </button>
              <div className="mb-6">
                <p className="text-xs text-gray-500">{selectedSchool}</p>
                <h1 className="text-xl font-black">{selectedTeacher?.teacherName}'s Class</h1>
                <p className="text-xs text-gray-400 mt-0.5">Grade {selectedTeacher?.grade} · Class {selectedTeacher?.classNum}</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
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
                  <label className="block text-xs text-gray-400 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {loading ? 'Logging in...' : 'Log In'}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] text-center">
                <p className="text-xs text-gray-500 mb-2">Forgot your name or password?</p>
                <button
                  onClick={() => { setStep('forgot'); setError('') }}
                  className="text-xs text-orange-400 hover:text-orange-300 hover:underline transition-colors"
                >
                  Ask {selectedTeacher?.teacherName} for help →
                </button>
              </div>
            </>
          )}

          {/* Step 4: Help Request */}
          {step === 'forgot' && (
            <>
              <button onClick={() => { setStep('credentials'); setError('') }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white mb-6 transition-colors">
                ← Go Back
              </button>
              <h1 className="text-xl font-black mb-1">Ask Your Teacher for Help</h1>
              <p className="text-gray-400 text-sm mb-6">
                Your message will be sent to <span className="text-white font-bold">{selectedTeacher?.teacherName}</span>.
              </p>

              <form onSubmit={handleHelpRequest} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Name (if you remember)</label>
                  <input
                    type="text"
                    value={studentHint}
                    onChange={e => setStudentHint(e.target.value)}
                    placeholder="Your name (optional)"
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Request</label>
                  <select
                    value={helpMessage}
                    onChange={e => setHelpMessage(e.target.value)}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="I forgot my name or password.">I forgot my name or password.</option>
                    <option value="I forgot my password.">I forgot my password.</option>
                    <option value="I forgot my registered name.">I forgot my registered name.</option>
                  </select>
                </div>
                {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Request to Teacher'}
                </button>
              </form>
            </>
          )}

          {/* Step 5: Request Sent */}
          {step === 'forgot_sent' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="text-5xl">📩</div>
              <h2 className="text-lg font-bold">Request Sent!</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Your help request has been sent to<br/>
                <span className="text-white font-bold">{selectedTeacher?.teacherName}</span>.<br/>
                Check with your teacher directly.
              </p>
              <button
                onClick={() => setStep('credentials')}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-sm transition-colors mt-2"
              >
                Back to Login
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
