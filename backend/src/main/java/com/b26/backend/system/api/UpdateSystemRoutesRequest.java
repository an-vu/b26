package com.b26.backend.system.api;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;

public record UpdateSystemRoutesRequest(
    @NotBlank(message = "globalHomepageBoardId is required") String globalHomepageBoardId,
    @NotBlank(message = "globalInsightsBoardId is required") String globalInsightsBoardId,
    @NotBlank(message = "globalSettingsBoardId is required") String globalSettingsBoardId,
    @JsonAlias("globalLoginBoardId") String globalSigninBoardId) {}
