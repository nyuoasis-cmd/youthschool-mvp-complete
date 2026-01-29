export function SuneungNoticeGuide() {
  return (
    <div className="space-y-6 text-sm">
      {/* 문서 제목 */}
      <section>
        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <span>1.</span> 기본 정보
        </h4>
        <ul className="space-y-1 text-muted-foreground">
          <li>* 학년도와 시험 유형을 선택하세요</li>
          <li>* 시험 유형 선택 시 시간표가 자동으로 채워집니다</li>
          <li>* 시험일을 입력하면 요일이 자동 계산됩니다</li>
        </ul>
      </section>

      {/* 시험 시간표 */}
      <section>
        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <span>2.</span> 시험 시간표
        </h4>
        <ul className="space-y-1 text-muted-foreground">
          <li>* 한국교육과정평가원 공고 기준으로 자동 입력됩니다</li>
          <li>* 필요시 시간표를 수정하거나 행을 추가할 수 있습니다</li>
          <li>* 비고란에 추가 안내사항을 입력하세요</li>
        </ul>
      </section>

      {/* 준비물 */}
      <section>
        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <span>3.</span> 준비물 안내
        </h4>
        <ul className="space-y-1 text-muted-foreground">
          <li>* 기본 준비물이 미리 입력되어 있습니다</li>
          <li>* 학교별 추가 준비물이 있다면 항목을 추가하세요</li>
        </ul>
        <div className="mt-2 p-2 bg-muted rounded text-xs">
          <strong>기본 준비물:</strong> 신분증, 수험표, 검은색 사인펜, 수정테이프, 연필, 지우개, 아날로그 시계
        </div>
      </section>

      {/* 유의사항 */}
      <section>
        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <span className="text-destructive">!</span>
          <span>4.</span> 유의사항 (중요)
        </h4>
        <ul className="space-y-1 text-muted-foreground">
          <li>* 전자기기 반입금지 안내가 핵심입니다</li>
          <li>* AI 작성 버튼으로 표준 유의사항을 생성하세요</li>
          <li>* 부정행위 시 불이익에 대해 안내하세요</li>
        </ul>
        <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
          <strong>필수 안내:</strong> 휴대폰, 스마트워치, 무선이어폰 등 모든 전자기기 반입 금지
        </div>
      </section>

      {/* 입실 시간 */}
      <section>
        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <span>5.</span> 입실 시간
        </h4>
        <ul className="space-y-1 text-muted-foreground">
          <li>* 1교시: 08:10까지 입실</li>
          <li>* 2~5교시: 시험 시작 10분 전까지 입실</li>
          <li>* 지각 시 해당 교시 응시 불가</li>
        </ul>
      </section>

      {/* AI 기능 활용 */}
      <section>
        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <span>*</span> AI 기능 활용법
        </h4>
        <ul className="space-y-1 text-muted-foreground">
          <li>* <strong>개별 AI 버튼:</strong> 각 섹션별로 내용을 생성합니다</li>
          <li>* <strong>AI 전부 생성:</strong> 인사말과 유의사항을 한 번에 생성합니다</li>
          <li>* 생성된 내용은 학교 상황에 맞게 수정하세요</li>
        </ul>
        <div className="mt-2 p-2 bg-primary/10 rounded text-xs text-primary">
          <strong>추천:</strong> 기본 정보 입력 후 "AI 전부 생성" 버튼을 클릭하면 빠르게 초안을 작성할 수 있습니다.
        </div>
      </section>

      {/* 참고 자료 */}
      <section>
        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <span>*</span> 참고 자료
        </h4>
        <ul className="space-y-1 text-muted-foreground text-xs">
          <li>* 한국교육과정평가원 수능/모의평가 시행 공고</li>
          <li>* 부정행위 관련 수험생 유의 사항</li>
          <li>* 응시수수료 환불 안내</li>
        </ul>
      </section>
    </div>
  );
}
