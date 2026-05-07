'use client'

import { useState } from 'react'
import { QuizData, QuizQuestion } from '@/types/summary'

export interface QuizAnswerLog {
  questionIdx: number
  question: string   // 히트맵·복습 시스템용
  selected: string
  correct: boolean
  metaLevel?: 'complete' | 'confused' | 'unknown'
}

export interface QuizMetaLog {
  questionIdx: number
  question: string
  metaLevel: 'complete' | 'confused' | 'unknown'
}

const ROUND_BADGE: Record<number, { label: string; cls: string }> = {
  0: { label: 'Review 1', cls: 'bg-red-500/20 text-red-300 border-red-500/40' },
  1: { label: 'Review 2', cls: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  2: { label: 'Review 3', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
}
function getRoundBadge(rep: number) {
  return ROUND_BADGE[rep] ?? { label: `Review ${rep + 1}`, cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' }
}

interface Props {
  quiz: QuizData
  onClose: () => void
  onComplete?: () => void
  onAnswer?: (log: QuizAnswerLog) => void
  showMeta?: boolean
  onMeta?: (log: QuizMetaLog) => void
  reviewMode?: boolean
  reviewRounds?: number[]
}

export default function QuizPanel({ quiz, onClose, onComplete, onAnswer, showMeta, onMeta, reviewMode, reviewRounds }: Props) {
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [pendingMeta, setPendingMeta] = useState<'complete' | 'confused' | 'unknown' | null>(null)

  const q = quiz.questions[idx]
  const total = quiz.questions.length

  const next = (correct: boolean, chosenOption?: string, metaLevel?: 'complete' | 'confused' | 'unknown') => {
    onAnswer?.({ questionIdx: idx, question: q.question, selected: chosenOption ?? (correct ? 'Got it' : 'Missed it'), correct, metaLevel })
    const newAnswers = [...answers, correct]
    setAnswers(newAnswers)
    if (correct) setScore(s => s + 1)
    setPendingMeta(null)
    if (idx + 1 >= total) {
      setDone(true)
      onComplete?.()
    } else {
      setIdx(i => i + 1)
      setFlipped(false)
      setSelected(null)
    }
  }

  const handleMetaSelect = (level: 'complete' | 'confused' | 'unknown') => {
    setPendingMeta(level)
    onMeta?.({ questionIdx: idx, question: q.question, metaLevel: level })
  }

  const restart = () => {
    setIdx(0); setFlipped(false); setSelected(null)
    setScore(0); setDone(false); setAnswers([])
  }

  if (done) {
    const pct = Math.round((score / total) * 100)
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl w-full max-w-sm p-8 flex flex-col items-center gap-5 shadow-2xl">
          <span className="text-5xl">{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</span>
          <h2 className="text-xl font-bold text-white">{reviewMode ? 'Review done!' : 'Quiz done!'}</h2>
          <div className="text-center">
            <p className="text-4xl font-black text-orange-400">{score}/{total}</p>
            <p className="text-[var(--text-subtle)] text-sm mt-1">{pct}% correct</p>
          </div>
          {reviewMode && (
            <p className="text-xs text-center text-[var(--text-subtle)]">
              {pct >= 80 ? 'Great job! Your next review schedule has been updated.' : 'Missed questions will be reviewed again sooner.'}
            </p>
          )}
          <div className="flex gap-2 w-full mt-2">
            <button onClick={restart} className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm transition-colors">
              Retry
            </button>
            <button onClick={onClose} className="flex-1 py-3 bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white font-bold rounded-2xl text-sm border border-[var(--border-default)] transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            {reviewMode && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40">🔄 Review Mode</span>
            )}
            <span className="text-sm font-bold text-white">{quiz.title}</span>
          </div>
          <div className="flex items-center gap-3">
            {reviewMode && reviewRounds && reviewRounds[idx] !== undefined && (() => {
              const badge = getRoundBadge(reviewRounds[idx])
              return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
            })()}
            <span className="text-xs text-[var(--text-subtle)]">{idx + 1} / {total}</span>
            <button onClick={onClose} className="text-[var(--text-subtle)] hover:text-white transition-colors text-lg leading-none">✕</button>
          </div>
        </div>

        {/* 진행 바 */}
        <div className="h-1 bg-[var(--bg-elevated)]">
          <div
            className="h-full bg-orange-500 transition-all duration-300"
            style={{ width: `${((idx) / total) * 100}%` }}
          />
        </div>

        {/* 문제 */}
        <div className="p-5 flex flex-col gap-4 min-h-[360px]">
          {q.type === 'flashcard' ? (
            <FlashCard
              q={q} flipped={flipped}
              onFlip={() => setFlipped(true)}
              onNext={(correct) => next(correct)}
              showMeta={showMeta}
              onMetaSelect={handleMetaSelect}
              pendingMeta={pendingMeta}
            />
          ) : (
            <MultipleChoice
              q={q} selected={selected}
              onSelect={setSelected}
              onNext={(correct) => next(correct, selected ?? '', pendingMeta ?? undefined)}
              showMeta={showMeta}
              onMetaSelect={handleMetaSelect}
              pendingMeta={pendingMeta}
            />
          )}
        </div>
      </div>
    </div>
  )
}

const META_BUTTONS = [
  { level: 'complete' as const, emoji: '✅', label: 'Got it',     active: 'bg-emerald-500/20 border-emerald-500 text-emerald-300', idle: 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' },
  { level: 'confused' as const, emoji: '🤔', label: 'Unsure',    active: 'bg-yellow-500/20 border-yellow-500 text-yellow-300',   idle: 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10' },
  { level: 'unknown'  as const, emoji: '❓', label: 'No idea',   active: 'bg-red-500/20 border-red-500 text-red-300',            idle: 'border-red-500/30 text-red-400 hover:bg-red-500/10' },
]

function MetaRow({ pendingMeta, onSelect }: {
  pendingMeta: 'complete' | 'confused' | 'unknown' | null
  onSelect: (level: 'complete' | 'confused' | 'unknown') => void
}) {
  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <p className="text-center text-[10px] text-[var(--text-subtle)] uppercase tracking-wider">How well did you understand this?</p>
      <div className="flex gap-2">
        {META_BUTTONS.map(btn => (
          <button
            key={btn.level}
            onClick={() => onSelect(btn.level)}
            className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${pendingMeta === btn.level ? btn.active : btn.idle}`}
          >
            <span className="block text-base mb-0.5">{btn.emoji}</span>
            {btn.label}
          </button>
        ))}
      </div>
      {pendingMeta && (
        <p className="text-center text-[10px] text-[var(--text-subtle)]">✓ Sent to your teacher</p>
      )}
    </div>
  )
}

function FlashCard({ q, flipped, onFlip, onNext, showMeta, onMetaSelect, pendingMeta }: {
  q: QuizQuestion; flipped: boolean
  onFlip: () => void; onNext: (correct: boolean) => void
  showMeta?: boolean
  onMetaSelect?: (level: 'complete' | 'confused' | 'unknown') => void
  pendingMeta?: 'complete' | 'confused' | 'unknown' | null
}) {
  return (
    <div className="flex flex-col gap-4 flex-1">
      <div
        onClick={!flipped ? onFlip : undefined}
        className={`flex-1 min-h-[200px] rounded-2xl border flex flex-col items-center justify-center p-6 cursor-pointer transition-all duration-300 text-center ${
          flipped
            ? 'bg-orange-500/10 border-orange-500/40'
            : 'bg-[var(--bg-elevated)] border-[var(--border-default)] hover:border-orange-500/30'
        }`}
      >
        {!flipped ? (
          <>
            <p className="text-[10px] text-[var(--text-subtle)] mb-3 uppercase tracking-wider">Front — tap to flip</p>
            <p className="text-white text-xl font-bold leading-relaxed">{q.question}</p>
            {q.hint && <p className="text-[var(--text-subtle)] text-xs mt-3">💡 {q.hint}</p>}
          </>
        ) : (
          <>
            <p className="text-[10px] text-orange-400/70 mb-3 uppercase tracking-wider">Back</p>
            <p className="text-orange-100 text-base font-semibold leading-relaxed whitespace-pre-line">{q.answer}</p>
          </>
        )}
      </div>

      {flipped && (
        <div className="flex flex-col gap-2">
          {showMeta && onMetaSelect && (
            <MetaRow pendingMeta={pendingMeta ?? null} onSelect={onMetaSelect} />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { onMetaSelect?.('unknown'); onNext(false) }}
              className="flex-1 py-3 bg-[var(--bg-elevated)] border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold rounded-2xl text-sm transition-colors"
            >
              😅 Missed it
            </button>
            <button
              onClick={() => { onMetaSelect?.('complete'); onNext(true) }}
              className="flex-1 py-3 bg-[var(--bg-elevated)] border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold rounded-2xl text-sm transition-colors"
            >
              ✅ Got it
            </button>
          </div>
        </div>
      )}
      {!flipped && (
        <p className="text-center text-xs text-[var(--text-subtle)]">Tap the card to reveal the answer</p>
      )}
    </div>
  )
}

function MultipleChoice({ q, selected, onSelect, onNext, showMeta, onMetaSelect, pendingMeta }: {
  q: QuizQuestion; selected: string | null
  onSelect: (v: string) => void; onNext: (correct: boolean) => void
  showMeta?: boolean
  onMetaSelect?: (level: 'complete' | 'confused' | 'unknown') => void
  pendingMeta?: 'complete' | 'confused' | 'unknown' | null
}) {
  const options = q.options ?? []
  const confirmed = selected !== null
  const isCorrect = confirmed && selected === q.answer

  return (
    <div className="flex flex-col gap-3 flex-1">
      <p className="text-white font-semibold text-base leading-relaxed">{q.question}</p>
      <div className="flex flex-col gap-2 flex-1">
        {options.map((opt, i) => {
          const isSelected = selected === opt
          const isOptCorrect = opt === q.answer
          let style = 'bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-primary)] hover:border-orange-500/30 hover:text-white'
          if (confirmed) {
            if (isOptCorrect) style = 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
            else if (isSelected) style = 'bg-red-500/15 border-red-500/50 text-red-300'
            else style = 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-subtle)] opacity-60'
          } else if (isSelected) {
            style = 'bg-orange-500/15 border-orange-500/50 text-orange-200'
          }
          return (
            <button
              key={i}
              onClick={() => !confirmed && onSelect(opt)}
              disabled={confirmed}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${style}`}
            >
              <span className="text-[10px] opacity-60 mr-2">{['A', 'B', 'C', 'D'][i]}.</span>
              {opt}
            </button>
          )
        })}
      </div>
      {confirmed && (
        <div className="flex flex-col gap-2 mt-1">
          {showMeta && onMetaSelect && isCorrect ? (
            // 정답: 학생이 직접 이해도 선택
            <MetaRow pendingMeta={pendingMeta ?? null} onSelect={onMetaSelect} />
          ) : confirmed && !isCorrect ? (
            // 오답: 자동 전혀모름
            <p className="text-center text-xs text-red-400/70 py-1">❓ 전혀모름으로 기록됩니다</p>
          ) : null}
          <button
            onClick={() => {
              if (!isCorrect) onMetaSelect?.('unknown')
              onNext(isCorrect)
            }}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm transition-colors"
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  )
}
