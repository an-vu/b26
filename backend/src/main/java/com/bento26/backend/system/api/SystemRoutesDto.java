package com.bento26.backend.system.api;

public record SystemRoutesDto(
    String globalHomepageBoardId,
    String globalHomepageBoardUrl,
    String globalInsightsBoardId,
    String globalInsightsBoardUrl,
    String globalSettingsBoardId,
    String globalSettingsBoardUrl,
    String globalLoginBoardId,
    String globalLoginBoardUrl) {}
