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
    firstLink = createLink("default");
    secondLink = createLink("default");
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
  void postClicks_areCountedPerTargetInSummary() throws Exception {
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
        .perform(auth(get("/api/insights/default/summary")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.boardId").value("default"))
        .andExpect(jsonPath("$.totalClicks").value(2))
        .andExpect(jsonPath("$.topClickedLinks.length()").value(2));
  }

  @Test
  void summaryListsAtMostFiveTopTargets() throws Exception {
    for (int i = 0; i < 7; i++) {
      mockMvc.perform(post(clickPath(createLink("default"))).contentType(org.springframework.http.MediaType.APPLICATION_JSON)
          .content(DEFAULT_CLICK_PAYLOAD)).andExpect(status().isNoContent());
    }
    mockMvc.perform(auth(get("/api/insights/default/summary")))
        .andExpect(jsonPath("$.totalClicks").value(7))
        .andExpect(jsonPath("$.topClickedLinks.length()").value(5));
  }

  @Test
  void forwardedClientAddressIsRecordedBehindTheProxy() throws Exception {
    mockMvc.perform(post("/api/insights/view").contentType(org.springframework.http.MediaType.APPLICATION_JSON)
            .header("X-Forwarded-For", "203.0.113.7, 10.0.0.2").content(DEFAULT_VIEW_PAYLOAD))
        .andExpect(status().isNoContent());
    org.junit.jupiter.api.Assertions.assertEquals("203.0.113.7",
        viewEventRepository.findAll().get(0).getSourceIp());
  }

  @Test
  void removedRawInsightsEndpointIsNotServed() throws Exception {
    mockMvc.perform(auth(get("/api/insights/default"))).andExpect(status().isNotFound());
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
