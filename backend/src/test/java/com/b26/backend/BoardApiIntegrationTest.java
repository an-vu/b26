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
        .andExpect(jsonPath("$.items").isArray())
        .andExpect(jsonPath("$.items[0].boardName").isNotEmpty())
        .andExpect(jsonPath("$.items[0].boardUrl").isNotEmpty());
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
  void patchBoardIdentity_renamesSlugAndRejectsInvalidFormat() throws Exception {
    mockMvc
        .perform(authJson(patch("/api/board/union-pacific/identity"),
            "{\"boardName\":\"Union Pacific\",\"boardUrl\":\"union-pacific-updated\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.boardUrl").value("union-pacific-updated"));
    mockMvc
        .perform(get("/api/board/union-pacific-updated"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.boardUrl").value("union-pacific-updated"));
    mockMvc
        .perform(authJson(patch("/api/board/union-pacific-updated/identity"),
            "{\"boardName\":\"Union Pacific\",\"boardUrl\":\"Union Pacific\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("Validation failed"));
  }

  @Test
  void retiredMetaAndUrlEndpointsAreNotServed() throws Exception {
    mockMvc.perform(authJson(patch("/api/board/default/meta"), "{\"name\":\"x\",\"headline\":\"y\"}"))
        .andExpect(status().is4xxClientError());
    mockMvc.perform(authJson(patch("/api/board/default/url"), "{\"boardUrl\":\"other\"}"))
        .andExpect(status().is4xxClientError());
    mockMvc.perform(get(API_BOARD_DEFAULT)).andExpect(jsonPath("$.boardUrl").value("default"));
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
            patch("/api/board/default/identity")
                .header(AUTHORIZATION_HEADER, authHeader)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"boardName\":\"Default Ordered\",\"boardUrl\":\"default\"}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(
            patch("/api/board/home/identity")
                .header(AUTHORIZATION_HEADER, authHeader)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"boardName\":\"Home Ordered\",\"boardUrl\":\"home\"}"))
        .andExpect(status().isOk());

    mockMvc
        .perform(auth(get("/api/board/mine")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value("berkshire"))
        .andExpect(jsonPath("$[1].id").value("home"));
  }
}
