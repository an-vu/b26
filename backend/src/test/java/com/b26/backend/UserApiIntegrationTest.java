package com.b26.backend;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserApiIntegrationTest extends ApiIntegrationTestSupport {

  @Test
  void getMyUserPreferences_returns200() throws Exception {
    mockMvc
        .perform(auth(get(API_USERS_ME_PREFERENCES)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.userId").value("anvu"))
        .andExpect(jsonPath("$.username").value("anvu"))
        .andExpect(jsonPath("$.mainBoardId").isNotEmpty())
        .andExpect(jsonPath("$.mainBoardUrl").isNotEmpty());
  }

  @Test
  void getMyUserProfile_returns200() throws Exception {
    mockMvc
        .perform(auth(get(API_USERS_ME)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.userId").value("anvu"))
        .andExpect(jsonPath("$.displayName").isNotEmpty())
        .andExpect(jsonPath("$.username").value("anvu"));
  }

  @Test
  void patchMyUserProfile_valid_returns200() throws Exception {
    String authHeader = authAnvu();
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
            patch(API_USERS_ME)
                .header(AUTHORIZATION_HEADER, authHeader)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.displayName").value("An Vu"))
        .andExpect(jsonPath("$.username").value("anvu"))
        .andExpect(jsonPath("$.email").value("anvu@local"));
  }

  @Test
  void patchMyUserProfile_invalidUsername_returns400() throws Exception {
    String authHeader = authAnvu();
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
            patch(API_USERS_ME)
                .header(AUTHORIZATION_HEADER, authHeader)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("Validation failed"));
  }

  @Test
  void patchMyUserPreferences_valid_returns200() throws Exception {
    String authHeader = authAnvu();
    String payload =
        """
        {
          "mainBoardId": "default"
        }
        """;

    mockMvc
        .perform(
            patch(API_USERS_ME_PREFERENCES)
                .header(AUTHORIZATION_HEADER, authHeader)
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
}
