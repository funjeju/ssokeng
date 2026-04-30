import { NextRequest, NextResponse } from 'next/server'
import { initAdminApp } from '@/lib/firebase-admin'
import { getStorage } from 'firebase-admin/storage'

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params
    if (!sessionId || !/^[\w-]+$/.test(sessionId)) {
      return new NextResponse('Not found', { status: 404 })
    }

    initAdminApp()
    const bucket = getStorage().bucket()
    const file = bucket.file(`pdfs/${sessionId}.pdf`)

    const [exists] = await file.exists()
    if (!exists) return new NextResponse('Not found', { status: 404 })

    const [buffer] = await file.download()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (e) {
    console.error('[PDF proxy] Error:', e)
    return new NextResponse('Error', { status: 500 })
  }
}
