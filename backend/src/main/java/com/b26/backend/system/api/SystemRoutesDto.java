package com.b26.backend.system.api;

public record SystemRoutesDto(
    String globalHomepageBoardId,
    String globalHomepageBoardUrl,
    String globalInsightsBoardId,
    String globalInsightsBoardUrl,
    String globalSettingsBoardId,
    String globalSettingsBoardUrl,
    String globalSigninBoardId,
    String globalSigninBoardUrl,
    String globalSignupBoardId,
    String globalSignupBoardUrl) {}
