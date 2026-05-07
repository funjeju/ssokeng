import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Auto-Convert YouTube Videos into Blog Posts — SEO Draft in 1 Min | SSOKENG',
  description: 'Generate SEO-optimized blog post drafts from a single YouTube URL. Title, headings, body, conclusion, and meta description — ready to paste into WordPress, Blogger, or any platform.',
  keywords: ['youtube to blog', 'youtube blog post generator', 'video to blog draft', 'youtube SEO blog', 'content repurposing tool', 'youtube blog automation', 'video summary blog'],
}

export default function BlogGuidePage() {
  return (
    <article className="flex flex-col gap-10 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 text-[var(--text-subtle)] text-xs mb-4">
          <Link href="/guide" className="hover:text-white transition-colors">User Guide</Link>
          <span>›</span>
          <span className="text-white">Blog Draft</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-3">✍️ Turn a YouTube Video into an SEO Blog Post in 1 Minute</h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          Writing a blog post from a YouTube video normally takes 1–2 hours. SSOKENG automatically converts video summaries into <strong className="text-white">SEO-optimized blog drafts</strong>. Done in under a minute from URL to draft. Title, H2/H3 heading structure, body, conclusion, and meta description — all ready to paste into WordPress, Blogger, or any platform.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-violet-500 pl-3">Who this feature is for</h2>
        <ul className="flex flex-col gap-2">
          {[
            'Anyone who watches YouTube to learn and wants to document it on a blog',
            'Bloggers who want to share information from educational videos with readers',
            'People who want to publish regular video reviews and write-ups',
            'Bloggers running Google AdSense or other ad programs',
            'Anyone who wants to grow their content output without spending more time',
          ].map(t => (
            <li key={t} className="flex items-start gap-2 text-[var(--text-muted)] text-sm">
              <span className="text-violet-400 mt-0.5 shrink-0">✓</span>{t}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-bold text-white border-l-2 border-violet-500 pl-3">How to create a blog draft from YouTube</h2>
        <ol className="flex flex-col gap-3">
          {[
            { step: '1', title: 'Enter the YouTube URL and generate a summary', desc: 'Start by summarizing the video. Any category works — blog draft generation is available after the summary is complete.' },
            { step: '2', title: 'Click "Blog Draft" on the results page', desc: 'Click the blog draft generation button at the bottom of the summary results page or in the tools menu.' },
            { step: '3', title: 'AI generates an SEO-optimized draft', desc: 'AI restructures the summary into a search-optimized blog format (H2/H3 subheadings, body, conclusion). Keywords are naturally integrated.' },
            { step: '4', title: 'Saved to My Page → "Blog Drafts" tab', desc: 'Generated drafts are saved in the Blog Drafts tab in My Page. Copy and paste into your platform of choice, edit, and publish.' },
          ].map(item => (
            <li key={item.step} className="flex gap-4 bg-[var(--bg-elevated)] rounded-2xl p-4">
              <span className="w-7 h-7 rounded-full bg-violet-500/20 text-violet-400 font-bold text-sm flex items-center justify-center shrink-0">{item.step}</span>
              <div>
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-[var(--text-subtle)] text-xs mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[var(--bg-elevated)] rounded-2xl p-5 flex flex-col gap-3">
        <h2 className="text-base font-bold text-white">What&apos;s included in the blog draft</h2>
        <ul className="grid grid-cols-2 gap-2.5">
          {[
            ['🎯', 'SEO-optimized title suggestions'],
            ['📑', 'H2/H3 heading structure'],
            ['📝', 'Section-by-section body content'],
            ['✅', 'Conclusion & call to action'],
            ['🔑', 'Key keyword list'],
            ['📊', 'Meta description draft'],
          ].map(([icon, label]) => (
            <li key={label as string} className="text-[var(--text-muted)] text-xs flex items-center gap-2">
              <span>{icon}</span>{label}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-violet-500 pl-3">Supported blog platforms</h2>
        <div className="grid grid-cols-3 gap-2">
          {['WordPress', 'Blogger', 'Medium', 'Notion', 'Ghost', 'Substack'].map(t => (
            <div key={t} className="bg-[var(--bg-elevated)] rounded-xl px-3 py-2 text-[var(--text-muted)] text-xs text-center">{t}</div>
          ))}
        </div>
        <p className="text-[var(--text-subtle)] text-xs">Copy the markdown-formatted draft and paste it into any platform.</p>
      </section>

      <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
        <Link href="/" className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl transition-colors">
          Create a blog draft now
        </Link>
        <Link href="/guide/shorts" className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors">
          Shorts script →
        </Link>
      </div>
    </article>
  )
}
