# SSOKTUBE — 선생님(교사) 기능 명세

> 최종 업데이트: 2026-05-05  
> 선생님 계정(`role: teacher`)에서만 사용 가능한 기능을 별도 정리합니다.

---

## 1. 클래스 생성 & 설정

### 1-1. 클래스 만들기 (`/classroom/setup`)
- 학교명, 학년, 반, 비밀번호 설정
- 고유 클래스 코드(6자) 자동 생성
- 생성 후 `/classroom/[classCode]` 대시보드로 이동

### 1-2. 클래스 코드 & 학생 참여 링크
- 대시보드 ⚙️ 설정 탭에서 클래스 코드 확인
- 학생 참여 링크 복사 → 공유

---

## 2. 클래스 대시보드 (`/classroom/[classCode]`)

헤더 "내 클래스" 버튼 → 클래스 대시보드 진입

### 탭 구조
1. 👥 학생 현황
2. 📁 수업자료 관리
3. 🔥 퀴즈 히트맵
4. ⚙️ 클래스 설정

---

## 3. 학생 현황 탭

### 3-1. 학생 목록 카드
각 학생 카드에서 확인 가능한 정보:
- 접속 횟수 (총 로그인 수)
- 자기점검 반응 집계 — ✅ 완전이해 / ⚠️ 혼동 / ❌ 미이해
- 퀴즈 정답률 (%)
- 마지막 활동 시간

### 3-2. 학생 상세 모달 (카드 클릭)
**영상별 기록 탭**
- 시청한 영상 목록
- 각 영상별: 시청률(%), 완료 여부, 세션 타임라인
- 퀴즈 시도 횟수 및 최종 정답률

**북마크 탭**
- 학생이 저장한 타임스탬프 북마크 + 메모 전체 조회

**복습 일정 탭**
- Spaced Repetition 알고리즘 기반 복습 스케줄
- 오답 주기: 1일 → 3일 → 7일 → 14일 → 30일 → 60일
- 각 문항별 다음 복습 예정일 표시

**접속 기록 탭**
- 로그인/로그아웃 세션 전체 타임라인
- 날짜별 접속 이력

---

## 4. 수업자료 관리 탭

### 4-1. 폴더 트리 구조
- 선생님 개인 폴더를 그대로 사용
- 하위폴더 무제한 생성 가능
- 영상 추가/이동/삭제

### 4-2. 폴더 배포 (Distribute)
- 폴더 우측 **"배포"** 버튼 클릭
- 해당 폴더 + 모든 하위폴더가 BFS 순서로 일괄 처리
- 각 폴더의 `distributedClassCodes` 배열에 classCode 추가
- **학생 화면에 즉시 반영** (별도 새로고침 불필요)
- 배포된 폴더에는 초록 뱃지 표시

### 4-3. 폴더 회수 (Recall)
- 배포 중인 폴더 우측 **"회수"** 버튼 클릭
- `distributedClassCodes`에서 classCode 제거
- **학생 화면에서 즉시 사라짐**

### 4-4. 구간 배포 (클립)
- 영상 전체 대신 특정 구간만 배포
- 시작 시간 / 종료 시간 직접 입력 (M:SS 형식)
- 학생에게는 지정 구간만 재생 가능

### 4-5. 수업 보고서
- 폴더 선택 → 📋 보고서 버튼
- **포함 내용**:
  - 폴더 내 전체 영상 목록
  - 학생별 시청률, 퀴즈 정답률, 자기점검 반응
  - 참여도 통계 (댓글, 북마크 수)
- **선생님 코멘트** 직접 작성 및 저장
- **PDF 다운로드** (학부모 전달용)

---

## 5. 퀴즈 히트맵 탭

- 클래스 내 전체 영상의 문제별 오답률 시각화
- **색상 코드**:
  - 🟢 초록: 정답률 높음 (오답률 < 30%)
  - 🟠 주황: 주의 필요 (오답률 30~60%)
  - 🔴 빨강: 집중 보충 필요 (오답률 > 60%)
- 60% 이상 오답 구간 → 해당 영상/문제 집중 복습 안내 가능

---

## 6. 학생 수업 모드

학생이 배포된 영상을 열면 자동으로 **수업 모드**(`?classView=1`) 활성화

### 학생이 할 수 있는 것
- 영상 시청 (구간 배포 시 해당 구간만)
- 자막 보기
- 퀴즈 풀기
- 댓글 작성
- 타임스탬프 북마크

### 자동 로깅 항목 (선생님이 볼 수 있음)
| 로그 타입 | 기록 내용 |
|----------|---------|
| `play_start` | 재생 시작 |
| `play` | 재생 중단 시점 (duration, percentWatched, completed) |
| `meta` | 자기점검 반응 (complete/confused/unknown) |
| `quiz` | 퀴즈 시도 (correct 여부, attempt 횟수) |
| `comment` | 댓글 작성 |
| `segment` | 자막 구간 메모 |
| `login` | 접속 |
| `logout` | 퇴장 |

---

## 7. 복습 알림 배너 (학생 화면)

- 학생이 사이트 접속 시 상단에 복습 알림 배너 자동 표시 (ReviewBanner 컴포넌트)
- "오늘 복습할 문제 N개 있어요" → 클릭 시 해당 영상으로 이동
- 선생님이 배포한 영상 중 복습 예정인 항목만 표시

---

## 8. 학생 가입 & 로그인

### 학생 가입 (`/classroom/join`)
- 클래스 코드 입력 → 이름 + 비밀번호 설정 → 학생 계정 생성
- Firebase Custom Claim으로 `role: student`, `classCode` 자동 설정

### 학생 로그인 (`/classroom/login`)
- 클래스 코드 + 이름 + 비밀번호로 로그인
- 로그인 즉시 수업자료 탭으로 이동

---

## 9. 어드민 전용 기능 (관리자 계정)

> 어드민 이메일(`NEXT_PUBLIC_ADMIN_EMAIL`)로 로그인 시 추가 기능 활성화

### 9-1. 어드민 대시보드 (`/admin`)
- **통계**: 오늘 분석 수, 전체 분석, 저장 수, 누적 가입자
- **영상 관리**: 전체 요약 검색·삭제 (신고/부적절 콘텐츠 처리)
- **회원 관리**: 역할(일반/선생님/학생) & 플랜(무료/유료) 필터 조회
- **스퀘어 관리**: 공개 카드 숨김/삭제
- **분석**: GA4 외부 대시보드 링크

### 9-2. 매거진 수동 생성 (어드민 > 매거진 탭)
- 요약 URL 또는 sessionId 직접 입력
- 마크다운 초안 미리보기 (본문, FAQ, 체크리스트)
- 즉시 발행 또는 임시저장 선택
- 크론 자동생성 외 특정 콘텐츠 수동 큐레이션

### 9-3. 자막 출처 표시
- 어드민 계정으로 결과 페이지 접근 시 "📡 자막 출처" 정보 노출
- 디버깅용 (SocialKit / Gemini STT / cached 등)

---

## 10. 데이터 흐름 요약

```
선생님 로그인
  │
  ├─ 클래스 생성 → classrooms 컬렉션
  │
  ├─ 폴더 배포 → folders.distributedClassCodes[] 갱신
  │                 ↓
  │              학생 마이페이지에 즉시 노출
  │
  ├─ 학생 수업 → activity_logs 컬렉션 자동 기록
  │                 ↓
  │              대시보드 학생 현황 집계
  │
  ├─ 퀴즈 오답 → review_schedules 컬렉션
  │                 ↓
  │              복습 알림 배너
  │
  └─ 수업 보고서 → class_reports 컬렉션 (선생님 코멘트)
                     ↓
                  PDF 다운로드
```

---

## 11. 관련 Firestore 컬렉션

| 컬렉션 | 주요 필드 | 용도 |
|--------|---------|------|
| `classrooms` | teacherId, schoolName, grade, classNum, classCode, password | 클래스 정보 |
| `classroom_students` | classCode, studentIds, displayNames | 등록 학생 목록 |
| `folders` | userId, name, parentId, **distributedClassCodes**, depth | 폴더 배포 관리 |
| `activity_logs` | classCode, studentId, type, videoId, value, timestamp | 학생 활동 로그 |
| `review_schedules` | userId, videoId, repetition, nextReviewDate | 복습 일정 |
| `class_reports` | classCode_folderId, note | 선생님 코멘트 |
| `quiz_sets` | videoId, questions | 퀴즈 캐시 |

---

## 12. 관련 API 엔드포인트

| 엔드포인트 | 메서드 | 기능 |
|-----------|--------|------|
| `/api/classroom/create` | POST | 클래스 생성 |
| `/api/classroom/enroll` | POST | 학생 등록 (Custom Claim 설정) |
| `/api/classroom/distribute` | POST | 폴더 배포 (BFS 일괄 처리) |
| `/api/classroom/recall` | POST | 폴더 회수 |
| `/api/classroom/distributed-folders` | GET | 학생에게 배포된 폴더 목록 |
| `/api/classroom/distributed-videos` | GET | 배포된 폴더 내 영상 목록 |
| `/api/classroom/activity` | POST | 학생 활동 로그 기록 |
| `/api/classroom/student-bookmarks` | GET | 학생 북마크 조회 (선생님용) |
| `/api/review-schedule` | GET | 복습 스케줄 조회 |
