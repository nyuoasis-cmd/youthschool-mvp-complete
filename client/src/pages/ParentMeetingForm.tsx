import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { AIGenerateButton } from "@/components/AIGenerateButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { HwpReferenceUpload } from "@/components/HwpReferenceUpload";

const meetingTypes = ["정기총회", "임시총회"] as const;

export default function ParentMeetingForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [meetingType, setMeetingType] = useState<string>("");
  const [meetingDateTime, setMeetingDateTime] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [agenda, setAgenda] = useState("");
  const [attendanceGuide, setAttendanceGuide] = useState("");
  const [referenceFileId, setReferenceFileId] = useState<number | null>(null);

  const buildInputs = () => ({
    title: "학부모총회 안내",
    basicInfo: [
      `총회 유형: ${meetingType || "(미입력)"}`,
      `일시: ${meetingDateTime || "(미입력)"}`,
      `장소: ${meetingLocation || "(미입력)"}`,
    ].join("\n"),
    agenda: agenda || "(미입력)",
    attendance: attendanceGuide || "(미입력)",
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        documentType: "학부모총회 안내",
        inputs: buildInputs(),
        uploadedTemplateId: referenceFileId ?? undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문서 생성 완료",
        description: "학부모총회 안내문이 생성되었습니다.",
      });
      setLocation(`/result/${data.id}`, { state: { document: data } });
    },
    onError: (error: Error) => {
      toast({
        title: "문서 생성 실패",
        description: error.message || "문서 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">학부모총회 안내 작성</h1>
              <p className="text-sm text-muted-foreground">필요한 정보를 입력하면 안내문을 생성합니다</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              학부모총회 정보 입력
            </CardTitle>
            <CardDescription>입력한 내용으로 안내문을 생성합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">총회 유형</label>
              <Select value={meetingType} onValueChange={setMeetingType}>
                <SelectTrigger>
                  <SelectValue placeholder="정기총회 / 임시총회" />
                </SelectTrigger>
                <SelectContent>
                  {meetingTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">일시</label>
                <Input
                  value={meetingDateTime}
                  onChange={(event) => setMeetingDateTime(event.target.value)}
                  placeholder="예: 2026년 3월 15일(화) 14:00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">장소</label>
                <Input
                  value={meetingLocation}
                  onChange={(event) => setMeetingLocation(event.target.value)}
                  placeholder="예: 시청각실"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">안건</label>
                <AIGenerateButton
                  fieldName="agendaDetails"
                  context={{
                    basicInfo: { meetingType },
                    schedule: { date: meetingDateTime, location: meetingLocation },
                    currentValue: agenda,
                  }}
                  onGenerated={(text) => setAgenda(text)}
                  endpoint="/api/parent-meeting/generate-ai-content"
                />
              </div>
              <Textarea
                rows={6}
                value={agenda}
                onChange={(event) => setAgenda(event.target.value)}
                placeholder="주요 안건을 입력하세요."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">참석 안내</label>
                <AIGenerateButton
                  fieldName="precautions"
                  context={{
                    schedule: { date: meetingDateTime, location: meetingLocation },
                    attendance: { method: "대면" },
                    currentValue: attendanceGuide,
                  }}
                  onGenerated={(text) => setAttendanceGuide(text)}
                  endpoint="/api/parent-meeting/generate-ai-content"
                />
              </div>
              <Textarea
                rows={5}
                value={attendanceGuide}
                onChange={(event) => setAttendanceGuide(event.target.value)}
                placeholder="참석 방법, 유의사항 등을 입력하세요."
              />
            </div>

            <HwpReferenceUpload
              onUploaded={(fileId) => setReferenceFileId(fileId)}
              onClear={() => setReferenceFileId(null)}
            />

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button
                type="button"
                size="lg"
                className="flex-1"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  "AI로 문서 생성하기"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  setMeetingType("");
                  setMeetingDateTime("");
                  setMeetingLocation("");
                  setAgenda("");
                  setAttendanceGuide("");
                }}
              >
                초기화
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
