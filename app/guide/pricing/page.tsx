import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'SSOKENG Pricing — Free & Paid Plans Compared',
  description: 'Compare SSOKENG free and paid plans. Try without signing up, unlimited saves, Classroom access, and more — see what each plan includes.',
  keywords: ['SSOKENG pricing', 'SSOKENG plans', 'youtube AI summary free', 'SSOKENG pro plan'],
}

export default function PricingGuidePage() {
  return (
    <article className="flex flex-col gap-8 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 text-[var(--text-subtle)] text-xs mb-4">
          <Link href="/guide" className="hover:text-white transition-colors">User Guide</Link>
          <span>›</span>
          <span className="text-white">Pricing</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-3">💳 Pricing</h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          Try SSOKENG without signing up. The more you use it, the more a logged-in plan pays off.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            name: 'Guest',
            price: 'Free',
            color: 'border-[var(--border-default)]',
            features: ['1 summary (videos under 10 min)', 'View summary result', 'No saves'],
            cta: null,
          },
          {
            name: 'Free Member',
            price: '$0',
            color: 'border-orange-500/30',
            highlight: true,
            features: ['No video length limit', 'Unlimited library saves', 'Square sharing', 'AI chat search', 'Playlist import'],
            cta: 'Sign up free with Google',
            ctaHref: '/',
          },
          {
            name: 'Teacher (Pro)',
            price: 'Contact us',
            color: 'border-lime-500/30',
            features: ['All Free Member features', 'Create a Classroom', 'Student learning management', 'Auto worksheet distribution', 'Priority support'],
            cta: 'Contact us',
            ctaHref: 'mailto:naggu1999@gmail.com',
          },
        ].map(plan => (
          <div key={plan.name} className={`bg-[var(--bg-elevated)] rounded-2xl p-5 border ${plan.color} flex flex-col gap-3`}>
            <div>
              <p className="text-[var(--text-subtle)] text-xs">{plan.name}</p>
              <p className="text-white font-black text-xl mt-0.5">{plan.price}</p>
            </div>
            <ul className="flex flex-col gap-1.5 flex-1">
              {plan.features.map(f => (
                <li key={f} className="text-[var(--text-muted)] text-xs flex items-start gap-1.5">
                  <span className="text-orange-400 shrink-0">✓</span>{f}
                </li>
              ))}
            </ul>
            {plan.cta && (
              <Link
                href={plan.ctaHref!}
                className="w-full py-2 bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs rounded-xl text-center transition-colors"
              >
                {plan.cta}
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-[var(--border-subtle)]">
        <Link href="/guide" className="text-[var(--text-subtle)] text-sm hover:text-white transition-colors">
          ← Back to User Guide
        </Link>
      </div>
    </article>
  )
}
