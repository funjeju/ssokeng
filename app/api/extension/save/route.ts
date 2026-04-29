import { NextRequest, NextResponse } from 'next/server'
import { initAdminApp } from '@/lib/firebase-admin'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// CORS — 확장 service worker는 chrome-extension:// origin으로 요청
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  try {
    // ── 토큰 검증 ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS })
    }
    const idToken = authHeader.slice(7)

    initAdminApp()
    const adminAuth = getAuth()
    const adminDb = getFirestore()

    let decodedToken: { uid: string; name?: string; picture?: string }
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken)
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: CORS_HEADERS })
    }
    const { uid, name, picture } = decodedToken

    // ── 요청 파싱 ──
    const body = await req.json().catch(() => ({}))
    const { sessionId } = body as { sessionId?: string }
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400, headers: CORS_HEADERS })
    }

    // ── 중복 저장 확인 ──
    const existingSnap = await adminDb
      .collection('saved_summaries')
      .where('userId', '==', uid)
      .where('sessionId', '==', sessionId)
      .limit(1)
      .get()

    if (!existingSnap.empty) {
      return NextResponse.json({ success: true, alreadySaved: true }, { headers: CORS_HEADERS })
    }

    // ── summaries 컬렉션에서 데이터 조회 ──
    const summaryDoc = await adminDb.collection('summaries').doc(sessionId).get()
    if (!summaryDoc.exists) {
      return NextResponse.json({ error: 'Summary not found' }, { status: 404, headers: CORS_HEADERS })
    }
    const s = summaryDoc.data()!

    // ── saved_summaries에 저장 ──
    await adminDb.collection('saved_summaries').add({
      userId: uid,
      userDisplayName: name || '',
      userPhotoURL: picture || '',
      folderId: null,
      sessionId,
      videoId: s.videoId || '',
      title: s.title || '',
      channel: s.channel || '',
      thumbnail: s.thumbnail || '',
      category: s.category || '',
      summary: s.summary || null,
      square_meta: s.square_meta || null,
      transcript: s.transcript || '',
      transcriptSource: s.transcriptSource || '',
      isPublic: false,
      likeCount: 0,
      viewCount: 0,
      savedFromExtension: true,
      createdAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS })
  } catch (e) {
    console.error('[extension/save]', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
