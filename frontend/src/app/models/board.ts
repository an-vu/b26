export type Board = {
  id: string;
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
