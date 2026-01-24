# 티처메이트 CSS 구현 가이드

**버전**: 1.0  
**작성일**: 2025-01-24

---

## 목차
1. [CSS 아키텍처](#1-css-아키텍처)
2. [CSS 변수 (Custom Properties)](#2-css-변수)
3. [반응형 유틸리티](#3-반응형-유틸리티)
4. [컴포넌트 스타일](#4-컴포넌트-스타일)
5. [애니메이션](#5-애니메이션)

---

## 1. CSS 아키텍처

### 1.1 파일 구조
```
styles/
├── base/
│   ├── reset.css          # CSS 리셋
│   ├── variables.css      # CSS 변수
│   └── typography.css     # 폰트 설정
├── components/
│   ├── header.css         # 헤더
│   ├── sidebar.css        # 사이드바
│   ├── chat.css           # 채팅 인터페이스
│   ├── input.css          # 입력 영역
│   ├── buttons.css        # 버튼
│   └── modal.css          # 모달
├── utilities/
│   ├── spacing.css        # 여백 유틸리티
│   ├── layout.css         # 레이아웃 유틸리티
│   └── responsive.css     # 반응형 유틸리티
└── main.css               # 메인 엔트리 포인트
```

### 1.2 네이밍 규칙
- BEM 방법론 사용
- Block: `.header`, `.sidebar`, `.chat`
- Element: `.header__logo`, `.sidebar__menu-item`
- Modifier: `.button--primary`, `.sidebar--collapsed`

---

## 2. CSS 변수

### 2.1 variables.css
```css
:root {
  /* ========== Colors ========== */
  /* Primary */
  --color-primary: #3B82F6;
  --color-primary-hover: #2563EB;
  --color-primary-active: #1D4ED8;
  --color-primary-light: #DBEAFE;
  
  /* Neutral */
  --color-gray-50: #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-200: #E5E7EB;
  --color-gray-300: #D1D5DB;
  --color-gray-400: #9CA3AF;
  --color-gray-500: #6B7280;
  --color-gray-600: #4B5563;
  --color-gray-700: #374151;
  --color-gray-800: #1F2937;
  --color-gray-900: #111827;
  
  /* Semantic */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;
  
  /* Background */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F9FAFB;
  --bg-tertiary: #F3F4F6;
  
  /* Text */
  --text-primary: #1F2937;
  --text-secondary: #6B7280;
  --text-tertiary: #9CA3AF;
  --text-inverse: #FFFFFF;
  
  /* Border */
  --border-color: #E5E7EB;
  --border-color-hover: #D1D5DB;
  --border-color-focus: #3B82F6;
  
  /* ========== Typography ========== */
  /* Font Family */
  --font-primary: -apple-system, BlinkMacSystemFont, "Segoe UI", 
                  Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-korean: "Apple SD Gothic Neo", "Malgun Gothic", 
                 "맑은 고딕", sans-serif;
  
  /* Font Sizes */
  --text-xs: 0.75rem;      /* 12px */
  --text-sm: 0.875rem;     /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg: 1.125rem;     /* 18px */
  --text-xl: 1.25rem;      /* 20px */
  --text-2xl: 1.5rem;      /* 24px */
  --text-3xl: 1.875rem;    /* 30px */
  --text-4xl: 2.25rem;     /* 36px */
  
  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  
  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  
  /* ========== Spacing ========== */
  --space-0: 0;
  --space-1: 0.25rem;    /* 4px */
  --space-2: 0.5rem;     /* 8px */
  --space-3: 0.75rem;    /* 12px */
  --space-4: 1rem;       /* 16px */
  --space-5: 1.25rem;    /* 20px */
  --space-6: 1.5rem;     /* 24px */
  --space-8: 2rem;       /* 32px */
  --space-10: 2.5rem;    /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
  
  /* ========== Layout ========== */
  /* Widths */
  --sidebar-width: 240px;
  --sidebar-mobile-width: 80vw;
  --sidebar-mobile-max-width: 280px;
  --header-height: 56px;
  --input-height: 56px;
  --max-content-width: 768px;
  
  /* ========== Shadows ========== */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  
  /* ========== Border Radius ========== */
  --radius-sm: 0.25rem;    /* 4px */
  --radius-md: 0.375rem;   /* 6px */
  --radius-lg: 0.5rem;     /* 8px */
  --radius-xl: 0.75rem;    /* 12px */
  --radius-2xl: 1rem;      /* 16px */
  --radius-full: 9999px;
  
  /* ========== Z-Index ========== */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
  
  /* ========== Transitions ========== */
  --transition-fast: 150ms;
  --transition-base: 200ms;
  --transition-slow: 300ms;
  --transition-slower: 500ms;
  
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 3. 반응형 유틸리티

### 3.1 responsive.css
```css
/* ========== Breakpoint Mixins ========== */
/* Mobile First 접근법 */

/* Mobile: 0px ~ 767px (기본) */

/* Tablet: 768px ~ 1023px */
@media (min-width: 768px) {
  .mobile-only {
    display: none !important;
  }
  
  .desktop-only {
    display: block !important;
  }
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
  .tablet-only {
    display: none !important;
  }
}

/* Mobile Only (< 768px) */
@media (max-width: 767px) {
  .mobile-only {
    display: block !important;
  }
  
  .desktop-only {
    display: none !important;
  }
}

/* ========== Container ========== */
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--space-4);
  padding-right: var(--space-4);
}

@media (min-width: 768px) {
  .container {
    max-width: 768px;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 1024px;
  }
}

@media (min-width: 1280px) {
  .container {
    max-width: 1280px;
  }
}
```

---

## 4. 컴포넌트 스타일

### 4.1 header.css
```css
/* ========== Header ========== */
.header {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  height: var(--header-height);
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6);
}

@media (max-width: 767px) {
  .header {
    padding: 0 var(--space-3);
  }
}

/* Logo */
.header__logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  text-decoration: none;
  color: var(--text-primary);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.header__logo-icon {
  width: 24px;
  height: 24px;
}

@media (max-width: 767px) {
  .header__logo {
    font-size: var(--text-base);
  }
  
  .header__logo-icon {
    width: 20px;
    height: 20px;
  }
}

/* Hamburger Button */
.header__hamburger {
  display: none;
  width: 48px;
  height: 48px;
  padding: 12px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
}

@media (max-width: 767px) {
  .header__hamburger {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 4px;
  }
}

.header__hamburger-line {
  width: 20px;
  height: 2px;
  background-color: currentColor;
  transition: all var(--transition-base) var(--ease-out);
}

/* Hamburger Active State (Transform to X) */
.header__hamburger.active .header__hamburger-line:nth-child(1) {
  transform: translateY(6px) rotate(45deg);
}

.header__hamburger.active .header__hamburger-line:nth-child(2) {
  opacity: 0;
}

.header__hamburger.active .header__hamburger-line:nth-child(3) {
  transform: translateY(-6px) rotate(-45deg);
}

/* Login Button */
.header__login {
  height: 36px;
  padding: var(--space-2) var(--space-4);
  background-color: var(--color-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: background-color var(--transition-fast) var(--ease-out);
}

.header__login:hover {
  background-color: var(--color-primary-hover);
}

.header__login:active {
  background-color: var(--color-primary-active);
}

@media (max-width: 767px) {
  .header__login {
    height: 32px;
    padding: var(--space-1) var(--space-3);
    font-size: var(--text-xs);
  }
}
```

### 4.2 sidebar.css
```css
/* ========== Sidebar ========== */
.sidebar {
  width: var(--sidebar-width);
  height: calc(100vh - var(--header-height));
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  padding: var(--space-4);
  overflow-y: auto;
}

/* Desktop */
@media (min-width: 768px) {
  .sidebar {
    position: sticky;
    top: var(--header-height);
  }
}

/* Mobile Slide Menu */
@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: var(--sidebar-mobile-width);
    max-width: var(--sidebar-mobile-max-width);
    height: 100vh;
    z-index: var(--z-modal);
    background-color: var(--bg-primary);
    transform: translateX(-100%);
    transition: transform var(--transition-slow) var(--ease-out);
  }
  
  .sidebar.open {
    transform: translateX(0);
  }
}

/* Sidebar Header */
.sidebar__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-color);
  margin-bottom: var(--space-4);
}

@media (min-width: 768px) {
  .sidebar__header {
    border-bottom: none;
  }
}

.sidebar__close {
  display: none;
  width: 40px;
  height: 40px;
  padding: var(--space-2);
  background: none;
  border: none;
  font-size: var(--text-2xl);
  color: var(--text-secondary);
  cursor: pointer;
}

@media (max-width: 767px) {
  .sidebar__close {
    display: block;
  }
}

/* Toggle Button (Desktop) */
.sidebar__toggle {
  width: 100%;
  height: 40px;
  padding: var(--space-2) var(--space-3);
  background: none;
  border: none;
  border-radius: var(--radius-lg);
  text-align: left;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color var(--transition-fast) var(--ease-out);
}

.sidebar__toggle:hover {
  background-color: var(--bg-tertiary);
}

@media (max-width: 767px) {
  .sidebar__toggle {
    display: none;
  }
}

/* Menu Items */
.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sidebar__menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  height: 48px;
  padding: var(--space-3) var(--space-4);
  background: none;
  border: none;
  border-radius: var(--radius-lg);
  text-align: left;
  font-size: var(--text-base);
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color var(--transition-fast) var(--ease-out);
}

.sidebar__menu-item:hover {
  background-color: var(--bg-tertiary);
}

.sidebar__menu-item.active {
  background-color: var(--color-gray-200);
}

@media (max-width: 767px) {
  .sidebar__menu-item {
    height: 56px;
  }
}

.sidebar__menu-icon {
  width: 24px;
  height: 24px;
}

/* Overlay */
.sidebar-overlay {
  display: none;
}

@media (max-width: 767px) {
  .sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: var(--z-modal-backdrop);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition-fast) var(--ease-out);
  }
  
  .sidebar-overlay.visible {
    display: block;
    opacity: 1;
    pointer-events: auto;
  }
}
```

### 4.3 chat.css
```css
/* ========== Chat Interface ========== */
.chat {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--header-height));
  max-width: var(--max-content-width);
  margin: 0 auto;
  padding: var(--space-4);
}

@media (max-width: 767px) {
  .chat {
    padding: var(--space-3);
  }
}

/* Welcome Message */
.chat__welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: var(--space-8);
}

.chat__welcome-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.chat__welcome-subtitle {
  font-size: var(--text-lg);
  color: var(--text-secondary);
  margin-bottom: var(--space-8);
}

@media (max-width: 767px) {
  .chat__welcome-title {
    font-size: var(--text-2xl);
  }
  
  .chat__welcome-subtitle {
    font-size: var(--text-base);
  }
}

/* Messages Container */
.chat__messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* Message Bubble */
.chat__message {
  display: flex;
  gap: var(--space-2);
}

.chat__message--user {
  justify-content: flex-end;
}

.chat__message--assistant {
  justify-content: flex-start;
}

.chat__message-content {
  max-width: 70%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-2xl);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  word-wrap: break-word;
}

.chat__message--user .chat__message-content {
  background-color: var(--color-primary);
  color: var(--text-inverse);
  border-bottom-right-radius: var(--radius-sm);
}

.chat__message--assistant .chat__message-content {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border-bottom-left-radius: var(--radius-sm);
}

.chat__message-timestamp {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: var(--space-1);
}

/* Loading Indicator */
.chat__loading {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4);
}

.chat__loading-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background-color: var(--text-tertiary);
  animation: loading-pulse 1.5s ease-in-out infinite;
}

.chat__loading-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.chat__loading-dot:nth-child(3) {
  animation-delay: 0.4s;
}
```

### 4.4 input.css
```css
/* ========== Input Area ========== */
.input-area {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  transition: border-color var(--transition-fast) var(--ease-out);
}

.input-area:focus-within {
  border-color: var(--border-color-focus);
}

@media (max-width: 767px) {
  .input-area {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: var(--space-2) var(--space-3);
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
    padding-bottom: calc(var(--space-2) + env(safe-area-inset-bottom));
  }
}

/* File Attach Button */
.input-area__attach {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  padding: var(--space-2);
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast) var(--ease-out);
}

.input-area__attach:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

@media (max-width: 767px) {
  .input-area__attach {
    width: 44px;
    height: 44px;
  }
}

/* Text Input */
.input-area__textarea {
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  padding: var(--space-2) var(--space-3);
  border: none;
  outline: none;
  resize: none;
  font-family: var(--font-primary);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  overflow-y: auto;
}

.input-area__textarea::placeholder {
  color: var(--text-tertiary);
}

@media (max-width: 767px) {
  .input-area__textarea {
    min-height: 44px;
  }
}

/* Send Button */
.input-area__send {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  padding: var(--space-2);
  background-color: var(--color-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast) var(--ease-out);
}

.input-area__send:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.input-area__send:active:not(:disabled) {
  transform: scale(0.95);
}

.input-area__send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 767px) {
  .input-area__send {
    width: 44px;
    height: 44px;
  }
}
```

### 4.5 buttons.css
```css
/* ========== Quick Action Buttons ========== */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  padding: var(--space-4) 0;
}

@media (max-width: 767px) {
  .quick-actions {
    display: flex;
    overflow-x: auto;
    gap: var(--space-2);
    padding: var(--space-4) var(--space-4);
    margin: 0 calc(var(--space-4) * -1);
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }
  
  /* Hide scrollbar */
  .quick-actions::-webkit-scrollbar {
    display: none;
  }
  
  .quick-actions {
    scrollbar-width: none;
  }
}

.quick-action-btn {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 56px;
  padding: var(--space-3) var(--space-4);
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast) var(--ease-out);
}

.quick-action-btn:hover {
  background-color: var(--bg-secondary);
  border-color: var(--color-primary);
}

.quick-action-btn:active {
  transform: scale(0.95);
}

@media (max-width: 767px) {
  .quick-action-btn {
    flex-shrink: 0;
    min-width: 160px;
    height: 48px;
    scroll-snap-align: start;
  }
}

/* Primary Button */
.btn-primary {
  padding: var(--space-2) var(--space-4);
  background-color: var(--color-primary);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast) var(--ease-out);
}

.btn-primary:hover {
  background-color: var(--color-primary-hover);
}

.btn-primary:active {
  background-color: var(--color-primary-active);
  transform: scale(0.95);
}

/* Secondary Button */
.btn-secondary {
  padding: var(--space-2) var(--space-4);
  background-color: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast) var(--ease-out);
}

.btn-secondary:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--border-color-hover);
}
```

---

## 5. 애니메이션

### 5.1 animations.css
```css
/* ========== Keyframes ========== */

/* Slide In (from left) */
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

/* Slide Out (to left) */
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

/* Fade In */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Fade Out */
@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* Loading Pulse */
@keyframes loading-pulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

/* Button Tap */
@keyframes buttonTap {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}

/* Spin (for loading spinner) */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ========== Animation Classes ========== */

.animate-slideIn {
  animation: slideIn var(--transition-slow) var(--ease-out);
}

.animate-slideOut {
  animation: slideOut var(--transition-slow) var(--ease-in);
}

.animate-fadeIn {
  animation: fadeIn var(--transition-fast) var(--ease-out);
}

.animate-fadeOut {
  animation: fadeOut var(--transition-fast) var(--ease-in);
}

/* ========== Loading Spinner ========== */
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-gray-200);
  border-top-color: var(--color-primary);
  border-radius: var(--radius-full);
  animation: spin 1s linear infinite;
}

.spinner--small {
  width: 20px;
  height: 20px;
  border-width: 2px;
}
```

---

## 6. 유틸리티 클래스

### 6.1 utilities.css
```css
/* ========== Display ========== */
.hidden {
  display: none !important;
}

.block {
  display: block !important;
}

.inline-block {
  display: inline-block !important;
}

.flex {
  display: flex !important;
}

.inline-flex {
  display: inline-flex !important;
}

.grid {
  display: grid !important;
}

/* ========== Flexbox ========== */
.flex-row {
  flex-direction: row !important;
}

.flex-col {
  flex-direction: column !important;
}

.items-center {
  align-items: center !important;
}

.items-start {
  align-items: flex-start !important;
}

.items-end {
  align-items: flex-end !important;
}

.justify-center {
  justify-content: center !important;
}

.justify-between {
  justify-content: space-between !important;
}

.justify-end {
  justify-content: flex-end !important;
}

.gap-2 {
  gap: var(--space-2) !important;
}

.gap-4 {
  gap: var(--space-4) !important;
}

/* ========== Spacing ========== */
.m-0 { margin: 0 !important; }
.mt-4 { margin-top: var(--space-4) !important; }
.mb-4 { margin-bottom: var(--space-4) !important; }
.p-4 { padding: var(--space-4) !important; }

/* ========== Text ========== */
.text-center {
  text-align: center !important;
}

.text-left {
  text-align: left !important;
}

.text-right {
  text-align: right !important;
}

.font-bold {
  font-weight: var(--font-bold) !important;
}

.text-primary {
  color: var(--text-primary) !important;
}

.text-secondary {
  color: var(--text-secondary) !important;
}

/* ========== Accessibility ========== */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Focus visible */
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

## 7. 사용 예시

### 7.1 HTML 구조 예시
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>티처메이트</title>
  <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
  <!-- Header -->
  <header class="header">
    <button class="header__hamburger mobile-only" aria-label="메뉴 열기">
      <span class="header__hamburger-line"></span>
      <span class="header__hamburger-line"></span>
      <span class="header__hamburger-line"></span>
    </button>
    
    <a href="/" class="header__logo">
      <svg class="header__logo-icon"><!-- 로고 --></svg>
      <span>티처메이트</span>
    </a>
    
    <button class="header__login">로그인</button>
  </header>
  
  <!-- Sidebar Overlay (Mobile) -->
  <div class="sidebar-overlay"></div>
  
  <!-- Main Layout -->
  <div style="display: flex;">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar__header">
        <button class="sidebar__close mobile-only" aria-label="메뉴 닫기">×</button>
      </div>
      
      <nav class="sidebar__nav">
        <button class="sidebar__menu-item">
          <span class="sidebar__menu-icon">💬</span>
          <span>새 대화</span>
        </button>
        <button class="sidebar__menu-item">
          <span class="sidebar__menu-icon">📝</span>
          <span>문서 도구</span>
        </button>
      </nav>
    </aside>
    
    <!-- Main Content -->
    <main class="chat">
      <div class="chat__welcome">
        <h1 class="chat__welcome-title">안녕하세요,</h1>
        <p class="chat__welcome-subtitle">무엇을 도와드릴까요?</p>
      </div>
      
      <!-- Input Area -->
      <div class="input-area">
        <button class="input-area__attach">📎</button>
        <textarea 
          class="input-area__textarea" 
          placeholder="무엇을 도와드릴까요?"
          rows="1"></textarea>
        <button class="input-area__send">↑</button>
      </div>
      
      <!-- Quick Actions -->
      <div class="quick-actions">
        <button class="quick-action-btn">방과후학교 가정통신문</button>
        <button class="quick-action-btn">학사일정 공지사항</button>
        <button class="quick-action-btn">학부모 상담 기록</button>
        <button class="quick-action-btn">현장체험학습 계획서</button>
      </div>
    </main>
  </div>
  
  <script src="/scripts/main.js"></script>
</body>
</html>
```

---

**문서 끝**
