'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CuratedPost } from '@/lib/magazine'

const TOPIC_META: Record<string, { label: string; emoji: string; desc: string; color: string; textColor: string; borderColor: string }> = {
  'ai-news':     { label: 'AI 소식',  emoji: '📰', desc: '최신 AI 업계 뉴스·발표',  color: 'bg-blue-500/15',   textColor: 'text-blue-400',   borderColor: 'border-blue-500/30'   },
  'ai-tools':    { label: 'AI 도구',  emoji: '🛠️', desc: '생산성 AI 도구·앱 리뷰',  color: 'bg-purple-500/15', textColor: 'text-purple-400', borderColor: 'border-purple-500/30' },
  'ai-usecases': { label: 'AI 활용',  emoji: '🚀', desc: '실전 AI 활용·자동화 사례', color: 'bg-emerald-500/15', textColor: 'text-emerald-400', borderColor: 'border-emerald-500/30' },
}

function getTopicMeta(topicCluster: string) {
  return TOPIC_META[topicCluster] ?? null
}

function formatDate(iso: string) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(new Date(iso))
}

function FeaturedCard({ post }: { post: CuratedPost }) {
  const topic = getTopicMeta(post.topicCluster)
  const hasThumb = post.heroThumbnail && !post.heroThumbnail.startsWith('data:')
  return (
    <Link
      href={`/magazine/${post.slug}`}
      className="group relative flex flex-col md:flex-row rounded-2xl overflow-hidden bg-[var(--bg-surface-2)] border border-[var(--border-default)] hover:border-orange-500/30 transition-all hover:shadow-xl hover:shadow-orange-500/5"
    >
      <div className="relative md:w-[55%] aspect-video md:aspect-auto bg-[var(--bg-base)] overflow-hidden shrink-0">
        {hasThumb ? (
          <img src={post.heroThumbnail} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">🤖</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[var(--bg-surface-2)]/80 hidden md:block" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface-2)]/90 via-transparent to-transparent md:hidden" />
      </div>
      <div className="flex flex-col justify-center p-6 md:p-8 flex-1">
        {topic && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border w-fit mb-3 ${topic.color} ${topic.textColor} ${topic.borderColor}`}>
            {topic.emoji} {topic.label}
          </span>
        )}
        <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)] leading-tight mb-3 group-hover:text-orange-400 transition-colors">
          {post.title}
        </h2>
        {post.subtitle && (
          <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4 line-clamp-2">{post.subtitle}</p>
        )}
        <div className="flex items-center gap-3 text-[11px] text-[var(--text-subtle)]">
          <span>{formatDate(post.publishedAt)}</span>
          <span>·</span>
          <span>{post.readTime}분 읽기</span>
          {post.viewCount > 0 && <><span>·</span><span>👁 {post.viewCount.toLocaleString()}</span></>}
        </div>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {post.tags.slice(0, 4).map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded text-[10px] bg-[var(--bg-elevated)] text-[var(--text-subtle)]">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

function PostCard({ post }: { post: CuratedPost }) {
  const topic = getTopicMeta(post.topicCluster)
  const hasThumb = post.heroThumbnail && !post.heroThumbnail.startsWith('data:')
  return (
    <Link
      href={`/magazine/${post.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] hover:border-orange-500/30 transition-all hover:shadow-lg hover:shadow-orange-500/5"
    >
      <div className="relative aspect-video bg-[var(--bg-base)] overflow-hidden">
        {hasThumb ? (
          <img src={post.heroThumbnail} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">🤖</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface-2)]/80 via-transparent to-transparent" />
        {topic && (
          <span className={`absolute bottom-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold border ${topic.color} ${topic.textColor} ${topic.borderColor}`}>
            {topic.emoji} {topic.label}
          </span>
        )}
      </div>
      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="text-sm font-black text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-orange-400 transition-colors">
          {post.title}
        </h3>
        {post.subtitle && (
          <p className="text-xs text-[var(--text-subtle)] line-clamp-2 leading-relaxed">{post.subtitle}</p>
        )}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-2">
            {post.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] bg-[var(--bg-elevated)] text-[var(--text-subtle)]">#{tag}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 text-[10px] text-[var(--text-subtle)] pt-1 border-t border-[var(--border-subtle)]">
          <span>{formatDate(post.publishedAt)}</span>
          <span>·</span>
          <span>{post.readTime}분</span>
          {post.viewCount > 0 && <><span>·</span><span>👁 {post.viewCount.toLocaleString()}</span></>}
        </div>
      </div>
    </Link>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="rounded-2xl bg-[var(--bg-elevated)] h-64 w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-[var(--bg-elevated)] h-56" />
        ))}
      </div>
    </div>
  )
}

export default function MagazineListClient() {
  const [posts, setPosts] = useState<CuratedPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/magazine/posts?limit=50')
      .then(r => r.json())
      .then(data => Array.isArray(data) && setPosts(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const featured = posts[0] ?? null
  const rest = posts.slice(1)

  return (
    <>
      {/* 카테고리 네비 */}
      <nav aria-label="카테고리" className="flex items-stretch gap-3 mb-10 overflow-x-auto pb-1">
        <Link
          href="/magazine"
          className="shrink-0 flex flex-col justify-center px-5 py-3 rounded-2xl bg-orange-500/20 border border-orange-500/40 text-orange-400 text-sm font-black hover:bg-orange-500/30 transition-colors"
        >
          <span>전체</span>
          <span className="text-[10px] font-normal text-orange-400/70 mt-0.5">{loading ? '...' : `${posts.length}편`}</span>
        </Link>
        {Object.entries(TOPIC_META).map(([cluster, meta]) => {
          const count = posts.filter(p => p.topicCluster === cluster).length
          return (
            <Link
              key={cluster}
              href={`/magazine/topic/${cluster}`}
              className={`shrink-0 flex flex-col justify-center px-5 py-3 rounded-2xl border ${meta.color} ${meta.borderColor} ${meta.textColor} text-sm font-bold hover:opacity-80 transition-opacity`}
            >
              <span>{meta.emoji} {meta.label}</span>
              <span className="text-[10px] font-normal opacity-70 mt-0.5">{loading ? '...' : `${count}편`} · {meta.desc}</span>
            </Link>
          )
        })}
      </nav>

      {loading ? (
        <Skeleton />
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="text-5xl mb-4 opacity-30">🤖</div>
          <p className="text-[var(--text-subtle)] text-sm">아직 발행된 AI 매거진이 없습니다.</p>
        </div>
      ) : (
        <>
          {featured && (
            <section className="mb-10">
              <FeaturedCard post={featured} />
            </section>
          )}
          {rest.length > 0 && (
            <section>
              <h2 className="text-xs font-black text-[var(--text-subtle)] uppercase tracking-widest mb-4">최신 기사</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rest.map(post => <PostCard key={post.id} post={post} />)}
              </div>
            </section>
          )}
        </>
      )}
    </>
  )
}
