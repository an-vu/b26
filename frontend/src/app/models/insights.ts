export type CardInsights = {
  cardId: string;
  clickCount: number;
};

export type InsightsSummary = {
  boardId: string;
  totalVisits: number;
  visitsLast30Days: number;
  visitsToday: number;
  totalClicks: number;
  topClickedLinks: CardInsights[];
};
