import type Anthropic from "@anthropic-ai/sdk";
import type { AftercarePlanInputs, AftercareReportInputs } from "@shared/schema";

export type ToolId = "aftercare_plan" | "aftercare_report";

export type ValidationItem = {
  code: string;
  field: string;
  message: string;
  evidence?: string[];
};

export type ValidationResult = {
  blocking: ValidationItem[];
  warnings: ValidationItem[];
};

export type GeneratedField = {
  text: string;
  source: "ai" | "user" | "mixed";
  last_generated_at?: string;
};

export type GenerateFieldOptions = {
  mode?: "overwrite" | "append";
  style?: "official";
  length?: "short" | "medium" | "long";
  user_hint?: string;
  rag?: {
    enabled?: boolean;
    collections?: string[];
  };
};

export const AFTERCARE_FIELD_KEYS: Record<ToolId, string[]> = {
  aftercare_plan: [
    "selection_process_text",
    "purpose_text",
    "operation_detail_text",
    "expected_effect_text",
    "staffing_coordination_text",
    "safety_plan_text",
    "attendance_return_text",
    "budget_policy_text",
    "evaluation_feedback_text",
  ],
  aftercare_report: [
    "operations_overview_text",
    "staffing_result_text",
    "safety_complaint_result_text",
    "budget_execution_text",
    "evaluation_improvement_text",
  ],
};

const REQUIRED_FIELDS: Record<ToolId, string[]> = {
  aftercare_plan: [
    "school_name",
    "term_label",
    "operation_types",
    "period",
    "days_of_week",
    "time_semester",
    "location",
    "target_grades",
    "capacity",
    "selection_criteria",
    "attendance_method",
    "return_home_policy",
  ],
  aftercare_report: [
    "school_name",
    "period_label",
    "operation_types",
    "operation_days",
    "avg_participants",
    "incident_flag",
  ],
};

const NUMBER_TOKEN_REGEX = /(\d{4}[./-]\d{1,2}[./-]\d{1,2})|(\d{1,2}:\d{2})|(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g;

const cleanText = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

export const collectNumericTokens = (inputs: unknown): Set<string> => {
  const text = cleanText(inputs);
  const tokens = new Set<string>();
  const matches = text.match(NUMBER_TOKEN_REGEX) || [];
  matches.forEach((token) => tokens.add(token));
  return tokens;
};

export const checkPolicyNoNewNumbers = (generatedText: string, inputs: unknown) => {
  const allowed = collectNumericTokens(inputs);
  const found = generatedText.match(NUMBER_TOKEN_REGEX) || [];
  const violations = found.filter((token) => !allowed.has(token));
  return {
    violated: violations.length > 0,
    evidence: Array.from(new Set(violations)),
  };
};

export const validateInputs = (toolId: ToolId, inputs: Record<string, unknown>): ValidationResult => {
  const blocking: ValidationItem[] = [];
  const warnings: ValidationItem[] = [];
  const required = REQUIRED_FIELDS[toolId] || [];

  required.forEach((field) => {
    const value = inputs[field];
    const missing =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0);

    if (missing) {
      blocking.push({
        code: "REQUIRED_MISSING",
        field,
        message: `${field} 값이 필요합니다.`,
      });
    }
  });

  return { blocking, warnings };
};

const safeText = (value: unknown) => {
  if (value === undefined || value === null) return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const renderAftercarePlanHtml = (
  inputs: AftercarePlanInputs,
  generatedFields: Record<string, GeneratedField>,
  includeAppendixTables: boolean
) => {
  const toc = [
    { id: "sec1", title: "기본 운영 정보" },
    { id: "sec2", title: "운영 목적 및 선발" },
    { id: "sec3", title: "운영 세부" },
    { id: "sec4", title: "인력 및 안전" },
    { id: "sec5", title: "예산 및 평가" },
  ];

  const dailyScheduleRows =
    inputs.daily_schedule?.map(
      (row) =>
        `<tr><td>${row.slot}</td><td>${row.activity}</td><td>${row.note ?? "-"}</td></tr>`
    ) || [];

  const programRows =
    inputs.programs?.map(
      (row) =>
        `<tr><td>${row.name}</td><td>${row.frequency}</td><td>${row.owner ?? "-"}</td><td>${row.place ?? "-"}</td></tr>`
    ) || [];

  const staffingRows =
    inputs.staffing?.map(
      (row) =>
        `<tr><td>${row.role}</td><td>${row.count}</td><td>${row.work_time ?? "-"}</td><td>${row.duties ?? "-"}</td></tr>`
    ) || [];

  const budgetRows =
    inputs.budget_items?.map(
      (row) =>
        `<tr><td>${row.category}</td><td>${row.amount}</td><td>${row.basis ?? "-"}</td></tr>`
    ) || [];

  const html = `
    <section id="sec1">
      <h2>기본 운영 정보</h2>
      <p>학교명: ${safeText(inputs.school_name)}</p>
      <p>학기: ${safeText(inputs.term_label)}</p>
      <p>운영 유형: ${safeText(inputs.operation_types)}</p>
      <p>운영 기간: ${safeText(inputs.period?.start_date)} ~ ${safeText(inputs.period?.end_date)}</p>
      <p>운영 요일: ${safeText(inputs.days_of_week)}</p>
      <p>학기 운영시간: ${safeText(inputs.time_semester?.start_time)} ~ ${safeText(inputs.time_semester?.end_time)}</p>
      <p>장소: ${safeText(inputs.location)}</p>
      <p>대상 학년: ${safeText(inputs.target_grades)}</p>
      <p>정원: ${safeText(inputs.capacity)}</p>
    </section>
    <section id="sec2">
      <h2>운영 목적 및 선발</h2>
      <p>${generatedFields.purpose_text?.text ?? "-"}</p>
      <p>선정 기준: ${safeText(inputs.selection_criteria)}</p>
      <p>${generatedFields.selection_process_text?.text ?? "-"}</p>
    </section>
    <section id="sec3">
      <h2>운영 세부</h2>
      <p>${generatedFields.operation_detail_text?.text ?? "-"}</p>
      ${includeAppendixTables && dailyScheduleRows.length ? `<h3>일과 운영표</h3><table><thead><tr><th>시간</th><th>활동</th><th>비고</th></tr></thead><tbody>${dailyScheduleRows.join("")}</tbody></table>` : ""}
      ${includeAppendixTables && programRows.length ? `<h3>프로그램 운영</h3><table><thead><tr><th>프로그램</th><th>횟수</th><th>담당</th><th>장소</th></tr></thead><tbody>${programRows.join("")}</tbody></table>` : ""}
      <p>${generatedFields.expected_effect_text?.text ?? "-"}</p>
    </section>
    <section id="sec4">
      <h2>인력 및 안전</h2>
      ${includeAppendixTables && staffingRows.length ? `<h3>인력 배치</h3><table><thead><tr><th>역할</th><th>인원</th><th>근무시간</th><th>업무</th></tr></thead><tbody>${staffingRows.join("")}</tbody></table>` : ""}
      <p>${generatedFields.staffing_coordination_text?.text ?? "-"}</p>
      <p>출결 방식: ${safeText(inputs.attendance_method)}</p>
      <p>귀가 정책: ${safeText(inputs.return_home_policy)}</p>
      <p>${generatedFields.attendance_return_text?.text ?? "-"}</p>
      <p>${generatedFields.safety_plan_text?.text ?? "-"}</p>
    </section>
    <section id="sec5">
      <h2>예산 및 평가</h2>
      <p>예산 총액: ${safeText(inputs.budget_total)}</p>
      ${includeAppendixTables && budgetRows.length ? `<h3>예산 편성</h3><table><thead><tr><th>항목</th><th>금액</th><th>근거</th></tr></thead><tbody>${budgetRows.join("")}</tbody></table>` : ""}
      <p>${generatedFields.budget_policy_text?.text ?? "-"}</p>
      <p>평가 주기: ${safeText(inputs.evaluation_cycle)}</p>
      <p>만족도 조사: ${safeText(inputs.satisfaction_survey)}</p>
      <p>${generatedFields.evaluation_feedback_text?.text ?? "-"}</p>
    </section>
  `;

  return { html, toc };
};

export const renderAftercareReportHtml = (
  inputs: AftercareReportInputs,
  generatedFields: Record<string, GeneratedField>,
  includeAppendixTables: boolean
) => {
  const toc = [
    { id: "sec1", title: "운영 개요" },
    { id: "sec2", title: "인력 및 민원" },
    { id: "sec3", title: "예산 집행" },
    { id: "sec4", title: "평가 및 개선" },
  ];

  const programSummaryRows =
    inputs.program_summary?.map(
      (row) =>
        `<tr><td>${row.area}</td><td>${row.count}</td><td>${row.note ?? "-"}</td></tr>`
    ) || [];

  const incidentsRows =
    inputs.incidents?.map(
      (row) =>
        `<tr><td>${row.when_text}</td><td>${row.content}</td><td>${row.action}</td><td>${row.prevention}</td></tr>`
    ) || [];

  const majorExpenseRows =
    inputs.major_expenses?.map(
      (row) =>
        `<tr><td>${row.category}</td><td>${row.amount}</td><td>${row.note ?? "-"}</td></tr>`
    ) || [];

  const html = `
    <section id="sec1">
      <h2>운영 개요</h2>
      <p>학교명: ${safeText(inputs.school_name)}</p>
      <p>운영 기간: ${safeText(inputs.period_label)}</p>
      <p>운영 유형: ${safeText(inputs.operation_types)}</p>
      <p>운영일수: ${safeText(inputs.operation_days)}</p>
      <p>평균 참여 인원: ${safeText(inputs.avg_participants)}</p>
      <p>${generatedFields.operations_overview_text?.text ?? "-"}</p>
      ${includeAppendixTables && programSummaryRows.length ? `<h3>프로그램 운영 요약</h3><table><thead><tr><th>영역</th><th>횟수</th><th>비고</th></tr></thead><tbody>${programSummaryRows.join("")}</tbody></table>` : ""}
    </section>
    <section id="sec2">
      <h2>인력 및 민원</h2>
      <p>${generatedFields.staffing_result_text?.text ?? "-"}</p>
      <p>${generatedFields.safety_complaint_result_text?.text ?? "-"}</p>
      ${includeAppendixTables && incidentsRows.length ? `<h3>사고 현황</h3><table><thead><tr><th>일시</th><th>내용</th><th>조치</th><th>예방</th></tr></thead><tbody>${incidentsRows.join("")}</tbody></table>` : ""}
    </section>
    <section id="sec3">
      <h2>예산 집행</h2>
      <p>예산 배정: ${safeText(inputs.budget?.allocated)}</p>
      <p>집행액: ${safeText(inputs.budget?.spent)}</p>
      <p>잔액: ${safeText(inputs.budget?.remaining)}</p>
      ${includeAppendixTables && majorExpenseRows.length ? `<h3>주요 집행 내역</h3><table><thead><tr><th>항목</th><th>금액</th><th>비고</th></tr></thead><tbody>${majorExpenseRows.join("")}</tbody></table>` : ""}
      <p>${generatedFields.budget_execution_text?.text ?? "-"}</p>
    </section>
    <section id="sec4">
      <h2>평가 및 개선</h2>
      <p>${generatedFields.evaluation_improvement_text?.text ?? "-"}</p>
      ${inputs.strengths?.length ? `<p>강점: ${inputs.strengths.join(", ")}</p>` : ""}
      ${inputs.improvements?.length ? `<p>개선점: ${inputs.improvements.join(", ")}</p>` : ""}
    </section>
  `;

  return { html, toc };
};

const buildPlanPrompt = (
  fieldKey: string,
  inputs: AftercarePlanInputs,
  options?: GenerateFieldOptions
) => {
  return `당신은 한국 초등돌봄교실 운영계획서 작성 전문가입니다.
다음 입력값만을 사용해 '${fieldKey}' 서술형 항목을 작성하세요.
입력값에 없는 수치/날짜/금액/인원은 절대 생성하지 마세요.

[입력값]
${JSON.stringify(inputs, null, 2)}

[작성 지침]
- 공식 문서 어투 사용
- 입력값 기반으로만 서술
- 길이: ${options?.length ?? "medium"}
- 사용자 힌트: ${options?.user_hint ?? "(없음)"}

텍스트만 출력하세요:`;
};

const buildReportPrompt = (
  fieldKey: string,
  inputs: AftercareReportInputs,
  options?: GenerateFieldOptions
) => {
  return `당신은 한국 초등돌봄교실 운영결과보고 작성 전문가입니다.
다음 입력값만을 사용해 '${fieldKey}' 서술형 항목을 작성하세요.
입력값에 없는 수치/날짜/금액/인원은 절대 생성하지 마세요.

[입력값]
${JSON.stringify(inputs, null, 2)}

[작성 지침]
- 공식 문서 어투 사용
- 입력값 기반으로만 서술
- 길이: ${options?.length ?? "medium"}
- 사용자 힌트: ${options?.user_hint ?? "(없음)"}

텍스트만 출력하세요:`;
};

const fallbackText = (toolId: ToolId, fieldKey: string) => {
  if (toolId === "aftercare_plan") {
    return `${fieldKey} 항목을 입력값을 기반으로 정리했습니다.`;
  }
  return `${fieldKey} 항목을 운영 결과에 맞게 요약했습니다.`;
};

export const generateAftercareFieldText = async (
  anthropic: Anthropic,
  toolId: ToolId,
  fieldKey: string,
  inputs: AftercarePlanInputs | AftercareReportInputs,
  options?: GenerateFieldOptions
) => {
  const prompt =
    toolId === "aftercare_plan"
      ? buildPlanPrompt(fieldKey, inputs as AftercarePlanInputs, options)
      : buildReportPrompt(fieldKey, inputs as AftercareReportInputs, options);

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });
    const content = message.content[0];
    const text = content.type === "text" ? content.text.trim() : "";
    return text || fallbackText(toolId, fieldKey);
  } catch {
    return fallbackText(toolId, fieldKey);
  }
};

export const mergeDeep = (target: Record<string, unknown>, source: Record<string, unknown>) => {
  const output = { ...target };
  Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value) && typeof output[key] === "object") {
      output[key] = mergeDeep(output[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      output[key] = value;
    }
  });
  return output;
};
