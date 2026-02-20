package com.b26.backend;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LegacyRoutesIntegrationTest extends ApiIntegrationTestSupport {

  @Test
  void legacyAnalyticsEndpoints_removed() throws Exception {
    mockMvc
        .perform(
            post("/api/analytics/view")
                .contentType(MediaType.APPLICATION_JSON)
                .content(DEFAULT_VIEW_PAYLOAD))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(get("/api/analytics/default/summary"))
        .andExpect(status().isNotFound());
  }
}
