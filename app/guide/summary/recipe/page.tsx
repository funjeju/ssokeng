import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'YouTube Cooking Video Recipe Organizer — Instant Recipe Cards | SSOKENG',
  description: 'SSOKENG\'s AI reads YouTube cooking videos and automatically organizes ingredients, cooking steps, and tips into recipe cards. No more pausing and note-taking while you cook.',
  keywords: ['youtube cooking video summary', 'youtube recipe organizer', 'cooking video auto notes', 'youtube cooking AI summary', 'recipe video step-by-step'],
}

export default function RecipeGuidePage() {
  return (
    <article className="flex flex-col gap-10 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 text-[var(--text-subtle)] text-xs mb-4">
          <Link href="/guide" className="hover:text-white transition-colors">User Guide</Link>
          <span>›</span><span>Video Summary</span><span>›</span>
          <span className="text-white">Cooking Recipes</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-3">🍳 Turn Any Cooking Video into a Recipe Card — Instantly</h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          Ever had to pause a cooking video over and over just to copy down ingredients? SSOKENG&apos;s <strong className="text-white">AI cooking video summary</strong> analyzes the video transcript and automatically organizes <strong className="text-white">ingredients · cooking steps · key tips</strong> into a clean card format. Any cooking channel — just paste the URL and your recipe card is ready.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-bold text-white border-l-2 border-orange-500 pl-3">Who this feature is perfect for</h2>
        <ul className="flex flex-col gap-2.5">
          {[
            'Anyone who constantly pauses videos while cooking to double-check steps',
            'People who copy recipes into a notepad but can never find them later',
            'Fans of YouTube cooking channels who want instant recipe cards',
            'Anyone who wants to pull just the ingredient list for a shopping trip',
            'Those who want to jump to a specific step without rewatching from the start',
            'People building a personal recipe library from saved cooking videos',
          ].map(t => (
            <li key={t} className="flex items-start gap-2 text-[var(--text-muted)] text-sm">
              <span className="text-orange-400 mt-0.5 shrink-0">✓</span>{t}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-bold text-white border-l-2 border-orange-500 pl-3">How to organize a cooking video into a recipe</h2>
        <ol className="flex flex-col gap-3">
          {[
            { step: '1', title: 'Copy the YouTube cooking video URL', desc: 'Copy the address of the cooking video you want to summarize. On desktop, use the address bar; on mobile, tap the share button.' },
            { step: '2', title: 'Paste the URL on the SSOKENG home page and select 🍳 Cooking', desc: 'Selecting the cooking category formats the output specifically for recipes (ingredients, steps, tips). Auto-detect mode also recognizes cooking videos.' },
            { step: '3', title: 'Click Start Now — AI begins analyzing the transcript', desc: 'The AI reads the full video transcript and organizes ingredients, step-by-step instructions, key tips, and estimated cooking time into card format. Typically done in 20–40 seconds.' },
            { step: '4', title: 'Save to your library and access anytime', desc: 'Logged-in users have summaries saved automatically. Visit My Page → Cooking folder to access all your recipe cards anytime.' },
          ].map(item => (
            <li key={item.step} className="flex gap-4 bg-[var(--bg-elevated)] rounded-2xl p-4">
              <span className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-400 font-bold text-sm flex items-center justify-center shrink-0">{item.step}</span>
              <div>
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-[var(--text-subtle)] text-xs mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[var(--bg-elevated)] rounded-2xl p-5 flex flex-col gap-3">
        <h2 className="text-base font-bold text-white">What&apos;s included in your summary</h2>
        <ul className="grid grid-cols-2 gap-2.5 mt-1">
          {[
            ['🥬', 'Ingredient list & exact quantities'],
            ['📝', 'Step-by-step cooking instructions'],
            ['⏱', 'Estimated time per step'],
            ['💡', 'Chef tips & common mistake prevention'],
            ['🔄', 'Ingredient substitutions & variations'],
            ['⭐', 'Difficulty level & total cook time'],
          ].map(([icon, label]) => (
            <li key={label as string} className="text-[var(--text-muted)] text-xs flex items-center gap-2">
              <span>{icon}</span>{label}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-orange-500 pl-3">Supported cooking channel types</h2>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          Works with any YouTube cooking channel that provides captions. Channels like <strong className="text-white">Gordon Ramsay, Tasty, Bon Appétit, Joshua Weissman</strong> and more are all supported via their English captions. Auto-generated captions are also analyzed.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {['Korean cuisine', 'Western & pasta', 'Japanese & sushi', 'Chinese stir-fry', 'Baking & desserts', 'Diet & healthy'].map(t => (
            <div key={t} className="bg-[var(--bg-elevated)] rounded-xl px-3 py-2 text-[var(--text-muted)] text-xs text-center">{t}</div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-orange-500 pl-3">Frequently asked questions</h2>
        <div className="flex flex-col gap-2">
          {[
            { q: 'Does it work on videos without captions?', a: 'YouTube auto-generated captions are supported. However, videos with no captions at all cannot be summarized.' },
            { q: 'Can I print or save the recipe?', a: 'Logged-in users can save to their library and access anytime. You can also use browser print or screenshot to get a physical copy.' },
            { q: 'Can I get a summary in English even if the video is in another language?', a: 'When a foreign-language video is detected, you can choose between a translated summary or the original-language summary.' },
          ].map(item => (
            <div key={item.q} className="bg-[var(--bg-elevated)] rounded-xl p-4">
              <p className="text-white text-sm font-semibold mb-1">Q. {item.q}</p>
              <p className="text-[var(--text-subtle)] text-xs leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
        <Link href="/" className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm rounded-xl transition-colors">
          Summarize a cooking video now
        </Link>
        <Link href="/guide/import" className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors">
          Batch summarize a playlist →
        </Link>
      </div>
    </article>
  )
}
