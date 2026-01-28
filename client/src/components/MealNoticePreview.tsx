/**
 * PDF 미리보기 컴포넌트 - 급식안내문용
 *
 * 모든 스타일이 인라인으로 되어있어 PDF 변환 시 레이아웃이 깨지지 않습니다.
 */

import React from 'react';

interface PaymentRow {
  id: string;
  grade: string;
  category: string;
  calculation: string;
  amount: string;
  note: string;
}

interface NoticeItem {
  id: string;
  content: string;
}

interface MealNoticePreviewProps {
  schoolName?: string;
  year?: string;
  month?: string;
  greeting?: string;
  mealPeriod?: string;
  paymentPeriod?: string;
  paymentMethod?: string;
  paymentDetails?: PaymentRow[];
  notices?: NoticeItem[];
  issueDate?: string;
  signatureText?: string;
}

const MealNoticePreview = React.forwardRef<HTMLDivElement, MealNoticePreviewProps>(
  (
    {
      schoolName = '학교명',
      year = '2025학년도',
      month = '4월',
      greeting = '',
      mealPeriod = '',
      paymentPeriod = '',
      paymentMethod = '',
      paymentDetails = [],
      notices = [],
      issueDate = '',
      signatureText = '',
    },
    ref
  ) => {
    const title = `${year} ${month} 학교급식 안내`;

    return (
      <div
        ref={ref}
        style={{
          width: '794px',
          padding: '75px 60px',
          backgroundColor: 'white',
          fontFamily: "'Malgun Gothic', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
          fontSize: '14px',
          lineHeight: '1.8',
          color: '#000',
          boxSizing: 'border-box',
          margin: '0 auto',
        }}
      >
        {/* ========================================
            헤더 영역: 학교명(세로) | 가정통신문 | 정보테이블
            ======================================== */}
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

            {/* 가정통신문 (가로 - 핵심!) */}
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
                      제공부서
                    </td>
                    <td
                      style={{
                        border: '1px solid #000',
                        padding: '6px 15px',
                        fontSize: '13px',
                        textAlign: 'center',
                        minWidth: '100px',
                        whiteSpace: 'nowrap',
                      }}
                    />
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
                        whiteSpace: 'nowrap',
                      }}
                    >
                      담당자
                    </td>
                    <td
                      style={{
                        border: '1px solid #000',
                        padding: '6px 15px',
                        fontSize: '13px',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    />
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
                        whiteSpace: 'nowrap',
                      }}
                    >
                      전화번호
                    </td>
                    <td
                      style={{
                        border: '1px solid #000',
                        padding: '6px 15px',
                        fontSize: '13px',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <div
          style={{
            borderTop: '2px solid #000',
            margin: '15px 0 30px 0',
            width: '100%',
          }}
        />

        {/* 문서 제목 */}
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 700,
            textAlign: 'center',
            margin: '0 0 30px 0',
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
          }}
        >
          {title}
        </h2>

        {/* 인사말 */}
        {greeting && (
          <p
            style={{
              margin: '0 0 25px 0',
              textIndent: '1em',
              textAlign: 'justify',
              wordBreak: 'keep-all',
              lineHeight: '2',
              width: '100%',
              maxWidth: '100%',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-line',
            }}
          >
            {greeting}
          </p>
        )}

        {/* 본문 내용 */}
        <div style={{ width: '100%', maxWidth: '100%', wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
          {/* 1. 급식 기간 */}
          <div style={{ marginBottom: '15px' }}>
            <p
              style={{
                margin: '0',
                fontWeight: 600,
                width: '100%',
                maxWidth: '100%',
                overflowWrap: 'break-word',
              }}
            >
              <span style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                1. 급식 기간
              </span>
              {' : '}
              <span style={{ fontWeight: 400 }}>{mealPeriod}</span>
            </p>
          </div>

          {/* 2. 급식비 납부기간 */}
          <div style={{ marginBottom: '15px' }}>
            <p
              style={{
                margin: '0',
                fontWeight: 600,
                width: '100%',
                maxWidth: '100%',
                overflowWrap: 'break-word',
              }}
            >
              <span style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                2. 급식비 납부기간
              </span>
              {' : '}
              <span style={{ fontWeight: 400 }}>{paymentPeriod}</span>
            </p>
          </div>

          {/* 3. 납부내역 */}
          <div style={{ marginBottom: '20px' }}>
            <p
              style={{
                margin: '0 0 10px 0',
                fontWeight: 600,
                width: '100%',
                maxWidth: '100%',
                overflowWrap: 'break-word',
              }}
            >
              <span style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                3. 납부내역
              </span>
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th
                    style={{
                      border: '1px solid #000',
                      padding: '10px 8px',
                      backgroundColor: '#f5f5f5',
                      fontWeight: 600,
                      fontSize: '13px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    학 년
                  </th>
                  <th
                    style={{
                      border: '1px solid #000',
                      padding: '10px 8px',
                      backgroundColor: '#f5f5f5',
                      fontWeight: 600,
                      fontSize: '13px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    구 분
                  </th>
                  <th
                    style={{
                      border: '1px solid #000',
                      padding: '10px 8px',
                      backgroundColor: '#f5f5f5',
                      fontWeight: 600,
                      fontSize: '13px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    산 출 내 역
                  </th>
                  <th
                    style={{
                      border: '1px solid #000',
                      padding: '10px 8px',
                      backgroundColor: '#f5f5f5',
                      fontWeight: 600,
                      fontSize: '13px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    납부금액
                  </th>
                  <th
                    style={{
                      border: '1px solid #000',
                      padding: '10px 8px',
                      backgroundColor: '#f5f5f5',
                      fontWeight: 600,
                      fontSize: '13px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    비 고
                  </th>
                </tr>
              </thead>
              <tbody>
                {paymentDetails.length > 0 ? (
                  paymentDetails.map((row) => (
                    <tr key={row.id}>
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: '10px 8px',
                          textAlign: 'center',
                          fontSize: '13px',
                        }}
                      >
                        {row.grade}
                      </td>
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: '10px 8px',
                          textAlign: 'center',
                          fontSize: '13px',
                        }}
                      >
                        {row.category}
                      </td>
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: '10px 8px',
                          textAlign: 'center',
                          fontSize: '13px',
                          lineHeight: '1.4',
                        }}
                      >
                        {row.calculation}
                      </td>
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: '10px 8px',
                          textAlign: 'center',
                          fontSize: '13px',
                        }}
                      >
                        {row.amount}
                      </td>
                      <td
                        style={{
                          border: '1px solid #000',
                          padding: '10px 8px',
                          textAlign: 'center',
                          fontSize: '13px',
                        }}
                      >
                        {row.note || ''}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        border: '1px solid #000',
                        padding: '20px',
                        textAlign: 'center',
                        color: '#888',
                      }}
                    >
                      납부내역을 입력해주세요
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 4. 납부방법 */}
          {paymentMethod && (
            <div style={{ marginBottom: '20px' }}>
              <p
                style={{
                  margin: '0',
                  fontWeight: 600,
                  width: '100%',
                  maxWidth: '100%',
                  overflowWrap: 'break-word',
                }}
              >
                <span style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  4. 납부방법
                </span>
                {' : '}
                <span style={{ fontWeight: 400 }}>{paymentMethod}</span>
              </p>
            </div>
          )}

          {/* 안내사항 */}
          {notices.length > 0 && (
            <div style={{ marginTop: '25px' }}>
              {notices.map((notice) => (
                <p
                  key={notice.id}
                  style={{
                    margin: '0 0 10px 0',
                    fontSize: '13px',
                    lineHeight: '1.8',
                    wordBreak: 'keep-all',
                  }}
                >
                  ※ {notice.content}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* 하단 서명 영역 */}
        <div
          style={{
            marginTop: '50px',
            textAlign: 'center',
          }}
        >
          {issueDate && (
            <p
              style={{
                margin: '0 0 10px 0',
                fontSize: '16px',
              }}
            >
              {issueDate}
            </p>
          )}
          <p
            style={{
              margin: '0',
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '20px',
              paddingLeft: '20px',
            }}
          >
            {signatureText || `${schoolName}장`}
          </p>
        </div>
      </div>
    );
  }
);

MealNoticePreview.displayName = 'MealNoticePreview';

export default MealNoticePreview;
