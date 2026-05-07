import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Square — YouTube Summary Sharing Community · Discover Different Perspectives | SSOKENG',
  description: 'Share your YouTube video summaries on Square and discover how others interpreted the same video. Exchange great videos and insights with the community.',
  keywords: ['youtube summary sharing', 'youtube community', 'video summary feed', 'SSOKENG square', 'youtube insight sharing', 'video summary social', 'youtube knowledge sharing'],
}

export default function SquareGuidePage() {
  return (
    <article className="flex flex-col gap-10 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 text-[var(--text-subtle)] text-xs mb-4">
          <Link href="/guide" className="hover:text-white transition-colors">User Guide</Link>
          <span>›</span>
          <span className="text-white">Square Guide</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-3">🌐 Same Video — See How Others Interpreted It Too</h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          Don&apos;t keep a great YouTube video to yourself. <strong className="text-white">Square</strong> is where SSOKENG users post their summaries to a public feed and discover how other viewers interpreted the same video. Find perspectives you missed, deeper analysis, or summaries from a completely different angle. Share insights with the community instead of consuming them alone.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-amber-500 pl-3">What you can do on Square</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '📤', title: 'Share', desc: 'Post your summary to the Square public feed and share useful information with others.' },
            { icon: '🔎', title: 'Discover', desc: 'Browse the feed for helpful videos summarized by other users. Find content in your areas of interest.' },
            { icon: '📌', title: 'Save', desc: 'Copy a summary you like to your own library. You can have a great summary without summarizing the video yourself.' },
            { icon: '💬', title: 'Connect', desc: 'React with comments or likes, and exchange opinions with others who watched the same video.' },
          ].map(item => (
            <div key={item.title} className="bg-[var(--bg-elevated)] rounded-2xl p-4">
              <span className="text-2xl">{item.icon}</span>
              <p className="text-white font-semibold text-sm mt-2">{item.title}</p>
              <p className="text-[var(--text-subtle)] text-xs mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-bold text-white border-l-2 border-amber-500 pl-3">Square use cases</h2>
        <div className="flex flex-col gap-3">
          {[
            { icon: '📚', title: 'Study group summary sharing', desc: 'Share YouTube videos related to the same lecture or book within a study group and compare each other\'s summaries. Discover different key points from each member.' },
            { icon: '💡', title: 'Use as an insight feed', desc: 'Follow the Square feed to read daily summaries of useful videos you haven\'t watched yet. Human-curated content instead of recommendation algorithms.' },
            { icon: '🤝', title: 'Discover users with similar interests', desc: 'Follow users who summarize in the same categories as you — travel, cooking, investing, English — and insights in your field accumulate automatically.' },
          ].map(item => (
            <div key={item.title} className="flex gap-3 bg-[var(--bg-elevated)] rounded-2xl p-4">
              <span className="text-xl shrink-0">{item.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-[var(--text-subtle)] text-xs mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-amber-500 pl-3">Visibility settings</h2>
        <div className="flex flex-col gap-2">
          {[
            { label: '🔒 Private', desc: 'Only you can see it. Use when saving for personal notes or study. (Default)' },
            { label: '👥 Friends only', desc: 'Only mutual followers can see it. Best for sharing within a small study group.' },
            { label: '🌐 Public', desc: 'Shown in the Square feed. Choose this when you want to share a great summary with more people.' },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3 bg-[var(--bg-elevated)] rounded-xl px-4 py-3">
              <span className="text-sm font-semibold text-white w-28 shrink-0">{item.label}</span>
              <span className="text-[var(--text-subtle)] text-xs leading-relaxed">{item.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[var(--bg-elevated)] rounded-2xl p-5 flex flex-col gap-3">
        <h2 className="text-base font-bold text-white">Popular summary categories on Square</h2>
        <div className="grid grid-cols-3 gap-2">
          {['Investing & stocks', 'English learning', 'Travel info', 'Cooking recipes', 'Self-development', 'News & current events', 'Health & fitness', 'Tech & IT', 'History & culture'].map(t => (
            <div key={t} className="bg-[var(--bg-base)] rounded-xl px-3 py-2 text-[var(--text-muted)] text-xs text-center">{t}</div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-amber-500 pl-3">Frequently asked questions</h2>
        <div className="flex flex-col gap-2">
          {[
            { q: 'If I save someone else\'s summary to my library, does the original video get summarized?', a: 'The summary content is copied to your library. You can use it right away without re-summarizing the video yourself.' },
            { q: 'Can I change the visibility later?', a: 'You can change the visibility to private, friends-only, or public at any time from the summary results page.' },
          ].map(item => (
            <div key={item.q} className="bg-[var(--bg-elevated)] rounded-xl p-4">
              <p className="text-white text-sm font-semibold mb-1">Q. {item.q}</p>
              <p className="text-[var(--text-subtle)] text-xs leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
        <Link href="/square" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-xl transition-colors">
          Browse Square
        </Link>
        <Link href="/guide/classroom" className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors">
          Classroom →
        </Link>
      </div>
    </article>
  )
}
