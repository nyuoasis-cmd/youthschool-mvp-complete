import MyPageLayout from "@/pages/mypage/MyPageLayout";
import MyPageDocuments from "@/pages/mypage/MyPageDocuments";

export default function MyPageDocumentsPage() {
  return (
    <MyPageLayout activePath="/mypage/documents">
      <MyPageDocuments />
    </MyPageLayout>
  );
}
