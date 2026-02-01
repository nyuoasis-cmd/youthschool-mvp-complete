import { Link } from "wouter";
import { AuthLayout } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, MessageCircle, ExternalLink } from "lucide-react";

// External links
const KAKAO_CHANNEL_URL = "https://pf.kakao.com/_BElRX/friend";

export default function BetaClosed() {
  return (
    <AuthLayout>
      <div className="text-center space-y-6">
        {/* Clock icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
        </div>

        {/* Message */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            베타 테스트 모집이 마감되었습니다
          </h2>
          <p className="mt-2 text-gray-600">
            다음 모집 일정은 카카오 채널에서 안내해 드립니다
          </p>
        </div>

        {/* Kakao Channel CTA */}
        <a
          href={KAKAO_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-yellow-400 p-5 hover:bg-yellow-500 transition-colors">
                <div className="flex items-center justify-center gap-3">
                  <MessageCircle className="h-6 w-6 text-black" />
                  <div className="text-left">
                    <p className="font-bold text-lg text-black">카카오 채널 추가하기</p>
                    <p className="text-yellow-800 text-sm">
                      다음 모집 알림 받기
                    </p>
                  </div>
                  <ExternalLink className="h-5 w-5 text-black ml-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </a>

        {/* Home button */}
        <div className="pt-2">
          <Link href="/">
            <Button variant="outline" className="w-full">
              홈으로 돌아가기
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div className="pt-4 text-center">
          <p className="text-sm text-gray-500">
            teachermate.co.kr — 학교 행정문서 AI 자동화 서비스
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
