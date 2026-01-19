import MyPageLayout from "@/pages/mypage/MyPageLayout";
import MyPageDocuments from "@/pages/mypage/MyPageDocuments";

export default function MyPageCompletedPage() {
  return (
    <MyPageLayout activePath="/mypage/completed">
      <MyPageDocuments initialStatus="completed" />
    </MyPageLayout>
  );
}
