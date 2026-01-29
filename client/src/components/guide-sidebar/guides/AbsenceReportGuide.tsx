import { GuideSection } from "../GuideSection";
import { GuideCard, Highlight, BlueText } from "../GuideCard";

export function AbsenceReportGuide() {
  return (
    <>
      {/* 학생 정보 */}
      <GuideSection icon="👤" title="학생 정보">
        <GuideCard
          title="학년·반·번호·성명"
          tag={{ text: "필수", type: "important" }}
        >
          <p>
            결석하는 학생의 <Highlight>정확한 학적 정보</Highlight>를 입력해주세요.
          </p>
          <ul className="mt-2 pl-5 list-disc">
            <li className="text-[13px] text-[#555] mb-1">
              <strong>학년:</strong> 1~6 (초등), 1~3 (중·고)
            </li>
            <li className="text-[13px] text-[#555] mb-1">
              <strong>반:</strong> 해당 학급 번호
            </li>
            <li className="text-[13px] text-[#555] mb-1">
              <strong>번호:</strong> 출석부 번호
            </li>
            <li className="text-[13px] text-[#555] mb-1">
              <strong>성명:</strong> 학생 본명
            </li>
          </ul>
        </GuideCard>
      </GuideSection>

      {/* 결석 종류 */}
      <GuideSection icon="📌" title="결석 종류">
        <GuideCard
          title="질병결석"
          tag={{ text: "🤒", type: "default" }}
        >
          <p>
            <Highlight>질병으로 인한 결석</Highlight>입니다.
            의사 진단서, 진료확인서, 처방전 등 증빙서류가 필요합니다.
          </p>
        </GuideCard>
        <GuideCard
          title="출석인정"
          tag={{ text: "✅", type: "tip" }}
        >
          <p>
            <Highlight>출석으로 인정되는 결석</Highlight>입니다.
          </p>
          <ul className="mt-2 pl-5 list-disc">
            <li className="text-[13px] text-[#555] mb-1">경조사 (부모 회갑, 결혼식 등)</li>
            <li className="text-[13px] text-[#555] mb-1">천재지변, 법정 전염병</li>
            <li className="text-[13px] text-[#555] mb-1">학교장 허가 교외체험학습</li>
            <li className="text-[13px] text-[#555] mb-1">공식 대회 참가</li>
          </ul>
        </GuideCard>
        <GuideCard title="기타결석">
          <p>
            질병, 출석인정에 해당하지 않는 <Highlight>부득이한 사유</Highlight>로 인한 결석입니다.
            가정 사정, 개인 사유 등이 포함됩니다.
          </p>
        </GuideCard>
        <GuideCard
          title="미인정결석"
          tag={{ text: "주의", type: "important" }}
        >
          <p>
            합당한 사유 없이 결석한 경우입니다.
            <Highlight>학생부에 기록</Highlight>될 수 있으니 주의하세요.
          </p>
        </GuideCard>
      </GuideSection>

      {/* 결석 기간 */}
      <GuideSection icon="📅" title="결석 기간">
        <GuideCard title="기간 선택">
          <p>
            <Highlight>📅 달력 아이콘</Highlight>을 클릭하여 결석 시작일과 종료일을 선택해주세요.
          </p>
          <p className="mt-2 text-[13px] text-[#555]">
            하루만 결석하는 경우 시작일과 종료일을 동일하게 선택하세요.
          </p>
        </GuideCard>
        <GuideCard title="자동 일수 계산" tag={{ text: "자동", type: "default" }}>
          <p>
            시작일과 종료일을 선택하면 <Highlight>총 결석 일수가 자동 계산</Highlight>됩니다.
          </p>
        </GuideCard>
      </GuideSection>

      {/* 결석 사유 */}
      <GuideSection icon="✏️" title="결석 사유">
        <GuideCard title="상세히 작성하기">
          <p>
            결석 사유를 <Highlight>구체적으로</Highlight> 작성해주세요.
          </p>
          <ul className="mt-2 pl-5 list-disc">
            <li className="text-[13px] text-[#555] mb-1">증상이나 상황 설명</li>
            <li className="text-[13px] text-[#555] mb-1">병원 방문 여부</li>
            <li className="text-[13px] text-[#555] mb-1">치료 내용</li>
          </ul>
        </GuideCard>
        <GuideCard
          title="AI로 작성하기"
          tag={{ text: "💡 추천", type: "tip" }}
          example={{
            title: "AI 생성 예시",
            content:
              "\"고열(38.5도) 및 기침, 콧물 등 감기 증상으로 인해 ○○병원에서 진료를 받고 의사의 지시에 따라 자택에서 안정을 취하였습니다.\"",
          }}
        >
          <p>
            <BlueText>✨ AI 작성</BlueText> 버튼을 누르면 선택한 결석 종류에 맞는{" "}
            <Highlight>결석 사유가 자동 생성</Highlight>됩니다.
          </p>
        </GuideCard>
      </GuideSection>

      {/* 증빙서류 */}
      <GuideSection icon="📎" title="증빙서류">
        <GuideCard title="증빙서류 종류">
          <p>
            결석 종류에 따라 <Highlight>적절한 증빙서류</Highlight>를 선택하세요.
          </p>
          <ul className="mt-2 pl-5 list-disc">
            <li className="text-[13px] text-[#555] mb-1">
              <strong>진료확인서:</strong> 병원 진료 확인
            </li>
            <li className="text-[13px] text-[#555] mb-1">
              <strong>처방전:</strong> 약 처방 기록
            </li>
            <li className="text-[13px] text-[#555] mb-1">
              <strong>입원확인서:</strong> 입원 치료 시
            </li>
            <li className="text-[13px] text-[#555] mb-1">
              <strong>공문:</strong> 대회 참가 등 공식 문서
            </li>
            <li className="text-[13px] text-[#555] mb-1">
              <strong>학부모 확인서:</strong> 가정 내 돌봄 등
            </li>
          </ul>
        </GuideCard>
        <GuideCard title="선택은 필수가 아닙니다" tag={{ text: "선택", type: "default" }}>
          <p>
            증빙서류가 없는 경우 선택하지 않아도 됩니다.
            단, <Highlight>질병결석의 경우 증빙서류 제출을 권장</Highlight>합니다.
          </p>
        </GuideCard>
      </GuideSection>

      {/* 보호자 정보 */}
      <GuideSection icon="👨‍👩‍👧" title="보호자 정보">
        <GuideCard title="보호자명 & 연락처">
          <p>
            결석을 신고하는 <Highlight>보호자의 성명</Highlight>을 입력해주세요.
            연락처는 학교에서 확인이 필요할 때 사용됩니다.
          </p>
        </GuideCard>
      </GuideSection>

      {/* AI 기능 활용법 */}
      <GuideSection icon="✨" title="AI 기능 활용법">
        <GuideCard title="AI 사유 작성">
          <p>
            결석 사유 섹션의 <BlueText>✨ AI 작성</BlueText> 버튼은{" "}
            <Highlight>선택한 결석 종류에 맞는 사유</Highlight>를 생성해줍니다.
          </p>
        </GuideCard>
        <GuideCard
          title="AI 전체 생성"
          tag={{ text: "💡 강력 추천", type: "tip" }}
          example={{
            title: "이렇게 활용하세요",
            content:
              "1. 학생 정보, 결석 종류, 기간 입력\n2. \"AI 전체 생성\" 클릭\n3. 생성된 사유 검토 후 수정\n4. \"미리보기\"로 확인 후 PDF 다운로드!",
          }}
        >
          <p>
            기본 정보만 입력하고 하단의 <Highlight>AI 전체 생성</Highlight> 버튼을
            누르면 <BlueText>결석 사유를 자동으로</BlueText> 작성해줘요!
          </p>
        </GuideCard>
        <GuideCard title="미리보기 & 초기화">
          <p>
            <BlueText>미리보기</BlueText>: 작성 중인 신고서를 미리 확인
            <br />
            <BlueText>초기화</BlueText>: 모든 입력 내용을 지우고 처음부터 다시 시작
          </p>
        </GuideCard>
      </GuideSection>
    </>
  );
}
