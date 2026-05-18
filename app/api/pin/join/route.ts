import { NextRequest, NextResponse } from 'next/server'
import { initAdminApp } from '@/lib/firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json()
    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ error: 'PIN required.' }, { status: 400 })
    }

    initAdminApp()
    const db = getFirestore()

    const snap = await db.collection('pin_sessions')
      .where('pin', '==', pin.trim())
      .where('active', '==', true)
      .limit(1)
      .get()

    if (snap.empty) {
      return NextResponse.json({ error: 'Invalid or expired PIN.' }, { status: 404 })
    }

    const data = snap.docs[0].data()
    return NextResponse.json({
      classCode: data.classCode,
      teacherName: data.teacherName ?? '',
      sessionId: data.sessionId ?? '',
      videoTitle: data.videoTitle ?? '',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Server error.', detail: msg }, { status: 500 })
  }
}
