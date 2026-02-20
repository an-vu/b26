package com.b26.backend;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WidgetApiIntegrationTest extends ApiIntegrationTestSupport {

  @Test
  void getWidgets_returns200WithSeededData() throws Exception {
    mockMvc
        .perform(get(API_BOARD_DEFAULT_WIDGETS))
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
        .perform(authJson(post(API_BOARD_DEFAULT_WIDGETS), payload))
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
                .header(AUTHORIZATION_HEADER, authAnvu())
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
        .perform(
            delete("/api/board/default/widgets/{widgetId}", widgetId)
                .header(AUTHORIZATION_HEADER, authAnvu()))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            delete("/api/board/default/widgets/{widgetId}", widgetId)
                .header(AUTHORIZATION_HEADER, authAnvu()))
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
        .perform(authJson(post(API_BOARD_DEFAULT_WIDGETS), payload))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("embed config requires a valid http embedUrl"));
  }

  @Test
  void widgets_endpoints_acceptBoardUrlSlug() throws Exception {
    var board =
        boardRepository
            .findById("default")
            .orElseThrow(() -> new IllegalStateException("default board missing"));
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
                      .header(AUTHORIZATION_HEADER, authAnvu())
                      .contentType(MediaType.APPLICATION_JSON)
                      .content(createPayload))
              .andExpect(status().isCreated())
              .andReturn();

      long widgetId =
          objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asLong();

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
                  .header(AUTHORIZATION_HEADER, authAnvu())
                  .contentType(MediaType.APPLICATION_JSON)
                  .content(updatePayload))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.id").value(widgetId))
          .andExpect(jsonPath("$.title").value("Slug Updated"));

      mockMvc
          .perform(
              delete("/api/board/{boardSlug}/widgets/{widgetId}", slug, widgetId)
                  .header(AUTHORIZATION_HEADER, authAnvu()))
          .andExpect(status().isNoContent());
    } finally {
      boardRepository.findById("default").ifPresent(
          fresh -> {
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
        .perform(authJson(post(API_BOARD_DEFAULT_WIDGETS), payload))
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
                .header(AUTHORIZATION_HEADER, authAnvu())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isNotFound());
  }
}
