import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'SSOKENG User Guide — All AI Video Summary Features',
  description: 'Discover everything SSOKENG can do. AI video summaries, playlist batch processing, blog draft generation, and Shorts script extraction.',
}

const SECTIONS = [
  {
    title: 'Video Summary',
    items: [
      { href: '/guide/summary/recipe', icon: '🍳', title: 'Cooking Recipes', desc: 'Organize cooking videos into ingredients, steps & tips cards' },
      { href: '/guide/summary/english', icon: '🔤', title: 'English Learning', desc: 'Convert English videos into level-appropriate worksheets' },
      { href: '/guide/summary/news', icon: '🗞️', title: 'News & Economics', desc: 'Summarize news videos into the core 5W1H' },
      { href: '/guide/summary/travel', icon: '🧳', title: 'Travel Spot Extraction', desc: 'Auto-extract places, tips & itineraries from travel vlogs' },
    ],
  },
  {
    title: 'Productivity Tools',
    items: [
      { href: '/guide/import', icon: '📋', title: 'Import Playlist', desc: 'Batch-summarize a YouTube playlist with AI' },
      { href: '/guide/blog', icon: '✍️', title: 'Blog Draft', desc: 'Convert a video into an SEO-optimized blog post' },
      { href: '/guide/shorts', icon: '🎬', title: 'Shorts Script', desc: 'Auto-extract a Shorts script from a long-form video' },
      { href: '/guide/search', icon: '🔍', title: 'AI Chat Search', desc: 'Explore your library through natural conversation with AI' },
    ],
  },
  {
    title: 'Community & Education',
    items: [
      { href: '/guide/square', icon: '🌐', title: 'Square Guide', desc: 'Share summaries and discover other viewers\' insights' },
      { href: '/guide/classroom', icon: '🎓', title: 'Classroom', desc: 'Learning management and worksheet distribution for teachers' },
    ],
  },
]

export default function GuidePage() {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-black text-white mb-2">SSOKENG User Guide</h1>
        <p className="text-[var(--text-subtle)] text-sm leading-relaxed max-w-xl">
          Get more out of every YouTube video. From cooking, English, news, and travel summaries to blog drafts and Shorts scripts — step-by-step guides for every feature.
        </p>
      </div>
      {SECTIONS.map(section => (
        <section key={section.title}>
          <h2 className="text-xs font-bold text-[var(--text-subtle)] uppercase tracking-widest mb-3">{section.title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-start gap-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-2)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-2xl p-4 transition-all group"
              >
                <span className="text-2xl mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm group-hover:text-orange-400 transition-colors">{item.title}</p>
                  <p className="text-[var(--text-subtle)] text-xs mt-0.5">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
