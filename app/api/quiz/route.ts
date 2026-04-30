import { NextRequest, NextResponse } from 'next/server'
import { generateQuiz } from '@/lib/claude'
import { initAdminApp } from '@/lib/firebase-admin'
import { getFirestore } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  try {
    const { category, summary, title, videoId, sessionId, force } = await req.json()
    if (!category || !summary) return NextResponse.json({ error: 'category, summary 필요' }, { status: 400 })
    if (category !== 'english' && category !== 'learning') {
      return NextResponse.json({ error: '영어/학습 카테고리만 지원합니다' }, { status: 400 })
    }

    initAdminApp()
    const db = getFirestore()

    // 캐시 키: videoId 우선, 없으면 sessionId (PDF/음성)
    const cacheKey = videoId || sessionId

    // 캐시 확인 (force=true이면 건너뜀)
    if (cacheKey && !force) {
      const cached = await db.collection('quiz_sets').doc(cacheKey).get()
      if (cached.exists) {
        return NextResponse.json(cached.data())
      }
    }

    // AI 생성
    const quiz = await generateQuiz(category, summary, title || '')

    // DB 저장 (첫 생성 or 선생님 재생성)
    if (cacheKey) {
      await db.collection('quiz_sets').doc(cacheKey).set({
        ...quiz,
        videoId: videoId || '',
        sessionId: sessionId || '',
        createdAt: new Date().toISOString(),
      })
    }

    return NextResponse.json(quiz)
  } catch (e) {
    console.error('Quiz generation error:', e)
    return NextResponse.json({ error: '퀴즈 생성에 실패했습니다.' }, { status: 500 })
  }
}
