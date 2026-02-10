export type Card = {
  id: string;
  label: string;
  href: string;
};

export type Profile = {
  id: string;
  name: string;
  headline: string;
  cards: Card[];
};
