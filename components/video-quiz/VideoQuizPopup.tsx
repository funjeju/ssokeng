'use client'

import { useState } from 'react'
import { VideoQuiz, secsToLabel } from '@/lib/videoQuiz'

interface Props {
  quiz: VideoQuiz
  onClose: () => void  // 계속 시청
}

export default function VideoQuizPopup({ quiz, onClose }: Props) {
  const [answered, setAnswered] = useState(false)
  const [selectedOx, setSelectedOx] = useState<'O' | 'X' | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [shortInput, setShortInput] = useState('')
  const [shortSubmitted, setShortSubmitted] = useState(false)

  const isCorrectOx = selectedOx === quiz.oxAnswer
  const isCorrectMc = selectedOption === quiz.correctOptionIndex

  const handleOxSelect = (v: 'O' | 'X') => {
    if (answered) return
    setSelectedOx(v)
    setAnswered(true)
  }

  const handleOptionSelect = (i: number) => {
    if (answered) return
    setSelectedOption(i)
    setAnswered(true)
  }

  const handleShortSubmit = () => {
    if (!shortInput.trim()) return
    setShortSubmitted(true)
    setAnswered(true)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden">

        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-orange-400 text-sm font-bold">🧩 Quiz</span>
            <span className="text-[var(--text-subtle)] text-xs">📍 {secsToLabel(quiz.timestampSec)}</span>
          </div>
          <p className="text-[10px] text-[var(--text-subtle)]">Answer the quiz before continuing the video!</p>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">

          {/* 이미지 */}
          {quiz.imageUrl && (
            <img src={quiz.imageUrl} alt="Quiz image" className="w-full max-h-48 object-cover rounded-xl border border-[var(--border-default)]" />
          )}

          {/* 문제 */}
          <p className="text-white font-semibold text-base leading-relaxed">{quiz.question}</p>

          {/* OX */}
          {quiz.quizType === 'ox' && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                {(['O', 'X'] as const).map(v => {
                  const isSelected = selectedOx === v
                  const isCorrect = v === quiz.oxAnswer
                  let style = 'bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--border-emphasis)]'
                  if (answered) {
                    if (isCorrect) style = 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    else if (isSelected) style = 'bg-red-500/20 border-red-500 text-red-300'
                    else style = 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-subtle)]'
                  } else if (isSelected) {
                    style = 'bg-orange-500/20 border-orange-500 text-orange-300'
                  }
                  return (
                    <button
                      key={v}
                      onClick={() => handleOxSelect(v)}
                      disabled={answered}
                      className={`flex-1 py-5 rounded-2xl text-4xl font-black border-2 transition-all ${style}`}
                    >{v}</button>
                  )
                })}
              </div>
              {answered && (
                <div className={`rounded-2xl px-4 py-3 text-sm ${isCorrectOx ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border border-red-500/30 text-red-300'}`}>
                  <p className="font-bold mb-1">{isCorrectOx ? '🎉 Correct!' : '😅 Wrong answer'}</p>
                  <p className="text-xs opacity-80">Answer: <strong>{quiz.oxAnswer}</strong></p>
                  {quiz.oxExplanation && <p className="text-xs opacity-80 mt-1">{quiz.oxExplanation}</p>}
                </div>
              )}
            </div>
          )}

          {/* 객관식 */}
          {quiz.quizType === 'multiple_choice' && (
            <div className="flex flex-col gap-2">
              {(quiz.options ?? []).map((opt, i) => {
                if (!opt) return null
                const isSelected = selectedOption === i
                const isCorrect = i === quiz.correctOptionIndex
                let style = 'bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-primary)] hover:border-orange-500/30'
                if (answered) {
                  if (isCorrect) style = 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                  else if (isSelected) style = 'bg-red-500/15 border-red-500/50 text-red-300'
                  else style = 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-subtle)] opacity-50'
                } else if (isSelected) {
                  style = 'bg-orange-500/15 border-orange-500/50 text-orange-200'
                }
                return (
                  <button
                    key={i}
                    onClick={() => handleOptionSelect(i)}
                    disabled={answered}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${style}`}
                  >
                    <span className="text-[10px] opacity-60 mr-2">{['A', 'B', 'C', 'D'][i]}.</span>
                    {opt}
                  </button>
                )
              })}
              {answered && (
                <div className={`rounded-2xl px-4 py-3 text-sm mt-1 ${isCorrectMc ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border border-red-500/30 text-red-300'}`}>
                  <p className="font-bold">{isCorrectMc ? '🎉 Correct!' : `😅 Wrong — Answer: ${['A', 'B', 'C', 'D'][quiz.correctOptionIndex ?? 0]}`}</p>
                </div>
              )}
            </div>
          )}

          {/* 주관식 */}
          {quiz.quizType === 'short_answer' && (
            <div className="flex flex-col gap-3">
              {!shortSubmitted ? (
                <>
                  <textarea
                    value={shortInput}
                    onChange={e => setShortInput(e.target.value)}
                    placeholder="Enter your answer"
                    rows={3}
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-white text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 resize-none"
                  />
                  <button
                    onClick={handleShortSubmit}
                    disabled={!shortInput.trim()}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold rounded-2xl text-sm transition-colors"
                  >
                    Submit
                  </button>
                </>
              ) : (
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl p-4 flex flex-col gap-3">
                  <div>
                    <p className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wider mb-1">Your answer</p>
                    <p className="text-white text-sm">{shortInput}</p>
                  </div>
                  {quiz.sampleAnswer && (
                    <div className="border-t border-[var(--border-subtle)] pt-3">
                      <p className="text-[10px] text-orange-400/70 uppercase tracking-wider mb-1">Sample answer</p>
                      <p className="text-orange-100 text-sm leading-relaxed">{quiz.sampleAnswer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 계속 시청 버튼 */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            disabled={quiz.quizType === 'short_answer' ? !shortSubmitted : !answered}
            className="w-full py-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-2)] disabled:opacity-40 border border-[var(--border-default)] text-white font-bold rounded-2xl text-sm transition-colors"
          >
            ▶ Continue watching
          </button>
          {!answered && quiz.quizType !== 'short_answer' && (
            <button onClick={onClose} className="w-full py-2 text-[var(--text-subtle)] hover:text-white text-xs transition-colors mt-1">
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
