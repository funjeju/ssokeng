import { NextResponse } from 'next/server'
import { getPublishedPosts } from '@/lib/magazine'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Number(url.searchParams.get('limit') ?? '50')
  try {
    const posts = await getPublishedPosts(Math.min(limit, 100))
    return NextResponse.json(posts)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
