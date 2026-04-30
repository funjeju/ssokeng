import { NextRequest, NextResponse } from 'next/server'
import { initAdminApp } from '@/lib/firebase-admin'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const folderId = req.nextUrl.searchParams.get('folderId')
    if (!folderId) {
      return NextResponse.json({ error: 'folderId가 필요합니다.' }, { status: 400 })
    }

    initAdminApp()
    const adminAuth = getAuth()
    const adminDb = getFirestore()

    let studentUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(authHeader.slice(7))
      studentUid = decoded.uid
    } catch {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 })
    }

    const userDoc = await adminDb.collection('users').doc(studentUid).get()
    const classCode = userDoc.data()?.classCode
    if (!classCode) return NextResponse.json({ error: '클래스 정보가 없습니다.' }, { status: 403 })

    const folderDoc = await adminDb.collection('folders').doc(folderId).get()
    if (!folderDoc.exists) return NextResponse.json({ error: '폴더를 찾을 수 없습니다.' }, { status: 404 })

    const folderData = folderDoc.data()!
    if (!folderData.distributedClassCodes?.includes(classCode)) {
      return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 })
    }

    const videosSnap = await adminDb.collection('saved_summaries')
      .where('userId', '==', folderData.userId)
      .where('folderId', '==', folderId)
      .get()

    const videos = videosSnap.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        sessionId: data.sessionId || '',
        videoId: data.videoId || '',
        title: data.title || '',
        channel: data.channel || '',
        thumbnail: data.thumbnail || '',
        category: data.category || '',
        summary: data.summary || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      }
    })

    return NextResponse.json({ videos, folderName: folderData.name })
  } catch (error: any) {
    console.error('[DistributedVideos] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
