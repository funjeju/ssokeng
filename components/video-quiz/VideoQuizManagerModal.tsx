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
  { id: 'ox', label: 'OX 퀴즈', emoji: '⭕' },
  { id: 'multiple_choice', label: '객관식', emoji: '📋' },
  { id: 'short_answer', label: '주관식', emoji: '✏️' },
]

const TYPE_LABEL: Record<VideoQuizType, string> = {
  ox: 'OX',
  multiple_choice: '객관식',
  short_answer: '주관식',
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
    if (file.size > 5 * 1024 * 1024) { setLocalError('이미지는 5MB 이하만 가능합니다.'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setLocalError('')
  }

  const handleOptionChange = (i: number, val: string) => {
    setOptions(prev => prev.map((o, idx) => idx === i ? val : o))
  }

  const validate = (): boolean => {
    if (!question.trim()) { setLocalError('문제를 입력해주세요.'); return false }
    if (quizType === 'ox' && !oxAnswer) { setLocalError('정답(O/X)을 선택해주세요.'); return false }
    if (quizType === 'multiple_choice') {
      const filled = options.filter(o => o.trim())
      if (filled.length < 2) { setLocalError('보기를 최소 2개 이상 입력해주세요.'); return false }
      if (correctOptionIndex === null) { setLocalError('정답 번호를 선택해주세요.'); return false }
      if (!options[correctOptionIndex]?.trim()) { setLocalError('선택한 정답 번호의 보기가 비어있습니다.'); return false }
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
      // imageFile 있으면 새로 업로드, imagePreview 있으면 기존 URL 유지, 없으면 null(삭제)
      imageUrl: imageFile ? undefined : imagePreview || null,
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
                : 'bg-[#32302e] border-white/10 text-[#75716e] hover:text-white'
            }`}
          >
            <span className="block text-base mb-0.5">{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 문제 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-[#75716e] font-medium">문제</label>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="문제를 입력하세요"
          rows={3}
          className="w-full bg-[#32302e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#4a4845] focus:outline-none focus:border-orange-500/50 resize-none"
        />
      </div>

      {/* 이미지 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-[#75716e] font-medium">이미지 첨부 (선택)</label>
        {imagePreview ? (
          <div className="relative">
            <img src={imagePreview} alt="미리보기" className="w-full max-h-40 object-cover rounded-xl border border-white/10" />
            <button
              onClick={() => { setImageFile(null); setImagePreview(null) }}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/80 transition-colors"
            >✕</button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-[#32302e] border border-dashed border-white/20 rounded-xl text-[#75716e] text-sm hover:border-orange-500/40 hover:text-orange-400 transition-colors"
          >
            📷 이미지 선택
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageChange} />
      </div>

      {/* OX */}
      {quizType === 'ox' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#75716e] font-medium">정답</label>
            <div className="flex gap-3">
              {(['O', 'X'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setOxAnswer(v)}
                  className={`flex-1 py-4 rounded-2xl text-3xl font-black border-2 transition-all ${
                    oxAnswer === v
                      ? v === 'O' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-red-500/20 border-red-500 text-red-300'
                      : 'bg-[#32302e] border-white/10 text-[#75716e] hover:border-white/30'
                  }`}
                >{v}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[#75716e] font-medium">해설 (선택)</label>
            <textarea
              value={oxExplanation}
              onChange={e => setOxExplanation(e.target.value)}
              placeholder="정답 해설을 입력하세요"
              rows={2}
              className="w-full bg-[#32302e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#4a4845] focus:outline-none focus:border-orange-500/50 resize-none"
            />
          </div>
        </div>
      )}

      {/* 객관식 */}
      {quizType === 'multiple_choice' && (
        <div className="flex flex-col gap-3">
          <label className="text-xs text-[#75716e] font-medium">보기 입력 (최소 2개)</label>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => setCorrectOptionIndex(i)}
                className={`w-8 h-8 rounded-full border-2 text-xs font-black shrink-0 transition-all ${
                  correctOptionIndex === i
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-[#32302e] border-white/20 text-[#75716e] hover:border-orange-500/50'
                }`}
              >{['①', '②', '③', '④'][i]}</button>
              <input
                value={opt}
                onChange={e => handleOptionChange(i, e.target.value)}
                placeholder={`보기 ${i + 1}${i < 2 ? ' (필수)' : ' (선택)'}`}
                className="flex-1 bg-[#32302e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-[#4a4845] focus:outline-none focus:border-orange-500/50"
              />
            </div>
          ))}
          {correctOptionIndex !== null && (
            <p className="text-xs text-orange-400">✓ {['①', '②', '③', '④'][correctOptionIndex]} 번이 정답으로 설정됨</p>
          )}
        </div>
      )}

      {/* 주관식 */}
      {quizType === 'short_answer' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-[#75716e] font-medium">모범 답안 (선택)</label>
          <textarea
            value={sampleAnswer}
            onChange={e => setSampleAnswer(e.target.value)}
            placeholder="모범 답안을 입력하면 학습자에게 참고로 보여집니다"
            rows={3}
            className="w-full bg-[#32302e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#4a4845] focus:outline-none focus:border-orange-500/50 resize-none"
          />
        </div>
      )}

      {displayError && <p className="text-red-400 text-xs">{displayError}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-[#32302e] hover:bg-white/10 text-[#75716e] hover:text-white font-bold rounded-2xl text-sm transition-colors border border-white/10"
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-2xl text-sm transition-colors"
        >
          {saving ? '저장 중...' : initialData ? '수정 완료' : '퀴즈 저장하기'}
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
      setError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (quiz: VideoQuiz) => {
    if (!confirm(`"${quiz.question.slice(0, 30)}..." 퀴즈를 삭제하시겠습니까?`)) return
    setDeletingId(quiz.id)
    try {
      await deleteVideoQuiz(quiz.id)
      onChanged()
    } catch {
      alert('삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  const headerTitle = view === 'create'
    ? `퀴즈 추가 — ${secsToLabel(currentTimeSec)} 지점`
    : view === 'edit' && editingQuiz
      ? `퀴즈 수정 — ${secsToLabel(editingQuiz.timestampSec)} 지점`
      : '퀴즈 관리'

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#23211f] border border-white/10 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md flex flex-col shadow-2xl max-h-[90vh] overflow-hidden">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            {view !== 'list' && (
              <button
                onClick={() => { setView('list'); setEditingQuiz(null); setError('') }}
                className="text-[#75716e] hover:text-white transition-colors text-sm mr-1"
              >← 목록</button>
            )}
            <div>
              <p className="text-white font-bold text-base">{headerTitle}</p>
              {view === 'list' && (
                <p className="text-[#75716e] text-xs mt-0.5">{quizzes.length}개의 퀴즈</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-[#75716e] hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        {/* 목록 뷰 */}
        {view === 'list' && (
          <>
            <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2">
              {quizzes.length === 0 ? (
                <div className="text-center text-[#75716e] text-sm py-10">
                  아직 등록된 퀴즈가 없습니다.<br />
                  <span className="text-xs">아래 버튼으로 현재 시점에 추가해보세요.</span>
                </div>
              ) : (
                quizzes.map(q => (
                  <div
                    key={q.id}
                    className="flex items-start gap-3 bg-[#2e2c2a] border border-white/8 rounded-2xl px-4 py-3"
                  >
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                      <span className="text-orange-400 text-xs font-mono font-bold">{q.timestampLabel}</span>
                      <span className="text-[10px] text-[#75716e] bg-[#1a1917] rounded-full px-2 py-0.5">
                        {TYPE_LABEL[q.quizType]}
                      </span>
                    </div>
                    <p className="flex-1 text-white text-sm leading-snug line-clamp-2">{q.question}</p>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => { setEditingQuiz(q); setView('edit'); setError('') }}
                        className="px-2.5 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-blue-500/15 border border-white/8 hover:border-blue-500/30 text-[#75716e] hover:text-blue-400 transition-colors"
                      >수정</button>
                      <button
                        onClick={() => handleDelete(q)}
                        disabled={deletingId === q.id}
                        className="px-2.5 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-red-500/15 border border-white/8 hover:border-red-500/30 text-[#75716e] hover:text-red-400 transition-colors disabled:opacity-40"
                      >{deletingId === q.id ? '...' : '삭제'}</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-4 border-t border-white/5 shrink-0">
              <button
                onClick={() => { setView('create'); setError('') }}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-sm transition-colors"
              >
                📍 {secsToLabel(currentTimeSec)} 지점에 퀴즈 추가
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
