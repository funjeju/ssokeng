'use client'

import { useState } from 'react'

interface Props {
  text: string
  className?: string
}

export default function TranslateButton({ text, className = '' }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [translated, setTranslated] = useState('')

  const handleTranslate = async () => {
    if (state === 'loading') return
    if (state === 'done') { setState('idle'); setTranslated(''); return }

    setState('loading')
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      setTranslated(data.translated || '')
      setState('done')
    } catch {
      setState('idle')
    }
  }

  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      <button
        onClick={handleTranslate}
        disabled={state === 'loading'}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
          state === 'done'
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/25'
            : 'bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-subtle)] hover:text-white hover:border-[var(--border-strong)]'
        } disabled:opacity-50`}
        title={state === 'done' ? 'Close translation' : 'Translate to Korean'}
      >
        {state === 'loading' ? (
          <span className="animate-spin text-[9px]">⏳</span>
        ) : state === 'done' ? (
          <span>🇰🇷 Close</span>
        ) : (
          <span>🇰🇷 Korean</span>
        )}
      </button>
      {state === 'done' && translated && (
        <span className="block text-xs text-emerald-300/90 bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2 leading-relaxed">
          {translated}
        </span>
      )}
    </span>
  )
}
