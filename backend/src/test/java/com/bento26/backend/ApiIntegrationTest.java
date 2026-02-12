package com.bento26.backend;

import com.bento26.backend.analytics.domain.ClickAbuseGuard;
import com.bento26.backend.analytics.persistence.ClickEventRepository;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@SuppressWarnings("null")
class ApiIntegrationTest {
  @Autowired private MockMvc mockMvc;
  @Autowired private ClickEventRepository clickEventRepository;
  @Autowired private ClickAbuseGuard clickAbuseGuard;
  @Autowired private ObjectMapper objectMapper;

  @BeforeEach
  void clearClicks() {
    clickEventRepository.deleteAll();
    clickAbuseGuard.clear();
  }

  @Test
  void getProfile_returns200() throws Exception {
    mockMvc
        .perform(get("/api/profile/default"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value("default"))
        .andExpect(jsonPath("$.name").isNotEmpty());
  }

  @Test
  void getProfile_missing_returns404() throws Exception {
    mockMvc
        .perform(get("/api/profile/not-here"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.message").value("Profile not found: not-here"));
  }

  @Test
  void putProfile_valid_returns200AndPersists() throws Exception {
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
            put("/api/profile/default")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Updated Name"));

    mockMvc
        .perform(get("/api/profile/default"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Updated Name"));
  }

  @Test
  void putProfile_invalid_returns400WithStructuredErrors() throws Exception {
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
            put("/api/profile/default")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("Validation failed"))
        .andExpect(jsonPath("$.errors").isArray());
  }

  @Test
  void postClick_andGetAnalytics_work() throws Exception {
    String clickPayload =
        """
        { "profileId": "default" }
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
        .perform(get("/api/analytics/default"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.profileId").value("default"))
        .andExpect(jsonPath("$.totalClicks").value(2))
        .andExpect(jsonPath("$.byCard.length()").value(2));
  }

  @Test
  void postClick_invalidCard_returns400() throws Exception {
    String clickPayload =
        """
        { "profileId": "default" }
        """;

    mockMvc
        .perform(
            post("/api/click/not-a-card")
                .contentType(MediaType.APPLICATION_JSON)
                .content(clickPayload))
        .andExpect(status().isBadRequest())
        .andExpect(
            jsonPath("$.message")
                .value("Card 'not-a-card' does not belong to profile 'default'"));
  }

  @Test
  void postClick_rateLimited_returns429() throws Exception {
    String clickPayload =
        """
        { "profileId": "default" }
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
  void getWidgets_returns200WithSeededData() throws Exception {
    mockMvc
        .perform(get("/api/profile/default/widgets"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$[0].type").isNotEmpty())
        .andExpect(jsonPath("$[0].config").exists());
  }

  @Test
  void getWidgets_missingProfile_returns404() throws Exception {
    mockMvc
        .perform(get("/api/profile/not-here/widgets"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.message").value("Profile not found: not-here"));
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
            post("/api/profile/default/widgets")
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
            put("/api/profile/default/widgets/{widgetId}", widgetId)
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
        .perform(delete("/api/profile/default/widgets/{widgetId}", widgetId))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(delete("/api/profile/default/widgets/{widgetId}", widgetId))
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
            post("/api/profile/default/widgets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("embed config requires a valid http embedUrl"));
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
            post("/api/profile/default/widgets")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.type").value("link"))
        .andExpect(jsonPath("$.config.url").value("https://github.com/an-vu"));
  }

  @Test
  void putWidget_wrongProfile_returns404() throws Exception {
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
            put("/api/profile/berkshire/widgets/{widgetId}", widgetId)
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
                post("/api/profile/default/widgets")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(payload))
            .andExpect(status().isCreated())
            .andReturn();

    JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
    return body.get("id").asLong();
  }
}
