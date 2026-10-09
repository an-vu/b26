package com.b26.backend;

import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class InsightsApiIntegrationTest extends ApiIntegrationTestSupport {
  private long firstLink;
  private long secondLink;

  @org.junit.jupiter.api.BeforeEach
  void createLinkTargets() throws Exception {
    firstLink = createLink();
    secondLink = createLink();
  }

  private long createLink() throws Exception {
    var result = mockMvc.perform(authJson(post(API_BOARD_DEFAULT_WIDGETS),
        "{\"type\":\"link\",\"title\":\"Link\",\"layout\":\"span-1\",\"config\":{\"url\":\"https://example.com\"},\"enabled\":true,\"order\":0}"))
        .andExpect(status().isCreated()).andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
  }

  private String clickPath(long id) {
    return "/api/insights/widgets/" + id + "/click";
  }


  @org.springframework.beans.factory.annotation.Autowired
  com.b26.backend.widget.persistence.WidgetRepository widgets;

  @Test
  @org.springframework.transaction.annotation.Transactional
  void clicksRespectBoardVisibilityWidgetOwnershipAndEnabledState() throws Exception {
    var widget = widgets.findById(firstLink).orElseThrow();
    widget.setEnabled(false); widgets.saveAndFlush(widget);
    mockMvc.perform(post(clickPath(firstLink)).contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        .content(DEFAULT_CLICK_PAYLOAD)).andExpect(status().isNotFound());
    widget.setEnabled(true); widgets.saveAndFlush(widget);
    mockMvc.perform(post(clickPath(firstLink)).contentType(org.springframework.http.MediaType.APPLICATION_JSON)
        .content("{\"boardId\":\"berkshire\"}")).andExpect(status().isNotFound());
    var board = boardRepository.findById("default").orElseThrow();
    try {
      board.setVisibility("private"); boardRepository.saveAndFlush(board);
      mockMvc.perform(post(clickPath(firstLink)).contentType(org.springframework.http.MediaType.APPLICATION_JSON)
          .content(DEFAULT_CLICK_PAYLOAD)).andExpect(status().isNotFound());
      mockMvc.perform(authJson(post(clickPath(firstLink)), DEFAULT_CLICK_PAYLOAD)).andExpect(status().isNoContent());
    } finally {
      board.setVisibility("public"); boardRepository.saveAndFlush(board);
    }
  }

  @Test
  void postClick_andGetInsights_work() throws Exception {
    mockMvc
        .perform(
            post(clickPath(firstLink))
                .content(DEFAULT_CLICK_PAYLOAD)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            post(clickPath(secondLink))
                .content(DEFAULT_CLICK_PAYLOAD)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(auth(get("/api/insights/default")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.boardId").value("default"))
        .andExpect(jsonPath("$.totalClicks").value(2))
        .andExpect(jsonPath("$.byTarget.length()").value(2));
  }

  @Test
  void postClick_missingWidget_returns404() throws Exception {
    mockMvc
        .perform(
            post(clickPath(Long.MAX_VALUE))
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content(DEFAULT_CLICK_PAYLOAD))
        .andExpect(status().isNotFound())
        .andExpect(
            jsonPath("$.message").value("Widget '" + Long.MAX_VALUE + "' not found for board 'default'"));
  }

  @Test
  void postClick_rateLimited_returns429() throws Exception {
    mockMvc
        .perform(
            post(clickPath(firstLink))
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content(DEFAULT_CLICK_PAYLOAD))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            post(clickPath(firstLink))
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
            post(clickPath(firstLink))
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .content(DEFAULT_CLICK_PAYLOAD))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(auth(get("/api/insights/default/summary")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.boardId").value("default"))
        .andExpect(jsonPath("$.totalVisits").value(1))
        .andExpect(jsonPath("$.visitsLast30Days").value(1))
        .andExpect(jsonPath("$.visitsToday").value(1))
        .andExpect(jsonPath("$.totalClicks").value(1))
        .andExpect(jsonPath("$.topClickedLinks[0].targetId").value("widget:" + firstLink))
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
