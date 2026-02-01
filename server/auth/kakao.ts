/**
 * Kakao OAuth Integration
 *
 * Flow:
 * 1. Frontend redirects to GET /api/auth/kakao?userType=teacher|staff
 * 2. Server redirects to Kakao OAuth authorize URL
 * 3. User logs in with Kakao
 * 4. Kakao redirects to GET /api/auth/kakao/callback with authorization code
 * 5. Server exchanges code for access token
 * 6. Server gets user info from Kakao
 * 7. Server stores temp data in session and redirects to frontend info page
 */

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI || "http://localhost:5000/api/auth/kakao/callback";

// Kakao OAuth URLs
const KAKAO_AUTH_URL = "https://kauth.kakao.com/oauth/authorize";
const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";
const KAKAO_USER_INFO_URL = "https://kapi.kakao.com/v2/user/me";

export interface KakaoUserInfo {
  id: number;
  kakao_account?: {
    email?: string;
    email_needs_agreement?: boolean;
    is_email_valid?: boolean;
    is_email_verified?: boolean;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
    name?: string;
    name_needs_agreement?: boolean;
  };
  properties?: {
    nickname?: string;
    profile_image?: string;
  };
}

export interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  refresh_token_expires_in: number;
}

/**
 * Generate Kakao OAuth authorization URL
 */
export function getKakaoAuthUrl(userType: string): string {
  const params = new URLSearchParams({
    client_id: KAKAO_REST_API_KEY!,
    redirect_uri: KAKAO_REDIRECT_URI,
    response_type: "code",
    state: userType, // Pass userType through state parameter
  });

  return `${KAKAO_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function getKakaoToken(code: string): Promise<KakaoTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: KAKAO_REST_API_KEY!,
    redirect_uri: KAKAO_REDIRECT_URI,
    code,
  });

  // Add client_secret if configured
  if (KAKAO_CLIENT_SECRET) {
    params.append("client_secret", KAKAO_CLIENT_SECRET);
  }

  const response = await fetch(KAKAO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Kakao token error:", errorData);
    throw new Error(`Failed to get Kakao token: ${errorData.error_description || errorData.error}`);
  }

  return response.json();
}

/**
 * Get user info from Kakao
 */
export async function getKakaoUserInfo(accessToken: string): Promise<KakaoUserInfo> {
  const response = await fetch(KAKAO_USER_INFO_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Kakao user info error:", errorData);
    throw new Error(`Failed to get Kakao user info: ${errorData.msg || "Unknown error"}`);
  }

  return response.json();
}

/**
 * Extract user data from Kakao response
 */
export function extractKakaoUserData(kakaoUser: KakaoUserInfo) {
  const kakaoId = kakaoUser.id.toString();

  // Try to get name from various places
  const name =
    kakaoUser.kakao_account?.name ||
    kakaoUser.kakao_account?.profile?.nickname ||
    kakaoUser.properties?.nickname ||
    "";

  // Try to get email
  const email = kakaoUser.kakao_account?.email || "";

  // Profile image
  const profileImageUrl =
    kakaoUser.kakao_account?.profile?.profile_image_url ||
    kakaoUser.properties?.profile_image ||
    null;

  return {
    kakaoId,
    name,
    email,
    profileImageUrl,
  };
}
