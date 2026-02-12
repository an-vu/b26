export type Profile = {
  id: string;
  name: string;
  headline: string;
};

export type Card = {
  id: string;
  label: string;
  href: string;
};

export type UpdateProfileRequest = {
  name: string;
  headline: string;
  cards: Card[];
};

export type UpdateProfileMetaRequest = {
  name: string;
  headline: string;
};
