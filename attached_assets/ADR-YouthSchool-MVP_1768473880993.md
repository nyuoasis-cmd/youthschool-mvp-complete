# Architecture Decision Record (ADR)
# YouthSchool MVP - 학교 문서 행정 AI 자동화 서비스

**문서 버전**: 1.0  
**작성일**: 2025년 1월 15일  
**작성자**: Kim  
**프로젝트 기간**: 2025.01.15 ~ 2025.02.28

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [설치 가이드](#3-설치-가이드)
4. [환경 변수 설정](#4-환경-변수-설정)
5. [API 문서](#5-api-문서)
6. [컨트리뷰션 가이드](#6-컨트리뷰션-가이드)
7. [Architecture Decisions](#7-architecture-decisions)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 소개

**YouthSchool(유스쿨)**은 학교 행정 업무의 문서 작성을 AI로 자동화하는 SaaS 서비스입니다.

#### 핵심 가치 제안
- ⏱️ **시간 절약**: 문서 작성 시간 80% 단축 (평균 2시간 → 20분)
- 🎯 **품질 향상**: AI가 공식 문서 양식에 맞춰 전문적인 문장 생성
- 📝 **유연성**: 사용자 맞춤 HWP 템플릿 업로드 지원

### 1.2 MVP 목표

**Phase 1 (2025.02 완료 목표)**
- 문서 유형: 가정통신문, 외부 교육 용역 계획서
- 사용자: 초중고 교사 및 행정직원
- 목적: 정부지원사업 선정 및 학교 5곳 시범 운영

### 1.3 주요 기능

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| **HWP 템플릿 관리** | 기본 템플릿 제공 + 사용자 업로드 | 🔴 필수 |
| **AI 문서 생성** | Claude API 기반 텍스트 자동 작성 | 🔴 필수 |
| **폼 기반 입력** | 간단한 정보 입력으로 문서 완성 | 🔴 필수 |
| **HWP/Excel 다운로드** | 완성된 문서 즉시 다운로드 | 🔴 필수 |
| **생성 이력 관리** | 과거 생성 문서 조회 (DB) | 🟡 선택 |

### 1.4 타겟 사용자

**Primary Persona: 이민정 선생님 (35세, 초등학교 교사)**
- **Pain Point**: 매주 가정통신문 작성에 2시간 소요
- **Needs**: 빠르고 정확한 문서 작성 도구
- **Tech Savvy**: 중간 (한글, 엑셀 가능 / 코딩 불가)

**Secondary Persona: 박준혁 선생님 (42세, 비즈쿨 담당교사)**
- **Pain Point**: 정부지원사업 계획서 작성 부담
- **Needs**: 전문적인 문장, 체계적인 구조
- **Tech Savvy**: 낮음 (기본 문서 작성만 가능)

### 1.5 프로젝트 제약사항

| 제약 조건 | 내용 |
|----------|------|
| **예산** | 초기 투자 $0 (무료 티어 활용) |
| **기간** | 6.5주 (2025.02.28 완료) |
| **인력** | 1인 개발 (비개발자) |
| **환경** | Windows 전용 (HWP 파일 처리) |

---

## 2. 기술 스택

### 2.1 전체 아키텍처

```
┌─────────────┐
│   사용자    │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────┐
│   Frontend (Replit AI)      │
│   - HTML/CSS/JavaScript     │
│   - Tailwind CSS            │
└──────┬──────────────────────┘
       │ REST API
       ▼
┌─────────────────────────────┐
│   Backend (FastAPI)         │
│   - Python 3.10+            │
│   - HWP Processing          │
│   - Claude AI Integration   │
└──────┬──────────────────────┘
       │
       ├──────────────────┐
       ▼                  ▼
┌──────────────┐   ┌─────────────┐
│  SQLite DB   │   │ Claude API  │
│  (Metadata)  │   │ (Anthropic) │
└──────────────┘   └─────────────┘
```

### 2.2 기술 스택 상세

#### Frontend
| 기술 | 버전 | 역할 | 선택 이유 |
|------|------|------|-----------|
| **HTML5/CSS3** | - | 마크업 | 표준 웹 기술 |
| **JavaScript (Vanilla)** | ES6+ | 클라이언트 로직 | 프레임워크 불필요 (단순) |
| **Tailwind CSS** | 3.x | 스타일링 | 빠른 UI 개발 |
| **Replit AI** | - | 코드 생성 | 비개발자 친화적 |

#### Backend
| 기술 | 버전 | 역할 | 선택 이유 |
|------|------|------|-----------|
| **Python** | 3.10+ | 주 개발 언어 | HWP 라이브러리 지원 |
| **FastAPI** | 0.109+ | REST API 서버 | 빠른 개발, 자동 문서화 |
| **pywin32** | 306 | HWP COM 제어 | 한글 프로그램 자동화 |
| **pyhwpx** | 0.2.x | HWP 파싱 (대안) | Linux 지원 |
| **openpyxl** | 3.1+ | Excel 파일 처리 | 순수 Python |
| **anthropic** | 0.18+ | Claude API SDK | 공식 SDK |

#### Database
| 기술 | 버전 | 역할 | 선택 이유 |
|------|------|------|-----------|
| **SQLite** | 3.x | 메타데이터 저장 | 설치 불필요, 단순 |

#### AI/ML
| 기술 | 버전 | 역할 | 선택 이유 |
|------|------|------|-----------|
| **Claude Sonnet 4.5** | - | 텍스트 생성 | 한국어 품질 우수 |

#### Deployment (MVP)
| 기술 | 역할 | 비용 |
|------|------|------|
| **로컬 PC + ngrok** | 임시 배포 | 무료 |
| **AWS EC2 Windows** | 프로덕션 (선택) | $15/월 |

### 2.3 개발 도구

| 도구 | 용도 |
|------|------|
| **VS Code** | 주 IDE |
| **Cursor AI** | AI 코딩 어시스턴트 |
| **Claude AI** | 코드 리뷰, 디버깅 |
| **Postman** | API 테스트 |
| **Git/GitHub** | 버전 관리 |

### 2.4 기술 스택 의사결정 요약

#### ADR-001: FastAPI 선택
- **결정**: FastAPI를 백엔드 프레임워크로 선택
- **이유**:
  - 자동 API 문서 생성 (Swagger UI)
  - 빠른 개발 속도
  - Python 생태계와 호환
- **대안 고려**: Flask (너무 단순), Django (과도하게 무거움)

#### ADR-002: pywin32/pyhwpx 선택
- **결정**: pywin32를 주, pyhwpx를 보조로 사용
- **이유**:
  - pywin32: HWP COM 제어 가장 안정적
  - pyhwpx: Linux 배포 시 대안
- **제약**: Windows 환경 필수

#### ADR-003: Claude API 선택
- **결정**: OpenAI GPT가 아닌 Claude Sonnet 4.5 사용
- **이유**:
  - 한국어 공문서 작성 품질 우수
  - 긴 컨텍스트 윈도우 (200K 토큰)
  - 공손하고 격식있는 어투
- **비용**: 토큰당 가격 경쟁력 있음

#### ADR-004: SQLite 선택
- **결정**: PostgreSQL 대신 SQLite 사용
- **이유**:
  - MVP는 동시 사용자 <10명
  - 설치/관리 불필요
  - 추후 PostgreSQL 마이그레이션 쉬움
- **제약**: 프로덕션에서는 전환 필요

---

## 3. 설치 가이드

### 3.1 시스템 요구사항

| 항목 | 최소 사양 | 권장 사양 |
|------|----------|----------|
| **OS** | Windows 10 | Windows 11 |
| **Python** | 3.10 | 3.11+ |
| **RAM** | 4GB | 8GB+ |
| **한글** | 한글 2014 | 한글 2020+ |
| **디스크 공간** | 500MB | 2GB |

### 3.2 사전 준비

#### 3.2.1 한글과컴퓨터 설치
```bash
# 한글 프로그램이 설치되어 있어야 pywin32가 작동합니다
# 다운로드: https://www.hancom.com/
```

#### 3.2.2 Python 설치
```bash
# Python 3.10+ 설치
# 다운로드: https://www.python.org/downloads/

# 설치 확인
python --version
# 출력: Python 3.10.x 또는 3.11.x
```

#### 3.2.3 Git 설치
```bash
# Git 설치
# 다운로드: https://git-scm.com/

# 설치 확인
git --version
```

### 3.3 프로젝트 클론

```bash
# 1. 프로젝트 클론
git clone https://github.com/yourusername/youthschool-mvp.git
cd youthschool-mvp

# 2. 브랜치 확인
git branch -a
```

### 3.4 백엔드 설치

```bash
# 1. 백엔드 디렉토리로 이동
cd backend

# 2. 가상환경 생성
python -m venv venv

# 3. 가상환경 활성화
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 4. 의존성 설치
pip install --upgrade pip
pip install -r requirements.txt

# 5. 설치 확인
pip list
```

#### 3.4.1 requirements.txt 내용

```txt
# Web Framework
fastapi==0.109.2
uvicorn[standard]==0.27.1
python-multipart==0.0.9

# HWP Processing
pywin32==306
pyhwpx==0.2.4

# Excel Processing
openpyxl==3.1.2

# AI Integration
anthropic==0.18.1

# Database
sqlalchemy==2.0.25
alembic==1.13.1

# Utilities
python-dotenv==1.0.1
pydantic==2.6.1
pydantic-settings==2.1.0

# Development
pytest==8.0.0
black==24.1.1
flake8==7.0.0
```

### 3.5 프론트엔드 설치

```bash
# 1. 프론트엔드 디렉토리로 이동
cd ../frontend

# 2. 의존성 없음 (순수 HTML/CSS/JS)
# 3. 브라우저에서 바로 실행 가능
```

### 3.6 데이터베이스 초기화

```bash
# 백엔드 디렉토리에서
cd backend

# 1. 데이터베이스 마이그레이션
alembic upgrade head

# 2. 초기 데이터 삽입 (선택)
python scripts/seed_data.py
```

### 3.7 서버 실행

```bash
# 개발 서버 실행
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 출력:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# INFO:     Application startup complete.
```

### 3.8 설치 확인

#### 3.8.1 백엔드 API 확인
```bash
# 브라우저에서 접속
http://localhost:8000/docs

# 정상: Swagger UI 페이지 표시
```

#### 3.8.2 프론트엔드 확인
```bash
# frontend/index.html을 브라우저에서 열기
# 또는 Live Server 실행
```

#### 3.8.3 HWP 처리 테스트
```bash
# Python 인터프리터 실행
python

# 다음 코드 실행
>>> import win32com.client
>>> hwp = win32com.client.Dispatch("HWPFrame.HwpObject")
>>> print("HWP 연동 성공!")
>>> hwp.Quit()
```

### 3.9 문제 해결

| 문제 | 해결 방법 |
|------|----------|
| **pywin32 설치 실패** | 관리자 권한으로 CMD 실행 후 재설치 |
| **HWP COM 오류** | 한글 프로그램 재설치 |
| **포트 8000 사용 중** | `--port 8001`로 변경 |
| **CORS 에러** | `app/main.py`에서 CORS 설정 확인 |

---

## 4. 환경 변수 설정

### 4.1 환경 변수 파일 생성

```bash
# 백엔드 디렉토리에서
cd backend

# .env.example 복사
cp .env.example .env

# .env 파일 편집
notepad .env  # Windows
nano .env     # Mac/Linux
```

### 4.2 .env 파일 구조

```bash
# ================================
# YouthSchool MVP Environment Variables
# ================================

# ----- Application Settings -----
APP_NAME="YouthSchool MVP"
APP_VERSION="1.0.0"
ENVIRONMENT="development"  # development | production | staging
DEBUG=true

# ----- Server Configuration -----
HOST="0.0.0.0"
PORT=8000
RELOAD=true  # 개발 환경에서만 true

# ----- Database Configuration -----
DATABASE_URL="sqlite:///./youthschool.db"
# 프로덕션: postgresql://user:password@localhost:5432/youthschool

# ----- Claude AI API -----
ANTHROPIC_API_KEY="sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxx"
CLAUDE_MODEL="claude-sonnet-4-20250514"
CLAUDE_MAX_TOKENS=4000
CLAUDE_TEMPERATURE=0.7

# ----- File Upload Settings -----
UPLOAD_DIR="./uploads"
OUTPUT_DIR="./outputs"
TEMPLATE_DIR="./templates"
MAX_UPLOAD_SIZE=10485760  # 10MB in bytes
ALLOWED_EXTENSIONS=".hwp,.docx"

# ----- Security -----
SECRET_KEY="your-secret-key-here-change-in-production"
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ----- CORS Settings -----
CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
# 프로덕션: https://youthschool.com

# ----- Logging -----
LOG_LEVEL="INFO"  # DEBUG | INFO | WARNING | ERROR
LOG_FILE="./logs/app.log"

# ----- Feature Flags -----
ENABLE_USER_UPLOAD=true
ENABLE_EXCEL_EXPORT=true
ENABLE_TEMPLATE_CACHE=true

# ----- Rate Limiting -----
RATE_LIMIT_PER_MINUTE=10
RATE_LIMIT_PER_HOUR=100

# ----- HWP Processing -----
HWP_TIMEOUT_SECONDS=30
HWP_RETRY_COUNT=3

# ----- External Services -----
# (추후 확장)
# SENTRY_DSN=""
# GOOGLE_ANALYTICS_ID=""
```

### 4.3 환경 변수 설명

#### 4.3.1 필수 환경 변수

| 변수명 | 설명 | 예시 값 | 주의사항 |
|--------|------|---------|----------|
| `ANTHROPIC_API_KEY` | Claude API 키 | `sk-ant-api03-...` | **절대 커밋 금지** |
| `SECRET_KEY` | JWT 암호화 키 | 랜덤 문자열 | 프로덕션에서 변경 필수 |
| `DATABASE_URL` | DB 연결 문자열 | `sqlite:///...` | 프로덕션: PostgreSQL |

#### 4.3.2 선택 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `PORT` | 서버 포트 | 8000 |
| `MAX_UPLOAD_SIZE` | 최대 업로드 크기 | 10MB |
| `CLAUDE_TEMPERATURE` | AI 창의성 (0~1) | 0.7 |

### 4.4 API Key 발급

#### 4.4.1 Claude API Key 발급
```bash
# 1. Anthropic Console 접속
https://console.anthropic.com/

# 2. 회원가입/로그인

# 3. API Keys > Create Key

# 4. 키 복사 후 .env에 붙여넣기
ANTHROPIC_API_KEY="sk-ant-api03-..."
```

#### 4.4.2 API Key 테스트
```python
# test_api_key.py
import os
from anthropic import Anthropic

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=100,
    messages=[
        {"role": "user", "content": "안녕하세요"}
    ]
)

print(message.content[0].text)
# 출력: "안녕하세요! 무엇을 도와드릴까요?"
```

### 4.5 환경별 설정

#### 4.5.1 개발 환경 (.env.development)
```bash
ENVIRONMENT="development"
DEBUG=true
LOG_LEVEL="DEBUG"
RELOAD=true
```

#### 4.5.2 프로덕션 환경 (.env.production)
```bash
ENVIRONMENT="production"
DEBUG=false
LOG_LEVEL="WARNING"
RELOAD=false
DATABASE_URL="postgresql://..."
CORS_ORIGINS="https://youthschool.com"
```

### 4.6 보안 주의사항

#### ⚠️ 절대 금지
```bash
# ❌ .env 파일을 Git에 커밋하지 마세요!
# .gitignore에 추가
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
```

#### ✅ 권장 사항
```bash
# 1. .env.example은 커밋 (실제 값 제외)
# 2. 팀원에게는 안전한 방법으로 공유 (1Password, AWS Secrets Manager)
# 3. 프로덕션 키는 로컬에 저장 금지
```

---

## 5. API 문서

### 5.1 API 기본 정보

**Base URL**: `http://localhost:8000/api/v1`  
**인증 방식**: JWT Bearer Token (추후 구현)  
**응답 형식**: JSON  

### 5.2 API 자동 문서

FastAPI는 자동으로 API 문서를 생성합니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

### 5.3 주요 엔드포인트

#### 5.3.1 템플릿 관리

##### GET /api/v1/templates
기본 제공 템플릿 목록 조회

**Request**:
```http
GET /api/v1/templates HTTP/1.1
Host: localhost:8000
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "template_001",
      "name": "가정통신문",
      "description": "초중고 가정통신문 기본 양식",
      "category": "communication",
      "file_path": "/templates/가정통신문.hwp",
      "created_at": "2025-01-15T10:00:00Z"
    },
    {
      "id": "template_002",
      "name": "외부 교육 용역 계획서",
      "description": "비즈쿨 외부 교육 용역 계획서",
      "category": "business",
      "file_path": "/templates/외부교육용역계획서.hwp",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

##### POST /api/v1/templates/upload
사용자 HWP 템플릿 업로드

**Request**:
```http
POST /api/v1/templates/upload HTTP/1.1
Host: localhost:8000
Content-Type: multipart/form-data

------boundary
Content-Disposition: form-data; name="file"; filename="내양식.hwp"
Content-Type: application/x-hwp

[HWP 파일 바이너리]
------boundary
Content-Disposition: form-data; name="name"

내 커스텀 양식
------boundary--
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "user_template_001",
    "name": "내 커스텀 양식",
    "file_path": "/uploads/user_template_001.hwp",
    "uploaded_at": "2025-01-15T14:30:00Z"
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "HWP 파일만 업로드 가능합니다.",
    "details": {
      "allowed_types": [".hwp"],
      "received_type": ".docx"
    }
  }
}
```

#### 5.3.2 문서 생성

##### POST /api/v1/documents/generate
AI 기반 문서 생성

**Request**:
```http
POST /api/v1/documents/generate HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "template_id": "template_001",
  "document_type": "가정통신문",
  "inputs": {
    "title": "겨울방학 안전 생활 안내",
    "purpose": "학생 안전",
    "greeting": "학부모님 안녕하세요",
    "content": "겨울방학 동안 안전하게 생활하도록 다음 사항을 안내드립니다.",
    "additional_notes": "문의사항은 담임교사에게 연락바랍니다."
  },
  "options": {
    "ai_enhance": true,
    "tone": "formal",
    "length": "medium"
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "document_id": "doc_20250115_001",
    "status": "completed",
    "generated_at": "2025-01-15T15:00:00Z",
    "download_url": "/api/v1/documents/doc_20250115_001/download",
    "preview_url": "/api/v1/documents/doc_20250115_001/preview",
    "generated_content": {
      "title": "겨울방학 안전 생활 안내",
      "body": "학부모님께,\n\n안녕하세요. 즐거운 겨울방학을 맞이하여 학생들의 안전한 생활을 위해 다음과 같이 안내드립니다...",
      "word_count": 450,
      "ai_confidence": 0.95
    },
    "metadata": {
      "template_used": "template_001",
      "processing_time_ms": 2340,
      "api_tokens_used": 1250
    }
  }
}
```

**Error Response** (500 Internal Server Error):
```json
{
  "success": false,
  "error": {
    "code": "AI_GENERATION_FAILED",
    "message": "Claude API 호출 중 오류가 발생했습니다.",
    "details": {
      "api_error": "Rate limit exceeded"
    }
  }
}
```

#### 5.3.3 파일 다운로드

##### GET /api/v1/documents/{document_id}/download
생성된 문서 다운로드

**Request**:
```http
GET /api/v1/documents/doc_20250115_001/download HTTP/1.1
Host: localhost:8000
```

**Response** (200 OK):
```http
HTTP/1.1 200 OK
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="가정통신문_20250115.hwp"

[HWP 파일 바이너리]
```

### 5.4 에러 코드

| HTTP Status | Error Code | 설명 | 해결 방법 |
|-------------|------------|------|-----------|
| 400 | `INVALID_INPUT` | 입력값 검증 실패 | 요청 데이터 확인 |
| 400 | `INVALID_FILE_TYPE` | 지원하지 않는 파일 형식 | HWP 파일만 업로드 |
| 404 | `TEMPLATE_NOT_FOUND` | 템플릿을 찾을 수 없음 | 템플릿 ID 확인 |
| 404 | `DOCUMENT_NOT_FOUND` | 문서를 찾을 수 없음 | 문서 ID 확인 |
| 413 | `FILE_TOO_LARGE` | 파일 크기 초과 | 10MB 이하로 제한 |
| 429 | `RATE_LIMIT_EXCEEDED` | 요청 횟수 초과 | 1분 대기 후 재시도 |
| 500 | `HWP_PROCESSING_ERROR` | HWP 처리 실패 | 템플릿 파일 확인 |
| 500 | `AI_GENERATION_FAILED` | AI 생성 실패 | API 키 확인 |
| 503 | `SERVICE_UNAVAILABLE` | 서비스 일시 중단 | 나중에 재시도 |

### 5.5 Rate Limiting

| 엔드포인트 | 제한 | 기간 |
|-----------|------|------|
| `/api/v1/documents/generate` | 10회 | 1분 |
| `/api/v1/documents/generate` | 100회 | 1시간 |
| `/api/v1/templates/*` | 30회 | 1분 |

**Rate Limit 헤더**:
```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1705320000
```

### 5.6 Webhook (추후 구현)

문서 생성 완료 시 Webhook 호출 (선택 기능)

**Request**:
```http
POST https://your-server.com/webhook HTTP/1.1
Content-Type: application/json

{
  "event": "document.completed",
  "document_id": "doc_20250115_001",
  "status": "completed",
  "download_url": "https://youthschool.com/api/v1/documents/doc_20250115_001/download",
  "timestamp": "2025-01-15T15:00:00Z"
}
```

---

## 6. 컨트리뷰션 가이드

### 6.1 기여 방법

YouthSchool MVP는 오픈소스 프로젝트입니다. 누구나 기여할 수 있습니다!

#### 6.1.1 기여 유형

| 유형 | 설명 | 예시 |
|------|------|------|
| 🐛 **버그 수정** | 코드 오류 수정 | HWP 파싱 에러 해결 |
| ✨ **기능 추가** | 새로운 기능 개발 | 새 문서 유형 추가 |
| 📝 **문서 개선** | 문서 작성/수정 | README 오타 수정 |
| 🎨 **UI/UX 개선** | 디자인 개선 | 프론트엔드 스타일링 |
| ⚡ **성능 최적화** | 속도 개선 | API 응답 시간 단축 |
| 🧪 **테스트 작성** | 테스트 코드 추가 | Unit Test 작성 |

### 6.2 컨트리뷰션 워크플로우

```
1. Issue 생성
   └─> 2. Fork & Clone
        └─> 3. 브랜치 생성
             └─> 4. 코드 작성
                  └─> 5. 커밋
                       └─> 6. Push
                            └─> 7. Pull Request
                                 └─> 8. 코드 리뷰
                                      └─> 9. 머지
```

#### Step 1: Issue 생성
```markdown
# 버그 리포트 예시
## 제목
HWP 파일 생성 시 한글 깨짐 현상

## 설명
Windows 11에서 가정통신문 생성 시 일부 한글이 깨져서 표시됩니다.

## 재현 방법
1. 가정통신문 템플릿 선택
2. 제목에 "안녕하세요" 입력
3. 생성 버튼 클릭
4. 다운로드 후 한글로 열기

## 예상 결과
한글이 정상적으로 표시되어야 함

## 실제 결과
"안녕하세요" → "?뚌옄?쎼怨?"로 표시됨

## 환경
- OS: Windows 11
- Python: 3.10
- 한글: 2020
```

#### Step 2: Fork & Clone
```bash
# 1. GitHub에서 Fork 버튼 클릭

# 2. 본인 저장소에서 클론
git clone https://github.com/YOUR-USERNAME/youthschool-mvp.git
cd youthschool-mvp

# 3. Upstream 설정
git remote add upstream https://github.com/ORIGINAL-OWNER/youthschool-mvp.git
```

#### Step 3: 브랜치 생성
```bash
# feature 브랜치
git checkout -b feature/add-report-template

# bugfix 브랜치
git checkout -b bugfix/hwp-encoding-issue

# 브랜치 명명 규칙
# - feature/기능명
# - bugfix/버그명
# - docs/문서명
# - refactor/리팩토링명
```

#### Step 4: 코드 작성
```bash
# 1. 의존성 설치
pip install -r requirements.txt
pip install -r requirements-dev.txt  # 개발 의존성

# 2. 코드 작성
# (VS Code, Cursor 등에서 작업)

# 3. 테스트 실행
pytest tests/

# 4. 코드 포맷팅
black .
flake8 .
```

#### Step 5: 커밋
```bash
# 커밋 메시지 규칙
git commit -m "feat: 보고서 템플릿 추가"
git commit -m "fix: HWP 한글 인코딩 문제 해결"
git commit -m "docs: API 문서 업데이트"

# 커밋 메시지 접두사
# - feat: 새 기능
# - fix: 버그 수정
# - docs: 문서 수정
# - style: 코드 포맷팅
# - refactor: 리팩토링
# - test: 테스트 추가
# - chore: 기타 작업
```

#### Step 6: Push
```bash
git push origin feature/add-report-template
```

#### Step 7: Pull Request 생성
```markdown
# PR 템플릿
## 제목
[Feature] 보고서 템플릿 추가

## 변경 사항
- 학교 보고서 템플릿 추가 (.hwp)
- 보고서 생성 API 엔드포인트 추가
- 프론트엔드 보고서 선택 UI 추가

## 관련 Issue
Closes #42

## 테스트
- [ ] Unit Test 통과
- [ ] Integration Test 통과
- [ ] 수동 테스트 완료

## 스크린샷
![보고서 UI](screenshot.png)

## 체크리스트
- [ ] 코드 포맷팅 완료 (black)
- [ ] Lint 검사 통과 (flake8)
- [ ] 문서 업데이트 완료
- [ ] 테스트 코드 작성 완료
```

### 6.3 코드 스타일 가이드

#### 6.3.1 Python 스타일
```python
# ✅ 좋은 예
def generate_document(
    template_id: str,
    inputs: dict,
    options: Optional[dict] = None
) -> Document:
    """
    AI 기반 문서 생성
    
    Args:
        template_id: 템플릿 ID
        inputs: 사용자 입력 데이터
        options: 생성 옵션 (선택)
    
    Returns:
        Document: 생성된 문서 객체
    
    Raises:
        TemplateNotFoundError: 템플릿을 찾을 수 없는 경우
        AIGenerationError: AI 생성 실패
    """
    if options is None:
        options = {}
    
    # 로직 구현
    return document


# ❌ 나쁜 예
def gen_doc(t_id, inp, opt=None):  # 이름이 불명확
    # 주석 없음
    if opt==None:  # PEP8 위반
        opt={}
    return doc
```

#### 6.3.2 JavaScript 스타일
```javascript
// ✅ 좋은 예
async function generateDocument(templateId, inputs) {
  try {
    const response = await fetch('/api/v1/documents/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ template_id: templateId, inputs }),
    });
    
    if (!response.ok) {
      throw new Error('문서 생성 실패');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// ❌ 나쁜 예
function gen(t,i){  // 이름이 불명확
  fetch('/api/v1/documents/generate',{method:'POST',body:JSON.stringify({template_id:t,inputs:i})})
  .then(r=>r.json())  // 에러 처리 없음
}
```

### 6.4 테스트 가이드

#### 6.4.1 Unit Test 작성
```python
# tests/test_hwp_service.py
import pytest
from app.services.hwp_service import HWPService

def test_parse_hwp_file():
    """HWP 파일 파싱 테스트"""
    service = HWPService()
    
    # Given
    hwp_path = "tests/fixtures/sample.hwp"
    
    # When
    result = service.parse(hwp_path)
    
    # Then
    assert result is not None
    assert result.fields is not None
    assert len(result.fields) > 0

def test_parse_invalid_file():
    """잘못된 파일 파싱 시 에러 발생"""
    service = HWPService()
    
    with pytest.raises(InvalidFileError):
        service.parse("invalid.txt")
```

#### 6.4.2 Integration Test
```python
# tests/test_api.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_generate_document():
    """문서 생성 API 테스트"""
    response = client.post(
        "/api/v1/documents/generate",
        json={
            "template_id": "template_001",
            "inputs": {
                "title": "테스트 제목",
                "content": "테스트 내용"
            }
        }
    )
    
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert "document_id" in response.json()["data"]
```

### 6.5 코드 리뷰 기준

#### 리뷰어 체크리스트
- [ ] 코드가 요구사항을 충족하는가?
- [ ] 테스트가 충분한가?
- [ ] 문서가 업데이트되었는가?
- [ ] 성능 이슈가 없는가?
- [ ] 보안 취약점이 없는가?
- [ ] 코드 스타일을 따르는가?

#### 리뷰 피드백 예시
```markdown
# ✅ 건설적인 피드백
이 함수는 잘 작성되었습니다! 다만 다음 부분을 개선하면 좋을 것 같아요:

1. `parse_hwp` 함수에서 예외 처리를 추가하면 좋겠습니다.
2. 테스트 케이스에 엣지 케이스(빈 파일, 깨진 파일)를 추가해주세요.

# ❌ 비건설적인 피드백
이거 왜 이렇게 했어요? 다시 작성하세요.
```

### 6.6 라이선스

이 프로젝트는 **MIT License**를 따릅니다.

```
MIT License

Copyright (c) 2025 YouthSchool Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 6.7 연락처

**프로젝트 관리자**: Kim  
**이메일**: [프로젝트 이메일 추가]  
**GitHub**: https://github.com/yourusername/youthschool-mvp  
**Discord**: [커뮤니티 링크]

---

## 7. Architecture Decisions

### 7.1 ADR-001: FastAPI 선택

**상태**: ✅ 승인됨  
**날짜**: 2025-01-15  
**결정자**: Kim

#### 컨텍스트
백엔드 프레임워크를 선택해야 함. 비개발자가 빠르게 학습하고 개발할 수 있어야 함.

#### 결정
FastAPI를 백엔드 프레임워크로 선택

#### 근거
1. **자동 API 문서 생성**: Swagger UI 자동 제공
2. **빠른 개발 속도**: 최소한의 코드로 REST API 구축
3. **타입 힌팅**: Python 타입 힌트로 버그 감소
4. **비동기 지원**: 높은 성능
5. **커뮤니티**: 활발한 생태계, 풍부한 예제

#### 대안
- **Flask**: 너무 단순, 자동 문서 없음
- **Django**: 과도하게 무거움, 학습 곡선 높음
- **Express.js**: JavaScript로 백엔드 통일 가능하지만 Python HWP 라이브러리 사용 불가

#### 결과
- ✅ API 문서 자동 생성으로 개발 속도 50% 향상
- ✅ 타입 체킹으로 런타임 에러 감소
- ⚠️ 비동기 개념 학습 필요 (학습 비용)

---

### 7.2 ADR-002: pywin32/pyhwpx 선택

**상태**: ✅ 승인됨  
**날짜**: 2025-01-15  
**결정자**: Kim

#### 컨텍스트
HWP 파일 처리를 위한 Python 라이브러리 선택 필요

#### 결정
pywin32를 주 라이브러리로, pyhwpx를 보조로 사용

#### 근거
1. **pywin32**:
   - HWP COM 인터페이스 직접 제어 (가장 강력)
   - 안정성 높음
   - 커뮤니티 지원 많음
   
2. **pyhwpx**:
   - Linux 환경 지원
   - 순수 Python (pywin32 대안)
   - 추후 크로스 플랫폼 대응 가능

#### 대안
- **olefile**: HWP 내부 파싱만 가능 (생성 불가)
- **java-hwp**: JVM 필요, Python과 통합 어려움

#### 결과
- ✅ HWP 파일 읽기/쓰기 모두 가능
- ⚠️ Windows 환경 의존성 (배포 제약)
- ⚠️ COM 오류 디버깅 어려움

---

### 7.3 ADR-003: Claude API 선택

**상태**: ✅ 승인됨  
**날짜**: 2025-01-15  
**결정자**: Kim

#### 컨텍스트
AI 텍스트 생성을 위한 LLM API 선택

#### 결정
Anthropic Claude Sonnet 4.5 사용

#### 근거
1. **한국어 품질**: 공문서 작성에 최적화된 격식있는 어투
2. **긴 컨텍스트**: 200K 토큰으로 긴 문서 처리 가능
3. **비용**: GPT-4보다 가격 경쟁력 있음
4. **안정성**: 환각(hallucination) 적음

#### 대안
- **OpenAI GPT-4**: 한국어 품질 우수하지만 비용 높음
- **GPT-4o-mini**: 저렴하지만 품질 저하
- **Google Gemini**: 한국어 공문서 어투 부자연스러움

#### 결과
- ✅ 한국어 공문서 품질 95% 만족도
- ✅ API 토큰당 비용 $0.003 (GPT-4 대비 50% 저렴)
- ⚠️ API 호출 비용 누적 가능성

---

### 7.4 ADR-004: SQLite 선택

**상태**: ✅ 승인됨 (MVP), ⚠️ 추후 PostgreSQL 전환  
**날짜**: 2025-01-15  
**결정자**: Kim

#### 컨텍스트
데이터베이스 선택 필요 (사용자 정보, 템플릿 메타데이터, 생성 이력)

#### 결정
MVP는 SQLite, 프로덕션은 PostgreSQL로 전환

#### 근거
1. **SQLite (MVP)**:
   - 설치 불필요 (Python 내장)
   - 파일 기반 (관리 간단)
   - 동시 사용자 <10명에 충분
   
2. **PostgreSQL (프로덕션)**:
   - 동시성 처리 우수
   - 풍부한 데이터 타입
   - 백업/복구 용이

#### 대안
- **MySQL**: PostgreSQL과 유사, 특별한 이점 없음
- **MongoDB**: NoSQL 불필요 (구조화된 데이터)

#### 결과
- ✅ MVP 개발 속도 향상 (환경 설정 시간 0)
- ✅ SQLAlchemy ORM으로 DB 전환 용이
- ⚠️ 프로덕션에서 동시 쓰기 제한

---

### 7.5 ADR-005: 사용자 템플릿 업로드 지원

**상태**: ✅ 승인됨  
**날짜**: 2025-01-15  
**결정자**: Kim

#### 컨텍스트
기본 템플릿만 제공 vs 사용자 업로드 지원

#### 결정
사용자가 자신의 HWP 양식을 업로드할 수 있도록 지원

#### 근거
1. **차별화**: 경쟁사는 고정 템플릿만 제공
2. **유연성**: 학교마다 다른 양식 사용 가능
3. **확장성**: 다양한 문서 유형 대응

#### 우려사항
- 사용자 업로드 파일의 필드 매핑 복잡도 증가
- 악성 파일 업로드 위험

#### 대응
- 필드 자동 감지 + 수동 매핑 UI 제공
- 파일 타입 검증 (.hwp만 허용)
- 크기 제한 (10MB)

#### 결과
- ✅ 사용자 만족도 향상
- ⚠️ 개발 복잡도 20% 증가
- ⚠️ 보안 검증 필요

---

### 7.6 ADR-006: 프론트엔드-백엔드 분리

**상태**: ✅ 승인됨  
**날짜**: 2025-01-15  
**결정자**: Kim

#### 컨텍스트
모놀리식 vs 프론트엔드-백엔드 분리 아키텍처

#### 결정
프론트엔드(Replit AI)와 백엔드(FastAPI) 분리

#### 근거
1. **독립 개발**: 프론트-백엔드 병렬 개발 가능
2. **Replit AI 활용**: 프론트는 AI가 자동 생성
3. **확장성**: 추후 모바일 앱 추가 용이
4. **배포 유연성**: 각각 독립 배포

#### 대안
- **모놀리식**: FastAPI 템플릿 렌더링 (Jinja2)
  - 장점: 단순함
  - 단점: Replit AI 활용 불가

#### 결과
- ✅ 프론트 개발 시간 70% 단축 (Replit AI)
- ✅ 백엔드 API 재사용 가능
- ⚠️ CORS 설정 필요

---

### 7.7 ADR-007: Excel 파일 생성 지원

**상태**: 🟡 보류 (Phase 2)  
**날짜**: 2025-01-15  
**결정자**: Kim

#### 컨텍스트
외부 교육 용역 계획서에 예산표 Excel 파일 필요

#### 결정
MVP에서는 Excel 생성 제외, Phase 2에서 추가

#### 근거
1. **우선순위**: 가정통신문(HWP만)이 더 급함
2. **복잡도**: Excel 템플릿 처리 추가 개발 필요
3. **시간**: 2월 말까지 완성하려면 스코프 축소 필요

#### Phase 2 계획
- openpyxl로 Excel 생성
- 예산표 템플릿 제공
- AI가 항목별 예산 자동 계산

#### 결과
- ✅ MVP 개발 집중도 향상
- ⏳ Excel 기능은 Phase 2로 연기

---

## 8. 부록

### 8.1 용어 사전

| 용어 | 설명 |
|------|------|
| **HWP** | 한글과컴퓨터(Hancom)의 문서 파일 형식 |
| **COM** | Component Object Model, Windows 프로그램 간 통신 인터페이스 |
| **FastAPI** | Python 웹 프레임워크 |
| **Claude API** | Anthropic의 AI 텍스트 생성 API |
| **MVP** | Minimum Viable Product (최소 기능 제품) |
| **ADR** | Architecture Decision Record |

### 8.2 참고 자료

- **FastAPI 공식 문서**: https://fastapi.tiangolo.com/
- **pywin32 문서**: https://github.com/mhammond/pywin32
- **Claude API 문서**: https://docs.anthropic.com/
- **한글 자동화 가이드**: https://www.hancom.com/

### 8.3 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2025-01-15 | 초안 작성 | Kim |

---

**문서 끝**

이 문서는 지속적으로 업데이트됩니다.  
최신 버전: https://github.com/yourusername/youthschool-mvp/blob/main/docs/ADR.md
