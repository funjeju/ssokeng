import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'AI Chat Search Your YouTube Summary Library | SSOKENG',
  description: '"Where did that investing video go?" Ask AI in plain English and instantly find the right summary in your YouTube library. Find any video from memory — no keywords needed.',
  keywords: ['youtube saved video search', 'AI library search', 'youtube history search', 'natural language video search', 'youtube summary search', 'AI chat search', 'find saved youtube video'],
}

export default function SearchGuidePage() {
  return (
    <article className="flex flex-col gap-10 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 text-[var(--text-subtle)] text-xs mb-4">
          <Link href="/guide" className="hover:text-white transition-colors">User Guide</Link>
          <span>›</span>
          <span className="text-white">AI Chat Search</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-3">🔍 &quot;Where was that travel video I watched last month?&quot; — Just ask AI</h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          Once you have 100 or 200 videos in your library, scrolling to find anything is impossible. SSOKENG&apos;s <strong className="text-white">AI Chat Search</strong> lets you ask in plain English from memory. &quot;That Japan travel video from last month,&quot; &quot;the TED summary with vocabulary notes,&quot; &quot;that interest rate video&quot; — just type it and AI finds the matching summary from your library. Your personal AI assistant that remembers everything you&apos;ve saved.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-cyan-500 pl-3">Especially useful in these situations</h2>
        <ul className="flex flex-col gap-2">
          {[
            'When you have 100+ summaries and scrolling to find them is too slow',
            'When you remember the content but not the title',
            'When you want to browse all saved videos on a specific topic (travel, English, investing)',
            'When categories and dates are mixed and it\'s hard to navigate',
            'When you want to see all summaries from a specific channel',
          ].map(t => (
            <li key={t} className="flex items-start gap-2 text-[var(--text-muted)] text-sm">
              <span className="text-cyan-400 mt-0.5 shrink-0">✓</span>{t}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl p-5">
        <p className="text-[var(--text-subtle)] text-xs mb-3">You can ask things like</p>
        <ul className="flex flex-col gap-2">
          {[
            '"Find that Japanese cooking video I watched"',
            '"Show me the investing summary from last month"',
            '"Everything I\'ve saved about Japan travel"',
            '"An English study video with vocabulary notes"',
            '"That interest rate video from a finance channel"',
            '"The most recently saved exercise-related video"',
          ].map(q => (
            <li key={q} className="text-[var(--text-muted)] text-sm bg-[var(--bg-elevated)] rounded-xl px-4 py-2.5">{q}</li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-bold text-white border-l-2 border-cyan-500 pl-3">How to use AI Search</h2>
        <ol className="flex flex-col gap-3">
          {[
            { step: '1', title: 'My Page → open the AI Search tab', desc: 'Click "AI Search" from the tabs at the top of My Page, or click the chat button in the bottom-right corner of the screen.' },
            { step: '2', title: 'Ask in natural language', desc: 'Ask in conversational sentences, not search keywords. Including context hints like "the one I watched last time," "about ~," or "from ~ channel" makes results more accurate.' },
            { step: '3', title: 'AI presents matching summaries from your library', desc: 'Searches all your saved summaries and shows the most relevant results in order. Multiple matches are displayed together as cards.' },
            { step: '4', title: 'Click a result card → go directly to the full summary', desc: 'Clicking a search result card takes you instantly to the full summary page for that video.' },
          ].map(item => (
            <li key={item.step} className="flex gap-4 bg-[var(--bg-elevated)] rounded-2xl p-4">
              <span className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-sm flex items-center justify-center shrink-0">{item.step}</span>
              <div>
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-[var(--text-subtle)] text-xs mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[var(--bg-elevated)] rounded-2xl p-5 flex flex-col gap-3">
        <h2 className="text-base font-bold text-white">What AI Search can find</h2>
        <ul className="grid grid-cols-2 gap-2.5">
          {[
            ['📅', 'Filter by date or period'],
            ['🏷️', 'Group by category'],
            ['📺', 'Search by channel name'],
            ['🔑', 'Search by content keyword'],
            ['📍', 'Search by travel location'],
            ['👤', 'Search by person or presenter'],
          ].map(([icon, label]) => (
            <li key={label as string} className="text-[var(--text-muted)] text-xs flex items-center gap-2">
              <span>{icon}</span>{label}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-cyan-500 pl-3">Frequently asked questions</h2>
        <div className="flex flex-col gap-2">
          {[
            { q: 'Does using AI Search cost credits?', a: 'AI Search only operates within your library. Basic search is free; AI-generated responses may consume credits.' },
            { q: 'Are videos I haven\'t summarized searchable?', a: 'Only videos you\'ve summarized and saved with SSOKENG are searchable. The more summaries you have, the more accurate the search.' },
          ].map(item => (
            <div key={item.q} className="bg-[var(--bg-elevated)] rounded-xl p-4">
              <p className="text-white text-sm font-semibold mb-1">Q. {item.q}</p>
              <p className="text-[var(--text-subtle)] text-xs leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
        <Link href="/mypage" className="px-5 py-2.5 bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-sm rounded-xl transition-colors">
          Search my library with AI
        </Link>
        <Link href="/guide/square" className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors">
          Square guide →
        </Link>
      </div>
    </article>
  )
}
