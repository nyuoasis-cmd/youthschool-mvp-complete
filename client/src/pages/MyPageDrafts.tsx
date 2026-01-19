import MyPageLayout from "@/pages/mypage/MyPageLayout";
import MyPageDocuments from "@/pages/mypage/MyPageDocuments";

export default function MyPageDraftsPage() {
  return (
    <MyPageLayout activePath="/mypage/drafts">
      <MyPageDocuments initialStatus="draft" />
    </MyPageLayout>
  );
}
