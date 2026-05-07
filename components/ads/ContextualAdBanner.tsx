'use client'

/**
 * 카테고리 컨텍스트 광고 배너
 *
 * AdSense는 광고 초기화 시점에 DOM 전체를 스캔해 컨텍스트를 결정한다.
 * 이 컴포넌트는 광고 슬롯 바로 위에 카테고리 관련 visible 텍스트를 배치해
 * 구글이 올바른 카테고리 광고(요리 → 요리, 여행 → 여행)를 서빙하도록 유도한다.
 */

import { useEffect, useRef } from 'react'

const CLIENT   = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
const SLOT_MID = process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULT_MID    || ''
const SLOT_BOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULT_BOTTOM || ''

interface CategoryMeta {
  label: string
  emoji: string
  contextText: string   // AdSense가 읽을 visible 카테고리 키워드
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  recipe:  { label: 'Cooking & Kitchen',      emoji: '🍳', contextText: 'cooking recipes ingredients kitchen tools cookware food cuisine' },
  travel:  { label: 'Travel & Stays',         emoji: '🧳', contextText: 'travel accommodation hotel flights tourism tour destinations booking' },
  selfdev: { label: 'Self-dev & Books',        emoji: '💪', contextText: 'self development books growth motivation productivity reading habits goals' },
  english: { label: 'English Learning',        emoji: '🔤', contextText: 'English learning textbook conversation TOEIC grammar study language' },
  learning:{ label: 'Study & Education',       emoji: '📐', contextText: 'study education learning textbook lecture tutoring class school' },
  news:    { label: 'Economics & News',        emoji: '🗞️', contextText: 'economics stocks investment real estate news finance wealth management' },
  tips:    { label: 'Life Tips & Reviews',     emoji: '💡', contextText: 'life tips reviews recommendations products comparison shopping information' },
  story:   { label: 'Video & Entertainment',  emoji: '🍿', contextText: 'movies dramas OTT Netflix streaming anime entertainment content' },
  report:  { label: 'Business & Analysis',    emoji: '📋', contextText: 'business analysis report marketing company strategy research' },
}

const DEFAULT_META: CategoryMeta = {
  label: 'Related Info', emoji: '✨', contextText: 'AI summary YouTube content information',
}

interface Props {
  category: string
  position?: 'mid' | 'bottom'
  className?: string
}

export default function ContextualAdBanner({ category, position = 'mid', className = '' }: Props) {
  const adRef   = useRef<HTMLModElement | null>(null)
  const pushed  = useRef(false)
  const slotId  = position === 'mid' ? SLOT_MID : SLOT_BOT
  const meta    = CATEGORY_META[category] ?? DEFAULT_META

  useEffect(() => {
    if (!CLIENT || !slotId || pushed.current) return
    try {
      pushed.current = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
    } catch { /* 광고 블록 또는 미로드 */ }
  }, [slotId])

  if (!CLIENT || !slotId) return null

  return (
    <div className={`rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-base)] ${className}`}>
      {/* 카테고리 라벨 — AdSense가 이 텍스트를 읽어 관련 광고를 선택한다 */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[var(--border-subtle)]">
        <span className="text-sm leading-none" aria-hidden="true">{meta.emoji}</span>
        <span className="text-[10px] text-[var(--text-subtle)] select-none">
          {meta.label} · {meta.contextText}
        </span>
        <span className="ml-auto text-[9px] font-bold text-[var(--text-subtle)] tracking-widest">AD</span>
      </div>

      {/* 광고 슬롯 */}
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', minHeight: position === 'mid' ? '90px' : '60px' }}
        data-ad-client={CLIENT}
        data-ad-slot={slotId}
        data-ad-format={position === 'mid' ? 'auto' : 'horizontal'}
        data-full-width-responsive="true"
      />
    </div>
  )
}
