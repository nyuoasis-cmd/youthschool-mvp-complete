#!/bin/bash

# YouthSchool 프로젝트 컨텍스트 자동 생성 스크립트
# 사용법: ./generate-context.sh

OUTPUT_FILE="CURRENT_CONTEXT.md"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo "🔄 프로젝트 컨텍스트 생성 중..."

cat > $OUTPUT_FILE << 'CONTEXT'
# YouthSchool 프로젝트 현황 보고

> 📅 생성 시간: TIMESTAMP_PLACEHOLDER
> 📍 프로젝트 경로: /home/claude/youthschool

---

## 📦 1. 패키지 정보

### Dependencies (주요)
CONTEXT

# package.json에서 주요 의존성 추출
cat package.json | grep -A 5 '"dependencies"' | grep -E '"@anthropic-ai|"openai|"drizzle|"express|"react"' >> $OUTPUT_FILE

cat >> $OUTPUT_FILE << 'CONTEXT'

### 스크립트 명령어
CONTEXT

cat package.json | grep -A 10 '"scripts"' >> $OUTPUT_FILE

cat >> $OUTPUT_FILE << 'CONTEXT'

---

## 📁 2. 프로젝트 구조 (최신)

### 클라이언트 페이지 (client/src/pages)
CONTEXT

find ./client/src/pages -name "*.tsx" -type f | sed 's|./client/src/pages/||' | sort >> $OUTPUT_FILE

cat >> $OUTPUT_FILE << 'CONTEXT'

### 서버 파일 (server/)
CONTEXT

ls -lh ./server/*.ts | awk '{print $9, "("$5")"}' >> $OUTPUT_FILE

cat >> $OUTPUT_FILE << 'CONTEXT'

### 문서 명세서 폴더
CONTEXT

find . -maxdepth 1 -type d -name "*교*" -o -name "*방과후*" -o -name "*학*" | sort >> $OUTPUT_FILE

cat >> $OUTPUT_FILE << 'CONTEXT'

---

## 🗄️ 3. 데이터베이스 스키마 (핵심 테이블)

CONTEXT

# schema.ts에서 테이블 정의 추출
grep -E "export const .* = pgTable" ./shared/schema.ts | head -10 >> $OUTPUT_FILE

cat >> $OUTPUT_FILE << 'CONTEXT'

---

## 🔧 4. 환경 변수 (.env 템플릿)

CONTEXT

cat .env.example >> $OUTPUT_FILE

cat >> $OUTPUT_FILE << 'CONTEXT'

---

## 📊 5. 최근 변경 사항 (Git)

CONTEXT

# Git 최근 커밋 5개
git log --oneline -5 2>/dev/null >> $OUTPUT_FILE || echo "Git 정보 없음" >> $OUTPUT_FILE

cat >> $OUTPUT_FILE << 'CONTEXT'

---

## 📝 6. TODO 및 현재 작업

### 최근 수정된 파일 (24시간 이내)
CONTEXT

find . -name "*.ts" -o -name "*.tsx" -o -name "*.md" | grep -v node_modules | xargs ls -lt | head -10 | awk '{print $9, "("$6, $7, $8")"}' >> $OUTPUT_FILE

cat >> $OUTPUT_FILE << 'CONTEXT'

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
CONTEXT

# 타임스탬프 교체
sed -i "s/TIMESTAMP_PLACEHOLDER/$TIMESTAMP/g" $OUTPUT_FILE

echo "✅ $OUTPUT_FILE 생성 완료!"
echo ""
echo "📋 사용 방법:"
echo "   cat $OUTPUT_FILE  # 내용 확인"
echo "   cat $OUTPUT_FILE | clip.exe  # Windows 클립보드에 복사 (WSL)"
echo ""
