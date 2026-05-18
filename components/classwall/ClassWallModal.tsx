'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { db } from '@/lib/firebase'
import {
  collection, addDoc, onSnapshot, deleteDoc, doc,
  serverTimestamp, query, orderBy, getDoc,
} from 'firebase/firestore'
import { useAuth } from '@/providers/AuthProvider'
import { activateVote, deactivateVote, submitVote, subscribeVoteSession, VoteSession } from '@/lib/voteSession'
import ClassWallCard from './ClassWallCard'
import type { QuizData, QuizQuestion } from '@/types/summary'

const CARD_COLORS = [
  'bg-yellow-200', 'bg-pink-200', 'bg-sky-200', 'bg-green-200',
  'bg-orange-200', 'bg-violet-200', 'bg-rose-200', 'bg-teal-200',
]

interface MemoNote {
  id: string
  text: string
  author: string
  authorId: string
  color: string
  createdAt: any
}

interface Props {
  sessionId: string
  videoId: string
  videoTitle: string
  classCode: string
  onClose: () => void
}

function tsToSec(ts: string): number {
  const parts = ts.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

type Tab = 'memo' | 'quiz' | 'vote'

// 퀴즈 자동생성 컴포넌트
function QuizCardGenerator({ sessionId, onGenerated }: { sessionId: string; onGenerated: (q: QuizData) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = async (force = false) => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/quiz/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, force }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed.'); return }
      onGenerated(data as QuizData)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/60 rounded-xl border border-zinc-700">
      <span className="text-xs text-zinc-400 flex-1">AI quiz from this video</span>
      <button
        onClick={() => generate(false)}
        disabled={loading}
        className="text-xs px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg disabled:opacity-50 transition-colors"
      >
        {loading ? 'Generating...' : 'Generate'}
      </button>
      <button
        onClick={() => generate(true)}
        disabled={loading}
        title="Regenerate"
        className="text-xs px-2 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg disabled:opacity-50 transition-colors"
      >
        ↺
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}

export default function ClassWallModal({ sessionId, videoId, videoTitle, classCode, onClose }: Props) {
  const { user, userProfile } = useAuth()
  const isTeacher = userProfile?.role === 'teacher'

  const [tab, setTab] = useState<Tab>('memo')
  const [memos, setMemos] = useState<MemoNote[]>([])
  const [memoText, setMemoText] = useState('')
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizFlipped, setQuizFlipped] = useState(false)
  const [mcAnswer, setMcAnswer] = useState<string | null>(null)
  const [voteSession, setVoteSession] = useState<VoteSession | null>(null)
  const [voteQuestion, setVoteQuestion] = useState('')
  const [hasVoted, setHasVoted] = useState(false)
  const [isDebate, setIsDebate] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // saved_summaries에서 isDebate 실시간 감지
  useEffect(() => {
    const q = query(collection(db, 'saved_summaries'), ...[])
    // sessionId 기준 단일 문서 구독
    const unsub = onSnapshot(doc(db, 'saved_summaries', sessionId), snap => {
      if (snap.exists()) {
        setIsDebate(!!snap.data().isDebate)
      }
    })
    return unsub
  }, [sessionId])

  // saved_summaries 직접 참조가 없을 때를 위한 summaries 폴백
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'summaries', sessionId), snap => {
      if (snap.exists() && snap.data().isDebate !== undefined) {
        setIsDebate(!!snap.data().isDebate)
      }
    })
    return unsub
  }, [sessionId])

  // 메모 실시간 구독
  useEffect(() => {
    const q = query(
      collection(db, 'classwall_memos', sessionId, 'notes'),
      orderBy('createdAt', 'asc'),
    )
    const unsub = onSnapshot(q, snap => {
      setMemos(snap.docs.map(d => ({ id: d.id, ...d.data() } as MemoNote)))
    })
    return unsub
  }, [sessionId])

  // 찬반투표 실시간 구독
  useEffect(() => {
    const unsub = subscribeVoteSession(sessionId, setVoteSession)
    return unsub
  }, [sessionId])

  // quiz_sets 로드 시도
  useEffect(() => {
    if (!videoId) return
    getDoc(doc(db, 'quiz_sets', videoId)).then(snap => {
      if (snap.exists()) setQuiz(snap.data() as QuizData)
    }).catch(() => {})
  }, [videoId])

  const seekTo = useCallback((ts: string) => {
    const sec = tsToSec(ts)
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'seekTo', args: [sec, true] }),
      '*',
    )
  }, [])

  const addMemo = async () => {
    if (!memoText.trim() || !user) return
    const colorIdx = memos.length % CARD_COLORS.length
    await addDoc(collection(db, 'classwall_memos', sessionId, 'notes'), {
      text: memoText.trim(),
      author: userProfile?.displayName || user.displayName || 'Anonymous',
      authorId: user.uid,
      color: CARD_COLORS[colorIdx],
      createdAt: serverTimestamp(),
    })
    setMemoText('')
  }

  const deleteMemo = async (id: string) => {
    await deleteDoc(doc(db, 'classwall_memos', sessionId, 'notes', id))
  }

  const handleActivateVote = async () => {
    if (!voteQuestion.trim() || !user) return
    await activateVote(sessionId, user.uid, classCode, voteQuestion.trim())
    setVoteQuestion('')
  }

  const handleVote = async (vote: 'yes' | 'no') => {
    if (!user || hasVoted) return
    await submitVote(sessionId, user.uid, vote)
    setHasVoted(true)
  }

  const currentQ: QuizQuestion | undefined = quiz?.questions[quizIndex]
  const totalQ = quiz?.questions.length ?? 0

  return (
    <div className="fixed inset-0 z-[90] flex bg-zinc-950">
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute top-3 right-4 z-10 text-zinc-400 hover:text-white text-2xl leading-none transition-colors"
      >
        ✕
      </button>

      {/* 좌측: YouTube 영상 */}
      <div className="flex flex-col w-1/2 min-w-0 border-r border-zinc-800">
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-sm font-semibold text-white truncate">{videoTitle}</p>
          <p className="text-xs text-zinc-400">ClassWall</p>
        </div>
        <div className="relative flex-1 bg-black">
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>

      {/* 우측: 탭 패널 */}
      <div className="flex flex-col w-1/2 min-w-0">
        {/* 탭 헤더 */}
        <div className="flex border-b border-zinc-800 px-2 pt-2 gap-1">
          {(['memo', ...(isDebate ? [] : ['quiz']), 'vote'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors capitalize ${
                tab === t
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t === 'memo' ? 'Memo' : t === 'quiz' ? 'Quiz' : 'Vote'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* ── 메모잇 탭 ── */}
          {tab === 'memo' && (
            <div className="flex flex-col gap-4 h-full">
              <div className="flex gap-2">
                <textarea
                  value={memoText}
                  onChange={e => setMemoText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addMemo() } }}
                  placeholder="Write a note... (Enter to post)"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-500 resize-none focus:outline-none focus:border-orange-500/50 h-16"
                />
                <button
                  onClick={addMemo}
                  disabled={!memoText.trim() || !user}
                  className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors self-end"
                >
                  Post
                </button>
              </div>
              {memos.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">No memos yet. Be the first!</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {memos.map(m => (
                    <ClassWallCard
                      key={m.id}
                      id={m.id}
                      text={m.text}
                      author={m.author}
                      color={m.color}
                      canDelete={isTeacher || m.authorId === user?.uid}
                      onDelete={() => deleteMemo(m.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 퀴즈 탭 ── */}
          {tab === 'quiz' && !isDebate && (
            <div className="flex flex-col gap-4">
              {isTeacher && (
                <QuizCardGenerator sessionId={sessionId} onGenerated={q => { setQuiz(q); setQuizIndex(0); setQuizFlipped(false); setMcAnswer(null) }} />
              )}
              {!quiz ? (
                <p className="text-zinc-500 text-sm text-center py-8">No quiz generated yet.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{quiz.title}</span>
                    <span>{quizIndex + 1} / {totalQ}</span>
                  </div>

                  {currentQ && (
                    <div className="flex flex-col gap-3">
                      {currentQ.type === 'flashcard' ? (
                        <div
                          onClick={() => setQuizFlipped(f => !f)}
                          className={`cursor-pointer rounded-2xl p-6 min-h-[160px] flex flex-col items-center justify-center text-center shadow-lg transition-colors ${
                            quizFlipped ? 'bg-sky-50' : 'bg-amber-50'
                          } text-zinc-800`}
                        >
                          <p className="text-base font-semibold leading-snug">
                            {quizFlipped ? currentQ.answer : currentQ.question}
                          </p>
                          <p className="text-xs text-zinc-400 mt-3">{quizFlipped ? 'Answer' : 'Question — tap to flip'}</p>
                          {currentQ.timestamp && !quizFlipped && (
                            <button
                              onClick={e => { e.stopPropagation(); seekTo(currentQ.timestamp!) }}
                              className="mt-2 text-xs text-orange-500 hover:text-orange-400 underline"
                            >
                              ▶ {currentQ.timestamp}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="rounded-2xl bg-amber-50 text-zinc-800 p-5 shadow">
                            <p className="text-sm font-semibold">{currentQ.question}</p>
                            {currentQ.timestamp && (
                              <button
                                onClick={() => seekTo(currentQ.timestamp!)}
                                className="mt-1 text-xs text-orange-500 hover:text-orange-400 underline"
                              >
                                ▶ {currentQ.timestamp}
                              </button>
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {currentQ.options?.map(opt => (
                              <button
                                key={opt}
                                onClick={() => setMcAnswer(opt)}
                                className={`text-left px-4 py-2.5 rounded-xl text-sm border transition-colors ${
                                  mcAnswer === null
                                    ? 'bg-zinc-800 border-zinc-700 text-white hover:border-violet-500'
                                    : opt === currentQ.answer
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                    : mcAnswer === opt
                                    ? 'bg-red-500/20 border-red-500 text-red-300'
                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 justify-center mt-2">
                        <button
                          onClick={() => { setQuizIndex(i => Math.max(0, i - 1)); setQuizFlipped(false); setMcAnswer(null) }}
                          disabled={quizIndex === 0}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-xl disabled:opacity-40 transition-colors"
                        >
                          ← Prev
                        </button>
                        <button
                          onClick={() => { setQuizIndex(i => Math.min(totalQ - 1, i + 1)); setQuizFlipped(false); setMcAnswer(null) }}
                          disabled={quizIndex === totalQ - 1}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-xl disabled:opacity-40 transition-colors"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── 찬반투표 탭 ── */}
          {tab === 'vote' && (
            <div className="flex flex-col gap-4">
              {isTeacher && (
                <div className="flex flex-col gap-2 p-3 bg-zinc-800/60 rounded-xl border border-zinc-700">
                  <p className="text-xs text-zinc-400 font-semibold">Teacher: Start a vote</p>
                  <input
                    value={voteQuestion}
                    onChange={e => setVoteQuestion(e.target.value)}
                    placeholder="Vote question..."
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleActivateVote}
                      disabled={!voteQuestion.trim()}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg disabled:opacity-40 transition-colors"
                    >
                      Start Vote
                    </button>
                    {voteSession?.active && (
                      <button
                        onClick={() => deactivateVote(sessionId)}
                        className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors"
                      >
                        End
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!voteSession?.active ? (
                <p className="text-zinc-500 text-sm text-center py-8">
                  {isTeacher ? 'No active vote.' : 'Waiting for teacher to start a vote...'}
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl bg-zinc-800 border border-zinc-700 p-5">
                    <p className="text-base font-bold text-white text-center mb-4">{voteSession.question}</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleVote('yes')}
                        disabled={hasVoted}
                        className="flex-1 py-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-300 font-bold text-lg disabled:opacity-50 transition-colors"
                      >
                        YES
                      </button>
                      <button
                        onClick={() => handleVote('no')}
                        disabled={hasVoted}
                        className="flex-1 py-4 rounded-xl bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-300 font-bold text-lg disabled:opacity-50 transition-colors"
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl bg-zinc-800 border border-zinc-700 p-4">
                    <p className="text-xs text-zinc-400 mb-2 font-semibold">Live Results</p>
                    <div className="flex gap-2 items-center">
                      <span className="text-emerald-400 text-sm font-bold w-8 text-right">{voteSession.yesCount}</span>
                      <div className="flex-1 h-3 bg-zinc-700 rounded-full overflow-hidden">
                        {(voteSession.yesCount + voteSession.noCount) > 0 && (
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                            style={{ width: `${(voteSession.yesCount / (voteSession.yesCount + voteSession.noCount)) * 100}%` }}
                          />
                        )}
                      </div>
                      <span className="text-red-400 text-sm font-bold w-8">{voteSession.noCount}</span>
                    </div>
                    <p className="text-center text-xs text-zinc-500 mt-2">
                      Total: {voteSession.yesCount + voteSession.noCount} votes
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
