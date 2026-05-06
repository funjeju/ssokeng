import { NextRequest, NextResponse } from 'next/server'
import { initAdminApp } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  const school = req.nextUrl.searchParams.get('school')
  if (!school) return NextResponse.json({ error: '학교명이 필요합니다.' }, { status: 400 })

  initAdminApp()
  const { getFirestore } = await import('firebase-admin/firestore')
  const db = getFirestore()

  const snap = await db.collection('classes').where('schoolName', '==', school).get()
  const teachers = snap.docs.map(d => {
    const data = d.data()
    return {
      classCode: d.id,
      teacherName: data.teacherName as string,
      grade: data.grade as number,
      classNum: data.classNum as number,
    }
  }).sort((a, b) => a.grade - b.grade || a.classNum - b.classNum)

  return NextResponse.json({ teachers })
}
