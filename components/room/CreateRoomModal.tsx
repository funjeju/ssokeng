'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import { getLocalUserId } from '@/lib/user'
import { createRoom } from '@/lib/room'

interface Props {
  sessionId: string
  videoId: string
  title: string
  thumbnail: string
  onClose: () => void
  onRoomCreated?: (roomId: string) => void
}

export default function CreateRoomModal({ sessionId, videoId, title, thumbnail, onClose, onRoomCreated }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const [password, setPassword] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    setCreating(true)
    try {
      const uid = user?.uid || getLocalUserId()
      const name = user?.displayName || 'Anonymous'
      const photo = user?.photoURL || ''
      const roomId = await createRoom({
        sessionId, videoId, title, thumbnail,
        hostUid: uid,
        hostName: name,
        hostPhotoURL: photo,
        password: usePassword ? password : '',
      })
      onClose()
      if (onRoomCreated) {
        onRoomCreated(roomId)
      } else {
        router.push(`/room/${roomId}`)
      }
    } catch (e) {
      console.error('[CreateRoom] failed:', e)
      alert(`Failed to create room.\n${(e as Error)?.message || String(e)}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-page)] border border-[var(--border-default)] rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">🎬 Create Watch Party</h2>
          <button onClick={onClose} className="text-[var(--text-subtle)] hover:text-white text-xl">✕</button>
        </div>

        {/* 영상 미리보기 */}
        <div className="flex items-center gap-3 bg-[var(--bg-elevated)] rounded-2xl p-3 border border-[var(--border-subtle)]">
          {thumbnail && (
            <img src={thumbnail} alt="" className="w-20 h-12 object-cover rounded-lg shrink-0" />
          )}
          <p className="text-white text-sm font-medium line-clamp-2">{title}</p>
        </div>

        {/* 비밀번호 설정 */}
        <div className="space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div
              onClick={() => setUsePassword(v => !v)}
              className={`w-10 h-5 rounded-full transition-colors relative ${usePassword ? 'bg-orange-500' : 'bg-[var(--bg-elevated-2)]'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${usePassword ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-[var(--text-muted)] text-sm">Lock room with a password</span>
          </label>

          {usePassword && (
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password (letters & numbers)"
              className="w-full h-10 px-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl text-white text-sm focus:outline-none focus:border-orange-500/50"
            />
          )}
        </div>

        <div className="bg-[var(--bg-base)] rounded-2xl px-4 py-3 space-y-1 text-[11px] text-[var(--text-subtle)]">
          <p>👑 Only the host can play / pause / seek</p>
          <p>💬 Live chat + emoji reactions</p>
          <p>📝 Timestamp notes saved to your profile</p>
          <p>✋ Raise hand to ask questions</p>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-12 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white text-sm transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || (usePassword && !password.trim())}
            className="flex-1 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {creating ? (
              <><div className="w-4 h-4 rounded-full border-2 border-[var(--border-emphasis)] border-t-white animate-spin" />Creating...</>
            ) : 'Start room 🎬'}
          </button>
        </div>
      </div>
    </div>
  )
}
