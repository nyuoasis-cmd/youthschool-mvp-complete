import { Link, useSearch } from "wouter";
import { AuthLayout } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, MessageCircle, ExternalLink } from "lucide-react";

// External links
const KAKAO_OPENCHAT_URL = "https://open.kakao.com/o/gmwBQjei";
const KAKAO_CHANNEL_URL = "https://pf.kakao.com/_BElRX/friend";

export default function SignupComplete() {
  return (
    <AuthLayout>
      <div className="text-center space-y-6">
        {/* Success icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>

        {/* Success message */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            가입이 완료되었습니다!
          </h2>
          <p className="mt-2 text-gray-600">
            가입해주셔서 감사합니다
          </p>
        </div>

        {/* Beta tester open chat CTA - Main (Enhanced) */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <a
              href={KAKAO_OPENCHAT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div
                className="p-5 text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #2d5af0, #6b8cff)" }}
              >
                <div className="space-y-4">
                  <p className="font-bold text-xl">
                    베타테스터 단톡방에 참여해주세요!
                  </p>
                  <p className="text-white text-sm leading-relaxed">
                    선생님들의 실제 의견이 서비스를 만듭니다.<br />
                    필요한 문서, 불편한 점을 직접 알려주세요!
                  </p>

                  {/* Feature tags - vertical */}
                  <div className="flex flex-col gap-2 items-center pt-1">
                    <span className="bg-white text-blue-600 px-4 py-1.5 rounded-full text-sm font-medium">
                      기능 요청 & 피드백
                    </span>
                    <span className="bg-white text-blue-600 px-4 py-1.5 rounded-full text-sm font-medium">
                      매주 수업 도구 공유
                    </span>
                    <span className="bg-white text-blue-600 px-4 py-1.5 rounded-full text-sm font-medium">
                      신기능 우선 체험
                    </span>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-2">
                    <span className="inline-flex items-center bg-yellow-400 text-gray-900 font-bold px-6 py-2.5 rounded-lg">
                      단톡방 참여하기
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </span>
                  </div>
                </div>
              </div>
            </a>
          </CardContent>
        </Card>

        {/* Kakao Channel CTA - Secondary */}
        <a
          href={KAKAO_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Card className="bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-black" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-700">카카오 채널도 추가해보세요</p>
                  <p className="text-gray-500 text-sm">
                    업데이트 소식을 받을 수 있어요
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400 ml-2" />
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
      </div>
    </AuthLayout>
  );
}
