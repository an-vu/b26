export type CardAnalytics = {
  cardId: string;
  clickCount: number;
};

export type AnalyticsSummary = {
  boardId: string;
  totalVisits: number;
  visitsLast30Days: number;
  visitsToday: number;
  totalClicks: number;
  topClickedLinks: CardAnalytics[];
};
