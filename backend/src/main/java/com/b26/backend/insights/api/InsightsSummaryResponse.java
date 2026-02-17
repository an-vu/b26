package com.b26.backend.insights.api;

import java.util.List;

public record InsightsSummaryResponse(
    String boardId,
    long totalVisits,
    long visitsLast30Days,
    long visitsToday,
    long totalClicks,
    List<CardInsightsDto> topClickedLinks) {}
