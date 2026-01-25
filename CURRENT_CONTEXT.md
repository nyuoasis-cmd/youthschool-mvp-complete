# YouthSchool 프로젝트 현황 보고

> 📅 생성 시간: 2026-01-25 13:38:31
> 📍 프로젝트 경로: /home/claude/youthschool

---

## 📦 1. 패키지 정보

### Dependencies (주요)
    "@anthropic-ai/sdk": "^0.71.2",

### 스크립트 명령어
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "tsx script/build.ts",
    "start": "NODE_ENV=production drizzle-kit push && node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.71.2",
    "@hookform/resolvers": "^3.10.0",
    "@jridgewell/trace-mapping": "^0.3.25",

---

## 📁 2. 프로젝트 구조 (최신)

### 클라이언트 페이지 (client/src/pages)
Admin.tsx
AfterSchoolPlanForm.tsx
BudgetDisclosureForm.tsx
BullyingPreventionPlanForm.tsx
CarePlanForm.tsx
Chat.tsx
DocumentResult.tsx
EducationPlanForm.tsx
EventPlanForm.tsx
FieldTripPlanForm.tsx
History.tsx
Home.tsx
MyPage.tsx
MyPageCompleted.tsx
MyPageDocuments.tsx
MyPageDrafts.tsx
MyPageFavorites.tsx
ParentLetterForm.tsx
ParentMeetingForm.tsx
Profile.tsx
SafetyEducationPlanForm.tsx
TemplateForm.tsx
admin/UserApproval.tsx
auth/ForgotPassword.tsx
auth/Login.tsx
auth/PendingApproval.tsx
auth/ResetPassword.tsx
auth/SignupComplete.tsx
auth/SignupInstructor.tsx
auth/SignupSchoolAdmin.tsx
auth/SignupSelect.tsx
auth/SignupTeacher.tsx
mypage/MyPageDashboard.tsx
mypage/MyPageDocumentDetail.tsx
mypage/MyPageDocuments.tsx
mypage/MyPageLayout.tsx
not-found.tsx

### 서버 파일 (server/)
./server/aftercare.ts (14K)
./server/crawler.ts (6.0K)
./server/db.ts (395)
./server/documentExporter.ts (6.4K)
./server/github.ts (2.1K)
./server/hwpParser.ts (6.4K)
./server/index.ts (4.3K)
./server/logger.ts (3.6K)
./server/routes.ts (126K)
./server/static.ts (559)
./server/storage.ts (28K)
./server/vite.ts (1.7K)

### 문서 명세서 폴더
./교내행사운영계획서
./방과후학교_운영계획서_화면정의서.md
./방과후학교_운영계획서_화면정의서.md:Zone.Identifier
./초등돌봄교실_운영계획서
./학교 예산결산 공개자료
./학교폭력 예방 교육 계획서
./학부모총회 안내
./현장체험학습_운영계획서

---

## 🗄️ 3. 데이터베이스 스키마 (핵심 테이블)

export const templates = pgTable("templates", {
export const generatedDocuments = pgTable("generated_documents", {
export const documentAttachments = pgTable("document_attachments", {
export const aftercareDrafts = pgTable("aftercare_drafts", {
export const aftercareLibrary = pgTable("aftercare_library", {
export const uploadedTemplates = pgTable("uploaded_templates", {
export const documentEmbeddings = pgTable("document_embeddings", {
export const chats = pgTable("chats", {
export const chatMessages = pgTable("chat_messages", {

---

## 🔧 4. 환경 변수 (.env 템플릿)

# ==========================================
# 데이터베이스 설정
# ==========================================
# PostgreSQL 연결 URL
# 형식: postgresql://username:password@host:port/database
DATABASE_URL=postgresql://user:password@localhost:5432/teachermate

# ==========================================
# 세션 설정
# ==========================================
# 세션 암호화 키 (최소 32자 이상의 랜덤 문자열)
# 생성 방법: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your-random-secret-key-here-min-32-chars

# ==========================================
# AI API 키
# ==========================================
# Anthropic Claude API 키
# https://console.anthropic.com/account/keys
ANTHROPIC_API_KEY=sk-ant-your-key-here

# OpenAI API 키 (선택사항)
# https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-key-here

# ==========================================
# 이메일 설정 (SMTP)
# ==========================================
# Gmail 사용 예시:
# 1. Gmail 설정 > 보안 > 2단계 인증 활성화
# 2. 앱 비밀번호 생성
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here
SMTP_FROM=noreply@teachermate.com

# ==========================================
# 애플리케이션 설정
# ==========================================
# 기본 URL (프로덕션 도메인)
BASE_URL=https://youthschool-mvp-complete.onrender.com

# 환경 (development, production, test)
NODE_ENV=production

# 서버 포트
PORT=5000

# ==========================================
# 보안 설정 (선택사항)
# ==========================================
# CORS 허용 도메인 (쉼표로 구분)
# CORS_ORIGINS=https://example.com,https://www.example.com

# Rate Limiting 설정
# RATE_LIMIT_WINDOW_MS=900000
# RATE_LIMIT_MAX_REQUESTS=100

# ==========================================
# 파일 업로드 설정 (선택사항)
# ==========================================
# 최대 파일 크기 (바이트)
# MAX_FILE_SIZE=10485760

# 허용된 파일 타입
# ALLOWED_FILE_TYPES=.hwp,.docx,.pdf

---

## 📊 5. 최근 변경 사항 (Git)

ddb97a6 UI 수정 가이드 및 새대화창 명세서 추가
3326ada A_1.004
5a00c66 A 1.003
7a18361 A 1.002
4f642b9 배포 후 1차 수정

---

## 📝 6. TODO 및 현재 작업

### 최근 수정된 파일 (24시간 이내)
./CURRENT_CONTEXT.md (Jan 25 13:38)
./server/logger.ts (Jan 25 13:32)
./client/src/components/layout/AppLayout.tsx (Jan 25 13:12)
./server/auth/routes.ts (Jan 25 13:09)
./server/auth/middleware.ts (Jan 25 13:07)
./client/src/App.tsx (Jan 25 13:07)
./client/src/pages/auth/PendingApproval.tsx (Jan 25 13:07)
./client/src/pages/auth/Login.tsx (Jan 25 13:07)
./client/src/pages/auth/SignupSchoolAdmin.tsx (Jan 25 13:06)
./client/src/pages/auth/SignupInstructor.tsx (Jan 25 13:06)

---

## 🚀 7. 빠른 시작 명령어
```bash
# 프로젝트 디렉토리로 이동
cd /home/claude/youthschool

# 개발 서버 실행
npm run dev

# 데이터베이스 스키마 푸시
npm run db:push

# 빌드
npm run build

# 컨텍스트 재생성
./generate-context.sh
```

---

## 💬 Claude에게 전달할 핵심 메시지

**"현재 YouthSchool 프로젝트 상태:"**
- TypeScript + React + Express 기반 학교 행정 문서 자동 생성 서비스
- Anthropic Claude SDK로 AI 문서 생성
- PostgreSQL + Drizzle ORM
- 9가지 문서 타입 지원
- 로컬 경로: `/home/claude/youthschool`

**"지금 도와줄 수 있는 것:"**
1. 기능 추가/수정
2. 버그 수정
3. 코드 리뷰
4. 문서 작성
5. 배포 지원

---

📌 **이 파일은 자동 생성됩니다. 수동 편집하지 마세요!**
업데이트 필요시: `./generate-context.sh` 실행
