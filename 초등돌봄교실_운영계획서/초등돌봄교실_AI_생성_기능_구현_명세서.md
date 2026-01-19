# 초등돌봄교실 운영계획서 AI 생성 기능 구현 명세서

## 📋 개요

### 목적
초등돌봄교실 운영계획서 작성 시, 서술형 문장이 필요한 항목에 AI 생성 버튼을 추가하여 자동으로 적절한 내용을 생성

### 기술 스택
- **AI API**: OpenAI GPT-3.5-turbo
- **API Key**: `YOUR_OPENAI_API_KEY`
- **Document Type**: `care` (백엔드에서 구분용)

---

## 🎯 AI 생성 적용 항목

### Step 2: 운영 목표 및 방침

#### 항목 1: 추가 목표/방침
- **필드명**: `additionalGoals`
- **타입**: textarea
- **최대 글자**: 500자
- **AI 생성 조건**:
  - 학교명 (`schoolName`)
  - 학년도/학기 (`year`, `semester`)
  - 돌봄교실 유형 (`careTypes`: 오후/저녁/방학/아침)
  - 선택된 운영 목적 (`purposes`)
  - 선택된 운영 방침 (`policies`)

**프롬프트 템플릿**:
```
{학교명}의 {학년도}학년도 {학기} 초등돌봄교실 운영 목표를 작성해주세요.

운영 정보:
- 돌봄교실 유형: {careTypes}
- 선택된 목적: {purposes}
- 선택된 방침: {policies}

요구사항:
- 2-3문장으로 작성
- 안전한 돌봄 환경 강조
- 맞벌이 가정 지원 측면
- 학생의 전인적 발달 지원
- 교육적이고 따뜻한 톤

형식: 일반 문장 (불릿 포인트 없이)
```

---

### Step 4: 프로그램 운영 계획

#### 항목 2: 프로그램 내용
- **필드명**: `programs[i].content`
- **타입**: textarea (동적, 프로그램마다)
- **AI 생성 조건**:
  - 프로그램명 (`programs[i].name`)
  - 운영 요일 (`programs[i].days`)
  - 운영 시간대 (`programs[i].startTime`, `endTime`)
  - 대상 학년 (`programs[i].targetGrades`)
  - 정원 (`programs[i].capacity`)
  - 강사 유형 (`programs[i].instructorType`)

**프롬프트 템플릿**:
```
'{프로그램명}' 돌봄 프로그램의 내용을 작성해주세요.

프로그램 정보:
- 운영: {운영요일} {시간대}
- 대상: {대상학년}
- 정원: {정원}명
- 강사: {강사유형}

요구사항:
- 3-4문장으로 작성
- 프로그램의 주요 활동 내용
- 학생들의 흥미와 발달 수준에 맞는 내용
- 안전하고 즐겁게 참여할 수 있는 활동 강조
- 기대되는 교육적 효과

형식: 일반 문장
```

---

### Step 5: 학생 모집 및 관리

#### 항목 3: 결석 처리 절차
- **필드명**: `absenceProcedure`
- **타입**: textarea
- **AI 생성 조건**:
  - 학교명
  - 출결 확인 방법 (`attendanceMethods`)

**프롬프트 템플릿**:
```
초등돌봄교실의 결석 처리 절차를 작성해주세요.

출결 관리:
- 확인 방법: {attendanceMethods}

요구사항:
- 3-4문장으로 작성
- 사전 연락 → 기록 → 통보 순서
- 무단 결석 시 대응 방안
- 학부모와의 소통 강조

형식: 일반 문장
```

#### 항목 4: 긴급 연락망 구축 방법
- **필드명**: `emergencyContactSystem`
- **타입**: textarea
- **AI 생성 조건**:
  - 학교명
  - 하원 방법 (`pickupMethod`)

**프롬프트 템플릿**:
```
초등돌봄교실의 긴급 연락망 구축 방법을 작성해주세요.

하원 방식: {pickupMethod}

요구사항:
- 3-4문장으로 작성
- 학부모 연락처, 비상연락처 등록
- 긴급 상황 시 연락 절차
- 담임교사 및 관리자 연계

형식: 일반 문장
```

---

### Step 6: 안전 및 급식 관리

#### 항목 5: 안전교육 시기
- **필드명**: `safetyEducationTiming`
- **타입**: textarea
- **AI 생성 조건**:
  - 학년도/학기
  - 운영 기간 (`startDate`, `endDate`)

**프롬프트 템플릿**:
```
초등돌봄교실 안전교육 실시 시기를 작성해주세요.

운영 기간: {startDate} ~ {endDate}

요구사항:
- 2-3문장으로 작성
- 학기 초, 월별, 분기별 등 구체적 시기
- 정기 교육과 수시 교육 구분
- 교육 횟수 명시

형식: 일반 문장
예: 학기 초 오리엔테이션 시 기본 안전교육을 실시하고, 매월 1회 주제별 안전교육을 진행합니다.
```

#### 항목 6: 안전교육 내용
- **필드명**: `safetyEducationContent`
- **타입**: textarea
- **AI 생성 조건**:
  - 대상 학년 (돌봄교실 대상 학년)
  - 학교명

**프롬프트 템플릿**:
```
초등 저학년을 위한 돌봄교실 안전교육 내용을 작성해주세요.

대상: 초등 1-2학년 중심

요구사항:
- 4-5문장으로 작성
- 생활안전(화재, 지진 대피)
- 교통안전
- 신변안전(성폭력 예방, 유괴 예방)
- 저학년 눈높이에 맞는 체험형 교육 방식
- 반복 교육의 중요성

형식: 일반 문장
```

#### 항목 7: 알레르기 관리 방안
- **필드명**: `allergyManagementPlan`
- **타입**: textarea
- **AI 생성 조건**:
  - 간식 제공 여부 (`snackProvided`)
  - 간식 제공 방식 (`snackMethod`)

**프롬프트 템플릿**:
```
돌봄교실 간식 제공 시 알레르기 관리 방안을 작성해주세요.

간식 제공:
- 제공 여부: {snackProvided}
- 제공 방식: {snackMethod}

요구사항:
- 3-4문장으로 작성
- 입실 시 알레르기 사전 조사
- 대체 식품 제공 방안
- 비상 약품 비치
- 응급 상황 대응 체계
- 학부모와의 정보 공유

형식: 일반 문장
```

---

### Step 7: 예산 및 인력 운영

#### 항목 8: 인력 배치 기준
- **필드명**: `staffAllocationCriteria`
- **타입**: textarea
- **AI 생성 조건**:
  - 돌봄전담사 수 (`careStaffCount`)
  - 총 정원 (`totalCapacity`)
  - 교실 수 (`classroomCount`)

**프롬프트 템플릿**:
```
초등돌봄교실 인력 배치 기준을 작성해주세요.

인력 정보:
- 돌봄전담사: {careStaffCount}명
- 총 정원: {totalCapacity}명
- 교실 수: {classroomCount}개

요구사항:
- 3-4문장으로 작성
- 교육부 기준 준수 (학생 15명당 돌봄전담사 1명)
- 교실별 인력 배치
- 업무 분장 원칙
- 안전한 돌봄을 위한 적정 인력 강조

형식: 일반 문장
```

---

## 📊 필드별 요약 테이블

| Step | 항목 | 필드명 | 조건 | 문장 수 |
|------|------|--------|------|---------|
| 2 | 추가 목표/방침 | `additionalGoals` | 학교명, 학년도, 돌봄유형, 목적/방침 | 2-3 |
| 4 | 프로그램 내용 | `programs[i].content` | 프로그램명, 요일, 시간, 대상, 강사 | 3-4 |
| 5 | 결석 처리 절차 | `absenceProcedure` | 출결방법 | 3-4 |
| 5 | 긴급 연락망 | `emergencyContactSystem` | 하원방법 | 3-4 |
| 6 | 안전교육 시기 | `safetyEducationTiming` | 운영기간 | 2-3 |
| 6 | 안전교육 내용 | `safetyEducationContent` | 대상학년 | 4-5 |
| 6 | 알레르기 관리 | `allergyManagementPlan` | 간식제공정보 | 3-4 |
| 7 | 인력 배치 기준 | `staffAllocationCriteria` | 인력수, 정원, 교실수 | 3-4 |

**총 8개 항목**

---

## 🔧 Backend 구현

### 1. build_prompt() 함수에 추가

**파일**: `app.py`

```python
def build_prompt(field_name, context, document_type):
    """
    필드별 프롬프트 생성
    """
    school_name = context.get('schoolName', '우리 초등학교')
    year = context.get('year', '2025')
    semester = context.get('semester', '1학기')
    
    # ... (기존 afterschool 프롬프트)
    
    # 초등돌봄교실 프롬프트
    care_prompts = {
        'additionalGoals': f"""
{school_name}의 {year}학년도 {semester} 초등돌봄교실 운영 목표를 작성해주세요.

운영 정보:
- 돌봄교실 유형: {', '.join(context.get('careTypes', ['오후돌봄']))}
- 선택된 목적: {', '.join(context.get('purposes', []))}
- 선택된 방침: {', '.join(context.get('policies', []))}

요구사항:
- 2-3문장으로 작성
- 안전한 돌봄 환경 강조
- 맞벌이 가정 지원 측면
- 학생의 전인적 발달 지원
- 교육적이고 따뜻한 톤

형식: 일반 문장 (불릿 포인트 없이)
""",
        
        'programContent': f"""
'{context.get('programName', '프로그램')}' 돌봄 프로그램의 내용을 작성해주세요.

프로그램 정보:
- 운영: {context.get('operatingDays', '주 5회')} {context.get('operatingTime', '')}
- 대상: {context.get('targetGrades', '1-2학년')}
- 정원: {context.get('capacity', '15')}명
- 강사: {context.get('instructorType', '돌봄전담사')}

요구사항:
- 3-4문장으로 작성
- 프로그램의 주요 활동 내용
- 학생들의 흥미와 발달 수준에 맞는 내용
- 안전하고 즐겁게 참여할 수 있는 활동 강조
- 기대되는 교육적 효과

형식: 일반 문장
""",
        
        'absenceProcedure': f"""
{school_name} 초등돌봄교실의 결석 처리 절차를 작성해주세요.

출결 관리:
- 확인 방법: {', '.join(context.get('attendanceMethods', ['전자 출결 시스템']))}

요구사항:
- 3-4문장으로 작성
- 사전 연락 → 기록 → 통보 순서
- 무단 결석 시 대응 방안
- 학부모와의 소통 강조

형식: 일반 문장
""",
        
        'emergencyContactSystem': f"""
{school_name} 초등돌봄교실의 긴급 연락망 구축 방법을 작성해주세요.

하원 방식: {context.get('pickupMethod', '학부모 직접 인계')}

요구사항:
- 3-4문장으로 작성
- 학부모 연락처, 비상연락처 등록
- 긴급 상황 시 연락 절차
- 담임교사 및 관리자 연계

형식: 일반 문장
""",
        
        'safetyEducationTiming': f"""
초등돌봄교실 안전교육 실시 시기를 작성해주세요.

운영 기간: {context.get('startDate', '')} ~ {context.get('endDate', '')}

요구사항:
- 2-3문장으로 작성
- 학기 초, 월별, 분기별 등 구체적 시기
- 정기 교육과 수시 교육 구분
- 교육 횟수 명시

형식: 일반 문장
예: 학기 초 오리엔테이션 시 기본 안전교육을 실시하고, 매월 1회 주제별 안전교육을 진행합니다.
""",
        
        'safetyEducationContent': f"""
초등 저학년을 위한 돌봄교실 안전교육 내용을 작성해주세요.

대상: 초등 1-2학년 중심

요구사항:
- 4-5문장으로 작성
- 생활안전(화재, 지진 대피)
- 교통안전
- 신변안전(성폭력 예방, 유괴 예방)
- 저학년 눈높이에 맞는 체험형 교육 방식
- 반복 교육의 중요성

형식: 일반 문장
""",
        
        'allergyManagementPlan': f"""
돌봄교실 간식 제공 시 알레르기 관리 방안을 작성해주세요.

간식 제공:
- 제공 여부: {context.get('snackProvided', '제공')}
- 제공 방식: {context.get('snackMethod', '학교 직접 제공')}

요구사항:
- 3-4문장으로 작성
- 입실 시 알레르기 사전 조사
- 대체 식품 제공 방안
- 비상 약품 비치
- 응급 상황 대응 체계
- 학부모와의 정보 공유

형식: 일반 문장
""",
        
        'staffAllocationCriteria': f"""
초등돌봄교실 인력 배치 기준을 작성해주세요.

인력 정보:
- 돌봄전담사: {context.get('careStaffCount', '미정')}명
- 총 정원: {context.get('totalCapacity', '미정')}명
- 교실 수: {context.get('classroomCount', '미정')}개

요구사항:
- 3-4문장으로 작성
- 교육부 기준 준수 (학생 15명당 돌봄전담사 1명)
- 교실별 인력 배치
- 업무 분장 원칙
- 안전한 돌봄을 위한 적정 인력 강조

형식: 일반 문장
"""
    }
    
    # document_type에 따라 프롬프트 선택
    if document_type == 'care':
        return care_prompts.get(field_name, f"{field_name}에 대한 전문적인 내용을 작성해주세요.")
    else:  # afterschool
        return afterschool_prompts.get(field_name, f"{field_name}에 대한 전문적인 내용을 작성해주세요.")
```

### 2. API 엔드포인트 수정 (기존 유지)

```python
@app.route('/api/generate-ai-content', methods=['POST'])
def generate_ai_content():
    """
    AI 기반 텍스트 생성 API
    """
    try:
        data = request.json
        field_name = data.get('fieldName')
        context = data.get('context', {})
        document_type = data.get('documentType', 'afterschool')  # 'afterschool' or 'care'
        
        # 프롬프트 생성
        prompt = build_prompt(field_name, context, document_type)
        
        # OpenAI API 호출
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system", 
                    "content": "당신은 한국의 초등학교 돌봄교실 운영 전문가입니다. 안전하고 따뜻한 돌봄 환경 조성을 위한 전문적인 문서를 작성합니다."
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
```

---

## 💻 Frontend 구현

### 1. HTML 수정

**파일**: `templates/care_form.html` (초등돌봄교실 폼)

```html
<!-- Step 2: 추가 목표/방침 -->
<div class="form-group" style="position: relative;">
    <label for="additionalGoals">추가 목표/방침 (선택)</label>
    <button type="button" 
            class="ai-generate-btn" 
            data-field="additionalGoals"
            onclick="generateAIContent('additionalGoals')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        AI 생성
    </button>
    <textarea 
        id="additionalGoals" 
        name="additionalGoals" 
        rows="4"
        maxlength="500"
        placeholder="예: 학생들의 창의성과 사회성을 함양하고, 학부모의 양육 부담을 경감합니다."></textarea>
    <div class="char-count">0 / 500자</div>
</div>

<!-- Step 4: 프로그램 내용 (동적) -->
<div class="program-card">
    <h4>프로그램 1</h4>
    
    <!-- ... 다른 필드들 ... -->
    
    <div class="form-group" style="position: relative;">
        <label>프로그램 내용</label>
        <button type="button" 
                class="ai-generate-btn" 
                data-field="programContent"
                data-program-index="0"
                onclick="generateAIContent('programContent', 0)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            AI 생성
        </button>
        <textarea 
            id="programContent_0" 
            name="programs[0][content]" 
            rows="3"
            placeholder="프로그램의 활동 내용과 교육적 효과를 설명하세요."></textarea>
    </div>
</div>

<!-- Step 5: 결석 처리 절차 -->
<div class="form-group" style="position: relative;">
    <label for="absenceProcedure">결석 처리 절차</label>
    <button type="button" 
            class="ai-generate-btn" 
            data-field="absenceProcedure"
            onclick="generateAIContent('absenceProcedure')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        AI 생성
    </button>
    <textarea 
        id="absenceProcedure" 
        name="absenceProcedure" 
        rows="3"
        placeholder="예: 학부모 사전 연락 → 출결 기록 → 무단 결석 시 담임교사 통보"></textarea>
</div>

<!-- Step 5: 긴급 연락망 구축 -->
<div class="form-group" style="position: relative;">
    <label for="emergencyContactSystem">긴급 연락망 구축 방법</label>
    <button type="button" 
            class="ai-generate-btn" 
            data-field="emergencyContactSystem"
            onclick="generateAIContent('emergencyContactSystem')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        AI 생성
    </button>
    <textarea 
        id="emergencyContactSystem" 
        name="emergencyContactSystem" 
        rows="3"
        placeholder="예: 학부모 연락처, 비상연락처, 담임교사 연락처 등록"></textarea>
</div>

<!-- Step 6: 안전교육 시기 -->
<div class="form-group" style="position: relative;">
    <label for="safetyEducationTiming">안전교육 시기</label>
    <button type="button" 
            class="ai-generate-btn" 
            data-field="safetyEducationTiming"
            onclick="generateAIContent('safetyEducationTiming')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        AI 생성
    </button>
    <textarea 
        id="safetyEducationTiming" 
        name="safetyEducationTiming" 
        rows="3"
        placeholder="예: 학기 초, 월 1회"></textarea>
</div>

<!-- Step 6: 안전교육 내용 -->
<div class="form-group" style="position: relative;">
    <label for="safetyEducationContent">안전교육 내용</label>
    <button type="button" 
            class="ai-generate-btn" 
            data-field="safetyEducationContent"
            onclick="generateAIContent('safetyEducationContent')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        AI 생성
    </button>
    <textarea 
        id="safetyEducationContent" 
        name="safetyEducationContent" 
        rows="4"
        placeholder="예: 화재/지진 대피 교육, 성폭력 예방 교육, 교통안전 교육"></textarea>
</div>

<!-- Step 6: 알레르기 관리 -->
<div class="form-group" style="position: relative;">
    <label for="allergyManagementPlan">알레르기 관리 방안</label>
    <button type="button" 
            class="ai-generate-btn" 
            data-field="allergyManagementPlan"
            onclick="generateAIContent('allergyManagementPlan')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        AI 생성
    </button>
    <textarea 
        id="allergyManagementPlan" 
        name="allergyManagementPlan" 
        rows="3"
        placeholder="예: 사전 조사, 대체 식품 제공"></textarea>
</div>

<!-- Step 7: 인력 배치 기준 -->
<div class="form-group" style="position: relative;">
    <label for="staffAllocationCriteria">인력 배치 기준</label>
    <button type="button" 
            class="ai-generate-btn" 
            data-field="staffAllocationCriteria"
            onclick="generateAIContent('staffAllocationCriteria')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        AI 생성
    </button>
    <textarea 
        id="staffAllocationCriteria" 
        name="staffAllocationCriteria" 
        rows="3"
        placeholder="예: 학생 15명당 돌봄전담사 1명"></textarea>
</div>
```

### 2. CSS (공통 사용)

**파일**: `static/css/care_form.css`

```css
/* AI 생성 버튼 (방과후학교와 동일) */
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

/* 글자 수 카운터 */
.char-count {
    text-align: right;
    font-size: 12px;
    color: #999;
    margin-top: 4px;
}

/* 반응형 */
@media (max-width: 768px) {
    .ai-generate-btn {
        position: static;
        width: 100%;
        margin-bottom: 8px;
        justify-content: center;
    }
}
```

### 3. JavaScript

**파일**: `static/js/care_form.js`

```javascript
/**
 * 초등돌봄교실용 AI 콘텐츠 생성
 */
async function generateAIContent(fieldName, index = null) {
    const button = event.target.closest('.ai-generate-btn');
    if (!button || button.disabled) return;
    
    // 버튼 상태 변경
    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.classList.add('generating');
    button.innerHTML = `<span class="spinner"></span> 생성 중...`;
    
    try {
        // 필드 ID
        const fieldId = index !== null ? `${fieldName}_${index}` : fieldName;
        const textarea = document.getElementById(fieldId);
        
        if (!textarea) {
            throw new Error('텍스트 영역을 찾을 수 없습니다.');
        }
        
        // 컨텍스트 수집
        const context = collectContextForCare(fieldName, index);
        
        // API 호출
        const response = await fetch('/api/generate-ai-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fieldName: fieldName,
                context: context,
                documentType: 'care',  // 초등돌봄교실
                index: index
            })
        });
        
        if (!response.ok) throw new Error('AI 생성에 실패했습니다.');
        
        const data = await response.json();
        
        if (data.success) {
            // 텍스트 입력
            textarea.value = data.text;
            
            // 글자 수 업데이트 (있는 경우)
            updateCharCount(textarea);
            
            // 성공 애니메이션
            textarea.style.backgroundColor = '#e8f5e9';
            setTimeout(() => { textarea.style.backgroundColor = ''; }, 1000);
            
            showNotification('AI 생성 완료!', 'success');
        } else {
            throw new Error(data.error || 'AI 생성 실패');
        }
        
    } catch (error) {
        console.error('AI 생성 오류:', error);
        showNotification(error.message, 'error');
    } finally {
        // 버튼 복원
        button.disabled = false;
        button.classList.remove('generating');
        button.innerHTML = originalHTML;
    }
}

/**
 * 초등돌봄교실용 컨텍스트 수집
 */
function collectContextForCare(fieldName, index) {
    const context = {
        schoolName: document.getElementById('schoolName')?.value || '',
        year: document.getElementById('year')?.value || '',
        semester: getSemester(),
    };
    
    switch (fieldName) {
        case 'additionalGoals':
            context.careTypes = getSelectedCareTypes();
            context.purposes = getCheckedValues('input[name="purpose"]:checked');
            context.policies = getCheckedValues('input[name="policy"]:checked');
            break;
            
        case 'programContent':
            if (index !== null) {
                context.programName = document.getElementById(`programName_${index}`)?.value || '';
                context.operatingDays = getSelectedDays(`programDays_${index}`);
                context.operatingTime = getTimeRange(`programStartTime_${index}`, `programEndTime_${index}`);
                context.targetGrades = getSelectedGrades(`programGrade_${index}`);
                context.capacity = document.getElementById(`programCapacity_${index}`)?.value || '';
                context.instructorType = getSelectedRadio(`instructorType_${index}`);
            }
            break;
            
        case 'absenceProcedure':
            context.attendanceMethods = getCheckedValues('input[name="attendanceMethod"]:checked');
            break;
            
        case 'emergencyContactSystem':
            context.pickupMethod = getSelectedRadio('pickupMethod');
            break;
            
        case 'safetyEducationTiming':
            context.startDate = document.getElementById('startDate')?.value || '';
            context.endDate = document.getElementById('endDate')?.value || '';
            break;
            
        case 'allergyManagementPlan':
            context.snackProvided = getSelectedRadio('snackProvided');
            context.snackMethod = getSelectedRadio('snackMethod');
            break;
            
        case 'staffAllocationCriteria':
            context.careStaffCount = document.getElementById('careStaffCount')?.value || '';
            context.totalCapacity = calculateTotalCapacity();
            context.classroomCount = countClassrooms();
            break;
    }
    
    return context;
}

/**
 * 선택된 돌봄 유형 가져오기
 */
function getSelectedCareTypes() {
    const types = [];
    document.querySelectorAll('input[name="careType"]:checked').forEach(cb => {
        types.push(cb.nextElementSibling?.textContent || cb.value);
    });
    return types;
}

/**
 * 학기 정보 가져오기
 */
function getSemester() {
    const semester = document.querySelector('input[name="semester"]:checked');
    return semester ? semester.value : '1학기';
}

/**
 * 체크된 값들 가져오기
 */
function getCheckedValues(selector) {
    const values = [];
    document.querySelectorAll(selector).forEach(cb => {
        values.push(cb.nextElementSibling?.textContent || cb.value);
    });
    return values;
}

/**
 * 선택된 요일 가져오기
 */
function getSelectedDays(prefix) {
    const days = [];
    document.querySelectorAll(`input[name^="${prefix}"]:checked`).forEach(cb => {
        days.push(cb.value);
    });
    return days.join(', ') || '주 5회';
}

/**
 * 시간 범위 가져오기
 */
function getTimeRange(startId, endId) {
    const start = document.getElementById(startId)?.value || '';
    const end = document.getElementById(endId)?.value || '';
    return start && end ? `${start}~${end}` : '';
}

/**
 * 선택된 학년 가져오기
 */
function getSelectedGrades(prefix) {
    const grades = [];
    document.querySelectorAll(`input[name^="${prefix}"]:checked`).forEach(cb => {
        grades.push(cb.value);
    });
    return grades.join(', ') || '1-2학년';
}

/**
 * 라디오 버튼 선택값 가져오기
 */
function getSelectedRadio(name) {
    const radio = document.querySelector(`input[name="${name}"]:checked`);
    return radio ? (radio.nextElementSibling?.textContent || radio.value) : '';
}

/**
 * 총 정원 계산
 */
function calculateTotalCapacity() {
    let total = 0;
    document.querySelectorAll('input[name$="[capacity]"]').forEach(input => {
        total += parseInt(input.value) || 0;
    });
    return total;
}

/**
 * 교실 수 계산
 */
function countClassrooms() {
    return document.querySelectorAll('.classroom-card').length;
}

/**
 * 글자 수 업데이트
 */
function updateCharCount(textarea) {
    const charCountDiv = textarea.parentElement.querySelector('.char-count');
    if (charCountDiv) {
        const currentLength = textarea.value.length;
        const maxLength = textarea.getAttribute('maxlength') || 500;
        charCountDiv.textContent = `${currentLength} / ${maxLength}자`;
    }
}

/**
 * 알림 표시 (방과후학교와 동일)
 */
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.ai-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `ai-notification ai-notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// textarea 이벤트 리스너 (글자 수)
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('textarea[maxlength]').forEach(textarea => {
        textarea.addEventListener('input', function() {
            updateCharCount(this);
        });
        updateCharCount(textarea); // 초기 업데이트
    });
});
```

---

## 🧪 테스트 시나리오

### 1. 기본 생성 테스트
```
1. Step 2로 이동
2. 학교명: "부산사랑초등학교" 입력
3. 돌봄유형: "오후돌봄" 선택
4. 목적: "맞벌이 가정 지원" 선택
5. [AI 생성] 버튼 클릭
6. 2-3초 후 텍스트 생성 확인
```

### 2. 프로그램 내용 생성
```
1. Step 4로 이동
2. 프로그램명: "책놀이" 입력
3. 요일: 월, 수, 금 선택
4. 시간: 15:00-16:00
5. 대상: 1-2학년
6. [AI 생성] 버튼 클릭
7. 프로그램에 맞는 내용 생성 확인
```

### 3. 안전교육 생성
```
1. Step 6로 이동
2. [AI 생성] 버튼 (안전교육 내용)
3. 저학년에 맞는 안전교육 내용 생성 확인
```

---

## 📈 향후 개선

### Phase 1 (현재)
- [x] 8개 항목 AI 생성
- [x] GPT-3.5-turbo 사용
- [x] 필드별 커스텀 프롬프트

### Phase 2
- [ ] 교육부 돌봄교실 가이드라인 RAG
- [ ] 우수 사례 학습
- [ ] 지역별 맞춤 생성

### Phase 3
- [ ] 학교별 히스토리 학습
- [ ] 학부모 피드백 반영
- [ ] 다국어 지원 (외국인 학부모)

---

## 🎯 체크리스트

### Backend
- [ ] build_prompt()에 care 프롬프트 8개 추가
- [ ] System prompt 수정 (돌봄교실 전문가)
- [ ] documentType='care' 처리

### Frontend
- [ ] HTML: 8개 항목에 AI 버튼 추가
- [ ] CSS: 스타일 적용
- [ ] JavaScript: collectContextForCare() 구현
- [ ] JavaScript: 헬퍼 함수들

### 테스트
- [ ] 각 항목별 생성 테스트
- [ ] 컨텍스트 수집 정확도
- [ ] 에러 핸들링
- [ ] 반응형 UI

---

**문서 버전**: 1.0  
**작성일**: 2025-01-17  
**작성자**: Claude (Anthropic)
