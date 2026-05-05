import UrlInput from '@/components/home/UrlInput'
import Header from '@/components/common/Header'
import FeatureSlideshow from '@/components/home/FeatureSlideshow'

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] font-sans">
      <Header />
      <main className="flex flex-col items-center justify-center px-4 py-3 relative overflow-hidden">
      {/* Soft warm background glows mimicking the reference */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-orange-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-10 w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="flex flex-col items-center gap-6 w-full max-w-3xl relative z-10">
        {/* Title: 모바일에서는 헤더 로고가 있으므로 숨김 */}
        <div className="text-center flex flex-col gap-3">
          {/* 데스크탑: 풀 로고 */}
          <div className="hidden md:flex flex-row items-center gap-5">
            <img
              src="/logo.png"
              alt="SSOKTUBE"
              className="h-16 w-auto shrink-0 logo-hero"
            />
            <div className="flex flex-col gap-1 text-left">
              <p className="text-xl font-bold text-[var(--text-primary)] tracking-wide">
                유튜브를 <span className="text-orange-400">SSOK</span>쏙, 내 지식을 <span className="text-emerald-400">SSUK</span>쑥
              </p>
              <p className="text-sm font-medium text-[var(--text-muted)] tracking-wide">
                가장 스마트한 유튜브 저장소
              </p>
            </div>
          </div>
          {/* 모바일: 슬로건만 */}
          <div className="md:hidden flex flex-col items-center gap-1">
            <p className="text-base font-bold text-[var(--text-primary)] tracking-wide">
              유튜브를 <span className="text-orange-400">SSOK</span>쏙, 내 지식을 <span className="text-emerald-400">SSUK</span>쑥
            </p>
            <p className="text-xs font-medium text-[var(--text-muted)] tracking-wide">
              가장 스마트한 유튜브 저장소
            </p>
          </div>
        </div>

        <FeatureSlideshow />
        <UrlInput />
      </div>
      </main>
    </div>
  )
}
