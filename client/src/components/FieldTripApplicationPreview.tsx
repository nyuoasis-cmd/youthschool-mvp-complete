import React from "react";
import { formatDateRange } from "@/utils/dateFormat";

type StudentInfo = {
  grade: string;
  className: string;
  number: string;
  name: string;
};

type PlanActivity = {
  id: string;
  time: string;
  place: string;
  content: string;
};

type PlanDay = {
  id: string;
  date: string;
  activities: PlanActivity[];
};

type GuardianInfo = {
  name: string;
  relation: string;
  contact: string;
};

type Companion = {
  id: string;
  name: string;
  relation: string;
  contact: string;
};

interface FieldTripApplicationPreviewProps {
  schoolName?: string;
  studentInfo: StudentInfo;
  period: { start: string; end: string };
  tripType: string;
  destination: string;
  detailPlace: string;
  purpose: string;
  planDays: PlanDay[];
  guardian: GuardianInfo;
  companions: Companion[];
  applicationDate: string;
  agreementChecked: boolean;
}

const FieldTripApplicationPreview = React.forwardRef<HTMLDivElement, FieldTripApplicationPreviewProps>(
  (
    {
      schoolName = "학교명",
      studentInfo,
      period,
      tripType,
      destination,
      detailPlace,
      purpose,
      planDays,
      guardian,
      companions,
      applicationDate,
      agreementChecked,
    },
    ref
  ) => {
    const periodText = formatDateRange(period.start, period.end);

    return (
      <div
        ref={ref}
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "20mm",
          backgroundColor: "white",
          fontFamily: "'Malgun Gothic', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
          fontSize: "11pt",
          lineHeight: "1.6",
          color: "#000",
          boxSizing: "border-box",
        }}
      >
        <h2
          style={{
            fontSize: "18pt",
            fontWeight: 700,
            textAlign: "center",
            margin: "0 0 24px 0",
            textDecoration: "underline",
            textUnderlineOffset: "4px",
          }}
        >
          교외체험학습 신청서
        </h2>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "18px" }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #000", padding: "8px", backgroundColor: "#f5f5f5", width: "20%" }}>
                학년
              </td>
              <td style={{ border: "1px solid #000", padding: "8px", width: "30%" }}>{studentInfo.grade}</td>
              <td style={{ border: "1px solid #000", padding: "8px", backgroundColor: "#f5f5f5", width: "20%" }}>
                반
              </td>
              <td style={{ border: "1px solid #000", padding: "8px", width: "30%" }}>{studentInfo.className}</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #000", padding: "8px", backgroundColor: "#f5f5f5" }}>번호</td>
              <td style={{ border: "1px solid #000", padding: "8px" }}>{studentInfo.number}</td>
              <td style={{ border: "1px solid #000", padding: "8px", backgroundColor: "#f5f5f5" }}>성명</td>
              <td style={{ border: "1px solid #000", padding: "8px" }}>{studentInfo.name}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginBottom: "18px" }}>
          <p style={{ margin: "0 0 6px 0", fontWeight: 600 }}>체험학습 기간</p>
          <p style={{ margin: 0 }}>{periodText}</p>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <p style={{ margin: "0 0 6px 0", fontWeight: 600 }}>체험학습 유형</p>
          <p style={{ margin: 0 }}>{tripType}</p>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <p style={{ margin: "0 0 6px 0", fontWeight: 600 }}>목적지 및 체험 목적</p>
          <p style={{ margin: "0 0 4px 0" }}>목적지: {destination}</p>
          <p style={{ margin: "0 0 8px 0" }}>상세 장소: {detailPlace}</p>
          <p style={{ margin: 0, whiteSpace: "pre-line" }}>{purpose}</p>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <p style={{ margin: "0 0 6px 0", fontWeight: 600 }}>체험학습 계획</p>
          {planDays.length === 0 ? (
            <p style={{ margin: 0, color: "#666" }}>체험학습 계획을 입력해주세요.</p>
          ) : (
            planDays.map((day, dayIndex) => (
              <div key={day.id} style={{ marginBottom: "12px" }}>
                <p style={{ margin: "0 0 6px 0", fontWeight: 600 }}>
                  {dayIndex + 1}일차: {day.date}
                </p>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid #000", padding: "6px", backgroundColor: "#f5f5f5", width: "15%" }}>
                        시간
                      </th>
                      <th style={{ border: "1px solid #000", padding: "6px", backgroundColor: "#f5f5f5", width: "30%" }}>
                        장소
                      </th>
                      <th style={{ border: "1px solid #000", padding: "6px", backgroundColor: "#f5f5f5" }}>
                        활동 내용
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.activities.map((activity) => (
                      <tr key={activity.id}>
                        <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>
                          {activity.time}
                        </td>
                        <td style={{ border: "1px solid #000", padding: "6px" }}>{activity.place}</td>
                        <td style={{ border: "1px solid #000", padding: "6px", whiteSpace: "pre-line" }}>
                          {activity.content}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>

        <div style={{ marginBottom: "18px" }}>
          <p style={{ margin: "0 0 6px 0", fontWeight: 600 }}>보호자 및 인솔자 정보</p>
          <p style={{ margin: "0 0 4px 0" }}>성명: {guardian.name}</p>
          <p style={{ margin: "0 0 4px 0" }}>관계: {guardian.relation}</p>
          <p style={{ margin: 0 }}>연락처: {guardian.contact}</p>
        </div>

        <div style={{ marginBottom: "18px" }}>
          <p style={{ margin: "0 0 6px 0", fontWeight: 600 }}>동반 가족</p>
          {companions.length === 0 ? (
            <p style={{ margin: 0, color: "#666" }}>동반 가족 정보를 입력해주세요.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #000", padding: "6px", backgroundColor: "#f5f5f5", width: "10%" }}>
                    No.
                  </th>
                  <th style={{ border: "1px solid #000", padding: "6px", backgroundColor: "#f5f5f5", width: "25%" }}>
                    성명
                  </th>
                  <th style={{ border: "1px solid #000", padding: "6px", backgroundColor: "#f5f5f5", width: "20%" }}>
                    관계
                  </th>
                  <th style={{ border: "1px solid #000", padding: "6px", backgroundColor: "#f5f5f5" }}>
                    연락처
                  </th>
                </tr>
              </thead>
              <tbody>
                {companions.map((companion, index) => (
                  <tr key={companion.id}>
                    <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>{index + 1}</td>
                    <td style={{ border: "1px solid #000", padding: "6px" }}>{companion.name}</td>
                    <td style={{ border: "1px solid #000", padding: "6px" }}>{companion.relation}</td>
                    <td style={{ border: "1px solid #000", padding: "6px" }}>{companion.contact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ marginBottom: "18px" }}>
          <p style={{ margin: "0 0 6px 0", fontWeight: 600 }}>확인 및 동의사항</p>
          <p style={{ margin: 0 }}>{agreementChecked ? "동의함" : "미동의"}</p>
        </div>

        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: "12pt" }}>{applicationDate}</p>
          <p style={{ margin: 0, fontSize: "14pt", fontWeight: 600, letterSpacing: "8px", paddingLeft: "8px" }}>
            {schoolName}
          </p>
        </div>
      </div>
    );
  }
);

FieldTripApplicationPreview.displayName = "FieldTripApplicationPreview";

export default FieldTripApplicationPreview;
