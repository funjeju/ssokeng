import { NextResponse } from 'next/server'
import { initAdminApp } from '@/lib/firebase-admin'

export async function GET() {
  initAdminApp()
  const { getFirestore } = await import('firebase-admin/firestore')
  const db = getFirestore()

  // 1. 모든 classes 문서 가져오기
  const classesSnap = await db.collection('classes').get()
  const classDocs = classesSnap.docs

  // 2. 중복 없는 teacherId 목록 추출
  const teacherIds = [...new Set(
    classDocs.map(d => d.data().teacherId as string).filter(Boolean)
  )]

  if (teacherIds.length === 0) return NextResponse.json({ schools: [] })

  // 3. teacherId별 users 문서 일괄 조회
  const userSnaps = await Promise.all(
    teacherIds.map(id => db.collection('users').doc(id).get())
  )

  // 4. 현재 role === 'teacher' 인 ID 집합
  const activeTeacherIds = new Set(
    userSnaps
      .filter(d => d.exists && d.data()?.role === 'teacher')
      .map(d => d.id)
  )

  // 5. 활성 선생님이 있는 classes의 schoolName만 수집
  const schools = [...new Set(
    classDocs
      .filter(d => activeTeacherIds.has(d.data().teacherId))
      .map(d => d.data().schoolName as string)
      .filter(Boolean)
  )].sort()

  return NextResponse.json({ schools })
}
