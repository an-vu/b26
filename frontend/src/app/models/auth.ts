export type SigninRequest = {
  email: string;
  password: string;
};

export type SignupRequest = {
  email: string;
  password: string;
  displayName: string;
  username: string;
};

export type AuthUser = {
  id: string;
  displayName: string;
  username: string;
  email: string | null;
  role: string;
};

export type AuthSessionResponse = {
  accessToken: string;
  expiresAt: string;
  user: AuthUser;
};

export type AuthMeResponse = {
  user: AuthUser;
};
