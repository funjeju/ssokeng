'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/common/Header'
import { useAuth } from '@/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { formatRelativeDate } from '@/lib/formatDate'
import Link from 'next/link'
import AnalyticsTab from '@/components/admin/AnalyticsTab'
import CurationTab from '@/components/admin/CurationTab'

interface AdminStats {
  totalSummaries: number
  totalSaved: number
  totalUsers: number
  todaySummaries: number
}

interface UserStats {
  total: number
  teachers: number
  students: number
  general: number
  paid: number
}

type AdminTab = 'analytics' | 'videos' | 'users' | 'curation' | 'square'

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [summaries, setSummaries] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics')

  // 스퀘어 관리
  const [squareItems, setSquareItems] = useState<any[]>([])
  const [squareSearch, setSquareSearch] = useState('')
  const [squarePage, setSquarePage] = useState(1)
  const [squareTotal, setSquareTotal] = useState(0)
  const [squareLoading, setSquareLoading] = useState(false)
  const [squareManagingId, setSquareManagingId] = useState<string | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const SQUARE_PAGE_SIZE = 12

  // 회원 관리
  const [users, setUsers] = useState<any[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [userRole, setUserRole] = useState('all')
  const [userPlan, setUserPlan] = useState('all')
  const [userPage, setUserPage] = useState(1)
  const [userTotal, setUserTotal] = useState(0)
  const [userLoading, setUserLoading] = useState(false)

  // 회원 편집 모달
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string | number>>({})
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [recalling, setRecalling] = useState(false)
  const [recallDone, setRecallDone] = useState<number | null>(null)

  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL

  useEffect(() => {
    if (authLoading) return
    if (!user || user.email !== ADMIN_EMAIL) {
      setIsAdmin(false)
      setLoading(false)
    } else {
      setIsAdmin(true)
      loadData()
    }
  }, [user, authLoading])

  const getAuthHeader = async () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user ? await user.getIdToken() : ''}`,
  })

  const loadData = async (targetPage = page) => {
    setLoading(true)
    try {
      const headers = await getAuthHeader()
      const [statsRes, listRes] = await Promise.all([
        fetch('/api/admin/stats', { method: 'POST', headers, body: JSON.stringify({}) }),
        fetch('/api/admin/summaries', { method: 'POST', headers, body: JSON.stringify({ search, page: targetPage }) }),
      ])
      if (statsRes.ok) setStats(await statsRes.json())
      if (listRes.ok) {
        const data = await listRes.json()
        setSummaries(data.summaries)
        setHasMore(data.summaries.length === 10)
      }
    } catch (e) {
      console.error('Failed to load admin data:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async (p = 1, role = userRole, plan = userPlan, q = userSearch) => {
    setUserLoading(true)
    try {
      const headers = await getAuthHeader()
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({ search: q, role, plan, page: p }),
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
        setUserTotal(data.total)
        setUserStats(data.stats)
        setUserPage(p)
      }
    } catch (e) {
      console.error('Failed to load users:', e)
    } finally {
      setUserLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin && activeTab === 'users') loadUsers(1)
    if (isAdmin && activeTab === 'square') loadSquare(1)
  }, [isAdmin, activeTab])

  const goToPage = (newPage: number) => { setPage(newPage); loadData(newPage) }

  const loadSquare = async (p = 1, q = squareSearch, hidden = showHidden) => {
    setSquareLoading(true)
    try {
      const headers = await getAuthHeader()
      const res = await fetch('/api/admin/square', {
        method: 'POST',
        headers,
        body: JSON.stringify({ search: q, page: p, showHidden: hidden }),
      })
      if (res.ok) {
        const data = await res.json()
        setSquareItems(data.items)
        setSquareTotal(data.total)
        setSquarePage(p)
      }
    } catch (e) { console.error(e) }
    finally { setSquareLoading(false) }
  }

  const handleSquareManage = async (id: string, action: 'hide' | 'show' | 'delete', title: string) => {
    const labels = { hide: 'Hide', show: 'Unhide', delete: 'Delete permanently' }
    if (action === 'delete' && !confirm(`[Permanently delete] This cannot be undone.\n"${title}"`)) return
    if (action === 'hide' && !confirm(`Hide from Square (data is kept).\n"${title}"`)) return
    setSquareManagingId(id)
    try {
      const headers = await getAuthHeader()
      const res = await fetch('/api/admin/square', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id, action }),
      })
      if (res.ok) {
        if (action === 'delete') {
          setSquareItems(prev => prev.filter(i => i.id !== id))
          setSquareTotal(prev => prev - 1)
        } else if (action === 'hide') {
          setSquareItems(prev => showHidden
            ? prev.map(i => i.id === id ? { ...i, adminHidden: true } : i)
            : prev.filter(i => i.id !== id)
          )
        } else if (action === 'show') {
          setSquareItems(prev => prev.map(i => i.id === id ? { ...i, adminHidden: false } : i))
        }
      } else {
        alert('Action failed')
      }
    } catch { alert('An error occurred.') }
    finally { setSquareManagingId(null) }
  }

  const openEditUser = (u: any) => {
    setEditingUser(u)
    setEditError('')
    setRecallDone(null)
    setEditForm({
      role: u.role || '',
      plan: u.plan || 'free',
      tokens: u.tokens ?? 0,
      classCode: u.classCode || '',
      schoolName: u.schoolName || '',
      grade: u.grade || '',
      classNum: u.classNum || '',
      teacherName: u.teacherName || '',
    })
  }

  const handleSaveUser = async () => {
    if (!editingUser) return
    setEditSaving(true); setEditError('')
    try {
      const headers = await getAuthHeader()
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ userId: editingUser.id, updates: editForm }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || res.status)
      }
      // 로컬 상태 반영
      setUsers(prev => prev.map(u => u.id === editingUser.id
        ? { ...u, ...editForm, role: editForm.role || undefined, classCode: editForm.classCode || undefined, schoolName: editForm.schoolName || undefined }
        : u
      ))
      setEditingUser(null)
    } catch (e: any) {
      setEditError(e.message)
    } finally { setEditSaving(false) }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`[Permanently delete] Are you sure you want to delete this summary?\nTitle: ${title}`)) return
    setDeletingId(id)
    try {
      const headers = await getAuthHeader()
      const res = await fetch('/api/admin/delete', { method: 'POST', headers, body: JSON.stringify({ id }) })
      if (res.ok) {
        setSummaries(prev => prev.filter(s => s.id !== id))
      } else {
        const err = await res.json().catch(() => ({}))
        alert(`Delete failed: ${err.error || res.status}`)
      }
    } catch { alert('An error occurred.') }
    finally { setDeletingId(null) }
  }

  if (authLoading || loading) return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
    </div>
  )

  if (!isAdmin) return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl mb-4">🚫</h1>
      <h2 className="text-xl text-white font-bold mb-2">Access denied</h2>
      <p className="text-gray-400 mb-6">Please sign in with an admin account.</p>
      <Link href="/" className="px-6 py-2 bg-orange-500 text-white rounded-xl">Go to Home</Link>
    </div>
  )

  const roleBadge = (role: string) => {
    if (role === 'teacher') return <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-bold">Teacher</span>
    if (role === 'student') return <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/20 font-bold">Student</span>
    return <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">General</span>
  }

  const planBadge = (plan: string) => {
    if (plan === 'paid' || plan === 'pro') return <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-orange-500/15 text-orange-400 border border-orange-500/20 font-bold">Paid</span>
    return <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">Free</span>
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-white font-sans">
      <Header title="🔧 Admin Dashboard" />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Videos analyzed today', value: stats?.todaySummaries ?? 0, unit: '', color: 'text-orange-500' },
            { label: 'Total summaries (cache)', value: stats?.totalSummaries ?? 0, unit: '', color: 'text-white' },
            { label: 'User saved', value: stats?.totalSaved ?? 0, unit: '', color: 'text-blue-400' },
            { label: 'Total registered users', value: stats?.totalUsers ?? 0, unit: '', color: 'text-emerald-400' },
          ].map(c => (
            <div key={c.label} className="bg-gradient-to-br from-[var(--bg-surface-2)] to-[var(--bg-base)] p-5 rounded-[24px] border border-[var(--border-subtle)] shadow-xl">
              <p className="text-gray-400 text-[11px] mb-1">{c.label}</p>
              <h3 className={`text-2xl font-black ${c.color}`}>{c.value} <span className="text-[10px] font-normal text-gray-500">{c.unit}</span></h3>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${activeTab === 'analytics' ? 'bg-orange-500 text-white' : 'bg-[var(--overlay-subtle)] text-gray-400 hover:bg-[var(--overlay-default)]'}`}
          >
            📈 Analytics
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${activeTab === 'videos' ? 'bg-orange-500 text-white' : 'bg-[var(--overlay-subtle)] text-gray-400 hover:bg-[var(--overlay-default)]'}`}
          >
            🎬 Videos
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${activeTab === 'users' ? 'bg-orange-500 text-white' : 'bg-[var(--overlay-subtle)] text-gray-400 hover:bg-[var(--overlay-default)]'}`}
          >
            👥 Members
          </button>
          <button
            onClick={() => setActiveTab('curation')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${activeTab === 'curation' ? 'bg-orange-500 text-white' : 'bg-[var(--overlay-subtle)] text-gray-400 hover:bg-[var(--overlay-default)]'}`}
          >
            ✍️ Magazine
          </button>
          <button
            onClick={() => setActiveTab('square')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${activeTab === 'square' ? 'bg-orange-500 text-white' : 'bg-[var(--overlay-subtle)] text-gray-400 hover:bg-[var(--overlay-default)]'}`}
          >
            🔲 Square
          </button>
        </div>

        {/* ── 통계 분석 탭 ── */}
        {activeTab === 'analytics' && (
          <AnalyticsTab getAuthHeader={getAuthHeader} />
        )}

        {/* ── 매거진 큐레이션 탭 ── */}
        {activeTab === 'curation' && (
          <CurationTab getAuthHeader={getAuthHeader} />
        )}

        {/* ── 영상 관리 탭 ── */}
        {activeTab === 'videos' && (
          <div className="bg-[var(--bg-surface)] rounded-[32px] border border-[var(--border-default)] p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold italic tracking-tighter">ALL VIDEO MANAGEMENT</h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by title, user, ID..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { setPage(1); loadData(1) } }}
                  className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 pl-10 text-xs focus:outline-none focus:border-orange-500 w-64 transition-all"
                />
                <span className="absolute left-3 top-3 opacity-30">🔍</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-gray-500 border-b border-[var(--border-subtle)]">
                  <tr>
                    <th className="pb-3 font-medium">Content (incl. cache)</th>
                    <th className="pb-3 font-medium">User / Time</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {summaries.map(s => (
                    <tr key={s.id} className="group hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <img src={s.thumbnail} className="w-20 aspect-video rounded-lg object-cover bg-gray-800 border border-[var(--border-subtle)]" alt="" />
                          <div className="min-w-0">
                            <p className="font-bold text-white line-clamp-1 group-hover:text-orange-400 transition-colors">{s.title}</p>
                            <p className="text-[9px] text-gray-500 mt-0.5 truncate">{s.category} · {s.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <p className="text-gray-300">{s.userDisplayName || 'Anonymous (cache)'}</p>
                        <p className="text-[10px] text-gray-500">{s.createdAt ? formatRelativeDate(s.createdAt) : '-'}</p>
                      </td>
                      <td className="py-4">
                        {s.isSaved
                          ? <span className="px-2 py-0.5 rounded-full text-[9px] bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">Saved</span>
                          : <span className="px-2 py-0.5 rounded-full text-[9px] bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">Cache only</span>}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/result/${s.originalId || s.id}`} className="p-2.5 hover:bg-[var(--overlay-default)] rounded-xl transition-colors text-gray-400" title="View details">👁️</Link>
                          <button
                            onClick={() => handleDelete(s.id, s.title)}
                            disabled={deletingId === s.id}
                            className="p-2.5 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors text-gray-400 disabled:opacity-50"
                          >🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {summaries.length === 0 && <div className="py-20 text-center text-gray-500">No data.</div>}
            {(page > 1 || hasMore) && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button onClick={() => goToPage(page - 1)} disabled={page === 1 || loading} className="px-4 py-2 rounded-xl text-xs bg-[var(--overlay-subtle)] hover:bg-[var(--overlay-default)] disabled:opacity-30 transition-colors">← Prev</button>
                <span className="text-xs text-gray-500">Page {page}</span>
                <button onClick={() => goToPage(page + 1)} disabled={!hasMore || loading} className="px-4 py-2 rounded-xl text-xs bg-[var(--overlay-subtle)] hover:bg-[var(--overlay-default)] disabled:opacity-30 transition-colors">Next →</button>
              </div>
            )}
          </div>
        )}

        {/* ── 스퀘어 관리 탭 ── */}
        {activeTab === 'square' && (
          <div className="bg-[var(--bg-surface)] rounded-[32px] border border-[var(--border-default)] p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold italic tracking-tighter">SQUARE MANAGEMENT</h2>
                <p className="text-xs text-gray-500 mt-1">Total: {squareTotal}</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHidden}
                    onChange={e => { setShowHidden(e.target.checked); loadSquare(1, squareSearch, e.target.checked) }}
                    className="accent-orange-500"
                  />
                  Show hidden items
                </label>
                <input
                  type="text"
                  placeholder="Search by title, channel, user..."
                  value={squareSearch}
                  onChange={e => setSquareSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') loadSquare(1, squareSearch) }}
                  className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-2 pl-8 text-xs focus:outline-none focus:border-orange-500 w-52"
                />
                <button onClick={() => loadSquare(1, squareSearch)} className="px-4 py-2 rounded-xl text-xs bg-[var(--overlay-subtle)] hover:bg-[var(--overlay-default)] transition-colors">Search</button>
              </div>
            </div>

            {squareLoading ? (
              <div className="py-20 text-center"><div className="animate-spin inline-block rounded-full h-8 w-8 border-t-2 border-orange-500" /></div>
            ) : squareItems.length === 0 ? (
              <div className="py-20 text-center text-gray-500">No items.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {squareItems.map(item => (
                  <div key={item.id} className={`rounded-2xl border p-4 flex flex-col gap-3 ${item.adminHidden ? 'border-red-500/20 bg-red-500/5' : 'border-[var(--border-default)] bg-[var(--bg-surface-2)]'}`}>
                    <div className="flex gap-3">
                      <img src={item.thumbnail} alt={item.title} className="w-24 h-14 object-cover rounded-lg shrink-0 bg-gray-800" />
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-xs font-bold line-clamp-2 leading-snug">{item.title}</p>
                        <p className="text-[10px] text-gray-500 mt-1">{item.channel} · {item.category}</p>
                        <p className="text-[10px] text-gray-600">{item.autoCollected ? '🤖 Auto-collected' : `👤 ${item.userDisplayName || 'Anonymous'}`}</p>
                      </div>
                    </div>
                    {item.adminHidden && (
                      <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full self-start">Hidden</span>
                    )}
                    <div className="flex gap-2 mt-auto">
                      <Link href={`/result/${item.sessionId}`} target="_blank" className="flex-1 py-1.5 rounded-xl text-center text-[11px] bg-[var(--overlay-subtle)] hover:bg-[var(--overlay-default)] text-gray-400 transition-colors">
                        👁️ View
                      </Link>
                      {item.adminHidden ? (
                        <button
                          onClick={() => handleSquareManage(item.id, 'show', item.title)}
                          disabled={squareManagingId === item.id}
                          className="flex-1 py-1.5 rounded-xl text-[11px] bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 transition-colors disabled:opacity-50"
                        >
                          ✅ Unhide
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSquareManage(item.id, 'hide', item.title)}
                          disabled={squareManagingId === item.id}
                          className="flex-1 py-1.5 rounded-xl text-[11px] bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 border border-yellow-500/20 transition-colors disabled:opacity-50"
                        >
                          🙈 Hide
                        </button>
                      )}
                      <button
                        onClick={() => handleSquareManage(item.id, 'delete', item.title)}
                        disabled={squareManagingId === item.id}
                        className="flex-1 py-1.5 rounded-xl text-[11px] bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 transition-colors disabled:opacity-50"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {squareTotal > SQUARE_PAGE_SIZE && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button onClick={() => loadSquare(squarePage - 1)} disabled={squarePage === 1 || squareLoading} className="px-4 py-2 rounded-xl text-xs bg-[var(--overlay-subtle)] hover:bg-[var(--overlay-default)] disabled:opacity-30 transition-colors">← Prev</button>
                <span className="text-xs text-gray-500">Page {squarePage} / {Math.ceil(squareTotal / SQUARE_PAGE_SIZE)}</span>
                <button onClick={() => loadSquare(squarePage + 1)} disabled={squarePage >= Math.ceil(squareTotal / SQUARE_PAGE_SIZE) || squareLoading} className="px-4 py-2 rounded-xl text-xs bg-[var(--overlay-subtle)] hover:bg-[var(--overlay-default)] disabled:opacity-30 transition-colors">Next →</button>
              </div>
            )}
          </div>
        )}

        {/* ── 회원 관리 탭 ── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* 회원 통계 */}
            {userStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'Total members', value: userStats.total, color: 'text-white' },
                  { label: 'General', value: userStats.general, color: 'text-gray-300' },
                  { label: 'Teachers', value: userStats.teachers, color: 'text-emerald-400' },
                  { label: 'Students', value: userStats.students, color: 'text-blue-400' },
                  { label: 'Paid members', value: userStats.paid, color: 'text-orange-400' },
                ].map(c => (
                  <div key={c.label} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] p-4 text-center">
                    <p className="text-gray-500 text-[10px] mb-1">{c.label}</p>
                    <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 필터 + 검색 */}
            <div className="bg-[var(--bg-surface)] rounded-[32px] border border-[var(--border-default)] p-6 shadow-2xl">
              <div className="flex flex-wrap gap-3 mb-5">
                <input
                  type="text"
                  placeholder="Search by name, email, school, class code..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') loadUsers(1, userRole, userPlan, userSearch) }}
                  className="flex-1 min-w-48 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-orange-500 transition-colors"
                />
                <select
                  value={userRole}
                  onChange={e => { setUserRole(e.target.value); loadUsers(1, e.target.value, userPlan, userSearch) }}
                  className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="all">All roles</option>
                  <option value="none">General</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
                <select
                  value={userPlan}
                  onChange={e => { setUserPlan(e.target.value); loadUsers(1, userRole, e.target.value, userSearch) }}
                  className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="all">All plans</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
                <button
                  onClick={() => loadUsers(1, userRole, userPlan, userSearch)}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Search
                </button>
              </div>

              {/* 회원 테이블 */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-gray-500 border-b border-[var(--border-subtle)]">
                    <tr>
                      <th className="pb-3 font-medium">Member</th>
                      <th className="pb-3 font-medium">Role</th>
                      <th className="pb-3 font-medium">Plan</th>
                      <th className="pb-3 font-medium">Class info</th>
                      <th className="pb-3 font-medium text-center">Tokens</th>
                      <th className="pb-3 font-medium">Joined</th>
                      <th className="pb-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {userLoading ? (
                      <tr><td colSpan={7} className="py-16 text-center text-gray-500">Loading...</td></tr>
                    ) : users.length === 0 ? (
                      <tr><td colSpan={7} className="py-16 text-center text-gray-500">No members found.</td></tr>
                    ) : users.map(u => {
                      const isIncomplete = !u.profileCompleted && !u.role
                      const isStudentEmail = (u.email || '').includes('@cls.ssoktube.com')
                      return (
                      <tr key={u.id} className={`hover:bg-white/[0.02] transition-colors ${isIncomplete ? 'opacity-60' : ''}`}>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            {u.photoURL
                              ? <img src={u.photoURL} className="w-7 h-7 rounded-full border border-[var(--border-default)] shrink-0 object-cover" alt="" />
                              : <div className="w-7 h-7 rounded-full bg-[var(--bg-elevated-2)] flex items-center justify-center text-sm shrink-0">{u.avatarEmoji || '👤'}</div>
                            }
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <p className={`font-semibold truncate max-w-[120px] ${!u.displayName && !u.studentName ? 'text-gray-500 italic' : 'text-white'}`}>
                                  {u.displayName || u.studentName || '(no name)'}
                                </p>
                                {isIncomplete && <span className="text-[8px] px-1 py-0.5 bg-yellow-500/15 text-yellow-500 rounded border border-yellow-500/20 shrink-0">Incomplete</span>}
                                {isStudentEmail && !u.role && <span className="text-[8px] px-1 py-0.5 bg-blue-500/15 text-blue-400 rounded border border-blue-500/20 shrink-0">Student?</span>}
                              </div>
                              <p className="text-gray-500 text-[9px] truncate max-w-[140px]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">{roleBadge(u.role)}</td>
                        <td className="py-3">{planBadge(u.plan)}</td>
                        <td className="py-3">
                          {u.role === 'teacher' && u.classCode && (
                            <div>
                              <p className="text-emerald-400 font-mono font-bold text-[10px]">{u.classCode}</p>
                              <p className="text-gray-500 text-[9px]">{u.schoolName} Grade {u.grade}, Class {u.classNum}</p>
                            </div>
                          )}
                          {u.role === 'student' && u.classCode && (
                            <div>
                              <p className="text-blue-400 font-mono text-[10px]">{u.classCode}</p>
                              <p className="text-gray-500 text-[9px]">{u.schoolName} Grade {u.grade}, Class {u.classNum}</p>
                            </div>
                          )}
                          {!u.classCode && <span className="text-gray-600 text-[9px]">-</span>}
                        </td>
                        <td className="py-3 text-center">
                          <span className="text-orange-400 font-bold">{u.tokens ?? 0}</span>
                        </td>
                        <td className="py-3 text-gray-500">
                          {u.createdAt || u.updatedAt ? formatRelativeDate(u.createdAt || u.updatedAt) : '-'}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => openEditUser(u)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] bg-[var(--overlay-subtle)] hover:bg-[var(--overlay-default)] text-gray-400 hover:text-white transition-colors"
                            title="Edit"
                          >✏️ Edit</button>
                        </td>
                      </tr>
                    )})}

                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {userTotal > 20 && (
                <div className="flex items-center justify-center gap-3 mt-5">
                  <button
                    onClick={() => loadUsers(userPage - 1)}
                    disabled={userPage === 1 || userLoading}
                    className="px-4 py-2 rounded-xl text-xs bg-[var(--overlay-subtle)] hover:bg-[var(--overlay-default)] disabled:opacity-30 transition-colors"
                  >← Prev</button>
                  <span className="text-xs text-gray-500">Page {userPage} / {userTotal} total</span>
                  <button
                    onClick={() => loadUsers(userPage + 1)}
                    disabled={userPage * 20 >= userTotal || userLoading}
                    className="px-4 py-2 rounded-xl text-xs bg-[var(--overlay-subtle)] hover:bg-[var(--overlay-default)] disabled:opacity-30 transition-colors"
                  >Next →</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── 회원 편집 모달 ── */}
      {editingUser && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
          <div className="relative w-full max-w-md bg-[var(--bg-base)] rounded-3xl border border-[var(--border-default)] shadow-2xl p-6">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white text-lg transition-colors"
            >✕</button>

            <div className="flex items-center gap-3 mb-5">
              {editingUser.photoURL
                ? <img src={editingUser.photoURL} className="w-10 h-10 rounded-full border border-[var(--border-default)] object-cover" alt="" />
                : <div className="w-10 h-10 rounded-full bg-[var(--bg-elevated-2)] flex items-center justify-center text-xl">{editingUser.avatarEmoji || '👤'}</div>
              }
              <div>
                <p className="font-bold text-white">{editingUser.displayName || editingUser.studentName || '(no name)'}</p>
                <p className="text-xs text-gray-500">{editingUser.email}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* 역할 */}
              <div>
                <label className="block text-gray-400 mb-1">Role</label>
                <select
                  value={editForm.role as string}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">General (no role)</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
              </div>

              {/* 플랜 */}
              <div>
                <label className="block text-gray-400 mb-1">Plan</label>
                <select
                  value={editForm.plan as string}
                  onChange={e => setEditForm(f => ({ ...f, plan: e.target.value }))}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              {/* 토큰 */}
              <div>
                <label className="block text-gray-400 mb-1">Tokens</label>
                <input
                  type="number"
                  value={editForm.tokens as number}
                  onChange={e => setEditForm(f => ({ ...f, tokens: Number(e.target.value) }))}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* 클래스 정보 구분선 */}
              <div className="pt-2 border-t border-[var(--border-subtle)]">
                <p className="text-gray-500 mb-2">Class info <span className="text-gray-600">(leave blank to remove)</span></p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 mb-1">Class code</label>
                    <input
                      type="text"
                      value={editForm.classCode as string}
                      onChange={e => setEditForm(f => ({ ...f, classCode: e.target.value }))}
                      placeholder="e.g., RCJ84V"
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">School name</label>
                    <input
                      type="text"
                      value={editForm.schoolName as string}
                      onChange={e => setEditForm(f => ({ ...f, schoolName: e.target.value }))}
                      placeholder="e.g., Jeju Elementary"
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Grade</label>
                    <input
                      type="number"
                      value={editForm.grade as string}
                      onChange={e => setEditForm(f => ({ ...f, grade: e.target.value }))}
                      placeholder="3"
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Class</label>
                    <input
                      type="number"
                      value={editForm.classNum as string}
                      onChange={e => setEditForm(f => ({ ...f, classNum: e.target.value }))}
                      placeholder="1"
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {editError && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{editError}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs bg-[var(--overlay-subtle)] hover:bg-[var(--overlay-default)] text-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUser}
                  disabled={editSaving}
                  className="flex-1 py-2.5 rounded-xl text-xs bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors disabled:opacity-50"
                >
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
