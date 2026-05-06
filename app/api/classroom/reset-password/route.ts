import { NextRequest, NextResponse } from 'next/server'
import { initAdminApp } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { studentUid, newPassword } = await req.json()
  if (!studentUid || !newPassword) {
    return NextResponse.json({ error: '필수 항목이 없습니다.' }, { status: 400 })
  }
  if (newPassword.length < 4) {
    return NextResponse.json({ error: '비밀번호는 4자 이상이어야 합니다.' }, { status: 400 })
  }

  initAdminApp()
  const { getAuth } = await import('firebase-admin/auth')
  const { getFirestore } = await import('firebase-admin/firestore')
  const adminAuth = getAuth()
  const db = getFirestore()

  // 선생님 토큰 검증
  const decoded = await adminAuth.verifyIdToken(authHeader.slice(7))

  const [teacherDoc, studentDoc] = await Promise.all([
    db.collection('users').doc(decoded.uid).get(),
    db.collection('users').doc(studentUid).get(),
  ])

  if (!teacherDoc.exists || teacherDoc.data()?.role !== 'teacher') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }
  if (!studentDoc.exists || studentDoc.data()?.role !== 'student') {
    return NextResponse.json({ error: '학생을 찾을 수 없습니다.' }, { status: 404 })
  }
  if (studentDoc.data()?.classCode !== teacherDoc.data()?.classCode) {
    return NextResponse.json({ error: '본인 클래스의 학생만 변경할 수 있습니다.' }, { status: 403 })
  }

  await adminAuth.updateUser(studentUid, { password: newPassword })
  return NextResponse.json({ success: true })
}
