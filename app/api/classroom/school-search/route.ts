import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ schools: [] })

  const key = process.env.NEIS_API_KEY || 'SAMPLE_KEY'

  try {
    const url = new URL('https://open.neis.go.kr/hub/schoolInfo')
    url.searchParams.set('KEY', key)
    url.searchParams.set('Type', 'json')
    url.searchParams.set('pIndex', '1')
    url.searchParams.set('pSize', '20')
    url.searchParams.set('SCHUL_NM', q)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`NEIS HTTP ${res.status}`)

    const data = await res.json() as {
      schoolInfo?: [
        { head: unknown[] },
        { row: Array<{
          SD_SCHUL_CODE: string
          SCHUL_NM: string
          SCHUL_KND_SC_NM: string   // 초등학교 | 중학교 | 고등학교 등
          LCTN_SC_NM: string        // 시도 (제주특별자치도 등)
          ORG_RDNMA: string         // 도로명주소
          ATPT_OFCDC_SC_NM: string  // 시도교육청명
        }> }
      ]
      RESULT?: { CODE: string; MESSAGE: string }
    }

    // 결과 없을 때 RESULT.CODE === 'INFO-200'
    if (data.RESULT) return NextResponse.json({ schools: [] })

    const rows = data.schoolInfo?.[1]?.row ?? []
    const schools = rows.map(r => ({
      code: r.SD_SCHUL_CODE,
      name: r.SCHUL_NM,
      type: r.SCHUL_KND_SC_NM,     // 초등학교 / 중학교 / 고등학교
      region: r.LCTN_SC_NM,         // 제주특별자치도
      address: r.ORG_RDNMA,
    }))

    return NextResponse.json({ schools })
  } catch (e: any) {
    console.error('[NEIS school-search] 오류:', e.message)
    return NextResponse.json({ schools: [], error: e.message }, { status: 500 })
  }
}
