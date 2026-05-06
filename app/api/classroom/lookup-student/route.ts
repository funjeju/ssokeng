import { NextRequest, NextResponse } from 'next/server'
import { initAdminApp } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  const { studentName } = await req.json()
  if (!studentName?.trim()) {
    return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 })
  }

  initAdminApp()
  const { getFirestore } = await import('firebase-admin/firestore')
  const db = getFirestore()

  const snap = await db.collection('users')
    .where('studentName', '==', studentName.trim())
    .where('role', '==', 'student')
    .get()

  if (snap.empty) {
    return NextResponse.json({ results: [] })
  }

  const classCodes = [...new Set(snap.docs.map(d => d.data().classCode as string).filter(Boolean))]
  const classSnaps = await Promise.all(classCodes.map(code => db.collection('classes').doc(code).get()))

  const classMap: Record<string, any> = {}
  classSnaps.forEach(s => { if (s.exists) classMap[s.id] = s.data() })

  const results = snap.docs.map(d => {
    const data = d.data()
    const cls = classMap[data.classCode] ?? {}
    return {
      classCode: data.classCode as string,
      schoolName: (cls.schoolName as string) ?? '',
      teacherName: (cls.teacherName as string) ?? '',
      grade: (cls.grade as number) ?? 0,
      classNum: (cls.classNum as number) ?? 0,
    }
  }).filter(r => r.classCode)

  return NextResponse.json({ results })
}
