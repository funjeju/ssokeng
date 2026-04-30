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

    // 이 선생님의 모든 폴더를 가져와서 하위폴더 트리를 찾음
    const allFoldersSnap = await adminDb.collection('folders').where('userId', '==', teacherUid).get()
    const allFolderDocs = allFoldersSnap.docs

    // BFS로 모든 하위폴더 ID 수집
    function getDescendantIds(parentId: string): string[] {
      const result: string[] = []
      const queue = [parentId]
      while (queue.length > 0) {
        const current = queue.shift()!
        const children = allFolderDocs.filter(d => d.data().parentId === current)
        for (const child of children) {
          result.push(child.id)
          queue.push(child.id)
        }
      }
      return result
    }

    const descendantIds = getDescendantIds(folderId)
    const affectedIds = [folderId, ...descendantIds]

    const batch = adminDb.batch()
    for (const id of affectedIds) {
      batch.update(adminDb.collection('folders').doc(id), {
        distributedClassCodes: FieldValue.arrayUnion(upperCode),
      })
    }
    await batch.commit()

    return NextResponse.json({ success: true, folderId, classCode: upperCode, affectedIds })
  } catch (error: any) {
    console.error('[Distribute] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
