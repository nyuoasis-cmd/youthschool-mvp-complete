import crypto from "crypto";

/**
 * Generate a random token for email verification or password reset
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generate a 6-digit verification code for SMS
 */
export function generatePhoneCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Get expiration date for email verification (24 hours)
 */
export function getEmailVerificationExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry;
}

/**
 * Get expiration date for password reset (30 minutes)
 */
export function getPasswordResetExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 30);
  return expiry;
}

/**
 * Get expiration date for phone verification code (3 minutes)
 */
export function getPhoneCodeExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 3);
  return expiry;
}

/**
 * Check if a token/code has expired
 */
export function isExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Send SMS verification code (mock implementation for development)
 * In production, integrate with NHN Cloud, CoolSMS, or similar service
 */
export async function sendVerificationSMS(phone: string, code: string): Promise<void> {
  // Development mode: log to console
  console.log("\n========== SMS VERIFICATION CODE ==========");
  console.log(`Phone: ${phone}`);
  console.log(`Code: ${code}`);
  console.log(`Expires in: 3 minutes`);
  console.log("============================================\n");

  // In production, integrate with SMS API:
  // const smsApiKey = process.env.SMS_API_KEY;
  // const smsApiSecret = process.env.SMS_API_SECRET;
  // const message = `[유스쿨] 인증번호는 ${code}입니다. 3분 이내에 입력해주세요.`;
  // await sendSMS(phone, message);
}

/**
 * Mask email for privacy (e.g., test@example.com -> te**@example.com)
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart.substring(0, 2)}***@${domain}`;
}

/**
 * Mask phone number for privacy (e.g., 010-1234-5678 -> 010-****-5678)
 */
export function maskPhone(phone: string): string {
  const parts = phone.split("-");
  if (parts.length === 3) {
    return `${parts[0]}-****-${parts[2]}`;
  }
  return phone.substring(0, 4) + "****" + phone.substring(phone.length - 4);
}
