export type BoardAppearance = {
  theme: 'light' | 'dark';
  radiusStep: 1 | 2 | 3;
  backgroundColor: string;
  pattern: 'none' | 'dots' | 'grid' | 'diagonal' | 'reverse-diagonal' | 'stripes' | 'checkered';
};

export type Board = {
  appearance?: BoardAppearance;
  version?: number;
  id: string;
  boardName: string;
  boardUrl: string;
  ownerUsername?: string;
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
  appearance?: BoardAppearance;
  version?: number;
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

export type BoardPermissions = {
  canEdit: boolean;
};

export type BoardEdit = { board: Board; widgets: import('./widget').Widget[] };
export type SaveBoardEditRequest = {
  version: number;
  name: string;
  headline: string;
  widgets: import('./widget').UpsertWidgetWithIdRequest[];
};
