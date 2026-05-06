/**
 * 기본폴더(masterFolder) 상속 복사본 정리
 * - 신규 학생 가입 시 clone된 isClassFolder:true 폴더들 삭제
 * - 해당 폴더에 속한 saved_summaries도 함께 삭제
 */
import { NextRequest, NextResponse } from 'next/server'
import { initAdminApp } from '@/lib/firebase-admin'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const { classCode } = await req.json()
    if (!classCode) return NextResponse.json({ error: 'classCode 필요' }, { status: 400 })

    initAdminApp()
    const adminAuth = getAuth()
    const db = getFirestore()

    // 교사 인증
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7))
    const classSnap = await db.collection('classes').doc(classCode.toUpperCase()).get()
    if (!classSnap.exists || classSnap.data()?.teacherId !== decoded.uid) {
      return NextResponse.json({ error: '클래스 접근 권한이 없습니다.' }, { status: 403 })
    }

    // 이 클래스의 기본폴더 복사본 전체 조회
    const foldersSnap = await db.collection('folders')
      .where('classCode', '==', classCode.toUpperCase())
      .where('isClassFolder', '==', true)
      .get()

    if (foldersSnap.empty) {
      return NextResponse.json({ success: true, deleted: 0 })
    }

    const folderIds = foldersSnap.docs.map(d => d.id)

    // 각 폴더의 saved_summaries 조회 후 삭제 (Firestore는 in 쿼리 최대 30개)
    const CHUNK = 30
    let deletedItems = 0
    for (let i = 0; i < folderIds.length; i += CHUNK) {
      const chunk = folderIds.slice(i, i + CHUNK)
      const itemsSnap = await db.collection('saved_summaries')
        .where('folderId', 'in', chunk)
        .get()

      if (!itemsSnap.empty) {
        const batch = db.batch()
        itemsSnap.docs.forEach(d => batch.delete(d.ref))
        await batch.commit()
        deletedItems += itemsSnap.size
      }
    }

    // 폴더 자체 삭제
    const folderBatch = db.batch()
    foldersSnap.docs.forEach(d => folderBatch.delete(d.ref))
    await folderBatch.commit()

    return NextResponse.json({
      success: true,
      deleted: foldersSnap.size,
      deletedItems,
    })
  } catch (e: any) {
    console.error('[cleanup-inherited] 오류:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
