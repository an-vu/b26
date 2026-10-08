import type { BoardAppearance } from './board';

export type BoardIdentity = {
  appearance?: BoardAppearance;
  id: string;
  boardName: string;
  boardUrl: string;
  ownerUsername?: string;
  visibility?: "public" | "private";
};
