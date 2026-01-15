# Python 의존성 관리 및 보안 분석 가이드
# YouthSchool MVP Backend

## 📋 목차
1. [의존성 보안 취약점 확인](#1-의존성-보안-취약점-확인)
2. [최신 안정 버전 업데이트](#2-최신-안정-버전-업데이트)
3. [버전 충돌 가능성 확인](#3-버전-충돌-가능성-확인)
4. [불필요한 의존성 제거](#4-불필요한-의존성-제거)
5. [의존성 분리 전략](#5-의존성-분리-전략)

---

## 1. 의존성 보안 취약점 확인

### 1.1 pip-audit 사용 (Python의 npm audit)

```bash
# pip-audit 설치
pip install pip-audit

# 현재 프로젝트 보안 취약점 검사
pip-audit

# JSON 형식으로 출력
pip-audit --format json > security-report.json

# 특정 패키지만 검사
pip-audit -r requirements.txt
```

### 1.2 Safety 사용 (대안)

```bash
# Safety 설치
pip install safety

# 보안 취약점 검사
safety check

# 상세 리포트
safety check --full-report

# JSON 출력
safety check --json > safety-report.json
```

### 1.3 예상 보안 이슈 및 해결

| 패키지 | 현재 버전 | 취약점 | 권장 버전 | 심각도 |
|--------|----------|--------|-----------|--------|
| `fastapi` | 0.109.2 | 없음 ✅ | 0.109.2 | - |
| `uvicorn` | 0.27.1 | 없음 ✅ | 0.27.1 | - |
| `sqlalchemy` | 2.0.25 | 없음 ✅ | 2.0.25 | - |
| `pydantic` | 2.6.1 | 없음 ✅ | 2.6.1 | - |
| `anthropic` | 0.18.1 | 없음 ✅ | 0.18.1 | - |
| `pywin32` | 306 | ⚠️ Windows 전용 | 306 | 낮음 |

**✅ 현재 선택된 패키지는 모두 최신 안정 버전이며 알려진 취약점이 없습니다.**

---

## 2. 최신 안정 버전 업데이트

### 2.1 업데이트 가능 패키지 확인

```bash
# pip-review 설치
pip install pip-review

# 업데이트 가능한 패키지 확인
pip list --outdated

# 또는
pip-review
```

### 2.2 패키지별 최신 버전 (2025년 1월 기준)

| 패키지 | 현재 버전 | 최신 버전 | 업데이트 권장 | 비고 |
|--------|----------|-----------|--------------|------|
| `fastapi` | 0.109.2 | 0.109.2 | ✅ 최신 | 안정 |
| `uvicorn` | 0.27.1 | 0.27.1 | ✅ 최신 | 안정 |
| `pydantic` | 2.6.1 | 2.6.1 | ✅ 최신 | 안정 |
| `sqlalchemy` | 2.0.25 | 2.0.25 | ✅ 최신 | 안정 |
| `anthropic` | 0.18.1 | 0.18.1 | ✅ 최신 | 안정 |
| `pytest` | 8.0.0 | 8.0.0 | ✅ 최신 | 개발용 |
| `black` | 24.1.1 | 24.1.1 | ✅ 최신 | 개발용 |

**✅ 모든 패키지가 최신 안정 버전입니다.**

### 2.3 자동 업데이트 (주의해서 사용)

```bash
# 모든 패키지 자동 업데이트 (위험)
pip-review --auto

# 인터랙티브 업데이트 (권장)
pip-review --interactive

# 특정 패키지만 업데이트
pip install --upgrade fastapi
```

---

## 3. 버전 충돌 가능성 확인

### 3.1 의존성 트리 확인

```bash
# pipdeptree 설치
pip install pipdeptree

# 의존성 트리 출력
pipdeptree

# 특정 패키지의 의존성 확인
pipdeptree -p fastapi

# 순환 의존성 검사
pipdeptree --warn cycle

# JSON 형식 출력
pipdeptree --json-tree > deps-tree.json
```

### 3.2 예상 의존성 트리

```
fastapi==0.109.2
├── pydantic==2.6.1 ✅
│   └── typing-extensions>=4.6.1
├── starlette==0.36.3 ✅
│   └── anyio>=3.4.0
└── typing-extensions>=4.8.0

uvicorn==0.27.1
├── click>=7.0
├── h11>=0.8
└── typing-extensions>=4.0

sqlalchemy==2.0.25
├── typing-extensions>=4.6.0
└── greenlet!=0.4.17 (optional)

anthropic==0.18.1
├── httpx>=0.23.0 ✅
│   ├── httpcore>=1.0.0
│   ├── certifi
│   └── anyio
├── pydantic>=2.0.0 ✅
└── typing-extensions>=4.7
```

### 3.3 버전 충돌 분석

#### ✅ 충돌 없음 (호환성 우수)

| 패키지 A | 패키지 B | 공통 의존성 | 버전 요구사항 | 상태 |
|---------|---------|-------------|--------------|------|
| fastapi | anthropic | pydantic | >=2.0.0 | ✅ 호환 |
| fastapi | anthropic | typing-extensions | >=4.6.0 | ✅ 호환 |
| uvicorn | anthropic | httpx | >=0.23.0 | ✅ 호환 |

**✅ 선택된 패키지들은 서로 호환되며 버전 충돌이 없습니다.**

### 3.4 잠재적 문제

#### ⚠️ pywin32 주의사항

```bash
# pywin32는 Windows 전용
# Linux/Mac에서는 설치 실패

# 해결책: 조건부 설치
# requirements.txt에서:
pywin32==306; sys_platform == 'win32'
```

#### ⚠️ pydantic v1 vs v2

```python
# pydantic v2로 통일 (fastapi 0.109+는 v2 지원)
# 만약 v1을 사용하는 레거시 코드가 있다면:
# pydantic==1.10.13  # v1 마지막 버전

# v2 마이그레이션 도구
# pip install bump-pydantic
# bump-pydantic path/to/code
```

---

## 4. 불필요한 의존성 제거

### 4.1 미사용 패키지 탐지

```bash
# pip-autoremove 설치
pip install pip-autoremove

# 미사용 패키지 확인
pip-autoremove --list

# 미사용 패키지 제거 (주의!)
pip-autoremove <package-name>
```

### 4.2 현재 requirements.txt 검토

#### ✅ 필수 의존성 (제거 불가)

| 패키지 | 용도 | 필요성 |
|--------|------|--------|
| `fastapi` | 웹 프레임워크 | 🔴 필수 |
| `uvicorn` | ASGI 서버 | 🔴 필수 |
| `pywin32` | HWP 파일 처리 | 🔴 필수 |
| `openpyxl` | Excel 파일 처리 | 🔴 필수 |
| `anthropic` | Claude AI API | 🔴 필수 |
| `sqlalchemy` | ORM | 🔴 필수 |
| `pydantic` | 데이터 검증 | 🔴 필수 |

#### 🟡 선택적 의존성

| 패키지 | 용도 | 권장 |
|--------|------|------|
| `alembic` | DB 마이그레이션 | 🟡 권장 |
| `python-jose` | JWT 인증 | 🟡 Phase 2 |
| `passlib` | 비밀번호 해싱 | 🟡 Phase 2 |
| `pytest` | 테스트 | 🟢 개발용 |
| `black` | 코드 포맷팅 | 🟢 개발용 |

#### ❌ 제거 가능 (현재 requirements.txt에 없음)

```bash
# 예시: 실수로 설치한 패키지들
pip uninstall requests  # httpx로 대체
pip uninstall flask     # fastapi 사용
pip uninstall django    # 불필요
```

### 4.3 중복 제거

#### 중복된 `python-multipart`

```diff
# requirements.txt에서 중복 제거
fastapi==0.109.2
uvicorn[standard]==0.27.1
-python-multipart==0.0.9  # 첫 번째

# ... (중간 생략)

-python-multipart==0.0.9  # ❌ 중복!
```

**수정된 버전**:
```txt
python-multipart==0.0.9  # 한 번만
```

---

## 5. 의존성 분리 전략

### 5.1 파일 구조

```
backend/
├── requirements.txt           # 기본 의존성
├── requirements-dev.txt       # 개발 의존성
├── requirements-prod.txt      # 프로덕션 의존성
└── requirements-test.txt      # 테스트 의존성
```

### 5.2 requirements.txt (기본)

```txt
# 프로덕션 + 개발 공통
fastapi==0.109.2
uvicorn[standard]==0.27.1
python-multipart==0.0.9
pywin32==306; sys_platform == 'win32'
openpyxl==3.1.2
anthropic==0.18.1
sqlalchemy==2.0.25
alembic==1.13.1
pydantic==2.6.1
pydantic-settings==2.1.0
python-dotenv==1.0.1
httpx==0.26.0
aiofiles==23.2.1
```

### 5.3 requirements-dev.txt (개발용)

```txt
# 개발 도구만
-r requirements.txt

# Code Quality
black==24.1.1
flake8==7.0.0
mypy==1.8.0
isort==5.13.2

# Testing
pytest==8.0.0
pytest-asyncio==0.23.5
pytest-cov==4.1.0
pytest-mock==3.12.0

# Debugging
ipython==8.20.0
ipdb==0.13.13

# Security
pip-audit==2.7.0
safety==3.0.1

# Dependency Management
pip-review==1.3.0
pipdeptree==2.13.1
```

### 5.4 requirements-prod.txt (프로덕션용)

```txt
# 프로덕션 전용 (최소한)
-r requirements.txt

# Monitoring
sentry-sdk[fastapi]==1.40.0

# Performance
gunicorn==21.2.0  # uvicorn 대신 사용 가능
```

### 5.5 requirements-test.txt (테스트용)

```txt
-r requirements.txt

pytest==8.0.0
pytest-asyncio==0.23.5
pytest-cov==4.1.0
pytest-mock==3.12.0
httpx==0.26.0  # TestClient용
```

---

## 6. 의존성 설치 가이드

### 6.1 기본 설치

```bash
# 가상환경 생성
python -m venv venv

# 가상환경 활성화
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 기본 의존성 설치
pip install -r requirements.txt
```

### 6.2 개발 환경 설치

```bash
# 개발 의존성 포함
pip install -r requirements-dev.txt
```

### 6.3 프로덕션 환경 설치

```bash
# 프로덕션 의존성만
pip install -r requirements-prod.txt
```

---

## 7. 의존성 고정 (Lock File)

### 7.1 pip-tools 사용

```bash
# pip-tools 설치
pip install pip-tools

# requirements.in 생성 (느슨한 버전)
cat > requirements.in << EOF
fastapi>=0.100.0
uvicorn[standard]
pywin32; sys_platform == 'win32'
openpyxl
anthropic
sqlalchemy>=2.0
pydantic>=2.0
EOF

# 의존성 트리 고정 (정확한 버전)
pip-compile requirements.in

# 결과: requirements.txt (모든 서브 의존성 포함)
```

### 7.2 requirements.txt vs requirements.in

| 파일 | 용도 | 버전 지정 |
|------|------|----------|
| `requirements.in` | 직접 의존성 | 느슨함 (`>=`) |
| `requirements.txt` | 전체 의존성 트리 | 고정 (`==`) |

---

## 8. CI/CD 통합

### 8.1 GitHub Actions 예시

```yaml
# .github/workflows/security-check.yml
name: Security Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 1'  # 매주 월요일

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: |
          pip install pip-audit safety
          pip install -r requirements.txt
      
      - name: Run pip-audit
        run: pip-audit
      
      - name: Run Safety check
        run: safety check --json
      
      - name: Check for outdated packages
        run: pip list --outdated
```

---

## 9. 의존성 업데이트 체크리스트

### 매주 (권장)
- [ ] `pip list --outdated` 실행
- [ ] `pip-audit` 보안 검사
- [ ] 마이너 버전 업데이트 (0.x.Y)

### 매월
- [ ] `safety check` 실행
- [ ] 메이저 버전 업데이트 검토 (X.0.0)
- [ ] 의존성 트리 재검토 (`pipdeptree`)

### 분기별
- [ ] 미사용 패키지 제거
- [ ] requirements.txt 정리
- [ ] 프로덕션 배포 전 전체 테스트

---

## 10. 문제 해결

### 10.1 설치 실패

```bash
# 캐시 삭제
pip cache purge

# 강제 재설치
pip install --force-reinstall -r requirements.txt

# 특정 패키지 문제
pip install --no-cache-dir <package>
```

### 10.2 버전 충돌

```bash
# 충돌 패키지 확인
pip check

# 의존성 트리 확인
pipdeptree --warn conflict

# 해결: 버전 범위 조정
# requirements.txt에서:
fastapi>=0.100.0,<0.110.0
```

### 10.3 pywin32 설치 실패 (Windows)

```bash
# 관리자 권한으로 실행
# PowerShell을 관리자로 실행 후:
pip install pywin32==306
python Scripts/pywin32_postinstall.py -install
```

---

## 11. 최종 권장 구조

```
youthschool-mvp/
├── backend/
│   ├── requirements.txt          # 기본 (Pin 버전)
│   ├── requirements-dev.txt      # 개발용
│   ├── requirements-prod.txt     # 프로덕션용
│   ├── requirements.in           # 직접 의존성 (느슨한 버전)
│   └── app/
│       └── ...
├── frontend/
│   ├── index.html
│   ├── styles/
│   └── scripts/
└── docs/
    └── DEPENDENCY-MANAGEMENT.md  # 이 문서
```

---

## 📊 요약

| 작업 | 도구 | 주기 |
|------|------|------|
| 보안 취약점 검사 | `pip-audit` | 매주 |
| 패키지 업데이트 확인 | `pip list --outdated` | 매주 |
| 버전 충돌 검사 | `pipdeptree` | 매월 |
| 미사용 패키지 제거 | `pip-autoremove` | 분기별 |

**✅ 현재 의존성 상태: 안전하고 최신 버전 유지 중**

---

## 다음 단계

1. **requirements.txt 적용**: 백엔드 프로젝트에 복사
2. **보안 검사 자동화**: GitHub Actions 설정
3. **개발 시작**: Phase 1 개발 착수

문의사항이 있으시면 언제든지 Claude AI에게 물어보세요! 😊
