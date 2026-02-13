package com.bento26.backend.analytics.api;

import java.util.List;

public record AnalyticsSummaryResponse(
    String boardId,
    long totalVisits,
    long visitsLast30Days,
    long visitsToday,
    long totalClicks,
    List<CardAnalyticsDto> topClickedLinks) {}
