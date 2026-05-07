'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAllVideoQuizzes, deleteVideoQuiz, VideoQuiz } from '@/lib/videoQuiz'

const QUIZ_TYPE_LABEL: Record<string, string> = {
  ox: '⭕ OX',
  multiple_choice: '📋 Multiple choice',
  short_answer: '✏️ Short answer',
}

function groupBySession(quizzes: VideoQuiz[]): Record<string, VideoQuiz[]> {
  const groups: Record<string, VideoQuiz[]> = {}
  for (const q of quizzes) {
    if (!groups[q.sessionId]) groups[q.sessionId] = []
    groups[q.sessionId].push(q)
  }
  // 각 그룹 내부는 타임스탬프 순
  for (const sid in groups) {
    groups[sid].sort((a, b) => a.timestampSec - b.timestampSec)
  }
  return groups
}

export default function SavedVideoQuizzes({ userId }: { userId: string }) {
  const [quizzes, setQuizzes] = useState<VideoQuiz[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    getAllVideoQuizzes(userId)
      .then(setQuizzes)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this quiz?')) return
    setDeletingId(id)
    try {
      await deleteVideoQuiz(id)
      setQuizzes(prev => prev.filter(q => q.id !== id))
    } catch {
      alert('Failed to delete.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--text-subtle)] text-sm">
        Loading...
      </div>
    )
  }

  if (quizzes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <span className="text-4xl">🧩</span>
        <p className="text-white font-semibold">No saved quizzes</p>
        <p className="text-[var(--text-subtle)] text-sm max-w-xs">
          Add a quiz at any point while watching a video.<br/>
          When the video reaches that timestamp, the quiz will appear automatically.
        </p>
      </div>
    )
  }

  const grouped = groupBySession(quizzes)

  return (
    <div className="flex flex-col gap-5">
      {Object.entries(grouped).map(([sessionId, sessionQuizzes]) => {
        const first = sessionQuizzes[0]
        return (
          <div key={sessionId} className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
            {/* 영상 헤더 */}
            <Link
              href={`/result/${sessionId}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--overlay-subtle)] transition-colors border-b border-[var(--border-subtle)]"
            >
              {first.thumbnail && (
                <img src={first.thumbnail} alt="" className="w-16 h-9 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{first.videoTitle}</p>
                <p className="text-[var(--text-subtle)] text-xs truncate">{first.channel}</p>
              </div>
              <span className="text-[var(--text-subtle)] text-xs shrink-0 bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full">
                {sessionQuizzes.length} quizzes
              </span>
            </Link>

            {/* 퀴즈 목록 */}
            <div className="divide-y divide-white/5">
              {sessionQuizzes.map(quiz => (
                <div key={quiz.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                    <span className="text-orange-400 text-xs font-mono font-bold">
                      {quiz.timestampLabel}
                    </span>
                    <span className="text-[10px] text-[var(--text-subtle)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded-full">
                      {QUIZ_TYPE_LABEL[quiz.quizType]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-sm leading-relaxed line-clamp-2">{quiz.question}</p>
                    {quiz.quizType === 'ox' && quiz.oxAnswer && (
                      <p className="text-[var(--text-subtle)] text-xs mt-1">Answer: <span className="text-orange-400 font-bold">{quiz.oxAnswer}</span></p>
                    )}
                    {quiz.quizType === 'multiple_choice' && quiz.options && quiz.correctOptionIndex !== undefined && (
                      <p className="text-[var(--text-subtle)] text-xs mt-1">
                        Answer: <span className="text-orange-400">{['①', '②', '③', '④'][quiz.correctOptionIndex]} {quiz.options[quiz.correctOptionIndex]}</span>
                      </p>
                    )}
                    {quiz.imageUrl && (
                      <span className="inline-block text-[10px] text-[var(--text-subtle)] mt-1">📷 Image attached</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(quiz.id)}
                    disabled={deletingId === quiz.id}
                    className="shrink-0 text-[var(--text-subtle)] hover:text-red-400 transition-colors text-sm disabled:opacity-40 pt-0.5"
                    title="Delete"
                  >
                    {deletingId === quiz.id ? '...' : '🗑'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
