import { NextRequest, NextResponse } from 'next/server'
import { initAdminApp } from '@/lib/firebase-admin'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  try {
    const { folderId, classCode } = await req.json()
    if (!folderId || !classCode) {
      return NextResponse.json({ error: 'folderId와 classCode가 필요합니다.' }, { status: 400 })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    initAdminApp()
    const adminAuth = getAuth()
    const adminDb = getFirestore()

    let teacherUid: string
    try {
      const decoded = await adminAuth.verifyIdToken(authHeader.slice(7))
      teacherUid = decoded.uid
    } catch {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 })
    }

    const upperCode = classCode.toUpperCase()
    const folderRef = adminDb.collection('folders').doc(folderId)
    const folderSnap = await folderRef.get()

    if (!folderSnap.exists || folderSnap.data()?.userId !== teacherUid) {
      return NextResponse.json({ error: '폴더 접근 권한이 없습니다.' }, { status: 403 })
    }

    await folderRef.update({ distributedClassCodes: FieldValue.arrayRemove(upperCode) })

    return NextResponse.json({ success: true, folderId, classCode: upperCode })
  } catch (error: any) {
    console.error('[Recall] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
