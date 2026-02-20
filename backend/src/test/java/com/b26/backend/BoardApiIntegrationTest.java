package com.b26.backend;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BoardApiIntegrationTest extends ApiIntegrationTestSupport {

  @Test
  void getBoard_returns200() throws Exception {
    mockMvc
        .perform(get(API_BOARD_DEFAULT))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value("default"))
        .andExpect(jsonPath("$.name").isNotEmpty());
  }

  @Test
  void getBoards_returns200() throws Exception {
    mockMvc
        .perform(get(API_BOARD))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$[0].boardName").isNotEmpty())
        .andExpect(jsonPath("$[0].boardUrl").isNotEmpty());
  }

  @Test
  void postBoard_createsDefaultBoardForCurrentUser() throws Exception {
    String authHeader = authAnvu();

    mockMvc
        .perform(
            post(API_BOARD)
                .header(AUTHORIZATION_HEADER, authHeader)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").isNotEmpty())
        .andExpect(jsonPath("$.boardName").value(org.hamcrest.Matchers.startsWith("Board #")))
        .andExpect(jsonPath("$.boardUrl").value(org.hamcrest.Matchers.startsWith("board-")))
        .andExpect(jsonPath("$.name").value("Title"))
        .andExpect(jsonPath("$.headline").value("Description"));
  }

  @Test
  void getBoard_missing_returns404() throws Exception {
    mockMvc
        .perform(get(API_BOARD_NOT_HERE))
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
            put(API_BOARD_DEFAULT)
                .header(AUTHORIZATION_HEADER, authAnvu())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Updated Name"));

    mockMvc
        .perform(get(API_BOARD_DEFAULT))
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
            patch("/api/board/default/url")
                .header(AUTHORIZATION_HEADER, authAnvu())
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
            patch("/api/board/default-updated/url")
                .header(AUTHORIZATION_HEADER, authAnvu())
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
            patch("/api/board/default/url")
                .header(AUTHORIZATION_HEADER, authAnvu())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("Validation failed"));
  }

  @Test
  void getBoardPermissions_reflectsAuthState() throws Exception {
    mockMvc
        .perform(get("/api/board/default/permissions"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.canEdit").value(false));

    mockMvc
        .perform(auth(get("/api/board/default/permissions")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.canEdit").value(true));
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
            put(API_BOARD_DEFAULT)
                .header(AUTHORIZATION_HEADER, authAnvu())
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("Validation failed"))
        .andExpect(jsonPath("$.errors").isArray());
  }

  @Test
  void getMyBoards_ordersMainBoardFirst_thenByUpdatedAtDesc() throws Exception {
    String authHeader = authAnvu();

    mockMvc
        .perform(
            patch(API_USERS_ME_PREFERENCES)
                .header(AUTHORIZATION_HEADER, authHeader)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"mainBoardId\":\"berkshire\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.mainBoardId").value("berkshire"));

    mockMvc
        .perform(
            patch("/api/board/default/meta")
                .header(AUTHORIZATION_HEADER, authHeader)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Default Ordered\",\"headline\":\"Ordered\"}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            patch("/api/board/home/meta")
                .header(AUTHORIZATION_HEADER, authHeader)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Home Ordered\",\"headline\":\"Ordered\"}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(auth(get("/api/board/mine")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value("berkshire"))
        .andExpect(jsonPath("$[1].id").value("home"));
  }
}
