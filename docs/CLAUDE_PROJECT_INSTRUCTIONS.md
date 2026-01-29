# YouthSchool 프로젝트 - Claude Project 지침서

이 파일은 Claude 웹/앱 Projects에 추가하여 기능명세서 작성 시 자동으로 참조되도록 합니다.

---

## 프로젝트 개요

YouthSchool은 학교 문서(가정통신문, 계획서 등)를 AI로 자동 생성하는 웹 서비스입니다.

### 핵심 기술 스택
- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Express.js + TypeScript
- **AI**: OpenAI GPT-4 / Anthropic Claude (RAG 적용)
- **RAG 데이터**: `https://github.com/nyuoasis-cmd/newsletter` 레포지토리

---

## ⚠️ 중요: AI 생성 기능 구현 시 필수 체크리스트

새로운 문서 모듈을 만들 때 **반드시** 아래 항목을 포함해야 합니다:

### 1. RAG 카테고리 매핑 (필수)

```typescript
// 파일: shared/category-mapping.ts

// 1) TeacherMateDocumentType에 새 문서 타입 추가
export type TeacherMateDocumentType =
  | "가정통신문"
  | "급식안내문"
  // ... 기존 타입들
  | "새로운문서타입"  // ← 추가
  | "HWP 양식으로 작성";

// 2) RAG 카테고리 매핑 추가
export const DOCUMENT_TYPE_TO_RAG_CATEGORY_IDS: Record<...> = {
  // ... 기존 매핑들
  "새로운문서타입": ["관련-category-id-1", "관련-category-id-2"],  // ← 추가
};
```

### 2. 사용 가능한 RAG 카테고리 목록

```
recruitment      - 채용/인사 공고
admission        - 입학/신입생 안내
exam-form        - 시험 관련 서식
safety-prevention - 안전/예방 교육
scholarship      - 장학/재정지원 안내
college-exam     - 수능/대입 안내
lecturer-plan    - 강사 초빙 계획서
lecturer-contract - 강사 계약서
lecturer-payment - 강사료 지급 품의서
lecture-plan     - 강의 계획서
lecture-notice   - 특강 안내문
academic-calendar - 학사일정표
exam-plan        - 시험 계획서
curriculum       - 교육과정 운영 계획
timetable        - 수업 시간표
vacation         - 방학 계획 안내
graduation       - 졸업/진급 안내
attendance       - 출결 관리 안내
guidance         - 생활지도 계획
violence-prevent - 학교폭력 예방 안내
counseling       - 상담 기록부
field-trip       - 체험학습 신청서
volunteer        - 봉사활동 안내
career           - 진로지도 계획
home-letter      - 일반 가정통신문
event-notice     - 행사 안내문
fee-notice       - 수익자부담금 안내
meal-notice      - 급식 안내
health-safety    - 보건/안전 안내
survey-notice    - 설문조사 안내
parents-meeting  - 학부모 총회 안내
budget-request   - 예산 집행 품의서
work-plan        - 업무 계획서
```

### 3. 서버 라우트 구현 (routes.ts)

AI 생성 필드마다 프롬프트 작성 시 **RAG 참조 지시** 포함:

```typescript
// 파일: server/routes.ts - /api/documents/generate-field 핸들러

} else if (documentType === "새로운문서타입") {
  if (fieldName === "greeting") {
    prompt = `[핵심 지시] 참고 문서의 실제 인사말을 분석하고 스타일을 차용하세요.

[입력 정보]
${contextDescription}

[다양성 규칙]
- 참고 문서에서 표현/어휘를 골라 재조합
- 매번 다른 문장 구조 사용
- 고정된 템플릿 사용 금지

인사말만 출력:`;
  } else if (fieldName === "content") {
    // ... 다른 필드들
  }
}

// 중요: 프롬프트 작성 후 RAG 적용
const ragDocuments = await getRagReferenceDocuments({
  documentType: "새로운문서타입",  // ← 카테고리 매핑과 일치해야 함
  inputs: (context as Record<string, string>) || {},
  limit: 3,
});
prompt = buildRagPrompt({ basePrompt: prompt, ragDocuments });
```

### 4. 프롬프트 작성 가이드라인

#### ❌ 잘못된 예시 (고정 출력)
```
[출력 형식]
["신분증", "수험표", "검은색 사인펜"]  ← AI가 그대로 복사함
```

#### ✅ 올바른 예시 (다양성 유도)
```
[이번 생성 설정]
- 스타일: ${randomStyle}
- 항목 수: ${randomCount}개

[규칙]
1. 참고 문서의 표현을 차용하되 재조합
2. 매번 다른 순서와 어휘 사용

[출력 형식]
JSON 배열: ["항목1", "항목2", ...]
```

### 5. 랜덤화 요소 추가

```typescript
// 매 요청마다 다른 결과를 위한 랜덤화
const styles = ["격식체", "친근한 격식체", "간결체"];
const randomStyle = styles[Math.floor(Math.random() * styles.length)];

const counts = [3, 4, 5, 6];
const randomCount = counts[Math.floor(Math.random() * counts.length)];

prompt = `[이번 생성: ${randomStyle} 스타일, ${randomCount}개 항목]
...`;
```

---

## 기능명세서 작성 시 포함할 섹션

새로운 모듈 기능명세서에는 반드시 아래 섹션을 포함하세요:

```markdown
## AI 생성 기능

### 1. AI 생성 대상 필드
| 필드명 | 설명 | 생성 규칙 |
|--------|------|-----------|
| greeting | 인사말 | 계절인사, 감사, 안내 목적 포함 |
| content | 본문 | RAG 참조하여 다양하게 생성 |

### 2. RAG 연동 설정
- **문서 타입**: "새로운문서타입"
- **참조 카테고리**: ["category-1", "category-2", "category-3"]
- **참조 문서 수**: 3개

### 3. 프롬프트 다양화 전략
- 스타일 랜덤화: ["옵션1", "옵션2", "옵션3"]
- 순서 랜덤화: 항목 순서를 매번 다르게
- 표현 랜덤화: 동일 의미를 다른 어휘로

### 4. 주의사항
- 고정된 예시 출력 금지
- 국가 규정 데이터(시간표 등)는 형식만 다양화
- JSON 출력 형식 예시 명확히 제공
```

---

## 파일 구조 참고

```
shared/
  category-mapping.ts   ← RAG 카테고리 매핑
  rag-config.ts         ← RAG 설정
  rag-data/
    documents.json      ← 문서 메타데이터
    categories.json     ← 카테고리 정의

server/
  routes.ts             ← AI 생성 API 엔드포인트
  rag.ts                ← RAG 문서 검색 로직
  prompts.ts            ← buildRagPrompt 함수

client/src/
  pages/
    NewModuleForm.tsx   ← 폼 페이지
  components/
    NewModulePreview.tsx ← PDF 미리보기
```

---

## 요약 체크리스트

새 문서 모듈 구현 시:

- [ ] `shared/category-mapping.ts`에 문서 타입 추가
- [ ] RAG 카테고리 매핑 추가 (관련 카테고리 2~4개)
- [ ] `server/routes.ts`에 필드별 프롬프트 추가
- [ ] 프롬프트에 "참고 문서 활용" 지시 포함
- [ ] 랜덤화 요소 추가 (스타일, 순서, 개수 등)
- [ ] 고정된 예시 출력 제거
- [ ] JSON 출력 형식 예시 명확히 제공
