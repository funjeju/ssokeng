import { NextResponse } from 'next/server'
import { listCuratedPostsAdmin } from '@/lib/magazine-server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Number(url.searchParams.get('limit') ?? '50')
  try {
    const all = await listCuratedPostsAdmin()
    const posts = all
      .filter(p => p.status === 'published')
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
      .slice(0, Math.min(limit, 100))
    return NextResponse.json(posts)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
