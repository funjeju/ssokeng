'use client'

import { useEffect, useState } from 'react'
import {
  getRegions, createRegion, renameRegion, deleteRegion,
  getSpots, addSpot, deleteSpot, toggleVisited,
  TravelRegion, TravelSpot,
} from '@/lib/travel'
import ItineraryWizardModal from './ItineraryWizardModal'

const EMOJI_OPTIONS = ['📍', '🏖️', '🏔️', '🏙️', '🌿', '🍜', '🎡', '🛕', '🗼', '🌊']

interface KakaoPlace {
  id: string
  place_name: string
  road_address_name: string
  address_name: string
  category_name: string
  category_group_name: string
  phone: string
  x: string  // longitude
  y: string  // latitude
  place_url: string
}

export default function TravelWishlist({ userId }: { userId: string }) {
  const [regions, setRegions] = useState<TravelRegion[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [spots, setSpots] = useState<TravelSpot[]>([])
  const [loadingRegions, setLoadingRegions] = useState(true)
  const [loadingSpots, setLoadingSpots] = useState(false)

  // 지역 생성
  const [creatingRegion, setCreatingRegion] = useState(false)
  const [newRegionName, setNewRegionName] = useState('')
  const [newRegionEmoji, setNewRegionEmoji] = useState('📍')

  // 지역 편집
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameEmoji, setRenameEmoji] = useState('📍')

  // 스팟 추가 모드
  const [addingSpot, setAddingSpot] = useState(false)
  const [addMode, setAddMode] = useState<'search' | 'manual'>('search')

  // 장소 검색
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<KakaoPlace[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<KakaoPlace | null>(null)

  // 수동 입력
  const [spotName, setSpotName] = useState('')
  const [spotAddress, setSpotAddress] = useState('')
  const [spotDesc, setSpotDesc] = useState('')
  const [savingSpot, setSavingSpot] = useState(false)

  // 일정 생성 위자드
  const [showWizard, setShowWizard] = useState(false)

  // 지도 모달
  const [mapModalSpot, setMapModalSpot] = useState<TravelSpot | null>(null)

  useEffect(() => {
    if (!userId || userId.startsWith('user_')) { setLoadingRegions(false); return }
    getRegions(userId)
      .then(list => {
        setRegions(list)
        if (list.length > 0) setSelectedId(list[0].id)
      })
      .catch(() => {})
      .finally(() => setLoadingRegions(false))
  }, [userId])

  useEffect(() => {
    if (!selectedId || !userId || userId.startsWith('user_')) { setSpots([]); return }
    setLoadingSpots(true)
    getSpots(userId, selectedId)
      .then(setSpots)
      .catch(() => {})
      .finally(() => setLoadingSpots(false))
  }, [selectedId, userId])

  const handleCreateRegion = async () => {
    const name = newRegionName.trim()
    if (!name) return
    if (!userId || userId.startsWith('user_')) {
      alert('Login required. Please refresh and try again.')
      return
    }
    const id = await createRegion(userId, name, newRegionEmoji)
    const r: TravelRegion = { id, userId, name, emoji: newRegionEmoji, spotCount: 0, createdAt: null }
    setRegions(prev => [r, ...prev])
    setSelectedId(id)
    setCreatingRegion(false)
    setNewRegionName('')
  }

  const handleRenameConfirm = async (id: string) => {
    if (!renameValue.trim()) return
    await renameRegion(id, renameValue.trim(), renameEmoji)
    setRegions(prev => prev.map(r => r.id === id ? { ...r, name: renameValue.trim(), emoji: renameEmoji } : r))
    setRenamingId(null)
  }

  const handleDeleteRegion = async (r: TravelRegion) => {
    if (!confirm(`Delete the folder "${r.name}" and all its spots?`)) return
    try {
      await deleteRegion(r.id, userId)
      setRegions(prev => prev.filter(x => x.id !== r.id))
      if (selectedId === r.id) {
        const remaining = regions.filter(x => x.id !== r.id)
        setSelectedId(remaining[0]?.id ?? null)
      }
    } catch (e: any) {
      alert('Delete failed: ' + (e.message || 'Unknown error'))
    }
  }

  const handlePlaceSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchResults([])
    try {
      const res = await fetch(`/api/place-search?q=${encodeURIComponent(searchQuery.trim())}`)
      const data = await res.json()
      setSearchResults(data.documents || [])
    } catch {
      alert('Search failed.')
    } finally {
      setSearching(false)
    }
  }

  const handleSelectPlace = (place: KakaoPlace) => {
    setSelectedPlace(place)
    setSpotName(place.place_name)
    setSpotAddress(place.road_address_name || place.address_name)
    setSpotDesc('')
  }

  const resetAddForm = () => {
    setAddingSpot(false)
    setAddMode('search')
    setSearchQuery('')
    setSearchResults([])
    setSelectedPlace(null)
    setSpotName('')
    setSpotAddress('')
    setSpotDesc('')
  }

  const handleAddSpot = async () => {
    if (!selectedId || !spotName.trim()) return
    setSavingSpot(true)
    try {
      const lat = selectedPlace ? parseFloat(selectedPlace.y) : undefined
      const lng = selectedPlace ? parseFloat(selectedPlace.x) : undefined
      const thumbnail = (lat && lng)
        ? `/api/place-map?lat=${lat}&lng=${lng}`
        : undefined

      const id = await addSpot(userId, selectedId, {
        name: spotName.trim(),
        address: spotAddress.trim() || undefined,
        description: spotDesc.trim() || undefined,
        lat,
        lng,
        placeId: selectedPlace?.id,
        placeUrl: selectedPlace?.place_url,
        thumbnail,
        sourceType: selectedPlace ? 'map' : 'manual',
      })
      const newSpot: TravelSpot = {
        id, userId, regionId: selectedId,
        name: spotName.trim(),
        address: spotAddress.trim() || undefined,
        description: spotDesc.trim() || undefined,
        lat,
        lng,
        placeId: selectedPlace?.id,
        placeUrl: selectedPlace?.place_url,
        thumbnail: (lat && lng) ? `/api/place-map?lat=${lat}&lng=${lng}` : undefined,
        sourceType: selectedPlace ? 'map' : 'manual',
        visited: false,
        createdAt: null,
      }
      setSpots(prev => [...prev, newSpot])
      setRegions(prev => prev.map(r => r.id === selectedId ? { ...r, spotCount: r.spotCount + 1 } : r))
      resetAddForm()
    } finally {
      setSavingSpot(false)
    }
  }

  const handleDeleteSpot = async (s: TravelSpot) => {
    await deleteSpot(s.id, s.regionId)
    setSpots(prev => prev.filter(x => x.id !== s.id))
    setRegions(prev => prev.map(r => r.id === s.regionId ? { ...r, spotCount: Math.max(0, r.spotCount - 1) } : r))
  }

  const handleToggle = async (s: TravelSpot) => {
    await toggleVisited(s.id, !s.visited)
    setSpots(prev => prev.map(x => x.id === s.id ? { ...x, visited: !x.visited } : x))
  }

  const kakaoMapUrl = (name: string) =>
    `https://map.kakao.com/?q=${encodeURIComponent(name)}`

  const selectedRegion = regions.find(r => r.id === selectedId)

  if (loadingRegions) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* 지역 사이드바 */}
      <aside className="w-full md:w-56 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold text-sm">Region Folders</h3>
          <button
            onClick={() => { setCreatingRegion(true); setNewRegionName(''); setNewRegionEmoji('📍') }}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 font-bold transition-colors"
          >
            + Add
          </button>
        </div>

        {creatingRegion && (
          <div className="mb-3 bg-[var(--overlay-subtle)] border border-cyan-500/30 rounded-2xl p-3 space-y-2">
            <div className="flex gap-1 flex-wrap">
              {EMOJI_OPTIONS.map(e => (
                <button key={e} onClick={() => setNewRegionEmoji(e)}
                  className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                    newRegionEmoji === e ? 'bg-cyan-500/30 border border-cyan-500/50' : 'bg-[var(--overlay-subtle)] hover:bg-[var(--overlay-default)]'
                  }`}>{e}</button>
              ))}
            </div>
            <input
              autoFocus value={newRegionName}
              onChange={e => setNewRegionName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateRegion(); if (e.key === 'Escape') setCreatingRegion(false) }}
              placeholder="Region name..."
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40"
            />
            <div className="flex gap-1">
              <button onClick={handleCreateRegion} disabled={!newRegionName.trim()}
                className="flex-1 py-1.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-bold rounded-xl transition-colors">
                Create
              </button>
              <button onClick={() => setCreatingRegion(false)}
                className="px-3 py-1.5 bg-[var(--overlay-subtle)] text-zinc-400 text-xs rounded-xl hover:bg-[var(--overlay-default)]">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none">
          {regions.map(r => (
            <div key={r.id} className="group/reg relative shrink-0">
              {renamingId === r.id ? (
                <div className="space-y-1.5 p-2 bg-[var(--overlay-subtle)] rounded-2xl border border-cyan-500/30">
                  <div className="flex gap-1 flex-wrap">
                    {EMOJI_OPTIONS.map(e => (
                      <button key={e} onClick={() => setRenameEmoji(e)}
                        className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                          renameEmoji === e ? 'bg-cyan-500/30 border border-cyan-500/50' : 'bg-[var(--overlay-subtle)] hover:bg-[var(--overlay-default)]'
                        }`}>{e}</button>
                    ))}
                  </div>
                  <input
                    autoFocus value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(r.id); if (e.key === 'Escape') setRenamingId(null) }}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none"
                  />
                  <div className="flex gap-1">
                    <button onClick={() => handleRenameConfirm(r.id)} className="flex-1 py-1 bg-cyan-500 text-white text-[10px] font-bold rounded-lg">Save</button>
                    <button onClick={() => setRenamingId(null)} className="px-2 py-1 bg-[var(--overlay-subtle)] text-zinc-400 text-[10px] rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-2xl whitespace-nowrap transition-all flex items-center gap-2 pr-8 ${
                    selectedId === r.id
                      ? 'bg-cyan-500/20 border border-cyan-500/40 text-white'
                      : 'bg-[var(--bg-elevated)] text-zinc-400 hover:bg-[var(--bg-elevated-2)] border border-transparent'
                  }`}
                >
                  <span className="text-base">{r.emoji}</span>
                  <span className="text-sm font-medium truncate">{r.name}</span>
                  <span className="ml-auto text-[10px] text-zinc-500 shrink-0">{r.spotCount}</span>
                </button>
              )}
              {renamingId !== r.id && (
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover/reg:flex items-center gap-0.5">
                  <button
                    onClick={e => { e.stopPropagation(); setRenamingId(r.id); setRenameValue(r.name); setRenameEmoji(r.emoji) }}
                    className="w-6 h-6 rounded-lg bg-black/60 flex items-center justify-center text-[10px] text-zinc-400 hover:text-white"
                    title="Rename"
                  >✏️</button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteRegion(r) }}
                    className="w-6 h-6 rounded-lg bg-black/60 flex items-center justify-center text-[10px] text-zinc-400 hover:text-red-400"
                    title="Delete"
                  >🗑️</button>
                </div>
              )}
            </div>
          ))}
          {regions.length === 0 && (
            <p className="text-zinc-600 text-xs text-center py-4">Press + to create a region folder</p>
          )}
        </div>
      </aside>

      {/* 스팟 목록 */}
      <main className="flex-1 min-w-0">
        {!selectedId ? (
          <div className="text-center py-16 text-zinc-600">
            <p className="text-4xl mb-3">🗺️</p>
            <p>Select a region on the left or create a new one.</p>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <span className="text-xl">{selectedRegion?.emoji}</span>
                  <span className="truncate">{selectedRegion?.name}</span>
                  <span className="text-zinc-500 font-normal text-sm">({spots.length} spots)</span>
                </h3>
              </div>
              <button
                onClick={() => { setAddingSpot(v => !v); if (addingSpot) resetAddForm() }}
                className="text-xs px-3 py-2 rounded-xl bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 font-bold transition-colors shrink-0"
              >
                {addingSpot ? '✕ Close' : '+ Add spot'}
              </button>
              {spots.length > 0 && (
                <button
                  onClick={() => setShowWizard(true)}
                  className="text-xs px-3 py-2 rounded-xl bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 font-bold transition-colors shrink-0 flex items-center gap-1.5"
                >
                  ✨ AI Itinerary
                </button>
              )}
            </div>

            {/* 스팟 추가 폼 */}
            {addingSpot && (
              <div className="mb-4 bg-[var(--bg-surface)] border border-cyan-500/30 rounded-2xl p-4 space-y-3">
                {/* 모드 탭 */}
                <div className="flex gap-1 bg-black/20 rounded-xl p-1">
                  <button
                    onClick={() => { setAddMode('search'); setSelectedPlace(null); setSpotName(''); setSpotAddress('') }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${addMode === 'search' ? 'bg-cyan-500 text-white' : 'text-zinc-400 hover:text-white'}`}
                  >
                    🔍 Map search
                  </button>
                  <button
                    onClick={() => { setAddMode('manual'); setSelectedPlace(null); setSearchResults([]) }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${addMode === 'manual' ? 'bg-cyan-500 text-white' : 'text-zinc-400 hover:text-white'}`}
                  >
                    ✏️ Manual entry
                  </button>
                </div>

                {/* 지도 검색 모드 */}
                {addMode === 'search' && !selectedPlace && (
                  <>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handlePlaceSearch() }}
                        placeholder="Search by place name (e.g. Eiffel Tower, Shibuya)"
                        className="flex-1 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40"
                      />
                      <button
                        onClick={handlePlaceSearch}
                        disabled={!searchQuery.trim() || searching}
                        className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
                      >
                        {searching ? '...' : 'Search'}
                      </button>
                    </div>

                    {/* 검색 결과 */}
                    {searchResults.length > 0 && (
                      <div className="space-y-1.5 max-h-72 overflow-y-auto">
                        {searchResults.map(place => (
                          <button
                            key={place.id}
                            onClick={() => handleSelectPlace(place)}
                            className="w-full text-left flex items-start gap-3 p-3 bg-[var(--bg-base)] hover:bg-cyan-500/10 border border-[var(--border-subtle)] hover:border-cyan-500/30 rounded-xl transition-all"
                          >
                            {/* 지도 미리보기 썸네일 */}
                            <img
                              src={`/api/place-map?lat=${place.y}&lng=${place.x}`}
                              alt=""
                              className="w-14 h-10 rounded-lg object-cover shrink-0 bg-zinc-800"
                              loading="lazy"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-semibold truncate">{place.place_name}</p>
                              <p className="text-zinc-400 text-xs truncate mt-0.5">{place.road_address_name || place.address_name}</p>
                              {place.category_group_name && (
                                <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400/80">
                                  {place.category_group_name}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.length === 0 && searchQuery && !searching && (
                      <p className="text-zinc-500 text-xs text-center py-2">No results found.</p>
                    )}
                  </>
                )}

                {/* 장소 선택 후 확인 */}
                {addMode === 'search' && selectedPlace && (
                  <>
                    <div className="flex gap-3 items-start bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3">
                      <img
                        src={`/api/place-map?lat=${selectedPlace.y}&lng=${selectedPlace.x}`}
                        alt=""
                        className="w-20 h-14 rounded-lg object-cover shrink-0 bg-zinc-800"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-cyan-300 text-xs font-bold mb-1">Selected place</p>
                        <p className="text-white text-sm font-semibold">{selectedPlace.place_name}</p>
                        <p className="text-zinc-400 text-xs mt-0.5">{selectedPlace.road_address_name || selectedPlace.address_name}</p>
                        <p className="text-zinc-600 text-[10px] mt-0.5">
                          GPS {parseFloat(selectedPlace.y).toFixed(5)}, {parseFloat(selectedPlace.x).toFixed(5)}
                        </p>
                      </div>
                      <button onClick={() => { setSelectedPlace(null); setSpotName(''); setSpotAddress('') }} className="text-zinc-500 hover:text-white text-xs shrink-0">✕</button>
                    </div>
                    <textarea
                      value={spotDesc}
                      onChange={e => setSpotDesc(e.target.value)}
                      placeholder="Notes (optional)"
                      rows={2}
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40 resize-none"
                    />
                  </>
                )}

                {/* 직접 입력 모드 */}
                {addMode === 'manual' && (
                  <>
                    <input
                      autoFocus value={spotName}
                      onChange={e => setSpotName(e.target.value)}
                      placeholder="Place name *"
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40"
                    />
                    <input
                      value={spotAddress}
                      onChange={e => setSpotAddress(e.target.value)}
                      placeholder="Address (optional)"
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40"
                    />
                    <textarea
                      value={spotDesc}
                      onChange={e => setSpotDesc(e.target.value)}
                      placeholder="Notes (optional)"
                      rows={2}
                      className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40 resize-none"
                    />
                  </>
                )}

                {/* 저장 버튼 — 장소가 선택됐거나 직접입력 모드에서 이름 있을 때 */}
                {(selectedPlace || (addMode === 'manual' && spotName.trim())) && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddSpot}
                      disabled={savingSpot}
                      className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      {savingSpot ? 'Saving...' : '✓ Add to wish list'}
                    </button>
                    <button
                      onClick={resetAddForm}
                      className="px-4 py-2.5 bg-[var(--overlay-subtle)] text-zinc-400 text-sm rounded-xl hover:bg-[var(--overlay-default)] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 스팟 목록 */}
            {loadingSpots ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
              </div>
            ) : spots.length === 0 ? (
              <div className="text-center py-12 text-zinc-600">
                <p className="text-3xl mb-2">📍</p>
                <p className="text-sm">Wish spots from travel videos<br />or add them manually.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {spots.map(s => (
                  <div
                    key={s.id}
                    className={`flex items-start gap-3 bg-[var(--bg-surface-2)] border rounded-2xl p-4 transition-all ${
                      s.visited ? 'border-[var(--border-subtle)] opacity-60' : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {/* 방문 체크 */}
                    <button
                      onClick={() => handleToggle(s)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        s.visited
                          ? 'bg-cyan-500 border-cyan-500 text-white'
                          : 'border-zinc-600 hover:border-cyan-400'
                      }`}
                    >
                      {s.visited && <span className="text-[10px]">✓</span>}
                    </button>

                    {/* 썸네일 */}
                    {s.thumbnail && (
                      <img src={s.thumbnail} alt="" className="w-16 h-12 rounded-xl object-cover shrink-0" />
                    )}

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-semibold text-sm ${s.visited ? 'line-through text-zinc-500' : 'text-white'}`}>
                          {s.name}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* 지도 모달 */}
                          <button
                            onClick={() => setMapModalSpot(s)}
                            className="w-7 h-7 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-400 hover:bg-yellow-500/30 transition-colors text-xs font-bold"
                            title="View on map"
                          >
                            Map
                          </button>
                          {/* 영상 출처 */}
                          {s.sourceSessionId && (
                            <a
                              href={`/result/${s.sourceSessionId}`}
                              className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center text-red-400 hover:bg-red-500/25 transition-colors text-xs"
                              title="Source video"
                            >
                              ▶
                            </a>
                          )}
                          {/* 삭제 */}
                          <button
                            onClick={() => handleDeleteSpot(s)}
                            className="w-7 h-7 rounded-lg bg-[var(--overlay-subtle)] flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      {s.address && <p className="text-zinc-500 text-xs mt-0.5">{s.address}</p>}
                      {s.description && <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{s.description}</p>}
                      {s.videoTimestamp && s.sourceSessionId && (
                        <a
                          href={`/result/${s.sourceSessionId}?t=${s.videoTimestamp}`}
                          className="text-cyan-500/70 text-xs mt-1 inline-block hover:text-cyan-400"
                        >
                          ▶ Video {s.videoTimestamp}
                        </a>
                      )}
                      {s.sourceType === 'youtube' && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400/70">YouTube</span>
                      )}
                      {s.sourceType === 'map' && s.lat && s.lng && (
                        <p className="text-zinc-600 text-[10px] mt-0.5">
                          GPS {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 방문 완료 통계 */}
            {spots.length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-[var(--overlay-default)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all"
                    style={{ width: `${(spots.filter(s => s.visited).length / spots.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500 shrink-0">
                  {spots.filter(s => s.visited).length}/{spots.length} visited
                </span>
              </div>
            )}
          </>
        )}
      </main>

      {/* AI 일정 위자드 모달 */}
      {showWizard && selectedRegion && (
        <ItineraryWizardModal
          region={selectedRegion}
          spots={spots}
          onClose={() => setShowWizard(false)}
        />
      )}

      {/* 지도 모달 */}
      {mapModalSpot && (
        <div
          className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setMapModalSpot(null)}
        >
          <div
            className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* 지도 이미지 */}
            {mapModalSpot.lat && mapModalSpot.lng ? (
              <div className="relative w-full h-52 bg-[var(--bg-elevated)] overflow-hidden">
                <img
                  src={`/api/place-map?lat=${mapModalSpot.lat}&lng=${mapModalSpot.lng}`}
                  alt={mapModalSpot.name}
                  className="w-full h-full object-cover"
                />
                {/* 중심 핀 */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-3xl drop-shadow-lg">📍</div>
                </div>
              </div>
            ) : (
              <div className="w-full h-32 bg-[var(--bg-elevated)] flex items-center justify-center">
                <span className="text-4xl opacity-30">🗺️</span>
              </div>
            )}

            {/* 정보 */}
            <div className="p-5 flex flex-col gap-4">
              <div>
                <p className="font-bold text-[var(--text-primary)] text-base">{mapModalSpot.name}</p>
                {mapModalSpot.address && (
                  <p className="text-[var(--text-muted)] text-sm mt-1">{mapModalSpot.address}</p>
                )}
                {mapModalSpot.description && (
                  <p className="text-[var(--text-subtle)] text-xs mt-2 leading-relaxed">{mapModalSpot.description}</p>
                )}
              </div>

              <div className="flex gap-2">
                <a
                  href={mapModalSpot.placeUrl || kakaoMapUrl(mapModalSpot.address || mapModalSpot.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 h-10 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-black text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  🗺️ Open in Kakao Maps
                </a>
                <button
                  onClick={() => setMapModalSpot(null)}
                  className="px-4 h-10 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-2)] text-[var(--text-muted)] text-sm font-medium transition-colors border border-[var(--border-default)]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
