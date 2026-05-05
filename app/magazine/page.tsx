import type { Metadata } from 'next'
import Header from '@/components/common/Header'
import MagazineListClient from './MagazineListClient'

export const metadata: Metadata = {
  title: 'AI 매거진 | SSOKTUBE — AI 뉴스·도구·활용 전문 큐레이션',
  description: 'ChatGPT, Claude, Gemini 등 최신 AI 뉴스와 생산성 도구, 실전 활용 사례를 깊이 다루는 AI 전문 매거진. 매일 3회 AI 에디터가 엄선한 유튜브 핵심 콘텐츠.',
  keywords: ['AI 매거진', 'AI 뉴스', 'AI 도구', 'ChatGPT', 'Claude', 'Gemini', '생성형AI', 'AI 활용법', 'AI 트렌드', '인공지능'],
  alternates: { canonical: 'https://ssoktube.com/magazine' },
  openGraph: {
    title: 'AI 매거진 | SSOKTUBE',
    description: 'AI 뉴스·도구·활용법을 깊이 다루는 AI 전문 매거진. 매일 3회 업데이트.',
    type: 'website',
    url: 'https://ssoktube.com/magazine',
    siteName: 'SSOKTUBE',
  },
}

export default function MagazineBoardPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <Header />
      <main className="max-w-5xl mx-auto px-4 pb-24">

        {/* 브레드크럼 */}
        <nav aria-label="breadcrumb" className="flex items-center gap-2 text-xs text-[var(--text-subtle)] pt-4 mb-6">
          <a href="/" className="hover:text-orange-400 transition-colors">홈</a>
          <span>/</span>
          <span className="text-[var(--text-muted)]">AI 매거진</span>
        </nav>

        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-500 text-white tracking-wide">AI MAGAZINE</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-2">AI 매거진</h1>
          <p className="text-[var(--text-muted)] text-sm max-w-xl leading-relaxed">
            ChatGPT, Claude, Gemini 등 최신 AI 뉴스와 생산성 도구, 실전 활용 사례를 AI 에디터가 엄선해 깊이 있게 다룹니다. 매일 3회 업데이트.
          </p>
        </div>

        <MagazineListClient />

      </main>
    </div>
  )
}
