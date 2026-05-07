import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Learn English with YouTube Videos — AI Worksheet Generator | SSOKENG',
  description: 'SSOKENG\'s AI automatically organizes TED, BBC, and CNN YouTube videos into key vocabulary, key expressions, and summaries. Create personalized English study materials in seconds.',
  keywords: ['youtube english study', 'youtube english summary', 'english video worksheet', 'TED english summary', 'youtube english learning', 'CEFR english study', 'youtube english script organizer'],
}

export default function EnglishGuidePage() {
  return (
    <article className="flex flex-col gap-10 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 text-[var(--text-subtle)] text-xs mb-4">
          <Link href="/guide" className="hover:text-white transition-colors">User Guide</Link>
          <span>›</span><span>Video Summary</span><span>›</span>
          <span className="text-white">English Learning</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-3">🔤 Turn Any English YouTube Video into AI Study Material</h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          Don&apos;t just watch English YouTube videos — learn from them. SSOKENG automatically organizes TED talks, BBC News, CNN reports, and English creator videos into <strong className="text-white">key vocabulary · key expressions · summary · cultural context</strong>. Any YouTube video with English captions becomes a personalized study guide in under 5 minutes.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-blue-500 pl-3">Optimized for these English YouTube channels</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['🎤', 'TED / TED-Ed Talks'],
            ['📡', 'BBC / CNN English News'],
            ['💼', 'Business English channels'],
            ['🎓', 'English grammar & conversation'],
            ['🌍', 'Documentaries & educational'],
            ['🎬', 'English creator vlogs'],
          ].map(([icon, label]) => (
            <div key={label as string} className="bg-[var(--bg-elevated)] rounded-xl px-3 py-2.5 text-[var(--text-muted)] text-xs flex items-center gap-2">
              <span>{icon}</span>{label}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-bold text-white border-l-2 border-blue-500 pl-3">How to study English with YouTube — step by step</h2>
        <ol className="flex flex-col gap-3">
          {[
            { step: '1', title: 'Paste the English YouTube URL', desc: 'Any video with English captions (including auto-generated) is supported. Works with TED.com videos and all English YouTube channels.' },
            { step: '2', title: 'Select 🔤 English Learning category', desc: 'The English category generates study-optimized output — vocabulary, expressions, and cultural context — not just a translation.' },
            { step: '3', title: 'Choose language — translated summary or English original', desc: 'When a non-English video is detected, choose between a translated summary or the original English summary. Beginners choose translated; advanced learners choose English.' },
            { step: '4', title: 'Save your worksheet and review anytime', desc: 'Save to your library in My Page and revisit anytime. The same video is cached for instant reload with no extra cost.' },
          ].map(item => (
            <li key={item.step} className="flex gap-4 bg-[var(--bg-elevated)] rounded-2xl p-4">
              <span className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 font-bold text-sm flex items-center justify-center shrink-0">{item.step}</span>
              <div>
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-[var(--text-subtle)] text-xs mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[var(--bg-elevated)] rounded-2xl p-5 flex flex-col gap-3">
        <h2 className="text-base font-bold text-white">What&apos;s included in your English summary</h2>
        <ul className="grid grid-cols-2 gap-2.5">
          {[
            ['📚', 'Key vocabulary & example sentences'],
            ['💬', 'Key expressions & idioms'],
            ['🌐', 'Full English summary'],
            ['🧩', 'Topic-by-topic paragraph summary'],
            ['🌍', 'Cultural background & context'],
            ['✏️', 'Discussion points'],
          ].map(([icon, label]) => (
            <li key={label as string} className="text-[var(--text-muted)] text-xs flex items-center gap-2">
              <span>{icon}</span>{label}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-blue-500 pl-3">English learning scenarios</h2>
        <div className="flex flex-col gap-3">
          {[
            { icon: '🎯', title: 'Daily TED English study', desc: 'Summarize one TED video as a vocabulary list. Review it on your commute and you can cover 30 English topics in a month.' },
            { icon: '📰', title: 'Fast digest of English news', desc: 'Organize BBC/CNN news videos into an English summary + key expressions. Build both current-affairs English and background knowledge at once.' },
            { icon: '💼', title: 'Business English prep', desc: 'Summarize business English videos for interview or presentation prep, and build your own expression reference book.' },
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
        <h2 className="text-base font-bold text-white border-l-2 border-blue-500 pl-3">Frequently asked questions</h2>
        <div className="flex flex-col gap-2">
          {[
            { q: 'Does it work with auto-generated English captions?', a: 'Yes, YouTube auto-generated captions are supported. Summary quality may vary depending on caption accuracy.' },
            { q: 'Does it work with videos in other languages like Japanese or Spanish?', a: 'Currently optimized for English. For other languages, try the auto-detect mode.' },
          ].map(item => (
            <div key={item.q} className="bg-[var(--bg-elevated)] rounded-xl p-4">
              <p className="text-white text-sm font-semibold mb-1">Q. {item.q}</p>
              <p className="text-[var(--text-subtle)] text-xs leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
        <Link href="/" className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm rounded-xl transition-colors">
          Summarize an English video now
        </Link>
        <Link href="/guide/summary/news" className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors">
          News summary →
        </Link>
      </div>
    </article>
  )
}
