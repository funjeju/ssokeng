import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'YouTube News & Economics Video Summary — Auto 5W1H | SSOKENG',
  description: 'SSOKENG\'s AI automatically organizes YouTube news and economics videos into the 5W1H format. Quickly grasp the key points of even long news videos.',
  keywords: ['youtube news summary', 'economics youtube summary', 'news AI summary', 'youtube stock video summary', 'finance youtube organizer', 'youtube news key points'],
}

export default function NewsGuidePage() {
  return (
    <article className="flex flex-col gap-10 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 text-[var(--text-subtle)] text-xs mb-4">
          <Link href="/guide" className="hover:text-white transition-colors">User Guide</Link>
          <span>›</span><span>Video Summary</span><span>›</span>
          <span className="text-white">News & Economics</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-3">🗞️ News & Economics Videos — Auto 5W1H Briefing</h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          There&apos;s more news and economics content than you have time to watch. SSOKENG condenses news and economics videos into the core <strong className="text-white">Who · When · Where · What · Why · How</strong> format. Even long stock, real estate, and economics videos become fast, focused briefs.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-slate-400 pl-3">Optimized for these news & economics channels</h2>
        <div className="grid grid-cols-2 gap-2">
          {['CNBC', 'Bloomberg', 'Reuters', 'BBC News', 'Stock & ETF analysis', 'Real estate investing', 'Global economy & forex', 'Fed & interest rate analysis'].map(t => (
            <div key={t} className="bg-[var(--bg-elevated)] rounded-xl px-3 py-2 text-[var(--text-muted)] text-xs flex items-center gap-1.5">
              <span className="text-slate-400">✦</span>{t}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-slate-400 pl-3">AI news summary example</h2>
        <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl p-5 text-sm">
          <p className="text-[var(--text-subtle)] text-xs mb-3">Example: Fed interest rate hike economics video summary</p>
          <ul className="flex flex-col gap-2.5">
            {[
              ['📌 3-line summary', 'Fed raises benchmark rate by 0.25%. Household loan costs expected to rise. Analysis of exchange rate and export company impact.'],
              ['👥 Who', 'Fed Chair Jerome Powell, Bank of Korea Governor'],
              ['📅 When', 'March FOMC regular meeting results announced'],
              ['🎯 Why', 'Continued monetary tightening to combat US inflation'],
              ['💡 Implications', 'Rate freeze possible; upward pressure on exchange rate'],
            ].map(([label, val]) => (
              <li key={label as string} className="flex gap-3">
                <span className="text-[var(--text-subtle)] text-xs shrink-0 w-28">{label}</span>
                <span className="text-[var(--text-muted)] text-xs leading-relaxed">{val}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-bold text-white border-l-2 border-slate-400 pl-3">News & economics use cases</h2>
        <div className="flex flex-col gap-3">
          {[
            { icon: '📈', title: 'Morning economics briefing', desc: 'Summarize 3–5 economics news videos before work and read just the highlights. Get up to speed on yesterday\'s key economic news in 10 minutes.' },
            { icon: '🏠', title: 'Investment research', desc: 'Save expert analysis videos from finance channels as summaries and build your own investment insight library.' },
            { icon: '📋', title: 'Business reporting prep', desc: 'Summarize market trend and industry analysis videos to use as supporting material in reports. The 5W1H structure fits directly into any report format.' },
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

      <section className="bg-[var(--bg-elevated)] rounded-2xl p-5 flex flex-col gap-2">
        <h2 className="text-base font-bold text-white">What&apos;s included in news & economics summaries</h2>
        <ul className="grid grid-cols-2 gap-2.5 mt-1">
          {['Headline & 3-line summary', '5W1H core analysis', 'Key people & quotes', 'Market impact & implications', 'Background context', 'Related keywords'].map(t => (
            <li key={t} className="text-[var(--text-muted)] text-xs flex items-center gap-1.5">
              <span className="text-slate-400">✦</span>{t}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
        <Link href="/" className="px-5 py-2.5 bg-slate-600 hover:bg-slate-500 text-white font-bold text-sm rounded-xl transition-colors">
          Summarize a news video now
        </Link>
        <Link href="/guide/summary/travel" className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors">
          Travel spot extraction →
        </Link>
      </div>
    </article>
  )
}
