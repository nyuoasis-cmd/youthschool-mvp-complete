import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - Contains at least one letter
 * - Contains at least one number
 * - Contains at least one special character
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("비밀번호는 8자 이상이어야 합니다");
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push("영문을 포함해야 합니다");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("숫자를 포함해야 합니다");
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push("특수문자를 포함해야 합니다");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
