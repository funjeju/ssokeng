import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Extract Itineraries & Spots from YouTube Travel Videos | SSOKENG',
  description: 'No need to take notes while watching travel vlogs. SSOKENG automatically extracts visited spots, routes, accommodation, and tips into itinerary format.',
  keywords: ['youtube travel video summary', 'travel vlog organizer', 'youtube travel itinerary', 'travel spot extraction', 'travel vlog auto organizer', 'youtube travel guide'],
}

export default function TravelGuidePage() {
  return (
    <article className="flex flex-col gap-10 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 text-[var(--text-subtle)] text-xs mb-4">
          <Link href="/guide" className="hover:text-white transition-colors">User Guide</Link>
          <span>›</span><span>Video Summary</span><span>›</span>
          <span className="text-white">Travel Spot Extraction</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-3">🧳 AI Auto-Organizes Spots, Food & Itineraries from Travel Vlogs</h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          Found a great place while watching a travel vlog but forgot it later? SSOKENG automatically extracts <strong className="text-white">visited places · travel routes · accommodation · restaurant recommendations · practical tips</strong> from travel vlogs and organizes them into itinerary format. From Japan trip prep to European backpacking — the vlogs you watched become real travel guidebooks.
        </p>
      </div>

      <section className="bg-[var(--bg-elevated)] rounded-2xl p-5 flex flex-col gap-3">
        <h2 className="text-base font-bold text-white">What gets extracted from travel videos</h2>
        <ul className="grid grid-cols-2 gap-2.5">
          {[
            ['📍', 'Places visited & address info'],
            ['🗺', 'Travel order & route'],
            ['🏨', 'Accommodation & price range'],
            ['🍜', 'Restaurants & recommended dishes'],
            ['🚌', 'Transportation methods'],
            ['💰', 'Budget & cost info'],
            ['⚠️', 'Cautions & pro tips'],
            ['📅', 'Best time to visit'],
          ].map(([icon, label]) => (
            <li key={label as string} className="text-[var(--text-muted)] text-xs flex items-center gap-2">
              <span>{icon}</span>{label}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-bold text-white border-l-2 border-emerald-500 pl-3">How to organize a travel vlog</h2>
        <ol className="flex flex-col gap-3">
          {[
            { step: '1', title: 'Copy the travel YouTube URL', desc: 'Copy the URL of a travel vlog, travel course video, or food tour video from YouTube.' },
            { step: '2', title: 'Select 🧳 Travel category', desc: 'The travel category organizes output optimized for places, routes, and tips. AI analyzes the transcript and automatically recognizes place names, restaurant names, and accommodations.' },
            { step: '3', title: 'AI auto-organizes into itinerary format', desc: 'Places are listed in visit order, each with estimated time, transport, and tips. Restaurants include menu and price info when available.' },
            { step: '4', title: 'Save to your travel wish list', desc: 'Save to My Page\'s travel tab to access when you actually take the trip. Stack multiple videos to build your own personal travel guidebook.' },
          ].map(item => (
            <li key={item.step} className="flex gap-4 bg-[var(--bg-elevated)] rounded-2xl p-4">
              <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center shrink-0">{item.step}</span>
              <div>
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-[var(--text-subtle)] text-xs mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-bold text-white border-l-2 border-emerald-500 pl-3">Travel use cases</h2>
        <div className="flex flex-col gap-3">
          {[
            { icon: '🇯🇵', title: 'Japan trip prep', desc: 'Summarize 10 Japan travel vlogs with SSOKENG and get key spots and routes automatically organized. Great for planning Tokyo, Osaka, or Kyoto itineraries.' },
            { icon: '🏝', title: 'Domestic travel itineraries', desc: 'Extract spot-by-spot places from local travel vlogs to build your own custom domestic trip routes.' },
            { icon: '✈️', title: 'Europe & Southeast Asia backpacking', desc: 'Gather practical budget, transport, and accommodation info from backpacking vlogs to create your own travel guide.' },
            { icon: '🍽', title: 'Food tours & culinary travel', desc: 'Auto-extract restaurant name, menu, price, and wait-time tips from food tour YouTube videos. Manage your personal food spot list as a library.' },
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
        <h2 className="text-base font-bold text-white border-l-2 border-emerald-500 pl-3">Frequently asked questions</h2>
        <div className="flex flex-col gap-2">
          {[
            { q: 'Do foreign travel videos (English, Japanese) get summarized in English?', a: 'English videos are summarized in English by default. For other languages, try auto-detect mode.' },
            { q: 'Can I summarize multiple travel videos at once?', a: 'Use the playlist import feature in My Page to batch-summarize a travel playlist.' },
          ].map(item => (
            <div key={item.q} className="bg-[var(--bg-elevated)] rounded-xl p-4">
              <p className="text-white text-sm font-semibold mb-1">Q. {item.q}</p>
              <p className="text-[var(--text-subtle)] text-xs leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
        <Link href="/" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-colors">
          Summarize a travel video now
        </Link>
        <Link href="/guide/import" className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors">
          Batch summarize a playlist →
        </Link>
      </div>
    </article>
  )
}
