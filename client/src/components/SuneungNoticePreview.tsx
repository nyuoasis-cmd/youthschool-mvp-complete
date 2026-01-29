/**
 * PDF 미리보기 컴포넌트 - 수능/모의평가 안내문용
 */

import React from 'react';

interface ScheduleRow {
  id: string;
  period: string;
  subject: string;
  time: string;
  questions: string;
  note: string;
}

interface SupplyItem {
  id: string;
  content: string;
}

interface NoticeItem {
  id: string;
  content: string;
}

interface SuneungNoticePreviewProps {
  schoolName?: string;
  academicYear?: string;
  examType?: string;
  examDate?: string;
  greeting?: string;
  schedules?: ScheduleRow[];
  supplies?: SupplyItem[];
  cautions?: string;
  entryTimeFirst?: string;
  entryTimeOthers?: string;
  additionalNotes?: NoticeItem[];
  issueDate?: string;
  signatureText?: string;
}

function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const weekday = weekdays[date.getDay()];
  return `${year}년 ${month}월 ${day}일(${weekday})`;
}

const SuneungNoticePreview = React.forwardRef<HTMLDivElement, SuneungNoticePreviewProps>(
  (
    {
      schoolName = '학교명',
      academicYear = '2026학년도',
      examType = '9월 모의평가',
      examDate = '',
      greeting = '',
      schedules = [],
      supplies = [],
      cautions = '',
      entryTimeFirst = '08:10까지',
      entryTimeOthers = '시험 시작 10분 전까지',
      additionalNotes = [],
      issueDate = '',
      signatureText = '',
    },
    ref
  ) => {
    const title = `${academicYear} ${examType} 안내`;

    return (
      <div
        ref={ref}
        style={{
          width: '794px',
          padding: '60px 60px',
          backgroundColor: 'white',
          fontFamily: "'Malgun Gothic', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
          fontSize: '14px',
          lineHeight: '1.8',
          color: '#000',
          boxSizing: 'border-box',
          margin: '0 auto',
        }}
      >
        {/* 헤더 영역 */}
        <div
          style={{
            display: 'table',
            width: '100%',
            marginBottom: '15px',
          }}
        >
          <div style={{ display: 'table-row' }}>
            {/* 학교명 (세로 배치) */}
            <div
              style={{
                display: 'table-cell',
                verticalAlign: 'middle',
                width: '50px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  writingMode: 'vertical-rl',
                  textOrientation: 'upright',
                  fontSize: '22px',
                  fontWeight: 700,
                  letterSpacing: '8px',
                  lineHeight: '1',
                  whiteSpace: 'nowrap',
                }}
              >
                {schoolName}
              </div>
            </div>

            {/* 가정통신문 */}
            <div
              style={{
                display: 'table-cell',
                verticalAlign: 'middle',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '42px',
                  fontWeight: 700,
                  letterSpacing: '30px',
                  paddingLeft: '30px',
                  whiteSpace: 'nowrap',
                }}
              >
                가정통신문
              </div>
            </div>

            {/* 정보 테이블 */}
            <div
              style={{
                display: 'table-cell',
                verticalAlign: 'middle',
                width: '160px',
              }}
            >
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <tbody>
                  <tr>
                    <td
                      style={{
                        border: '1px solid #000',
                        padding: '6px 15px',
                        backgroundColor: '#f9f9f9',
                        fontSize: '13px',
                        fontWeight: 500,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      담당부서
                    </td>
                    <td
                      style={{
                        border: '1px solid #000',
                        padding: '6px 15px',
                        fontSize: '13px',
                        textAlign: 'center',
                      }}
                    >
                      교무실
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        border: '1px solid #000',
                        padding: '6px 15px',
                        backgroundColor: '#f9f9f9',
                        fontSize: '13px',
                        fontWeight: 500,
                        textAlign: 'center',
                      }}
                    >
                      연락처
                    </td>
                    <td
                      style={{
                        border: '1px solid #000',
                        padding: '6px 15px',
                        fontSize: '13px',
                        textAlign: 'center',
                      }}
                    >
                      -
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ borderTop: '3px solid #000', marginBottom: '25px' }} />

        {/* 제목 */}
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '25px',
            letterSpacing: '2px',
          }}
        >
          {title}
        </h2>

        {/* 인사말 */}
        {greeting && (
          <div style={{ marginBottom: '25px', textAlign: 'justify' }}>
            <p style={{ textIndent: '1em', margin: 0, whiteSpace: 'pre-line' }}>{greeting}</p>
          </div>
        )}

        {/* 시험일 */}
        {examDate && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px' }}>
              1. 시험 일시
            </h3>
            <p style={{ marginLeft: '20px' }}>{formatDate(examDate)}</p>
          </div>
        )}

        {/* 시험 시간표 */}
        {schedules.length > 0 && (
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px' }}>
              2. 시험 시간표
            </h3>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ border: '1px solid #000', padding: '10px', fontWeight: 600 }}>교시</th>
                  <th style={{ border: '1px solid #000', padding: '10px', fontWeight: 600 }}>시험 영역</th>
                  <th style={{ border: '1px solid #000', padding: '10px', fontWeight: 600 }}>시험 시간</th>
                  <th style={{ border: '1px solid #000', padding: '10px', fontWeight: 600 }}>문항 수</th>
                  <th style={{ border: '1px solid #000', padding: '10px', fontWeight: 600 }}>비고</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((row) => (
                  <tr key={row.id}>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{row.period}</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{row.subject}</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{row.time}</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{row.questions}</td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 입실 시간 */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px' }}>
            3. 입실 시간
          </h3>
          <ul style={{ marginLeft: '20px', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '5px' }}>1교시: <strong>{entryTimeFirst}</strong></li>
            <li>2~5교시: <strong>{entryTimeOthers}</strong></li>
          </ul>
        </div>

        {/* 준비물 안내 */}
        {supplies.length > 0 && (
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px' }}>
              4. 준비물
            </h3>
            <ul style={{ marginLeft: '20px', paddingLeft: '20px' }}>
              {supplies.filter(s => s.content).map((item) => (
                <li key={item.id} style={{ marginBottom: '5px' }}>{item.content}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 유의사항 */}
        {cautions && (
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px', color: '#c00' }}>
              5. 유의사항 (중요)
            </h3>
            <div
              style={{
                backgroundColor: '#fff8f8',
                border: '1px solid #fcc',
                borderRadius: '4px',
                padding: '15px',
                whiteSpace: 'pre-line',
              }}
            >
              {cautions}
            </div>
          </div>
        )}

        {/* 추가 안내 */}
        {additionalNotes.filter(n => n.content).length > 0 && (
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px' }}>
              6. 기타 안내사항
            </h3>
            <ul style={{ marginLeft: '20px', paddingLeft: '20px' }}>
              {additionalNotes.filter(n => n.content).map((item) => (
                <li key={item.id} style={{ marginBottom: '8px', whiteSpace: 'pre-line' }}>{item.content}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 발행 정보 */}
        <div style={{ marginTop: '50px', textAlign: 'center' }}>
          {issueDate && (
            <p style={{ marginBottom: '30px', fontSize: '15px' }}>{formatDate(issueDate)}</p>
          )}
          <p style={{ fontSize: '20px', fontWeight: 700 }}>{signatureText || `${schoolName}장`}</p>
        </div>

        {/* 하단 절취선 및 회신란 */}
        <div style={{ marginTop: '50px' }}>
          <div
            style={{
              borderTop: '2px dashed #999',
              position: 'relative',
              marginBottom: '20px',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#fff',
                padding: '0 10px',
                fontSize: '12px',
                color: '#666',
              }}
            >
              - - - - - - - - - - 절 취 선 - - - - - - - - - -
            </span>
          </div>

          <div style={{ border: '1px solid #000', padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '15px', textAlign: 'center' }}>
              {title} 수신 확인서
            </h4>
            <p style={{ fontSize: '13px', marginBottom: '20px', textAlign: 'center' }}>
              위 안내문을 받았음을 확인합니다.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '13px' }}>학년: _______ 반: _______ 번호: _______ 이름: _______</span>
              </div>
              <div>
                <span style={{ fontSize: '13px' }}>학부모 서명: _________________</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

SuneungNoticePreview.displayName = 'SuneungNoticePreview';

export default SuneungNoticePreview;
