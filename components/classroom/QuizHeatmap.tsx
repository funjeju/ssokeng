'use client'

import { useState } from 'react'
import Link from 'next/link'
import { VideoHeatmap, HeatmapQuestion } from '@/lib/classroom'

interface Props {
  heatmaps: VideoHeatmap[]
  folders?: { id: string; name: string; depth?: number; parentId?: string | null }[]
  folderVideos?: Record<string, { videoId: string; sessionId?: string; title: string }[]>
}

function wrongColor(rate: number): string {
  if (rate === 0) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
  if (rate < 0.3)  return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20'
  if (rate < 0.6)  return 'bg-orange-500/20 text-orange-300 border-orange-500/20'
  return 'bg-red-500/20 text-red-400 border-red-500/20'
}

function wrongLabel(rate: number): string {
  if (rate === 0) return 'All correct'
  if (rate < 0.3)  return 'Good'
  if (rate < 0.6)  return 'Watch out'
  return 'Needs review'
}

// 단일 영상 히트맵
function VideoHeatmapCard({ video }: { video: VideoHeatmap }) {
  const highWrong = video.questions.filter(q => q.wrongRate >= 0.6)
  const total = video.questions.reduce((s, q) => s + q.attempts, 0)
  return (
    <div className="bg-[var(--bg-base)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <p className="text-sm font-bold text-white truncate flex-1">{video.videoTitle || '(No title)'}</p>
        {video.sessionId && (
          <Link href={`/result/${video.sessionId}`} className="shrink-0 text-[10px] text-orange-400 hover:text-orange-300 ml-3">
            View video →
          </Link>
        )}
      </div>
      <div className="px-4 py-3 space-y-2">
        {video.questions.map(q => (
          <div key={q.questionIdx} className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 w-12 shrink-0">Q{q.questionIdx + 1}</span>
              <div className="flex-1 h-5 bg-[var(--overlay-subtle)] rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all ${
                    q.wrongRate === 0 ? 'bg-emerald-500/40' :
                    q.wrongRate < 0.3  ? 'bg-yellow-500/40' :
                    q.wrongRate < 0.6  ? 'bg-orange-500/50' : 'bg-red-500/50'
                  }`}
                  style={{ width: `${Math.max(q.wrongRate * 100, 4)}%` }}
                />
                <span className="absolute right-2 top-0 text-[9px] text-gray-400 leading-5">
                  {q.attempts} attempts
                </span>
              </div>
              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${wrongColor(q.wrongRate)}`}>
                Wrong {Math.round(q.wrongRate * 100)}%
              </span>
            </div>
            {(q.question || q.wrongRate >= 0.3) && (
              <div className="pl-14 flex items-start gap-2">
                {q.question && <p className="text-[10px] text-gray-500 truncate flex-1">{q.question}</p>}
                {q.wrongRate >= 0.3 && (
                  <span className={`shrink-0 text-[9px] font-semibold ${q.wrongRate >= 0.6 ? 'text-red-400' : 'text-orange-400'}`}>
                    {wrongLabel(q.wrongRate)}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="px-4 py-2 border-t border-[var(--border-subtle)] flex gap-4">
        <span className="text-[10px] text-gray-500">{video.questions.length} questions · {total} attempts</span>
        {highWrong.length > 0 && (
          <span className="text-[10px] text-red-400 font-bold">
            ⚠ Needs review: {highWrong.length} question{highWrong.length !== 1 ? 's' : ''} (Q{highWrong.map(q => q.questionIdx + 1).join(', Q')})
          </span>
        )}
      </div>
    </div>
  )
}

// 도움 필요 종합 뷰: 모든 영상에서 오답률 높은 문제 순 정렬
function HelpNeededView({ heatmaps }: { heatmaps: VideoHeatmap[] }) {
  type FlatQ = HeatmapQuestion & { videoTitle: string; sessionId: string; videoId: string }
  const allQuestions: FlatQ[] = heatmaps.flatMap(v =>
    v.questions.map(q => ({ ...q, videoTitle: v.videoTitle, sessionId: v.sessionId, videoId: v.videoId }))
  )
  const sorted = [...allQuestions]
    .filter(q => q.attempts > 0)
    .sort((a, b) => {
      const scoreA = a.wrongRate + (a.confusedCount + a.unknownCount) / Math.max(a.attempts, 1) * 0.3
      const scoreB = b.wrongRate + (b.confusedCount + b.unknownCount) / Math.max(b.attempts, 1) * 0.3
      return scoreB - scoreA
    })

  if (sorted.length === 0) return (
    <div className="text-center py-10 text-gray-500 text-sm">No data yet.</div>
  )

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 pb-1">Questions ranked by wrong rate + comprehension deficit — most in need of help first.</p>
      {sorted.map((q, i) => (
        <div key={`${q.videoId}-${q.questionIdx}`}
          className={`rounded-xl px-4 py-3 border text-xs ${q.wrongRate >= 0.6 ? 'bg-red-500/8 border-red-500/20' : q.wrongRate >= 0.3 ? 'bg-orange-500/8 border-orange-500/15' : 'bg-[var(--bg-base)] border-[var(--border-subtle)]'}`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-gray-500 font-mono w-5 shrink-0">#{i + 1}</span>
            <span className={`font-bold px-2 py-0.5 rounded-full border text-[10px] ${wrongColor(q.wrongRate)}`}>
              Wrong {Math.round(q.wrongRate * 100)}%
            </span>
            {(q.confusedCount + q.unknownCount) > 0 && (
              <span className="text-[10px] text-yellow-400">🤔 {q.confusedCount + q.unknownCount} confused</span>
            )}
            <span className="ml-auto text-[10px] text-gray-600">{q.attempts} attempts</span>
          </div>
          {q.question && <p className="text-gray-200 font-medium mb-1 pl-7">{q.question}</p>}
          <div className="pl-7 flex items-center gap-2">
            <span className="text-gray-600 truncate flex-1">{q.videoTitle}</span>
            {q.sessionId && (
              <Link href={`/result/${q.sessionId}`} className="shrink-0 text-[10px] text-orange-400 hover:text-orange-300">
                Video →
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function QuizHeatmap({ heatmaps, folders = [], folderVideos = {} }: Props) {
  const [view, setView] = useState<'folders' | 'help'>('folders')
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(
    heatmaps.length > 0 ? heatmaps[0].videoId : null
  )
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  if (!heatmaps.length) {
    return (
      <div className="text-center py-10 text-gray-500 text-sm">
        No quiz attempt data yet.
      </div>
    )
  }

  const heatmapByVideoId = Object.fromEntries(heatmaps.map(h => [h.videoId, h]))

  // 폴더에 속한 영상 중 히트맵 데이터가 있는 것만
  const rootFolders = folders.filter(f => !f.parentId)
  // 폴더에 포함되지 않은 히트맵 (폴더 없이 직접 올라온 영상)
  const folderedVideoIds = new Set(Object.values(folderVideos).flat().map(v => v.videoId))
  const unfoldered = heatmaps.filter(h => !folderedVideoIds.has(h.videoId))

  const selectedHeatmap = selectedVideoId ? heatmapByVideoId[selectedVideoId] : null

  const toggleFolder = (id: string) =>
    setExpandedFolders(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div>
      {/* 뷰 전환 탭 */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setView('folders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${view === 'folders' ? 'bg-orange-500 text-white' : 'bg-[var(--overlay-subtle)] text-gray-400 hover:bg-[var(--overlay-default)]'}`}
        >
          📁 Heatmap by Video
        </button>
        <button
          onClick={() => setView('help')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${view === 'help' ? 'bg-red-500 text-white' : 'bg-[var(--overlay-subtle)] text-gray-400 hover:bg-[var(--overlay-default)]'}`}
        >
          🆘 Needs Help
          {heatmaps.flatMap(h => h.questions).filter(q => q.wrongRate >= 0.6).length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${view === 'help' ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-400'}`}>
              {heatmaps.flatMap(h => h.questions).filter(q => q.wrongRate >= 0.6).length}
            </span>
          )}
        </button>
      </div>

      {view === 'help' ? (
        <HelpNeededView heatmaps={heatmaps} />
      ) : (
        <div className="flex gap-4">
          {/* 왼쪽: 폴더 트리 + 영상 목록 */}
          <div className="w-56 shrink-0 flex flex-col gap-1">
            {/* 폴더 없는 영상들 */}
            {unfoldered.map(h => (
              <button
                key={h.videoId}
                onClick={() => setSelectedVideoId(h.videoId)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors truncate ${
                  selectedVideoId === h.videoId ? 'bg-orange-500 text-white font-bold' : 'bg-[var(--overlay-subtle)] text-gray-300 hover:bg-[var(--overlay-default)]'
                }`}
              >
                📊 {h.videoTitle || '(No title)'}
              </button>
            ))}

            {/* 폴더별 영상 */}
            {rootFolders.map(folder => {
              const videos = (folderVideos[folder.id] || []).filter(v => heatmapByVideoId[v.videoId])
              const subFolders = folders.filter(f => f.parentId === folder.id)
              if (videos.length === 0 && subFolders.length === 0) return null
              const isOpen = expandedFolders.has(folder.id)
              return (
                <div key={folder.id}>
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-400 hover:bg-[var(--overlay-subtle)] flex items-center gap-1.5 transition-colors"
                  >
                    <svg className={`w-2.5 h-2.5 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="truncate font-medium">{folder.name}</span>
                    <span className="ml-auto text-[9px] text-gray-600 shrink-0">{videos.length}</span>
                  </button>
                  {isOpen && (
                    <div className="ml-3 flex flex-col gap-0.5 mt-0.5">
                      {videos.map(v => (
                        <button
                          key={v.videoId}
                          onClick={() => setSelectedVideoId(v.videoId)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] transition-colors truncate ${
                            selectedVideoId === v.videoId ? 'bg-orange-500 text-white font-bold' : 'bg-[var(--overlay-subtle)] text-gray-400 hover:bg-[var(--overlay-default)]'
                          }`}
                        >
                          📊 {v.title}
                        </button>
                      ))}
                      {/* 하위폴더 */}
                      {subFolders.map(sf => {
                        const sfVideos = (folderVideos[sf.id] || []).filter(v => heatmapByVideoId[v.videoId])
                        if (!sfVideos.length) return null
                        const sfOpen = expandedFolders.has(sf.id)
                        return (
                          <div key={sf.id}>
                            <button
                              onClick={() => toggleFolder(sf.id)}
                              className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] text-gray-500 hover:bg-[var(--overlay-subtle)] flex items-center gap-1.5 transition-colors"
                            >
                              <svg className={`w-2 h-2 transition-transform shrink-0 ${sfOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="truncate">{sf.name}</span>
                            </button>
                            {sfOpen && sfVideos.map(v => (
                              <button
                                key={v.videoId}
                                onClick={() => setSelectedVideoId(v.videoId)}
                                className={`w-full text-left px-3 py-1.5 ml-3 rounded-lg text-[11px] transition-colors truncate ${
                                  selectedVideoId === v.videoId ? 'bg-orange-500 text-white font-bold' : 'bg-[var(--overlay-subtle)] text-gray-400 hover:bg-[var(--overlay-default)]'
                                }`}
                              >
                                📊 {v.title}
                              </button>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* 폴더 정보 없는 경우 fallback: 전체 목록 */}
            {rootFolders.length === 0 && unfoldered.length === 0 && heatmaps.map(h => (
              <button
                key={h.videoId}
                onClick={() => setSelectedVideoId(h.videoId)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors truncate ${
                  selectedVideoId === h.videoId ? 'bg-orange-500 text-white font-bold' : 'bg-[var(--overlay-subtle)] text-gray-300 hover:bg-[var(--overlay-default)]'
                }`}
              >
                📊 {h.videoTitle || '(No title)'}
              </button>
            ))}
          </div>

          {/* 오른쪽: 선택된 영상 히트맵 */}
          <div className="flex-1 min-w-0">
            {selectedHeatmap ? (
              <VideoHeatmapCard video={selectedHeatmap} />
            ) : (
              <div className="text-center py-16 text-gray-600 text-sm">
                Select a video on the left
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
