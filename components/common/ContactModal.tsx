'use client'

import { useState } from 'react'

interface ContactModalProps {
  onClose: () => void
}

const TYPE_OPTIONS = [
  { id: 'bug',        label: '🐛 Bug report',  desc: 'Tell us about an error or unexpected behavior' },
  { id: 'suggestion', label: '💡 Suggestion',  desc: 'Have an idea for a feature or improvement?' },
  { id: 'partnership',label: '🤝 Partnership', desc: 'Business collaboration proposal' },
]

export default function ContactModal({ onClose }: ContactModalProps) {
  const [type, setType] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!type || !message.trim()) { setError('Please select a type and enter a message.'); return }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, email: email.trim(), message: message.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setDone(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[var(--bg-base)] rounded-3xl border border-[var(--border-default)] shadow-2xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-subtle)] hover:text-white transition-colors text-xl leading-none"
        >✕</button>

        {done ? (
          /* 전송 완료 */
          <div className="text-center py-6">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-lg font-bold text-white mb-2">Sent!</h2>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
              Thank you for your feedback.<br/>We'll get back to you as soon as possible.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <h2 className="text-lg font-bold text-white mb-0.5">Contact Us</h2>
              <p className="text-[var(--text-subtle)] text-xs">Send us a bug report, suggestion, or partnership inquiry.</p>
            </div>

            {/* 유형 선택 */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id)}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-2xl border text-center transition-all ${
                    type === opt.id
                      ? 'border-orange-500/60 bg-orange-500/10 text-white'
                      : 'border-[var(--border-default)] bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-white'
                  }`}
                >
                  <span className="text-lg leading-none">{opt.label.split(' ')[0]}</span>
                  <span className="text-[11px] font-semibold leading-tight">{opt.label.split(' ').slice(1).join(' ')}</span>
                </button>
              ))}
            </div>
            {type && (
              <p className="text-[var(--text-subtle)] text-xs mb-4 -mt-2 px-1">
                {TYPE_OPTIONS.find(o => o.id === type)?.desc}
              </p>
            )}

            {/* 이메일 */}
            <div className="mb-3">
              <label className="block text-xs text-[var(--text-subtle)] mb-1.5">
                Email <span className="text-[var(--text-subtle)]">(optional — enter if you'd like a reply)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>

            {/* 내용 */}
            <div className="mb-4">
              <label className="block text-xs text-[var(--text-subtle)] mb-1.5">
                Message <span className="text-orange-400">*</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="The more detail you provide, the faster we can help."
                rows={4}
                className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
              />
            </div>

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <button
              type="submit"
              disabled={sending || !type || !message.trim()}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-[var(--bg-elevated-2)] disabled:text-[var(--text-subtle)] text-white font-bold rounded-2xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Sending...
                </>
              ) : 'Send'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
