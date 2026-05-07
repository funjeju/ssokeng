'use client'

import { useState, useRef } from 'react'
import {
  VideoQuiz, VideoQuizType,
  addVideoQuiz, updateVideoQuiz, deleteVideoQuiz, uploadQuizImage, secsToLabel,
} from '@/lib/videoQuiz'

interface Props {
  userId: string
  sessionId: string
  videoId: string
  videoTitle: string
  thumbnail: string
  channel: string
  quizzes: VideoQuiz[]
  currentTimeSec: number
  onClose: () => void
  onChanged: () => void
}

type View = 'list' | 'create' | 'edit'

const TYPE_TABS: { id: VideoQuizType; label: string; emoji: string }[] = [
  { id: 'ox', label: 'OX Quiz', emoji: '⭕' },
  { id: 'multiple_choice', label: 'Multiple choice', emoji: '📋' },
  { id: 'short_answer', label: 'Short answer', emoji: '✏️' },
]

const TYPE_LABEL: Record<VideoQuizType, string> = {
  ox: 'OX',
  multiple_choice: 'Multiple choice',
  short_answer: 'Short answer',
}

function QuizForm({
  initialData,
  timestampSec,
  saving,
  error,
  onSave,
  onCancel,
}: {
  initialData?: VideoQuiz
  timestampSec: number
  saving: boolean
  error: string
  onSave: (fields: Omit<VideoQuiz, 'id' | 'userId' | 'sessionId' | 'videoId' | 'videoTitle' | 'thumbnail' | 'channel' | 'createdAt'> & { imageFile?: File | null }) => void
  onCancel: () => void
}) {
  const [quizType, setQuizType] = useState<VideoQuizType>(initialData?.quizType ?? 'ox')
  const [question, setQuestion] = useState(initialData?.question ?? '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl ?? null)
  const [oxAnswer, setOxAnswer] = useState<'O' | 'X' | null>(initialData?.oxAnswer ?? null)
  const [oxExplanation, setOxExplanation] = useState(initialData?.oxExplanation ?? '')
  const [options, setOptions] = useState(initialData?.options ?? ['', '', '', ''])
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(initialData?.correctOptionIndex ?? null)
  const [sampleAnswer, setSampleAnswer] = useState(initialData?.sampleAnswer ?? '')
  const [localError, setLocalError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setLocalError('Image must be 5MB or smaller.'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setLocalError('')
  }

  const handleOptionChange = (i: number, val: string) => {
    setOptions(prev => prev.map((o, idx) => idx === i ? val : o))
  }

  const validate = (): boolean => {
    if (!question.trim()) { setLocalError('Please enter the question.'); return false }
    if (quizType === 'ox' && !oxAnswer) { setLocalError('Please select the correct answer (O/X).'); return false }
    if (quizType === 'multiple_choice') {
      const filled = options.filter(o => o.trim())
      if (filled.length < 2) { setLocalError('Please enter at least 2 options.'); return false }
      if (correctOptionIndex === null) { setLocalError('Please select the correct option.'); return false }
      if (!options[correctOptionIndex]?.trim()) { setLocalError('The selected correct option is empty.'); return false }
    }
    return true
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSave({
      timestampSec,
      timestampLabel: secsToLabel(timestampSec),
      quizType,
      question: question.trim(),
      imageFile,
      // imageFile 있으면 새로 업로드, imagePreview 있으면 기존 URL 유지, 없으면 undefined
      imageUrl: imageFile ? undefined : imagePreview ?? undefined,
      ...(quizType === 'ox' ? { oxAnswer: oxAnswer!, oxExplanation: oxExplanation.trim() || undefined } : {}),
      ...(quizType === 'multiple_choice' ? { options: options.map(o => o.trim()), correctOptionIndex: correctOptionIndex! } : {}),
      ...(quizType === 'short_answer' ? { sampleAnswer: sampleAnswer.trim() || undefined } : {}),
    })
  }

  const displayError = localError || error

  return (
    <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
      {/* 퀴즈 타입 */}
      <div className="flex gap-2">
        {TYPE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setQuizType(tab.id); setLocalError('') }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
              quizType === tab.id
                ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                : 'bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-subtle)] hover:text-white'
            }`}
          >
            <span className="block text-base mb-0.5">{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 문제 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-[var(--text-subtle)] font-medium">Question</label>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Enter the question"
          rows={3}
          className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-white text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 resize-none"
        />
      </div>

      {/* 이미지 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-[var(--text-subtle)] font-medium">Attach image (optional)</label>
        {imagePreview ? (
          <div className="relative">
            <img src={imagePreview} alt="Preview" className="w-full max-h-40 object-cover rounded-xl border border-[var(--border-default)]" />
            <button
              onClick={() => { setImageFile(null); setImagePreview(null) }}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/80 transition-colors"
            >✕</button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-[var(--bg-elevated)] border border-dashed border-[var(--border-strong)] rounded-xl text-[var(--text-subtle)] text-sm hover:border-orange-500/40 hover:text-orange-400 transition-colors"
          >
            📷 Select image
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
      </div>

      {/* OX */}
      {quizType === 'ox' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-subtle)] font-medium">Correct answer</label>
            <div className="flex gap-3">
              {(['O', 'X'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setOxAnswer(v)}
                  className={`flex-1 py-4 rounded-2xl text-3xl font-black border-2 transition-all ${
                    oxAnswer === v
                      ? v === 'O' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-red-500/20 border-red-500 text-red-300'
                      : 'bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-subtle)] hover:border-[var(--border-emphasis)]'
                  }`}
                >{v}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-subtle)] font-medium">Explanation (optional)</label>
            <textarea
              value={oxExplanation}
              onChange={e => setOxExplanation(e.target.value)}
              placeholder="Enter an explanation for the answer"
              rows={2}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-white text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 resize-none"
            />
          </div>
        </div>
      )}

      {/* 객관식 */}
      {quizType === 'multiple_choice' && (
        <div className="flex flex-col gap-3">
          <label className="text-xs text-[var(--text-subtle)] font-medium">Options (at least 2)</label>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => setCorrectOptionIndex(i)}
                className={`w-8 h-8 rounded-full border-2 text-xs font-black shrink-0 transition-all ${
                  correctOptionIndex === i
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--text-subtle)] hover:border-orange-500/50'
                }`}
              >{['①', '②', '③', '④'][i]}</button>
              <input
                value={opt}
                onChange={e => handleOptionChange(i, e.target.value)}
                placeholder={`Option ${i + 1}${i < 2 ? ' (required)' : ' (optional)'}`}
                className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50"
              />
            </div>
          ))}
          {correctOptionIndex !== null && (
            <p className="text-xs text-orange-400">✓ {['①', '②', '③', '④'][correctOptionIndex]} set as correct answer</p>
          )}
        </div>
      )}

      {/* 주관식 */}
      {quizType === 'short_answer' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[var(--text-subtle)] font-medium">Sample answer (optional)</label>
          <textarea
            value={sampleAnswer}
            onChange={e => setSampleAnswer(e.target.value)}
            placeholder="Enter a sample answer to show learners as reference"
            rows={3}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-white text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 resize-none"
          />
        </div>
      )}

      {displayError && <p className="text-red-400 text-xs">{displayError}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-[var(--bg-elevated)] hover:bg-[var(--overlay-default)] text-[var(--text-subtle)] hover:text-white font-bold rounded-2xl text-sm transition-colors border border-[var(--border-default)]"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-2xl text-sm transition-colors"
        >
          {saving ? 'Saving...' : initialData ? 'Save changes' : 'Save quiz'}
        </button>
      </div>
    </div>
  )
}

export default function VideoQuizManagerModal({
  userId, sessionId, videoId, videoTitle, thumbnail, channel,
  quizzes, currentTimeSec, onClose, onChanged,
}: Props) {
  const [view, setView] = useState<View>('list')
  const [editingQuiz, setEditingQuiz] = useState<VideoQuiz | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleSave = async (fields: any) => {
    setSaving(true)
    setError('')
    try {
      let imageUrl: string | undefined | null = fields.imageUrl  // null = 삭제
      if (fields.imageFile) {
        imageUrl = await uploadQuizImage(userId, fields.imageFile)
      }
      const { imageFile, ...rest } = fields
      // imageUrl이 null이면 Firestore에서 제거, undefined면 그대로, string이면 저장
      const payload: any = { ...rest }
      if (imageUrl !== undefined) payload.imageUrl = imageUrl ?? null

      if (view === 'edit' && editingQuiz) {
        await updateVideoQuiz(editingQuiz.id, payload)
      } else {
        await addVideoQuiz(userId, { ...payload, videoId, sessionId, videoTitle, thumbnail, channel })
      }
      onChanged()
      setView('list')
      setEditingQuiz(null)
    } catch (e) {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (quiz: VideoQuiz) => {
    if (!confirm(`Delete quiz "${quiz.question.slice(0, 30)}..."?`)) return
    setDeletingId(quiz.id)
    try {
      await deleteVideoQuiz(quiz.id)
      onChanged()
    } catch {
      alert('Failed to delete.')
    } finally {
      setDeletingId(null)
    }
  }

  const headerTitle = view === 'create'
    ? `Add quiz — at ${secsToLabel(currentTimeSec)}`
    : view === 'edit' && editingQuiz
      ? `Edit quiz — at ${secsToLabel(editingQuiz.timestampSec)}`
      : 'Manage quizzes'

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md flex flex-col shadow-2xl max-h-[90vh] overflow-hidden">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-2">
            {view !== 'list' && (
              <button
                onClick={() => { setView('list'); setEditingQuiz(null); setError('') }}
                className="text-[var(--text-subtle)] hover:text-white transition-colors text-sm mr-1"
              >← List</button>
            )}
            <div>
              <p className="text-white font-bold text-base">{headerTitle}</p>
              {view === 'list' && (
                <p className="text-[var(--text-subtle)] text-xs mt-0.5">{quizzes.length} quizzes</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--text-subtle)] hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        {/* 목록 뷰 */}
        {view === 'list' && (
          <>
            <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2">
              {quizzes.length === 0 ? (
                <div className="text-center text-[var(--text-subtle)] text-sm py-10">
                  No quizzes added yet.<br />
                  <span className="text-xs">Use the button below to add one at the current timestamp.</span>
                </div>
              ) : (
                quizzes.map(q => (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 bg-[var(--bg-page)] border border-[var(--border-default)] rounded-2xl px-4 py-3"
                  >
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                      <span className="text-orange-400 text-xs font-mono font-bold">{q.timestampLabel}</span>
                      <span className="text-[10px] text-[var(--text-subtle)] bg-[var(--bg-base)] rounded-full px-2 py-0.5">
                        {TYPE_LABEL[q.quizType]}
                      </span>
                    </div>
                    <p className="flex-1 text-white text-sm leading-snug line-clamp-2">{q.question}</p>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => { setEditingQuiz(q); setView('edit'); setError('') }}
                        className="px-2.5 py-1.5 rounded-lg text-xs bg-[var(--overlay-subtle)] hover:bg-blue-500/15 border border-[var(--border-default)] hover:border-blue-500/30 text-[var(--text-subtle)] hover:text-blue-400 transition-colors"
                      >Edit</button>
                      <button
                        onClick={() => handleDelete(q)}
                        disabled={deletingId === q.id}
                        className="px-2.5 py-1.5 rounded-lg text-xs bg-[var(--overlay-subtle)] hover:bg-red-500/15 border border-[var(--border-default)] hover:border-red-500/30 text-[var(--text-subtle)] hover:text-red-400 transition-colors disabled:opacity-40"
                      >{deletingId === q.id ? '...' : 'Delete'}</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-4 border-t border-[var(--border-subtle)] shrink-0">
              <button
                onClick={() => { setView('create'); setError('') }}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm transition-colors"
              >
                📍 Add quiz at {secsToLabel(currentTimeSec)}
              </button>
            </div>
          </>
        )}

        {/* 생성 / 수정 폼 */}
        {(view === 'create' || view === 'edit') && (
          <QuizForm
            initialData={view === 'edit' ? editingQuiz ?? undefined : undefined}
            timestampSec={view === 'edit' && editingQuiz ? editingQuiz.timestampSec : currentTimeSec}
            saving={saving}
            error={error}
            onSave={handleSave}
            onCancel={() => { setView('list'); setEditingQuiz(null); setError('') }}
          />
        )}
      </div>
    </div>
  )
}
