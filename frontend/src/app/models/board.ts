export type Board = {
  id: string;
  boardName: string;
  boardUrl: string;
  name: string;
  headline: string;
};

export type Card = {
  id: string;
  label: string;
  href: string;
};

export type UpdateBoardRequest = {
  name: string;
  headline: string;
  cards: Card[];
};

export type UpdateBoardMetaRequest = {
  name: string;
  headline: string;
};

export type UpdateBoardUrlRequest = {
  boardUrl: string;
};

export type UpdateBoardIdentityRequest = {
  boardName: string;
  boardUrl: string;
};

export type SystemRoutes = {
  globalHomepageBoardId: string;
  globalHomepageBoardUrl: string;
  globalInsightsBoardId: string;
  globalInsightsBoardUrl: string;
  globalSettingsBoardId: string;
  globalSettingsBoardUrl: string;
  globalSigninBoardId?: string;
  globalSigninBoardUrl?: string;
  globalLoginBoardId?: string;
  globalLoginBoardUrl?: string;
};

export type UpdateSystemRoutesRequest = {
  globalHomepageBoardId: string;
  globalInsightsBoardId: string;
  globalSettingsBoardId: string;
  globalSigninBoardId?: string;
  globalLoginBoardId?: string;
};

export type UserPreferences = {
  userId: string;
  username: string;
  mainBoardId: string;
  mainBoardUrl: string;
};

export type UpdateUserPreferencesRequest = {
  mainBoardId: string;
};

export type UserMainBoard = {
  userId: string;
  username: string;
  mainBoardId: string;
  mainBoardUrl: string;
};

export type UserProfile = {
  userId: string;
  displayName: string;
  username: string;
  email: string | null;
};

export type UpdateUserProfileRequest = {
  displayName: string;
  username: string;
  email: string | null;
};
