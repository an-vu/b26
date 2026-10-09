import type { BoardColorMode, BoardThemeId } from '../themes/board-theme';

export type BoardAppearance = {
  spacingStep?: 1 | 2 | 3;
  themeFamily?: BoardThemeId;
  patternIntensity?: 'light' | 'medium' | 'heavy';
  // Legacy API field: this stores color mode, not the visual theme family.
  theme: BoardColorMode;
  radiusStep: 1 | 2 | 3 | 4 | 5;
  backgroundColor: string;
  pattern: 'none' | 'dots' | 'grid' | 'diagonal' | 'reverse-diagonal' | 'stripes' | 'checkered' | 'rainfall' | 'stars' | 'snow' | 'sakura' | 'wave' | 'lava' | 'bokeh';
};

export type Board = {
  visibility?: 'public' | 'private';
  appearance?: BoardAppearance;
  version?: number;
  id: string;
  boardName: string;
  boardUrl: string;
  ownerUsername?: string;
  ownerDisplayName?: string;
  website?: string;
  name: string;
  headline: string;
};

export type BoardPage = { items: Board[]; page: number; size: number; totalElements: number; totalPages: number };

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
  displayName?: string;
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
  ownerDisplayName?: string;
  website?: string;
  version: number;
  name: string;
  headline: string;
  widgets: import('./widget').UpsertWidgetWithIdRequest[];
};
