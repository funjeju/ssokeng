'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface HistoryItem {
  sessionId: string
  videoId: string
  title: string
  thumbnail: string
  category: string
  date: string
}

const CATEGORY_LABEL: Record<string, string> = {
  recipe: '🍳 Recipe',
  english: '🔤 Language',
  learning: '📐 Learning',
  news: '🗞️ News',
  selfdev: '💪 Self-Dev',
  travel: '🧳 Travel',
  story: '🍿 Story',
}

export default function RecentHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const historyJson = localStorage.getItem('nextcurator_history')
      if (historyJson) {
        const allHistory: HistoryItem[] = JSON.parse(historyJson)
        // Only show items that still have their summary in sessionStorage
        const aliveHistory = allHistory.filter(item =>
          sessionStorage.getItem(`summary_${item.sessionId}`) !== null
        )
        // Sync back — remove dead items from localStorage
        localStorage.setItem('nextcurator_history', JSON.stringify(aliveHistory))
        setHistory(aliveHistory)
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  if (!mounted || history.length === 0) return null

  const recentItems = history.slice(0, 3)
  const hasMore = history.length > 3

  return (
    <div className="w-full flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-8 mb-2">
      <div className="flex items-center justify-between">
        <p className="text-[var(--text-subtle)] text-sm font-medium">Recent Summaries</p>
        <Link href="/history" className="text-xs font-medium text-orange-400 hover:text-orange-300 transition-colors">
          View all history →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {recentItems.map((item) => (
          <Link
            key={item.sessionId}
            href={`/result/${item.sessionId}`}
            className="group block relative overflow-hidden rounded-[16px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all"
          >
            <div className="aspect-video relative overflow-hidden">
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-white">
                {CATEGORY_LABEL[item.category] || 'Analyzed'}
              </div>
            </div>
            <div className="p-3">
              <p className="text-[var(--text-primary)] text-xs font-medium line-clamp-2 leading-snug group-hover:text-white transition-colors">
                {item.title}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
