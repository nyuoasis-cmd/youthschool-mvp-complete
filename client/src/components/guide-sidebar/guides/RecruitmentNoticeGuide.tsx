import { GuideSection } from "../GuideSection";
import { GuideCard, Highlight, BlueText } from "../GuideCard";

export function RecruitmentNoticeGuide() {
  return (
    <>
      {/* 기본 정보 */}
      <GuideSection icon="📝" title="기본 정보">
        <GuideCard
          title="학교명 & 공고번호"
          tag={{ text: "기본", type: "default" }}
          example={{
            title: "예시",
            content: "학교명: 오창고등학교\n공고번호: 제2025-16호",
          }}
        >
          <p>
            학교 정식 명칭과 공고번호를 입력하세요.
            공고번호는 학교에서 정한 번호를 쓰시면 됩니다.
          </p>
        </GuideCard>
      </GuideSection>

      {/* 채용 개요 */}
      <GuideSection icon="👥" title="채용 개요">
        <GuideCard
          title="담당업무"
          tag={{ text: "💡 팁", type: "tip" }}
        >
          <p>
            채용할 직원이 어떤 일을 할지 적어주세요.
          </p>
          <p className="mt-2">
            잘 모르시면 <BlueText>✨ AI 작성</BlueText> 버튼을 눌러보세요!
            직종에 맞는 업무 내용을 <Highlight>자동으로 작성</Highlight>해 드립니다.
          </p>
        </GuideCard>
      </GuideSection>

      {/* 근로 조건 */}
      <GuideSection icon="📅" title="근로 조건">
        <GuideCard
          title="계약기간 & 근무시간"
          tag={{ text: "중요", type: "important" }}
        >
          <ul className="space-y-1">
            <li><strong>계약기간:</strong> 언제부터 언제까지 일하는지</li>
            <li><strong>근무시간:</strong> 하루에 몇 시부터 몇 시까지 일하는지</li>
          </ul>
          <p className="mt-2 text-blue-600">
            무기계약직은 <Highlight>"정년까지"</Highlight>에 체크하세요.
          </p>
        </GuideCard>
        <GuideCard title="보수 (급여)">
          <ul className="space-y-1">
            <li><strong>시급제:</strong> 시간당 얼마 (예: 12,030원/시간)</li>
            <li><strong>월급제:</strong> 한 달에 얼마 (예: 250만원/월)</li>
          </ul>
          <p className="mt-2 text-gray-500">
            교육청 기준에 따르면 금액을 비워두셔도 됩니다.
          </p>
        </GuideCard>
      </GuideSection>

      {/* 응시 자격 */}
      <GuideSection icon="✅" title="응시 자격">
        <GuideCard
          title="자격 요건 입력"
          tag={{ text: "💡 팁", type: "tip" }}
        >
          <p>
            <strong>필수 자격증:</strong> 자격증 이름을 입력하고 Enter를 누르세요.
            여러 개 추가할 수 있습니다.
          </p>
          <p className="mt-2">
            기타 응시자격, 우대사항은 <BlueText>✨ AI 작성</BlueText> 버튼으로
            자동 생성할 수 있습니다.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-3 text-xs text-blue-700">
            ※ 채용결격사유는 자동으로 포함되니 따로 입력하지 않으셔도 됩니다.
          </div>
        </GuideCard>
      </GuideSection>

      {/* 채용 일정 */}
      <GuideSection icon="📆" title="채용 일정">
        <GuideCard
          title="일정 입력"
          tag={{ text: "기본", type: "default" }}
        >
          <p>
            각 단계별 날짜와 시간을 입력하세요.
            <Highlight>달력 아이콘</Highlight>을 클릭하면 쉽게 선택할 수 있습니다.
          </p>
          <p className="mt-2 text-gray-600">
            비고란에는 "합격자 개별통보", "장소 개별안내" 등
            추가 안내사항을 적어주세요.
          </p>
        </GuideCard>
      </GuideSection>

      {/* 제출 서류 */}
      <GuideSection icon="📄" title="제출 서류">
        <GuideCard
          title="서류 선택"
          tag={{ text: "기본", type: "default" }}
        >
          <p>
            필요한 서류를 <Highlight>클릭해서 선택</Highlight>하세요.
            선택된 서류는 파란색으로 표시됩니다.
          </p>
          <p className="mt-2 text-gray-500">
            기본적으로 자주 사용하는 서류는
            미리 선택되어 있습니다.
          </p>
        </GuideCard>
      </GuideSection>

      {/* AI 전부 생성 */}
      <GuideSection icon="✨" title="AI 전부 생성">
        <GuideCard
          title="이렇게 사용하세요"
          tag={{ text: "💡 강력 추천", type: "tip" }}
          example={{
            title: "활용 방법",
            content: "1. 학교명, 직종, 계약기간만 입력\n2. \"AI 전부 생성\" 버튼 클릭\n3. 생성된 내용을 확인하고 수정\n4. \"미리보기\"로 확인 후 완성!",
          }}
        >
          <p>
            기본 정보만 입력하고 하단의 <Highlight>AI 전부 생성</Highlight> 버튼을 누르면,
            나머지 항목을 <BlueText>한 번에 작성</BlueText>해 드려요!
          </p>
        </GuideCard>
      </GuideSection>
    </>
  );
}
