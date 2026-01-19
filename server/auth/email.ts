import nodemailer from "nodemailer";

// Email configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || "noreply@youthschool.kr";
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER && SMTP_PASS ? {
    user: SMTP_USER,
    pass: SMTP_PASS,
  } : undefined,
});

/**
 * Check if email is configured
 */
export function isEmailConfigured(): boolean {
  return !!(SMTP_USER && SMTP_PASS);
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  name: string
): Promise<void> {
  const verificationUrl = `${BASE_URL}/api/auth/verify-email/${token}`;

  const mailOptions = {
    from: `유스쿨 <${SMTP_FROM}>`,
    to: email,
    subject: "[유스쿨] 이메일 인증을 완료해주세요",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
          .content { background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">유스쿨</div>
          </div>
          <div class="content">
            <h2>안녕하세요, ${name}님!</h2>
            <p>유스쿨에 가입해주셔서 감사합니다.</p>
            <p>아래 버튼을 클릭하여 이메일 인증을 완료해주세요.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" class="button">이메일 인증하기</a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              버튼이 작동하지 않으면 아래 링크를 복사하여 브라우저에 붙여넣기 해주세요:<br>
              <a href="${verificationUrl}" style="color: #2563eb;">${verificationUrl}</a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              이 링크는 24시간 동안 유효합니다.
            </p>
          </div>
          <div class="footer">
            <p>본 메일은 유스쿨 회원가입 시 입력한 이메일로 발송되었습니다.</p>
            <p>&copy; 2025 유스쿨. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  if (isEmailConfigured()) {
    await transporter.sendMail(mailOptions);
  } else {
    // Development mode: log to console
    console.log("\n========== EMAIL VERIFICATION ==========");
    console.log(`To: ${email}`);
    console.log(`Name: ${name}`);
    console.log(`Verification URL: ${verificationUrl}`);
    console.log("==========================================\n");
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  name: string
): Promise<void> {
  const resetUrl = `${BASE_URL}/password/reset?token=${token}`;

  const mailOptions = {
    from: `유스쿨 <${SMTP_FROM}>`,
    to: email,
    subject: "[유스쿨] 비밀번호 재설정 안내",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
          .content { background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">유스쿨</div>
          </div>
          <div class="content">
            <h2>비밀번호 재설정</h2>
            <p>안녕하세요, ${name}님.</p>
            <p>비밀번호 재설정 요청이 접수되었습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="button">비밀번호 재설정하기</a>
            </p>
            <div class="warning">
              <strong>주의:</strong> 이 링크는 30분 동안만 유효하며, 1회만 사용 가능합니다.
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              버튼이 작동하지 않으면 아래 링크를 복사하여 브라우저에 붙여넣기 해주세요:<br>
              <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              본인이 요청하지 않으셨다면 이 메일을 무시해주세요. 비밀번호는 변경되지 않습니다.
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2025 유스쿨. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  if (isEmailConfigured()) {
    await transporter.sendMail(mailOptions);
  } else {
    // Development mode: log to console
    console.log("\n========== PASSWORD RESET EMAIL ==========");
    console.log(`To: ${email}`);
    console.log(`Name: ${name}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log("============================================\n");
  }
}

/**
 * Send school admin approval notification email
 */
export async function sendApprovalNotificationEmail(
  email: string,
  name: string,
  approved: boolean
): Promise<void> {
  const subject = approved
    ? "[유스쿨] 학교 관리자 승인 완료"
    : "[유스쿨] 학교 관리자 승인 거부";

  const mailOptions = {
    from: `유스쿨 <${SMTP_FROM}>`,
    to: email,
    subject,
    html: approved
      ? `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
            .content { background: #f0fdf4; border-radius: 8px; padding: 30px; margin-bottom: 20px; }
            .success { color: #10b981; font-size: 48px; text-align: center; margin-bottom: 20px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">유스쿨</div>
            </div>
            <div class="content">
              <div class="success">&#10003;</div>
              <h2 style="text-align: center;">승인 완료</h2>
              <p>안녕하세요, ${name}님.</p>
              <p>학교 관리자 계정이 승인되었습니다. 이제 유스쿨의 모든 서비스를 이용하실 수 있습니다.</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${BASE_URL}/login" class="button">로그인하기</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2025 유스쿨. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
      : `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
            .content { background: #fef2f2; border-radius: 8px; padding: 30px; margin-bottom: 20px; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">유스쿨</div>
            </div>
            <div class="content">
              <h2>승인 거부</h2>
              <p>안녕하세요, ${name}님.</p>
              <p>죄송합니다. 제출하신 서류 검토 결과, 학교 관리자 계정 승인이 거부되었습니다.</p>
              <p>자세한 내용은 고객센터로 문의해주세요.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 유스쿨. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
  };

  if (isEmailConfigured()) {
    await transporter.sendMail(mailOptions);
  } else {
    console.log("\n========== APPROVAL NOTIFICATION EMAIL ==========");
    console.log(`To: ${email}`);
    console.log(`Name: ${name}`);
    console.log(`Approved: ${approved}`);
    console.log("==================================================\n");
  }
}

export async function sendApprovalResultEmail(
  email: string,
  name: string,
  approved: boolean
): Promise<void> {
  const subject = approved
    ? "[YouthSchool] 회원가입이 승인되었습니다"
    : "[YouthSchool] 회원가입 승인 결과 안내";

  const html = approved
    ? `
      <div style="font-family: 'Pretendard', sans-serif; line-height: 1.6; color: #333;">
        <h2>안녕하세요, ${name}님!</h2>
        <p>회원가입이 승인되었습니다. 이제 모든 서비스를 이용하실 수 있습니다.</p>
        <p><a href="${BASE_URL}/login">로그인하기</a></p>
      </div>
    `
    : `
      <div style="font-family: 'Pretendard', sans-serif; line-height: 1.6; color: #333;">
        <h2>회원가입 승인 결과</h2>
        <p>회원가입 승인이 완료되지 않았습니다. 자세한 사항은 문의해주세요.</p>
      </div>
    `;

  if (isEmailConfigured()) {
    await transporter.sendMail({
      from: `유스쿨 <${SMTP_FROM}>`,
      to: email,
      subject,
      html,
    });
  } else {
    console.log("\n========== APPROVAL RESULT EMAIL ==========");
    console.log(`To: ${email}`);
    console.log(`Name: ${name}`);
    console.log(`Approved: ${approved}`);
    console.log("===========================================\n");
  }
}

export async function sendRejectionEmail(
  email: string,
  name: string,
  reason: string
): Promise<void> {
  const subject = "[YouthSchool] 회원가입 신청 검토 결과 안내";
  const html = `
    <div style="font-family: 'Pretendard', sans-serif; line-height: 1.6; color: #333;">
      <h2>안녕하세요, ${name}님.</h2>
      <p>회원가입 신청을 검토한 결과 승인이 어렵습니다.</p>
      <p><strong>반려 사유:</strong> ${reason}</p>
    </div>
  `;

  if (isEmailConfigured()) {
    await transporter.sendMail({
      from: `유스쿨 <${SMTP_FROM}>`,
      to: email,
      subject,
      html,
    });
  } else {
    console.log("\n========== REJECTION EMAIL ==========");
    console.log(`To: ${email}`);
    console.log(`Name: ${name}`);
    console.log(`Reason: ${reason}`);
    console.log("=====================================\n");
  }
}

export async function sendSuspensionEmail(
  email: string,
  name: string,
  reason: string,
  startDate: Date,
  endDate: Date | null
): Promise<void> {
  const subject = "[YouthSchool] 계정 이용 제한 안내";
  const html = `
    <div style="font-family: 'Pretendard', sans-serif; line-height: 1.6; color: #333;">
      <h2>안녕하세요, ${name}님.</h2>
      <p>계정 이용이 일시적으로 제한되었습니다.</p>
      <p><strong>정지 사유:</strong> ${reason}</p>
      <p><strong>정지 기간:</strong> ${startDate.toLocaleString("ko-KR")} ~ ${
        endDate ? endDate.toLocaleString("ko-KR") : "무기한"
      }</p>
    </div>
  `;

  if (isEmailConfigured()) {
    await transporter.sendMail({
      from: `유스쿨 <${SMTP_FROM}>`,
      to: email,
      subject,
      html,
    });
  } else {
    console.log("\n========== SUSPENSION EMAIL ==========");
    console.log(`To: ${email}`);
    console.log(`Name: ${name}`);
    console.log(`Reason: ${reason}`);
    console.log(`Period: ${startDate.toISOString()} ~ ${endDate?.toISOString() || "indefinite"}`);
    console.log("=====================================\n");
  }
}

export async function sendUnsuspensionEmail(
  email: string,
  name: string
): Promise<void> {
  const subject = "[YouthSchool] 계정 이용 제한 해제 안내";
  const html = `
    <div style="font-family: 'Pretendard', sans-serif; line-height: 1.6; color: #333;">
      <h2>안녕하세요, ${name}님.</h2>
      <p>계정 이용 제한이 해제되었습니다. 다시 서비스를 이용하실 수 있습니다.</p>
    </div>
  `;

  if (isEmailConfigured()) {
    await transporter.sendMail({
      from: `유스쿨 <${SMTP_FROM}>`,
      to: email,
      subject,
      html,
    });
  } else {
    console.log("\n========== UNSUSPENSION EMAIL ==========");
    console.log(`To: ${email}`);
    console.log(`Name: ${name}`);
    console.log("=======================================\n");
  }
}

export async function sendDeletionEmail(
  email: string,
  name: string,
  reason: string,
  deletionType: string,
  permanentDeletionDate: Date | null
): Promise<void> {
  const subject = "[YouthSchool] 계정 삭제 안내";
  const html = `
    <div style="font-family: 'Pretendard', sans-serif; line-height: 1.6; color: #333;">
      <h2>안녕하세요, ${name}님.</h2>
      <p>계정이 삭제 처리되었습니다.</p>
      <p><strong>삭제 사유:</strong> ${reason}</p>
      <p><strong>삭제 유형:</strong> ${deletionType === "hard" ? "영구 삭제" : "소프트 삭제"}</p>
      ${permanentDeletionDate ? `<p><strong>영구 삭제 예정일:</strong> ${permanentDeletionDate.toLocaleString("ko-KR")}</p>` : ""}
    </div>
  `;

  if (isEmailConfigured()) {
    await transporter.sendMail({
      from: `유스쿨 <${SMTP_FROM}>`,
      to: email,
      subject,
      html,
    });
  } else {
    console.log("\n========== DELETION EMAIL ==========");
    console.log(`To: ${email}`);
    console.log(`Name: ${name}`);
    console.log(`Reason: ${reason}`);
    console.log(`Type: ${deletionType}`);
    console.log("===================================\n");
  }
}

export async function sendAdminPasswordResetEmail(
  email: string,
  name: string,
  temporaryPassword: string
): Promise<void> {
  const subject = "[YouthSchool] 임시 비밀번호 발급 안내";
  const html = `
    <div style="font-family: 'Pretendard', sans-serif; line-height: 1.6; color: #333;">
      <h2>안녕하세요, ${name}님.</h2>
      <p>관리자가 임시 비밀번호를 발급했습니다.</p>
      <p><strong>임시 비밀번호:</strong> ${temporaryPassword}</p>
      <p>로그인 후 반드시 비밀번호를 변경해주세요.</p>
    </div>
  `;

  if (isEmailConfigured()) {
    await transporter.sendMail({
      from: `유스쿨 <${SMTP_FROM}>`,
      to: email,
      subject,
      html,
    });
  } else {
    console.log("\n========== ADMIN PASSWORD RESET EMAIL ==========");
    console.log(`To: ${email}`);
    console.log(`Name: ${name}`);
    console.log(`Temporary Password: ${temporaryPassword}`);
    console.log("================================================\n");
  }
}
