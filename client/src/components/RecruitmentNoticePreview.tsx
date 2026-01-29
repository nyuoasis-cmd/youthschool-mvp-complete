import { forwardRef } from "react";
import { DateRangeValue } from "@/components/common/DateRangePicker";

interface PositionItem {
  id: string;
  jobType: string;
  headcount: number;
  contractType: string;
  duties: string;
}

interface ScheduleItem {
  id: string;
  stage: string;
  datetime: string;
  note: string;
}

interface RecruitmentNoticePreviewProps {
  schoolName: string;
  noticeNumber: string;
  noticeDate: string;
  educationOffice: string;
  positions: PositionItem[];
  contractPeriod: DateRangeValue;
  isUntilRetirement: boolean;
  workTimeStart: string;
  workTimeEnd: string;
  breakTime: string;
  workPlace: string;
  salaryType: string;
  salaryAmount: string;
  salaryUnit: string;
  salaryNote: string;
  minAge: string;
  retirementAge: string;
  requiredCertificates: string[];
  otherQualifications: string;
  preferredConditions: string;
  schedules: ScheduleItem[];
  contactDepartment: string;
  contactPhone: string;
  selectedFirstDocs: string[];
  selectedFinalDocs: string[];
}

function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(datetimeString: string): string {
  if (!datetimeString) return "";
  const date = new Date(datetimeString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const RecruitmentNoticePreview = forwardRef<HTMLDivElement, RecruitmentNoticePreviewProps>(
  (props, ref) => {
    const {
      schoolName,
      noticeNumber,
      noticeDate,
      educationOffice,
      positions,
      contractPeriod,
      isUntilRetirement,
      workTimeStart,
      workTimeEnd,
      breakTime,
      workPlace,
      salaryType,
      salaryAmount,
      salaryUnit,
      salaryNote,
      minAge,
      retirementAge,
      requiredCertificates,
      otherQualifications,
      preferredConditions,
      schedules,
      contactDepartment,
      contactPhone,
      selectedFirstDocs,
      selectedFinalDocs,
    } = props;

    const totalHeadcount = positions.reduce((sum, p) => sum + p.headcount, 0);
    const jobTypes = positions.map(p => p.jobType).filter(Boolean).join(", ");

    return (
      <div
        ref={ref}
        style={{
          width: '794px',
          minHeight: '1123px',
          padding: '60px 60px',
          backgroundColor: 'white',
          fontFamily: "'Pretendard Variable', 'Malgun Gothic', 'Noto Sans KR', sans-serif",
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#000',
          boxSizing: 'border-box',
          margin: '0 auto',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        }}
      >
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">교육공무직원 채용 공고</h1>
          <p className="text-sm text-gray-600">{noticeNumber}</p>
        </div>

        {/* 공고문 */}
        <div className="mb-8">
          <p className="text-sm leading-relaxed">
            {schoolName}에서는 아래와 같이 교육공무직원을 채용하고자 하오니,
            관심 있는 분들의 많은 지원 바랍니다.
          </p>
        </div>

        {/* 1. 채용 개요 */}
        <section className="mb-6">
          <h2 className="text-base font-bold border-b-2 border-gray-800 pb-1 mb-4">1. 채용 개요</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr className="border border-gray-300">
                <td className="bg-gray-100 px-3 py-2 font-semibold w-28 border-r">채용직종</td>
                <td className="px-3 py-2">{jobTypes || "-"}</td>
                <td className="bg-gray-100 px-3 py-2 font-semibold w-28 border-l border-r">채용인원</td>
                <td className="px-3 py-2 w-24">{totalHeadcount}명</td>
              </tr>
              <tr className="border border-gray-300 border-t-0">
                <td className="bg-gray-100 px-3 py-2 font-semibold border-r">계약유형</td>
                <td className="px-3 py-2" colSpan={3}>
                  {positions.map(p => p.contractType).filter(Boolean).join(", ") || "-"}
                </td>
              </tr>
              <tr className="border border-gray-300 border-t-0">
                <td className="bg-gray-100 px-3 py-2 font-semibold border-r align-top">담당업무</td>
                <td className="px-3 py-2 whitespace-pre-line" colSpan={3}>
                  {positions.map(p => p.duties).filter(Boolean).join("\n") || "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 2. 근로 조건 */}
        <section className="mb-6">
          <h2 className="text-base font-bold border-b-2 border-gray-800 pb-1 mb-4">2. 근로 조건</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr className="border border-gray-300">
                <td className="bg-gray-100 px-3 py-2 font-semibold w-28 border-r">계약기간</td>
                <td className="px-3 py-2" colSpan={3}>
                  {isUntilRetirement
                    ? "정년까지"
                    : contractPeriod.start && contractPeriod.end
                    ? `${formatDate(contractPeriod.start)} ~ ${formatDate(contractPeriod.end)}`
                    : "-"}
                </td>
              </tr>
              <tr className="border border-gray-300 border-t-0">
                <td className="bg-gray-100 px-3 py-2 font-semibold border-r">근무시간</td>
                <td className="px-3 py-2">
                  {workTimeStart} ~ {workTimeEnd}
                  {breakTime && ` (휴게시간 ${breakTime}분 포함)`}
                </td>
                <td className="bg-gray-100 px-3 py-2 font-semibold w-28 border-l border-r">근무장소</td>
                <td className="px-3 py-2">{workPlace || "-"}</td>
              </tr>
              <tr className="border border-gray-300 border-t-0">
                <td className="bg-gray-100 px-3 py-2 font-semibold border-r">보수</td>
                <td className="px-3 py-2" colSpan={3}>
                  {salaryType && (
                    <span>
                      {salaryType}
                      {salaryAmount && ` / ${salaryAmount}${salaryUnit}`}
                    </span>
                  )}
                  {!salaryType && !salaryAmount && "교육청 기준에 따름"}
                </td>
              </tr>
              {salaryNote && (
                <tr className="border border-gray-300 border-t-0">
                  <td className="bg-gray-100 px-3 py-2 font-semibold border-r align-top">보수 비고</td>
                  <td className="px-3 py-2 whitespace-pre-line" colSpan={3}>{salaryNote}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* 3. 응시 자격 */}
        <section className="mb-6">
          <h2 className="text-base font-bold border-b-2 border-gray-800 pb-1 mb-4">3. 응시 자격</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr className="border border-gray-300">
                <td className="bg-gray-100 px-3 py-2 font-semibold w-28 border-r">연령</td>
                <td className="px-3 py-2" colSpan={3}>
                  {minAge ? `만 ${minAge}세 이상` : "제한 없음"}
                  {retirementAge && ` (정년 만 ${retirementAge}세)`}
                </td>
              </tr>
              {requiredCertificates.length > 0 && (
                <tr className="border border-gray-300 border-t-0">
                  <td className="bg-gray-100 px-3 py-2 font-semibold border-r">필수 자격증</td>
                  <td className="px-3 py-2" colSpan={3}>{requiredCertificates.join(", ")}</td>
                </tr>
              )}
              {otherQualifications && (
                <tr className="border border-gray-300 border-t-0">
                  <td className="bg-gray-100 px-3 py-2 font-semibold border-r align-top">기타 자격</td>
                  <td className="px-3 py-2 whitespace-pre-line" colSpan={3}>{otherQualifications}</td>
                </tr>
              )}
              {preferredConditions && (
                <tr className="border border-gray-300 border-t-0">
                  <td className="bg-gray-100 px-3 py-2 font-semibold border-r align-top">우대사항</td>
                  <td className="px-3 py-2 whitespace-pre-line" colSpan={3}>{preferredConditions}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded text-xs">
            <p className="font-semibold mb-1">※ 채용결격사유</p>
            <ul className="list-disc list-inside space-y-0.5 text-gray-700">
              <li>국가공무원법 제33조의 결격사유에 해당하는 자</li>
              <li>아동·청소년의 성보호에 관한 법률 제56조에 해당하는 자</li>
              <li>아동복지법 제29조의3에 해당하는 자</li>
            </ul>
          </div>
        </section>

        {/* 4. 채용 일정 */}
        <section className="mb-6">
          <h2 className="text-base font-bold border-b-2 border-gray-800 pb-1 mb-4">4. 채용 일정</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 border border-gray-300">
                <th className="px-3 py-2 text-left font-semibold w-32">구분</th>
                <th className="px-3 py-2 text-left font-semibold">일시</th>
                <th className="px-3 py-2 text-left font-semibold w-40">비고</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="border border-gray-300 border-t-0">
                  <td className="px-3 py-2 font-medium">{schedule.stage}</td>
                  <td className="px-3 py-2">{formatDateTime(schedule.datetime) || "-"}</td>
                  <td className="px-3 py-2 text-gray-600">{schedule.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(contactDepartment || contactPhone) && (
            <p className="mt-2 text-sm text-gray-600">
              문의: {contactDepartment} {contactPhone && `(${contactPhone})`}
            </p>
          )}
        </section>

        {/* 5. 제출 서류 */}
        <section className="mb-6">
          <h2 className="text-base font-bold border-b-2 border-gray-800 pb-1 mb-4">5. 제출 서류</h2>

          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2">가. 1차 접수 시 제출서류</h3>
            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
              {selectedFirstDocs.map((doc, index) => (
                <li key={index}>{doc}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">나. 최종합격자 제출서류</h3>
            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
              {selectedFinalDocs.map((doc, index) => (
                <li key={index}>{doc}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* 6. 기타 안내 */}
        <section className="mb-8">
          <h2 className="text-base font-bold border-b-2 border-gray-800 pb-1 mb-4">6. 기타 안내사항</h2>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>제출된 서류는 일체 반환하지 않습니다.</li>
            <li>응시원서 기재사항 착오 또는 허위기재, 구비서류 미제출 등으로 인한 불이익은 응시자의 책임입니다.</li>
            <li>합격자가 없거나, 채용 부적격자로 판명될 경우 채용하지 않을 수 있습니다.</li>
            <li>기타 자세한 사항은 {schoolName} 행정실로 문의하시기 바랍니다.</li>
          </ul>
        </section>

        {/* 푸터 */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-600 mb-6">{formatDate(noticeDate)}</p>
          <p className="text-lg font-bold">{schoolName}장</p>
          {educationOffice && (
            <p className="text-sm text-gray-500 mt-1">{educationOffice}</p>
          )}
        </div>
      </div>
    );
  }
);

RecruitmentNoticePreview.displayName = "RecruitmentNoticePreview";

export default RecruitmentNoticePreview;
