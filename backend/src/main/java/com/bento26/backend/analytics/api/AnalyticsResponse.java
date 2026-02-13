package com.bento26.backend.analytics.api;

import java.util.List;

public record AnalyticsResponse(String boardId, long totalClicks, List<CardAnalyticsDto> byCard) {}
