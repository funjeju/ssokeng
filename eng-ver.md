# English Version — Project Setup Guide

이 파일은 nextcurator 한국판을 기반으로 영어판 독립 프로젝트를 시작할 때 참고하는 가이드다.
새 프로젝트에서 Claude에게 이 파일을 먼저 읽게 하고 작업을 시작할 것.

---

## 왜 별도 프로젝트인가

- 영어권 교실 구조가 한국판과 다르게 진화할 가능성이 높음
- NEIS(나이스) API는 한국 전용 → 영어판에서 완전 제거
- 통계/사용자 풀을 분리해야 함
- 코드베이스를 묶으면 한국판 빠른 이터레이션이 영어판에 영향을 줄 위험

---

## 초기 세팅 체크리스트

### 1. 폴더 복사
```
nextcurator/ 를 복사 → 새 폴더명으로 변경
node_modules/ 는 복사 안 해도 됨
```
```bash
npm install
```

### 2. Firebase 프로젝트 새로 생성 (필수)
한국판 DB와 완전히 분리해야 함.
- Firebase Console에서 새 프로젝트 생성
- Firestore, Authentication(Email/Password + Google) 활성화
- 서비스 계정 키 발급 (FIREBASE_SERVICE_ACCOUNT_KEY)

### 3. .env.local 새로 세팅
```
# Firebase (새 프로젝트 값으로)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_SERVICE_ACCOUNT_KEY=

# AI (한국판과 동일 키 사용 가능)
GOOGLE_GENERATIVE_AI_API_KEY=
ANTHROPIC_API_KEY=

# SocialKit (자막 추출용, 한국판과 동일 키 사용 가능)
SOCIALKIT_API_KEY=
SOCIALKIT_MP3_ENDPOINT=

# 영어판은 NEIS 키 불필요 (제거)
# NEIS_API_KEY= ← 삭제

# 어드민
ADMIN_UIDS=
```

### 4. Vercel 새 프로젝트로 배포
- 한국판과 별도 Vercel 프로젝트
- 위 env 변수 모두 Vercel 대시보드에도 등록
- 도메인 별도 연결

---

## 한국판에서 제거할 것들

### NEIS API 관련 (학교 검색)
- `app/api/classroom/school-search/route.ts` → 삭제
- `components/classroom/SchoolSearchInput.tsx` → 삭제
- `app/classroom/setup/page.tsx` → schoolName을 텍스트 직접 입력으로 교체
- `components/auth/ProfileSetupModal.tsx` → SchoolSearchInput → 일반 Input으로 교체
- `app/mypage/page.tsx` → 동일

### 학교명 입력 교체 방향
NEIS 자동완성 대신 단순 텍스트 입력으로:
```tsx
<Input placeholder="School name" value={schoolName} onChange={...} />
```
학교 코드/타입/지역 필드들도 불필요하므로 제거.

---

## 영어판에서 변경할 것들

### 1. AI 프롬프트 언어 전환 (`lib/claude.ts`)
현재 요약 프롬프트가 한국어 출력 전제로 작성됨.
각 카테고리 프롬프트에서:
- "한국어로" → 제거 또는 "in English"로 변경
- 예시 텍스트들 영어로 교체
- `generateContextSummary` 프롬프트도 영어 출력으로 수정

### 2. UI 텍스트 전면 영문화
컴포넌트 전체에 한국어 하드코딩 수백 군데.
주요 파일:
- `components/summary/SaveModal.tsx`
- `components/home/UrlInput.tsx`
- `app/classroom/` 전체
- `app/mypage/page.tsx`
- `components/auth/AuthModal.tsx`

i18n 라이브러리(next-intl) 도입보다 직접 영문으로 교체하는 게 초기엔 빠름.

### 3. 학년/반 라벨
한국판: 학년(grade), 반(classNum)
영어판: Grade, Class (숫자 그대로, 라벨만 변경)

### 4. 카테고리명
한국판 카테고리 그대로 쓰되 라벨 영문화:
- 레시피 → Recipe
- 영어 → Language Learning (또는 제거)
- 학습 → Learning
- 뉴스 → News
- 자기계발 → Self-Development
- 여행 → Travel
- 이야기 → Story / Entertainment
- 팁&정보 → Tips & Info
- 리포트 → Report

---

## 그대로 유지하는 핵심 기능

### 교사→학생 영상 배포 시스템 (핵심 차별점)
영어권 에듀테크에서 "Google Classroom + YouTube 요약"을 하나로 합친 서비스가 없음.
이게 영어판의 핵심 USP.

유지할 것:
- 클래스 코드 기반 학생 가입 (`app/api/classroom/enroll/route.ts`)
- 교사 배포/회수 시스템 (`distributedClassCodes`)
- 학생 라이브러리 자동 반영
- 교사 클래스 대시보드 (`app/classroom/[classCode]/page.tsx`)

### 자막 추출 파이프라인
- YouTube 자막 → SocialKit → Gemini STT 폴백 구조 그대로 유지
- 영어 영상 품질 체크 로직은 이미 `lang === 'en'` 분기가 있어서 잘 동작함

### 스퀘어 (광장) 기능
- 스퀘어 K → Square (이름 변경)
- 스퀘어 Kids는 별도 검토 (영어판에서도 유효한 개념)

---

## 아키텍처 메모

### 주요 기술 스택
- Next.js App Router
- Firebase (Firestore + Auth)
- Gemini 2.5 Flash (카테고리 분류 + 요약 + 자막 STT)
- SocialKit (YouTube 자막/MP3 추출)
- Vercel 배포 (maxDuration 300초)

### 파일명 주의
- `lib/claude.ts` — 이름은 claude지만 실제로는 Gemini만 사용
- `app/api/classroom/cleanup-inherited/route.ts` — 구 masterFolder 클론 정리용 (isClassFolder:true), distributedClassCodes 시스템과 무관

### 두 시스템 혼동 주의
- **구 시스템**: `isClassFolder: true` 폴더 (enroll 시 자동 clone) → cleanup-inherited로 정리
- **현 시스템**: `distributedClassCodes` 배열 (교사가 수동 배포/회수) → 이게 현재 운영 중인 시스템

---

## 향후 로드맵 (영어판)

- [ ] 초기: 핵심 요약 + 교실 기능만 런칭
- [ ] 스퀘어 Kids 별도 검토 (부모도 Kids에 업로드 가능, 관리자 승인 후 노출)
- [ ] 결제 연동 (포트원 → Stripe로 교체 필요)
- [ ] 크롬 익스텐션 영어판 (한국판 심사 통과 후)

---

## 한국판과 주요 차이 요약

| 항목 | 한국판 | 영어판 |
|------|--------|--------|
| 학교 검색 | NEIS API 자동완성 | 텍스트 직접 입력 |
| AI 출력 언어 | 한국어 | 영어 |
| 결제 | 포트원 (카카오페이, 토스) | Stripe |
| 타겟 | 한국 교사/학생/일반인 | 영어권 교사/학생 |
| Firebase | 한국판 전용 프로젝트 | 영어판 전용 프로젝트 |
