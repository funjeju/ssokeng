import { NextRequest, NextResponse } from 'next/server'
import { initAdminApp } from '@/lib/firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

export async function GET(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get('uid')
    if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 })

    // 요청자 인증 확인 (선생님 토큰)
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    initAdminApp()
    await getAuth().verifyIdToken(token)

    const db = getFirestore()
    const snap = await db.collection('video_bookmarks')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get()

    const bookmarks = snap.docs.map(d => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toMillis?.() ?? 0,
      }
    })

    return NextResponse.json({ bookmarks })
  } catch (error: any) {
    console.error('[StudentBookmarks] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
