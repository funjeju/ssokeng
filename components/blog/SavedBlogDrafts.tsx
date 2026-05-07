'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSavedBlogDrafts, deleteBlogDraft, SavedBlogDraft } from '@/lib/blogDraft'
import { formatRelativeDate } from '@/lib/formatDate'

function buildHtml(draft: SavedBlogDraft): string {
  const ytBase = `https://youtu.be/${draft.videoId}`
  const appUrl = `https://ssoktube.com/result/${draft.sessionId}`

  const tocItems = draft.sections.filter(s => s.heading)
  const tocHtml = tocItems.length > 0
    ? `<nav style="margin:0 0 32px;padding:16px 20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
  <p style="margin:0 0 10px;font-size:0.75em;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">📋 Table of Contents</p>
  <ol style="margin:0;padding:0 0 0 18px;">
${tocItems.map((s, i) => `    <li style="margin:0 0 6px;font-size:0.9em;color:#374151;">${i + 1}. ${s.heading}</li>`).join('\n')}
  </ol>
</nav>`
    : ''

  const sectionsHtml = draft.sections.map(s => {
    const tsLink = s.seconds
      ? `\n<p style="margin:6px 0 16px;"><a href="${ytBase}?t=${s.seconds}" target="_blank" rel="noopener" style="font-size:0.85em;color:#f97316;">▶ Watch segment ${s.timestamp}</a></p>`
      : ''
    if (!s.heading) {
      return `<p style="margin:0 0 20px;line-height:1.8;font-size:1.05em;">${s.text}</p>`
    }
    const tag = `h${s.level}`
    return `<${tag} style="margin:32px 0 12px;font-weight:700;">${s.heading}</${tag}>\n<p style="margin:0 0 12px;line-height:1.8;">${s.text}</p>${tsLink}`
  }).join('\n')

  const faq = draft.faq ?? []
  const faqHtml = faq.length > 0
    ? `<h2 style="margin:32px 0 12px;font-weight:700;">FAQ</h2>
${faq.map(f => `<details style="margin:0 0 10px;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;">
  <summary style="font-weight:600;cursor:pointer;color:#111827;">${f.question}</summary>
  <p style="margin:10px 0 0;line-height:1.75;color:#374151;">${f.answer}</p>
</details>`).join('\n')}`
    : ''

  const commentsHtml = draft.comments
    ? `<div style="margin:40px 0 0;">
  <h2 style="margin:0 0 16px;font-weight:700;font-size:1.1em;">💬 Viewer Reactions</h2>
  <div style="margin:0 0 24px;padding:16px;background:#fafafa;border-radius:10px;border:1px solid #e5e7eb;">
    <p style="margin:0 0 10px;font-size:0.8em;font-weight:700;color:#f97316;">🔥 Popular comment trends</p>
    <p style="margin:0 0 14px;line-height:1.75;color:#374151;font-size:0.9em;">${draft.comments.popular_summary}</p>
    ${draft.comments.popular_highlights.map(h =>
      `<blockquote style="margin:8px 0;padding:10px 14px;background:#fff;border-left:3px solid #f97316;border-radius:0 6px 6px 0;font-size:0.85em;color:#4b5563;">
      "${h.text}"
      <span style="display:block;margin-top:4px;font-size:0.75em;color:#9ca3af;">👍 ${h.likes.toLocaleString()}</span>
    </blockquote>`).join('\n')}
  </div>
  <div style="padding:16px;background:#fafafa;border-radius:10px;border:1px solid #e5e7eb;">
    <p style="margin:0 0 10px;font-size:0.8em;font-weight:700;color:#6366f1;">🕐 Recent comment trends</p>
    <p style="margin:0 0 14px;line-height:1.75;color:#374151;font-size:0.9em;">${draft.comments.recent_summary}</p>
    ${draft.comments.recent_highlights.map(h =>
      `<blockquote style="margin:8px 0;padding:10px 14px;background:#fff;border-left:3px solid #6366f1;border-radius:0 6px 6px 0;font-size:0.85em;color:#4b5563;">
      "${h.text}"
      <span style="display:block;margin-top:4px;font-size:0.75em;color:#9ca3af;">👍 ${h.likes.toLocaleString()}</span>
    </blockquote>`).join('\n')}
  </div>
</div>`
    : ''

  const tagsHtml = draft.tags.map(t =>
    `<span style="display:inline-block;margin:3px;padding:3px 10px;background:#f3f4f6;border-radius:999px;font-size:0.8em;color:#374151;">${t}</span>`
  ).join('')

  return `<!-- SEO: ${draft.meta_description} -->

<article>
<h1 style="font-size:1.6em;font-weight:800;margin:0 0 12px;line-height:1.4;">${draft.seo_title}</h1>
<p style="font-size:0.85em;color:#6b7280;margin:0 0 20px;">📹 Source: <a href="${ytBase}" target="_blank" rel="noopener">${draft.channel} — ${draft.title}</a> &nbsp;|&nbsp; Reading time: ~${draft.reading_time} min</p>

<figure style="margin:0 0 28px;">
  <a href="${ytBase}" target="_blank" rel="noopener">
    <img src="${draft.thumbnail}" alt="${draft.seo_title}" style="width:100%;max-width:640px;border-radius:10px;display:block;" />
  </a>
</figure>

${tocHtml}

${sectionsHtml}

${faqHtml}

${commentsHtml}

<div style="margin:32px 0 16px;padding:16px;background:#fff7ed;border-left:4px solid #f97316;border-radius:4px;">
  <p style="margin:0;font-size:0.9em;color:#92400e;">This article was generated with <a href="${appUrl}" target="_blank" rel="noopener" style="color:#f97316;font-weight:600;">SSOKENG AI</a>.</p>
</div>

<div style="margin:16px 0;">${tagsHtml}</div>
</article>`
}

function buildPlainText(draft: SavedBlogDraft): string {
  const ytBase = `https://youtu.be/${draft.videoId}`
  const tocSections = draft.sections.filter(s => s.heading)
  const lines: string[] = [
    draft.seo_title, '',
    `📹 Source: ${draft.channel} — ${draft.title}`,
    `🔗 ${ytBase}`, '',
    `■ Meta description`, draft.meta_description, '',
    `■ Tags`, draft.tags.join(', '), '',
    '─'.repeat(40), '',
    ...(tocSections.length > 0 ? [
      '📋 Table of Contents',
      ...tocSections.map((s, i) => `  ${i + 1}. ${s.heading}`),
      '', '─'.repeat(40), '',
    ] : []),
  ]
  for (const s of draft.sections) {
    if (s.heading) lines.push(`▌ ${s.heading}`, '')
    lines.push(s.text)
    if (s.timestamp && s.seconds !== null) lines.push(`▶ ${ytBase}?t=${s.seconds} (${s.timestamp})`)
    lines.push('')
  }
  if (draft.faq?.length) {
    lines.push('─'.repeat(40), '', '■ FAQ', '')
    draft.faq.forEach(f => {
      lines.push(`Q. ${f.question}`, `A. ${f.answer}`, '')
    })
  }
  if (draft.comments) {
    lines.push('─'.repeat(40), '', '💬 Viewer Reactions', '')
    lines.push('🔥 Popular comment trends', draft.comments.popular_summary, '')
    draft.comments.popular_highlights.forEach(h => lines.push(`  "${h.text}"  [👍${h.likes}]`, ''))
    lines.push('🕐 Recent comment trends', draft.comments.recent_summary, '')
    draft.comments.recent_highlights.forEach(h => lines.push(`  "${h.text}"  [👍${h.likes}]`, ''))
  }
  return lines.join('\n')
}

interface DetailModalProps {
  draft: SavedBlogDraft
  onClose: () => void
}

function DetailModal({ draft, onClose }: DetailModalProps) {
  const [tab, setTab] = useState<'preview' | 'html' | 'text'>('preview')
  const [copied, setCopied] = useState<'html' | 'text' | null>(null)

  const copy = async (type: 'html' | 'text') => {
    const content = type === 'html' ? buildHtml(draft) : buildPlainText(draft)
    await navigator.clipboard.writeText(content)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="shrink-0 flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h2 className="text-white font-bold text-base line-clamp-1">{draft.seo_title}</h2>
            <p className="text-zinc-500 text-xs mt-0.5">{draft.channel} · ~{draft.reading_time} min read</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl ml-4">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {/* 탭 */}
          <div className="flex gap-1.5 p-1 bg-[var(--overlay-subtle)] rounded-xl">
            {([
              { id: 'preview', label: '👁 Preview' },
              { id: 'html',    label: '🌐 Copy HTML' },
              { id: 'text',    label: '📋 Copy text' },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                  tab === t.id ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* SEO 메타 */}
          <div className="bg-white/3 border border-[var(--border-default)] rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-orange-400 font-bold w-20">SEO title</span>
              <span className="text-zinc-200">{draft.seo_title}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-orange-400 font-bold w-20">Meta desc</span>
              <span className="text-zinc-400">{draft.meta_description}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-orange-400 font-bold w-20">Tags</span>
              <span className="text-zinc-400">{draft.tags.join(', ')}</span>
            </div>
          </div>

          {tab === 'preview' && (
            <div className="bg-white rounded-2xl p-5 text-zinc-800 space-y-3">
              <img src={draft.thumbnail} alt="" className="w-full rounded-xl object-cover max-h-48" />
              <h1 className="text-lg font-bold leading-snug">{draft.seo_title}</h1>
              <p className="text-xs text-zinc-400">📹 {draft.channel} | ~{draft.reading_time} min read</p>

              {/* 목차 */}
              {(() => {
                const tocItems = draft.sections.filter(s => s.heading)
                if (tocItems.length === 0) return null
                return (
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">📋 Table of Contents</p>
                    <ol className="space-y-1">
                      {tocItems.map((s, i) => (
                        <li key={s.id} className="flex items-start gap-2 text-xs">
                          <span className="text-orange-500 font-bold shrink-0">{i + 1}.</span>
                          <span className="text-zinc-600">{s.heading}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )
              })()}

              {draft.sections.map(s => (
                <div key={s.id}>
                  {s.heading && <h2 className="text-base font-bold mt-4 mb-1 text-zinc-700">{s.heading}</h2>}
                  <p className="text-sm leading-relaxed text-zinc-600">{s.text}</p>
                  {s.timestamp && <p className="text-xs text-orange-500 mt-1">▶ {s.timestamp} segment</p>}
                </div>
              ))}

              {/* FAQ */}
              {draft.faq && draft.faq.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-bold text-zinc-500">💬 FAQ</p>
                  {draft.faq.map((f, i) => (
                    <details key={i} className="border border-zinc-200 rounded-lg px-3 py-2 text-xs">
                      <summary className="font-semibold text-zinc-700 cursor-pointer">{f.question}</summary>
                      <p className="mt-2 text-zinc-500 leading-relaxed">{f.answer}</p>
                    </details>
                  ))}
                </div>
              )}

              {/* 댓글 분석 */}
              {draft.comments && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-bold text-zinc-500">💬 Viewer Reactions</p>
                  <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                    <p className="text-[10px] font-bold text-orange-600 mb-1.5">🔥 Popular comment trends</p>
                    <p className="text-xs text-zinc-600 leading-relaxed mb-2">{draft.comments.popular_summary}</p>
                    <div className="space-y-1.5">
                      {draft.comments.popular_highlights.map((h, i) => (
                        <div key={i} className="bg-white rounded-lg px-3 py-2 border-l-2 border-orange-400">
                          <p className="text-xs text-zinc-700 leading-relaxed">"{h.text}"</p>
                          <p className="text-[9px] text-zinc-400 mt-0.5">👍 {h.likes.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                    <p className="text-[10px] font-bold text-indigo-600 mb-1.5">🕐 Recent comment trends</p>
                    <p className="text-xs text-zinc-600 leading-relaxed mb-2">{draft.comments.recent_summary}</p>
                    <div className="space-y-1.5">
                      {draft.comments.recent_highlights.map((h, i) => (
                        <div key={i} className="bg-white rounded-lg px-3 py-2 border-l-2 border-indigo-400">
                          <p className="text-xs text-zinc-700 leading-relaxed">"{h.text}"</p>
                          <p className="text-[9px] text-zinc-400 mt-0.5">👍 {h.likes.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-1 pt-2">
                {draft.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-zinc-100 rounded-full text-[10px] text-zinc-500">#{t}</span>
                ))}
              </div>
            </div>
          )}
          {tab === 'html' && (
            <pre className="bg-zinc-900 border border-[var(--border-default)] rounded-2xl p-4 text-[10px] text-zinc-400 overflow-x-auto leading-relaxed max-h-64 whitespace-pre-wrap">
              {buildHtml(draft)}
            </pre>
          )}
          {tab === 'text' && (
            <pre className="bg-zinc-900 border border-[var(--border-default)] rounded-2xl p-4 text-[10px] text-zinc-400 overflow-x-auto leading-relaxed max-h-64 whitespace-pre-wrap">
              {buildPlainText(draft)}
            </pre>
          )}
        </div>

        <div className="shrink-0 flex gap-2 px-6 py-4 border-t border-[var(--border-subtle)]">
          <Link
            href={`/result/${draft.sessionId}`}
            className="px-4 h-10 rounded-xl bg-[var(--overlay-subtle)] hover:bg-[var(--overlay-default)] text-zinc-400 text-xs flex items-center transition-colors"
          >
            Source video →
          </Link>
          <div className="flex-1" />
          <button
            onClick={() => copy('text')}
            className={`px-4 h-10 rounded-xl text-xs font-bold transition-colors ${
              copied === 'text' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-[var(--overlay-subtle)] hover:bg-[var(--overlay-default)] text-zinc-300'
            }`}
          >
            {copied === 'text' ? '✓ Copied' : '📋 Copy text'}
          </button>
          <button
            onClick={() => copy('html')}
            className={`px-4 h-10 rounded-xl text-xs font-bold transition-colors ${
              copied === 'html' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            {copied === 'html' ? '✓ Copied' : '🌐 Copy HTML'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SavedBlogDrafts({ userId }: { userId: string }) {
  const [drafts, setDrafts] = useState<SavedBlogDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewDraft, setViewDraft] = useState<SavedBlogDraft | null>(null)

  useEffect(() => {
    if (!userId) return
    getSavedBlogDrafts(userId)
      .then(setDrafts)
      .finally(() => setLoading(false))
  }, [userId])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blog draft?')) return
    setDeletingId(id)
    try {
      await deleteBlogDraft(id)
      setDrafts(prev => prev.filter(d => d.id !== id))
    } catch {
      alert('Failed to delete.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
      </div>
    )
  }

  if (drafts.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--text-subtle)]">
        <p className="text-4xl mb-3">✍️</p>
        <p className="font-medium text-white mb-1">No saved blog drafts</p>
        <p className="text-sm">Generate and save a blog draft from a video summary page.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {drafts.map(draft => (
          <div
            key={draft.id}
            className="group bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-2xl overflow-hidden transition-all cursor-pointer"
            onClick={() => setViewDraft(draft)}
          >
            <div className="relative overflow-hidden bg-[var(--bg-surface)]">
              <img
                src={draft.thumbnail}
                alt={draft.seo_title}
                className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-[9px] font-bold text-orange-400 border border-orange-500/30">
                Blog
              </div>
            </div>
            <div className="p-4">
              <p className="text-white font-semibold text-sm leading-snug line-clamp-2 mb-2">
                {draft.seo_title}
              </p>
              <p className="text-zinc-500 text-xs mb-3 line-clamp-2">{draft.meta_description}</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-xs">{draft.channel}</p>
                  {draft.createdAt && (
                    <p className="text-zinc-600 text-xs">{formatRelativeDate(draft.createdAt)}</p>
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(draft.id) }}
                  disabled={deletingId === draft.id}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30"
                  title="Delete"
                >
                  {deletingId === draft.id ? (
                    <div className="w-3.5 h-3.5 rounded-full border border-zinc-500 border-t-transparent animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {draft.tags.slice(0, 3).map(t => (
                  <span key={t} className="px-1.5 py-0.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded text-[10px] text-zinc-500">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {viewDraft && (
        <DetailModal draft={viewDraft} onClose={() => setViewDraft(null)} />
      )}
    </>
  )
}
