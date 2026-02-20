package com.b26.backend;

import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class InsightsApiIntegrationTest extends ApiIntegrationTestSupport {

  @Test
  void postClick_andGetInsights_work() throws Exception {
    mockMvc
        .perform(
            post("/api/click/github")
                .content(DEFAULT_CLICK_PAYLOAD)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            post("/api/click/linkedin")
                .content(DEFAULT_CLICK_PAYLOAD)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/api/insights/default"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.boardId").value("default"))
        .andExpect(jsonPath("$.totalClicks").value(2))
        .andExpect(jsonPath("$.byCard.length()").value(2));
  }

  @Test
  void postClick_invalidCard_returns400() throws Exception {
    mockMvc
        .perform(
            post("/api/click/not-a-card")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content(DEFAULT_CLICK_PAYLOAD))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.message").value("Card 'not-a-card' does not belong to board 'default'"));
  }

  @Test
  void postClick_rateLimited_returns429() throws Exception {
    mockMvc
        .perform(
            post("/api/click/github")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content(DEFAULT_CLICK_PAYLOAD))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            post("/api/click/github")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content(DEFAULT_CLICK_PAYLOAD))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.message").value("Too many click events. Try again shortly."));
  }

  @Test
  void postView_andGetSummary_work() throws Exception {
    mockMvc
        .perform(
            post("/api/insights/view")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .header("User-Agent", "Mozilla/5.0 (iPhone)")
                .content(DEFAULT_VIEW_PAYLOAD))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            post("/api/click/github")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content(DEFAULT_CLICK_PAYLOAD))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/api/insights/default/summary"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.boardId").value("default"))
        .andExpect(jsonPath("$.totalVisits").value(1))
        .andExpect(jsonPath("$.visitsLast30Days").value(1))
        .andExpect(jsonPath("$.visitsToday").value(1))
        .andExpect(jsonPath("$.totalClicks").value(1))
        .andExpect(jsonPath("$.topClickedLinks[0].cardId").value("github"))
        .andExpect(jsonPath("$.topClickedLinks[0].clickCount").value(1));
  }

  @Test
  void postView_missingBoard_returns404() throws Exception {
    String viewPayload =
        """
        { "boardId": "not-here", "source": "direct" }
        """;

    mockMvc
        .perform(
            post("/api/insights/view")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content(viewPayload))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.message").value("Board not found: not-here"));
  }
}
