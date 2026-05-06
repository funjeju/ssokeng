import { NextRequest, NextResponse } from 'next/server'
import { initAdminApp } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  const school = req.nextUrl.searchParams.get('school')
  if (!school) return NextResponse.json({ error: '학교명이 필요합니다.' }, { status: 400 })

  initAdminApp()
  const { getFirestore } = await import('firebase-admin/firestore')
  const db = getFirestore()

  // 1. 해당 학교의 classes 문서 조회
  const snap = await db.collection('classes').where('schoolName', '==', school).get()
  if (snap.empty) return NextResponse.json({ teachers: [] })

  // 2. teacherId별 users 문서 확인 (role === 'teacher' 검증)
  const userSnaps = await Promise.all(
    snap.docs.map(d => db.collection('users').doc(d.data().teacherId).get())
  )
  const activeTeacherIds = new Set(
    userSnaps
      .filter(d => d.exists && d.data()?.role === 'teacher')
      .map(d => d.id)
  )

  // 3. 활성 선생님만 필터링
  const teachers = snap.docs
    .filter(d => activeTeacherIds.has(d.data().teacherId))
    .map(d => {
      const data = d.data()
      return {
        classCode: d.id,
        teacherName: data.teacherName as string,
        grade: data.grade as number,
        classNum: data.classNum as number,
      }
    })
    .sort((a, b) => a.grade - b.grade || a.classNum - b.classNum)

  return NextResponse.json({ teachers })
}
