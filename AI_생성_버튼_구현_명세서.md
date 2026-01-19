# AI 생성 버튼 기능 구현 명세서

## 📋 개요

### 목적
방과후학교 운영계획서 및 초등돌봄교실 운영계획서 작성 시, 서술형 문장이 필요한 항목에 AI 생성 버튼을 추가하여 자동으로 적절한 내용을 생성

### 적용 대상
- **방과후학교 운영계획서** (우선)
- **초등돌봄교실 운영계획서** (동일 방식)

### 기술 스택
- **AI API**: OpenAI GPT-3.5-turbo
- **API Key**: `YOUR_OPENAI_API_KEY`
- **향후 계획**: RAG 기반 시스템으로 확장

---

## 🎯 적용 항목 (방과후학교 운영계획서)

### Step 2: 운영 목표 및 방침
**항목**: 추가 목적 (선택)
- **필드명**: `customPurpose`
- **타입**: textarea
- **AI 생성 조건**: 학교명, 학년도, 선택된 목적 체크박스
- **프롬프트 예시**:
```
{학교명}의 {학년도}학년도 방과후학교 운영 목적을 작성해주세요.
선택된 목적: {선택된 목적 리스트}
2-3문장으로 전문적이고 교육적인 톤으로 작성해주세요.
```

### Step 4: 프로그램 편성
**항목**: 프로그램 설명
- **필드명**: `programs[i].description`
- **타입**: textarea
- **AI 생성 조건**: 프로그램명, 대상학년, 운영시간
- **프롬프트 예시**:
```
'{프로그램명}' 프로그램에 대한 설명을 작성해주세요.
- 대상: {대상학년}
- 운영시간: {운영시간}
교육적 효과와 운영 방식을 포함하여 3-4문장으로 작성해주세요.
```

### Step 5: 안전 및 위생 관리
**항목**: 안전교육 계획
- **필드명**: `safetyEducationPlan`
- **타입**: textarea
- **AI 생성 조건**: 학교명, 대상학생 정보
- **프롬프트 예시**:
```
방과후학교 안전교육 계획을 작성해주세요.
- 학교: {학교명}
- 대상: {대상학년} 학생
화재안전, 성폭력예방, 실종예방 등의 내용을 포함하여 4-5문장으로 작성해주세요.
```

**항목**: 위생관리 계획
- **필드명**: `hygieneManagementPlan`
- **타입**: textarea
- **프롬프트 예시**:
```
방과후학교 위생관리 계획을 작성해주세요.
시설 소독, 개인위생 지도 등의 내용을 포함하여 3-4문장으로 작성해주세요.
```

### Step 6: 예산 운영 계획
**항목**: 예산 편성 원칙
- **필드명**: `budgetPrinciple`
- **타입**: textarea
- **AI 생성 조건**: 총 예산, 수입 항목
- **프롬프트 예시**:
```
방과후학교 예산 편성 원칙을 작성해주세요.
- 총 예산: {총예산}원
투명한 예산 집행과 효율적 운영에 대한 내용을 3-4문장으로 작성해주세요.
```

---

## 🎯 적용 항목 (초등돌봄교실 운영계획서)

### Step 2: 운영 목표 및 방침
**항목**: 추가 목표/방침
- **필드명**: `additionalGoals`
- **타입**: textarea
- **AI 생성 조건**: 학교명, 돌봄교실 유형, 선택된 목적

### Step 4: 프로그램 운영 계획
**항목**: 프로그램 내용
- **필드명**: `programs[i].content`
- **타입**: textarea
- **AI 생성 조건**: 프로그램명, 대상학년, 강사유형

### Step 6: 안전 및 급식 관리
**항목**: 안전교육 내용
- **필드명**: `safetyEducationContent`
- **타입**: textarea

**항목**: 알레르기 관리 방안
- **필드명**: `allergyManagementPlan`
- **타입**: textarea

### Step 7: 예산 및 인력 운영
**항목**: 인력 배치 기준
- **필드명**: `staffAllocationCriteria`
- **타입**: textarea

---

## 🎨 UI/UX 디자인

### 1. AI 생성 버튼 위치
```html
<div class="form-group" style="position: relative;">
    <label>추가 목적 (선택)</label>
    <button type="button" class="ai-generate-btn" data-field="customPurpose">
        <svg><!-- AI 아이콘 --></svg>
        AI 생성
    </button>
    <textarea id="customPurpose" placeholder="예: ..."></textarea>
</div>
```

### 2. 버튼 스타일
```css
.ai-generate-btn {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.ai-generate-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.ai-generate-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
}

.ai-generate-btn.generating {
    background: #999;
}

.ai-generate-btn svg {
    width: 16px;
    height: 16px;
}

/* 로딩 스피너 */
.ai-generate-btn .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
```

### 3. AI 아이콘 SVG
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
</svg>
```

---

## 🔧 Backend 구현

### 1. Flask 엔드포인트 추가

**파일**: `app.py`

```python
from flask import Flask, render_template, request, jsonify
from openai import OpenAI
import os
import json

# OpenAI 클라이언트 초기화
client = OpenAI(
    api_key="YOUR_OPENAI_API_KEY"
)

@app.route('/api/generate-ai-content', methods=['POST'])
def generate_ai_content():
    """
    AI 기반 텍스트 생성 API
    """
    try:
        data = request.json
        field_name = data.get('fieldName')  # 예: 'customPurpose', 'programs[0].description'
        context = data.get('context', {})    # 다른 폼 데이터
        document_type = data.get('documentType', 'afterschool')  # 'afterschool' or 'care'
        
        # 프롬프트 생성
        prompt = build_prompt(field_name, context, document_type)
        
        # OpenAI API 호출
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system", 
                    "content": "당신은 한국의 초등학교 행정 문서 작성 전문가입니다. 교육청 기준에 맞는 전문적이고 명확한 문장을 작성합니다."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=300,
            temperature=0.7,
            top_p=0.9
        )
        
        generated_text = response.choices[0].message.content.strip()
        
        return jsonify({
            'success': True,
            'text': generated_text,
            'fieldName': field_name
        })
        
    except Exception as e:
        print(f"AI 생성 오류: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def build_prompt(field_name, context, document_type):
    """
    필드별 프롬프트 생성
    """
    school_name = context.get('schoolName', '우리 초등학교')
    year = context.get('year', '2025')
    
    prompts = {
        'afterschool': {
            'customPurpose': f"""
{school_name}의 {year}학년도 방과후학교 운영 목적을 작성해주세요.

선택된 목적:
{', '.join(context.get('purposes', []))}

요구사항:
- 2-3문장으로 작성
- 교육적이고 전문적인 톤
- 학생 중심의 내용
- 구체적인 교육 목표 포함

형식: 일반 문장 (불릿 포인트 없이)
""",
            'programDescription': f"""
'{context.get('programName', '프로그램')}' 프로그램에 대한 설명을 작성해주세요.

프로그램 정보:
- 대상: {context.get('targetGrade', '1-6학년')}
- 운영시간: {context.get('operatingTime', '주 1회')}
- 유형: {context.get('programType', '특기적성')}

요구사항:
- 3-4문장으로 작성
- 교육적 효과 포함
- 운영 방식 간략히 설명
- 학생들의 발달에 도움이 되는 측면 강조

형식: 일반 문장
""",
            'safetyEducationPlan': f"""
{school_name} 방과후학교의 안전교육 계획을 작성해주세요.

학교 정보:
- 대상 학생: {context.get('targetStudents', '전학년')}
- 참여 학생 수: 약 {context.get('totalStudents', '100')}명

요구사항:
- 4-5문장으로 작성
- 화재안전, 성폭력예방, 실종예방 등 포함
- 교육 시기 및 방법 명시
- 교육청 지침 준수 내용 포함

형식: 일반 문장
""",
            'hygieneManagementPlan': f"""
방과후학교 운영을 위한 위생관리 계획을 작성해주세요.

요구사항:
- 3-4문장으로 작성
- 시설 소독, 환기 등 포함
- 개인위생 지도 방안
- 감염병 예방 조치

형식: 일반 문장
""",
            'budgetPrinciple': f"""
방과후학교 예산 편성 및 집행 원칙을 작성해주세요.

예산 정보:
- 총 예산: {context.get('totalBudget', '미정')}원

요구사항:
- 3-4문장으로 작성
- 투명성과 효율성 강조
- 교육청 지침 준수
- 학부모 부담 최소화 원칙

형식: 일반 문장
"""
        },
        'care': {
            'additionalGoals': f"""
{school_name}의 {year}학년도 초등돌봄교실 운영 목표를 작성해주세요.

돌봄교실 정보:
- 유형: {', '.join(context.get('careTypes', ['오후돌봄']))}
- 대상: 초등 {context.get('targetGrades', '1-2학년')}

요구사항:
- 2-3문장으로 작성
- 안전한 돌봄 환경 강조
- 맞벌이 가정 지원 측면
- 학생 발달 지원 내용

형식: 일반 문장
""",
            'programContent': f"""
'{context.get('programName', '프로그램')}' 돌봄 프로그램 내용을 작성해주세요.

프로그램 정보:
- 대상: {context.get('targetGrade', '1-2학년')}
- 강사: {context.get('instructorType', '돌봄전담사')}

요구사항:
- 3-4문장으로 작성
- 프로그램 활동 내용
- 기대 효과
- 안전하고 즐거운 활동 강조

형식: 일반 문장
""",
            'safetyEducationContent': f"""
초등돌봄교실의 안전교육 내용을 작성해주세요.

요구사항:
- 4-5문장으로 작성
- 저학년 수준에 맞는 내용
- 생활안전, 교통안전, 신변안전 등
- 체험형 교육 방법 포함

형식: 일반 문장
""",
            'allergyManagementPlan': f"""
돌봄교실 간식 제공 시 알레르기 관리 방안을 작성해주세요.

요구사항:
- 3-4문장으로 작성
- 사전 조사 절차
- 대체 식품 제공
- 비상 대응 체계

형식: 일반 문장
""",
            'staffAllocationCriteria': f"""
초등돌봄교실 인력 배치 기준을 작성해주세요.

인력 정보:
- 돌봄전담사: {context.get('careStaff', '미정')}명
- 총 학생 수: {context.get('totalStudents', '미정')}명

요구사항:
- 3-4문장으로 작성
- 교육부 기준 준수
- 학생 대 교사 비율
- 업무 분장 원칙

형식: 일반 문장
"""
        }
    }
    
    # 기본 프롬프트
    doc_prompts = prompts.get(document_type, prompts['afterschool'])
    return doc_prompts.get(field_name, f"{field_name}에 대한 전문적인 내용을 2-3문장으로 작성해주세요.")
```

### 2. 의존성 추가

**파일**: `requirements.txt`

```txt
flask==3.1.0
openai==1.54.0
python-dotenv==1.0.0
```

---

## 💻 Frontend 구현

### 1. HTML 수정

**파일**: `templates/afterschool_form.html`

각 textarea 필드에 AI 생성 버튼 추가:

```html
<!-- Step 2: 추가 목적 -->
<div class="form-group" style="position: relative;">
    <label for="customPurpose">추가 목적 (선택)</label>
    <button type="button" 
            class="ai-generate-btn" 
            data-field="customPurpose"
            onclick="generateAIContent('customPurpose')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        AI 생성
    </button>
    <textarea 
        id="customPurpose" 
        name="customPurpose" 
        rows="4"
        placeholder="예: 학생들의 창의성과 사회성을 함양하고, 학부모의 양육 부담을 경감합니다."></textarea>
</div>

<!-- Step 4: 프로그램 설명 -->
<div class="form-group" style="position: relative;">
    <label>프로그램 설명</label>
    <button type="button" 
            class="ai-generate-btn" 
            data-field="programDescription"
            data-program-index="0"
            onclick="generateAIContent('programDescription', 0)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        AI 생성
    </button>
    <textarea 
        id="programDescription_0" 
        name="programs[0][description]" 
        rows="3"
        placeholder="프로그램의 운영 방식과 교육적 효과를 설명하세요."></textarea>
</div>

<!-- 다른 textarea 필드들도 동일하게... -->
```

### 2. CSS 추가

**파일**: `static/css/afterschool_form.css`

```css
/* AI 생성 버튼 */
.ai-generate-btn {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.ai-generate-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.ai-generate-btn:disabled {
    background: linear-gradient(135deg, #ccc 0%, #999 100%);
    cursor: not-allowed;
    transform: none;
    opacity: 0.6;
}

.ai-generate-btn.generating {
    background: linear-gradient(135deg, #999 0%, #666 100%);
}

.ai-generate-btn svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}

/* 로딩 스피너 */
.ai-generate-btn .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* textarea에 여백 추가 (버튼과 겹치지 않게) */
.form-group:has(.ai-generate-btn) label {
    padding-right: 120px;
}

/* 반응형 - 모바일 */
@media (max-width: 768px) {
    .ai-generate-btn {
        position: static;
        width: 100%;
        margin-bottom: 8px;
        justify-content: center;
    }
    
    .form-group:has(.ai-generate-btn) label {
        padding-right: 0;
    }
}
```

### 3. JavaScript 추가

**파일**: `static/js/afterschool_form.js`

```javascript
/**
 * AI 콘텐츠 생성 함수
 * @param {string} fieldName - 생성할 필드명
 * @param {number} index - 프로그램 인덱스 (해당하는 경우)
 */
async function generateAIContent(fieldName, index = null) {
    // 버튼 찾기
    const button = event.target.closest('.ai-generate-btn');
    if (!button) return;
    
    // 이미 생성 중이면 중단
    if (button.disabled) return;
    
    // 버튼 상태 변경
    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.classList.add('generating');
    button.innerHTML = `
        <span class="spinner"></span>
        생성 중...
    `;
    
    try {
        // 필드 ID 생성
        const fieldId = index !== null 
            ? `${fieldName}_${index}` 
            : fieldName;
        
        const textarea = document.getElementById(fieldId);
        if (!textarea) {
            throw new Error('텍스트 영역을 찾을 수 없습니다.');
        }
        
        // 컨텍스트 수집
        const context = collectContextForAI(fieldName, index);
        
        // API 호출
        const response = await fetch('/api/generate-ai-content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fieldName: fieldName,
                context: context,
                documentType: 'afterschool',  // 또는 'care'
                index: index
            })
        });
        
        if (!response.ok) {
            throw new Error('AI 생성에 실패했습니다.');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // 생성된 텍스트를 textarea에 입력
            textarea.value = data.text;
            
            // 성공 애니메이션
            textarea.style.backgroundColor = '#e8f5e9';
            setTimeout(() => {
                textarea.style.backgroundColor = '';
            }, 1000);
            
            // 성공 메시지 (선택사항)
            showNotification('AI 생성 완료!', 'success');
        } else {
            throw new Error(data.error || 'AI 생성 실패');
        }
        
    } catch (error) {
        console.error('AI 생성 오류:', error);
        showNotification(error.message, 'error');
    } finally {
        // 버튼 상태 복원
        button.disabled = false;
        button.classList.remove('generating');
        button.innerHTML = originalHTML;
    }
}

/**
 * AI 생성을 위한 컨텍스트 수집
 */
function collectContextForAI(fieldName, index) {
    const context = {
        schoolName: document.getElementById('schoolName')?.value || '',
        year: document.getElementById('year')?.value || '',
    };
    
    // 필드별 추가 컨텍스트
    switch (fieldName) {
        case 'customPurpose':
            // 선택된 목적 체크박스 수집
            const purposes = [];
            document.querySelectorAll('input[name="purpose"]:checked').forEach(cb => {
                purposes.push(cb.nextElementSibling?.textContent || cb.value);
            });
            context.purposes = purposes;
            break;
            
        case 'programDescription':
            if (index !== null) {
                context.programName = document.getElementById(`programName_${index}`)?.value || '';
                context.targetGrade = getSelectedGrades(`programGrade_${index}`);
                context.operatingTime = document.getElementById(`programTime_${index}`)?.value || '';
                context.programType = document.getElementById(`programType_${index}`)?.value || '';
            }
            break;
            
        case 'safetyEducationPlan':
            context.targetStudents = '전학년';
            context.totalStudents = calculateTotalStudents();
            break;
            
        case 'budgetPrinciple':
            context.totalBudget = calculateTotalBudget();
            break;
    }
    
    return context;
}

/**
 * 선택된 학년 가져오기
 */
function getSelectedGrades(fieldPrefix) {
    const grades = [];
    document.querySelectorAll(`input[name^="${fieldPrefix}"]:checked`).forEach(cb => {
        grades.push(cb.value);
    });
    return grades.join(', ') || '전학년';
}

/**
 * 총 학생 수 계산
 */
function calculateTotalStudents() {
    let total = 0;
    document.querySelectorAll('input[name$="[capacity]"]').forEach(input => {
        total += parseInt(input.value) || 0;
    });
    return total;
}

/**
 * 총 예산 계산
 */
function calculateTotalBudget() {
    let total = 0;
    // 프로그램별 수강료 × 정원
    document.querySelectorAll('.program-card').forEach((card, index) => {
        const fee = parseInt(document.getElementById(`programFee_${index}`)?.value) || 0;
        const capacity = parseInt(document.getElementById(`programCapacity_${index}`)?.value) || 0;
        total += fee * capacity;
    });
    return total;
}

/**
 * 알림 메시지 표시
 */
function showNotification(message, type = 'info') {
    // 기존 알림 제거
    const existing = document.querySelector('.ai-notification');
    if (existing) existing.remove();
    
    // 새 알림 생성
    const notification = document.createElement('div');
    notification.className = `ai-notification ai-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
```

### 4. 알림 CSS 추가

```css
/* AI 알림 메시지 */
.ai-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    opacity: 1;
    transition: opacity 0.3s ease;
}

.ai-notification-success {
    background: #4caf50;
    color: white;
}

.ai-notification-error {
    background: #f44336;
    color: white;
}

.ai-notification-info {
    background: #2196f3;
    color: white;
}
```

---

## 📊 데이터 흐름

```
사용자 [AI 생성] 버튼 클릭
    ↓
JavaScript: collectContextForAI()
    - 학교명, 학년도 수집
    - 해당 필드 관련 데이터 수집
    ↓
fetch('/api/generate-ai-content')
    - fieldName
    - context (폼 데이터)
    - documentType
    ↓
Flask Backend: build_prompt()
    - 필드별 맞춤 프롬프트 생성
    ↓
OpenAI API (GPT-3.5-turbo)
    - System: 초등학교 행정 문서 전문가
    - User: 구체적인 프롬프트
    ↓
생성된 텍스트 반환
    ↓
JavaScript: textarea에 자동 입력
    ↓
사용자: 수정 가능
```

---

## 🔒 보안 고려사항

### 1. API 키 관리
현재는 코드에 하드코딩되어 있으나, **향후 개선 필요**:

```python
# .env 파일 사용
from dotenv import load_dotenv
load_dotenv()

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
```

**.env 파일**:
```
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
```

### 2. Rate Limiting
과도한 API 호출 방지:

```python
from flask_limiter import Limiter

limiter = Limiter(app, key_func=lambda: request.remote_addr)

@app.route('/api/generate-ai-content', methods=['POST'])
@limiter.limit("10 per minute")  # 1분에 10회 제한
def generate_ai_content():
    ...
```

### 3. 입력 검증
악의적인 프롬프트 주입 방지:

```python
def sanitize_input(text):
    # 최대 길이 제한
    if len(text) > 500:
        return text[:500]
    
    # 특수 문자 필터링 (선택)
    # ...
    
    return text
```

---

## 🧪 테스트 시나리오

### 1. 기본 생성 테스트
```
1. Step 2로 이동
2. 학교명: "서울행복초등학교" 입력
3. 목적 체크박스: "학력 향상", "특기적성 계발" 선택
4. [AI 생성] 버튼 클릭
5. 2-3초 후 텍스트 자동 생성 확인
```

### 2. 프로그램 설명 생성
```
1. Step 4로 이동
2. 프로그램명: "창의수학" 입력
3. 대상학년: 3-4학년 선택
4. [AI 생성] 버튼 클릭
5. 프로그램 특성에 맞는 설명 생성 확인
```

### 3. 에러 처리 테스트
```
1. 네트워크 연결 끊기
2. [AI 생성] 버튼 클릭
3. 에러 메시지 표시 확인
4. 버튼 상태 복원 확인
```

### 4. 동시 생성 테스트
```
1. 여러 필드의 [AI 생성] 버튼 연속 클릭
2. 각 필드별로 순차 생성 확인
3. 버튼 비활성화 동작 확인
```

---

## 📈 향후 개선 사항

### Phase 1 (현재)
- [x] 기본 AI 생성 기능
- [x] GPT-3.5-turbo 사용
- [x] 필드별 커스텀 프롬프트

### Phase 2 (단기)
- [ ] RAG 시스템 구축
  - 교육청 공식 문서 수집
  - ChromaDB로 벡터 저장
  - 유사 문서 검색 후 참고
- [ ] 생성 품질 개선
  - Few-shot learning
  - 교육청 용어 사전
- [ ] 사용자 피드백
  - 👍 👎 버튼
  - 재생성 옵션

### Phase 3 (중장기)
- [ ] Fine-tuning
  - 실제 승인된 문서로 학습
  - 학교별 스타일 학습
- [ ] 다국어 지원
- [ ] 음성 입력 지원

---

## 🎯 체크리스트

### Backend
- [ ] OpenAI 클라이언트 설정
- [ ] `/api/generate-ai-content` 엔드포인트 생성
- [ ] `build_prompt()` 함수 구현
- [ ] 필드별 프롬프트 템플릿 작성
- [ ] 에러 핸들링
- [ ] `requirements.txt` 업데이트

### Frontend (방과후학교)
- [ ] HTML: AI 생성 버튼 추가
  - [ ] Step 2: customPurpose
  - [ ] Step 4: programDescription (동적)
  - [ ] Step 5: safetyEducationPlan
  - [ ] Step 5: hygieneManagementPlan
  - [ ] Step 6: budgetPrinciple
- [ ] CSS: 버튼 스타일링
- [ ] JavaScript: generateAIContent() 함수
- [ ] JavaScript: collectContextForAI() 함수
- [ ] JavaScript: 알림 시스템

### Frontend (초등돌봄교실)
- [ ] 동일한 패턴으로 구현
- [ ] 돌봄교실 전용 프롬프트

### 테스트
- [ ] API 정상 작동 확인
- [ ] 각 필드별 생성 테스트
- [ ] 에러 처리 테스트
- [ ] 모바일 반응형 테스트
- [ ] 성능 테스트 (응답 시간)

---

## 💡 사용 예시

### 예시 1: 운영 목적 생성
**입력**:
- 학교명: 서울행복초등학교
- 선택 목적: "학력 향상", "특기적성 계발"

**생성 결과**:
```
서울행복초등학교는 방과후학교를 통해 학생들의 학업 능력 향상과 다양한 특기적성 계발을 지원합니다. 
개별 맞춤형 프로그램을 통해 학생들의 잠재력을 발견하고, 전인적 성장을 도모하고자 합니다. 
이를 통해 미래 사회가 요구하는 창의적이고 자기주도적인 인재를 양성하겠습니다.
```

### 예시 2: 프로그램 설명 생성
**입력**:
- 프로그램명: 창의수학
- 대상: 3-4학년
- 시간: 주 2회, 60분

**생성 결과**:
```
창의수학 프로그램은 3-4학년 학생들을 대상으로 수학적 사고력과 문제해결 능력을 키우는 활동 중심 프로그램입니다. 
게임과 실생활 문제를 활용하여 수학의 재미를 느끼고, 논리적 사고 능력을 향상시킵니다. 
주 2회 60분 수업을 통해 학생들이 자신감을 가지고 수학에 접근할 수 있도록 지도합니다.
```

---

## 📞 문의 및 지원

구현 중 문제가 발생하면:
1. API 키 유효성 확인
2. OpenAI 사용량 확인
3. 프롬프트 품질 검토
4. 에러 로그 확인

---

**문서 버전**: 1.0
**작성일**: 2025-01-17
**작성자**: Claude (Anthropic)
