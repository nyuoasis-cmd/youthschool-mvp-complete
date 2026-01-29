import { GuideSection } from "../GuideSection";
import { GuideCard, Highlight, BlueText } from "../GuideCard";

export function MealNoticeGuide() {
  return (
    <>
      {/* 문서 제목 */}
      <GuideSection icon="📝" title="문서 제목">
        <GuideCard
          title="학년도 & 월 선택"
          tag={{ text: "기본", type: "default" }}
          example={{
            title: "예시",
            content: "2025학년도 + 4월 선택 시\n→ \"2025학년도 4월 학교급식 안내\"",
          }}
        >
          <p>
            선택하신 학년도와 월이 <Highlight>문서 제목에 자동 반영</Highlight>됩니다.
          </p>
        </GuideCard>
      </GuideSection>

      {/* 인사말 */}
      <GuideSection icon="💬" title="인사말">
        <GuideCard title="직접 입력하기">
          <p>
            학부모님께 전달할 인사말을 <Highlight>자유롭게</Highlight> 작성해주세요.
            계절 인사나 학교 특색을 담으면 좋아요.
          </p>
        </GuideCard>
        <GuideCard
          title="AI로 작성하기"
          tag={{ text: "💡 추천", type: "tip" }}
          example={{
            title: "4월 AI 생성 예시",
            content:
              "\"따스한 봄 햇살이 교정에 가득한 4월입니다. 학부모님 가정에 건강과 행복이 함께하시길 바랍니다.\"",
          }}
        >
          <p>
            <BlueText>✨ AI 작성</BlueText> 버튼을 누르면 선택한 월에 맞는{" "}
            <Highlight>계절 인사말</Highlight>이 자동 생성돼요.
          </p>
        </GuideCard>
      </GuideSection>

      {/* 기간 입력 */}
      <GuideSection icon="📅" title="기간 입력">
        <GuideCard title="급식 기간">
          <p>
            <Highlight>📅 달력 아이콘</Highlight>을 클릭하면 달력이 나타나요. 시작일과
            종료일을 각각 선택해주세요.
          </p>
        </GuideCard>
        <GuideCard
          title="급식비 납부기간"
          tag={{ text: "중요", type: "important" }}
        >
          <p>
            학부모님이 급식비를 납부해야 하는 기간이에요.{" "}
            <Highlight>📅 달력 아이콘</Highlight>을 클릭하여 날짜를 선택해주세요.
          </p>
        </GuideCard>
      </GuideSection>

      {/* 납부내역 */}
      <GuideSection icon="💰" title="납부내역">
        <GuideCard title="테이블 작성법">
          <p>
            학년별, 급식 구분별로 <Highlight>납부 금액</Highlight>을 입력해주세요.
          </p>
          <ul className="mt-2 pl-5 list-disc">
            <li className="text-[13px] text-[#555] mb-1">
              <strong>학년:</strong> 1학년, 2학년, 3학년 등
            </li>
            <li className="text-[13px] text-[#555] mb-1">
              <strong>구분:</strong> 중식, 석식, 중식+석식
            </li>
            <li className="text-[13px] text-[#555] mb-1">
              <strong>산출내역:</strong> 급식일수 × 단가
            </li>
            <li className="text-[13px] text-[#555] mb-1">
              <strong>납부금액:</strong> 최종 납부액
            </li>
          </ul>
        </GuideCard>
        <GuideCard title="행 추가하기" tag={{ text: "💡 팁", type: "tip" }}>
          <p>
            학년별로 금액이 다르다면 <BlueText>+ 행 추가</BlueText> 버튼으로 행을
            추가해주세요.
          </p>
        </GuideCard>
        <GuideCard title="AI로 자동 계산" tag={{ text: "💡 추천", type: "tip" }}>
          <p>
            급식일수와 단가를 입력 후 <BlueText>✨ AI 생성</BlueText>을 누르면{" "}
            <Highlight>산출내역과 합계가 자동 계산</Highlight>돼요.
          </p>
        </GuideCard>
      </GuideSection>

      {/* 납부 방법 */}
      <GuideSection icon="🏦" title="납부 방법">
        <GuideCard
          title="납부 방법 안내"
          example={{
            title: "일반적인 납부 방법",
            content: "스쿨뱅킹, 가상계좌, 카드결제, 학교 방문 납부 등",
          }}
        >
          <p>
            학교에서 사용하는 <Highlight>급식비 납부 방법</Highlight>을 입력해주세요.
          </p>
        </GuideCard>
      </GuideSection>

      {/* 추가 안내 항목 */}
      <GuideSection icon="📢" title="추가 안내 항목">
        <GuideCard title="어떤 내용을 넣나요?">
          <p>
            급식 관련 <Highlight>추가 안내사항</Highlight>을 자유롭게 입력하세요.
          </p>
          <ul className="mt-2 pl-5 list-disc">
            <li className="text-[13px] text-[#555] mb-1">알레르기 유발 식품 안내</li>
            <li className="text-[13px] text-[#555] mb-1">급식 취소/환불 안내</li>
            <li className="text-[13px] text-[#555] mb-1">식단표 확인 방법</li>
            <li className="text-[13px] text-[#555] mb-1">급식실 이용 수칙</li>
          </ul>
        </GuideCard>
        <GuideCard title="여러 항목 추가" tag={{ text: "💡 팁", type: "tip" }}>
          <p>
            <BlueText>+ 안내 항목 추가</BlueText> 버튼으로 여러 개의 안내사항을 추가할
            수 있어요.
          </p>
        </GuideCard>
      </GuideSection>

      {/* 발행 정보 */}
      <GuideSection icon="🖊" title="발행 정보">
        <GuideCard title="발행 날짜">
          <p>
            <Highlight>📅 달력 아이콘</Highlight>을 클릭하여 문서 발행 날짜를
            선택해주세요.
          </p>
        </GuideCard>
        <GuideCard title="학교장 서명" tag={{ text: "자동", type: "default" }}>
          <p>
            학교 설정에 따라 <Highlight>자동으로 채워집니다</Highlight>. 수정이
            필요하면 관리자에게 문의하세요.
          </p>
        </GuideCard>
      </GuideSection>

      {/* AI 기능 활용법 */}
      <GuideSection icon="✨" title="AI 기능 활용법">
        <GuideCard title="개별 AI 버튼">
          <p>
            각 섹션의 <BlueText>✨ AI 작성/생성</BlueText> 버튼은 해당 항목만 AI가
            작성해줍니다.
          </p>
        </GuideCard>
        <GuideCard
          title="AI 전부 생성"
          tag={{ text: "💡 강력 추천", type: "tip" }}
          example={{
            title: "이렇게 활용하세요",
            content:
              "1. 학년도, 월, 급식기간만 입력\n2. \"AI 전부 생성\" 클릭\n3. 생성된 내용 검토 후 수정\n4. \"미리보기\"로 확인 후 완성!",
          }}
        >
          <p>
            기본 정보만 입력하고 하단의 <Highlight>AI 전부 생성</Highlight> 버튼을
            누르면 <BlueText>모든 항목을 한 번에</BlueText> 작성해줘요!
          </p>
        </GuideCard>
        <GuideCard title="미리보기 & 초기화">
          <p>
            <BlueText>미리보기</BlueText>: 작성 중인 문서를 미리 확인
            <br />
            <BlueText>초기화</BlueText>: 모든 입력 내용을 지우고 처음부터 다시 시작
          </p>
        </GuideCard>
      </GuideSection>
    </>
  );
}
