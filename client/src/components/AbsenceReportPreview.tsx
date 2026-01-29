/**
 * PDF 미리보기 컴포넌트 - 결석신고서용
 *
 * 모든 스타일이 인라인으로 되어있어 PDF 변환 시 레이아웃이 깨지지 않습니다.
 */

import React from 'react';

export type AbsenceType = 'illness' | 'attendance' | 'other' | 'unapproved';

interface AbsenceReportPreviewProps {
  schoolName?: string;
  grade?: string;
  classNum?: string;
  number?: string;
  studentName?: string;
  absenceType?: AbsenceType;
  startDate?: string;
  endDate?: string;
  reason?: string;
  evidenceList?: string[];
  parentName?: string;
  parentPhone?: string;
  submissionDate?: string;
}

const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  illness: '질병결석',
  attendance: '출석인정',
  other: '기타결석',
  unapproved: '미인정결석',
};

const AbsenceReportPreview = React.forwardRef<HTMLDivElement, AbsenceReportPreviewProps>(
  (
    {
      schoolName = '학교명',
      grade = '',
      classNum = '',
      number = '',
      studentName = '',
      absenceType = 'illness',
      startDate = '',
      endDate = '',
      reason = '',
      evidenceList = [],
      parentName = '',
      parentPhone = '',
      submissionDate = '',
    },
    ref
  ) => {
    // 기간 계산
    const calculateDays = () => {
      if (!startDate || !endDate) return 0;
      const start = new Date(startDate);
      const end = new Date(endDate);
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    };

    const days = calculateDays();

    // 날짜 포맷
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    };

    const periodText = startDate && endDate
      ? `${formatDate(startDate)} ~ ${formatDate(endDate)} (${days}일간)`
      : '';

    return (
      <div
        ref={ref}
        style={{
          width: '794px',
          padding: '60px',
          backgroundColor: 'white',
          fontFamily: "'Malgun Gothic', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
          fontSize: '14px',
          lineHeight: '1.8',
          color: '#000',
          boxSizing: 'border-box',
          margin: '0 auto',
        }}
      >
        {/* 문서 제목 */}
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            textAlign: 'center',
            margin: '0 0 40px 0',
            letterSpacing: '15px',
            paddingLeft: '15px',
          }}
        >
          결 석 신 고 서
        </h1>

        {/* 학생 정보 테이블 */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '25px',
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '12px 15px',
                  backgroundColor: '#f5f5f5',
                  fontWeight: 600,
                  textAlign: 'center',
                  width: '80px',
                }}
              >
                학 년
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '12px 15px',
                  textAlign: 'center',
                  width: '80px',
                }}
              >
                {grade ? `${grade}학년` : ''}
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '12px 15px',
                  backgroundColor: '#f5f5f5',
                  fontWeight: 600,
                  textAlign: 'center',
                  width: '60px',
                }}
              >
                반
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '12px 15px',
                  textAlign: 'center',
                  width: '80px',
                }}
              >
                {classNum ? `${classNum}반` : ''}
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '12px 15px',
                  backgroundColor: '#f5f5f5',
                  fontWeight: 600,
                  textAlign: 'center',
                  width: '60px',
                }}
              >
                번호
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '12px 15px',
                  textAlign: 'center',
                  width: '80px',
                }}
              >
                {number ? `${number}번` : ''}
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '12px 15px',
                  backgroundColor: '#f5f5f5',
                  fontWeight: 600,
                  textAlign: 'center',
                  width: '60px',
                }}
              >
                성명
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '12px 15px',
                  textAlign: 'center',
                }}
              >
                {studentName}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 결석 종류 */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '25px',
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '15px',
                  backgroundColor: '#f5f5f5',
                  fontWeight: 600,
                  textAlign: 'center',
                  width: '120px',
                }}
              >
                결석 종류
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '15px 25px',
                }}
              >
                <div style={{ display: 'flex', gap: '40px' }}>
                  {(['illness', 'attendance', 'other', 'unapproved'] as AbsenceType[]).map((type) => (
                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '16px',
                          height: '16px',
                          border: '1px solid #000',
                          backgroundColor: absenceType === type ? '#000' : '#fff',
                        }}
                      />
                      <span>{ABSENCE_TYPE_LABELS[type]}</span>
                    </label>
                  ))}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 결석 기간 */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '25px',
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '15px',
                  backgroundColor: '#f5f5f5',
                  fontWeight: 600,
                  textAlign: 'center',
                  width: '120px',
                }}
              >
                결석 기간
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '15px 25px',
                }}
              >
                {periodText}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 결석 사유 */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '25px',
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '15px',
                  backgroundColor: '#f5f5f5',
                  fontWeight: 600,
                  textAlign: 'center',
                  width: '120px',
                  verticalAlign: 'top',
                }}
              >
                결석 사유
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '15px 25px',
                  minHeight: '120px',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.8',
                }}
              >
                {reason || ''}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 증빙서류 */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '40px',
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '15px',
                  backgroundColor: '#f5f5f5',
                  fontWeight: 600,
                  textAlign: 'center',
                  width: '120px',
                }}
              >
                증빙서류
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '15px 25px',
                }}
              >
                {evidenceList.length > 0 ? evidenceList.join(', ') : '없음'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 안내 문구 */}
        <p
          style={{
            textAlign: 'center',
            margin: '30px 0',
            fontSize: '15px',
          }}
        >
          위와 같이 결석하였음을 신고합니다.
        </p>

        {/* 날짜 */}
        <p
          style={{
            textAlign: 'center',
            margin: '30px 0',
            fontSize: '16px',
          }}
        >
          {submissionDate ? formatDate(submissionDate) : ''}
        </p>

        {/* 보호자 서명란 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '30px',
            marginBottom: '50px',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '15px' }}>
              보호자: {parentName}{' '}
              <span style={{ marginLeft: '30px' }}>(인)</span>
            </p>
            {parentPhone && (
              <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                연락처: {parentPhone}
              </p>
            )}
          </div>
        </div>

        {/* 학교장 귀하 */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '18px',
            fontWeight: 600,
            marginTop: '40px',
            letterSpacing: '10px',
            paddingLeft: '10px',
          }}
        >
          {schoolName}장 귀하
        </p>
      </div>
    );
  }
);

AbsenceReportPreview.displayName = 'AbsenceReportPreview';

export default AbsenceReportPreview;
