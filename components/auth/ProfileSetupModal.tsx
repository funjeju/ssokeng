'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { completeUserProfile, PROFILE_COMPLETE_TOKENS, AgeGroup, Gender } from '@/lib/db'

const AGE_GROUPS: { value: AgeGroup; label: string; emoji: string }[] = [
  { value: '10s',  label: 'Teens',    emoji: '🎒' },
  { value: '20s',  label: '20s',      emoji: '🎓' },
  { value: '30s',  label: '30s',      emoji: '💼' },
  { value: '40s',  label: '40s',      emoji: '🏡' },
  { value: '50s',  label: '50s',      emoji: '⚡' },
  { value: '60s+', label: '60s+',     emoji: '🌿' },
]

const GENDERS: { value: Gender; label: string; emoji: string }[] = [
  { value: 'male',       label: 'Male',            emoji: '👨' },
  { value: 'female',     label: 'Female',          emoji: '👩' },
  { value: 'other',      label: 'Other',           emoji: '🌈' },
  { value: 'prefer_not', label: 'Prefer not to say', emoji: '🔒' },
]

const INTEREST_CATS = [
  { id: 'recipe',  label: '🍳 Recipe',      desc: 'Cooking & food' },
  { id: 'english', label: '🔤 Language',    desc: 'Language learning' },
  { id: 'learning',label: '📐 Learning',    desc: 'Lectures & knowledge' },
  { id: 'news',    label: '🗞️ News',        desc: 'Current events' },
  { id: 'selfdev', label: '💪 Self-dev',    desc: 'Motivation & growth' },
  { id: 'travel',  label: '🧳 Travel',      desc: 'Travel & places' },
  { id: 'story',   label: '🍿 Story',       desc: 'Drama & entertainment' },
  { id: 'tips',    label: '💡 Tips',        desc: 'Life hacks & how-to' },
]

type Step = 'role' | 'teacher_setup' | 'age' | 'gender' | 'interests' | 'done'

function InviteParamReader({ onTeacherInvite }: { onTeacherInvite: () => void }) {
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('invite') === 'teacher') onTeacherInvite()
  }, [])
  return null
}

function ProfileSetupModalInner() {
  const { user, userProfile, needsProfile, refreshProfile } = useAuth()
  const router = useRouter()

  const [step, setStep]           = useState<Step>('role')
  const [dismissed, setDismissed] = useState(false)
  const [role, setRole]           = useState<'user' | 'teacher' | null>(null)

  const [ageGroup, setAgeGroup]   = useState<AgeGroup | null>(null)
  const [gender, setGender]       = useState<Gender | null>(null)
  const [interests, setInterests] = useState<string[]>([])

  const [schoolName, setSchoolName]     = useState('')
  const [grade, setGrade]               = useState('')
  const [classNum, setClassNum]         = useState('')
  const [classCode, setClassCode]       = useState('')
  const [teacherError, setTeacherError] = useState('')

  const [saving, setSaving]       = useState(false)
  const [tokensEarned, setTokensEarned] = useState(0)

  if (!user || !needsProfile || dismissed) return null

  const handleTeacherInvite = () => { setRole('teacher'); setStep('teacher_setup') }

  const userStepIndex = step === 'age' ? 0 : step === 'gender' ? 1 : step === 'interests' ? 2 : 3
  const totalUserSteps = 3

  const toggleInterest = (id: string) => {
    setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleComplete = async () => {
    if (!ageGroup || !gender) return
    setSaving(true)
    try {
      const { tokensAwarded } = await completeUserProfile(user.uid, { ageGroup, gender, interests })
      setTokensEarned(tokensAwarded)
      setStep('done')
      await refreshProfile()
    } catch (e) {
      console.error('Profile save failed:', e)
      alert('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleTeacherSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolName.trim()) { setTeacherError('Please enter your school name.'); return }
    if (!grade || !classNum) { setTeacherError('Please select a grade and class number.'); return }
    setSaving(true)
    setTeacherError('')
    try {
      const idToken = await user.getIdToken()
      const res = await fetch('/api/classroom/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          idToken,
          teacherName: userProfile?.displayName || user.displayName || '',
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
      setClassCode(data.classCode)
      setStep('done')
      await refreshProfile()
    } catch (e: any) {
      setTeacherError(e.message || 'An error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <Suspense fallback={null}><InviteParamReader onTeacherInvite={handleTeacherInvite} /></Suspense>
    <div className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[28px] w-full max-w-md shadow-2xl overflow-hidden relative">

        {step !== 'done' && (
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-4 right-4 z-10 text-[var(--text-subtle)] hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {step !== 'done' && step !== 'role' && step !== 'teacher_setup' && (
          <div className="h-1 bg-[var(--bg-elevated)]">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-500"
              style={{ width: `${(userStepIndex / totalUserSteps) * 100}%` }}
            />
          </div>
        )}

        <div className="p-7">

          {/* Step 0: Role */}
          {step === 'role' && (
            <>
              <div className="mb-7 text-center">
                <p className="text-white text-xl font-bold mb-1">
                  Welcome, {user.displayName?.split(' ')[0]}! 👋
                </p>
                <p className="text-[var(--text-muted)] text-sm">How will you be using this?</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setRole('user')}
                  className={`flex flex-col items-center gap-3 py-6 rounded-2xl border transition-all ${
                    role === 'user'
                      ? 'border-orange-500 bg-orange-500/15 text-white'
                      : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-white'
                  }`}
                >
                  <span className="text-4xl">👤</span>
                  <div className="text-center">
                    <p className="text-sm font-bold">Individual</p>
                    <p className="text-[10px] text-[var(--text-subtle)] mt-0.5">Personal use · Video curation</p>
                  </div>
                </button>

                <button
                  onClick={() => setRole('teacher')}
                  className={`flex flex-col items-center gap-3 py-6 rounded-2xl border transition-all ${
                    role === 'teacher'
                      ? 'border-emerald-500 bg-emerald-500/15 text-white'
                      : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-white'
                  }`}
                >
                  <span className="text-4xl">🏫</span>
                  <div className="text-center">
                    <p className="text-sm font-bold">Teacher</p>
                    <p className="text-[10px] text-[var(--text-subtle)] mt-0.5">Class management · Student guide</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => {
                  if (!role) return
                  setStep(role === 'teacher' ? 'teacher_setup' : 'age')
                }}
                disabled={!role}
                className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </>
          )}

          {/* Step T: Teacher Setup */}
          {step === 'teacher_setup' && (
            <>
              <div className="mb-6">
                <button
                  onClick={() => setStep('role')}
                  className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors mb-4 flex items-center gap-1"
                >
                  ← Back
                </button>
                <h2 className="text-xl font-bold text-white mb-1">🏫 Set Up Your Class</h2>
                <p className="text-[var(--text-muted)] text-sm">You'll get a unique code to share with students.</p>
              </div>

              <form onSubmit={handleTeacherSetup} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs text-[var(--text-subtle)] mb-1.5">School Name</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                    placeholder="Enter your school name"
                    className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-emerald-500/70 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--text-subtle)] mb-1.5">Grade</label>
                    <select
                      value={grade}
                      onChange={e => setGrade(e.target.value)}
                      className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    >
                      <option value="">Select</option>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                        <option key={n} value={n}>Grade {n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-subtle)] mb-1.5">Class</label>
                    <select
                      value={classNum}
                      onChange={e => setClassNum(e.target.value)}
                      className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    >
                      <option value="">Select</option>
                      {Array.from({length: 15}, (_, i) => i+1).map(n => (
                        <option key={n} value={n}>Class {n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {teacherError && (
                  <p className="text-red-400 text-xs text-center">{teacherError}</p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
                >
                  {saving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Creating class...
                    </>
                  ) : 'Create Class'}
                </button>
              </form>
            </>
          )}

          {/* Step 1: Age */}
          {step === 'age' && (
            <>
              <div className="mb-6">
                <p className="text-[var(--text-subtle)] text-xs font-medium mb-1">STEP 1 / {totalUserSteps}</p>
                <h2 className="text-xl font-bold text-white mb-1">What's your age group?</h2>
                <p className="text-[var(--text-muted)] text-sm">Used for personalized content recommendations.</p>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-6">
                {AGE_GROUPS.map(ag => (
                  <button
                    key={ag.value}
                    onClick={() => setAgeGroup(ag.value)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all ${
                      ageGroup === ag.value
                        ? 'border-orange-500 bg-orange-500/15 text-white'
                        : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-white'
                    }`}
                  >
                    <span className="text-xl">{ag.emoji}</span>
                    <span className="text-xs font-semibold">{ag.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => ageGroup && setStep('gender')}
                  disabled={!ageGroup}
                  className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button onClick={() => setStep('role')} className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors py-1">
                  Back
                </button>
              </div>
            </>
          )}

          {/* Step 2: Gender */}
          {step === 'gender' && (
            <>
              <div className="mb-6">
                <p className="text-[var(--text-subtle)] text-xs font-medium mb-1">STEP 2 / {totalUserSteps}</p>
                <h2 className="text-xl font-bold text-white mb-1">Select your gender</h2>
                <p className="text-[var(--text-muted)] text-sm">Used for content recommendations.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {GENDERS.map(g => (
                  <button
                    key={g.value}
                    onClick={() => setGender(g.value)}
                    className={`flex items-center gap-3 px-4 py-4 rounded-2xl border transition-all ${
                      gender === g.value
                        ? 'border-orange-500 bg-orange-500/15 text-white'
                        : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-white'
                    }`}
                  >
                    <span className="text-2xl">{g.emoji}</span>
                    <span className="text-sm font-semibold">{g.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => gender && setStep('interests')}
                  disabled={!gender}
                  className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button onClick={() => setStep('age')} className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors py-1">
                  Back
                </button>
              </div>
            </>
          )}

          {/* Step 3: Interests */}
          {step === 'interests' && (
            <>
              <div className="mb-6">
                <p className="text-[var(--text-subtle)] text-xs font-medium mb-1">STEP 3 / {totalUserSteps}</p>
                <h2 className="text-xl font-bold text-white mb-1">Pick your interests</h2>
                <p className="text-[var(--text-muted)] text-sm">Choose as many as you like · change anytime</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {INTEREST_CATS.map(cat => {
                  const selected = interests.includes(cat.id)
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleInterest(cat.id)}
                      className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border transition-all text-left ${
                        selected
                          ? 'border-orange-500 bg-orange-500/15 text-white'
                          : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-white'
                      }`}
                    >
                      <span className="text-lg">{cat.label.split(' ')[0]}</span>
                      <div>
                        <p className="text-xs font-semibold leading-tight">{cat.label.split(' ').slice(1).join(' ')}</p>
                        <p className="text-[10px] text-[var(--text-subtle)] leading-tight">{cat.desc}</p>
                      </div>
                      {selected && <span className="ml-auto text-orange-400 text-xs">✓</span>}
                    </button>
                  )
                })}
              </div>

              <div className="bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
                <span className="text-2xl">🎁</span>
                <div>
                  <p className="text-white text-xs font-bold">Complete profile → earn {PROFILE_COMPLETE_TOKENS} tokens!</p>
                  <p className="text-[var(--text-muted)] text-[10px]">Use for premium features</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Saving...
                    </>
                  ) : 'Complete Profile'}
                </button>
                <button onClick={() => setStep('gender')} className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors py-1">
                  Back
                </button>
              </div>
            </>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="text-center py-2">
              {role === 'teacher' ? (
                <>
                  <div className="text-6xl mb-4">🏫</div>
                  <h2 className="text-2xl font-bold text-white mb-2">Class Created!</h2>
                  <p className="text-[var(--text-muted)] text-sm mb-6">
                    Share this code with your students.
                  </p>
                  <div className="bg-[var(--bg-elevated)] rounded-2xl p-5 mb-6">
                    <p className="text-[var(--text-subtle)] text-xs mb-2">Your Class Code</p>
                    <p className="text-4xl font-black text-emerald-400 tracking-widest">{classCode}</p>
                    <p className="text-[var(--text-subtle)] text-xs mt-2">
                      {schoolName} · Grade {grade} · Class {classNum}
                    </p>
                  </div>
                  <button
                    onClick={() => { setDismissed(true); router.push(`/classroom/${classCode}`) }}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-colors"
                  >
                    Go to Class Dashboard
                  </button>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4 animate-bounce">🎉</div>
                  <h2 className="text-2xl font-bold text-white mb-2">Profile Complete!</h2>
                  <p className="text-[var(--text-muted)] text-sm mb-6 leading-relaxed">
                    You're all set to get the most out of SSOKTUBE.
                  </p>

                  <div className="bg-gradient-to-br from-orange-500/20 to-pink-500/20 border border-orange-500/30 rounded-2xl p-5 mb-6">
                    <p className="text-[var(--text-muted)] text-xs mb-1">Tokens Earned</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-3xl">🪙</span>
                      <span className="text-4xl font-black text-white">+{tokensEarned}</span>
                      <span className="text-xl text-[var(--text-muted)] font-bold">tokens</span>
                    </div>
                    <p className="text-[var(--text-subtle)] text-xs mt-2">
                      Balance: {(userProfile?.tokens ?? 0) + tokensEarned}
                    </p>
                  </div>

                  <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 mb-6 text-left space-y-2">
                    <p className="text-white text-xs font-bold mb-2">🚀 Coming soon with tokens</p>
                    <p className="text-[var(--text-subtle)] text-xs flex items-center gap-2"><span className="text-orange-400">⚡</span> Summarize 30+ min videos</p>
                    <p className="text-[var(--text-subtle)] text-xs flex items-center gap-2"><span className="text-orange-400">⚡</span> Unlimited AI chat</p>
                    <p className="text-[var(--text-subtle)] text-xs flex items-center gap-2"><span className="text-orange-400">⚡</span> Export summary as PDF</p>
                  </div>

                  <button
                    onClick={() => setDismissed(true)}
                    className="w-full h-12 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-colors"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
    </>
  )
}

export default function ProfileSetupModal() {
  return <ProfileSetupModalInner />
}
