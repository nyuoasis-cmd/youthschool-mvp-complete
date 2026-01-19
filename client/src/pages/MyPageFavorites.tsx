import MyPageLayout from "@/pages/mypage/MyPageLayout";
import MyPageDocuments from "@/pages/mypage/MyPageDocuments";

export default function MyPageFavoritesPage() {
  return (
    <MyPageLayout activePath="/mypage/favorites">
      <MyPageDocuments initialFavorite />
    </MyPageLayout>
  );
}
