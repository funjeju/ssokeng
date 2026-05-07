'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface ChatMsg {
  role: 'user' | 'model'
  content: string
  isQuote?: boolean   // 드래그 인용 메시지 표시
}

interface YoutubePlayerRef {
  getCurrentTime?: () => number
}

interface DocentChatProps {
  title: string
  category: string
  summaryData: unknown   // SummaryData JSON
  playerRef?: React.RefObject<YoutubePlayerRef | null>
  transcript?: string   // 원본 자막 전문
}

// 카테고리별 첫 질문 제안
const SUGGESTIONS: Record<string, string[]> = {
  recipe:  ['What are the most important tips in this recipe?', 'What mistakes do beginners usually make?', 'Can any ingredients be substituted?'],
  english: ['How do you use this expression in real life?', 'How is it different from similar expressions?', 'What\'s an easy way to remember this word?'],
  learning:['Can you summarize this concept in one sentence?', 'Where is this used in real life?', 'I\'d like to learn more about related concepts'],
  news:    ['What\'s the background of this news story?', 'How do you think this will unfold?', 'How does this affect me?'],
  selfdev: ['What can I start doing right away from this content?', 'Summarize the core message in one sentence', 'Recommend similar books or content'],
  travel:  ['What essentials should I bring here?', 'How much budget should I plan for?', 'What should first-time travelers watch out for?'],
  story:   ['What does the ending mean?', 'Why did the main character make that choice?', 'What is the core message of this work?'],
  tips:    ['Which of these tips is the most effective?', 'What preparation do I need?', 'Can a complete beginner do this right away?'],
}

const DEFAULT_SUGGESTIONS = ['What is the most important point in this content?', 'Explain the part I don\'t understand', 'What related topics should I explore further?']

/** 초 → "M:SS" 포맷 */
function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * transcript 전문에서 현재 시간 ±windowSec 범위 텍스트를 추출.
 * YouTube 자막 형식 "[M:SS]" 타임스탬프가 있으면 해당 구간을,
 * 없으면 전체 텍스트의 앞 1500자를 반환.
 */
function extractNearbyTranscript(transcript: string, currentSec: number, windowSec = 45): string {
  if (!transcript) return ''

  // "[0:12] 텍스트" 또는 "[1:23:45] 텍스트" 형식 파싱
  const lines = transcript.split('\n')
  const timestampPattern = /^\[(\d+):(\d{2})(?::(\d{2}))?\]\s*(.*)/

  const timed: { sec: number; text: string }[] = []
  let hasTimestamps = false

  for (const line of lines) {
    const m = line.match(timestampPattern)
    if (m) {
      hasTimestamps = true
      const sec = m[3]
        ? parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3])
        : parseInt(m[1]) * 60 + parseInt(m[2])
      timed.push({ sec, text: m[4] })
    }
  }

  if (!hasTimestamps || timed.length === 0) {
    // 타임스탬프 없는 plain text → 전체의 앞 1500자
    return transcript.slice(0, 1500)
  }

  const nearby = timed
    .filter(t => Math.abs(t.sec - currentSec) <= windowSec)
    .map(t => `[${fmtTime(t.sec)}] ${t.text}`)
    .join('\n')

  return nearby || timed.slice(0, 20).map(t => `[${fmtTime(t.sec)}] ${t.text}`).join('\n')
}

export default function DocentChat({ title, category, summaryData, playerRef, transcript = '' }: DocentChatProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectionPopup, setSelectionPopup] = useState<{ x: number; y: number; text: string } | null>(null)
  const cacheIdRef = useRef<string | undefined>(undefined)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const suggestions = SUGGESTIONS[category] ?? DEFAULT_SUGGESTIONS

  // 텍스트 선택 감지 → 팝업 표시
  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.toString().trim().length < 5) {
      setSelectionPopup(null)
      return
    }
    const selectedText = sel.toString().trim()
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    setSelectionPopup({
      x: rect.left + rect.width / 2,
      y: rect.top + window.scrollY - 8,
      text: selectedText,
    })
  }, [])

  useEffect(() => {
    document.addEventListener('mouseup', handleSelectionChange)
    document.addEventListener('touchend', handleSelectionChange)
    return () => {
      document.removeEventListener('mouseup', handleSelectionChange)
      document.removeEventListener('touchend', handleSelectionChange)
    }
  }, [handleSelectionChange])

  // 패널 밖 클릭 시 선택 팝업 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && panelRef.current.contains(e.target as Node)) return
      // 선택 팝업 버튼 클릭이 아닐 때만 닫기
      const target = e.target as HTMLElement
      if (target.closest('[data-docent-popup]')) return
      setSelectionPopup(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        inputRef.current?.focus()
      }, 150)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string, isQuote = false) => {
    if (!text.trim() || loading) return
    setSelectionPopup(null)
    window.getSelection()?.removeAllRanges()

    const content = isQuote ? `> "${text}"\n\nI'm curious about this part.` : text
    const userMsg: ChatMsg = { role: 'user', content, isQuote }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    if (!open) setOpen(true)

    // 현재 재생 위치 및 주변 자막 추출 (위치 참고용)
    const currentSec = playerRef?.current?.getCurrentTime?.() ?? null
    const nearbyTranscript = currentSec !== null
      ? extractNearbyTranscript(transcript, currentSec)
      : ''
    const positionHint = currentSec !== null
      ? `[Current position: ${fmtTime(currentSec)}]`
      : ''

    try {
      const res = await fetch('/api/docent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          summaryContext: JSON.stringify(summaryData),
          fullTranscript: transcript,
          title,
          category,
          positionHint,
          nearbyTranscript,
          cacheId: cacheIdRef.current,
        }),
      })
      const data = await res.json()
      if (data.cacheId) cacheIdRef.current = data.cacheId
      setMessages(prev => [...prev, {
        role: 'model',
        content: data.text ?? 'An error occurred.',
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'model',
        content: 'Sorry, something went wrong. Please try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* 텍스트 선택 팝업 */}
      {selectionPopup && (
        <div
          data-docent-popup
          style={{
            position: 'absolute',
            left: selectionPopup.x,
            top: selectionPopup.y,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-base)] border border-orange-500/50 rounded-full shadow-2xl whitespace-nowrap"
        >
          <span className="text-xs">🎓</span>
          <button
            onMouseDown={(e) => {
              e.preventDefault()
              sendMessage(selectionPopup.text, true)
            }}
            className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
          >
            Ask AI Docent
          </button>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-6 right-6 z-50 shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
          open
            ? 'w-14 h-14 rounded-full bg-[var(--bg-elevated-2)] text-white text-xl'
            : 'h-12 rounded-full bg-violet-600 hover:bg-violet-700 text-white px-4 gap-2'
        }`}
        title="AI Docent — expert guide for this content"
      >
        {open ? (
          <span className="text-xl">✕</span>
        ) : (
          <>
            <span className="text-lg leading-none">🎓</span>
            <span className="text-sm font-bold whitespace-nowrap">AI Docent</span>
          </>
        )}
      </button>

      {/* 채팅 패널 */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-[400px] h-[540px] bg-[var(--bg-base)] rounded-2xl flex flex-col shadow-2xl border border-violet-500/20 overflow-hidden"
        >
          {/* 헤더 */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-surface)] shrink-0">
            <div className="w-9 h-9 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-base shrink-0">
              🎓
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold">AI Docent</p>
              <p className="text-violet-400/70 text-[11px] truncate">{title}</p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); cacheIdRef.current = undefined }}
                className="text-[var(--text-subtle)] hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-[var(--overlay-subtle)] transition-colors shrink-0"
              >
                Reset
              </button>
            )}
          </div>

          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                {/* 도슨트 소개 + 사용 팁 */}
                <div className="bg-violet-600/10 border border-violet-500/20 rounded-xl px-3 py-3 space-y-1.5">
                  <p className="text-violet-300 text-xs font-semibold">Your dedicated AI guide for this content.</p>
                  <p className="text-[var(--text-muted)] text-xs leading-relaxed">
                    Ask anything you&apos;re curious about or don&apos;t understand.<br/>
                    <span className="text-violet-400 font-medium">💡 Tip: </span>
                    <span className="hidden md:inline"><strong className="text-white">Drag</strong> any text to ask about it instantly.</span>
                    <span className="md:hidden"><strong className="text-white">Long-press and copy</strong> any text, or type your question directly.</span>
                  </p>
                </div>

                {/* 빠른 질문 */}
                <p className="text-[var(--text-subtle)] text-xs px-1">You can also ask things like</p>
                <div className="space-y-1.5">
                  {suggestions.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="w-full text-left text-xs px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-elevated-2)] transition-colors border border-[var(--border-subtle)]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[88%]">
                  {msg.role === 'model' && (
                    <p className="text-[10px] text-violet-400/60 mb-1 pl-1">🎓 AI Docent</p>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl rounded-bl-sm bg-[var(--bg-elevated)]">
                  <span className="inline-flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div className="px-3 py-3 border-t border-[var(--border-default)] bg-[var(--bg-surface)] shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                disabled={loading}
                rows={1}
                className="flex-1 min-h-[36px] max-h-[96px] px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-violet-500/50 transition-colors disabled:opacity-60 resize-none"
                style={{ overflowY: 'auto' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
              >
                <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-subtle)] mt-1.5 text-center">Shift+Enter newline · Enter to send</p>
          </div>
        </div>
      )}
    </>
  )
}
