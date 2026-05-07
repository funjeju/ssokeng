'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import LoadingSteps from './LoadingSteps'
import RecentHistory from './RecentHistory'
import { useAuth } from '@/providers/AuthProvider'
import { saveSummary } from '@/lib/db'

const CATEGORIES = [
  { id: 'auto',    icon: '✨', label: 'Auto' },
  { id: 'recipe',  icon: '🍳', label: 'Recipe' },
  { id: 'english', icon: '🔤', label: 'Language' },
  { id: 'learning',icon: '📐', label: 'Learning' },
  { id: 'news',    icon: '🗞️', label: 'News' },
  { id: 'selfdev', icon: '💪', label: 'Self-Dev' },
  { id: 'travel',  icon: '🧳', label: 'Travel' },
  { id: 'story',   icon: '🍿', label: 'Story' },
  { id: 'tips',    icon: '💡', label: 'Tips' },
  { id: 'report',  icon: '📋', label: 'Report' },
]

const GUEST_STORAGE_KEY = 'nextcurator_guest_usage'
const GUEST_DAILY_LIMIT = 2

function getTodayStr() {
  return new Date().toISOString().slice(0, 10)
}

function getGuestUsage(): number {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY)
    if (!raw) return 0
    const { count, date } = JSON.parse(raw)
    if (date !== getTodayStr()) return 0  // 날짜 바뀌면 리셋
    return count ?? 0
  } catch { return 0 }
}

function incrementGuestUsage() {
  try {
    const count = getGuestUsage()
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ count: count + 1, date: getTodayStr() }))
  } catch {}
}

type ModalType = 'guest_info' | 'guest_limit_duration' | 'guest_limit_count' | 'lang_choice' | null

interface LangChoiceData {
  detectedLang: 'en' | 'other'
  cachedTranscript: string
  cachedVideoInfo: { title: string; channel: string; thumbnail: string; publishedAt: string }
}

function toUserMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/bad control character|json parse|unexpected token|json at position/i.test(msg))
    return 'A temporary AI error occurred. Please try again in a moment.'
  if (/VIDEO_NOT_FOUND/i.test(msg))
    return 'Could not fetch video info. Please check the URL and try again.'
  if (/fetch|network|econnrefused|timeout/i.test(msg))
    return 'Network error. Please check your internet connection and try again.'
  if (/quota|rate.?limit|resource.?exhausted/i.test(msg))
    return 'AI service is temporarily busy. Please try again in a moment.'
  if (msg === 'STT_VIP_REQUIRED')
    return 'Videos over 10 minutes without captions will be available to VIP members. Currently only videos under 10 minutes are supported.'
  if (msg.length > 80) return 'An error occurred while processing. Please try again in a moment.'
  return msg
}

export default function UrlInput() {
  const { user, signInWithGoogle } = useAuth()
  const [url, setUrl] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('auto')
  const [loading, setLoading] = useState(false)
  const [loadingMode, setLoadingMode] = useState<'youtube' | 'pdf' | 'url' | 'voice'>('youtube')
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [error, setError] = useState('')
  const [step, setStep] = useState(0)
  const [modal, setModal] = useState<ModalType>(null)
  const [langChoiceData, setLangChoiceData] = useState<LangChoiceData | null>(null)
  const [checkingDuration, setCheckingDuration] = useState(false)
  const router = useRouter()

  // YouTube 가져오기 탭에서 넘어온 URL 자동 채우기
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlParam = params.get('url')
    if (urlParam) setUrl(urlParam)
  }, [])

  const handleCancel = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setLoading(false)
    setStep(0)
    setError('')
  }

  // 파일 처리 (PDF / 오디오 통합)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    await processFile(file)
  }

  const processFile = async (file: File) => {
    const isAudio = file.type.startsWith('audio/') ||
      /\.(mp3|wav|m4a|ogg|flac|webm|aac)$/i.test(file.name)
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf')

    if (!isAudio && !isPdf) {
      setError('Only PDF documents or audio files (MP3, WAV, M4A, etc.) are supported.')
      return
    }
    const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
    if (!isAdmin && file.size > 30 * 1024 * 1024) {
      setError('File size must be 30MB or less.')
      return
    }

    // 비회원 하루 2회 한도
    if (!user && getGuestUsage() >= GUEST_DAILY_LIMIT) {
      setModal('guest_limit_count')
      return
    }

    setError('')
    setLoadingMode(isAudio ? 'voice' : 'pdf')
    setLoading(true)
    setStep(1)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (!isAudio && selectedCategory !== 'auto') formData.append('category', selectedCategory)

      const headers: HeadersInit = {}
      if (user) {
        try { headers['Authorization'] = `Bearer ${await user.getIdToken()}` } catch {}
      }

      setStep(3)
      const endpoint = isAudio ? '/api/summarize-voice' : '/api/summarize-pdf'
      const res = await fetch(endpoint, { method: 'POST', body: formData, headers, signal: controller.signal })
      setStep(4)
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Processing failed') }
      const data = await res.json()
      setStep(5)

      // 로그인 유저 → 비공개로 자동 저장 (마이페이지 즉시 보관)
      if (user) {
        try {
          await saveSummary({
            userId: user.uid,
            userDisplayName: user.displayName || '',
            userPhotoURL: user.photoURL || '',
            folderId: undefined,
            sessionId: data.sessionId,
            videoId: data.videoId || '',
            title: data.title,
            channel: data.channel,
            thumbnail: data.thumbnail || '',
            category: data.category,
            summary: data.summary,
            square_meta: data.summary?.square_meta,
            isPublic: false,
            transcript: data.transcript || '',
            transcriptSource: data.transcriptSource || '',
          })
        } catch (e) {
          console.warn('[AutoSave] 자동 저장 실패:', e)
        }
      }

      sessionStorage.setItem(`summary_${data.sessionId}`, JSON.stringify(data))
      router.push(`/result/${data.sessionId}`)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return  // 취소 — 이미 handleCancel에서 상태 초기화
      setError(toUserMessage(err))
      setLoading(false)
      setStep(0)
    }
  }

  // 녹음 시작/중지
  const handleRecordToggle = async () => {
    if (recording) {
      // 중지 → 처리
      mediaRecorderRef.current?.stop()
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
      setRecording(false)
      setRecordingSeconds(0)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const chunks: BlobPart[] = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm'
      const rec = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = rec

      rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        wakeLockRef.current?.release().catch(() => {})
        wakeLockRef.current = null
        const blob = new Blob(chunks, { type: mimeType })
        const file = new File([blob], `recording_${Date.now()}.webm`, { type: mimeType })
        await processFile(file)
      }

      // 화면 꺼짐 방지 (지원 브라우저: Chrome 84+, Safari 16.4+)
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
      } catch { /* 미지원 기기 무시 */ }

      rec.start()
      setRecording(true)
      setRecordingSeconds(0)
      recordingTimerRef.current = setInterval(() =>
        setRecordingSeconds(s => s + 1), 1000)
    } catch {
      setError('Microphone access is required.')
    }
  }

  // 요약 결과 저장 + 페이지 이동 공통 처리
  const finalizeSummary = (data: Record<string, unknown>) => {
    if (!user) incrementGuestUsage()
    sessionStorage.setItem(`summary_${data.sessionId}`, JSON.stringify(data))
    try {
      const historyJson = localStorage.getItem('nextcurator_history')
      const history = historyJson ? JSON.parse(historyJson) : []
      const filtered = history.filter((item: any) => item.sessionId !== data.sessionId)
      filtered.unshift({ sessionId: data.sessionId, videoId: data.videoId, title: data.title, thumbnail: data.thumbnail, category: data.category, date: new Date().toISOString() })
      localStorage.setItem('nextcurator_history', JSON.stringify(filtered))
    } catch {}
    router.push(`/result/${data.sessionId}`)
  }

  // 실제 요약 실행 (1차: 자막 추출 + 언어 감지)
  const runSummarize = async () => {
    setError('')
    const isYoutube = /youtube\.com|youtu\.be/.test(url)
    setLoadingMode(isYoutube ? 'youtube' : 'url')
    setLoading(true)
    setStep(1)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      setStep(2)
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (user) {
        try { headers['Authorization'] = `Bearer ${await user.getIdToken()}` } catch {}
      }
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url, category: selectedCategory === 'auto' ? undefined : selectedCategory }),
        signal: controller.signal,
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'An error occurred.') }
      const data = await res.json()

      // 비한국어 자막 감지 → 언어 선택 모달 표시
      if (data.needsLangChoice) {
        setLoading(false)
        setStep(0)
        setLangChoiceData(data as LangChoiceData)
        setModal('lang_choice')
        return
      }

      setStep(4)
      finalizeSummary(data)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError(toUserMessage(err))
      setLoading(false)
      setStep(0)
    }
  }

  // 2차 요약 실행 (언어 선택 후)
  const runSummarizeWithLang = async (summaryLang: 'ko' | 'original') => {
    if (!langChoiceData) return
    setModal(null)
    setLoading(true)
    setStep(3)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      setStep(4)
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (user) {
        try { headers['Authorization'] = `Bearer ${await user.getIdToken()}` } catch {}
      }
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url,
          category: selectedCategory === 'auto' ? undefined : selectedCategory,
          summaryLang,
          cachedTranscript: langChoiceData.cachedTranscript,
          cachedVideoInfo: langChoiceData.cachedVideoInfo,
        }),
        signal: controller.signal,
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'An error occurred.') }
      setStep(5)
      const data = await res.json()
      finalizeSummary(data)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setError(toUserMessage(err))
      setLoading(false)
      setStep(0)
    }
  }

  // Start Now 클릭
  const handleSubmit = async () => {
    if (!url.trim()) return

    // 로그인 유저 → 바로 실행
    if (user) { runSummarize(); return }

    // 비회원: 하루 2회 한도
    const usageCount = getGuestUsage()
    if (usageCount >= GUEST_DAILY_LIMIT) { setModal('guest_limit_count'); return }

    // 비회원: 영상 길이 확인
    setCheckingDuration(true)
    try {
      const res = await fetch(`/api/video-duration?url=${encodeURIComponent(url)}`)
      const { allowed, durationSeconds } = await res.json()
      if (!allowed && durationSeconds > 600) {
        setModal('guest_limit_duration')
        return
      }
    } catch {
      // duration 확인 실패 시 진행 허용
    } finally {
      setCheckingDuration(false)
    }

    // 비회원 안내 팝업 표시
    setModal('guest_info')
  }

  if (loading) return <LoadingSteps currentStep={step} mode={loadingMode} onCancel={handleCancel} />

  return (
    <>
      <div className="flex flex-col items-start gap-6 w-full max-w-2xl bg-[var(--bg-elevated)]/80 backdrop-blur-3xl px-4 py-6 md:p-10 rounded-[32px] border border-[var(--border-subtle)] shadow-2xl">

        {/* URL 입력 */}
        <div className="flex flex-col gap-4 w-full">
          <label className="text-[var(--text-primary)] text-[15px] font-semibold tracking-wide flex items-center gap-2">
            Enter Video URL <span className="text-orange-400">⚡</span>
          </label>
          <div className="relative group flex flex-col md:flex-row gap-3">
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="Paste a YouTube URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="flex-1 h-[56px] text-base pl-5 pr-4 bg-[var(--bg-base)] border border-[var(--border-default)] text-white placeholder:text-[var(--text-muted)] rounded-[20px] focus-visible:ring-1 focus-visible:ring-orange-500/60 shadow-inner transition-all duration-300 hover:border-[var(--border-strong)]"
              />
              {/* 통합 파일 업로드 버튼 */}
              <div className="relative group/upload">
                <label
                  className="shrink-0 h-[56px] w-[56px] flex items-center justify-center rounded-[20px] bg-[var(--bg-surface)] hover:bg-[var(--bg-page)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] cursor-pointer transition-all text-[var(--text-subtle)] hover:text-white"
                  title="Upload file (PDF · Audio)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <input
                    type="file"
                    accept=".pdf,audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm,.aac"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
                {/* 호버 툴팁 */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/upload:flex flex-col gap-1 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-2xl px-3 py-2.5 shadow-xl w-44 text-left z-20 pointer-events-none">
                  <p className="text-white text-[11px] font-semibold mb-0.5">Upload File</p>
                  <p className="text-[var(--text-muted)] text-[10px]">📄 PDF document</p>
                  <p className="text-[var(--text-muted)] text-[10px]">🎙 MP3 · WAV · M4A · etc.</p>
                  <p className="text-[var(--text-subtle)] text-[9px] mt-0.5">Max 30MB</p>
                </div>
              </div>

              {/* 녹음 버튼 */}
              <button
                onClick={handleRecordToggle}
                className={`shrink-0 h-[56px] w-[56px] flex items-center justify-center rounded-[20px] border transition-all ${
                  recording
                    ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                    : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-page)] border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[var(--text-subtle)] hover:text-white'
                }`}
                title={recording ? 'Stop recording & analyze' : 'Record audio'}
              >
                {recording ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-3 h-3 rounded-sm bg-red-400" />
                    <span className="text-[8px] font-bold text-red-400">
                      {String(Math.floor(recordingSeconds / 60)).padStart(2,'0')}:{String(recordingSeconds % 60).padStart(2,'0')}
                    </span>
                  </div>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
                  </svg>
                )}
              </button>
            </div>
            <Button
              variant="default"
              onClick={handleSubmit}
              disabled={!url.trim() || checkingDuration}
              className="h-[56px] md:w-[140px] text-base font-bold tracking-wide rounded-[20px] transition-all duration-150
                         bg-orange-500 text-white hover:bg-orange-600 hover:scale-[1.02] active:scale-[0.94] active:bg-orange-700
                         disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-muted)] disabled:border disabled:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:transform-none select-none"
            >
              {checkingDuration ? 'Checking...' : 'Start Now'}
            </Button>
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-[#2a1d1c] border border-red-500/20 rounded-2xl px-5 py-4">
              <span className="text-red-400 text-sm font-medium">⚠️ {error}</span>
            </div>
          )}
        </div>

        {/* 카테고리 선택 */}
        <div className="flex flex-col gap-3 w-full">
          <div className="flex items-center justify-between w-full">
            <p className="text-[var(--text-subtle)] text-sm font-medium">Analysis Mode</p>
            {(() => {
              const auto = CATEGORIES[0]
              const isSelected = selectedCategory === auto.id
              return (
                <Badge variant="outline" onClick={() => setSelectedCategory(auto.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-[14px] text-xs font-medium cursor-pointer transition-all duration-300 group ${
                    isSelected ? 'border-transparent bg-white text-black' : 'border-transparent bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated-2)] hover:text-white'
                  }`}
                >
                  <span className={`text-sm transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>{auto.icon}</span>
                  <span>{auto.label}</span>
                </Badge>
              )
            })()}
          </div>
          <div className="grid grid-cols-3 md:flex md:flex-wrap gap-2 w-full">
            {CATEGORIES.slice(1).map((cat) => {
              const isSelected = selectedCategory === cat.id
              return (
                <Badge key={cat.id} variant="outline" onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 md:px-5 md:py-2.5 rounded-[14px] text-xs md:text-sm font-medium cursor-pointer transition-all duration-300 group ${
                    isSelected ? 'border-transparent bg-white text-black' : 'border-transparent bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated-2)] hover:text-white'
                  }`}
                >
                  <span className={`text-sm transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}>{cat.icon}</span>
                  <span className="tracking-wide truncate">{cat.label}</span>
                </Badge>
              )
            })}
          </div>
        </div>
      </div>

      <RecentHistory />

      {/* 모달들 */}
      {modal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl w-full max-w-sm p-7 flex flex-col gap-5 shadow-2xl">

            {/* 비회원 무료 이용 안내 */}
            {modal === 'guest_info' && (
              <>
                <div className="text-center">
                  <div className="text-4xl mb-3">🎬</div>
                  <h2 className="text-lg font-bold text-white mb-2">Free Trial</h2>
                  <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                    Guests can summarize <span className="text-white font-semibold">1 video</span> under <span className="text-white font-semibold">10 minutes</span> for free.
                  </p>
                </div>
                <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 text-xs text-[var(--text-subtle)] space-y-1.5">
                  <p>✅ 1 video under 10 min — free</p>
                  <p>✅ All categories available</p>
                  <p>🔒 More summaries require sign up</p>
                  <p>🔒 Library saving requires sign up</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full h-12 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200"
                    onClick={() => { setModal(null); runSummarize() }}
                  >
                    Summarize for Free
                  </Button>
                  <button
                    onClick={() => { setModal(null); signInWithGoogle() }}
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold rounded-2xl text-sm hover:opacity-90 active:scale-95 active:opacity-75 transition-all select-none"
                  >
                    Sign up with Google (Unlimited)
                  </button>
                  <button onClick={() => setModal(null)} className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors py-1">
                    Close
                  </button>
                </div>
              </>
            )}

            {/* 10분 초과 제한 */}
            {modal === 'guest_limit_duration' && (
              <>
                <div className="text-center">
                  <div className="text-4xl mb-3">⏱️</div>
                  <h2 className="text-lg font-bold text-white mb-2">Video Over 10 Minutes</h2>
                  <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                    Guests can only summarize videos <span className="text-white font-semibold">under 10 minutes</span>.<br />
                    Sign up for unlimited access.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { setModal(null); signInWithGoogle() }}
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold rounded-2xl text-sm hover:opacity-90 active:scale-95 active:opacity-75 transition-all select-none"
                  >
                    Sign up with Google
                  </button>
                  <button onClick={() => setModal(null)} className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors py-1">
                    Close
                  </button>
                </div>
              </>
            )}

            {/* 언어 선택 */}
            {modal === 'lang_choice' && langChoiceData && (
              <>
                <div className="text-center">
                  <div className="text-4xl mb-3">
                    {langChoiceData.detectedLang === 'en' ? '🇺🇸' : '🌐'}
                  </div>
                  <h2 className="text-lg font-bold text-white mb-2">Source Language Detected</h2>
                  <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                    This video's captions are in&nbsp;
                    <span className="text-white font-semibold">
                      {langChoiceData.detectedLang === 'en' ? 'English' : 'a foreign language'}
                    </span>
                    .<br />How would you like to summarize it?
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => runSummarizeWithLang('original')}
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold rounded-2xl text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    🇺🇸 Summarize in English
                  </button>
                  <button
                    onClick={() => runSummarizeWithLang('ko')}
                    className="w-full h-12 bg-[var(--bg-elevated)] border border-[var(--border-default)] text-white font-bold rounded-2xl text-sm hover:bg-[var(--bg-elevated-2)] transition-colors flex items-center justify-center gap-2"
                  >
                    🇰🇷 Translate to Korean
                  </button>
                  <button
                    onClick={() => { setModal(null); setLangChoiceData(null) }}
                    className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors py-1"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* 사용 횟수 초과 */}
            {modal === 'guest_limit_count' && (
              <>
                <div className="text-center">
                  <div className="text-4xl mb-3">🔒</div>
                  <h2 className="text-lg font-bold text-white mb-2">Daily Free Limit Reached</h2>
                  <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                    Guests can use up to 2 free summaries per day.<br />
                    Sign up for <span className="text-white font-semibold">unlimited</span> access.
                  </p>
                </div>
                <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 text-xs text-[var(--text-subtle)] space-y-1.5">
                  <p>🎬 No video length limit</p>
                  <p>📚 Unlimited library saves</p>
                  <p>🌍 Share to the Square</p>
                  <p>✉️ Message other users</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { setModal(null); signInWithGoogle() }}
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold rounded-2xl text-sm hover:opacity-90 active:scale-95 active:opacity-75 transition-all select-none"
                  >
                    Sign up with Google — Free
                  </button>
                  <button onClick={() => setModal(null)} className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors py-1">
                    Close
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  )
}
