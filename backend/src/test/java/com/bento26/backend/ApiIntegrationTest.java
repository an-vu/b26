package com.bento26.backend;

import com.bento26.backend.insights.domain.ClickAbuseGuard;
import com.bento26.backend.insights.persistence.ClickEventRepository;
import com.bento26.backend.insights.persistence.ViewEventRepository;
import com.bento26.backend.board.persistence.BoardRepository;
import com.bento26.backend.user.persistence.UserPreferenceRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("null")
class ApiIntegrationTest {
  @Autowired private MockMvc mockMvc;
  @Autowired private ClickEventRepository clickEventRepository;
  @Autowired private ViewEventRepository viewEventRepository;
  @Autowired private ClickAbuseGuard clickAbuseGuard;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private BoardRepository boardRepository;
  @Autowired private UserPreferenceRepository userPreferenceRepository;

  @BeforeEach
  void clearClicks() {
    clickEventRepository.deleteAll();
    viewEventRepository.deleteAll();
    clickAbuseGuard.clear();
  }

  @Test
  void getBoard_returns200() throws Exception {
    mockMvc
        .perform(get("/api/board/default"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value("default"))
        .andExpect(jsonPath("$.name").isNotEmpty());
  }

  @Test
  void getBoards_returns200() throws Exception {
    mockMvc
        .perform(get("/api/board"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$[0].boardName").isNotEmpty())
        .andExpect(jsonPath("$[0].boardUrl").isNotEmpty());
  }

  @Test
  void getSystemRoutes_returns200() throws Exception {
    mockMvc
        .perform(get("/api/system/routes"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.globalHomepageBoardId").isNotEmpty())
        .andExpect(jsonPath("$.globalHomepageBoardUrl").isNotEmpty())
        .andExpect(jsonPath("$.globalInsightsBoardId").isNotEmpty())
        .andExpect(jsonPath("$.globalInsightsBoardUrl").isNotEmpty())
        .andExpect(jsonPath("$.globalSettingsBoardId").isNotEmpty())
        .andExpect(jsonPath("$.globalSettingsBoardUrl").isNotEmpty())
        .andExpect(jsonPath("$.globalLoginBoardId").isNotEmpty())
        .andExpect(jsonPath("$.globalLoginBoardUrl").isNotEmpty());
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
            patch("/api/system/routes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.globalHomepageBoardId").value("default"))
        .andExpect(jsonPath("$.globalInsightsBoardId").value("insights"))
        .andExpect(jsonPath("$.globalSettingsBoardId").value("settings"))
        .andExpect(jsonPath("$.globalLoginBoardId").isNotEmpty())
        .andExpect(jsonPath("$.globalLoginBoardUrl").isNotEmpty());
  }

  @Test
  void getBoard_missing_returns404() throws Exception {
    mockMvc
        .perform(get("/api/board/not-here"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.message").value("Board not found: not-here"));
  }

  @Test
  void putBoard_valid_returns200AndPersists() throws Exception {
    String payload =
        """
        {
          "name": "Updated Name",
          "headline": "Updated Headline",
          "cards": [
            { "id": "github", "label": "GitHub", "href": "https://github.com/" },
            { "id": "linkedin", "label": "LinkedIn", "href": "https://linkedin.com/" }
          ]
        }
        """;

    mockMvc
        .perform(
            put("/api/board/default")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Updated Name"));

    mockMvc
        .perform(get("/api/board/default"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Updated Name"));
  }

  @Test
  void patchBoardUrl_valid_returns200AndPersists() throws Exception {
    String payload =
        """
        {
          "boardUrl": "default-updated"
        }
        """;

    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/board/default/url")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.boardUrl").value("default-updated"));

    mockMvc
        .perform(get("/api/board/default-updated"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.boardUrl").value("default-updated"));

    String rollbackPayload =
        """
        {
          "boardUrl": "default"
        }
        """;

    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/board/default-updated/url")
                .contentType(MediaType.APPLICATION_JSON)
                .content(rollbackPayload))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.boardUrl").value("default"));
  }

  @Test
  void patchBoardUrl_invalidFormat_returns400() throws Exception {
    String payload =
        """
        {
          "boardUrl": "Default Updated"
        }
        """;

    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/board/default/url")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("Validation failed"));
  }

  @Test
  void putBoard_invalid_returns400WithStructuredErrors() throws Exception {
    String payload =
        """
        {
          "name": "",
          "headline": "",
          "cards": []
        }
        """;

    mockMvc
        .perform(
            put("/api/board/default")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("Validation failed"))
        .andExpect(jsonPath("$.errors").isArray());
  }

  @Test
  void postClick_andGetInsights_work() throws Exception {
    String clickPayload =
        """
        { "boardId": "default" }
        """;

    mockMvc
        .perform(
            post("/api/click/github")
                .contentType(MediaType.APPLICATION_JSON)
                .content(clickPayload))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            post("/api/click/linkedin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(clickPayload))
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
    String clickPayload =
        """
        { "boardId": "default" }
        """;

    mockMvc
        .perform(
            post("/api/click/not-a-card")
                .contentType(MediaType.APPLICATION_JSON)
                .content(clickPayload))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.message")
                .value("Card 'not-a-card' does not belong to board 'default'"));
  }

  @Test
  void postClick_rateLimited_returns429() throws Exception {
    String clickPayload =
        """
        { "boardId": "default" }
        """;

    mockMvc
        .perform(
            post("/api/click/github")
                .contentType(MediaType.APPLICATION_JSON)
                .content(clickPayload))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            post("/api/click/github")
                .contentType(MediaType.APPLICATION_JSON)
                .content(clickPayload))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.message").value("Too many click events. Try again shortly."));
  }

  @Test
  void postView_andGetSummary_work() throws Exception {
    String viewPayload =
        """
        { "boardId": "default", "source": "direct" }
        """;
    String clickPayload =
        """
        { "boardId": "default" }
        """;

    mockMvc
        .perform(
            post("/api/insights/view")
                .contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "Mozilla/5.0 (iPhone)")
                .content(viewPayload))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            post("/api/click/github")
                .contentType(MediaType.APPLICATION_JSON)
                .content(clickPayload))
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
  void getMyUserPreferences_returns200() throws Exception {
    mockMvc
        .perform(get("/api/users/me/preferences"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.userId").value("anvu"))
        .andExpect(jsonPath("$.username").value("anvu"))
        .andExpect(jsonPath("$.mainBoardId").isNotEmpty())
        .andExpect(jsonPath("$.mainBoardUrl").isNotEmpty());
  }

  @Test
  void getMyUserProfile_returns200() throws Exception {
    mockMvc
        .perform(get("/api/users/me"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.userId").value("anvu"))
        .andExpect(jsonPath("$.displayName").isNotEmpty())
        .andExpect(jsonPath("$.username").value("anvu"));
  }

  @Test
  void patchMyUserProfile_valid_returns200() throws Exception {
    String payload =
        """
        {
          "displayName": "An Vu",
          "username": "anvu",
          "email": "anvu@local"
        }
        """;

    mockMvc
        .perform(
            patch("/api/users/me")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.displayName").value("An Vu"))
        .andExpect(jsonPath("$.username").value("anvu"))
        .andExpect(jsonPath("$.email").value("anvu@local"));
  }

  @Test
  void patchMyUserProfile_invalidUsername_returns400() throws Exception {
    String payload =
        """
        {
          "displayName": "An Vu",
          "username": "An Vu",
          "email": "anvu@local"
        }
        """;

    mockMvc
        .perform(
            patch("/api/users/me")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("Validation failed"));
  }

  @Test
  void patchMyUserPreferences_valid_returns200() throws Exception {
    String payload =
        """
        {
          "mainBoardId": "default"
        }
        """;

    mockMvc
        .perform(
            patch("/api/users/me/preferences")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.userId").value("anvu"))
        .andExpect(jsonPath("$.mainBoardId").value("default"));
  }

  @Test
  void getUserMainBoardByUsername_returns200() throws Exception {
    mockMvc
        .perform(get("/api/users/anvu/main-board"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.userId").value("anvu"))
        .andExpect(jsonPath("$.username").value("anvu"))
        .andExpect(jsonPath("$.mainBoardId").isNotEmpty())
        .andExpect(jsonPath("$.mainBoardUrl").isNotEmpty());
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
                .contentType(MediaType.APPLICATION_JSON)
                .content(viewPayload))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.message").value("Board not found: not-here"));
  }

  @Test
  void legacyAnalyticsEndpoints_removed() throws Exception {
    String viewPayload =
        """
        { "boardId": "default", "source": "direct" }
        """;

    mockMvc
        .perform(
            post("/api/analytics/view")
                .contentType(MediaType.APPLICATION_JSON)
                .content(viewPayload))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(get("/api/analytics/default/summary"))
        .andExpect(status().isNotFound());
  }

  @Test
  void getWidgets_returns200WithSeededData() throws Exception {
    mockMvc
        .perform(get("/api/board/default/widgets"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$[0].type").isNotEmpty())
        .andExpect(jsonPath("$[0].config").exists());
  }

  @Test
  void getWidgets_missingBoard_returns404() throws Exception {
    mockMvc
        .perform(get("/api/board/not-here/widgets"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.message").value("Board not found: not-here"));
  }

  @Test
  void postWidget_valid_returns201() throws Exception {
    String payload =
        """
        {
          "type": "embed",
          "title": "Demo Embed",
          "layout": "span-1",
          "config": { "embedUrl": "https://example.com/embed" },
          "enabled": true,
          "order": 5
        }
        """;

    mockMvc
        .perform(
            post("/api/board/default/widgets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.type").value("embed"))
        .andExpect(jsonPath("$.title").value("Demo Embed"))
        .andExpect(jsonPath("$.config.embedUrl").value("https://example.com/embed"));
  }

  @Test
  void putWidget_valid_returns200() throws Exception {
    long widgetId = createWidgetAndReturnId();
    String payload =
        """
        {
          "type": "map",
          "title": "Updated Places",
          "layout": "span-2",
          "config": { "places": ["Omaha, NE", "Austin, TX"] },
          "enabled": true,
          "order": 2
        }
        """;

    mockMvc
        .perform(
            put("/api/board/default/widgets/{widgetId}", widgetId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(widgetId))
        .andExpect(jsonPath("$.type").value("map"))
        .andExpect(jsonPath("$.config.places.length()").value(2));
  }

  @Test
  void deleteWidget_valid_returns204() throws Exception {
    long widgetId = createWidgetAndReturnId();

    mockMvc
        .perform(delete("/api/board/default/widgets/{widgetId}", widgetId))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(delete("/api/board/default/widgets/{widgetId}", widgetId))
        .andExpect(status().isNotFound());
  }

  @Test
  void postWidget_invalidConfig_returns400() throws Exception {
    String payload =
        """
        {
          "type": "embed",
          "title": "Bad Embed",
          "layout": "span-1",
          "config": { "embedUrl": "not-a-url" },
          "enabled": true,
          "order": 0
        }
        """;

    mockMvc
        .perform(
            post("/api/board/default/widgets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("embed config requires a valid http embedUrl"));
  }

  @Test
  void widgets_endpoints_acceptBoardUrlSlug() throws Exception {
    var board =
        boardRepository.findById("default").orElseThrow(() -> new IllegalStateException("default board missing"));
    String originalUrl = board.getBoardUrl();
    String slug = "default-slug-test";
    board.setBoardUrl(slug);
    boardRepository.save(board);

    try {
      mockMvc
          .perform(get("/api/board/{boardSlug}/widgets", slug))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$").isArray());

      String createPayload =
          """
          {
            "type": "link",
            "title": "Slug Link",
            "layout": "span-1",
            "config": { "url": "https://example.com/" },
            "enabled": true,
            "order": 99
          }
          """;

      MvcResult createResult =
          mockMvc
              .perform(
                  post("/api/board/{boardSlug}/widgets", slug)
                      .contentType(MediaType.APPLICATION_JSON)
                      .content(createPayload))
              .andExpect(status().isCreated())
              .andReturn();

      long widgetId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asLong();

      String updatePayload =
          """
          {
            "type": "link",
            "title": "Slug Updated",
            "layout": "span-1",
            "config": { "url": "https://example.org/" },
            "enabled": true,
            "order": 100
          }
          """;

      mockMvc
          .perform(
              put("/api/board/{boardSlug}/widgets/{widgetId}", slug, widgetId)
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(updatePayload))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.id").value(widgetId))
          .andExpect(jsonPath("$.title").value("Slug Updated"));

      mockMvc
          .perform(delete("/api/board/{boardSlug}/widgets/{widgetId}", slug, widgetId))
          .andExpect(status().isNoContent());
    } finally {
      boardRepository.findById("default").ifPresent(fresh -> {
        fresh.setBoardUrl(originalUrl);
        boardRepository.save(fresh);
      });
    }
  }

  @Test
  void postWidget_linkValid_returns201() throws Exception {
    String payload =
        """
        {
          "type": "link",
          "title": "GitHub",
          "layout": "span-1",
          "config": { "url": "https://github.com/an-vu" },
          "enabled": true,
          "order": 3
        }
        """;

    mockMvc
        .perform(
            post("/api/board/default/widgets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.type").value("link"))
        .andExpect(jsonPath("$.config.url").value("https://github.com/an-vu"));
  }

  @Test
  void putWidget_wrongBoard_returns404() throws Exception {
    long widgetId = createWidgetAndReturnId();
    String payload =
        """
        {
          "type": "embed",
          "title": "Other",
          "layout": "span-1",
          "config": { "embedUrl": "https://example.com/embed" },
          "enabled": true,
          "order": 1
        }
        """;

    mockMvc
        .perform(
            put("/api/board/berkshire/widgets/{widgetId}", widgetId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isNotFound());
  }

  private long createWidgetAndReturnId() throws Exception {
    String payload =
        """
        {
          "type": "embed",
          "title": "Seeded in test",
          "layout": "span-1",
          "config": { "embedUrl": "https://example.com/embed" },
          "enabled": true,
          "order": 9
        }
        """;

    MvcResult result =
        mockMvc
            .perform(
                post("/api/board/default/widgets")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(payload))
            .andExpect(status().isCreated())
            .andReturn();

    JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
    return body.get("id").asLong();
  }
}
