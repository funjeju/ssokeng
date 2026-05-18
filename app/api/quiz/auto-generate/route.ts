import { NextRequest, NextResponse } from 'next/server'
import { generateQuiz } from '@/lib/claude'
import { initAdminApp } from '@/lib/firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

// ClassWall에서 호출 — saved_summaries 기반으로 quiz_sets 자동 생성
export async function POST(req: NextRequest) {
  try {
    const { sessionId, force } = await req.json()
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required.' }, { status: 400 })
    }

    initAdminApp()
    const db = getFirestore()

    // 요약 데이터 조회
    const savedSnap = await db.collection('saved_summaries')
      .where('sessionId', '==', sessionId)
      .limit(1)
      .get()

    if (savedSnap.empty) {
      // summaries 컬렉션에서도 시도
      const summarySnap = await db.collection('summaries').doc(sessionId).get()
      if (!summarySnap.exists) {
        return NextResponse.json({ error: 'Summary not found.' }, { status: 404 })
      }
    }

    const rawData = savedSnap.empty
      ? (await db.collection('summaries').doc(sessionId).get()).data()
      : savedSnap.docs[0].data()

    if (!rawData) return NextResponse.json({ error: 'Summary data empty.' }, { status: 404 })

    const { category, summary, title, videoId } = rawData

    if (category !== 'english' && category !== 'learning') {
      return NextResponse.json({ error: 'Only english/learning categories supported.' }, { status: 400 })
    }

    // 캐시 키: videoId 우선
    const cacheKey = videoId || sessionId

    if (!force) {
      const cached = await db.collection('quiz_sets').doc(cacheKey).get()
      if (cached.exists) return NextResponse.json(cached.data())
    }

    const quiz = await generateQuiz(category, summary, title || '')

    await db.collection('quiz_sets').doc(cacheKey).set({
      ...quiz,
      videoId: videoId || '',
      sessionId,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json(quiz)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Quiz generation failed.', detail: msg }, { status: 500 })
  }
}
