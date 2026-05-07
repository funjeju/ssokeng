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
        videoTitle: log.videoTitle || '(Untitled)',
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
  return m > 0 ? `${m}m ${s}s` : `${s}s`
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
  const [cleaningUp, setCleaningUp] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<{ deleted: number; deletedItems: number } | null>(null)
  const [videoPickerFolder, setVideoPickerFolder] = useState<{ id: string; name: string } | null>(null)
  const [libraryVideos, setLibraryVideos] = useState<any[]>([])
  const [librarySearch, setLibrarySearch] = useState('')
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [movingVideo, setMovingVideo] = useState<string | null>(null)

  const [resetTarget, setResetTarget] = useState<StudentRow | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  const handleResetPassword = async () => {
    if (!resetTarget || !resetPassword.trim() || !user) return
    if (resetPassword.trim().length < 4) {
      alert('Password must be at least 4 characters.')
      return
    }
    setResetting(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/classroom/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentUid: resetTarget.uid, newPassword: resetPassword.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResetDone(true)
    } catch (e: any) {
      alert('Failed to change password: ' + e.message)
    } finally {
      setResetting(false)
    }
  }

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
          studentName: s.studentName || s.displayName || 'Unknown',
          displayName: s.displayName || s.studentName || 'Unknown',
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
      alert('Failed to distribute: ' + e.message)
    } finally {
      setDistributingFolder(null)
    }
  }

  const handleRecall = async (folderId: string) => {
    if (!user) return
    const childCount = folders.filter(f => f.parentId === folderId).length
    const msg = childCount > 0
      ? `This folder and ${childCount} subfolder(s) will be removed from students immediately. Continue?`
      : 'This folder will be removed from students immediately. Continue?'
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
      alert('Failed to recall: ' + e.message)
    } finally {
      setDistributingFolder(null)
    }
  }

  const handleCreateSubfolder = async (parentFolder: any) => {
    const name = prompt('Enter subfolder name')
    if (!name?.trim() || !user) return
    const { createFolder } = await import('@/lib/db')
    const newFolder = await createFolder(user.uid, name.trim(), parentFolder.id, (parentFolder.depth || 0) + 1)
    const withCodes = { ...newFolder, distributedClassCodes: [] }
    setFolders(prev => [...prev, withCodes])
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
      alert('Failed to add video: ' + e.message)
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
    const filename = `${classroom?.schoolName ?? ''}_${reportFolder.name}_report.pdf`
    await downloadPdf(pdfRef, filename)
  }

  const openFolderReport = async (folder: { id: string; name: string }) => {
    setReportFolder(folder)
    setReportNote('')
    try {
      const { getDoc, doc: fsDoc } = await import('firebase/firestore')
      const snap = await getDoc(fsDoc(db, 'class_reports', `${classCode}_${folder.id}`))
      if (snap.exists()) setReportNote(snap.data().note || '')
    } catch { /* no note yet */ }
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

  /** "M:SS" or "H:MM:SS" string → seconds */
  const parseTime = (str: string): number => {
    const s = str.trim()
    if (!s) return 0
    const parts = s.split(':').map(Number)
    if (parts.some(isNaN)) return 0
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0
  }
  /** seconds → "M:SS" */
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
        alert('End time must be after start time.')
        return
      }
      await pushVideoToClass(
        classCode,
        clipModal.folderId,
        user.uid,
        userProfile?.displayName || 'Teacher',
        clipModal.item,
        start > 0 ? start : undefined,
        end   > 0 ? end   : undefined,
      )
      const rangeText = start > 0 || end > 0
        ? ` (${start > 0 ? fmtTimeSec(start) : 'start'} ~ ${end > 0 ? fmtTimeSec(end) : 'end'})`
        : ''
      alert(`"${clipModal.item.title}"${rangeText} distributed to ${students.length} student(s).`)
      setClipModal(null)
    } catch (e: any) {
      alert('Failed to distribute: ' + e.message)
    } finally {
      setPushingClip(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
      </div>
    )
  }

  if (!classroom) return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center gap-3 text-center px-4">
      <p className="text-4xl">🏫</p>
      <p className="text-white font-bold">Could not load class.</p>
      <p className="text-gray-500 text-sm">Class code <span className="font-mono text-orange-400">{classCode}</span> does not exist or you do not have access.</p>
      <Link href="/mypage" className="mt-4 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm transition-colors">Go to My Page</Link>
    </div>
  )

  const videoRecords = buildVideoRecords(studentLogs)

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
    <div className="min-h-screen bg-[var(--bg-base)] text-white">
      <Header title="Class Dashboard" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Class header */}
        <div className="bg-gradient-to-br from-[var(--bg-surface-2)] to-[var(--bg-base)] rounded-[28px] border border-[var(--border-subtle)] p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">{classroom.schoolName} · Grade {classroom.grade} · Class {classroom.classNum}</h1>
            <p className="text-gray-400 text-sm mt-1">{students.length} students enrolled</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-[var(--bg-base)] rounded-2xl px-5 py-3 border border-[var(--border-default)]">
              <p className="text-[10px] text-gray-500 mb-0.5">Class Code</p>
              <p className="text-xl font-black font-mono tracking-widest text-orange-400">{classCode}</p>
            </div>
            <button
              onClick={copyCode}
              className="px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-2xl text-orange-400 text-sm font-bold transition-colors"
            >
              {copied ? 'Copied ✓' : 'Copy Code'}
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Students" value={students.length} unit="" color="text-white" />
          <StatCard label="Active Today" value={students.filter(s => {
            const t = s.lastActive?.toMillis?.()
            return t && (Date.now() - t) < 86400000
          }).length} unit="" color="text-emerald-400" />
          <StatCard label="Understood" value={students.reduce((a, s) => a + s.metaComplete, 0)} unit="" color="text-blue-400" />
          <StatCard label="Need Help" value={students.reduce((a, s) => a + s.metaUnknown, 0)} unit="" color="text-red-400" />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['students', 'folders', 'heatmap', 'setup'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === tab ? 'bg-orange-500 text-white' : 'bg-[var(--overlay-subtle)] text-gray-400 hover:bg-[var(--overlay-default)]'}`}
            >
              {tab === 'students' ? '👥 Students'
                : tab === 'folders' ? '📁 Lesson Materials'
                : tab === 'heatmap' ? '🔥 Quiz Heatmap'
                : '⚙️ Settings'}
            </button>
          ))}
        </div>

        {/* Students tab */}
        {activeTab === 'students' && (
          <div className="bg-[var(--bg-surface)] rounded-[28px] border border-[var(--border-default)] p-6">
            {students.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-4xl mb-3">👥</p>
                <p className="text-gray-400">No students have joined yet.</p>
                <p className="text-gray-600 text-sm mt-1">Share class code <span className="font-mono text-orange-400">{classCode}</span> with your students.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-gray-500 border-b border-[var(--border-subtle)]">
                    <tr>
                      <th className="pb-3 font-medium">Name</th>
                      <th className="pb-3 font-medium text-center">Logins</th>
                      <th className="pb-3 font-medium text-center">✅ Got it</th>
                      <th className="pb-3 font-medium text-center">🤔 Confused</th>
                      <th className="pb-3 font-medium text-center">❓ Lost</th>
                      <th className="pb-3 font-medium text-center">Quiz Score</th>
                      <th className="pb-3 font-medium">Last Active</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
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
                          {s.lastActive ? formatRelativeDate(s.lastActive?.toDate?.() || s.lastActive) : '—'}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setResetTarget(s); setResetPassword(''); setResetDone(false) }}
                              className="px-2.5 py-1 rounded-lg bg-[var(--overlay-subtle)] hover:bg-yellow-500/15 hover:text-yellow-400 transition-colors text-gray-500 text-xs"
                              title="Reset Password"
                            >
                              🔑
                            </button>
                            <button
                              onClick={() => openStudentDetail(s)}
                              className="px-3 py-1 rounded-lg bg-[var(--overlay-subtle)] hover:bg-[var(--overlay-default)] transition-colors text-gray-400 text-xs"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Lesson materials tab */}
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
                <div className={`rounded-2xl border transition-colors ${isDistributed ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-[var(--bg-base)] border-[var(--border-subtle)]'}`}>
                  <div className="flex items-center justify-between px-4 py-3 gap-2">
                    <button className="flex items-center gap-2 flex-1 text-left min-w-0" onClick={() => handleExpandFolder(folder.id)}>
                      <span className="text-base shrink-0">{isExpanded ? '📂' : '📁'}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{folder.name}</p>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {isDistributed && <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full">✓ Shared</span>}
                          {children.length > 0 && <span className="text-[9px] text-gray-600">{children.length} subfolder(s)</span>}
                        </div>
                      </div>
                      <span className="text-[9px] text-gray-600 shrink-0 ml-1">{isExpanded ? '▲' : '▼'}</span>
                    </button>
                    <div className="flex gap-1.5 flex-wrap justify-end shrink-0">
                      <button
                        onClick={() => handleCreateSubfolder(folder)}
                        className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        title="Create subfolder"
                      >
                        📁+
                      </button>
                      <button
                        onClick={() => openVideoPickerForFolder({ id: folder.id, name: folder.name })}
                        className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors"
                        title="Add video"
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
                          {isBusy ? '...' : 'Recall'}
                        </button>
                      ) : (
                        <button onClick={() => handleDistribute(folder.id)} disabled={isBusy}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors">
                          {isBusy ? '...' : 'Share'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Video list */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border-subtle)] px-4 pb-3 pt-2 space-y-2">
                      {loadingVideos === folder.id ? (
                        <p className="text-xs text-gray-500 py-2">Loading...</p>
                      ) : videos.length === 0 ? (
                        <p className="text-xs text-gray-500 py-2">No videos yet. Use 🎬+ to add one.</p>
                      ) : videos.map((item: any) => {
                        const hasQuiz = item.videoId && videoQuizSets[item.videoId]
                        return (
                          <div key={item.id} className="flex items-center gap-3 rounded-xl bg-[var(--bg-surface)] px-3 py-2.5">
                            {item.thumbnail && (
                              item.sessionId
                                ? <a href={`/result/${item.sessionId}`} target="_blank" rel="noopener noreferrer">
                                    <img src={item.thumbnail} alt="" className="w-14 h-8 rounded object-cover shrink-0 hover:opacity-80 transition-opacity" />
                                  </a>
                                : <img src={item.thumbnail} alt="" className="w-14 h-8 rounded object-cover shrink-0" />
                            )}
                            {item.sessionId
                              ? <a href={`/result/${item.sessionId}`} target="_blank" rel="noopener noreferrer"
                                  className="flex-1 text-xs text-gray-200 truncate hover:text-orange-400 transition-colors">{item.title}</a>
                              : <p className="flex-1 text-xs text-gray-200 truncate">{item.title}</p>
                            }
                            {hasQuiz && (
                              <button
                                onClick={() => setQuizViewModal({ videoTitle: item.title, quiz: videoQuizSets[item.videoId] })}
                                className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors"
                                title="View quiz"
                              >
                                📝 Quiz
                              </button>
                            )}
                            <button onClick={() => openClipModal(item, folder.id)}
                              className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                              🎬 Send Clip
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Subfolders */}
                {children.length > 0 && (
                  <div className="ml-5 mt-1.5 mb-2 border-l-2 border-[var(--border-default)] pl-3 space-y-1.5">
                    {children.map(child => renderFolder(child, depth + 1))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <div className="bg-[var(--bg-surface)] rounded-[28px] border border-[var(--border-default)] p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-400">
                  Press <span className="text-emerald-400 font-bold">Share</span> to show a folder to students in real time.
                  Press <span className="text-red-400 font-bold">Recall</span> to hide it immediately.
                </p>
                <button
                  onClick={async () => {
                    const name = prompt('Enter new lesson folder name')
                    if (!name?.trim() || !user) return
                    const { createFolder } = await import('@/lib/db')
                    const newFolder = await createFolder(user.uid, name.trim())
                    setFolders(prev => [...prev, { ...newFolder, distributedClassCodes: [] }])
                  }}
                  className="shrink-0 ml-4 flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  ＋ New Lesson
                </button>
              </div>
              {distributedCount > 0 && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-4 py-3 mb-4 text-xs text-emerald-300">
                  Currently sharing <span className="font-bold text-emerald-400">{distributedCount}</span> folder(s)
                </div>
              )}
              {rootFolders.length === 0 ? (
                <p className="text-gray-500 text-sm">No folders yet. Click "New Lesson" to get started.</p>
              ) : (
                <div className="space-y-2">
                  {rootFolders.map(folder => renderFolder(folder))}
                </div>
              )}
            </div>
          )
        })()}

        {/* Heatmap tab */}
        {activeTab === 'heatmap' && (
          <div className="bg-[var(--bg-surface)] rounded-[28px] border border-[var(--border-default)] p-6">
            <div className="mb-5">
              <h2 className="font-black text-base">🔥 Quiz Wrong-Answer Heatmap</h2>
              <p className="text-xs text-gray-400 mt-1">
                Spot sections with high error rates at a glance — focus your next lesson there.
                <span className="text-red-400 font-bold ml-1">Red</span> = 60%+ wrong → intervention needed
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

        {/* Settings tab */}
        {activeTab === 'setup' && (
          <div className="bg-[var(--bg-surface)] rounded-[28px] border border-[var(--border-default)] p-6 space-y-4">
            <InfoRow label="School" value={classroom.schoolName} />
            <InfoRow label="Grade / Class" value={`Grade ${classroom.grade} · Class ${classroom.classNum}`} />
            <InfoRow label="Class Code" value={classCode} highlight />
            <InfoRow label="Join Link" value={`ssoktube.com/classroom/join?code=${classCode}`} />
            <div className="pt-4 space-y-2">
              <p className="text-xs text-gray-500">Share this link with students — the class code will be pre-filled.</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://ssoktube.com/classroom/join?code=${classCode}`)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl transition-colors"
              >
                {copied ? 'Copied ✓' : '🔗 Copy Join Link'}
              </button>
            </div>

            {/* Legacy folder cleanup */}
            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <p className="text-xs text-gray-400 font-bold mb-1">Legacy Folder Cleanup</p>
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                Removes old "default folder" copies that were auto-added to students&apos; libraries.<br/>
                Unrelated to the current share/recall system. Cannot be undone.
              </p>
              {cleanupResult && (
                <p className="text-xs text-emerald-400 mb-2">
                  ✓ Deleted {cleanupResult.deleted} folder(s) and {cleanupResult.deletedItems} video copy(s)
                </p>
              )}
              <button
                onClick={async () => {
                  if (!confirm('This will delete all legacy folder copies from students\' libraries.\nThis cannot be undone. Continue?')) return
                  setCleaningUp(true)
                  setCleanupResult(null)
                  try {
                    const token = await user!.getIdToken()
                    const res = await fetch('/api/classroom/cleanup-inherited', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ classCode }),
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error)
                    setCleanupResult({ deleted: data.deleted, deletedItems: data.deletedItems })
                  } catch (e: any) {
                    alert('Error: ' + e.message)
                  } finally {
                    setCleaningUp(false)
                  }
                }}
                disabled={cleaningUp}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {cleaningUp ? 'Deleting...' : '🗑️ Delete All Legacy Copies'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Video picker modal */}
      {videoPickerFolder && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setVideoPickerFolder(null)}>
          <div className="bg-[var(--bg-surface)] rounded-[28px] border border-[var(--border-default)] w-full max-w-lg p-6 space-y-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-black">🎬 Add Video</h3>
                <p className="text-xs text-gray-400 mt-0.5">Folder: {videoPickerFolder.name}</p>
              </div>
              <button onClick={() => setVideoPickerFolder(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <input
              type="text"
              placeholder="Search by title..."
              value={librarySearch}
              onChange={e => setLibrarySearch(e.target.value)}
              className="shrink-0 w-full px-4 py-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50"
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
                  <p className="text-gray-600 text-sm text-center py-8">No videos available to add.</p>
                ) : filtered.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 bg-[var(--bg-surface-2)] rounded-xl px-3 py-2.5">
                    {v.thumbnail && <img src={v.thumbnail} alt="" className="w-14 h-8 rounded object-cover shrink-0" />}
                    <p className="flex-1 text-xs text-gray-200 truncate">{v.title}</p>
                    <button
                      onClick={() => handleMoveVideo(v.id, videoPickerFolder.id)}
                      disabled={movingVideo === v.id}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                    >
                      {movingVideo === v.id ? '...' : 'Add'}
                    </button>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Quiz view modal */}
      {quizViewModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setQuizViewModal(null)}>
          <div className="bg-[var(--bg-surface)] rounded-[28px] border border-[var(--border-default)] w-full max-w-md p-6 space-y-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between shrink-0">
              <div>
                <h3 className="text-base font-black">📝 Quiz Questions</h3>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{quizViewModal.videoTitle}</p>
              </div>
              <button onClick={() => setQuizViewModal(null)} className="text-gray-400 hover:text-white text-xl ml-4 shrink-0">✕</button>
            </div>
            <div className="overflow-y-auto space-y-3 flex-1">
              {(quizViewModal.quiz.questions || []).map((q: any, i: number) => (
                <div key={i} className="bg-[var(--bg-surface-2)] rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-bold text-white">Q{i + 1}. {q.question}</p>
                  {q.type === 'multiple_choice' && q.options ? (
                    <div className="space-y-1">
                      {q.options.map((opt: string, j: number) => (
                        <p key={j} className={`text-xs px-3 py-1.5 rounded-lg ${opt === q.answer ? 'bg-emerald-500/15 text-emerald-300 font-bold' : 'text-gray-400'}`}>
                          {['A', 'B', 'C', 'D'][j]}. {opt}
                          {opt === q.answer && <span className="ml-2">✓ Correct</span>}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg">Answer: {q.answer}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clip send modal */}
      {clipModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setClipModal(null)}>
          <div className="bg-[var(--bg-surface)] rounded-[28px] border border-[var(--border-default)] w-full max-w-sm p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-base font-black">🎬 Send Clip</h3>
              <p className="text-xs text-gray-400 mt-1 truncate">"{clipModal.item.title}"</p>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-4 py-3 text-xs text-emerald-300 space-y-0.5">
              <p className="font-bold">Leave times blank to send the full video.</p>
              <p className="text-emerald-400/70">Set only a start time to play from that point to the end.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-400 mb-1 block">Start time (M:SS)</label>
                <input
                  type="text"
                  placeholder="e.g. 2:30"
                  value={clipStartStr}
                  onChange={e => setClipStartStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400 mb-1 block">End time (M:SS)</label>
                <input
                  type="text"
                  placeholder="e.g. 5:45"
                  value={clipEndStr}
                  onChange={e => setClipEndStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
            {clipStartStr && clipEndStr && parseTime(clipStartStr) > 0 && parseTime(clipEndStr) > 0 && (
              <p className="text-xs text-emerald-400 text-center">
                Sending clip: {fmtTimeSec(parseTime(clipStartStr))} ~ {fmtTimeSec(parseTime(clipEndStr))}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setClipModal(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--overlay-subtle)] text-gray-400 text-sm font-bold hover:bg-[var(--overlay-default)]">
                Cancel
              </button>
              <button
                onClick={handleClipPush}
                disabled={pushingClip}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50 transition-colors"
              >
                {pushingClip ? 'Sending...' : `Send to ${students.length} student(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson report modal */}
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
            <div className="bg-[var(--bg-base)] rounded-[28px] border border-[var(--border-default)] w-full max-w-4xl my-8" onClick={e => e.stopPropagation()}>
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--border-subtle)]">
                <div>
                  <h2 className="text-lg font-black">📋 Lesson Report</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{reportFolder.name} · {classroom?.schoolName} Grade {classroom?.grade} · Class {classroom?.classNum}</p>
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

              {/* PDF capture area */}
              <div ref={el => setPdfRef(el)} className="p-6 space-y-6" style={{ background: '#ffffff', color: '#111827', fontFamily: 'sans-serif' }}>
                {/* Report header */}
                <div style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '16px' }}>
                  <h1 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '4px' }}>Lesson Activity Report — {reportFolder.name}</h1>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{classroom?.schoolName} Grade {classroom?.grade} · Class {classroom?.classNum} · {new Date().toLocaleDateString('en-US')}</p>
                </div>

                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
                  {[
                    { label: 'Students', value: totalStudents, unit: '', color: '#111827' },
                    { label: 'Understood', value: totalComplete, unit: '', color: '#059669' },
                    { label: 'Quiz Attempts', value: totalQuizAttempts, unit: '', color: '#2563eb' },
                    { label: 'Need Help', value: totalUnknown, unit: '', color: '#dc2626' },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: '#f9fafb', borderRadius: '10px', padding: '12px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                      <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>{stat.label}</p>
                      <p style={{ fontSize: '22px', fontWeight: 900, color: stat.color, margin: 0 }}>{stat.value}<span style={{ fontSize: '11px', fontWeight: 400, color: '#9ca3af', marginLeft: '2px' }}>{stat.unit}</span></p>
                    </div>
                  ))}
                </div>

                {/* Lesson videos */}
                {(folderVideos[reportFolder.id] || []).length > 0 && (
                  <div>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>📹 Lesson Videos</h2>
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
                            <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Viewers: {viewers} · Avg watched: {avgPct}%</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Student breakdown */}
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>👥 Student Participation</h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        {['Name', 'Got It', 'Confused', 'Lost', 'Quiz Score'].map(h => (
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

                {/* Quiz wrong-answer heatmap */}
                {folderHeatmaps.length > 0 && (
                  <div>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>🔥 Quiz Wrong-Answer Summary</h2>
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
                              Q{q.questionIdx + 1} wrong {Math.round(q.wrongRate * 100)}%
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Teacher comment */}
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: '#111827' }}>📝 Teacher&apos;s Notes</h2>
                  <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px', minHeight: '60px' }}>
                    <p style={{ fontSize: '12px', color: reportNote ? '#111827' : '#9ca3af', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                      {reportNote || '(No notes added)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Comment input (outside PDF) */}
              <div className="px-6 pb-6 pt-4 border-t border-[var(--border-subtle)] space-y-3">
                <p className="text-xs text-gray-400">📝 Teacher&apos;s notes will be included in the report.</p>
                <textarea
                  value={reportNote}
                  onChange={e => setReportNote(e.target.value)}
                  placeholder="Add observations, student feedback, or plans for the next lesson..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveReportNote}
                    disabled={savingReportNote}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    {savingReportNote ? 'Saving...' : '💾 Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Student detail modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
          <div
            className="bg-[var(--bg-surface)] rounded-[28px] border border-[var(--border-default)] w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--border-subtle)] shrink-0">
              <div>
                <h2 className="text-lg font-black">{selectedStudent.studentName}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Student activity detail</p>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-2 px-6 py-4 shrink-0">
              <MiniStat label="Logins" value={selectedStudent.loginCount} unit="" color="text-white" />
              <MiniStat label="✅ Got It" value={selectedStudent.metaComplete} unit="" color="text-emerald-400" />
              <MiniStat label="Quiz Score" value={selectedStudent.quizAttempts > 0 ? Math.round(selectedStudent.quizCorrect / selectedStudent.quizAttempts * 100) : 0} unit="%" color="text-blue-400" />
              <MiniStat label="❓ Lost" value={selectedStudent.metaUnknown} unit="" color="text-red-400" />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-6 pb-3 shrink-0 flex-wrap">
              <button
                onClick={() => setStudentDetailTab('videos')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${studentDetailTab === 'videos' ? 'bg-orange-500 text-white' : 'bg-[var(--overlay-subtle)] text-gray-400 hover:bg-[var(--overlay-default)]'}`}
              >
                🎬 Videos
              </button>
              <button
                onClick={() => setStudentDetailTab('bookmarks')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${studentDetailTab === 'bookmarks' ? 'bg-orange-500 text-white' : 'bg-[var(--overlay-subtle)] text-gray-400 hover:bg-[var(--overlay-default)]'}`}
              >
                🔖 Bookmarks {studentBookmarks.length > 0 && <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">{studentBookmarks.length}</span>}
              </button>
              <button
                onClick={() => setStudentDetailTab('review')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${studentDetailTab === 'review' ? 'bg-orange-500 text-white' : 'bg-[var(--overlay-subtle)] text-gray-400 hover:bg-[var(--overlay-default)]'}`}
              >
                🔁 Review
              </button>
              <button
                onClick={() => setStudentDetailTab('access')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${studentDetailTab === 'access' ? 'bg-orange-500 text-white' : 'bg-[var(--overlay-subtle)] text-gray-400 hover:bg-[var(--overlay-default)]'}`}
              >
                🔐 Access Log
              </button>
            </div>

            {/* Tab content */}
            <div className="overflow-y-auto flex-1 px-6 pb-6">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500" />
                </div>
              ) : studentDetailTab === 'videos' ? (
                videoRecords.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-12">No video watch history.</p>
                ) : (
                  <div className="space-y-3">
                    {videoRecords.map(vr => (
                      <div key={vr.videoId} className="bg-[var(--bg-base)] rounded-2xl p-4 border border-[var(--border-subtle)]">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <p className="text-sm font-bold text-white leading-snug flex-1">{vr.videoTitle}</p>
                          {vr.completed && (
                            <span className="shrink-0 text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full">Done</span>
                          )}
                        </div>

                        {/* Watch progress bar */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                            <span>Watched</span>
                            <span className="text-white font-bold">{vr.percentWatched}% · {fmtDuration(vr.watchDurationSec)}</span>
                          </div>
                          <div className="h-1.5 bg-[var(--overlay-subtle)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${Math.min(vr.percentWatched, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Watch session timeline */}
                        {vr.watchSessions.length > 0 && (
                          <div className="mb-3 space-y-0.5">
                            {vr.watchSessions.slice(-4).map((s, si) => {
                              const fmt = (iso?: string) => {
                                if (!iso) return '?'
                                const d = new Date(iso)
                                return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
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

                        {/* Self-check + Quiz */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-black/20 rounded-xl p-2.5">
                            <p className="text-[9px] text-gray-500 mb-1.5">Self-check</p>
                            <div className="flex gap-2 text-[10px]">
                              <span className="text-emerald-400">✅ {vr.meta.complete}</span>
                              <span className="text-yellow-400">🤔 {vr.meta.confused}</span>
                              <span className="text-red-400">❓ {vr.meta.unknown}</span>
                            </div>
                          </div>
                          <div className="bg-black/20 rounded-xl p-2.5">
                            <p className="text-[9px] text-gray-500 mb-1.5">Quiz</p>
                            {vr.quiz.attempts > 0 ? (
                              <div className="space-y-0.5">
                                {Object.entries(vr.quizByAttempt)
                                  .sort(([a], [b]) => Number(a) - Number(b))
                                  .map(([att, res]) => (
                                    <p key={att} className="text-[10px]">
                                      <span className="text-gray-500 mr-1">Try {att}</span>
                                      <span className="text-blue-400 font-bold">{Math.round(res.correct / res.total * 100)}%</span>
                                      <span className="text-gray-600 ml-1">({res.correct}/{res.total})</span>
                                    </p>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-gray-600">Not attempted</p>
                            )}
                          </div>
                        </div>

                        {/* Segment / general comments */}
                        {(vr.comments.length > 0 || vr.segments.length > 0) && (
                          <div className="space-y-1 mt-1">
                            {vr.segments.map((seg, i) => (
                              <div key={i} className="bg-purple-500/5 border border-purple-500/15 rounded-xl px-3 py-2 text-[10px]">
                                <span className="text-purple-400 font-bold mr-2">Segment Note</span>
                                <span className="text-gray-300">{seg.value.text || ''}</span>
                                {seg.value.timeLabel && <span className="text-gray-600 ml-2">[{seg.value.timeLabel}]</span>}
                              </div>
                            ))}
                            {vr.comments.map((c, i) => (
                              <div key={i} className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-3 py-2 text-[10px]">
                                <span className="text-blue-400 font-bold mr-2">Comment</span>
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
                  <p className="text-gray-600 text-sm text-center py-12">No bookmarks.</p>
                ) : (
                  <div className="space-y-2">
                    {studentBookmarks.map(bm => (
                      <div key={bm.id} className="bg-[var(--bg-base)] rounded-2xl p-4 border border-[var(--border-subtle)]">
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
                studentReviews.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-12">No review items pending.<br/><span className="text-xs text-gray-700">Review schedules are created automatically when a student gets a quiz wrong.</span></p>
                ) : (
                  <div className="space-y-2">
                    {studentReviews.map((item, i) => {
                      const isOverdue = item.nextReviewDate <= new Date().toISOString().slice(0, 10)
                      return (
                        <div key={i} className={`flex items-start gap-3 rounded-xl px-4 py-3 text-xs ${isOverdue ? 'bg-red-500/10 border border-red-500/20' : 'bg-[var(--bg-base)]'}`}>
                          <span className="text-lg">{isOverdue ? '🔴' : '🔵'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-300 font-medium truncate">{item.videoTitle || 'Video'}</p>
                            {item.question && <p className="text-gray-500 truncate mt-0.5">Q{item.questionIdx + 1}. {item.question}</p>}
                            <p className={`mt-0.5 font-bold ${isOverdue ? 'text-red-400' : 'text-blue-400'}`}>
                              {isOverdue ? `Review needed (${item.nextReviewDate})` : `Next review: ${item.nextReviewDate}`}
                            </p>
                          </div>
                          <span className="text-[10px] text-gray-600 shrink-0">
                            {['1d', '3d', '7d', '14d', '30d', '60d'][item.repetition ?? 0] ?? ''} cycle
                          </span>
                        </div>
                      )
                    })}
                    <p className="text-[10px] text-gray-600 text-center pt-2">
                      🔴 Overdue · 🔵 Upcoming
                    </p>
                  </div>
                )
              ) : (
                loginSessions.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-12">No access records.</p>
                ) : (
                  <div className="space-y-2">
                    {loginSessions.map((session, i) => {
                      const loginTs = session.loginLog?.timestamp
                      const logoutTs = session.logoutLog?.timestamp
                      const device = session.loginLog?.value?.device
                      const fmtTime = (ts: any) => {
                        if (!ts) return null
                        const d = ts?.toDate?.() || new Date(ts)
                        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                      }
                      const fmtDate = (ts: any) => {
                        if (!ts) return null
                        return formatRelativeDate(ts?.toDate?.() || ts)
                      }
                      return (
                        <div key={i} className="bg-[var(--bg-base)] rounded-xl px-4 py-3 text-xs border border-[var(--border-subtle)]">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-gray-400 font-medium">{fmtDate(loginTs || logoutTs)}</span>
                            {device && <span className="text-[10px] text-gray-600">{device}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-green-400 font-bold">
                              🔐 {loginTs ? fmtTime(loginTs) : 'No record'}
                            </span>
                            <span className="text-gray-600">→</span>
                            <span className={logoutTs ? 'text-gray-400' : 'text-yellow-600'}>
                              🚪 {logoutTs ? fmtTime(logoutTs) : 'No logout recorded'}
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

      {/* Password reset modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setResetTarget(null)}>
          <div
            className="bg-[var(--bg-surface)] rounded-[28px] border border-[var(--border-default)] w-full max-w-sm p-7"
            onClick={e => e.stopPropagation()}
          >
            {!resetDone ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-black text-white">Reset Password</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{resetTarget.studentName}</p>
                  </div>
                  <button onClick={() => setResetTarget(null)} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
                </div>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                  Enter a new password and share it with the student directly.
                </p>
                <input
                  type="text"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  placeholder="New password (4+ characters)"
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors mb-4"
                  autoFocus
                />
                <button
                  onClick={handleResetPassword}
                  disabled={resetting || !resetPassword.trim()}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {resetting ? 'Changing...' : 'Change Password'}
                </button>
              </>
            ) : (
              <>
                <div className="text-center py-4">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="font-black text-white mb-1">Password Changed</p>
                  <p className="text-sm text-gray-400 mb-1">
                    New password for <span className="text-white font-bold">{resetTarget.studentName}</span>:
                  </p>
                  <p className="text-lg font-black text-orange-400 font-mono mb-4">{resetPassword}</p>
                  <p className="text-xs text-gray-500 mb-5">Share this password with the student.</p>
                  <button
                    onClick={() => setResetTarget(null)}
                    className="w-full py-3 bg-[var(--overlay-subtle)] hover:bg-[var(--overlay-default)] rounded-xl font-bold text-sm transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-[20px] border border-[var(--border-subtle)] p-4">
      <p className="text-gray-500 text-[10px] mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value} <span className="text-[10px] font-normal text-gray-600">{unit}</span></p>
    </div>
  )
}

function MiniStat({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="bg-[var(--bg-base)] rounded-2xl p-3 text-center">
      <p className="text-gray-500 text-[9px] mb-1">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value}<span className="text-[9px] font-normal text-gray-600 ml-0.5">{unit}</span></p>
    </div>
  )
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)]">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-sm font-bold ${highlight ? 'font-mono text-orange-400 text-lg tracking-widest' : 'text-white'}`}>{value}</span>
    </div>
  )
}
