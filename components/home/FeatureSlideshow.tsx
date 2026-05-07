'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const FEATURES = [
  {
    emoji: '🍳',
    headline: 'Just say "Next step" while your hands are busy cooking',
    subline: 'Auto-convert cooking videos into recipe cards',
    href: '/guide/summary/recipe',
    color: 'from-orange-500/20 to-amber-500/10',
    accent: 'text-orange-400',
  },
  {
    emoji: '📋',
    headline: '500 Watch Later videos — cleared in one night',
    subline: 'AI bulk-summarize your YouTube playlists',
    href: '/guide/import',
    color: 'from-red-500/20 to-rose-500/10',
    accent: 'text-red-400',
  },
  {
    emoji: '✍️',
    headline: 'Turn any YouTube video into a blog post in 1 minute',
    subline: 'Video → SEO-optimized blog draft, automatically',
    href: '/guide/blog',
    color: 'from-violet-500/20 to-purple-500/10',
    accent: 'text-violet-400',
  },
  {
    emoji: '🔤',
    headline: 'English videos → level-differentiated worksheets',
    subline: 'CEFR-based learning materials from YouTube',
    href: '/guide/summary/english',
    color: 'from-blue-500/20 to-sky-500/10',
    accent: 'text-blue-400',
  },
  {
    emoji: '🗞️',
    headline: '10 news videos, briefed in 5 minutes',
    subline: 'News & business videos organized by 5W1H',
    href: '/guide/summary/news',
    color: 'from-slate-500/20 to-zinc-500/10',
    accent: 'text-slate-300',
  },
  {
    emoji: '🎬',
    headline: 'Pull viral moments from long-form into Shorts scripts',
    subline: 'YouTube video → short-form script, auto-extracted',
    href: '/guide/shorts',
    color: 'from-pink-500/20 to-fuchsia-500/10',
    accent: 'text-pink-400',
  },
  {
    emoji: '🧳',
    headline: 'AI turns travel vlog spots into a full itinerary',
    subline: 'Auto-extract places, tips & schedule from travel videos',
    href: '/guide/summary/travel',
    color: 'from-emerald-500/20 to-teal-500/10',
    accent: 'text-emerald-400',
  },
  {
    emoji: '🔍',
    headline: '"Where did that video I watched last week go?"',
    subline: 'Search your library by chatting with AI',
    href: '/guide/search',
    color: 'from-cyan-500/20 to-sky-500/10',
    accent: 'text-cyan-400',
  },
  {
    emoji: '🌐',
    headline: 'Same video, different perspectives — all in one place',
    subline: 'Share & discover summaries on the Square',
    href: '/guide/square',
    color: 'from-amber-500/20 to-yellow-500/10',
    accent: 'text-amber-400',
  },
  {
    emoji: '🎓',
    headline: 'Teachers: YouTube videos become ready-made worksheets',
    subline: 'Manage student learning with Classroom',
    href: '/guide/classroom',
    color: 'from-lime-500/20 to-green-500/10',
    accent: 'text-lime-400',
  },
]

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function FeatureSlideshow() {
  const [items] = useState(() => shuffled(FEATURES))
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)

  const goTo = useCallback((idx: number) => {
    if (animating) return
    setAnimating(true)
    setTimeout(() => {
      setCurrent(idx)
      setAnimating(false)
    }, 200)
  }, [animating])

  const next = useCallback(() => goTo((current + 1) % items.length), [current, goTo, items.length])
  const prev = useCallback(() => goTo((current - 1 + items.length) % items.length), [current, goTo, items.length])

  useEffect(() => {
    const t = setInterval(next, 3000)
    return () => clearInterval(t)
  }, [next])

  const f = items[current]

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* 슬라이드 카드 */}
      <Link
        href={f.href}
        className={`w-full max-w-2xl bg-gradient-to-br ${f.color} border border-[var(--border-default)] rounded-2xl px-6 py-5 flex items-center gap-4 transition-all duration-300 hover:border-[var(--border-strong)] hover:scale-[1.01] group ${animating ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}
        style={{ transition: 'opacity 0.2s, transform 0.2s' }}
      >
        <span className="text-3xl shrink-0">{f.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm md:text-base text-white leading-snug group-hover:${f.accent} transition-colors`}>
            {f.headline}
          </p>
          <p className="text-[var(--text-subtle)] text-xs mt-0.5 truncate">{f.subline}</p>
        </div>
        <svg className={`w-4 h-4 shrink-0 ${f.accent} opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>

      {/* 컨트롤 */}
      <div className="flex items-center gap-3">
        <button onClick={prev} className="text-[var(--text-subtle)] hover:text-white transition-colors p-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all ${i === current ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'}`}
            />
          ))}
        </div>
        <button onClick={next} className="text-[var(--text-subtle)] hover:text-white transition-colors p-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <Link href="/guide" className="text-[10px] text-[var(--text-subtle)] hover:text-white transition-colors ml-1">
          All features →
        </Link>
      </div>
    </div>
  )
}
