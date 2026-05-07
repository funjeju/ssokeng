'use client'

import { useState, useRef, useEffect } from 'react'
import Header from '@/components/common/Header'
import { useAuth } from '@/providers/AuthProvider'
import { getSavedSummariesByFolder } from '@/lib/db'
import { getLocalUserId } from '@/lib/user'
import { downloadPdf } from '@/lib/downloadPdf'
import type { SavedSummary } from '@/lib/db'

interface ReportResult {
  executive_summary: string
  key_themes: { theme: string; description: string; videos: number[] }[]
  insights: { insight: string; source_video: number; importance: string }[]
  comparison: { common: string[]; differences: string[] }
  action_items: { action: string; priority: string }[]
  conclusion: string
}

const IMPORTANCE_COLOR: Record<string, string> = {
  high: 'text-red-400 bg-red-500/10 border-red-500/20',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  low: 'text-zinc-400 bg-[var(--overlay-subtle)] border-[var(--border-default)]',
}
const PRIORITY_COLOR: Record<string, string> = {
  high: 'text-orange-400',
  medium: 'text-zinc-300',
  low: 'text-zinc-500',
}

export default function ReportPage() {
  const { user } = useAuth()
  const [mySummaries, setMySummaries] = useState<SavedSummary[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [selectedVideos, setSelectedVideos] = useState<SavedSummary[]>([])
  const [reportTitle, setReportTitle] = useState('')
  const [reportPurpose, setReportPurpose] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<ReportResult | null>(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [search, setSearch] = useState('')
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const uid = user?.uid ?? getLocalUserId()
    if (!uid || uid.startsWith('user_')) return
    setLoadingLibrary(true)
    getSavedSummariesByFolder(uid, 'all')
      .then(setMySummaries)
      .catch(() => {})
      .finally(() => setLoadingLibrary(false))
  }, [user])

  const toggleVideo = (s: SavedSummary) => {
    setSelectedVideos(prev => {
      const exists = prev.find(v => v.id === s.id)
      if (exists) return prev.filter(v => v.id !== s.id)
      if (prev.length >= 5) return prev
      return [...prev, s]
    })
  }

  const handleGenerate = async () => {
    if (selectedVideos.length < 1) return
    setGenerating(true)
    setError('')
    setResult(null)
    try {
      const videos = selectedVideos.map(v => ({
        title: v.title,
        channel: v.channel,
        summary: v.summary,
        transcript: (v as any).transcript?.slice(0, 1200),
      }))
      const res = await fetch('/api/multi-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videos, reportTitle, reportPurpose }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setResult(await res.json())
    } catch (e: any) {
      setError(e.message || 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return
    setDownloading(true)
    try {
      await downloadPdf(reportRef.current, `report_${Date.now()}.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  const filtered = search.trim()
    ? mySummaries.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        (s.channel ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : mySummaries

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <Header title="Multi-Video Insight Report" />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* 헤더 */}
        <div>
          <h1 className="text-white font-bold text-xl mb-1">📊 Multi-Video Insight Report</h1>
          <p className="text-zinc-500 text-sm">Select 1–5 videos and let AI generate a comprehensive insight report you can save as a PDF.</p>
        </div>

        {/* 보고서 설정 */}
        <div className="bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-2xl p-5 space-y-3">
          <p className="text-white font-semibold text-sm">Report settings</p>
          <input
            value={reportTitle}
            onChange={e => setReportTitle(e.target.value)}
            placeholder="Report title (optional)"
            className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/40"
          />
          <input
            value={reportPurpose}
            onChange={e => setReportPurpose(e.target.value)}
            placeholder="Purpose (e.g., marketing trend research, recipe comparison...)"
            className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/40"
          />
        </div>

        {/* 영상 선택 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-white font-semibold text-sm">Select videos <span className="text-zinc-500 font-normal">({selectedVideos.length}/5)</span></p>
            {selectedVideos.length > 0 && (
              <button onClick={() => setSelectedVideos([])} className="text-xs text-zinc-500 hover:text-white transition-colors">Clear all</button>
            )}
          </div>

          {/* 선택된 영상 */}
          {selectedVideos.length > 0 && (
            <div className="flex flex-col gap-2">
              {selectedVideos.map((v, i) => (
                <div key={v.id} className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2">
                  <span className="text-orange-400 font-bold text-xs w-5 shrink-0">{i + 1}</span>
                  <img src={v.thumbnail} alt="" className="w-10 h-7 rounded-lg object-cover shrink-0" />
                  <p className="text-white text-xs font-medium flex-1 min-w-0 truncate">{v.title}</p>
                  <button onClick={() => toggleVideo(v)} className="shrink-0 text-zinc-500 hover:text-red-400 text-xs transition-colors">✕</button>
                </div>
              ))}
            </div>
          )}

          {/* 라이브러리에서 검색 */}
          {user && (
            <div className="space-y-2">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search my library..."
                className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[var(--border-strong)]"
              />
              {loadingLibrary ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                  {filtered.slice(0, 30).map(s => {
                    const isSelected = selectedVideos.some(v => v.id === s.id)
                    const isDisabled = !isSelected && selectedVideos.length >= 5
                    return (
                      <button
                        key={s.id}
                        onClick={() => !isDisabled && toggleVideo(s)}
                        disabled={isDisabled}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-orange-500/15 border-orange-500/30'
                            : isDisabled
                              ? 'bg-[var(--bg-surface-2)] border-[var(--border-subtle)] opacity-40 cursor-not-allowed'
                              : 'bg-[var(--bg-surface-2)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border text-[9px] font-bold ${
                          isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-[var(--border-strong)] text-transparent'
                        }`}>
                          {isSelected ? selectedVideos.findIndex(v => v.id === s.id) + 1 : ''}
                        </div>
                        <img src={s.thumbnail} alt="" className="w-12 h-8 rounded-lg object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{s.title}</p>
                          <p className="text-zinc-500 text-[10px]">{s.channel}</p>
                        </div>
                      </button>
                    )
                  })}
                  {filtered.length === 0 && (
                    <p className="text-zinc-600 text-sm text-center py-6">No saved videos.</p>
                  )}
                </div>
              )}
            </div>
          )}
          {!user && (
            <p className="text-zinc-600 text-sm text-center py-4 bg-[var(--bg-surface-2)] rounded-xl">Sign in to select videos directly from your library.</p>
          )}
        </div>

        {/* 생성 버튼 */}
        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
        <button
          onClick={handleGenerate}
          disabled={selectedVideos.length < 1 || generating}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 disabled:opacity-40 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Generating report...
            </>
          ) : `📊 Generate Report (${selectedVideos.length} video${selectedVideos.length === 1 ? '' : 's'})`}
        </button>

        {/* 보고서 결과 */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-white font-bold">📄 Generated Report</p>
              <button
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--overlay-subtle)] hover:bg-[var(--overlay-default)] text-white text-sm font-bold transition-all border border-[var(--border-default)] disabled:opacity-50"
              >
                {downloading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                Save PDF
              </button>
            </div>

            <div ref={reportRef} className="bg-white text-[var(--bg-base)] rounded-2xl p-8 space-y-7 font-sans">
              {/* 보고서 헤더 */}
              <div className="border-b-2 border-orange-500 pb-5">
                <div className="text-orange-500 text-xs font-bold uppercase tracking-widest mb-1">SSOKTUBE AI Report</div>
                <h1 className="text-2xl font-black text-[var(--bg-base)]">
                  {reportTitle || 'Comprehensive Insight Report'}
                </h1>
                <p className="text-zinc-500 text-sm mt-1">
                  {selectedVideos.length} video{selectedVideos.length === 1 ? '' : 's'} analyzed · {new Date().toLocaleDateString('en-US')}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedVideos.map((v, i) => (
                    <span key={v.id} className="text-[11px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-medium">
                      {i + 1}. {v.title.slice(0, 30)}{v.title.length > 30 ? '...' : ''}
                    </span>
                  ))}
                </div>
              </div>

              {/* Executive Summary */}
              <div>
                <h2 className="text-base font-black text-[var(--bg-base)] mb-2">📌 Executive Summary</h2>
                <p className="text-zinc-700 text-sm leading-relaxed bg-orange-50 rounded-xl p-4 border-l-4 border-orange-500">
                  {result.executive_summary}
                </p>
              </div>

              {/* Key Themes */}
              {result.key_themes?.length > 0 && (
                <div>
                  <h2 className="text-base font-black text-[var(--bg-base)] mb-3">🔍 Key Themes</h2>
                  <div className="space-y-3">
                    {result.key_themes.map((t, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                        <div>
                          <p className="font-bold text-sm text-[var(--bg-base)]">{t.theme}</p>
                          <p className="text-zinc-600 text-xs mt-0.5 leading-relaxed">{t.description}</p>
                          <div className="flex gap-1 mt-1">
                            {t.videos?.map(n => (
                              <span key={n} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-medium">Video {n}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights */}
              {result.insights?.length > 0 && (
                <div>
                  <h2 className="text-base font-black text-[var(--bg-base)] mb-3">💡 Key Insights</h2>
                  <div className="space-y-2">
                    {result.insights.map((ins, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-zinc-100 bg-zinc-50">
                        <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded font-bold border mt-0.5 ${
                          ins.importance === 'high' ? 'text-red-600 bg-red-50 border-red-200' :
                          ins.importance === 'medium' ? 'text-orange-600 bg-orange-50 border-orange-200' :
                          'text-zinc-400 bg-zinc-100 border-zinc-200'
                        }`}>
                          {ins.importance?.toUpperCase()}
                        </span>
                        <p className="text-zinc-700 text-sm flex-1 leading-relaxed">{ins.insight}</p>
                        <span className="shrink-0 text-[10px] text-zinc-400 font-medium mt-0.5">Video {ins.source_video}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comparison */}
              {result.comparison && (
                <div>
                  <h2 className="text-base font-black text-[var(--bg-base)] mb-3">⚖️ Comparison</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-emerald-700 mb-2 uppercase">Similarities</p>
                      <ul className="space-y-1.5">
                        {result.comparison.common?.map((c, i) => (
                          <li key={i} className="text-xs text-zinc-700 flex items-start gap-1.5">
                            <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-orange-700 mb-2 uppercase">Differences</p>
                      <ul className="space-y-1.5">
                        {result.comparison.differences?.map((d, i) => (
                          <li key={i} className="text-xs text-zinc-700 flex items-start gap-1.5">
                            <span className="text-orange-500 mt-0.5 shrink-0">↔</span>{d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Items */}
              {result.action_items?.length > 0 && (
                <div>
                  <h2 className="text-base font-black text-[var(--bg-base)] mb-3">🚀 Action Items</h2>
                  <div className="space-y-2">
                    {result.action_items.map((a, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5 ${
                          a.priority === 'high' ? 'bg-red-500 text-white' :
                          a.priority === 'medium' ? 'bg-orange-400 text-white' :
                          'bg-zinc-300 text-zinc-700'
                        }`}>{i + 1}</span>
                        <p className="text-zinc-700 text-sm leading-relaxed">{a.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conclusion */}
              {result.conclusion && (
                <div className="border-t-2 border-zinc-100 pt-5">
                  <h2 className="text-base font-black text-[var(--bg-base)] mb-2">📝 Conclusion</h2>
                  <p className="text-zinc-700 text-sm leading-relaxed">{result.conclusion}</p>
                </div>
              )}

              <div className="text-center text-[10px] text-zinc-300 pt-4 border-t border-zinc-100">
                Generated by SSOKENG AI · {new Date().toLocaleString('en-US')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
