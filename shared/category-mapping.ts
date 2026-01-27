export type TeacherMateDocumentType =
  | "가정통신문"
  | "급식안내문"
  | "학부모총회 안내"
  | "예산/결산 공개 자료"
  | "외부 교육 용역 계획서"
  | "방과후학교 운영계획서"
  | "초등돌봄교실 운영계획서"
  | "현장체험학습 운영계획서"
  | "학교 안전교육 계획서"
  | "학교폭력 예방 교육 계획서"
  | "교내 행사 운영계획서"
  | "HWP 양식으로 작성";

export const DOCUMENT_TYPE_TO_RAG_CATEGORY_IDS: Record<
  TeacherMateDocumentType,
  string[]
> = {
  "가정통신문": [
    "home-letter",
    "event-notice",
    "health-safety",
    "vacation",
    "meal-notice",
    "survey-notice",
  ],
  "급식안내문": ["meal-notice", "home-letter", "health-safety"],
  "학부모총회 안내": ["parents-meeting"],
  "예산/결산 공개 자료": ["budget-request", "fee-notice"],
  "외부 교육 용역 계획서": [
    "lecturer-plan",
    "lecturer-contract",
    "lecture-plan",
    "lecturer-payment",
    "lecture-notice",
  ],
  "방과후학교 운영계획서": ["curriculum", "work-plan"],
  "초등돌봄교실 운영계획서": ["work-plan", "home-letter"],
  "현장체험학습 운영계획서": ["field-trip"],
  "학교 안전교육 계획서": ["safety-prevention", "health-safety"],
  "학교폭력 예방 교육 계획서": ["violence-prevent"],
  "교내 행사 운영계획서": ["event-notice", "work-plan"],
  "HWP 양식으로 작성": [],
};

export const getRagCategoryIdsForDocumentType = (documentType: string) =>
  DOCUMENT_TYPE_TO_RAG_CATEGORY_IDS[
    documentType as TeacherMateDocumentType
  ] ?? [];
