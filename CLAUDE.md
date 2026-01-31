# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Overview

학교 문서 관리 시스템 - React + TypeScript 프론트엔드, Express.js 백엔드

## 중요: 폼 모듈 디자인 패턴

**모든 폼 모듈은 아래 구조를 따라야 함:**

```tsx
<Card>
  <CardHeader>
    <CardTitle>문서명 정보 입력</CardTitle>
    <CardDescription>입력한 내용으로 AI가 항목을 생성합니다.</CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    {/* 섹션 1 */}
    <section ref={setSectionRef("section-id")} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">섹션 제목</h2>
        <Button>AI 생성</Button>  {/* 필요시 */}
      </div>
      {/* 섹션 내용 */}
    </section>

    <div className="h-px bg-border" />  {/* 섹션 구분선 */}

    {/* 섹션 2 */}
    <section>...</section>

    <div className="h-px bg-border" />

    {/* 섹션 N (마지막 섹션) */}
    <section>...</section>

    {/* 액션 버튼 - CardContent 최하단에 위치 */}
    <div className="flex flex-col gap-3 pt-4 sm:flex-row">
      <Button variant="outline">미리보기</Button>
      <Button className="flex-1">AI 전부 생성</Button>
      <Button variant="secondary">초기화</Button>
    </div>
  </CardContent>
</Card>
```

**핵심 규칙:**
1. 하나의 `<Card>` 안에 모든 섹션 포함
2. 각 섹션은 `<section>` 요소 사용
3. 섹션 제목은 `<h2 className="text-sm font-semibold text-foreground">`
4. 섹션 사이에 `<div className="h-px bg-border" />` 구분선 추가
5. 개별 Card로 섹션을 분리하지 않음
6. **액션 버튼(미리보기, AI 전부 생성, 초기화)은 CardContent 최하단에 위치** (Card 밖이 아님)

## AI 생성 버튼

- 버튼 텍스트: "AI 생성" (not "AI 작성")
- 전체 생성: "AI 전부 생성"

## Development

```bash
npm run dev  # 개발 서버 실행 (포트 5000)
```
