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
    if (!userDoc.exists) return NextResponse.json({ folders: [] })

    const classCode = userDoc.data()?.classCode
    if (!classCode) return NextResponse.json({ folders: [] })

    const foldersSnap = await adminDb.collection('folders')
      .where('distributedClassCodes', 'array-contains', classCode)
      .get()

    const folders = foldersSnap.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.name,
        userId: data.userId,
        parentId: data.parentId || null,
        distributedClassCodes: data.distributedClassCodes || [],
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      }
    })

    return NextResponse.json({ folders, classCode })
  } catch (error: any) {
    console.error('[DistributedFolders] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
