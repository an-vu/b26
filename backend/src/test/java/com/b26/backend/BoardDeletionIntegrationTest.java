package com.b26.backend;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class BoardDeletionIntegrationTest extends ApiIntegrationTestSupport {
  @org.springframework.beans.factory.annotation.Autowired
  com.b26.backend.widget.persistence.WidgetRepository widgets;

  @Test
  void ownerMustKeepOneBoardAndReplaceMainBeforeDeleting() throws Exception {
    String token = signup();
    var prefs = objectMapper.readTree(mockMvc.perform(get(API_USERS_ME_PREFERENCES)
        .header("Authorization", token)).andReturn().getResponse().getContentAsString());
    String slug = prefs.get("mainBoardUrl").asText();
    mockMvc.perform(delete(API_BOARD + "/" + slug).header("Authorization", token))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].message", org.hamcrest.Matchers.containsString("only board")));
    var extra = objectMapper.readTree(mockMvc.perform(post(API_BOARD).header("Authorization", token)
        .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString());
    mockMvc.perform(delete(API_BOARD + "/" + slug).header("Authorization", token))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].message", org.hamcrest.Matchers.containsString("main board")));
    mockMvc.perform(patch(API_USERS_ME_PREFERENCES).header("Authorization", token)
        .contentType(MediaType.APPLICATION_JSON).content("{\"mainBoardId\":\"" + extra.get("id").asText() + "\"}"))
        .andExpect(status().isOk());
    mockMvc.perform(delete(API_BOARD + "/" + slug).header("Authorization", token))
        .andExpect(status().isNoContent());
    mockMvc.perform(get(API_BOARD + "/" + slug)).andExpect(status().isNotFound());
    mockMvc.perform(delete(API_BOARD + "/" + extra.get("boardUrl").asText()).header("Authorization", authAnvu()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].message", org.hamcrest.Matchers.containsString("only board")));
    mockMvc.perform(get(API_USERS_ME_PREFERENCES).header("Authorization", token))
        .andExpect(jsonPath("$.mainBoardId").value(extra.get("id").asText()));
  }

  @Test
  void permissionsAndSystemRoutesAreProtected() throws Exception {
    mockMvc.perform(get(API_SYSTEM_ROUTES)).andExpect(status().isOk());
    String owner = signup();
    var extra = objectMapper.readTree(mockMvc.perform(post(API_BOARD).header("Authorization", owner)
        .contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andReturn().getResponse().getContentAsString());
    String path = API_BOARD + "/" + extra.get("boardUrl").asText();
    mockMvc.perform(delete(path)).andExpect(status().isUnauthorized());
    mockMvc.perform(delete(path).header("Authorization", signup())).andExpect(status().isForbidden());
    org.junit.jupiter.api.Assertions.assertFalse(widgets.findByBoard_IdOrderBySortOrderAsc(extra.get("id").asText()).isEmpty());
    mockMvc.perform(delete(path).header("Authorization", authAnvu())).andExpect(status().isNoContent());
    org.junit.jupiter.api.Assertions.assertTrue(widgets.findByBoard_IdOrderBySortOrderAsc(extra.get("id").asText()).isEmpty());
    mockMvc.perform(delete("/api/board/home").header("Authorization", authAnvu()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors[0].message", org.hamcrest.Matchers.containsString("system route")));
    mockMvc.perform(delete(API_BOARD_NOT_HERE).header("Authorization", owner)).andExpect(status().isNotFound());
  }

  private String signup() throws Exception {
    var response = mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"delete-" + java.util.UUID.randomUUID() + "@example.com\",\"password\":\"test-password-123\"}"))
        .andExpect(status().isCreated()).andReturn();
    return "Bearer " + objectMapper.readTree(response.getResponse().getContentAsString()).get("accessToken").asText();
  }
}
