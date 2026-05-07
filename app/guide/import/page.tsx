import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'YouTube Playlist AI Batch Summary — Organize Your Watch Later | SSOKENG',
  description: 'Import your YouTube playlists or Watch Later into SSOKENG and let AI summarize them all at once. Clear 500 saved videos overnight.',
  keywords: ['youtube playlist summary', 'watch later organizer', 'youtube saved videos summary', 'youtube playlist import', 'youtube playlist AI', 'youtube batch summarize'],
}

export default function ImportGuidePage() {
  return (
    <article className="flex flex-col gap-10 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 text-[var(--text-subtle)] text-xs mb-4">
          <Link href="/guide" className="hover:text-white transition-colors">User Guide</Link>
          <span>›</span>
          <span className="text-white">Import Playlist</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-3">📋 YouTube Playlist AI Batch Summary — Clear Your Watch Later</h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          Got hundreds of &quot;watch later&quot; videos you never get to? With SSOKENG&apos;s <strong className="text-white">YouTube playlist import</strong> feature, connect your playlists and AI summarizes each video, organized by folder. Summarized videos are clearly marked for easy management.
        </p>
      </div>

      <section className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
        <p className="text-amber-300 text-xs font-semibold mb-1">📌 YouTube Security Policy Note</p>
        <p className="text-[var(--text-muted)] text-xs leading-relaxed">
          Due to YouTube security policy, playlist connection requires re-authentication each browser session. However, <strong className="text-white">playlist data imported once is stored on SSOKENG&apos;s servers</strong> and can be accessed anytime without re-authenticating. We request <strong className="text-white">read-only permission</strong> and will never modify or delete your playlists.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-bold text-white border-l-2 border-red-500 pl-3">How to import a YouTube playlist</h2>
        <ol className="flex flex-col gap-3">
          {[
            { step: '1', title: 'My Page → Import tab', desc: 'After logging in, select "Import" from the tabs at the top of My Page. Any previously imported playlists will be shown immediately.' },
            { step: '2', title: 'Click Connect YouTube → Google sign-in', desc: 'Allow read access to your YouTube playlists via your Google account. A Google security confirmation screen may appear on first connection — click Advanced to continue.' },
            { step: '3', title: 'Select a playlist → view video list', desc: 'Your YouTube playlists are shown as folders. Click any playlist to see the videos inside.' },
            { step: '4', title: 'Summarize each video with AI', desc: 'Click "Summarize with AI" to go to that video\'s summary page. Summarized videos show a ✓ Done badge.' },
          ].map(item => (
            <li key={item.step} className="flex gap-4 bg-[var(--bg-elevated)] rounded-2xl p-4">
              <span className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 font-bold text-sm flex items-center justify-center shrink-0">{item.step}</span>
              <div>
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-[var(--text-subtle)] text-xs mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-red-500 pl-3">Re-sync — pick up only newly added videos</h2>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          Clicking &quot;Re-sync&quot; compares against your previously imported playlists and marks playlists with <strong className="text-white">newly added videos with a <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">NEW</span> badge</strong>. Skip already-summarized videos and only process new ones for efficient management.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '✅', label: 'Summarized video', desc: 'Green badge — summary already done' },
            { icon: '🆕', label: 'NEW video', desc: 'Red badge — newly added video' },
          ].map(item => (
            <div key={item.label} className="bg-[var(--bg-elevated)] rounded-xl p-3">
              <p className="text-white text-sm font-semibold">{item.icon} {item.label}</p>
              <p className="text-[var(--text-subtle)] text-xs mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-red-500 pl-3">Great for these playlist management scenarios</h2>
        <div className="flex flex-col gap-2">
          {[
            'Anyone with 500+ videos piled up in Watch Later',
            'People with topic playlists (cooking, English, economics, travel)',
            'Those who want to systematically organize their liked videos',
            'People who want new videos from subscribed channels auto-summarized',
          ].map(t => (
            <div key={t} className="flex items-center gap-2 bg-[var(--bg-elevated)] rounded-xl px-4 py-2.5 text-[var(--text-muted)] text-xs">
              <span className="text-red-400 shrink-0">✓</span>{t}
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
        <Link href="/mypage" className="px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold text-sm rounded-xl transition-colors">
          Connect in My Page
        </Link>
        <Link href="/guide/blog" className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors">
          Blog draft generation →
        </Link>
      </div>
    </article>
  )
}
