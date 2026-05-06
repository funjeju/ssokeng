import { NextRequest, NextResponse } from 'next/server'
import { initAdminApp } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  const { classCode, studentHint, message } = await req.json()
  if (!classCode) return NextResponse.json({ error: '클래스 코드가 필요합니다.' }, { status: 400 })

  initAdminApp()
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore')
  const db = getFirestore()

  await db.collection('classes').doc(classCode).collection('helpRequests').add({
    studentHint: studentHint?.trim() || '',
    message: message || '이름 또는 비밀번호를 잊어버렸습니다.',
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  })

  return NextResponse.json({ success: true })
}
