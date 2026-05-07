'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getLocalUserId } from '@/lib/user'
import { getUserFolders, createFolder, saveSummary, upsertUserProfile, getSavedSummaryByVideoId, updateSavedSummary, Folder } from '@/lib/db'
import { useAuth } from '@/providers/AuthProvider'

function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: Failed to connect to DB.')), ms)
    )
  ])
}

export interface SavedResult {
  id: string
  folderId: string
  isPublic: boolean
}

type SortKey = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'

function sortFolders(folders: Folder[], sort: SortKey): Folder[] {
  return [...folders].sort((a, b) => {
    if (sort === 'date_desc' || sort === 'date_asc') {
      const aTime = a.createdAt?.toMillis?.() ?? a.createdAt?.getTime?.() ?? 0
      const bTime = b.createdAt?.toMillis?.() ?? b.createdAt?.getTime?.() ?? 0
      return sort === 'date_desc' ? bTime - aTime : aTime - bTime
    }
    const cmp = a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' })
    return sort === 'name_asc' ? cmp : -cmp
  })
}

export default function SaveModal({ data, onClose }: { data: any, onClose: (saved?: SavedResult) => void }) {
  const { user, openAuthModal } = useAuth()
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [duplicateInfo, setDuplicateInfo] = useState<{ id: string; folderId: string } | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('date_desc')

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const uid = getLocalUserId()
        const [list, existing] = await Promise.all([
          withTimeout(getUserFolders(uid), 6000),
          user && data.videoId ? getSavedSummaryByVideoId(uid, data.videoId).catch(() => null) : null,
        ])
        setFolders(list)
        if (existing) setDuplicateInfo({ id: existing.id, folderId: existing.folderId })
      } catch (e) {
        console.error('Failed to load folders:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchFolders()
  }, [])

  const filteredFolders = useMemo(() => {
    const sorted = sortFolders(folders, sort)
    if (!search.trim()) return sorted
    const q = search.trim().toLowerCase()
    return sorted.filter(f => f.name.toLowerCase().includes(q))
  }, [folders, sort, search])

  const doEmbed = (docId: string) => {
    fetch('/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId, title: data.title, category: data.category, summary: data.summary, contextSummary: data.contextSummary }),
    }).catch(() => {})
  }

  const handleSaveToFolder = async (folderId: string) => {
    setSaving(true)
    try {
      const uid = getLocalUserId()
      if (user) await upsertUserProfile({ uid: user.uid, displayName: user.displayName || '', photoURL: user.photoURL || '' })

      let savedId = ''
      if (duplicateInfo) {
        await withTimeout(updateSavedSummary(duplicateInfo.id, {
          sessionId: data.sessionId,
          folderId,
          title: data.title,
          channel: data.channel,
          thumbnail: data.thumbnail,
          category: data.category,
          summary: data.summary ?? null,
          square_meta: data.summary?.square_meta,
          transcript: data.transcript,
          transcriptSource: data.transcriptSource,
          isPublic,
        }))
        doEmbed(duplicateInfo.id)
        savedId = duplicateInfo.id
      } else {
        const docId = await withTimeout(saveSummary({
          userId: uid,
          userDisplayName: user?.displayName || '',
          userPhotoURL: user?.photoURL || '',
          folderId,
          sessionId: data.sessionId,
          videoId: data.videoId,
          title: data.title,
          channel: data.channel,
          thumbnail: data.thumbnail,
          category: data.category,
          summary: data.summary ?? null,
          square_meta: data.summary?.square_meta,
          transcript: data.transcript,
          transcriptSource: data.transcriptSource,
          isPublic,
        }))
        doEmbed(docId)
        savedId = docId
      }
      alert(duplicateInfo ? 'Updated!' : 'Saved!')
      onClose({ id: savedId, folderId, isPublic })
    } catch (e) {
      console.error('Save error:', e)
      alert((e as Error).message || 'Failed to save. Please check your connection.')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateAndSave = async () => {
    if (!newFolderName.trim()) return
    setSaving(true)
    try {
      const uid = getLocalUserId()
      const newFolder = await withTimeout(createFolder(uid, newFolderName.trim()))
      if (user) await upsertUserProfile({ uid: user.uid, displayName: user.displayName || '', photoURL: user.photoURL || '' })

      let savedId2 = ''
      if (duplicateInfo) {
        await withTimeout(updateSavedSummary(duplicateInfo.id, {
          sessionId: data.sessionId,
          folderId: newFolder.id,
          title: data.title,
          channel: data.channel,
          thumbnail: data.thumbnail,
          category: data.category,
          summary: data.summary ?? null,
          square_meta: data.summary?.square_meta,
          transcript: data.transcript,
          transcriptSource: data.transcriptSource,
          isPublic,
        }))
        doEmbed(duplicateInfo.id)
        savedId2 = duplicateInfo.id
      } else {
        const docId2 = await withTimeout(saveSummary({
          userId: uid,
          userDisplayName: user?.displayName || '',
          userPhotoURL: user?.photoURL || '',
          folderId: newFolder.id,
          sessionId: data.sessionId,
          videoId: data.videoId,
          title: data.title,
          channel: data.channel,
          thumbnail: data.thumbnail,
          category: data.category,
          summary: data.summary ?? null,
          square_meta: data.summary?.square_meta,
          transcript: data.transcript,
          transcriptSource: data.transcriptSource,
          isPublic,
        }))
        doEmbed(docId2)
        savedId2 = docId2
      }
      alert(duplicateInfo ? 'Updated!' : 'Saved!')
      onClose({ id: savedId2, folderId: newFolder.id, isPublic })
    } catch (e) {
      console.error('Create and save error:', e)
      alert((e as Error).message || 'Failed to save. Please check your connection.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl">
        <h2 className="text-xl font-bold text-white text-center">Save to Library</h2>

        {/* Duplicate video notice */}
        {duplicateInfo && (
          <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl px-4 py-3">
            <span className="text-base shrink-0">🔄</span>
            <p className="text-amber-300 text-xs leading-relaxed">
              This video is already saved. Saving again will <span className="font-bold">update the existing entry with the latest analysis</span>.
            </p>
          </div>
        )}

        {/* Guest: prompt login */}
        {!user && (
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="text-5xl">📚</div>
            <div className="text-center space-y-1.5">
              <p className="text-white font-semibold">Sign in to save</p>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">Save to your library and<br />access it anytime.</p>
            </div>
            <button
              onClick={() => { onClose(); openAuthModal('login') }}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-colors"
            >
              Log In / Sign Up
            </button>
            <Button variant="ghost" className="w-full text-zinc-500 hover:text-zinc-300 text-sm" onClick={() => onClose()}>
              Cancel
            </Button>
          </div>
        )}

        {user && (<>

          {/* Visibility */}
          <div className="flex bg-[var(--bg-elevated)] rounded-xl p-1 border border-[var(--border-subtle)]">
            <button
              onClick={() => setIsPublic(false)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isPublic ? 'bg-[var(--bg-surface)] text-white shadow' : 'text-[var(--text-subtle)] hover:text-white'}`}
            >
              🔒 Private
            </button>
            <button
              onClick={() => setIsPublic(true)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isPublic ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow' : 'text-[var(--text-subtle)] hover:text-white'}`}
            >
              🌍 Share to Square
            </button>
          </div>

          {/* Search + sort */}
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search folders"
              className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-white h-10 text-sm"
            />
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs rounded-lg px-2 h-10 shrink-0 focus:outline-none"
            >
              <option value="date_desc">Newest</option>
              <option value="date_asc">Oldest</option>
              <option value="name_asc">A → Z</option>
              <option value="name_desc">Z → A</option>
            </select>
          </div>

          {/* Folder list */}
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-0.5">
            {loading ? (
              <p className="text-center text-sm text-[var(--text-subtle)] py-4">Loading folders...</p>
            ) : filteredFolders.length > 0 ? (
              filteredFolders.map(f => (
                <Button
                  key={f.id}
                  variant="outline"
                  className="w-full h-11 justify-start px-4 border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-2)] hover:text-white text-[var(--text-muted)]"
                  onClick={() => handleSaveToFolder(f.id)}
                  disabled={saving}
                >
                  📁 {f.name}
                </Button>
              ))
            ) : search.trim() ? (
              <p className="text-center text-sm text-[var(--text-subtle)] py-4">No folders match &ldquo;{search}&rdquo;.</p>
            ) : (
              <p className="text-center text-sm text-[var(--text-subtle)] py-4">No folders yet.</p>
            )}
          </div>

          {/* New folder + save */}
          <div className="flex gap-2 pt-1 border-t border-[var(--border-subtle)]">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newFolderName.trim()) handleCreateAndSave() }}
              placeholder="New folder name"
              className="bg-[var(--bg-elevated)] border-none text-white h-11"
            />
            <Button
              className="h-11 bg-zinc-700 text-white hover:bg-zinc-600 shrink-0"
              onClick={handleCreateAndSave}
              disabled={saving || !newFolderName.trim()}
            >
              Create & Save
            </Button>
          </div>

          <Button variant="ghost" className="w-full text-zinc-500 hover:text-zinc-300" onClick={() => onClose()} disabled={saving}>
            Cancel
          </Button>
        </>)}
      </div>
    </div>
  )
}
