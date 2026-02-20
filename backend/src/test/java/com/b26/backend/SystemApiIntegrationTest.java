package com.b26.backend;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SystemApiIntegrationTest extends ApiIntegrationTestSupport {

  @Test
  void getSystemRoutes_returns200() throws Exception {
    mockMvc
        .perform(get(API_SYSTEM_ROUTES))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.globalHomepageBoardId").isNotEmpty())
        .andExpect(jsonPath("$.globalHomepageBoardUrl").isNotEmpty())
        .andExpect(jsonPath("$.globalInsightsBoardId").isNotEmpty())
        .andExpect(jsonPath("$.globalInsightsBoardUrl").isNotEmpty())
        .andExpect(jsonPath("$.globalSettingsBoardId").isNotEmpty())
        .andExpect(jsonPath("$.globalSettingsBoardUrl").isNotEmpty())
        .andExpect(jsonPath("$.globalSigninBoardId").isNotEmpty())
        .andExpect(jsonPath("$.globalSigninBoardUrl").isNotEmpty());
  }

  @Test
  void patchSystemRoutes_valid_returns200() throws Exception {
    String payload =
        """
        {
          "globalHomepageBoardId": "default",
          "globalInsightsBoardId": "insights",
          "globalSettingsBoardId": "settings"
        }
        """;

    mockMvc
        .perform(
            patch(API_SYSTEM_ROUTES)
                .header(AUTHORIZATION_HEADER, authAnvu())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.globalHomepageBoardId").value("default"))
        .andExpect(jsonPath("$.globalInsightsBoardId").value("insights"))
        .andExpect(jsonPath("$.globalSettingsBoardId").value("settings"))
        .andExpect(jsonPath("$.globalSigninBoardId").isNotEmpty())
        .andExpect(jsonPath("$.globalSigninBoardUrl").isNotEmpty());
  }
}
