'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSavedWorksheets, deleteSavedWorksheet, SavedWorksheet } from '@/lib/db'
import WorksheetPanel from './WorksheetPanel'

const LEVEL_COLOR: Record<string, string> = {
  elementary: 'bg-green-500/20 text-green-400 border-green-500/30',
  middle:     'bg-blue-500/20  text-blue-400  border-blue-500/30',
  advanced:   'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export default function SavedWorksheets({ userId }: { userId: string }) {
  const [items, setItems] = useState<SavedWorksheet[]>([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<SavedWorksheet | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    getSavedWorksheets(userId)
      .then(data => setItems(data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))))
      .finally(() => setLoading(false))
  }, [userId])

  const handleDelete = async (id: string) => {
    if (!confirm('워크시트를 삭제할까요?')) return
    setDeleting(id)
    try {
      await deleteSavedWorksheet(id)
      setItems(prev => prev.filter(i => i.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="w-6 h-6 animate-spin text-orange-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <span className="text-4xl">📝</span>
        <p className="text-[var(--text-subtle)] text-sm">저장된 워크시트가 없습니다.</p>
        <p className="text-[var(--text-subtle)] text-xs">영어 영상 분석 후 워크시트를 생성하고 저장해보세요.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-all overflow-hidden">
            <div className="flex gap-3 p-4">
              {item.thumbnail && (
                <img src={item.thumbnail} alt="" className="w-20 h-14 rounded-xl object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${LEVEL_COLOR[item.level]}`}>
                    {item.levelLabel}
                  </span>
                </div>
                <p className="text-white text-sm font-semibold truncate">{item.title}</p>
                {item.channel && <p className="text-[var(--text-subtle)] text-xs mt-0.5">{item.channel}</p>}
                <p className="text-[var(--text-subtle)] text-xs mt-1">
                  단어 {item.worksheet?.vocabulary?.length ?? 0}개 · 문제 {item.worksheet?.exercises?.reduce((s: number, e: any) => s + e.questions.length, 0) ?? 0}개
                </p>
              </div>
            </div>
            <div className="flex border-t border-[var(--border-subtle)]">
              <button
                onClick={() => setViewing(item)}
                className="flex-1 py-2.5 text-xs font-semibold text-orange-400 hover:bg-[var(--overlay-subtle)] transition-colors"
              >
                📖 열기
              </button>
              {item.sessionId && (
                <Link
                  href={`/result/${item.sessionId}`}
                  className="flex-1 py-2.5 text-xs font-semibold text-[var(--text-muted)] hover:text-blue-400 hover:bg-[var(--overlay-subtle)] transition-colors border-l border-[var(--border-subtle)] text-center"
                >
                  🎬 영상 보기
                </Link>
              )}
              <button
                onClick={() => handleDelete(item.id)}
                disabled={deleting === item.id}
                className="flex-1 py-2.5 text-xs font-semibold text-[var(--text-subtle)] hover:text-red-400 hover:bg-[var(--overlay-subtle)] transition-colors border-l border-[var(--border-subtle)] disabled:opacity-40"
              >
                {deleting === item.id ? '삭제 중...' : '🗑️ 삭제'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {viewing && (
        <WorksheetPanel
          worksheet={viewing.worksheet}
          onClose={() => setViewing(null)}
          userId={userId}
          sessionId={viewing.sessionId}
          videoId={viewing.videoId}
          videoTitle={viewing.title}
          channel={viewing.channel}
          thumbnail={viewing.thumbnail}
        />
      )}
    </>
  )
}
