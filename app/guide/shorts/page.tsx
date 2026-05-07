import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Auto-Extract Shorts/Reels/TikTok Scripts from YouTube Videos | SSOKENG',
  description: 'Automatically extract viral moments and Shorts scripts from long-form YouTube videos. Get a 60-second script from a 30-minute video in seconds. YouTube Shorts, Instagram Reels, and TikTok supported.',
  keywords: ['youtube shorts script', 'youtube shorts script generator', 'long form to short form', 'reels script generator', 'tiktok script automation', 'shorts content creation', 'viral clip extractor', 'video repurposing tool'],
}

export default function ShortsGuidePage() {
  return (
    <article className="flex flex-col gap-10 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 text-[var(--text-subtle)] text-xs mb-4">
          <Link href="/guide" className="hover:text-white transition-colors">User Guide</Link>
          <span>›</span>
          <span className="text-white">Shorts Script</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-3">🎬 Viral Shorts Script from Long-Form YouTube — in Seconds</h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          Find the most impactful moments in a 30-minute lecture, interview, or documentary, and repurpose them into a 60-second script optimized for <strong className="text-white">YouTube Shorts · Instagram Reels · TikTok</strong>. No need to rewatch the whole video — AI picks the viral points and gets your short-form content ready. A powerful repurposing tool for editors, creators, and marketers.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-white border-l-2 border-pink-500 pl-3">Who this feature is for</h2>
        <ul className="flex flex-col gap-2">
          {[
            'Creators who want to repurpose long-form content into short-form',
            'People running separate YouTube Shorts or Instagram Reels channels',
            'Marketers who want to clip company seminar or lecture videos for social media',
            'Video editors who want to quickly identify high-viral-potential moments',
            'Anyone who wants to extract quotes and insights from interviews or podcasts',
          ].map(t => (
            <li key={t} className="flex items-start gap-2 text-[var(--text-muted)] text-sm">
              <span className="text-pink-400 mt-0.5 shrink-0">✓</span>{t}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-bold text-white border-l-2 border-pink-500 pl-3">How to extract a Shorts script</h2>
        <ol className="flex flex-col gap-3">
          {[
            { step: '1', title: 'Paste the YouTube URL', desc: 'Copy the URL of the long-form video you want to turn into a short. Lectures, interviews, vlogs, documentaries — all formats supported.' },
            { step: '2', title: 'Select 🎬 Shorts Script category', desc: 'Switches to a Shorts-optimized analysis mode. AI extracts hooks, core messages, and climax moments from the transcript.' },
            { step: '3', title: 'AI identifies viral moments', desc: 'Automatically spots emotionally engaging segments, high-information-density sections, and surprise facts across the entire video.' },
            { step: '4', title: '60-second script & hashtags ready', desc: 'A reformatted script for your platform (Shorts/Reels/TikTok) plus viral hashtags, all generated in one go.' },
          ].map(item => (
            <li key={item.step} className="flex gap-4 bg-[var(--bg-elevated)] rounded-2xl p-4">
              <span className="w-7 h-7 rounded-full bg-pink-500/20 text-pink-400 font-bold text-sm flex items-center justify-center shrink-0">{item.step}</span>
              <div>
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-[var(--text-subtle)] text-xs mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[var(--bg-elevated)] rounded-2xl p-5 flex flex-col gap-3">
        <h2 className="text-base font-bold text-white">What&apos;s included in the Shorts script</h2>
        <ul className="grid grid-cols-2 gap-2.5">
          {[
            ['⚡', 'Hook — first 3-second opening'],
            ['🎯', '1–3 core messages'],
            ['📝', 'Full script under 60 seconds'],
            ['🔥', 'Viral moment timestamps'],
            ['🏷️', 'Platform-specific hashtags'],
            ['📱', 'Caption-ready text format'],
          ].map(([icon, label]) => (
            <li key={label as string} className="text-[var(--text-muted)] text-xs flex items-center gap-2">
              <span>{icon}</span>{label}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-bold text-white border-l-2 border-pink-500 pl-3">Repurposing scenarios by content type</h2>
        <div className="flex flex-col gap-3">
          {[
            { icon: '🎓', title: 'Lecture → Core Insight Shorts Series', desc: 'From a 50-minute marketing lecture, pull "3 social media mistakes you should never make" — shocking insights turned into a Shorts series.' },
            { icon: '🎤', title: 'Interview → Quote & insight clips', desc: 'Extract the most memorable statements from celebrity or expert interviews as 15–30 second clips for LinkedIn, Instagram, or YouTube Shorts.' },
            { icon: '🎬', title: 'Documentary → Shocking Facts Shorts', desc: '"Did you know that ~?" hook-style educational Shorts scripts. Information content optimized for the algorithm.' },
            { icon: '🏃', title: 'Vlog → Highlight Reels', desc: 'Select the most emotional or entertaining moments from travel vlogs and daily recordings, and convert them into Reels or TikTok highlight scripts.' },
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
        <h2 className="text-base font-bold text-white border-l-2 border-pink-500 pl-3">Frequently asked questions</h2>
        <div className="flex flex-col gap-2">
          {[
            { q: 'Can I get multiple Shorts ideas from one video?', a: 'Yes. AI extracts multiple viral moments, so you can get 3–5 Shorts ideas from a single long-form video at once.' },
            { q: 'Can I record the script as-is?', a: 'The generated script is a draft. We recommend editing it to match your voice, tone, and character before recording.' },
          ].map(item => (
            <div key={item.q} className="bg-[var(--bg-elevated)] rounded-xl p-4">
              <p className="text-white text-sm font-semibold mb-1">Q. {item.q}</p>
              <p className="text-[var(--text-subtle)] text-xs leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
        <Link href="/" className="px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm rounded-xl transition-colors">
          Extract a Shorts script now
        </Link>
        <Link href="/guide/search" className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors">
          AI Chat Search →
        </Link>
      </div>
    </article>
  )
}
