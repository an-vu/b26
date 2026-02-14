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
};
