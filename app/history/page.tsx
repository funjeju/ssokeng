'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const historyJson = localStorage.getItem('nextcurator_history')
      if (historyJson) {
        setHistory(JSON.parse(historyJson))
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-[var(--bg-page)] font-sans">
      {/* Navigation Layer */}
      <div className="sticky top-0 z-50 bg-[var(--bg-page)]/90 backdrop-blur-xl border-b border-[var(--border-subtle)] py-4 px-6 md:px-8 mb-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight text-white hover:opacity-80 transition-opacity">
            🎬 Next Curator
          </Link>
          <span className="text-[var(--text-muted)] text-sm font-medium">My Summary History</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">History</h1>
          <p className="text-[var(--text-muted)]">All your analyzed videos in one place.</p>
        </div>

        {history.length === 0 ? (
          <div className="bg-[var(--bg-elevated)]/50 rounded-[32px] p-12 text-center border border-[var(--border-subtle)]">
            <span className="text-4xl mb-4 block">📭</span>
            <h2 className="text-xl text-white font-medium mb-2">No history yet</h2>
            <p className="text-[var(--text-subtle)] text-sm mb-6">Summarize your first video!</p>
            <Link href="/" className="inline-block px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors">
              Analyze a video
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {history.map((item) => (
              <Link 
                key={item.sessionId} 
                href={`/result/${item.sessionId}`}
                className="group flex flex-col rounded-[24px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] overflow-hidden hover:border-[var(--border-strong)] transition-all hover:-translate-y-1 shadow-lg"
              >
                <div className="aspect-video relative overflow-hidden bg-[var(--bg-surface)]">
                  <img 
                    src={item.thumbnail} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-medium text-white border border-[var(--border-default)]">
                    {CATEGORY_LABEL[item.category] || 'Analyzed'}
                  </div>
                </div>
                <div className="p-5 flex flex-col gap-2 flex-1">
                  <p className="text-[var(--text-primary)] text-[15px] font-medium line-clamp-2 leading-snug group-hover:text-white transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[var(--text-subtle)] text-[11px] mt-auto pt-2 border-t border-[var(--border-subtle)] font-mono">
                    {new Date(item.date).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
