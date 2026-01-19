import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { PasswordStrength } from "@/components/auth";
import {
  User, Mail, Phone, Building2, GraduationCap, Presentation, Shield,
  Edit2, Save, Loader2, Eye, EyeOff, Trash2, LogOut, ArrowLeft
} from "lucide-react";

// Types
interface UserProfile {
  id: number;
  email: string;
  name: string;
  phone: string;
  userType: "teacher" | "instructor" | "school_admin" | "system_admin" | "operator";
  status: string;
  profileImageUrl?: string;
  createdAt: string;
  // Teacher fields
  schoolName?: string;
  schoolAddress?: string;
  subject?: string;
  department?: string;
  // Instructor fields
  specialties?: string[];
  careerYears?: number;
  introduction?: string;
  // School admin fields
  position?: string;
}

// Schemas
const profileSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 합니다"),
  schoolName: z.string().optional(),
  schoolAddress: z.string().optional(),
  subject: z.string().optional(),
  department: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  careerYears: z.number().optional(),
  introduction: z.string().max(500).optional(),
  position: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요"),
  newPassword: z.string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .regex(/[a-zA-Z]/, "영문을 포함해야 합니다")
    .regex(/[0-9]/, "숫자를 포함해야 합니다")
    .regex(/[^a-zA-Z0-9]/, "특수문자를 포함해야 합니다"),
  newPasswordConfirm: z.string(),
}).refine(data => data.newPassword === data.newPasswordConfirm, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["newPasswordConfirm"],
});

const deleteAccountSchema = z.object({
  password: z.string().min(1, "비밀번호를 입력해주세요"),
  confirm: z.boolean().refine(val => val === true, "계정 삭제에 동의해주세요"),
});

type ProfileInput = z.infer<typeof profileSchema>;
type PasswordInput = z.infer<typeof passwordSchema>;
type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

const SPECIALTY_OPTIONS = [
  { value: "coding", label: "코딩/프로그래밍" },
  { value: "ai", label: "인공지능/머신러닝" },
  { value: "robotics", label: "로봇공학" },
  { value: "maker", label: "메이커교육" },
  { value: "stem", label: "STEM/융합교육" },
  { value: "career", label: "진로교육" },
  { value: "environment", label: "환경교육" },
  { value: "arts", label: "문화예술" },
  { value: "sports", label: "스포츠/체육" },
  { value: "other", label: "기타" },
];

export default function Profile() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch profile
  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["/api/auth/profile"],
    retry: false,
  });

  // Profile form
  const profileForm = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      schoolName: "",
      schoolAddress: "",
      subject: "",
      department: "",
      specialties: [],
      careerYears: undefined,
      introduction: "",
      position: "",
    },
  });

  // Password form
  const passwordForm = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      newPasswordConfirm: "",
    },
  });

  // Delete account form
  const deleteForm = useForm<DeleteAccountInput>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: {
      password: "",
      confirm: false,
    },
  });

  const newPassword = passwordForm.watch("newPassword");

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      profileForm.reset({
        name: profile.name,
        schoolName: profile.schoolName || "",
        schoolAddress: profile.schoolAddress || "",
        subject: profile.subject || "",
        department: profile.department || "",
        specialties: profile.specialties || [],
        careerYears: profile.careerYears,
        introduction: profile.introduction || "",
        position: profile.position || "",
      });
    }
  }, [profile, profileForm]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileInput) => {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "프로필 수정에 실패했습니다");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditing(false);
      toast({
        title: "수정 완료",
        description: "프로필이 수정되었습니다",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordInput) => {
      const response = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "비밀번호 변경에 실패했습니다");
      }
      return response.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "변경 완료",
        description: "비밀번호가 변경되었습니다",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (data: DeleteAccountInput) => {
      const response = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.password }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "계정 삭제에 실패했습니다");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/");
      toast({
        title: "삭제 완료",
        description: "계정이 삭제되었습니다",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("로그아웃에 실패했습니다");
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/");
    },
  });

  const handleProfileSubmit = (data: ProfileInput) => {
    updateProfileMutation.mutate(data);
  };

  const handlePasswordSubmit = (data: PasswordInput) => {
    changePasswordMutation.mutate(data);
  };

  const handleDeleteSubmit = (data: DeleteAccountInput) => {
    deleteAccountMutation.mutate(data);
  };

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case "teacher": return "교사";
      case "instructor": return "강사";
      case "school_admin": return "학교 관리자";
      case "system_admin": return "시스템 관리자";
      case "operator": return "운영자";
      default: return "회원";
    }
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case "teacher": return <GraduationCap className="h-5 w-5" />;
      case "instructor": return <Presentation className="h-5 w-5" />;
      case "school_admin": return <Building2 className="h-5 w-5" />;
      case "operator": return <Shield className="h-5 w-5" />;
      default: return <User className="h-5 w-5" />;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state - redirect to login
  if (error || !profile) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            홈으로
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">내 프로필</h1>
          <p className="text-gray-600 mt-2">계정 정보를 관리합니다</p>
        </div>

        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>기본 정보</CardTitle>
                <CardDescription>
                  계정의 기본 정보를 확인하고 수정할 수 있습니다
                </CardDescription>
              </div>
              {!isEditing && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  수정
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
                  {/* User Type Badge */}
                  <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                    {getUserTypeIcon(profile.userType)}
                    <span className="font-medium">{getUserTypeLabel(profile.userType)}</span>
                  </div>

                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500">이메일</label>
                      <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{profile.email}</span>
                      </div>
                    </div>

                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>이름</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={!isEditing}
                              className={!isEditing ? "bg-gray-100" : ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500">휴대폰</label>
                      <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{profile.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Teacher-specific fields */}
                  {profile.userType === "teacher" && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-medium">학교 정보</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={profileForm.control}
                          name="schoolName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>학교명</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditing}
                                  className={!isEditing ? "bg-gray-100" : ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>담당 과목</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditing}
                                  className={!isEditing ? "bg-gray-100" : ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="department"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>담당 부서</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditing}
                                  className={!isEditing ? "bg-gray-100" : ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={profileForm.control}
                        name="schoolAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>학교 주소</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={!isEditing}
                                className={!isEditing ? "bg-gray-100" : ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Instructor-specific fields */}
                  {profile.userType === "instructor" && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-medium">강사 정보</h3>
                      <FormField
                        control={profileForm.control}
                        name="specialties"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>전문 분야</FormLabel>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {SPECIALTY_OPTIONS.map((option) => (
                                <label
                                  key={option.value}
                                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                                    !isEditing ? "bg-gray-100 cursor-not-allowed" : "hover:bg-gray-50"
                                  } ${
                                    field.value?.includes(option.value)
                                      ? "border-primary bg-primary/5"
                                      : ""
                                  }`}
                                >
                                  <Checkbox
                                    checked={field.value?.includes(option.value)}
                                    disabled={!isEditing}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, option.value]);
                                      } else {
                                        field.onChange(current.filter((v) => v !== option.value));
                                      }
                                    }}
                                  />
                                  <span className="text-sm">{option.label}</span>
                                </label>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={profileForm.control}
                          name="careerYears"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>경력 (년)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                  disabled={!isEditing}
                                  className={!isEditing ? "bg-gray-100" : ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={profileForm.control}
                        name="introduction"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>자기소개</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={4}
                                maxLength={500}
                                disabled={!isEditing}
                                className={!isEditing ? "bg-gray-100" : ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* School Admin-specific fields */}
                  {profile.userType === "school_admin" && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-medium">학교 관리자 정보</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={profileForm.control}
                          name="schoolName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>학교명</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditing}
                                  className={!isEditing ? "bg-gray-100" : ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="position"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>직위</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditing}
                                  className={!isEditing ? "bg-gray-100" : ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="department"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>담당 부서</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  disabled={!isEditing}
                                  className={!isEditing ? "bg-gray-100" : ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={profileForm.control}
                        name="schoolAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>학교 주소</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={!isEditing}
                                className={!isEditing ? "bg-gray-100" : ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Edit buttons */}
                  {isEditing && (
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          profileForm.reset();
                        }}
                      >
                        취소
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            저장 중...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            저장
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Password Change Card */}
          <Card>
            <CardHeader>
              <CardTitle>비밀번호 변경</CardTitle>
              <CardDescription>
                보안을 위해 주기적으로 비밀번호를 변경해주세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-6">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>현재 비밀번호</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showCurrentPassword ? "text" : "password"}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>새 비밀번호</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              placeholder="8자 이상, 영문/숫자/특수문자 포함"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <PasswordStrength password={newPassword} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPasswordConfirm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>새 비밀번호 확인</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showNewPasswordConfirm ? "text" : "password"}
                              placeholder="비밀번호를 다시 입력해주세요"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowNewPasswordConfirm(!showNewPasswordConfirm)}
                            >
                              {showNewPasswordConfirm ? (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          변경 중...
                        </>
                      ) : (
                        "비밀번호 변경"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Account Management Card */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">계정 관리</CardTitle>
              <CardDescription>
                로그아웃하거나 계정을 삭제할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button
                  variant="outline"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      로그아웃 중...
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-4 w-4" />
                      로그아웃
                    </>
                  )}
                </Button>

                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      계정 삭제
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>계정 삭제</DialogTitle>
                      <DialogDescription>
                        정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                      </DialogDescription>
                    </DialogHeader>

                    <Form {...deleteForm}>
                      <form onSubmit={deleteForm.handleSubmit(handleDeleteSubmit)} className="space-y-4">
                        <FormField
                          control={deleteForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>비밀번호 확인</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showDeletePassword ? "text" : "password"}
                                    placeholder="현재 비밀번호를 입력해주세요"
                                    {...field}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                                  >
                                    {showDeletePassword ? (
                                      <EyeOff className="h-4 w-4 text-gray-400" />
                                    ) : (
                                      <Eye className="h-4 w-4 text-gray-400" />
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={deleteForm.control}
                          name="confirm"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal">
                                  계정 삭제에 동의합니다. 모든 데이터가 삭제되며 복구할 수 없음을 이해합니다.
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setDeleteDialogOpen(false);
                              deleteForm.reset();
                            }}
                          >
                            취소
                          </Button>
                          <Button
                            type="submit"
                            variant="destructive"
                            disabled={deleteAccountMutation.isPending}
                          >
                            {deleteAccountMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                삭제 중...
                              </>
                            ) : (
                              "계정 삭제"
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
