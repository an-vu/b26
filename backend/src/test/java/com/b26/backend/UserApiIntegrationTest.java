package com.b26.backend;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserApiIntegrationTest extends ApiIntegrationTestSupport {

  @Test
  void homeAppearance_isPersistedForViewerWithoutChangingMainBoard() throws Exception {
    selectDefault();
    mockMvc.perform(authJson(put(API_USERS_ME_PREFERENCES + "/home"), "{\"radiusStep\":3,\"spacingStep\":1,\"themeFamily\":\"kiwi\",\"theme\":\"dark\",\"backgroundColor\":\"#3185fc\",\"pattern\":\"snow\",\"patternIntensity\":\"heavy\"}"))
        .andExpect(status().isOk());
    mockMvc.perform(auth(get(API_USERS_ME_PREFERENCES + "/home")))
        .andExpect(status().isOk()).andExpect(jsonPath("$.radiusStep").value(3))
        .andExpect(jsonPath("$.spacingStep").value(1))
        .andExpect(jsonPath("$.themeFamily").value("kiwi"))
        .andExpect(jsonPath("$.theme").value("dark"))
        .andExpect(jsonPath("$.backgroundColor").value("#3185fc"))
        .andExpect(jsonPath("$.pattern").value("snow"))
        .andExpect(jsonPath("$.patternIntensity").value("heavy"));
    mockMvc.perform(auth(get(API_USERS_ME_PREFERENCES)))
        .andExpect(status().isOk()).andExpect(jsonPath("$.mainBoardId").value("default"));
    mockMvc.perform(get(API_USERS_ME_PREFERENCES + "/home")
            .header(AUTHORIZATION_HEADER, issueAuthTokenForUser("home-other")))
        .andExpect(status().isOk()).andExpect(jsonPath("$.radiusStep").value(2))
        .andExpect(jsonPath("$.spacingStep").value(2))
        .andExpect(jsonPath("$.themeFamily").value("default"));
  }

  @Test
  void homeAppearance_rejectsSignedOutAndInvalidSizes() throws Exception {
    mockMvc.perform(get(API_USERS_ME_PREFERENCES + "/home")).andExpect(status().isUnauthorized());
    mockMvc.perform(put(API_USERS_ME_PREFERENCES + "/home").contentType(MediaType.APPLICATION_JSON)
        .content("{\"radiusStep\":2,\"spacingStep\":2}")).andExpect(status().isUnauthorized());
    for (String payload : new String[] { "{\"radiusStep\":4,\"spacingStep\":2}",
        "{\"radiusStep\":2,\"spacingStep\":0}", "{\"spacingStep\":2}",
        "{\"radiusStep\":2,\"spacingStep\":2,\"themeFamily\":\"invalid\"}",
        "{\"radiusStep\":2,\"spacingStep\":2,\"backgroundColor\":\"red\"}" }) {
      mockMvc.perform(authJson(put(API_USERS_ME_PREFERENCES + "/home"), payload))
          .andExpect(status().isBadRequest());
    }
  }

  @Test
  void getMyUserPreferences_returns200() throws Exception {
    selectDefault();
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
    selectDefault();
    mockMvc
        .perform(get("/api/users/anvu/main-board"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.userId").value("anvu"))
        .andExpect(jsonPath("$.username").value("anvu"))
        .andExpect(jsonPath("$.mainBoardId").isNotEmpty())
        .andExpect(jsonPath("$.mainBoardUrl").isNotEmpty());
  }
  private void selectDefault() throws Exception {
    mockMvc.perform(authJson(patch(API_USERS_ME_PREFERENCES), "{\"mainBoardId\":\"default\"}"))
        .andExpect(status().isOk());
  }
}
