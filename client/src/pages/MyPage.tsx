import MyPageLayout from "@/pages/mypage/MyPageLayout";
import MyPageDashboard from "@/pages/mypage/MyPageDashboard";

export default function MyPage() {
  return (
    <MyPageLayout activePath="/mypage">
      <MyPageDashboard />
    </MyPageLayout>
  );
}
