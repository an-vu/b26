package com.bento26.backend;

import com.bento26.backend.analytics.domain.ClickAbuseGuard;
import com.bento26.backend.analytics.persistence.ClickEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ApiIntegrationTest {
  @Autowired private MockMvc mockMvc;
  @Autowired private ClickEventRepository clickEventRepository;
  @Autowired private ClickAbuseGuard clickAbuseGuard;

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
        .andExpect(jsonPath("$.name").isNotEmpty())
        .andExpect(jsonPath("$.cards").isArray());
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
        .andExpect(jsonPath("$.name").value("Updated Name"))
        .andExpect(jsonPath("$.cards.length()").value(2));

    mockMvc
        .perform(get("/api/profile/default"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Updated Name"))
        .andExpect(jsonPath("$.cards.length()").value(2));
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
}
