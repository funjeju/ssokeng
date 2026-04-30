import { NextRequest, NextResponse } from 'next/server'
import { initAdminApp } from '@/lib/firebase-admin'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  try {
    const { studentId, studentName, classCode, type, videoId, sessionId, videoTitle, value } = await req.json()
    if (!studentId || !classCode || !type) {
      return NextResponse.json({ error: 'studentId, classCode, type required' }, { status: 400 })
    }

    initAdminApp()
    const db = getFirestore()

    await db.collection('activity_logs').add({
      studentId,
      studentName: studentName || '',
      classCode,
      type,
      videoId: videoId || null,
      sessionId: sessionId || null,
      videoTitle: videoTitle || null,
      value: value || {},
      timestamp: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Activity] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
