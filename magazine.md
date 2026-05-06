# SSOKTUBE AI 매거진 시스템 완전 가이드

> 초보자도 이해할 수 있는 전체 구조 + 티스토리/블로거 자동 발행 확장 가이드

---

## 목차

1. [전체 흐름 한눈에 보기](#1-전체-흐름-한눈에-보기)
2. [파이프라인 4단계 상세 설명](#2-파이프라인-4단계-상세-설명)
3. [자동 실행 스케줄 (Vercel Cron)](#3-자동-실행-스케줄-vercel-cron)
4. [Firestore 데이터 구조](#4-firestore-데이터-구조)
5. [관리자 설정 항목](#5-관리자-설정-항목)
6. [수동 발행 방법](#6-수동-발행-방법)
7. [티스토리 자동 발행 확장](#7-티스토리-자동-발행-확장)
8. [블로거 자동 발행 확장](#8-블로거-자동-발행-확장)
9. [환경 변수 전체 목록](#9-환경-변수-전체-목록)
10. [자주 묻는 질문](#10-자주-묻는-질문)

---

## 1. 전체 흐름 한눈에 보기

```
매일 3회 자동 실행 (KST 06:00 / 14:00 / 22:00)

  ① AI Scout           ② AI Evaluate         ③ AI Summarize        ④ Generate Post
┌─────────────────┐  ┌─────────────────────┐  ┌────────────────────┐  ┌──────────────────────┐
│ YouTube API로   │  │ 후보들의 자막을      │  │ 1등 영상을         │  │ 요약 데이터 +        │
│ 후보 영상 수집  │→ │ 가져와서 AI 2명이   │→ │ 전체 요약 생성     │→ │ 유튜브 댓글로        │
│                 │  │ 점수 매기고 순위 결정│  │ → saved_summaries  │  │ Gemini이 매거진 글   │
│ ai_scout_queue  │  │ ai_evaluate_queue    │  │ (Square K에도 노출)│  │ 작성 → curated_posts │
└─────────────────┘  └─────────────────────┘  └────────────────────┘  └──────────────────────┘
      :00                    :10                      :20                      :30
                                                                                    ↓
                                                                    autoPublish ON → 즉시 발행
                                                                    autoPublish OFF → 초안 저장
                                                                                    ↓
                                                                         ssoktube.com/magazine
```

**핵심 포인트:**
- 사람이 개입하지 않아도 YouTube → AI 심사 → 요약 → 매거진 글 → 발행이 자동으로 됨
- 하루에 3번 실행되며, 각 회차마다 카테고리가 다름 (뉴스 / AI도구 / AI활용)
- `autoPublish` 설정이 OFF면 초안으로만 저장되고 관리자가 직접 발행 버튼을 눌러야 함

---

## 2. 파이프라인 4단계 상세 설명

### 단계 ①: AI Scout — 후보 수집
**파일:** `app/api/cron/ai-scout/route.ts`

YouTube Data API로 아래 3가지 방식으로 영상을 수집합니다:
- **화이트리스트 채널**: 관리자가 등록한 신뢰 채널 최신 영상
- **키워드 검색**: "AI 뉴스", "ChatGPT 활용" 등 카테고리별 검색어
- **중복 체크**: 이미 요약된 영상(`saved_summaries`)은 자동으로 제외

수집된 후보들은 Firestore `ai_scout_queue`에 저장됩니다.

---

### 단계 ②: AI Evaluate — AI 심사
**파일:** `app/api/cron/ai-evaluate/route.ts`

Scout에서 모은 후보 영상들을 심사합니다:
1. 각 영상의 자막을 가져옴 (자막 없거나 너무 짧으면 탈락)
2. **AI 심사관 2명**이 독립적으로 점수를 매김 (내용 품질, 정보성, 독창성 등)
3. 두 심사관의 점수를 합산해 최종 순위 결정
4. 결과를 `ai_evaluate_queue`에 저장

> 왜 AI 심사관이 2명인가? 한 명의 편향을 방지하기 위해 교차 검증합니다.

---

### 단계 ③: AI Summarize — 영상 요약
**파일:** `app/api/cron/ai-summarize/route.ts`

Evaluate에서 1위를 차지한 영상을 심층 요약합니다:
1. 유튜브 댓글 수집 (인기 댓글 + 최신 댓글)
2. Claude AI로 요약 3종 생성:
   - **contextSummary**: 영상 핵심 내용 요약
   - **reportSummary**: 심층 분석 리포트
   - **카테고리 분류**: AI 소식 / AI 도구 / AI 활용
3. 결과를 `saved_summaries`에 저장
4. **Square K(스퀘어 케이)** 피드에도 동시 노출됨

---

### 단계 ④: Generate Post — 매거진 글 생성
**파일:** `app/api/cron/generate-post/route.ts`

요약 데이터를 바탕으로 완성된 매거진 글을 작성합니다:

1. `saved_summaries`에서 미발행 요약 픽업 (우선순위 순):
   - 1순위: `ai_pipeline_state` (최신 파이프라인)
   - 2순위: `ai_pipeline` 슬롯 문서 (이전 방식)
   - 3순위: `saved_summaries` 전체에서 최신 순 폴백

2. **Gemini 2.5 Flash**로 아래 내용 자동 생성:
   - SEO 최적화 제목 / 메타 설명 / 슬러그
   - 본문 (마크다운, 최소 800자, 섹션별 구성)
   - 목차 (## 헤딩 기반)
   - FAQ 5개 (Google People Also Ask 최적화)
   - 심층 분석 (핵심 개념 설명 + 배경 맥락 + 실천 단계)
   - 유튜브 댓글 분석 (인기/최신 댓글 경향 요약)

3. Firestore `curated_posts`에 저장
4. `autoPublish: true`면 `status: 'published'`로 즉시 발행
5. 원본 요약에 `postedToMagazine: true` 마킹 (중복 방지)

---

## 3. 자동 실행 스케줄 (Vercel Cron)

**파일:** `vercel.json`

| 회차 | KST 시각 | UTC 시각 | 카테고리 |
|------|----------|----------|----------|
| 1회차 | 06:00 ~ 06:30 | 21:00 ~ 21:30 | AI 소식 (news) |
| 2회차 | 14:00 ~ 14:30 | 05:00 ~ 05:30 | AI 도구 (tools) |
| 3회차 | 22:00 ~ 22:30 | 13:00 ~ 13:30 | AI 활용 (usecases) |

각 회차 내 순서:
```
:00  → ai-scout     (후보 수집, 최대 60초)
:10  → ai-evaluate  (AI 심사, 최대 120초)
:20  → ai-summarize (요약 생성, 최대 120초)
:30  → generate-post (글 생성 + 발행, 최대 120초)
```

> **주의:** Vercel Hobby 플랜은 Cron Job을 하루 1회로 제한합니다. Pro 플랜 이상이어야 하루 3회 작동합니다.

---

## 4. Firestore 데이터 구조

```
Firestore
│
├── ai_scout_queue/          ← 스카우트된 영상 후보 (임시)
│   └── {videoId}
│       ├── title, channel, thumbnail
│       ├── viewCount, durationSec
│       └── subcategory (news/tools/usecases)
│
├── ai_evaluate_queue/       ← AI 심사 완료 후보 (임시)
│   └── {docId}
│       ├── 위 정보 + score, rank
│       └── transcriptLength
│
├── ai_pipeline_state/       ← 파이프라인 진행 상태 추적
│   └── {subcategory}_{runId}
│       ├── pipelineStatus (scout/evaluate/summarized/published)
│       └── savedSummaryId
│
├── saved_summaries/         ★ 핵심 — Square K + 매거진 공용
│   └── {sessionId}
│       ├── title, channel, thumbnail, videoId
│       ├── contextSummary, reportSummary
│       ├── category, topicCluster, tags
│       ├── ytCommentsContext (유튜브 댓글)
│       ├── isPublic (Square K 노출 여부)
│       └── postedToMagazine (매거진 발행 여부)
│
├── curated_posts/           ★ 핵심 — 매거진 포스트
│   └── {postId}
│       ├── title, subtitle, slug
│       ├── body (마크다운 본문)
│       ├── heroThumbnail, tags, topicCluster
│       ├── faq[], deepDive{}, comments{}
│       ├── status ('draft' | 'published')
│       ├── publishedAt, createdAt
│       └── viewCount, likeCount
│
├── magazine_logs/           ← 발행 로그 (디버깅용)
│   └── {logId}
│       ├── status (success/error/skipped)
│       ├── triggerType (cron/manual)
│       └── postTitle, videoTitle, error
│
└── settings/curation        ★ 매거진 설정 (단일 문서)
    ├── enabled (자동화 ON/OFF)
    ├── autoPublish (즉시 발행 여부)
    ├── schedule (발행 주기)
    ├── lookbackDays (최근 N일 영상 기준)
    └── lastGeneratedAt
```

---

## 5. 관리자 설정 항목

**위치:** `/admin` 페이지 → 매거진 설정 탭

| 설정 | 설명 | 기본값 |
|------|------|--------|
| `enabled` | 자동 크론 ON/OFF | OFF |
| `autoPublish` | 생성 즉시 자동 발행 (OFF면 초안으로 저장) | OFF |
| `schedule` | 발행 주기 (Cron 스케줄과 별개로 중복 방지용) | 1x_daily |
| `lookbackDays` | 최근 N일 이내 영상만 대상으로 함 | 5 |
| `dailyLimit` | 하루 최대 발행 수 | 1 |
| `categoryFilter` | 특정 카테고리만 발행 (비어있으면 전체) | [] |
| `autoCollectEnabled` | 유튜브 자동 수집 크론 ON/OFF | OFF |

---

## 6. 수동 발행 방법

### 방법 A: 관리자 페이지에서 버튼 클릭
`/admin` → "매거진 생성" 버튼 → 자동으로 요약 선택 후 글 생성

### 방법 B: API 직접 호출
```bash
# 자동으로 최적 요약 선택해서 글 생성
curl -X POST https://ssoktube.com/api/cron/generate-post \
  -H "Content-Type: application/json" \
  -d '{"force": true, "autoPublish": true}'

# 특정 영상 요약으로 글 생성
curl -X POST https://ssoktube.com/api/cron/generate-post \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc123", "autoPublish": true}'
```

### 방법 C: 초안 → 발행 수동 승인
1. `autoPublish: false` 상태에서 글 생성
2. `/admin` → curated_posts 목록에서 "발행" 버튼 클릭
3. `status: 'published'` + `publishedAt` 자동 기록

---

## 7. 티스토리 자동 발행 확장

### 준비사항

1. **티스토리 앱 등록**
   - https://www.tistory.com/guide/api/manage/register 접속
   - 앱 이름, 서비스 URL 입력 후 등록
   - `Client ID`와 `Client Secret` 발급

2. **Access Token 발급**
   - OAuth 2.0 인증 URL로 접속해 본인 계정으로 로그인
   - 발급된 `access_token`을 환경 변수에 저장
   - ⚠️ 티스토리 토큰은 **만료 기간이 없음** (재발급 불필요)

3. **환경 변수 추가** (`.env.local`)
   ```
   TISTORY_ACCESS_TOKEN=your_access_token_here
   TISTORY_BLOG_NAME=your-blog-name  # 예: myblog (https://myblog.tistory.com)
   TISTORY_CATEGORY_ID=12345          # 발행할 카테고리 ID (선택)
   ```

### 구현 방법

**파일 1: `lib/tistory.ts` 생성**
```typescript
// 티스토리 API 래퍼
const BASE = 'https://www.tistory.com/apis'

export interface TistoryPostResult {
  postId: string
  url: string
}

export async function publishToTistory(params: {
  title: string
  content: string         // HTML 형식
  tags: string[]
  categoryId?: string
  visibility?: 0 | 1 | 3  // 0=비공개, 1=보호, 3=공개
}): Promise<TistoryPostResult> {
  const token = process.env.TISTORY_ACCESS_TOKEN!
  const blogName = process.env.TISTORY_BLOG_NAME!

  const body = new URLSearchParams({
    access_token: token,
    output: 'json',
    blogName,
    title: params.title,
    content: params.content,
    visibility: String(params.visibility ?? 3),
    tag: params.tags.join(','),
    ...(params.categoryId ? { category: params.categoryId } : {}),
  })

  const res = await fetch(`${BASE}/post/write`, {
    method: 'POST',
    body,
  })

  if (!res.ok) throw new Error(`Tistory API error: ${res.status}`)

  const data = await res.json()
  if (data.tistory?.status !== '200') {
    throw new Error(`Tistory error: ${JSON.stringify(data.tistory)}`)
  }

  return {
    postId: data.tistory.postId,
    url: data.tistory.url,
  }
}
```

**파일 2: `generate-post/route.ts` 수정 포인트**

`saveCuratedPostAdmin(post)` 이후, `publishCuratedPostAdmin(id)` 다음에 추가:

```typescript
// 티스토리 자동 발행 (shouldPublish && 토큰 있을 때)
if (shouldPublish && process.env.TISTORY_ACCESS_TOKEN) {
  try {
    const { publishToTistory } = await import('@/lib/tistory')
    const { buildHtmlForExport } = await import('@/lib/magazineHtml')
    
    const tistoryResult = await publishToTistory({
      title: post.title,
      content: buildHtmlForExport(post),  // HTML 변환
      tags: post.tags.slice(0, 10),
      categoryId: process.env.TISTORY_CATEGORY_ID,
    })
    
    // Firestore에 티스토리 URL 기록
    await db.collection('curated_posts').doc(id).update({
      tistoryUrl: tistoryResult.url,
      tistoryPostId: tistoryResult.postId,
    })
    
    console.log(`[Tistory] Published: ${tistoryResult.url}`)
  } catch (e) {
    console.error('[Tistory] Publish failed (non-critical):', e)
    // 티스토리 실패해도 SSOKTUBE 발행은 정상 진행
  }
}
```

### HTML 변환 함수

기존 `BlogDraftModal.tsx`의 `buildHtml()` 함수를 `lib/magazineHtml.ts`로 분리해서 공용화:

```typescript
// lib/magazineHtml.ts
import type { CuratedPost } from './magazine'

export function buildHtmlForExport(post: CuratedPost): string {
  // 목차, 본문 섹션, FAQ, 댓글 분석을 HTML로 변환
  // BlogDraftModal.tsx의 buildHtml() 로직 재사용
  // ...
}
```

### 티스토리 발행 결과

```
curated_posts/{id} 에 추가되는 필드:
├── tistoryUrl: "https://myblog.tistory.com/123"
└── tistoryPostId: "123"
```

---

## 8. 블로거 자동 발행 확장

### 준비사항

1. **Google Cloud Console 설정**
   - https://console.cloud.google.com 접속
   - 새 프로젝트 생성 → Blogger API v3 활성화
   - 서비스 계정(Service Account) 생성 → JSON 키 다운로드
   - Blogger 관리 화면에서 서비스 계정 이메일을 **편집자**로 초대

2. **Blog ID 확인**
   - `https://www.blogger.com/blog/posts/{blogId}` 형식의 숫자 ID
   - 또는 블로거 대시보드 URL에서 확인

3. **환경 변수 추가** (`.env.local`)
   ```
   BLOGGER_BLOG_ID=1234567890123456789
   GOOGLE_SERVICE_ACCOUNT_EMAIL=my-bot@project.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   ```

### 구현 방법

**파일: `lib/blogger.ts` 생성**
```typescript
import { GoogleAuth } from 'google-auth-library'

const BLOGGER_API = 'https://www.googleapis.com/blogger/v3'

async function getBloggerToken(): Promise<string> {
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/blogger'],
  })
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  return token.token!
}

export async function publishToBlogger(params: {
  title: string
  content: string   // HTML
  labels: string[]  // 태그
}): Promise<{ id: string; url: string }> {
  const token = await getBloggerToken()
  const blogId = process.env.BLOGGER_BLOG_ID!

  const res = await fetch(`${BLOGGER_API}/blogs/${blogId}/posts/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: params.title,
      content: params.content,
      labels: params.labels,
    }),
  })

  if (!res.ok) throw new Error(`Blogger API error: ${res.status}`)
  const data = await res.json()
  return { id: data.id, url: data.url }
}
```

> **의존성 설치 필요:**
> ```bash
> npm install google-auth-library
> ```

### generate-post에 추가하는 방식은 티스토리와 동일:

```typescript
if (shouldPublish && process.env.BLOGGER_BLOG_ID) {
  try {
    const { publishToBlogger } = await import('@/lib/blogger')
    const bloggerResult = await publishToBlogger({
      title: post.title,
      content: buildHtmlForExport(post),
      labels: post.tags.slice(0, 20),
    })
    await db.collection('curated_posts').doc(id).update({
      bloggerUrl: bloggerResult.url,
      bloggerPostId: bloggerResult.id,
    })
  } catch (e) {
    console.error('[Blogger] Publish failed (non-critical):', e)
  }
}
```

---

## 9. 환경 변수 전체 목록

### 현재 운영 중 (필수)
```bash
# Firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_KEY=     # JSON 전체를 문자열로

# AI
GOOGLE_GENERATIVE_AI_API_KEY=     # Gemini (매거진 글 생성)
ANTHROPIC_API_KEY=                # Claude (요약 생성)

# YouTube
YOUTUBE_API_KEY=                  # 영상 검색 + 메타데이터

# Cron 보안
CRON_SECRET=                      # Vercel Cron 인증용 시크릿
```

### 티스토리 발행 추가 시
```bash
TISTORY_ACCESS_TOKEN=
TISTORY_BLOG_NAME=                # 서브도메인 이름 (myblog.tistory.com → myblog)
TISTORY_CATEGORY_ID=              # (선택) 발행할 카테고리 ID
```

### 블로거 발행 추가 시
```bash
BLOGGER_BLOG_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
```

---

## 10. 자주 묻는 질문

**Q. 글이 자동으로 발행이 안 돼요**
→ `/admin` 설정에서 `enabled: true`, `autoPublish: true` 확인
→ Vercel 대시보드 → Functions → Cron Jobs에서 마지막 실행 결과 확인
→ Firestore `magazine_logs` 컬렉션에서 error 메시지 확인

**Q. 같은 영상이 중복 발행돼요**
→ `saved_summaries/{sessionId}.postedToMagazine` 필드가 `true`로 마킹되어 있어야 함
→ 마킹이 안 됐으면 Firestore에서 직접 수정

**Q. Square K에는 나오는데 매거진에 안 나와요**
→ Square K 노출: `saved_summaries.isPublic = true` 조건
→ 매거진 노출: `curated_posts.status = 'published'` 조건
→ 두 조건은 독립적. `postedToMagazine = false`인 요약이 있으면 수동으로 generate-post 호출

**Q. 티스토리/블로거 발행이 실패해도 SSOKTUBE 매거진은 정상 발행되나요?**
→ 네. 외부 발행 실패는 `console.error`로만 기록되고 전체 프로세스를 막지 않습니다.
→ Vercel 로그에서 `[Tistory] Publish failed` 메시지로 확인 가능

**Q. 카테고리별 발행 시각을 바꾸고 싶어요**
→ `vercel.json`의 `crons` 배열에서 schedule(UTC 기준 cron 표현식) 수정
→ 수정 후 `git push`하면 자동 반영

**Q. 티스토리 Access Token이 만료되나요?**
→ 티스토리 토큰은 만료 없음. 한 번 발급하면 계속 사용 가능
→ 단, 앱 설정 변경이나 비밀번호 변경 시 재발급 필요

---

*최종 업데이트: 2026-05-06*
*작성: Claude Sonnet 4.6 (SSOKTUBE 프로젝트)*
