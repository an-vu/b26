export type BoardIdentity = {
  id: string;
  boardName: string;
  boardUrl: string;
  ownerUsername?: string;
  visibility?: "public" | "private";
};
