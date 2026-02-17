package com.bento26.backend.system.api;

import jakarta.validation.constraints.NotBlank;

public record UpdateSystemRoutesRequest(
    @NotBlank(message = "globalHomepageBoardId is required") String globalHomepageBoardId,
    @NotBlank(message = "globalInsightsBoardId is required") String globalInsightsBoardId,
    @NotBlank(message = "globalSettingsBoardId is required") String globalSettingsBoardId,
    String globalLoginBoardId) {}
