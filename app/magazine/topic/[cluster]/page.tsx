import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/common/Header'
import { listCuratedPostsAdmin } from '@/lib/magazine-server'
import type { CuratedPost } from '@/lib/magazine'

export const dynamic = 'force-dynamic'

const TOPIC_META: Record<string, {
  label: string; emoji: string; slug: string
  title: string; description: string; keywords: string[]
  color: string; textColor: string; borderColor: string; bgGradient: string
}> = {
  'ai-news': {
    label: 'AI News', emoji: '📰', slug: 'ai-news',
    title: 'AI News | SSOKENG AI Magazine — Latest AI announcements',
    description: 'In-depth analysis of the latest news and announcements from OpenAI, Google, Anthropic and more. ChatGPT, Claude, Gemini updates and AI market trends.',
    keywords: ['AI news', 'OpenAI', 'ChatGPT', 'Anthropic', 'Claude', 'Google Gemini', 'AI announcements'],
    color: 'bg-blue-500/15', textColor: 'text-blue-400', borderColor: 'border-blue-500/30',
    bgGradient: 'from-blue-500/10 to-transparent',
  },
  'ai-tools': {
    label: 'AI Tools', emoji: '🛠️', slug: 'ai-tools',
    title: 'AI Tools | SSOKENG AI Magazine — Productivity AI app reviews',
    description: 'Hands-on reviews of AI tools and apps that boost productivity. Deep dives into Cursor, Perplexity, Notion AI, and the latest AI productivity software.',
    keywords: ['AI tools', 'AI apps', 'AI productivity', 'Cursor', 'Perplexity', 'Notion AI', 'AI software'],
    color: 'bg-purple-500/15', textColor: 'text-purple-400', borderColor: 'border-purple-500/30',
    bgGradient: 'from-purple-500/10 to-transparent',
  },
  'ai-usecases': {
    label: 'AI Use Cases', emoji: '🚀', slug: 'ai-usecases',
    title: 'AI Use Cases | SSOKENG AI Magazine — Real-world AI applications',
    description: 'Concrete ways to apply AI in your work and daily life. Automation, prompt engineering, AI workflow guides with step-by-step examples.',
    keywords: ['AI use cases', 'AI automation', 'prompt engineering', 'AI workflow', 'ChatGPT tips', 'AI productivity'],
    color: 'bg-emerald-500/15', textColor: 'text-emerald-400', borderColor: 'border-emerald-500/30',
    bgGradient: 'from-emerald-500/10 to-transparent',
  },
}

export async function generateMetadata(
  { params }: { params: Promise<{ cluster: string }> }
): Promise<Metadata> {
  const { cluster } = await params
  const meta = TOPIC_META[cluster]
  if (!meta) return { title: 'AI Magazine | SSOKENG' }
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: { canonical: `https://ssoktube.com/magazine/topic/${cluster}` },
    openGraph: {
      title: `${meta.emoji} ${meta.label} | SSOKENG AI Magazine`,
      description: meta.description,
      type: 'website',
      url: `https://ssoktube.com/magazine/topic/${cluster}`,
      siteName: 'SSOKTUBE',
    },
  }
}

function formatDate(iso: string) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(new Date(iso))
}

function PostCard({ post, meta }: { post: CuratedPost; meta: typeof TOPIC_META[string] }) {
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
      </div>
      <div className="flex flex-col flex-1 p-4 gap-2">
        <h2 className="text-sm font-black text-white leading-snug line-clamp-2 group-hover:text-orange-300 transition-colors">
          {post.title}
        </h2>
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
          <span>{post.readTime} min</span>
          {post.viewCount > 0 && <><span>·</span><span>👁 {post.viewCount.toLocaleString()}</span></>}
        </div>
      </div>
    </Link>
  )
}

export default async function TopicPage(
  { params }: { params: Promise<{ cluster: string }> }
) {
  const { cluster } = await params
  const meta = TOPIC_META[cluster]
  if (!meta) notFound()

  let posts: CuratedPost[] = []
  try {
    const all = await listCuratedPostsAdmin()
    posts = all.filter(p => p.status === 'published' && p.topicCluster === cluster)
  } catch { /* admin SDK 초기화 실패 */ }

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${meta.emoji} ${meta.label} | SSOKENG AI Magazine`,
      description: meta.description,
      url: `https://ssoktube.com/magazine/topic/${cluster}`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: posts.length,
        itemListElement: posts.slice(0, 10).map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `https://ssoktube.com/magazine/${p.slug}`,
          name: p.title,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://ssoktube.com' },
        { '@type': 'ListItem', position: 2, name: 'AI Magazine', item: 'https://ssoktube.com/magazine' },
        { '@type': 'ListItem', position: 3, name: meta.label, item: `https://ssoktube.com/magazine/topic/${cluster}` },
      ],
    },
  ]

  return (
    <>
      {jsonLd.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}

      <div className="min-h-screen bg-[var(--bg-page)]">
        <Header />
        <main className="max-w-5xl mx-auto px-4 pb-24">

          {/* 브레드크럼 */}
          <nav aria-label="breadcrumb" className="flex items-center gap-2 text-xs text-[var(--text-subtle)] pt-4 mb-6">
            <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/magazine" className="hover:text-orange-400 transition-colors">AI Magazine</Link>
            <span>/</span>
            <span className={meta.textColor}>{meta.label}</span>
          </nav>

          {/* 카테고리 헤더 */}
          <div className={`rounded-2xl border p-8 mb-8 bg-gradient-to-br ${meta.bgGradient} ${meta.borderColor}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{meta.emoji}</span>
              <div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${meta.textColor}`}>AI MAGAZINE</span>
                <h1 className="text-2xl md:text-3xl font-black text-white">{meta.label}</h1>
              </div>
            </div>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed max-w-xl">{meta.description}</p>
            <p className={`text-[11px] font-bold mt-3 ${meta.textColor}`}>{posts.length} article{posts.length !== 1 ? 's' : ''}</p>
          </div>

          {/* 다른 카테고리 이동 */}
          <nav className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
            <Link href="/magazine" className="shrink-0 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-muted)] text-xs font-bold border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-colors">
              ← All articles
            </Link>
            {Object.entries(TOPIC_META).filter(([k]) => k !== cluster).map(([k, m]) => (
              <Link
                key={k}
                href={`/magazine/topic/${k}`}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${m.color} ${m.textColor} ${m.borderColor} hover:opacity-80`}
              >
                {m.emoji} {m.label}
              </Link>
            ))}
          </nav>

          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="text-5xl mb-4 opacity-30">{meta.emoji}</div>
              <p className="text-[var(--text-subtle)] text-sm">No {meta.label} articles yet.</p>
              <p className="text-[var(--text-subtle)] text-xs mt-1">Articles will appear here once the pipeline runs.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map(post => (
                <PostCard key={post.id} post={post} meta={meta} />
              ))}
            </div>
          )}

        </main>
      </div>
    </>
  )
}
