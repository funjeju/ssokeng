'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/common/Header'
import { getSharedFolder, copySharedFolder, SharedFolder } from '@/lib/db'
import { getLocalUserId } from '@/lib/user'
import { useAuth } from '@/providers/AuthProvider'

const CATEGORY_LABEL: Record<string, string> = {
  recipe: '🍳 Recipe', english: '🔤 Language', learning: '📐 Learning', news: '🗞️ News',
  selfdev: '💪 Self-Dev', travel: '🧳 Travel', story: '🍿 Story', tips: '💡 Tips',
}

export default function SharePage() {
  const { shareId } = useParams<{ shareId: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [shared, setShared] = useState<SharedFolder | null>(null)
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getSharedFolder(shareId)
      .then(data => {
        if (!data) setError('Shared folder not found.')
        else setShared(data)
      })
      .catch(() => setError('Failed to load.'))
      .finally(() => setLoading(false))
  }, [shareId])

  const handleCopy = async () => {
    if (copying || done) return
    setCopying(true)
    try {
      const uid = user?.uid || getLocalUserId()
      const displayName = user?.displayName || 'Anonymous'
      const photoURL = user?.photoURL || ''
      await copySharedFolder(shareId, uid, displayName, photoURL)
      setDone(true)
    } catch (e) {
      alert((e as Error).message || 'Failed to copy.')
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] font-sans">
      <Header title="Shared Folder" />
      <div className="max-w-2xl mx-auto px-4 py-10">

        {loading && (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500" />
          </div>
        )}

        {error && (
          <div className="text-center py-24">
            <p className="text-3xl mb-4">😢</p>
            <p className="text-white font-bold mb-2">{error}</p>
            <Link href="/" className="text-orange-400 text-sm underline">Go Home</Link>
          </div>
        )}

        {shared && !error && (
          <div className="space-y-6">
            {/* 폴더 헤더 */}
            <div className="bg-[var(--bg-elevated)] rounded-[24px] border border-[var(--border-default)] p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center text-2xl shrink-0">
                  📁
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-white truncate">{shared.folderName}</h1>
                  <div className="flex items-center gap-2 mt-1.5">
                    {shared.ownerPhotoURL ? (
                      <img src={shared.ownerPhotoURL} alt="" className="w-5 h-5 rounded-full border border-[var(--border-default)]" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-[var(--bg-elevated-2)] flex items-center justify-center text-[9px]">👤</div>
                    )}
                    <span className="text-[var(--text-muted)] text-sm">Shared by {shared.ownerName}</span>
                  </div>
                  <p className="text-[var(--text-subtle)] text-xs mt-1">{shared.items.length} video{shared.items.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* 복사 버튼 */}
              <div className="mt-5">
                {done ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <span>✅</span>
                      <span>Added to your library!</span>
                    </div>
                    <button
                      onClick={() => router.push('/mypage')}
                      className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors"
                    >
                      View in My Page →
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCopy}
                    disabled={copying}
                    className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {copying ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-[var(--border-emphasis)] border-t-white animate-spin" />
                        Adding...
                      </>
                    ) : (
                      '📥 Add to my library'
                    )}
                  </button>
                )}
                {!user && (
                  <p className="text-[var(--text-subtle)] text-xs text-center mt-2">
                    Added as a guest — items may not appear on other devices after sign-in.
                  </p>
                )}
              </div>
            </div>

            {/* 영상 목록 */}
            <div className="space-y-2">
              <p className="text-[var(--text-subtle)] text-xs px-1">Included videos</p>
              {shared.items.map((item, i) => (
                <div
                  key={item.sessionId}
                  className="flex items-center gap-3 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] p-3 hover:border-[var(--border-strong)] transition-colors"
                >
                  <span className="text-[var(--text-subtle)] text-xs w-5 text-right shrink-0">{i + 1}</span>
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" className="w-16 h-10 object-cover rounded-lg shrink-0 bg-[var(--bg-surface)]" />
                  ) : (
                    <div className="w-16 h-10 rounded-lg bg-[var(--bg-surface)] shrink-0 flex items-center justify-center text-lg">📄</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium line-clamp-1">{item.title}</p>
                    <p className="text-[var(--text-subtle)] text-[10px] mt-0.5 flex items-center gap-1">
                      <span>{CATEGORY_LABEL[item.category] ?? item.category}</span>
                      {item.channel && <><span>·</span><span className="truncate">{item.channel}</span></>}
                    </p>
                    {item.contextSummary && (
                      <p className="text-[var(--text-subtle)] text-[9px] mt-1 line-clamp-2 leading-relaxed">{item.contextSummary}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
