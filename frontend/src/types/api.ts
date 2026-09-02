export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta: Record<string, unknown>;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown> | unknown[];
  };
  requestId: string;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  status: string;
  role: string;
  roles: string[];
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface AuthSessionPayload {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface FeatureFlagsData {
  demoMode: boolean;
  features: Record<string, boolean>;
}
