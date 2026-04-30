'use client'

import { useEffect, useRef, useCallback } from 'react'

export interface WatchLog {
  durationSec: number
  percentWatched: number
  completed: boolean   // 80% 이상 시청 or 영상 끝
}

interface YoutubePlayerProps {
  videoId: string
  onPlayerReady?: (player: YT.Player) => void
  onWatchLog?: (log: WatchLog) => void
  onPlayStart?: () => void              // 최초 재생 시작 시 콜백
  quizTimestamps?: number[]
  onQuizTrigger?: (timestampSec: number) => void
}

declare global {
  interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady: () => void
  }
}

export default function YoutubePlayer({ videoId, onPlayerReady, onWatchLog, onPlayStart, quizTimestamps, onQuizTrigger }: YoutubePlayerProps) {
  const playerRef = useRef<YT.Player | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const watchStartRef = useRef<number>(0)
  const totalWatchedRef = useRef<number>(0)
  const reportedRef = useRef<boolean>(false)
  const playStartFiredRef = useRef<boolean>(false)  // onPlayStart 최초 1회만
  const tickRef = useRef<number | null>(null)
  const quizTimestampsRef = useRef<number[]>([])
  const onQuizTriggerRef = useRef<((ts: number) => void) | undefined>(undefined)
  const onPlayStartRef = useRef<(() => void) | undefined>(undefined)
  const shownQuizRef = useRef<Set<number>>(new Set())

  useEffect(() => { quizTimestampsRef.current = quizTimestamps ?? [] }, [quizTimestamps])
  useEffect(() => { onQuizTriggerRef.current = onQuizTrigger }, [onQuizTrigger])
  useEffect(() => { onPlayStartRef.current = onPlayStart }, [onPlayStart])

  const stopTick = useCallback(() => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const report = useCallback((player: YT.Player, completed: boolean) => {
    if (!onWatchLog) return
    const duration = player.getDuration?.() || 0
    if (!duration) return
    const pct = Math.min(100, Math.round((totalWatchedRef.current / duration) * 100))
    if (pct >= 5) {  // 5% 이상 봤을 때만 기록 (우발적 클릭 제외)
      if (completed) reportedRef.current = true
      onWatchLog({ durationSec: Math.round(totalWatchedRef.current), percentWatched: pct, completed })
    }
  }, [onWatchLog])

  const initPlayer = useCallback(() => {
    if (!containerRef.current) return
    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: { rel: 0, modestbranding: 1 },
      events: {
        onReady: (e: YT.PlayerEvent) => {
          onPlayerReady?.(e.target)
        },
        onStateChange: (e: YT.OnStateChangeEvent) => {
          const player = e.target
          if (e.data === window.YT.PlayerState.PLAYING) {
            watchStartRef.current = Date.now()
            // 최초 재생 시작 콜백
            if (!playStartFiredRef.current && onPlayStartRef.current) {
              playStartFiredRef.current = true
              onPlayStartRef.current()
            }
            tickRef.current = window.setInterval(() => {
              totalWatchedRef.current += 1

              // 퀴즈 타임스탬프 감지
              const qts = quizTimestampsRef.current
              if (qts.length > 0 && onQuizTriggerRef.current) {
                const currentTime = player.getCurrentTime?.() ?? 0
                for (const ts of qts) {
                  if (!shownQuizRef.current.has(ts) && currentTime >= ts && currentTime <= ts + 2) {
                    shownQuizRef.current.add(ts)
                    player.pauseVideo()
                    onQuizTriggerRef.current(ts)
                    break
                  }
                }
              }

              const duration = player.getDuration?.() || 0
              if (duration > 0) {
                const pct = (totalWatchedRef.current / duration) * 100
                if (pct >= 80 && !reportedRef.current) {
                  report(player, true)
                }
              }
            }, 1000)
          } else if (
            e.data === window.YT.PlayerState.PAUSED ||
            e.data === window.YT.PlayerState.BUFFERING
          ) {
            stopTick()
            if (watchStartRef.current) {
              totalWatchedRef.current += (Date.now() - watchStartRef.current) / 1000
              watchStartRef.current = 0
            }
            // 일시정지 시 현재까지의 진행률 기록 (완료 아님)
            if (e.data === window.YT.PlayerState.PAUSED && !reportedRef.current) {
              report(player, false)
            }
          } else if (e.data === window.YT.PlayerState.ENDED) {
            stopTick()
            report(player, true)
          }
        },
      },
    })
  }, [videoId, onPlayerReady, report, stopTick])

  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initPlayer()
      return
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
    window.onYouTubeIframeAPIReady = initPlayer
    return () => {
      stopTick()
      window.onYouTubeIframeAPIReady = () => {}
    }
  }, [initPlayer, stopTick])

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
