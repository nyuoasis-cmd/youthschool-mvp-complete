# 티처메이트 모바일 UI 개선 기능명세서

**버전**: 1.0  
**작성일**: 2025-01-24  
**프로젝트**: YouthSchool MVP - 티처메이트  
**목적**: 모바일 사용자 경험 개선 및 반응형 디자인 최적화

---

## 1. 프로젝트 개요

### 1.1 현황 분석
- **현재 URL**: https://youthschool-mvp-complete.onrender.com/
- **서비스명**: 티처메이트 (학교 문서 행정 AI 자동화)
- **호스팅**: Render (무료 티어)
- **기술 스택**: 
  - 프론트엔드: Vanilla JS / HTML / CSS
  - 백엔드: Python (추정)
  - 배포: Render

### 1.2 주요 문제점
1. **사이드바 고정**: 모바일에서 240px 고정 폭 사이드바가 화면의 64%를 차지
2. **퀵 액션 버튼**: 4개의 버튼이 2줄로 줄바꿈되어 가독성 저하
3. **입력 영역 최적화 부족**: 작은 화면에서 채팅 입력 UI가 불편함
4. **로딩 상태 미표시**: Render 콜드 스타트 시 사용자 피드백 없음
5. **터치 최적화 부족**: 버튼 크기와 간격이 터치에 최적화되지 않음

---

## 2. 개선 목표

### 2.1 핵심 지표 (KPI)
- 모바일 사용 가능 화면 너비: 현재 36% → 목표 90%+
- 첫 화면 로딩 시간 인지: 개선 전 없음 → 개선 후 스켈레톤 UI 제공
- 터치 타겟 크기: 44px 이상 (Apple Human Interface Guidelines)
- 페이지 성능 점수: Lighthouse Mobile 70+ 목표

### 2.2 사용자 경험 목표
- 한 손으로 편리한 모바일 사용
- 직관적인 네비게이션
- 빠른 문서 생성 접근성
- 명확한 상태 피드백

---

## 3. 기능 요구사항

### 3.1 반응형 네비게이션 시스템

#### 3.1.1 햄버거 메뉴 구현
**우선순위**: P0 (최우선)

**기능 설명**:
- 모바일 뷰(< 768px)에서 사이드바를 햄버거 메뉴로 전환
- 메뉴 버튼 위치: 좌측 상단 헤더 영역
- 메뉴 오픈 시 슬라이드 애니메이션 (왼쪽에서 등장)
- 오버레이 다크닝 효과 (배경 어둡게)

**세부 요구사항**:
- 햄버거 아이콘: 3줄 아이콘 (☰)
- 아이콘 크기: 24x24px
- 터치 영역: 48x48px (패딩 포함)
- 애니메이션 속도: 250ms
- 슬라이드 메뉴 너비: 화면의 80% (최대 280px)
- 오버레이 배경색: rgba(0, 0, 0, 0.5)
- 외부 클릭 시 메뉴 닫기
- ESC 키로 메뉴 닫기

**상태**:
- 닫힘 (기본)
- 열림
- 애니메이션 중

#### 3.1.2 반응형 헤더
**우선순위**: P0

**기능 설명**:
- 데스크톱(≥ 768px): 현재 디자인 유지
- 모바일(< 768px): 햄버거 메뉴 + 로고 + 로그인 버튼

**레이아웃**:
```
[☰] [티처메이트 로고]           [로그인]
```

**세부 요구사항**:
- 헤더 높이: 56px (고정)
- position: sticky (스크롤 시 상단 고정)
- z-index: 1000
- 배경색: #FFFFFF
- 하단 border: 1px solid #E5E7EB

### 3.2 메인 컨텐츠 영역 최적화

#### 3.2.1 채팅 인터페이스 개선
**우선순위**: P0

**기능 설명**:
- 모바일에서 채팅 입력창을 하단 고정
- 키보드 오픈 시 입력창이 키보드 위로 이동

**세부 요구사항**:
- 입력창 높이: 최소 56px (자동 확장 최대 120px)
- 하단 여백: safe-area-inset-bottom 적용
- 파일 첨부 버튼 크기: 44x44px
- 전송 버튼 크기: 44x44px
- 버튼 간 간격: 8px

#### 3.2.2 퀵 액션 버튼 개선
**우선순위**: P1

**현재 상태**:
```
[방과후학교 가정통신문] [학사일정 공지사항]
[학부모 상담 기록]     [현장체험학습 계획서]
```

**개선 방안 1 - 수평 스크롤** (권장):
```
← [방과후학교...] [학사일정...] [학부모...] [현장체험...] →
```

**개선 방안 2 - 2열 그리드 유지 + 버튼 최적화**:
```
[방과후학교 가정통신문]
[학사일정 공지사항]
[학부모 상담 기록]
[현장체험학습 계획서]
```

**세부 요구사항** (방안 1 채택 시):
- 컨테이너: overflow-x: auto, display: flex
- 버튼 최소 너비: 160px
- 버튼 높이: 48px
- 버튼 간 간격: 8px
- 좌우 패딩: 16px
- 스크롤 인디케이터: CSS로 커스텀
- 스냅 스크롤: scroll-snap-type: x mandatory

### 3.3 로딩 상태 개선

#### 3.3.1 콜드 스타트 로딩 화면
**우선순위**: P1

**기능 설명**:
- Render 서버 웨이크업 시 스켈레톤 UI 표시
- 로딩 진행 상태 표시

**로딩 메시지**:
1. "서버를 준비하고 있습니다..." (0-5초)
2. "곧 준비됩니다..." (5-15초)
3. "조금만 더 기다려주세요..." (15초+)

**디자인**:
- 중앙 로딩 스피너
- 애니메이션 로고
- 진행 메시지 (페이드 인/아웃)
- 예상 대기 시간 표시 (선택사항)

#### 3.3.2 페이지 전환 로딩
**우선순위**: P2

**기능 설명**:
- 페이지 간 이동 시 로딩 인디케이터
- 최상단 진행 바 (YouTube 스타일)

---

## 4. 비기능 요구사항

### 4.1 성능
- 초기 로딩 시간: 3초 이내 (캐시 없는 상태)
- Time to Interactive (TTI): 5초 이내
- 애니메이션 FPS: 60fps 유지
- 이미지 최적화: WebP 포맷 사용

### 4.2 접근성
- WCAG 2.1 Level AA 준수
- 키보드 네비게이션 지원
- 스크린 리더 지원 (ARIA 레이블)
- 최소 색상 대비: 4.5:1

### 4.3 브라우저 호환성
- iOS Safari 14+
- Android Chrome 90+
- Samsung Internet 14+
- Desktop: Chrome, Firefox, Safari, Edge (최신 2개 버전)

### 4.4 디바이스 지원
- 모바일: 320px ~ 480px (주 타겟: 360px ~ 414px)
- 태블릿: 481px ~ 1024px
- 데스크톱: 1025px+

---

## 5. 화면별 상세 명세

### 5.1 메인 화면 (채팅 인터페이스)

**경로**: `/`

#### 5.1.1 모바일 레이아웃 (< 768px)
```
┌─────────────────────────────┐
│ [☰] 티처메이트      [로그인] │ ← 헤더 (56px)
├─────────────────────────────┤
│                             │
│   안녕하세요,                │
│   무엇을 도와드릴까요?       │
│                             │
│  ┌─────────────────────┐   │
│  │ 무엇을 도와드릴까요? │   │ ← 입력창
│  │ [📎] [발송]          │   │
│  └─────────────────────┘   │
│                             │
│  ← [퀵액션1][퀵액션2][퀵액션3] → │ ← 수평 스크롤
│                             │
└─────────────────────────────┘
```

#### 5.1.2 데스크톱 레이아웃 (≥ 768px)
```
┌─────┬────────────────────────┐
│     │  티처메이트   [로그인]  │ ← 헤더
│사이 ├────────────────────────┤
│드바 │                        │
│     │  안녕하세요,            │
│[새 ]│  무엇을 도와드릴까요?   │
│대화]│                        │
│     │ ┌──────────────────┐  │
│[문서]│ │ 입력창            │  │
│도구]│ └──────────────────┘  │
│     │                        │
│     │ [퀵액션1] [퀵액션2]     │
│     │ [퀵액션3] [퀵액션4]     │
└─────┴────────────────────────┘
```

### 5.2 사이드바 (모바일 슬라이드 메뉴)

#### 구성 요소
1. **헤더 섹션**
   - 닫기 버튼 (X)
   - 로고

2. **메뉴 항목**
   - 새 대화
   - 문서 도구
   - (향후 확장: 대화 히스토리, 설정 등)

3. **푸터 섹션**
   - 버전 정보
   - 고객 지원 링크

---

## 6. 인터랙션 명세

### 6.1 햄버거 메뉴 인터랙션

**시나리오 1: 메뉴 열기**
1. 사용자가 햄버거 아이콘 탭
2. 오버레이 페이드 인 (150ms)
3. 사이드바 슬라이드 인 (250ms, ease-out)
4. body 스크롤 비활성화

**시나리오 2: 메뉴 닫기**
1. 사용자가 오버레이 탭 OR X 버튼 탭 OR ESC 키 입력
2. 사이드바 슬라이드 아웃 (250ms, ease-in)
3. 오버레이 페이드 아웃 (150ms)
4. body 스크롤 활성화

### 6.2 입력창 인터랙션

**시나리오: 키보드 오픈**
1. 사용자가 입력창 포커스
2. 키보드 애니메이션 시작
3. 입력창이 키보드 위로 이동 (viewport 변경 감지)
4. 퀵 액션 버튼 숨김 (선택사항)

### 6.3 퀵 액션 버튼 인터랙션

**시나리오: 버튼 탭**
1. 사용자가 버튼 탭
2. 버튼 scale 애니메이션 (0.95, 100ms)
3. 해당 템플릿으로 채팅 시작
4. 입력창에 자동 포커스

---

## 7. 스타일 가이드

### 7.1 색상 팔레트
```css
/* Primary Colors */
--primary-blue: #3B82F6;
--primary-blue-hover: #2563EB;
--primary-blue-active: #1D4ED8;

/* Neutral Colors */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;

/* Semantic Colors */
--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;
--info: #3B82F6;
```

### 7.2 타이포그래피
```css
/* Font Family */
--font-primary: -apple-system, BlinkMacSystemFont, "Segoe UI", 
                Roboto, "Helvetica Neue", Arial, sans-serif;
--font-korean: "Apple SD Gothic Neo", "Malgun Gothic", 
               "맑은 고딕", sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

### 7.3 간격 시스템
```css
/* Spacing Scale (8px base) */
--space-0: 0;
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
```

### 7.4 그림자
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

### 7.5 Border Radius
```css
--radius-sm: 0.25rem;  /* 4px */
--radius-md: 0.375rem; /* 6px */
--radius-lg: 0.5rem;   /* 8px */
--radius-xl: 0.75rem;  /* 12px */
--radius-2xl: 1rem;    /* 16px */
--radius-full: 9999px;
```

### 7.6 Z-Index Scale
```css
--z-dropdown: 1000;
--z-sticky: 1020;
--z-fixed: 1030;
--z-modal-backdrop: 1040;
--z-modal: 1050;
--z-popover: 1060;
--z-tooltip: 1070;
```

---

## 8. 반응형 브레이크포인트

```css
/* Mobile First Approach */
/* Mobile: 0px ~ 767px (기본) */
/* Tablet: 768px ~ 1023px */
@media (min-width: 768px) { }

/* Desktop: 1024px ~ 1279px */
@media (min-width: 1024px) { }

/* Large Desktop: 1280px+ */
@media (min-width: 1280px) { }
```

---

## 9. 애니메이션 명세

### 9.1 사이드바 슬라이드 애니메이션
```css
/* 열기 */
@keyframes slideIn {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 닫기 */
@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(-100%);
    opacity: 0;
  }
}

/* 타이밍: 250ms ease-out */
```

### 9.2 오버레이 애니메이션
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* 타이밍: 150ms ease */
```

### 9.3 버튼 탭 피드백
```css
@keyframes buttonTap {
  0% { transform: scale(1); }
  50% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

/* 타이밍: 100ms ease */
```

---

## 10. 컴포넌트 명세

### 10.1 햄버거 메뉴 버튼
```html
<button 
  class="hamburger-btn"
  aria-label="메뉴 열기"
  aria-expanded="false">
  <span class="hamburger-line"></span>
  <span class="hamburger-line"></span>
  <span class="hamburger-line"></span>
</button>
```

**CSS 클래스**:
- `.hamburger-btn`: 버튼 컨테이너
- `.hamburger-line`: 각 라인
- `.hamburger-btn.active`: 활성화 상태 (X 아이콘으로 변환)

### 10.2 슬라이드 메뉴
```html
<div class="sidebar-overlay" role="presentation"></div>
<aside 
  class="sidebar-mobile"
  role="navigation"
  aria-label="주 메뉴">
  <div class="sidebar-header">
    <button 
      class="sidebar-close"
      aria-label="메뉴 닫기">
      ×
    </button>
  </div>
  <nav class="sidebar-nav">
    <!-- 메뉴 항목 -->
  </nav>
</aside>
```

### 10.3 퀵 액션 버튼 컨테이너
```html
<div class="quick-actions">
  <button class="quick-action-btn">
    <span class="quick-action-text">방과후학교 가정통신문</span>
  </button>
  <!-- 추가 버튼들 -->
</div>
```

---

## 11. 테스트 시나리오

### 11.1 모바일 반응형 테스트
- [ ] iPhone SE (375x667) 화면에서 정상 표시
- [ ] iPhone 12 Pro (390x844) 화면에서 정상 표시
- [ ] Galaxy S21 (360x800) 화면에서 정상 표시
- [ ] 가로/세로 모드 전환 시 레이아웃 유지

### 11.2 햄버거 메뉴 테스트
- [ ] 햄버거 버튼 클릭 시 메뉴 열림
- [ ] 오버레이 클릭 시 메뉴 닫힘
- [ ] X 버튼 클릭 시 메뉴 닫힘
- [ ] ESC 키로 메뉴 닫기
- [ ] 메뉴 열림 시 body 스크롤 비활성화
- [ ] 애니메이션 부드러움 (60fps)

### 11.3 입력창 테스트
- [ ] 키보드 오픈 시 입력창 위로 이동
- [ ] 파일 첨부 버튼 동작
- [ ] 전송 버튼 동작
- [ ] 멀티라인 입력 시 높이 자동 조정

### 11.4 성능 테스트
- [ ] Lighthouse Mobile 점수 70 이상
- [ ] First Contentful Paint < 2초
- [ ] Time to Interactive < 5초
- [ ] Total Blocking Time < 300ms

### 11.5 접근성 테스트
- [ ] 스크린 리더로 모든 요소 접근 가능
- [ ] Tab 키로 모든 인터랙티브 요소 접근
- [ ] 색상 대비 4.5:1 이상
- [ ] ARIA 레이블 적절히 설정

---

## 12. 우선순위 및 일정

### Phase 1: 핵심 모바일 UI (1주)
- P0: 햄버거 메뉴 구현
- P0: 반응형 헤더
- P0: 채팅 인터페이스 최적화

### Phase 2: UX 개선 (1주)
- P1: 퀵 액션 수평 스크롤
- P1: 로딩 상태 표시
- P1: 애니메이션 최적화

### Phase 3: 마무리 (3일)
- P2: 접근성 개선
- P2: 성능 최적화
- P2: 크로스 브라우저 테스트

---

## 13. 성공 지표

### 정량적 지표
- 모바일 이탈률 20% 감소
- 모바일 평균 세션 시간 30% 증가
- Lighthouse Mobile 점수 70+ 달성
- 페이지 로딩 시간 3초 이내

### 정성적 지표
- 사용자 피드백 긍정 평가 80% 이상
- 모바일에서 문서 생성까지 클릭 수 최소화
- 직관적인 네비게이션

---

## 14. 참고 자료

- [Apple Human Interface Guidelines - Touch](https://developer.apple.com/design/human-interface-guidelines/ios/user-interaction/touchscreen-gestures/)
- [Material Design - Mobile Navigation](https://material.io/components/navigation-drawer)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web.dev - Mobile Performance](https://web.dev/lighthouse-performance/)

---

## 부록 A: 현재 사이트 구조 분석

### HTML 구조
```
- <header> : 헤더 영역
  - 로고
  - 로그인 버튼
  
- <aside> : 사이드바 (240px 고정)
  - 사이드바 접기 버튼
  - 새 대화 버튼
  - 문서 도구 버튼
  
- <main> : 메인 컨텐츠
  - 인사 메시지
  - 채팅 입력창
  - 퀵 액션 버튼들
```

### 현재 문제점 상세
1. **사이드바 고정 너비**: 
   - 375px 모바일 화면에서 240px = 64% 차지
   - 메인 컨텐츠 영역: 135px만 사용 가능

2. **반응형 미지원**:
   - 미디어 쿼리 없음
   - 모바일 최적화 CSS 없음
   - viewport meta 태그 확인 필요

3. **터치 최적화 부족**:
   - 버튼 크기 44px 미만 추정
   - 터치 영역 간격 부족

---

**문서 끝**
