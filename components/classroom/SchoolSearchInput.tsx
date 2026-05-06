'use client'

import { useState, useEffect, useRef } from 'react'

export interface SchoolResult {
  code: string
  name: string
  type: string    // 초등학교 / 중학교 / 고등학교
  region: string
  address: string
}

interface Props {
  value: SchoolResult | null
  onChange: (school: SchoolResult | null) => void
  accentColor?: 'orange' | 'emerald'  // 포커스 테두리 색
}

const typeColor = (type: string) => {
  if (type.includes('초등')) return 'text-emerald-400'
  if (type.includes('중학')) return 'text-blue-400'
  if (type.includes('고등')) return 'text-purple-400'
  return 'text-gray-400'
}

const typeShort = (type: string) =>
  type.replace('등학교', '').replace('학교', '')

export default function SchoolSearchInput({ value, onChange, accentColor = 'emerald' }: Props) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [results, setResults] = useState<SchoolResult[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const focusClass = accentColor === 'orange' ? 'focus:border-orange-500' : 'focus:border-emerald-500/70'
  const selectedBorder = accentColor === 'orange' ? 'border-orange-500' : 'border-emerald-500'
  const badgeBg = accentColor === 'orange' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-emerald-500/10 border-emerald-500/20'

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // value prop이 외부에서 null로 변경되면 query 초기화
  useEffect(() => {
    if (!value) setQuery('')
  }, [value])

  // 디바운스 검색
  useEffect(() => {
    if (value) return
    if (query.length < 2) { setResults([]); setOpen(false); return }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/classroom/school-search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.schools ?? [])
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [query, value])

  const handleSelect = (school: SchoolResult) => {
    onChange(school)
    setQuery(school.name)
    setOpen(false)
    setResults([])
  }

  const handleClear = () => {
    onChange(null)
    setQuery('')
    setResults([])
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); if (value) onChange(null) }}
          onFocus={() => { if (results.length > 0 && !value) setOpen(true) }}
          placeholder="학교 이름 검색 (2글자 이상)"
          autoComplete="off"
          className={`w-full bg-[var(--bg-surface-2)] border rounded-xl px-4 py-3 pr-9 text-sm text-white placeholder:text-[var(--text-subtle)] focus:outline-none transition-colors ${
            value ? selectedBorder : `border-[var(--border-default)] ${focusClass}`
          }`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {searching && (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          )}
          {value && !searching && (
            <button type="button" onClick={handleClear} className="text-gray-500 hover:text-white transition-colors text-sm leading-none">✕</button>
          )}
        </div>
      </div>

      {/* 선택된 학교 배지 */}
      {value && (
        <div className={`mt-1.5 px-3 py-1.5 border rounded-xl text-xs flex items-center gap-1.5 ${badgeBg}`}>
          <span className={`font-bold shrink-0 ${typeColor(value.type)}`}>[{value.type}]</span>
          <span className="text-white font-semibold">{value.name}</span>
          <span className="text-gray-400">{value.region}</span>
        </div>
      )}

      {/* 드롭다운 */}
      {open && results.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
          {results.map(school => (
            <button
              key={school.code}
              type="button"
              onClick={() => handleSelect(school)}
              className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-[var(--border-subtle)] last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold shrink-0 ${typeColor(school.type)}`}>{typeShort(school.type)}</span>
                <span className="text-white text-sm font-semibold">{school.name}</span>
                <span className="text-gray-500 text-[11px] truncate">{school.region}</span>
              </div>
              <p className="text-gray-600 text-[10px] mt-0.5 truncate pl-8">{school.address}</p>
            </button>
          ))}
        </div>
      )}

      {/* 결과 없음 */}
      {open && !searching && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-30 w-full mt-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl shadow-2xl px-4 py-3 text-center">
          <p className="text-gray-500 text-xs">'{query}'에 해당하는 학교가 없습니다.</p>
        </div>
      )}
    </div>
  )
}
