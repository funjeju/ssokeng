'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import type { QuizData, QuizQuestion, SummaryData } from '@/types/summary'

const PASTEL_COLORS = [
  { front: 'bg-amber-50', back: 'bg-sky-50', border: 'border-amber-200' },
  { front: 'bg-violet-50', back: 'bg-emerald-50', border: 'border-violet-200' },
  { front: 'bg-rose-50', back: 'bg-teal-50', border: 'border-rose-200' },
  { front: 'bg-orange-50', back: 'bg-indigo-50', border: 'border-orange-200' },
  { front: 'bg-pink-50', back: 'bg-cyan-50', border: 'border-pink-200' },
  { front: 'bg-lime-50', back: 'bg-purple-50', border: 'border-lime-200' },
  { front: 'bg-yellow-50', back: 'bg-blue-50', border: 'border-yellow-200' },
  { front: 'bg-fuchsia-50', back: 'bg-green-50', border: 'border-fuchsia-200' },
]

interface FlashCard {
  question: string
  answer: string
  hint?: string
  source: 'ai' | 'teacher' | 'summary'
}

interface Props {
  videoId?: string
  sessionId?: string
  summaryData?: SummaryData
  category?: string
}

function extractSummaryCards(category: string, summary: SummaryData): FlashCard[] {
  const cards: FlashCard[] = []
  const s = summary as any

  if (category === 'english') {
    for (const expr of (s.expressions ?? [])) {
      cards.push({ question: expr.text, answer: expr.meaning, hint: expr.note, source: 'summary' })
    }
    for (const vocab of (s.vocabulary ?? [])) {
      cards.push({ question: vocab.word, answer: vocab.meaning, hint: vocab.example, source: 'summary' })
    }
  } else if (category === 'learning') {
    for (const c of (s.concepts ?? [])) {
      cards.push({ question: c.name, answer: c.desc, source: 'summary' })
    }
    for (const kp of (s.key_points ?? [])) {
      cards.push({ question: 'Key Point', answer: kp.point, source: 'summary' })
    }
  } else if (category === 'selfdev') {
    for (const i of (s.insights ?? [])) {
      cards.push({ question: 'Insight', answer: i.point, source: 'summary' })
    }
  } else if (category === 'tips') {
    for (const t of (s.tips ?? [])) {
      cards.push({ question: t.title, answer: t.desc, source: 'summary' })
    }
  }

  return cards
}

export default function FlashcardTab({ videoId, sessionId, summaryData, category }: Props) {
  const [cards, setCards] = useState<FlashCard[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const merged: FlashCard[] = []

      // 1. quiz_sets (AI 생성) — videoId 또는 sessionId 키
      const cacheKey = videoId || sessionId
      if (cacheKey) {
        try {
          const snap = await getDoc(doc(db, 'quiz_sets', cacheKey))
          if (snap.exists()) {
            const quizData = snap.data() as QuizData
            for (const q of quizData.questions) {
              merged.push({ question: q.question, answer: q.answer, hint: q.hint, source: 'ai' })
            }
          }
        } catch {}
      }

      // 2. video_quizzes (선생님 수동 등록)
      if (sessionId) {
        try {
          const q = query(collection(db, 'video_quizzes'), where('sessionId', '==', sessionId))
          const snap = await getDocs(q)
          for (const d of snap.docs) {
            const vq = d.data()
            if (vq.quizType === 'multiple_choice' && vq.question && vq.options) {
              merged.push({
                question: vq.question,
                answer: vq.options[vq.correctOptionIndex ?? 0] ?? '',
                hint: `Timestamp: ${vq.timestampLabel}`,
                source: 'teacher',
              })
            } else if (vq.quizType === 'ox' && vq.question) {
              merged.push({
                question: vq.question,
                answer: vq.oxAnswer === 'O' ? 'O (True)' : 'X (False)',
                hint: vq.oxExplanation,
                source: 'teacher',
              })
            } else if (vq.quizType === 'short_answer' && vq.question) {
              merged.push({
                question: vq.question,
                answer: vq.sampleAnswer ?? '',
                source: 'teacher',
              })
            }
          }
        } catch {}
      }

      // 3. 요약 데이터 기반 카드 (AI/teacher 카드가 없을 때 채움)
      if (merged.length < 3 && summaryData && category) {
        const summaryCards = extractSummaryCards(category, summaryData)
        const existingQuestions = new Set(merged.map(c => c.question))
        for (const sc of summaryCards) {
          if (!existingQuestions.has(sc.question)) merged.push(sc)
        }
      }

      if (!cancelled) {
        setCards(merged)
        setIndex(0)
        setFlipped(false)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [videoId, sessionId, summaryData, category])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500 text-sm">
        No flashcards available for this video.
      </div>
    )
  }

  const card = cards[index]
  const palette = PASTEL_COLORS[index % PASTEL_COLORS.length]
  const sourceLabel = card.source === 'ai' ? 'AI' : card.source === 'teacher' ? 'Teacher' : 'Summary'
  const sourceBadge = card.source === 'ai'
    ? 'bg-violet-100 text-violet-600'
    : card.source === 'teacher'
    ? 'bg-blue-100 text-blue-600'
    : 'bg-zinc-100 text-zinc-500'

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      {/* 카드 */}
      <div
        onClick={() => setFlipped(f => !f)}
        className={`cursor-pointer w-full max-w-sm min-h-[200px] rounded-3xl border-2 ${palette.border} ${
          flipped ? palette.back : palette.front
        } shadow-lg flex flex-col items-center justify-center p-7 text-center gap-3 transition-colors select-none`}
      >
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sourceBadge}`}>{sourceLabel}</span>
        <p className="text-base font-semibold text-zinc-800 leading-snug">
          {flipped ? card.answer : card.question}
        </p>
        {!flipped && card.hint && (
          <p className="text-xs text-zinc-400">{card.hint}</p>
        )}
        <p className="text-[10px] text-zinc-400 mt-1">{flipped ? 'Answer' : 'Tap to reveal answer'}</p>
      </div>

      {/* 네비게이션 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => { setIndex(i => Math.max(0, i - 1)); setFlipped(false) }}
          disabled={index === 0}
          className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-30 transition-colors flex items-center justify-center"
        >
          ‹
        </button>
        <span className="text-xs text-zinc-500 min-w-[3rem] text-center">{index + 1} / {cards.length}</span>
        <button
          onClick={() => { setIndex(i => Math.min(cards.length - 1, i + 1)); setFlipped(false) }}
          disabled={index === cards.length - 1}
          className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-30 transition-colors flex items-center justify-center"
        >
          ›
        </button>
      </div>

      {/* 진행 점 */}
      <div className="flex gap-1.5">
        {cards.slice(0, Math.min(cards.length, 12)).map((_, i) => (
          <button
            key={i}
            onClick={() => { setIndex(i); setFlipped(false) }}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? 'bg-orange-400' : 'bg-zinc-600'}`}
          />
        ))}
        {cards.length > 12 && <span className="text-zinc-600 text-xs">+{cards.length - 12}</span>}
      </div>
    </div>
  )
}
