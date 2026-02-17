package com.b26.backend.insights.api;

import java.util.List;

public record InsightsResponse(String boardId, long totalClicks, List<CardInsightsDto> byCard) {}
