# SSOKTUBE 이슈 & 기술 히스토리

날짜 | 유형 | 증상 | 원인 | 해결
형식으로 기록. 최신순.

---

## 2026-05-18

### [기능] ClassWall — 수업용 실시간 인터랙션 시스템 (신규)
- **내용**: 유튜브 영상 수업 중 선생님·학생이 실시간으로 메모잇·퀴즈카드·찬반투표를 함께 하는 전체화면 오버레이
- **신규 파일**:
  - `components/classwall/ClassWallModal.tsx` — 메인. 좌측 영상+요약, 우측 메모잇/퀴즈카드/찬반투표 탭
  - `components/classwall/ClassWallCard.tsx` — 메모잇 개별 카드 컴포넌트
  - `lib/voteSession.ts` — 찬반투표 세션 활성화·비활성화·실시간 구독 유틸
  - `app/api/quiz/auto-generate/route.ts` — AI 퀴즈카드 자동생성 (영상 요약 기반 → `quiz_sets` 저장)
  - `app/api/pin/join/route.ts` — PIN 검증 (`pin_sessions` 조회 → `classCode` 반환)

### [기능] ClassWall — 타임스탬프 시크
- **내용**: iframe에 `enablejsapi=1` 추가, `postMessage`로 YouTube API `seekTo` 직접 호출

### [기능] ClassWall — isDebate 실시간 감지
- **내용**: prop이 아닌 `onSnapshot`으로 `saved_summaries` 구독, 토론 수업이면 퀴즈탭 즉시 숨김

### [기능] ClassWall — 선생님 퀴즈 수동 생성
- **내용**: 퀴즈탭 상단에 `QuizCardGenerator` 컴포넌트 추가 (생성/재생성 버튼)

### [버그] ClassWall — 찬반투표 Firestore 전체 차단
- **증상**: 찬반투표 버튼 클릭 시 전혀 작동 안 함
- **원인**: `vote_sessions` 컬렉션에 Firestore 규칙 미등록 → 기본 deny
- **해결**: `firestore.rules`에 `vote_sessions`·`quiz_sets`·`pin_sessions`·`review_schedule` 규칙 신규 추가. `saved_summaries` read 규칙에 익명 인증 학생도 포함

### [기능] AuthModal — PIN 로그인 플로우 추가
- **내용**: `components/auth/AuthModal.tsx`에 학생 PIN 로그인 추가. `/join` 리다이렉트 없이 모달 내에서 `pin → pin_name` 뷰 전환 → `signInAnonymously` → `users` 문서 생성까지 처리

### [개선] FlashcardTab — 퀴즈 다중 소스 병합 + 파스텔 UI
- **내용**: `components/pinboard/FlashcardTab.tsx`
  - 퀴즈 연동: `quiz_sets`(AI 생성) + `video_quizzes`(선생님 수동 등록) 두 컬렉션 추가 읽어 우선순위 병합
  - UI: 어두운 zinc 계열 → sky/violet/rose/amber 등 8색 파스텔 순환. 플립카드 전면 amber-50, 뒷면 sky-50

### [개선] ResultClient — ClassWall 퀴즈 양방향 연동
- **내용**: `app/result/[sessionId]/ResultClient.tsx`
  - `quiz_sets`의 `multiple_choice` 문제 중 `timestamp` 있는 것을 `video_quizzes` 포맷으로 변환 → 영상 팝업 퀴즈로 표시
  - ClassWall에서 만든 퀴즈가 결과 페이지에도 반영되는 양방향 연동

### [개선] claude.ts — learning 퀴즈 프롬프트 2단계 재작성
- **내용**: "1단계: 제목에서 대상 학년/과목 파악 → 2단계: 해당 과목에 맞는 문제 유형 출제". 교사 관점 질문·자막 단순 요약 금지 명시

### [개선] types/summary.ts — QuizQuestion timestamp 추가
- **내용**: `QuizQuestion` 인터페이스에 `timestamp?: string` 추가 → 퀴즈 문제↔영상 구간 양방향 연동 활용

---

## 2026-04-28

### [기능] 크롬 익스텐션 신규
- **내용**: YouTube 영상 페이지에 "쏙튜브 요약저장" 버튼 주입. 클릭 시 /api/summarize 호출 후 /api/extension/save로 자동 저장
- **구현**: `chrome-extension/` 폴더 신설 (manifest.json v3, background.js, content-youtube.js, content-ssoktube.js, injected.js, popup.html/js)
- **인증**: injected.js가 Firebase IndexedDB에서 토큰 직접 읽어 chrome.storage 저장. 토큰 만료 시 refreshToken으로 자동 갱신
- **API**: `/api/extension/save` 신설 — CORS 허용, Bearer 토큰 검증, summaries→saved_summaries 저장 (savedFromExtension:true)
- **TODO**: 아이콘 제작 후 Chrome Web Store 배포 필요 (TODO.md 참고)

### [기능] 클래스룸 폴더 배포/회수 시스템
- **내용**: 교사가 폴더를 클래스에 배포(distribute) / 회수(recall). 하위폴더 트리 전체 BFS 일괄 처리
- **구현**: `/api/classroom/distribute`, `/api/classroom/recall` 신설 — `distributedClassCodes` 배열 필드를 arrayUnion/arrayRemove로 관리
- **학생 조회**: `/api/classroom/distributed-folders` (내 클래스에 배포된 폴더 목록), `/api/classroom/distributed-videos` (폴더 내 영상)
- **학생 가입 개선**: `enroll` API에서 Admin SDK로 custom claim(classCode, role:student) 설정 + 교사 masterFolder 복제 서버사이드 처리 (보안 규칙 우회)

### [기능] 워크시트 저장/관리
- **내용**: 영어 워크시트 생성 후 Firestore `saved_worksheets`에 저장, 마이페이지 "워크시트" 탭에서 열람/삭제
- **구현**: `components/worksheet/SavedWorksheets.tsx` 신설. `lib/db.ts`에 `saveWorksheet`, `getSavedWorksheets`, `deleteSavedWorksheet` 추가
- **WorksheetPanel**: userId, sessionId, videoId, videoTitle, channel, thumbnail props 추가로 저장 기능 연결

### [개선] 결과 페이지 다수 개선
- **isClassView 모드**: `?classView=1` 파라미터 시 저장버튼 숨김, 이탈방지 경고 비활성화, 수업 시청 로그 자동 기록
- **자막 탭**: 한글/영어 원문 토글 (`transcriptOriginal` 필드 활용), 클립보드 복사 버튼 추가
- **퀴즈 재도전**: 완료 횟수 localStorage 저장, "재도전 (N회 완료)" 버튼 표시. 선생님은 🔄 버튼으로 퀴즈 강제 재생성 가능
- **퀴즈 캐시**: `quiz_sets` Firestore 컬렉션에 videoId/sessionId 키로 저장 — 같은 영상 재방문 시 즉시 로드

### [개선] PDF 분석 개선
- **Firebase Storage 저장**: 업로드된 PDF 원본을 `pdfs/{sessionId}.pdf` 경로에 저장
- **프록시 API**: `/api/pdf/[sessionId]` 신설 — Admin SDK로 Storage에서 PDF 제공 (직접 URL 노출 없이)
- **페이지 번호 마킹**: Gemini 추출 시 `[PAGE N]` 형식으로 페이지 구분 → PDF 구간 이동 가능
- **용량 제한**: 20MB → 30MB로 완화

### [개선] 헤더 로고 이미지 적용
- **내용**: 텍스트 "SSOKTUBE" → logo.png 이미지 로고로 교체
- **추가**: 모든 네비 링크에 `active:scale-95`, `select-none` 적용으로 모바일 터치 UX 개선

### [개선] summarize API — 선택적 인증 + 원문 자막 보존
- **선택적 인증**: Authorization 헤더 있으면 userId/userDisplayName을 summaries에 기록 (없어도 동작)
- **transcriptOriginal**: 영어 자막 번역 전 원문 별도 저장 → 결과 페이지 자막 탭 한/영 토글에 활용

### [개선] 블로그 초안 — 목차 추가
- **내용**: 미리보기 탭 상단에 소제목 목차 박스 추가, 각 소제목에 `id` 부여해 스크롤 이동 연결

---

## 2026-04-20 (세션 2)

### [개선] AI 댓글 truncation 감지 + 경고 표시
- **증상**: AI 댓글이 문장 중간에 잘려 출력됨. 유저가 왜 잘리는지 몰라 혼란
- **원인**: `maxOutputTokens: 1500` 너무 작음. `finishReason === 'MAX_TOKENS'`일 때 감지 안 함
- **해결**: `ai-comment/route.ts` `maxOutputTokens: 8192`로 증가. `finishReason` 체크해 `truncated` 플래그 반환. `CommentSection.tsx`에서 `_truncated: true` 저장, `⚠️ 응답이 길어 일부가 잘렸습니다.` 경고 표시

### [버그] 자동수집 영상 제목 영어로 나옴
- **증상**: 자동수집된 스퀘어 카드에 영어 제목 영상들이 포함됨
- **원인**: `auto-collect/route.ts` 최근 리라이트에서 `searchVideoIds()`에 `regionCode=KR`, `relevanceLanguage=ko` 누락
- **해결**: `searchVideoIds()`에 두 파라미터 추가

### [개선] 로딩 UX — 경과시간·안내메시지·pulse 추가
- **증상**: 자막 추출 등 오래 걸릴 때 유저 이탈 (30초만 넘어도 체감 길음)
- **해결**: `LoadingSteps.tsx` 전면 개선. 단계별 경과시간 표시, 30초 초과 시 안내메시지 박스(5종 30초마다 순환), 프로그레스바 animate-pulse, 총 경과시간 표시

### [버그] Firestore platformReactions: undefined write 오류
- **증상**: 매거진 저장 시 Firestore write 실패 — undefined 필드 불허
- **원인**: `magazine.ts`에서 `parsed.platformReactions ?? null` → null도 Firestore에 쓰여서 실제로는 문제 아니었으나, `magazine-server.ts`에서 undefined 필드 포함 채로 set()
- **해결**: `saveCuratedPostAdmin`에서 `Object.entries(...).filter(([, v]) => v !== undefined)`로 undefined 필드 제거 후 저장

### [기능] 어드민 스퀘어 관리 — 카드에서 직접 숨김/삭제
- **증상**: 불량 콘텐츠 수동 정리 방법 없음
- **해결**: `app/api/admin/square/route.ts` 신설(POST 목록조회, PATCH hide/show/delete). `SquareClient.tsx`에 어드민 모드 감지 + hover 시 숨김(노란)/삭제(빨간) 버튼. `admin/page.tsx`에 스퀘어 관리 탭 추가(검색·페이지네이션·숨김영상 포함 보기)

### [기능] 자동수집 품질 필터 + 댓글 추출
- **증상**: 쇼츠·반복자막 등 저품질 영상이 수집됨
- **해결**: `MIN_DURATION_SEC=180`(3분 미만 제외), `isRepetitiveTranscript()`(고유문장 비율 <20% 폐기), `fetchQualifiedVideos()`(duration+viewCount 배치조회·인기순 정렬), `generateYtCommentSummary()`(Gemini 280자 댓글 요약) 추가

### [기능] 일본 런칭 플랜 + 공유하기 확장 플랜 문서화
- **해결**: `JAPAN.md`(5단계 런칭 로드맵), `SHARE.md`(카카오→Slack→Notion) 신설. `CLAUDE.md` 세션 시작 필독 목록에 추가

### [버그] Vercel 타임아웃 — vercel.json이 route maxDuration 무시
- **증상**: summarize route에 `export const maxDuration = 300` 설정했으나 실제 120초에 타임아웃
- **원인**: `vercel.json`의 functions 설정이 route 레벨 설정을 override
- **해결**: `vercel.json` `app/api/summarize/route.ts` maxDuration을 300으로 수정

---

## 2026-04-20

### [개선] 유튜브 댓글 요약 시점 통합 (중복 SocialKit 호출 제거)
- **증상**: 매거진 발행 시 SocialKit 댓글 API 재호출 — 요약 때도, 매거진 때도 각각 호출
- **해결**: `summarize/route.ts` Phase 1 병렬 배치에 `fetchVideoComments` 추가, Phase 3에 `generateYtCommentSummary` 추가. `ytCommentSummary`(280자 표시용) + `ytCommentsContext`(매거진 프롬프트용 raw) 모두 `saved_summaries`에 저장. `generate-post/route.ts`에서 `ytCommentsContext` 존재 시 SocialKit 스킵. `ResultClient.tsx`에서 저장된 값 우선 사용 후 없으면 fallback API 호출. 딜레이 없음 (모두 병렬)

### [기능] 유튜브 시청자 반응 요약 섹션 추가
- **증상**: 요약 결과 페이지에 유튜브 댓글 관련 정보 없음
- **해결**: `app/api/yt-comment-summary/route.ts` 신설 — SocialKit으로 인기 댓글 30개 수집 후 Gemini가 방향성(긍정/부정/혼재, 주요 언급 포인트) 280자 요약. `ResultClient.tsx`에 lazy 로드 카드 추가 (videoId 확정 후 백그라운드 fetch, CommentSection 위에 표시)

### [기능] 자동 수집 크론 추가 (auto-collect)
- **증상**: 매거진/요약 콘텐츠가 수작업 의존 — 자동 누적 없음
- **해결**: `app/api/cron/auto-collect/route.ts` 신설. YouTube Data API로 뉴스/자기계발/여행/팁/영어/요리 6개 카테고리에서 KR 핫한 영상 자동 검색 → 자막 추출 → 분류·요약 → `saved_summaries` 저장(`autoCollected:true`). 1회 실행 시 3개 카테고리 로테이션(UTC 시간 기반). `vercel.json`에 KST 새벽 4시(UTC 19:00) 크론 추가, maxDuration 120s 등록

---

### [기능] 매거진 하단 관련 포스트 + CTA 추가
- **증상**: 매거진 글 읽고 바로 이탈 — 내부 링크 없어 체류시간 짧음
- **원인**: 하단 CTA가 SQUARE K 버튼 하나뿐
- **해결**: `magazine-server.ts`에 `getRelatedPostsAdmin()` 추가(같은 카테고리 우선, 부족하면 최신순), `page.tsx`에서 서버사이드 조회 후 전달, `MagazinePostClient.tsx`에 관련 매거진 카드 3개 + "AI 요약하기" / "SQUARE K" 2단 CTA 추가

### [기능] 매거진에 SSOKTUBE 플랫폼 댓글 반영
- **증상**: 매거진 시청자반응 섹션이 유튜브 댓글만 사용, 플랫폼 자체 댓글/세그먼트 말풍선 미반영
- **원인**: `generateMagazinePost`에 플랫폼 댓글 파라미터 없음
- **해결**: `magazine-server.ts`에 `getPlatformCommentsBySessionIdAdmin()` 추가, `magazine.ts` 프롬프트·타입에 `platformReactions` 추가, `generate-post/route.ts` GET·POST 모두 플랫폼 댓글 병렬 수집 후 전달, `MagazinePostClient.tsx`·`CurationTab.tsx` 렌더링 추가 (초록색 "SSOKTUBE 학습자 반응" 섹션)

### [개선] 매거진 SEO 프롬프트 강화
- **증상**: H2/H3 제목 키워드 배치, FAQ People Also Ask 최적화, featured snippet 구조 미명시
- **해결**: `magazine.ts` 프롬프트에 키워드 H2/H3 배치 규칙, FAQ 첫 문장 키워드 재포함, featured snippet 도입부 구조 추가

---

## 2026-04-20

### [기능] 매거진 URL 지정 수동 생성
- **증상**: 어드민에서 특정 요약 페이지를 지정해 매거진을 바로 만들 수 없었음
- **원인**: 기존 수동 트리거는 자동 선택 알고리즘(hotScore)에 의존
- **해결**: `lib/magazine-server.ts`에 `getSummaryBySessionIdAdmin()` 추가, `app/api/cron/generate-post/route.ts` POST에 `sessionId` 파라미터 처리, `components/admin/CurationTab.tsx` "지금 바로 생성" 섹션에 URL 입력 + 초안/즉시발행 버튼 추가. 요약 URL(`/result/SESSION_ID`) 또는 sessionId 직접 입력 지원

---

## 2026-04-19 (추가)

### [기능] 어드민 GA4 대시보드 링크 추가
- **증상**: 어드민 Analytics 탭에서 실시간 방문자·페이지뷰 등 트래픽 통계를 볼 수 없었음
- **원인**: GA4 Data API 연동 복잡도 대비 실익 낮음 (쿼터 제한, 추가 인증 필요)
- **해결**: `components/admin/AnalyticsTab.tsx` 상단에 GA4 외부 링크 배너 추가. DB 기반 지표(가입·분석 수)는 기존 유지, 트래픽 지표는 GA4 직접 링크로 연결

---

## 2026-04-19

### [개선] Gemini STT 폴백 추가
- **증상**: SocialKit이 404 반환하는 영상(스포츠 하이라이트 등) 자막 추출 실패 → description 기반 저품질 요약
- **원인**: SocialKit이 해당 영상 오디오에 접근 불가 (이유 불명확)
- **해결**: `lib/transcript.ts`에 Gemini 2.5-flash YouTube 네이티브 처리 폴백 추가. SocialKit 실패 시 자동으로 Gemini STT 시도

### [이슈] text-embedding-004 deprecated
- **증상**: `/api/embed` 500 에러 — `text-embedding-004 is not found for API version v1beta`
- **원인**: Google이 text-embedding-004 모델 deprecated
- **해결**: `app/api/embed/route.ts` → `text-embedding-005`로 변경

### [이슈] 매거진 댓글 API 500 에러
- **증상**: `/api/magazine/comments?postId=...` 500 반환
- **원인**: Firestore `where + orderBy` 복합 인덱스 미생성
- **해결**: `orderBy` 제거하고 JS에서 `sort()` 처리

### [이슈] AI 댓글 문장 중간 잘림 (2차)
- **증상**: AI 댓글이 "그의" 같은 조사/단어 중간에서 잘림
- **원인**: `maxOutputTokens: 600` — 한글 300자 ≈ 600토큰인데 시스템 프롬프트 토큰까지 합산되면 이미 초과
- **해결**: `app/api/ai-comment/route.ts` `maxOutputTokens` 600 → 1500. 실제 길이 제한은 코드(350자)가 담당하므로 토큰은 여유 있게 설정

### [이슈] AI 반응 MAX_TOKENS 에러
- **증상**: AI 반응 버튼 클릭 시 "AI 응답이 너무 길어 잘렸습니다" 에러
- **원인**: `MAX_TOKENS` finish reason 감지 즉시 throw — 350자 제한 로직 도달 전에 에러 처리
- **해결**: `app/api/ai-comment/route.ts` MAX_TOKENS throw 제거. 잘린 응답도 350자 제한 로직이 처리하도록

### [이슈] 헤더 매거진 링크 2개 중복
- **증상**: 상단 네비게이션에 "매거진" 메뉴가 2개 표시
- **원인**: if/else 블록 내부 + 외부에 각각 Link 추가됨
- **해결**: `components/common/Header.tsx` 103번 줄 중복 링크 제거

### [개선] 요약 API 병렬화
- **증상**: 요약 시 딜레이 체감
- **원인**: `getVideoInfo` + `getTranscript` + `getVideoMeta` 순차 실행, `getVideoInfo` 내부도 SocialKit + YouTube HTML 순차
- **해결**: `app/api/summarize/route.ts` Promise.all로 병렬화. 예상 10-15초 단축

### [이슈] 발행된 매거진 포스트 FAQ/체크리스트/시청자반응 미표시
- **증상**: 초안 미리보기엔 FAQ·핵심체크리스트·시청자반응 보이는데 발행본엔 없음
- **원인**: `MagazinePostClient.tsx` 작성 시 `post.body`(마크다운)만 렌더링, `faq`·`checklist`·`comments` 필드 렌더링 코드 누락
- **해결**: `app/magazine/[slug]/MagazinePostClient.tsx`에 FaqItem 컴포넌트, 체크리스트 섹션, 시청자반응 섹션 추가

---

## 2026-04-18 (이전 대화 기준)

### [이슈] SquareClient 빌드 에러 (syntax error)
- **증상**: SquareClient.tsx 911번 줄 `)}` 문법 에러로 빌드 실패
- **원인**: 매거진 탭을 `<Link>`로 전환하면서 삼항연산자 제거 후 닫는 괄호 잔여
- **해결**: 잔여 `)}` 제거

### [이슈] SaveModal 타입 에러
- **증상**: `onClick={onClose}` 타입 불일치 빌드 에러
- **원인**: `onClose: (saved?: SavedResult) => void` 로 시그니처 변경 후 MouseEvent 전달 케이스 미처리
- **해결**: `onClick={() => onClose()}`로 수정

### [이슈] 모바일 저장 버튼 상태 미갱신
- **증상**: 저장 완료 후에도 버튼이 "저장하기"로 남아있음
- **원인**: 저장 후 Firestore 재조회 로직이 모바일에서 실패하면서 상태 미업데이트
- **해결**: `SaveModal.onClose`에 `SavedResult` 직접 전달, 재조회 없이 상태 업데이트

### [이슈] 매거진 연관영상 링크 클릭 시 에러
- **증상**: 매거진 포스트 내 영상 링크 클릭 → "요약을 불러오지 못했습니다"
- **원인**: `summaryIds`에 Firestore doc ID가 저장됐어야 하는데 `sessionId` 필드값이 저장됨
- **해결**: `lib/magazine.ts` → `summaryIds: [item.sessionId || item.id]`

### [이슈] 매거진 글 목록 Square K에 미노출
- **증상**: Square K 매거진 탭에 발행된 글 안 뜸
- **원인**: Firestore `where(status==published) + orderBy(publishedAt)` 복합 인덱스 없음
- **해결**: `orderBy` 제거, JS에서 `.sort()` 처리

### [이슈] AI 자동분류 저장 시 폴더 중복 생성
- **증상**: 같은 이름 폴더가 여러 개 생성됨
- **원인**: `createFolder`에 중복 체크 없음 + 대소문자/공백 미정규화로 비교 실패
- **해결**: `lib/db.ts` `createFolder`에 trim+toLowerCase 정규화 후 기존 폴더 반환 로직 추가

---

## 자막 추출 기술 히스토리

| 시도 | 결과 | 이유 |
|------|------|------|
| Gemini YouTube 네이티브 처리 (1차) | 실패 | 당시 API 차단 |
| Cloudflare 우회 | 실패 | 개인 사용자 불허 정책 |
| SocialKit | 성공 → 현재 1순위 | 유료($17/4000크레딧), 안정적 |
| Gemini YouTube 네이티브 처리 (2차, 2026-04-19) | 성공 | API 정책 변경 추정, SocialKit 실패 시 폴백으로 추가 |
