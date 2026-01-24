# 티처메이트 JavaScript 구현 가이드

**버전**: 1.0  
**작성일**: 2025-01-24

---

## 목차
1. [프로젝트 구조](#1-프로젝트-구조)
2. [모바일 네비게이션](#2-모바일-네비게이션)
3. [입력 영역 처리](#3-입력-영역-처리)
4. [반응형 처리](#4-반응형-처리)
5. [유틸리티 함수](#5-유틸리티-함수)

---

## 1. 프로젝트 구조

### 1.1 파일 구조
```
scripts/
├── utils/
│   ├── dom.js           # DOM 조작 유틸리티
│   ├── events.js        # 이벤트 헬퍼
│   └── responsive.js    # 반응형 유틸리티
├── components/
│   ├── sidebar.js       # 사이드바 로직
│   ├── chat.js          # 채팅 인터페이스
│   └── input.js         # 입력 영역
├── app.js               # 메인 앱 로직
└── main.js              # 엔트리 포인트
```

---

## 2. 모바일 네비게이션

### 2.1 sidebar.js
```javascript
/**
 * 사이드바 관리 클래스
 */
class Sidebar {
  constructor() {
    this.sidebar = document.querySelector('.sidebar');
    this.overlay = document.querySelector('.sidebar-overlay');
    this.hamburger = document.querySelector('.header__hamburger');
    this.closeBtn = document.querySelector('.sidebar__close');
    this.menuItems = document.querySelectorAll('.sidebar__menu-item');
    
    this.isOpen = false;
    this.isMobile = window.innerWidth < 768;
    
    this.init();
  }
  
  /**
   * 초기화
   */
  init() {
    this.bindEvents();
    this.checkResponsive();
  }
  
  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    // 햄버거 버튼 클릭
    if (this.hamburger) {
      this.hamburger.addEventListener('click', () => this.toggle());
    }
    
    // 닫기 버튼 클릭
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
    
    // 오버레이 클릭
    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.close());
    }
    
    // ESC 키
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
    
    // 메뉴 항목 클릭 (모바일에서만 닫기)
    this.menuItems.forEach(item => {
      item.addEventListener('click', () => {
        if (this.isMobile) {
          this.close();
        }
      });
    });
    
    // 리사이즈 이벤트
    window.addEventListener('resize', () => this.handleResize());
  }
  
  /**
   * 사이드바 열기
   */
  open() {
    if (!this.isMobile) return;
    
    this.isOpen = true;
    this.sidebar.classList.add('open');
    this.overlay.classList.add('visible');
    this.hamburger.classList.add('active');
    
    // body 스크롤 비활성화
    document.body.style.overflow = 'hidden';
    
    // 접근성
    this.sidebar.setAttribute('aria-hidden', 'false');
    this.hamburger.setAttribute('aria-expanded', 'true');
  }
  
  /**
   * 사이드바 닫기
   */
  close() {
    if (!this.isMobile) return;
    
    this.isOpen = false;
    this.sidebar.classList.remove('open');
    this.overlay.classList.remove('visible');
    this.hamburger.classList.remove('active');
    
    // body 스크롤 활성화
    document.body.style.overflow = '';
    
    // 접근성
    this.sidebar.setAttribute('aria-hidden', 'true');
    this.hamburger.setAttribute('aria-expanded', 'false');
  }
  
  /**
   * 토글
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  /**
   * 리사이즈 핸들러
   */
  handleResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;
    
    // 모바일 → 데스크톱 전환 시
    if (wasMobile && !this.isMobile) {
      this.close();
      document.body.style.overflow = '';
    }
  }
  
  /**
   * 반응형 체크
   */
  checkResponsive() {
    if (this.isMobile) {
      this.sidebar.setAttribute('aria-hidden', 'true');
    } else {
      this.sidebar.setAttribute('aria-hidden', 'false');
    }
  }
}

// Export
export default Sidebar;
```

---

## 3. 입력 영역 처리

### 3.1 input.js
```javascript
/**
 * 입력 영역 관리 클래스
 */
class InputArea {
  constructor() {
    this.textarea = document.querySelector('.input-area__textarea');
    this.sendBtn = document.querySelector('.input-area__send');
    this.attachBtn = document.querySelector('.input-area__attach');
    this.inputArea = document.querySelector('.input-area');
    
    this.maxHeight = 120; // px
    this.minHeight = 40; // px (desktop), 44px (mobile)
    
    this.init();
  }
  
  /**
   * 초기화
   */
  init() {
    this.bindEvents();
    this.updateSendButton();
  }
  
  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    // 텍스트 입력 시 자동 높이 조정
    this.textarea.addEventListener('input', () => {
      this.autoResize();
      this.updateSendButton();
    });
    
    // Enter 키 전송 (Shift+Enter는 줄바꿈)
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });
    
    // 전송 버튼 클릭
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.send());
    }
    
    // 파일 첨부 버튼 클릭
    if (this.attachBtn) {
      this.attachBtn.addEventListener('click', () => this.attachFile());
    }
    
    // 키보드 표시/숨김 감지 (모바일)
    if (this.isMobile()) {
      this.handleMobileKeyboard();
    }
  }
  
  /**
   * 자동 높이 조정
   */
  autoResize() {
    // 높이 리셋
    this.textarea.style.height = 'auto';
    
    // 새 높이 계산
    const scrollHeight = this.textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, this.minHeight), this.maxHeight);
    
    // 적용
    this.textarea.style.height = `${newHeight}px`;
  }
  
  /**
   * 전송 버튼 활성화/비활성화
   */
  updateSendButton() {
    const hasContent = this.textarea.value.trim().length > 0;
    
    if (this.sendBtn) {
      this.sendBtn.disabled = !hasContent;
    }
  }
  
  /**
   * 메시지 전송
   */
  async send() {
    const message = this.textarea.value.trim();
    
    if (!message) return;
    
    try {
      // 입력 비활성화
      this.setEnabled(false);
      
      // 메시지 전송 로직
      await this.sendMessage(message);
      
      // 입력창 초기화
      this.clear();
      
    } catch (error) {
      console.error('Message send error:', error);
      alert('메시지 전송에 실패했습니다.');
      
    } finally {
      // 입력 활성화
      this.setEnabled(true);
      this.textarea.focus();
    }
  }
  
  /**
   * 실제 메시지 전송 (API 호출)
   */
  async sendMessage(message) {
    // TODO: 실제 API 호출 구현
    console.log('Sending message:', message);
    
    // 예시: fetch API
    // const response = await fetch('/api/chat', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ message })
    // });
    // return response.json();
    
    // 임시 딜레이
    return new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  /**
   * 파일 첨부
   */
  attachFile() {
    // 파일 입력 생성
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf,.doc,.docx,.hwp';
    
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleFileUpload(file);
      }
    });
    
    input.click();
  }
  
  /**
   * 파일 업로드 처리
   */
  async handleFileUpload(file) {
    try {
      console.log('Uploading file:', file.name);
      
      // TODO: 실제 파일 업로드 구현
      // const formData = new FormData();
      // formData.append('file', file);
      // const response = await fetch('/api/upload', {
      //   method: 'POST',
      //   body: formData
      // });
      
      alert(`파일 "${file.name}"이 업로드되었습니다.`);
      
    } catch (error) {
      console.error('File upload error:', error);
      alert('파일 업로드에 실패했습니다.');
    }
  }
  
  /**
   * 입력 영역 활성화/비활성화
   */
  setEnabled(enabled) {
    this.textarea.disabled = !enabled;
    this.sendBtn.disabled = !enabled;
    this.attachBtn.disabled = !enabled;
  }
  
  /**
   * 입력창 초기화
   */
  clear() {
    this.textarea.value = '';
    this.autoResize();
    this.updateSendButton();
  }
  
  /**
   * 모바일 키보드 처리
   */
  handleMobileKeyboard() {
    let lastHeight = window.innerHeight;
    
    // visualViewport API 사용 (iOS Safari)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        const currentHeight = window.visualViewport.height;
        const diff = lastHeight - currentHeight;
        
        // 키보드가 열렸을 때 (높이가 줄어듦)
        if (diff > 100) {
          this.inputArea.style.bottom = `${window.innerHeight - currentHeight}px`;
        } else {
          // 키보드가 닫혔을 때
          this.inputArea.style.bottom = '';
        }
        
        lastHeight = currentHeight;
      });
    }
  }
  
  /**
   * 모바일 체크
   */
  isMobile() {
    return window.innerWidth < 768;
  }
}

// Export
export default InputArea;
```

---

## 4. 반응형 처리

### 4.1 responsive.js
```javascript
/**
 * 반응형 유틸리티
 */
class ResponsiveManager {
  constructor() {
    this.breakpoints = {
      mobile: 768,
      tablet: 1024,
      desktop: 1280
    };
    
    this.currentBreakpoint = this.getCurrentBreakpoint();
    
    this.init();
  }
  
  /**
   * 초기화
   */
  init() {
    this.bindEvents();
  }
  
  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    let resizeTimer;
    
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      
      resizeTimer = setTimeout(() => {
        this.handleResize();
      }, 150); // 디바운스 150ms
    });
  }
  
  /**
   * 현재 브레이크포인트 반환
   */
  getCurrentBreakpoint() {
    const width = window.innerWidth;
    
    if (width < this.breakpoints.mobile) {
      return 'mobile';
    } else if (width < this.breakpoints.tablet) {
      return 'tablet';
    } else if (width < this.breakpoints.desktop) {
      return 'desktop';
    } else {
      return 'large';
    }
  }
  
  /**
   * 브레이크포인트 체크
   */
  is(breakpoint) {
    const width = window.innerWidth;
    
    switch (breakpoint) {
      case 'mobile':
        return width < this.breakpoints.mobile;
      case 'tablet':
        return width >= this.breakpoints.mobile && width < this.breakpoints.tablet;
      case 'desktop':
        return width >= this.breakpoints.tablet;
      default:
        return false;
    }
  }
  
  /**
   * 리사이즈 핸들러
   */
  handleResize() {
    const newBreakpoint = this.getCurrentBreakpoint();
    
    if (newBreakpoint !== this.currentBreakpoint) {
      this.onBreakpointChange(this.currentBreakpoint, newBreakpoint);
      this.currentBreakpoint = newBreakpoint;
    }
  }
  
  /**
   * 브레이크포인트 변경 콜백
   */
  onBreakpointChange(oldBreakpoint, newBreakpoint) {
    console.log(`Breakpoint changed: ${oldBreakpoint} → ${newBreakpoint}`);
    
    // 커스텀 이벤트 발생
    const event = new CustomEvent('breakpointchange', {
      detail: { oldBreakpoint, newBreakpoint }
    });
    window.dispatchEvent(event);
  }
}

// Export
export default ResponsiveManager;
```

---

## 5. 유틸리티 함수

### 5.1 dom.js
```javascript
/**
 * DOM 조작 유틸리티
 */

/**
 * 요소 선택
 */
export function $(selector, context = document) {
  return context.querySelector(selector);
}

/**
 * 여러 요소 선택
 */
export function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/**
 * 클래스 토글
 */
export function toggleClass(element, className) {
  element.classList.toggle(className);
}

/**
 * 클래스 추가
 */
export function addClass(element, ...classNames) {
  element.classList.add(...classNames);
}

/**
 * 클래스 제거
 */
export function removeClass(element, ...classNames) {
  element.classList.remove(...classNames);
}

/**
 * 클래스 존재 여부
 */
export function hasClass(element, className) {
  return element.classList.contains(className);
}

/**
 * 속성 설정
 */
export function setAttr(element, attrs) {
  Object.keys(attrs).forEach(key => {
    element.setAttribute(key, attrs[key]);
  });
}

/**
 * 요소 생성
 */
export function createElement(tag, options = {}) {
  const element = document.createElement(tag);
  
  if (options.className) {
    element.className = options.className;
  }
  
  if (options.text) {
    element.textContent = options.text;
  }
  
  if (options.html) {
    element.innerHTML = options.html;
  }
  
  if (options.attrs) {
    setAttr(element, options.attrs);
  }
  
  return element;
}

/**
 * 요소 삽입
 */
export function insertAfter(newNode, referenceNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

/**
 * 요소 제거
 */
export function removeElement(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

/**
 * 스크롤 위치
 */
export function scrollTo(element, options = {}) {
  element.scrollIntoView({
    behavior: options.smooth ? 'smooth' : 'auto',
    block: options.block || 'start'
  });
}

/**
 * 포커스
 */
export function focus(element) {
  element.focus();
  
  // 스크린 리더 지원
  element.setAttribute('tabindex', '-1');
}
```

### 5.2 events.js
```javascript
/**
 * 이벤트 유틸리티
 */

/**
 * 이벤트 리스너 추가
 */
export function on(element, event, handler, options = {}) {
  element.addEventListener(event, handler, options);
  
  // 정리 함수 반환
  return () => {
    element.removeEventListener(event, handler, options);
  };
}

/**
 * 이벤트 리스너 제거
 */
export function off(element, event, handler, options = {}) {
  element.removeEventListener(event, handler, options);
}

/**
 * 한 번만 실행되는 이벤트 리스너
 */
export function once(element, event, handler) {
  const wrappedHandler = (e) => {
    handler(e);
    off(element, event, wrappedHandler);
  };
  
  on(element, event, wrappedHandler);
}

/**
 * 커스텀 이벤트 발생
 */
export function emit(element, eventName, detail = {}) {
  const event = new CustomEvent(eventName, {
    bubbles: true,
    cancelable: true,
    detail
  });
  
  element.dispatchEvent(event);
}

/**
 * 디바운스
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  
  return function (...args) {
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * 쓰로틀
 */
export function throttle(fn, limit = 300) {
  let inThrottle;
  
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 델리게이션
 */
export function delegate(element, selector, event, handler) {
  element.addEventListener(event, (e) => {
    const target = e.target.closest(selector);
    
    if (target) {
      handler.call(target, e);
    }
  });
}
```

---

## 6. 메인 앱

### 6.1 app.js
```javascript
import Sidebar from './components/sidebar.js';
import InputArea from './components/input.js';
import ResponsiveManager from './utils/responsive.js';

/**
 * 메인 앱 클래스
 */
class App {
  constructor() {
    this.sidebar = null;
    this.inputArea = null;
    this.responsive = null;
  }
  
  /**
   * 앱 초기화
   */
  async init() {
    try {
      console.log('Initializing TeacherMate app...');
      
      // 컴포넌트 초기화
      this.sidebar = new Sidebar();
      this.inputArea = new InputArea();
      this.responsive = new ResponsiveManager();
      
      // 이벤트 리스너
      this.bindGlobalEvents();
      
      console.log('App initialized successfully');
      
    } catch (error) {
      console.error('App initialization error:', error);
    }
  }
  
  /**
   * 전역 이벤트 바인딩
   */
  bindGlobalEvents() {
    // 브레이크포인트 변경
    window.addEventListener('breakpointchange', (e) => {
      console.log('Breakpoint changed:', e.detail);
    });
    
    // 온라인/오프라인
    window.addEventListener('online', () => {
      console.log('Connection restored');
    });
    
    window.addEventListener('offline', () => {
      console.log('Connection lost');
    });
    
    // 페이지 언로드
    window.addEventListener('beforeunload', (e) => {
      // 작성 중인 메시지가 있으면 경고
      const textarea = document.querySelector('.input-area__textarea');
      if (textarea && textarea.value.trim()) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }
}

// Export
export default App;
```

### 6.2 main.js
```javascript
import App from './app.js';

/**
 * DOM 로드 완료 후 앱 초기화
 */
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
```

---

## 7. 사용 예시

### 7.1 HTML에서 스크립트 로드
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
  <!-- HTML 내용 -->
  
  <!-- 스크립트 (모듈) -->
  <script type="module" src="/scripts/main.js"></script>
</body>
</html>
```

### 7.2 번들러 없이 사용할 경우
```javascript
// scripts/bundle.js (하나의 파일로 합침)

(function() {
  'use strict';
  
  // Sidebar 클래스
  class Sidebar {
    // ... (위 코드 복사)
  }
  
  // InputArea 클래스
  class InputArea {
    // ... (위 코드 복사)
  }
  
  // App 클래스
  class App {
    // ... (위 코드 복사)
  }
  
  // 초기화
  document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
  });
})();
```

---

## 8. 성능 최적화 팁

### 8.1 이벤트 리스너 최적화
```javascript
// ❌ 나쁜 예: 모든 버튼에 리스너 추가
buttons.forEach(btn => {
  btn.addEventListener('click', handler);
});

// ✅ 좋은 예: 이벤트 델리게이션
container.addEventListener('click', (e) => {
  if (e.target.matches('.button')) {
    handler(e);
  }
});
```

### 8.2 디바운스/쓰로틀 활용
```javascript
// 리사이즈 이벤트에 디바운스 적용
window.addEventListener('resize', debounce(() => {
  // 리사이즈 처리
}, 150));

// 스크롤 이벤트에 쓰로틀 적용
window.addEventListener('scroll', throttle(() => {
  // 스크롤 처리
}, 100));
```

### 8.3 DOM 조작 최소화
```javascript
// ❌ 나쁜 예: 반복적인 DOM 조작
for (let i = 0; i < 100; i++) {
  container.innerHTML += `<div>${i}</div>`;
}

// ✅ 좋은 예: 한 번에 추가
const fragment = document.createDocumentFragment();
for (let i = 0; i < 100; i++) {
  const div = document.createElement('div');
  div.textContent = i;
  fragment.appendChild(div);
}
container.appendChild(fragment);
```

---

**문서 끝**
