'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useRouter, useParams } from 'next/navigation'
import Header from '@/components/common/Header'
import Link from 'next/link'
import { formatRelativeDate } from '@/lib/formatDate'
import {
  getClass, getClassStudents, getClassLogs, summarizeStudentLogs,
  pushVideoToClass, buildQuizHeatmap,
  ClassRoom, ActivityLog, VideoHeatmap
} from '@/lib/classroom'
import { getUserFolders, getSavedSummariesByFolder } from '@/lib/db'
import { getBookmarks, VideoBookmark } from '@/lib/videoBookmark'
import { setDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { downloadPdf } from '@/lib/downloadPdf'
import QuizHeatmap from '@/components/classroom/QuizHeatmap'

interface StudentRow {
  uid: string
  studentName: string
  displayName: string
  loginCount: number
  metaComplete: number
  metaConfused: number
  metaUnknown: number
  quizAttempts: number
  quizCorrect: number
  lastActive: any
}

interface VideoRecord {
  videoId: string
  videoTitle: string
  watchDurationSec: number
  percentWatched: number
  completed: boolean
  meta: { complete: number; confused: number; unknown: number }
  quiz: { attempts: number; correct: number }
  quizByAttempt: Record<number, { correct: number; total: number }>
  comments: ActivityLog[]
  segments: ActivityLog[]
  lastSeen: any
  watchSessions: { startedAt?: string; stoppedAt?: string; durationSec: number; percent: number }[]
}

function buildVideoRecords(logs: ActivityLog[]): VideoRecord[] {
  const byVideo: Record<string, VideoRecord> = {}
  for (const log of logs) {
    if (!log.videoId) continue
    if (!byVideo[log.videoId]) {
      byVideo[log.videoId] = {
        videoId: log.videoId,
        videoTitle: log.videoTitle || '(제목 없음)',
        watchDurationSec: 0,
        percentWatched: 0,
        completed: false,
        meta: { complete: 0, confused: 0, unknown: 0 },
        quiz: { attempts: 0, correct: 0 },
        quizByAttempt: {},
        comments: [],
        segments: [],
        lastSeen: log.timestamp,
        watchSessions: [],
      }
    }
    const vr = byVideo[log.videoId]
    if (!vr.lastSeen && log.timestamp) vr.lastSeen = log.timestamp
    if (log.type === 'play_start') {
      vr.watchSessions.push({ startedAt: log.value.startedAt, durationSec: 0, percent: 0 })
    }
    if (log.type === 'play') {
      vr.watchDurationSec += log.value.durationSec || 0
      vr.percentWatched = Math.max(vr.percentWatched, log.value.percentWatched || 0)
      if (log.value.completed) vr.completed = true
      // 마지막 미완료 세션 업데이트 or 새 세션 추가
      const lastSession = vr.watchSessions[vr.watchSessions.length - 1]
      if (lastSession && !lastSession.stoppedAt) {
        lastSession.stoppedAt = log.value.stoppedAt
        lastSession.durationSec = log.value.durationSec || 0
        lastSession.percent = log.value.percentWatched || 0
      } else {
        vr.watchSessions.push({
          stoppedAt: log.value.stoppedAt,
          durationSec: log.value.durationSec || 0,
          percent: log.value.percentWatched || 0,
        })
      }
    }
    if (log.type === 'meta') {
      if (log.value.metaLevel === 'complete') vr.meta.complete++
      else if (log.value.metaLevel === 'confused') vr.meta.confused++
      else if (log.value.metaLevel === 'unknown') vr.meta.unknown++
    }
    if (log.type === 'quiz') {
      vr.quiz.attempts++
      if (log.value.correct) vr.quiz.correct++
      const att = log.value.attempt ?? 1
      if (!vr.quizByAttempt[att]) vr.quizByAttempt[att] = { correct: 0, total: 0 }
      vr.quizByAttempt[att].total++
      if (log.value.correct) vr.quizByAttempt[att].correct++
    }
    if (log.type === 'comment') vr.comments.push(log)
    if (log.type === 'segment') vr.segments.push(log)
  }
  return Object.values(byVideo).sort((a, b) => {
    const aT = a.lastSeen?.toMillis?.() ?? 0
    const bT = b.lastSeen?.toMillis?.() ?? 0
    return bT - aT
  })
}

function fmtDuration(sec: number): string {
  if (!sec) return '-'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}분 ${s}초` : `${s}초`
}

export default function ClassDashboard() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const classCode = (params.classCode as string)?.toUpperCase()

  const [classroom, setClassroom] = useState<ClassRoom | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'students' | 'folders' | 'heatmap' | 'setup'>('students')
  const [folders, setFolders] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null)
  const [studentLogs, setStudentLogs] = useState<ActivityLog[]>([])
  const [studentDetailTab, setStudentDetailTab] = useState<'videos' | 'bookmarks' | 'access' | 'review'>('videos')
  const [studentReviews, setStudentReviews] = useState<any[]>([])
  const [studentBookmarks, setStudentBookmarks] = useState<VideoBookmark[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [reportFolder, setReportFolder] = useState<{ id: string; name: string } | null>(null)
  const [reportNote, setReportNote] = useState('')
  const [savingReportNote, setSavingReportNote] = useState(false)
  const [pdfRef, setPdfRef] = useState<HTMLDivElement | null>(null)
  const [distributingFolder, setDistributingFolder] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [videoPickerFolder, setVideoPickerFolder] = useState<{ id: string; name: string } | null>(null)
  const [libraryVideos, setLibraryVideos] = useState<any[]>([])
  const [librarySearch, setLibrarySearch] = useState('')
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [movingVideo, setMovingVideo] = useState<string | null>(null)

  // 클립 배포 관련 상태
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null)
  const [folderVideos, setFolderVideos] = useState<Record<string, any[]>>({})
  const [loadingVideos, setLoadingVideos] = useState<string | null>(null)
  const [videoQuizSets, setVideoQuizSets] = useState<Record<string, any>>({})
  const [quizViewModal, setQuizViewModal] = useState<{ videoTitle: string; quiz: any } | null>(null)
  const [clipModal, setClipModal] = useState<{ item: any; folderId: string } | null>(null)
  const [clipStartStr, setClipStartStr] = useState('')
  const [clipEndStr, setClipEndStr] = useState('')
  const [pushingClip, setPushingClip] = useState(false)
  const [classLogs, setClassLogs] = useState<ActivityLog[]>([])
  const [heatmaps, setHeatmaps] = useState<VideoHeatmap[]>([])

  const loadData = useCallback(async () => {
    if (!user || !classCode) return
    setLoading(true)
    try {
      const [cls, studentList, userFolders] = await Promise.all([
        getClass(classCode),
        getClassStudents(classCode).catch(() => []),
        getUserFolders(user.uid).catch(() => []),
      ])

      if (!cls) {
        await new Promise(r => setTimeout(r, 1000))
        const retry = await getClass(classCode).catch(() => null)
        if (!retry || retry.teacherId !== user.uid) {
          router.push('/')
          return
        }
        setClassroom(retry)
        setFolders(userFolders)
        setStudents([])
        return
      }

      if (cls.teacherId !== user.uid) {
        router.push('/')
        return
      }

      setClassroom(cls)
      setFolders(userFolders)


      const logs = await getClassLogs(classCode, 1000).catch(() => [])
      setClassLogs(logs)
      setHeatmaps(buildQuizHeatmap(logs))

      const rows: StudentRow[] = studentList.map((s: any) => {
        const sLogs = logs.filter((l: ActivityLog) => l.studentId === s.uid)
        const summary = summarizeStudentLogs(sLogs)
        return {
          uid: s.uid,
          studentName: s.studentName || s.displayName || '미상',
          displayName: s.displayName || s.studentName || '미상',
          ...summary,
        }
      })

      rows.sort((a, b) => {
        const aT = a.lastActive?.toMillis?.() ?? 0
        const bT = b.lastActive?.toMillis?.() ?? 0
        return bT - aT
      })

      setStudents(rows)
    } catch (e) {
      console.error('[ClassDashboard] loadData error:', e)
    } finally {
      setLoading(false)
    }
  }, [user, classCode, router])

  useEffect(() => {
    if (!authLoading) loadData()
  }, [authLoading, loadData])

  const handleDistribute = async (folderId: string) => {
    if (!user) return
    setDistributingFolder(folderId)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/classroom/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ folderId, classCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const affected = new Set<string>(data.affectedIds || [folderId])
      setFolders(prev => prev.map(f => affected.has(f.id)
        ? { ...f, distributedClassCodes: [...new Set([...(f.distributedClassCodes || []), classCode])] }
        : f
      ))
    } catch (e: any) {
      alert('배포 중 오류: ' + e.message)
    } finally {
      setDistributingFolder(null)
    }
  }

  const handleRecall = async (folderId: string) => {
    if (!user) return
    const folder = folders.find(f => f.id === folderId)
    const childCount = folders.filter(f => f.parentId === folderId).length
    const msg = childCount > 0
      ? `이 폴더와 하위폴더 ${childCount}개를 회수하면 학생 화면에서 즉시 사라집니다. 계속하시겠습니까?`
      : '이 폴더를 회수하면 학생 화면에서 즉시 사라집니다. 계속하시겠습니까?'
    if (!confirm(msg)) return
    setDistributingFolder(folderId)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/classroom/recall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ folderId, classCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const affected = new Set<string>(data.affectedIds || [folderId])
      setFolders(prev => prev.map(f => affected.has(f.id)
        ? { ...f, distributedClassCodes: (f.distributedClassCodes || []).filter((c: string) => c !== classCode) }
        : f
      ))
    } catch (e: any) {
      alert('회수 중 오류: ' + e.message)
    } finally {
      setDistributingFolder(null)
    }
  }

  const handleCreateSubfolder = async (parentFolder: any) => {
    const name = prompt('하위폴더 이름을 입력하세요')
    if (!name?.trim() || !user) return
    const { createFolder } = await import('@/lib/db')
    const newFolder = await createFolder(user.uid, name.trim(), parentFolder.id, (parentFolder.depth || 0) + 1)
    const withCodes = { ...newFolder, distributedClassCodes: [] }
    setFolders(prev => [...prev, withCodes])
    // 부모가 이 클래스에 배포 중이면 새 하위폴더도 자동 배포
    if ((parentFolder.distributedClassCodes || []).includes(classCode)) {
      await handleDistribute(newFolder.id)
    }
  }

  const openVideoPickerForFolder = async (folder: { id: string; name: string }) => {
    setVideoPickerFolder(folder)
    setLibrarySearch('')
    if (!user) return
    setLoadingLibrary(true)
    try {
      const { getSavedSummariesByFolder } = await import('@/lib/db')
      const all = await getSavedSummariesByFolder(user.uid, 'all')
      setLibraryVideos(all)
    } finally {
      setLoadingLibrary(false)
    }
  }

  const handleMoveVideo = async (summaryId: string, targetFolderId: string) => {
    if (!user) return
    setMovingVideo(summaryId)
    try {
      const { moveVideoToFolder, getSavedSummariesByFolder } = await import('@/lib/db')
      await moveVideoToFolder(summaryId, targetFolderId)
      const updated = await getSavedSummariesByFolder(user.uid, targetFolderId)
      setFolderVideos(prev => ({ ...prev, [targetFolderId]: updated }))
      setLibraryVideos(prev => prev.filter(v => v.id !== summaryId))
    } catch (e: any) {
      alert('영상 추가 중 오류: ' + e.message)
    } finally {
      setMovingVideo(null)
    }
  }

  const openStudentDetail = async (student: StudentRow) => {
    setSelectedStudent(student)
    setStudentDetailTab('videos')
    setStudentLogs([])
    setStudentReviews([])
    setStudentBookmarks([])
    setLoadingLogs(true)
    try {
      const token = await user!.getIdToken()
      const [logs, reviewRes, bookmarkRes] = await Promise.all([
        getClassLogs(classCode, 1000),
        fetch(`/api/review-schedule?uid=${student.uid}`).then(r => r.json()).catch(() => ({ items: [] })),
        fetch(`/api/classroom/student-bookmarks?uid=${student.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()).catch(() => ({ bookmarks: [] })),
      ])
      setStudentLogs(logs.filter(l => l.studentId === student.uid))
      setStudentReviews(reviewRes.items || [])
      setStudentBookmarks(bookmarkRes.bookmarks || [])
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleSaveReportNote = async () => {
    if (!classCode || !reportFolder) return
    setSavingReportNote(true)
    try {
      await setDoc(doc(db, 'class_reports', `${classCode}_${reportFolder.id}`), { note: reportNote }, { merge: true })
    } catch (e) {
      console.error('Note save failed:', e)
    } finally {
      setSavingReportNote(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!pdfRef || !reportFolder) return
    const filename = `${classroom?.schoolName ?? ''}_${reportFolder.name}_수업보고서.pdf`
    await downloadPdf(pdfRef, filename)
  }

  const openFolderReport = async (folder: { id: string; name: string }) => {
    setReportFolder(folder)
    setReportNote('')
    try {
      const { getDoc, doc: fsDoc } = await import('firebase/firestore')
      const snap = await getDoc(fsDoc(db, 'class_reports', `${classCode}_${folder.id}`))
      if (snap.exists()) setReportNote(snap.data().note || '')
    } catch { /* 없으면 빈 문자열 */ }
    if (!folderVideos[folder.id] && user) {
      setLoadingVideos(folder.id)
      try {
        const items = await getSavedSummariesByFolder(user.uid, folder.id)
        setFolderVideos(prev => ({ ...prev, [folder.id]: items }))
      } finally {
        setLoadingVideos(null)
      }
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(classCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── 클립 배포 헬퍼 ────────────────────────────────────────────────────────────
  /** "M:SS" 또는 "H:MM:SS" 문자열 → 초 변환 */
  const parseTime = (str: string): number => {
    const s = str.trim()
    if (!s) return 0
    const parts = s.split(':').map(Number)
    if (parts.some(isNaN)) return 0
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0
  }
  /** 초 → "M:SS" */
  const fmtTimeSec = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

  const handleExpandFolder = async (folderId: string) => {
    if (expandedFolder === folderId) { setExpandedFolder(null); return }
    setExpandedFolder(folderId)
    if (folderVideos[folderId]) return
    if (!user) return
    setLoadingVideos(folderId)
    try {
      const items = await getSavedSummariesByFolder(user.uid, folderId)
      setFolderVideos(prev => ({ ...prev, [folderId]: items }))
      // 해당 영상들의 quiz_sets 로드
      const videoIds = items.map((v: any) => v.videoId).filter(Boolean)
      if (videoIds.length > 0) {
        const { getDoc, doc: fsDoc } = await import('firebase/firestore')
        const results = await Promise.all(
          videoIds.map((vid: string) => getDoc(fsDoc(db, 'quiz_sets', vid)))
        )
        const quizMap: Record<string, any> = {}
        results.forEach((snap, i) => {
          if (snap.exists()) quizMap[videoIds[i]] = snap.data()
        })
        setVideoQuizSets(prev => ({ ...prev, ...quizMap }))
      }
    } finally {
      setLoadingVideos(null)
    }
  }

  const openClipModal = (item: any, folderId: string) => {
    setClipModal({ item, folderId })
    setClipStartStr('')
    setClipEndStr('')
  }

  const handleClipPush = async () => {
    if (!clipModal || !classroom || !user) return
    setPushingClip(true)
    try {
      const start = parseTime(clipStartStr)
      const end   = parseTime(clipEndStr)
      if (end > 0 && end <= start) {
        alert('종료 시간이 시작 시간보다 커야 합니다.')
        return
      }
      await pushVideoToClass(
        classCode,
        clipModal.folderId,
        user.uid,
        userProfile?.displayName || '선생님',
        clipModal.item,
        start > 0 ? start : undefined,
        end   > 0 ? end   : undefined,
      )
      const rangeText = start > 0 || end > 0
        ? ` (${start > 0 ? fmtTimeSec(start) : '처음'} ~ ${end > 0 ? fmtTimeSec(end) : '끝'})`
        : ''
      alert(`"${clipModal.item.title}"${rangeText} 을(를) ${students.length}명에게 배포했습니다.`)
      setClipModal(null)
    } catch (e: any) {
      alert('배포 중 오류: ' + e.message)
    } finally {
      setPushingClip(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#1a1918] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
      </div>
    )
  }

  if (!classroom) return (
    <div className="min-h-screen bg-[#1a1918] flex flex-col items-center justify-center gap-3 text-center px-4">
      <p className="text-4xl">🏫</p>
      <p className="text-white font-bold">클래스를 불러올 수 없습니다.</p>
      <p className="text-gray-500 text-sm">클래스 코드 <span className="font-mono text-orange-400">{classCode}</span>가 존재하지 않거나 접근 권한이 없습니다.</p>
      <Link href="/mypage" className="mt-4 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition-colors">마이페이지로 이동</Link>
    </div>
  )

  const videoRecords = buildVideoRecords(studentLogs)

  // 로그인/로그아웃을 세션 쌍으로 묶기 (오래된 순 → 쌍 짓기 → 최신 순 정렬)
  const loginSessions = (() => {
    const sorted = [...studentLogs]
      .filter(l => l.type === 'login' || l.type === 'logout')
      .sort((a, b) => (a.timestamp?.toMillis?.() ?? 0) - (b.timestamp?.toMillis?.() ?? 0))
    const sessions: { loginLog: ActivityLog | null; logoutLog: ActivityLog | null }[] = []
    for (const log of sorted) {
      if (log.type === 'login') {
        sessions.push({ loginLog: log, logoutLog: null })
      } else {
        const last = sessions[sessions.length - 1]
        if (last && !last.logoutLog) {
          last.logoutLog = log
        } else {
          sessions.push({ loginLog: null, logoutLog: log })
        }
      }
    }
    return sessions.reverse()
  })()

  return (
    <div className="min-h-screen bg-[#1a1918] text-white">
      <Header title="🏫 클래스 대시보드" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 클래스 헤더 */}
        <div className="bg-gradient-to-br from-[#2a2826] to-[#1e1d1b] rounded-[28px] border border-white/5 p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">{classroom.schoolName} {classroom.grade}학년 {classroom.classNum}반</h1>
            <p className="text-gray-400 text-sm mt-1">{students.length}명 등록</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-[#1a1918] rounded-2xl px-5 py-3 border border-white/10">
              <p className="text-[10px] text-gray-500 mb-0.5">클래스 코드</p>
              <p className="text-xl font-black font-mono tracking-widest text-orange-400">{classCode}</p>
            </div>
            <button
              onClick={copyCode}
              className="px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-2xl text-orange-400 text-sm font-bold transition-colors"
            >
              {copied ? '복사됨 ✓' : '코드 복사'}
            </button>
          </div>
        </div>

        {/* 요약 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="등록 학생" value={students.length} unit="명" color="text-white" />
          <StatCard label="오늘 접속" value={students.filter(s => {
            const t = s.lastActive?.toMillis?.()
            return t && (Date.now() - t) < 86400000
          }).length} unit="명" color="text-emerald-400" />
          <StatCard label="완전이해 응답" value={students.reduce((a, s) => a + s.metaComplete, 0)} unit="건" color="text-blue-400" />
          <StatCard label="도움 필요" value={students.reduce((a, s) => a + s.metaUnknown, 0)} unit="건" color="text-red-400" />
        </div>

        {/* 탭 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['students', 'folders', 'heatmap', 'setup'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === tab ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >
              {tab === 'students' ? '👥 학생 현황'
                : tab === 'folders' ? '📁 수업자료 관리'
                : tab === 'heatmap' ? '🔥 퀴즈 히트맵'
                : '⚙️ 클래스 설정'}
            </button>
          ))}
        </div>

        {/* 학생 현황 탭 */}
        {activeTab === 'students' && (
          <div className="bg-[#23211f] rounded-[28px] border border-white/10 p-6">
            {students.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-4xl mb-3">👥</p>
                <p className="text-gray-400">아직 참여한 학생이 없습니다.</p>
                <p className="text-gray-600 text-sm mt-1">클래스 코드 <span className="font-mono text-orange-400">{classCode}</span>를 학생들에게 공유하세요.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-gray-500 border-b border-white/5">
                    <tr>
                      <th className="pb-3 font-medium">이름</th>
                      <th className="pb-3 font-medium text-center">접속</th>
                      <th className="pb-3 font-medium text-center">✅완전이해</th>
                      <th className="pb-3 font-medium text-center">🤔알쏭달쏭</th>
                      <th className="pb-3 font-medium text-center">❓전혀모름</th>
                      <th className="pb-3 font-medium text-center">퀴즈정답률</th>
                      <th className="pb-3 font-medium">마지막 활동</th>
                      <th className="pb-3 font-medium text-right">상세</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {students.map(s => (
                      <tr key={s.uid} className="hover:bg-white/[0.02]">
                        <td className="py-3 font-bold text-white">{s.studentName}</td>
                        <td className="py-3 text-center text-gray-300">{s.loginCount}</td>
                        <td className="py-3 text-center text-emerald-400 font-bold">{s.metaComplete}</td>
                        <td className="py-3 text-center text-yellow-400 font-bold">{s.metaConfused}</td>
                        <td className="py-3 text-center text-red-400 font-bold">{s.metaUnknown}</td>
                        <td className="py-3 text-center">
                          {s.quizAttempts > 0
                            ? <span className="text-blue-400">{Math.round(s.quizCorrect / s.quizAttempts * 100)}%</span>
                            : <span className="text-gray-600">-</span>}
                        </td>
                        <td className="py-3 text-gray-500">
                          {s.lastActive ? formatRelativeDate(s.lastActive?.toDate?.() || s.lastActive) : '없음'}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => openStudentDetail(s)}
                            className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-400"
                          >
                            상세보기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 수업자료 관리 탭 */}
        {activeTab === 'folders' && (() => {
          const rootFolders = folders.filter(f => !f.parentId)
          const getChildren = (pid: string) => folders.filter(f => f.parentId === pid)
          const distributedCount = folders.filter(f => (f.distributedClassCodes || []).includes(classCode)).length

          const renderFolder = (folder: any, depth: number = 0): React.ReactNode => {
            const isDistributed = (folder.distributedClassCodes || []).includes(classCode)
            const isExpanded = expandedFolder === folder.id
            const videos = folderVideos[folder.id] || []
            const isBusy = distributingFolder === folder.id
            const children = getChildren(folder.id)

            return (
              <div key={folder.id}>
                <div className={`rounded-2xl border transition-colors ${isDistributed ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-[#1a1918] border-white/5'}`}>
                  <div className="flex items-center justify-between px-4 py-3 gap-2">
                    <button className="flex items-center gap-2 flex-1 text-left min-w-0" onClick={() => handleExpandFolder(folder.id)}>
                      <span className="text-base shrink-0">{isExpanded ? '📂' : '📁'}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{folder.name}</p>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {isDistributed && <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full">✓ 배포 중</span>}
                          {children.length > 0 && <span className="text-[9px] text-gray-600">하위 {children.length}개</span>}
                        </div>
                      </div>
                      <span className="text-[9px] text-gray-600 shrink-0 ml-1">{isExpanded ? '▲' : '▼'}</span>
                    </button>
                    <div className="flex gap-1.5 flex-wrap justify-end shrink-0">
                      <button
                        onClick={() => handleCreateSubfolder(folder)}
                        className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        title="하위폴더 만들기"
                      >
                        📁+
                      </button>
                      <button
                        onClick={() => openVideoPickerForFolder({ id: folder.id, name: folder.name })}
                        className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors"
                        title="영상 추가"
                      >
                        🎬+
                      </button>
                      <button
                        onClick={() => openFolderReport({ id: folder.id, name: folder.name })}
                        className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
                      >
                        📋
                      </button>
                      {isDistributed ? (
                        <button onClick={() => handleRecall(folder.id)} disabled={isBusy}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors">
                          {isBusy ? '...' : '회수'}
                        </button>
                      ) : (
                        <button onClick={() => handleDistribute(folder.id)} disabled={isBusy}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors">
                          {isBusy ? '...' : '배포'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 영상 목록 */}
                  {isExpanded && (
                    <div className="border-t border-white/5 px-4 pb-3 pt-2 space-y-2">
                      {loadingVideos === folder.id ? (
                        <p className="text-xs text-gray-500 py-2">불러오는 중...</p>
                      ) : videos.length === 0 ? (
                        <p className="text-xs text-gray-500 py-2">영상이 없습니다. 🎬+ 버튼으로 추가하세요.</p>
                      ) : videos.map((item: any) => {
                        const hasQuiz = item.videoId && videoQuizSets[item.videoId]
                        return (
                          <div key={item.id} className="flex items-center gap-3 rounded-xl bg-[#23211f] px-3 py-2.5">
                            {item.thumbnail && <img src={item.thumbnail} alt="" className="w-14 h-8 rounded object-cover shrink-0" />}
                            <p className="flex-1 text-xs text-gray-200 truncate">{item.title}</p>
                            {hasQuiz && (
                              <button
                                onClick={() => setQuizViewModal({ videoTitle: item.title, quiz: videoQuizSets[item.videoId] })}
                                className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors"
                                title="등록된 퀴즈 보기"
                              >
                                📝 퀴즈
                              </button>
                            )}
                            <button onClick={() => openClipModal(item, folder.id)}
                              className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                              🎬 구간 배포
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 하위폴더 */}
                {children.length > 0 && (
                  <div className="ml-5 mt-1.5 mb-2 border-l-2 border-white/10 pl-3 space-y-1.5">
                    {children.map(child => renderFolder(child, depth + 1))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <div className="bg-[#23211f] rounded-[28px] border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-400">
                  <span className="text-emerald-400 font-bold">배포</span>를 누르면 학생 화면에 폴더와 영상이 실시간으로 보입니다.
                  <span className="text-red-400 font-bold ml-1">회수</span>하면 즉시 사라집니다.
                </p>
                <button
                  onClick={async () => {
                    const name = prompt('새 수업 폴더 이름을 입력하세요')
                    if (!name?.trim() || !user) return
                    const { createFolder } = await import('@/lib/db')
                    const newFolder = await createFolder(user.uid, name.trim())
                    setFolders(prev => [...prev, { ...newFolder, distributedClassCodes: [] }])
                  }}
                  className="shrink-0 ml-4 flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  ＋ 새 수업 만들기
                </button>
              </div>
              {distributedCount > 0 && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-4 py-3 mb-4 text-xs text-emerald-300">
                  현재 배포 중 <span className="font-bold text-emerald-400">{distributedCount}개</span> 폴더
                </div>
              )}
              {rootFolders.length === 0 ? (
                <p className="text-gray-500 text-sm">폴더가 없습니다. 위의 "새 수업 만들기" 버튼으로 수업을 시작하세요.</p>
              ) : (
                <div className="space-y-2">
                  {rootFolders.map(folder => renderFolder(folder))}
                </div>
              )}
            </div>
          )
        })()}

        {/* 히트맵 탭 */}
        {activeTab === 'heatmap' && (
          <div className="bg-[#23211f] rounded-[28px] border border-white/10 p-6">
            <div className="mb-5">
              <h2 className="font-black text-base">🔥 퀴즈 오답 히트맵</h2>
              <p className="text-xs text-gray-400 mt-1">
                오답률이 높은 구간을 한눈에 파악하고, 다음 수업에서 집중 보충하세요.
                <span className="text-red-400 font-bold ml-1">빨간색</span> = 오답 60% 이상 → 수업 개입 필요
              </p>
            </div>
            <QuizHeatmap
              heatmaps={heatmaps}
              folders={folders.map(f => ({ id: f.id, name: f.name, depth: f.depth, parentId: f.parentId }))}
              folderVideos={Object.fromEntries(
                Object.entries(folderVideos).map(([fid, videos]) => [
                  fid,
                  videos.map((v: any) => ({ videoId: v.videoId, sessionId: v.sessionId, title: v.title }))
                ])
              )}
            />
          </div>
        )}

        {/* 설정 탭 */}
        {activeTab === 'setup' && (
          <div className="bg-[#23211f] rounded-[28px] border border-white/10 p-6 space-y-4">
            <InfoRow label="학교명" value={classroom.schoolName} />
            <InfoRow label="학년/반" value={`${classroom.grade}학년 ${classroom.classNum}반`} />
            <InfoRow label="클래스 코드" value={classCode} highlight />
            <InfoRow label="학생 참여 링크" value={`ssoktube.com/classroom/join?code=${classCode}`} />
            <div className="pt-4 space-y-2">
              <p className="text-xs text-gray-500">아래 링크를 학생들에게 공유하면 클래스 코드가 자동으로 입력됩니다.</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://ssoktube.com/classroom/join?code=${classCode}`)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl transition-colors"
              >
                {copied ? '복사됨 ✓' : '🔗 참여 링크 복사'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 영상 추가 피커 모달 */}
      {videoPickerFolder && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setVideoPickerFolder(null)}>
          <div className="bg-[#23211f] rounded-[28px] border border-white/10 w-full max-w-lg p-6 space-y-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-black">🎬 영상 추가</h3>
                <p className="text-xs text-gray-400 mt-0.5">폴더: {videoPickerFolder.name}</p>
              </div>
              <button onClick={() => setVideoPickerFolder(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <input
              type="text"
              placeholder="영상 제목 검색..."
              value={librarySearch}
              onChange={e => setLibrarySearch(e.target.value)}
              className="shrink-0 w-full px-4 py-2.5 rounded-xl bg-[#1a1918] border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50"
            />
            <div className="overflow-y-auto flex-1 space-y-2">
              {loadingLibrary ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" /></div>
              ) : (() => {
                const filtered = libraryVideos.filter(v =>
                  v.folderId !== videoPickerFolder.id &&
                  (v.title || '').toLowerCase().includes(librarySearch.toLowerCase())
                )
                return filtered.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-8">추가할 수 있는 영상이 없습니다.</p>
                ) : filtered.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 bg-[#2a2826] rounded-xl px-3 py-2.5">
                    {v.thumbnail && <img src={v.thumbnail} alt="" className="w-14 h-8 rounded object-cover shrink-0" />}
                    <p className="flex-1 text-xs text-gray-200 truncate">{v.title}</p>
                    <button
                      onClick={() => handleMoveVideo(v.id, videoPickerFolder.id)}
                      disabled={movingVideo === v.id}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                    >
                      {movingVideo === v.id ? '...' : '추가'}
                    </button>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 퀴즈 내용 보기 모달 */}
      {quizViewModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setQuizViewModal(null)}>
          <div className="bg-[#23211f] rounded-[28px] border border-white/10 w-full max-w-md p-6 space-y-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between shrink-0">
              <div>
                <h3 className="text-base font-black">📝 등록된 퀴즈</h3>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{quizViewModal.videoTitle}</p>
              </div>
              <button onClick={() => setQuizViewModal(null)} className="text-gray-400 hover:text-white text-xl ml-4 shrink-0">✕</button>
            </div>
            <div className="overflow-y-auto space-y-3 flex-1">
              {(quizViewModal.quiz.questions || []).map((q: any, i: number) => (
                <div key={i} className="bg-[#2a2826] rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-bold text-white">Q{i + 1}. {q.question}</p>
                  {q.type === 'multiple_choice' && q.options ? (
                    <div className="space-y-1">
                      {q.options.map((opt: string, j: number) => (
                        <p key={j} className={`text-xs px-3 py-1.5 rounded-lg ${opt === q.answer ? 'bg-emerald-500/15 text-emerald-300 font-bold' : 'text-gray-400'}`}>
                          {['A', 'B', 'C', 'D'][j]}. {opt}
                          {opt === q.answer && <span className="ml-2">✓ 정답</span>}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg">정답: {q.answer}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 클립 배포 모달 */}
      {clipModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setClipModal(null)}>
          <div className="bg-[#23211f] rounded-[28px] border border-white/10 w-full max-w-sm p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-base font-black">🎬 구간 배포 설정</h3>
              <p className="text-xs text-gray-400 mt-1 truncate">"{clipModal.item.title}"</p>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-4 py-3 text-xs text-emerald-300 space-y-0.5">
              <p className="font-bold">시간을 비워두면 전체 영상이 배포됩니다.</p>
              <p className="text-emerald-400/70">시작 시간만 설정하면 그 지점부터 끝까지 재생됩니다.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-400 mb-1 block">시작 시간 (M:SS)</label>
                <input
                  type="text"
                  placeholder="예: 2:30"
                  value={clipStartStr}
                  onChange={e => setClipStartStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1a1918] border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 mb-1 block">종료 시간 (M:SS)</label>
                <input
                  type="text"
                  placeholder="예: 5:45"
                  value={clipEndStr}
                  onChange={e => setClipEndStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1a1918] border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
            {clipStartStr && clipEndStr && parseTime(clipStartStr) > 0 && parseTime(clipEndStr) > 0 && (
              <p className="text-xs text-emerald-400 text-center">
                {fmtTimeSec(parseTime(clipStartStr))} ~ {fmtTimeSec(parseTime(clipEndStr))} 구간 배포
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setClipModal(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 text-gray-400 text-sm font-bold hover:bg-white/10">
                취소
              </button>
              <button
                onClick={handleClipPush}
                disabled={pushingClip}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50 transition-colors"
              >
                {pushingClip ? '배포 중...' : `${students.length}명에게 배포`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 폴더별 보고서 모달 */}
      {reportFolder && (() => {
        const folderVideoIds = new Set((folderVideos[reportFolder.id] || []).map((v: any) => v.videoId))
        const folderLogs = classLogs.filter(l => l.videoId && folderVideoIds.has(l.videoId))
        const folderHeatmaps = buildQuizHeatmap(folderLogs)

        const studentRows = students.map(s => {
          const sLogs = folderLogs.filter(l => l.studentId === s.uid)
          const summary = summarizeStudentLogs(sLogs)
          return { ...s, ...summary }
        })

        const totalStudents = students.length
        const totalComplete = studentRows.reduce((a, s) => a + s.metaComplete, 0)
        const totalQuizAttempts = studentRows.reduce((a, s) => a + s.quizAttempts, 0)
        const totalUnknown = studentRows.reduce((a, s) => a + s.metaUnknown, 0)

        return (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setReportFolder(null)}>
            <div className="bg-[#1a1918] rounded-[28px] border border-white/10 w-full max-w-4xl my-8" onClick={e => e.stopPropagation()}>
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
                <div>
                  <h2 className="text-lg font-black">📋 수업 보고서</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{reportFolder.name} · {classroom?.schoolName} {classroom?.grade}학년 {classroom?.classNum}반</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadPdf}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    📥 PDF
                  </button>
                  <button onClick={() => setReportFolder(null)} className="text-gray-400 hover:text-white text-xl leading-none px-2">✕</button>
                </div>
              </div>

              {/* PDF 캡처 영역 */}
              <div ref={el => setPdfRef(el)} className="p-6 space-y-6" style={{ background: '#ffffff', color: '#111827', fontFamily: 'sans-serif' }}>
                {/* 보고서 헤더 */}
                <div style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '16px' }}>
                  <h1 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '4px' }}>수업 활동 보고서 — {reportFolder.name}</h1>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{classroom?.schoolName} {classroom?.grade}학년 {classroom?.classNum}반 · {new Date().toLocaleDateString('ko-KR')}</p>
                </div>

                {/* 요약 통계 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
                  {[
                    { label: '등록 학생', value: totalStudents, unit: '명', color: '#111827' },
                    { label: '완전이해', value: totalComplete, unit: '건', color: '#059669' },
                    { label: '퀴즈 응시', value: totalQuizAttempts, unit: '회', color: '#2563eb' },
                    { label: '도움 필요', value: totalUnknown, unit: '건', color: '#dc2626' },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: '#f9fafb', borderRadius: '10px', padding: '12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                      <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>{stat.label}</p>
                      <p style={{ fontSize: '22px', fontWeight: 900, color: stat.color, margin: 0 }}>{stat.value}<span style={{ fontSize: '11px', fontWeight: 400, color: '#9ca3af', marginLeft: '2px' }}>{stat.unit}</span></p>
                    </div>
                  ))}
                </div>

                {/* 이 수업 영상 목록 */}
                {(folderVideos[reportFolder.id] || []).length > 0 && (
                  <div>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>📹 수업 영상</h2>
                    {(folderVideos[reportFolder.id] || []).map((v: any) => {
                      const vLogs = folderLogs.filter(l => l.videoId === v.videoId)
                      const viewers = new Set(vLogs.filter(l => l.type === 'play').map(l => l.studentId)).size
                      const plays = vLogs.filter(l => l.type === 'play')
                      const avgPct = plays.length ? Math.round(plays.reduce((a, l) => a + (l.value.percentWatched || 0), 0) / plays.length) : 0
                      return (
                        <div key={v.videoId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: '#f9fafb', borderRadius: '10px', marginBottom: '6px', border: '1px solid #e5e7eb' }}>
                          {v.thumbnail && <img src={v.thumbnail} alt="" style={{ width: '72px', height: '42px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</p>
                            <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>시청 학생: {viewers}명 · 평균 시청률: {avgPct}%</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 학생별 현황 */}
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>👥 학생별 참여 현황</h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        {['이름', '완전이해', '알쏭달쏭', '전혀모름', '퀴즈 정답률'].map(h => (
                          <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {studentRows.map((s, i) => (
                        <tr key={s.uid} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                          <td style={{ padding: '7px 10px', fontWeight: 600, borderBottom: '1px solid #f3f4f6' }}>{s.studentName}</td>
                          <td style={{ padding: '7px 10px', color: '#059669', fontWeight: 700, borderBottom: '1px solid #f3f4f6' }}>{s.metaComplete}</td>
                          <td style={{ padding: '7px 10px', color: '#d97706', fontWeight: 700, borderBottom: '1px solid #f3f4f6' }}>{s.metaConfused}</td>
                          <td style={{ padding: '7px 10px', color: '#dc2626', fontWeight: 700, borderBottom: '1px solid #f3f4f6' }}>{s.metaUnknown}</td>
                          <td style={{ padding: '7px 10px', color: '#2563eb', fontWeight: 700, borderBottom: '1px solid #f3f4f6' }}>
                            {s.quizAttempts > 0 ? `${Math.round(s.quizCorrect / s.quizAttempts * 100)}%` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 퀴즈 오답 히트맵 */}
                {folderHeatmaps.length > 0 && (
                  <div>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>🔥 퀴즈 오답 현황</h2>
                    {folderHeatmaps.map(hm => (
                      <div key={hm.videoId} style={{ marginBottom: '10px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>{hm.videoTitle}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {hm.questions.map(q => (
                            <span key={q.questionIdx} style={{
                              padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                              background: q.wrongRate >= 0.6 ? '#fef2f2' : q.wrongRate >= 0.3 ? '#fff7ed' : '#f0fdf4',
                              color: q.wrongRate >= 0.6 ? '#dc2626' : q.wrongRate >= 0.3 ? '#d97706' : '#059669',
                              border: `1px solid ${q.wrongRate >= 0.6 ? '#fecaca' : q.wrongRate >= 0.3 ? '#fed7aa' : '#bbf7d0'}`,
                            }}>
                              Q{q.questionIdx + 1} 오답률 {Math.round(q.wrongRate * 100)}%
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 선생님 코멘트 */}
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>📝 선생님 종합 코멘트</h2>
                  <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px', minHeight: '60px' }}>
                    <p style={{ fontSize: '12px', color: reportNote ? '#111827' : '#9ca3af', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                      {reportNote || '(작성된 코멘트 없음)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 코멘트 입력 (PDF 외부) */}
              <div className="px-6 pb-6 pt-4 border-t border-white/5 space-y-3">
                <p className="text-xs text-gray-400">📝 선생님 코멘트를 입력하면 보고서에 포함됩니다.</p>
                <textarea
                  value={reportNote}
                  onChange={e => setReportNote(e.target.value)}
                  placeholder="수업 관찰, 학생 피드백 요약, 다음 수업 계획 등을 자유롭게 작성하세요."
                  rows={4}
                  className="w-full px-4 py-3 rounded-2xl bg-[#23211f] border border-white/10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveReportNote}
                    disabled={savingReportNote}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    {savingReportNote ? '저장 중...' : '💾 저장'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 학생 상세 모달 */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
          <div
            className="bg-[#23211f] rounded-[28px] border border-white/10 w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5 shrink-0">
              <div>
                <h2 className="text-lg font-black">{selectedStudent.studentName}</h2>
                <p className="text-xs text-gray-500 mt-0.5">학생 활동 상세 기록</p>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
            </div>

            {/* 요약 카드 */}
            <div className="grid grid-cols-4 gap-2 px-6 py-4 shrink-0">
              <MiniStat label="접속 횟수" value={selectedStudent.loginCount} unit="회" color="text-white" />
              <MiniStat label="✅ 완전이해" value={selectedStudent.metaComplete} unit="건" color="text-emerald-400" />
              <MiniStat label="퀴즈 정답" value={selectedStudent.quizAttempts > 0 ? Math.round(selectedStudent.quizCorrect / selectedStudent.quizAttempts * 100) : 0} unit="%" color="text-blue-400" />
              <MiniStat label="❓ 모름" value={selectedStudent.metaUnknown} unit="건" color="text-red-400" />
            </div>

            {/* 탭 */}
            <div className="flex gap-2 px-6 pb-3 shrink-0 flex-wrap">
              <button
                onClick={() => setStudentDetailTab('videos')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${studentDetailTab === 'videos' ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                🎬 영상별 기록
              </button>
              <button
                onClick={() => setStudentDetailTab('bookmarks')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${studentDetailTab === 'bookmarks' ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                🔖 북마크 {studentBookmarks.length > 0 && <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">{studentBookmarks.length}</span>}
              </button>
              <button
                onClick={() => setStudentDetailTab('review')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${studentDetailTab === 'review' ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                🔁 복습 현황
              </button>
              <button
                onClick={() => setStudentDetailTab('access')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${studentDetailTab === 'access' ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                🔐 접속 기록
              </button>
            </div>

            {/* 탭 콘텐츠 */}
            <div className="overflow-y-auto flex-1 px-6 pb-6">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500" />
                </div>
              ) : studentDetailTab === 'videos' ? (
                videoRecords.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-12">영상 시청 기록이 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    {videoRecords.map(vr => (
                      <div key={vr.videoId} className="bg-[#1a1918] rounded-2xl p-4 border border-white/5">
                        {/* 영상 제목 + 완료 뱃지 */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <p className="text-sm font-bold text-white leading-snug flex-1">{vr.videoTitle}</p>
                          {vr.completed && (
                            <span className="shrink-0 text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full">완료</span>
                          )}
                        </div>

                        {/* 시청 진행률 바 */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                            <span>시청률</span>
                            <span className="text-white font-bold">{vr.percentWatched}% · {fmtDuration(vr.watchDurationSec)}</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${Math.min(vr.percentWatched, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* 시청 세션 타임라인 */}
                        {vr.watchSessions.length > 0 && (
                          <div className="mb-3 space-y-0.5">
                            {vr.watchSessions.slice(-4).map((s, si) => {
                              const fmt = (iso?: string) => {
                                if (!iso) return '?'
                                const d = new Date(iso)
                                return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                              }
                              return (
                                <div key={si} className="flex items-center gap-1.5 text-[9px] text-gray-500">
                                  <span className="text-orange-400">▶ {fmt(s.startedAt)}</span>
                                  {s.stoppedAt && <>
                                    <span>→</span>
                                    <span>⏸ {fmt(s.stoppedAt)}</span>
                                    <span className="text-gray-600">({fmtDuration(s.durationSec)} · {s.percent}%)</span>
                                  </>}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* 자기점검 + 퀴즈 */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-black/20 rounded-xl p-2.5">
                            <p className="text-[9px] text-gray-500 mb-1.5">자기점검</p>
                            <div className="flex gap-2 text-[10px]">
                              <span className="text-emerald-400">✅ {vr.meta.complete}</span>
                              <span className="text-yellow-400">🤔 {vr.meta.confused}</span>
                              <span className="text-red-400">❓ {vr.meta.unknown}</span>
                            </div>
                          </div>
                          <div className="bg-black/20 rounded-xl p-2.5">
                            <p className="text-[9px] text-gray-500 mb-1.5">퀴즈</p>
                            {vr.quiz.attempts > 0 ? (
                              <div className="space-y-0.5">
                                {Object.entries(vr.quizByAttempt)
                                  .sort(([a], [b]) => Number(a) - Number(b))
                                  .map(([att, res]) => (
                                    <p key={att} className="text-[10px]">
                                      <span className="text-gray-500 mr-1">{att}차</span>
                                      <span className="text-blue-400 font-bold">{Math.round(res.correct / res.total * 100)}%</span>
                                      <span className="text-gray-600 ml-1">({res.correct}/{res.total})</span>
                                    </p>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-gray-600">미응시</p>
                            )}
                          </div>
                        </div>

                        {/* 댓글 / 세그먼트 코멘트 */}
                        {(vr.comments.length > 0 || vr.segments.length > 0) && (
                          <div className="space-y-1 mt-1">
                            {vr.segments.map((seg, i) => (
                              <div key={i} className="bg-purple-500/5 border border-purple-500/15 rounded-xl px-3 py-2 text-[10px]">
                                <span className="text-purple-400 font-bold mr-2">구간 코멘트</span>
                                <span className="text-gray-300">{seg.value.text || ''}</span>
                                {seg.value.timeLabel && <span className="text-gray-600 ml-2">[{seg.value.timeLabel}]</span>}
                              </div>
                            ))}
                            {vr.comments.map((c, i) => (
                              <div key={i} className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-3 py-2 text-[10px]">
                                <span className="text-blue-400 font-bold mr-2">댓글</span>
                                <span className="text-gray-300">{c.value.text || ''}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : studentDetailTab === 'bookmarks' ? (
                studentBookmarks.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-12">북마크가 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {studentBookmarks.map(bm => (
                      <div key={bm.id} className="bg-[#1a1918] rounded-2xl p-4 border border-white/5">
                        <div className="flex items-start gap-3">
                          {bm.thumbnail && (
                            <img src={bm.thumbnail} alt="" className="w-16 h-10 rounded-lg object-cover shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400 truncate mb-1">{bm.videoTitle}</p>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[10px] bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded-full">⏱ {bm.timestampLabel}</span>
                              <span className="text-[10px] text-gray-600">{bm.channel}</span>
                            </div>
                            {bm.memo && (
                              <p className="text-xs text-gray-300 leading-relaxed">{bm.memo}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : studentDetailTab === 'review' ? (
                /* 복습 현황 탭 */
                studentReviews.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-12">복습 대기 항목이 없습니다.<br/><span className="text-xs text-gray-700">퀴즈 오답 발생 시 자동으로 복습 일정이 등록됩니다.</span></p>
                ) : (
                  <div className="space-y-2">
                    {studentReviews.map((item, i) => {
                      const isOverdue = item.nextReviewDate <= new Date().toISOString().slice(0, 10)
                      return (
                        <div key={i} className={`flex items-start gap-3 rounded-xl px-4 py-3 text-xs ${isOverdue ? 'bg-red-500/10 border border-red-500/20' : 'bg-[#1a1918]'}`}>
                          <span className="text-lg">{isOverdue ? '🔴' : '🔵'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-300 font-medium truncate">{item.videoTitle || '영상'}</p>
                            {item.question && <p className="text-gray-500 truncate mt-0.5">Q{item.questionIdx + 1}. {item.question}</p>}
                            <p className={`mt-0.5 font-bold ${isOverdue ? 'text-red-400' : 'text-blue-400'}`}>
                              {isOverdue ? `복습 필요 (${item.nextReviewDate})` : `다음 복습: ${item.nextReviewDate}`}
                            </p>
                          </div>
                          <span className="text-[10px] text-gray-600 shrink-0">
                            {['1일', '3일', '7일', '14일', '30일', '60일'][item.repetition ?? 0] ?? ''} 주기
                          </span>
                        </div>
                      )
                    })}
                    <p className="text-[10px] text-gray-600 text-center pt-2">
                      🔴 오늘 이전 = 복습 필요 · 🔵 미래 일정 = 예약됨
                    </p>
                  </div>
                )
              ) : (
                /* 접속 기록 탭 */
                loginSessions.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-12">접속 기록이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {loginSessions.map((session, i) => {
                      const loginTs = session.loginLog?.timestamp
                      const logoutTs = session.logoutLog?.timestamp
                      const device = session.loginLog?.value?.device
                      const fmtTime = (ts: any) => {
                        if (!ts) return null
                        const d = ts?.toDate?.() || new Date(ts)
                        return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                      }
                      const fmtDate = (ts: any) => {
                        if (!ts) return null
                        return formatRelativeDate(ts?.toDate?.() || ts)
                      }
                      return (
                        <div key={i} className="bg-[#1a1918] rounded-xl px-4 py-3 text-xs border border-white/5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-gray-400 font-medium">{fmtDate(loginTs || logoutTs)}</span>
                            {device && <span className="text-[10px] text-gray-600">{device}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-green-400 font-bold">
                              🔐 {loginTs ? fmtTime(loginTs) : '기록 없음'}
                            </span>
                            <span className="text-gray-600">→</span>
                            <span className={logoutTs ? 'text-gray-400' : 'text-yellow-600'}>
                              🚪 {logoutTs ? fmtTime(logoutTs) : '로그아웃 미기록'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="bg-[#23211f] rounded-[20px] border border-white/5 p-4">
      <p className="text-gray-500 text-[10px] mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value} <span className="text-[10px] font-normal text-gray-600">{unit}</span></p>
    </div>
  )
}

function MiniStat({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="bg-[#1a1918] rounded-2xl p-3 text-center">
      <p className="text-gray-500 text-[9px] mb-1">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value}<span className="text-[9px] font-normal text-gray-600 ml-0.5">{unit}</span></p>
    </div>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-sm font-bold ${highlight ? 'font-mono text-orange-400 text-lg tracking-widest' : 'text-white'}`}>{value}</span>
    </div>
  )
}
