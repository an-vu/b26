package com.b26.backend;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class BoardVisibilityIntegrationTest extends ApiIntegrationTestSupport {
  @Test
  void visibilityProtectsAllReadPathsAndMainBoardIsOptional() throws Exception {
    String ownerId = "privacy-" + UUID.randomUUID();
    String owner = issueAuthTokenForUser(ownerId);
    var user = appUserRepository.findById(ownerId).orElseThrow();
    user.setRole("USER"); appUserRepository.saveAndFlush(user);
    String outsiderId = "outsider-" + UUID.randomUUID();
    String outsider = issueAuthTokenForUser(outsiderId);
    var other = appUserRepository.findById(outsiderId).orElseThrow();
    other.setRole("USER"); appUserRepository.saveAndFlush(other);
    var board = objectMapper.readTree(mockMvc.perform(post(API_BOARD).header("Authorization", owner))
        .andExpect(status().isOk()).andExpect(jsonPath("$.visibility").value("private"))
        .andReturn().getResponse().getContentAsString());
    String slug = board.get("boardUrl").asText(), id = board.get("id").asText();
    String url = API_BOARD + "/" + slug;
    for (String path : new String[]{url, url + "/widgets", url + "/editor", url + "/permissions",
        API_BOARD + "/by-owner/" + user.getUsername() + "/" + slug, "/api/insights/" + id + "/summary"}) {
      mockMvc.perform(get(path)).andExpect(status().isNotFound());
      mockMvc.perform(head(path)).andExpect(status().isNotFound());
      mockMvc.perform(get(path).header("Authorization", outsider)).andExpect(status().isNotFound());
      mockMvc.perform(get(path).header("Authorization", owner)).andExpect(status().isOk());
      mockMvc.perform(auth(get(path))).andExpect(status().isOk());
    }
    String viewPayload = "{\"boardId\":\"" + id + "\",\"source\":\"direct\"}";
    mockMvc.perform(post("/api/insights/view").contentType(MediaType.APPLICATION_JSON)
        .content(viewPayload)).andExpect(status().isNotFound());
    mockMvc.perform(post("/api/insights/view").header("Authorization", outsider)
        .contentType(MediaType.APPLICATION_JSON).content(viewPayload)).andExpect(status().isNotFound());
    mockMvc.perform(post("/api/insights/view").header("Authorization", owner)
        .contentType(MediaType.APPLICATION_JSON).content(viewPayload)).andExpect(status().isNoContent());
    // A board slug matching another board's ID must not authorize that board's analytics.
    var collision = objectMapper.readTree(mockMvc.perform(post(API_BOARD).header("Authorization", outsider))
        .andReturn().getResponse().getContentAsString());
    var collisionBoard = boardRepository.findById(collision.get("id").asText()).orElseThrow();
    collisionBoard.setBoardUrl(id); boardRepository.saveAndFlush(collisionBoard);
    mockMvc.perform(get("/api/insights/" + id + "/summary").header("Authorization", outsider))
        .andExpect(status().isNotFound());
    var publicList = objectMapper.readTree(mockMvc.perform(get(API_BOARD)).andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString());
    assertFalse(java.util.stream.StreamSupport.stream(publicList.get("items").spliterator(), false)
        .anyMatch(entry -> id.equals(entry.get("id").asText())));
    mockMvc.perform(get(API_BOARD + "/mine").header("Authorization", owner))
        .andExpect(jsonPath("$[0].visibility").value("private"));
    String mainPayload = "{\"mainBoardId\":\"" + id + "\"}";
    mockMvc.perform(patch(API_USERS_ME_PREFERENCES).header("Authorization", owner)
        .contentType(MediaType.APPLICATION_JSON).content(mainPayload)).andExpect(status().isBadRequest());
    String publish = "{\"visibility\":\"public\",\"version\":" + board.get("version").asLong() + "}";
    mockMvc.perform(patch(url + "/visibility").header("Authorization", outsider)
        .contentType(MediaType.APPLICATION_JSON).content(publish)).andExpect(status().isForbidden());
    mockMvc.perform(patch(url + "/visibility").header("Authorization", owner)
        .contentType(MediaType.APPLICATION_JSON).content(publish)).andExpect(status().isOk());
    mockMvc.perform(patch(url + "/visibility").header("Authorization", owner)
        .contentType(MediaType.APPLICATION_JSON).content(publish)).andExpect(status().isConflict());
    mockMvc.perform(get(url)).andExpect(status().isOk());
    mockMvc.perform(get(url + "/widgets")).andExpect(status().isOk());
    mockMvc.perform(get(url + "/editor")).andExpect(status().isNotFound());
    mockMvc.perform(patch(API_USERS_ME_PREFERENCES).header("Authorization", owner)
        .contentType(MediaType.APPLICATION_JSON).content(mainPayload)).andExpect(status().isOk());
    mockMvc.perform(get("/api/users/" + user.getUsername() + "/main-board"))
        .andExpect(jsonPath("$.mainBoardUrl").value(slug));
    long revision = boardRepository.findById(id).orElseThrow().getVersion();
    String privatize = "{\"visibility\":\"private\",\"version\":" + revision + "}";
    mockMvc.perform(patch(url + "/visibility").header("Authorization", owner)
        .contentType(MediaType.APPLICATION_JSON).content(privatize)).andExpect(status().isBadRequest());
    mockMvc.perform(patch(API_USERS_ME_PREFERENCES).header("Authorization", owner)
        .contentType(MediaType.APPLICATION_JSON).content("{\"mainBoardId\":null}")).andExpect(status().isOk());
    mockMvc.perform(patch(url + "/visibility").header("Authorization", owner)
        .contentType(MediaType.APPLICATION_JSON).content(privatize)).andExpect(status().isOk());
    mockMvc.perform(get("/api/users/" + user.getUsername() + "/main-board"))
        .andExpect(jsonPath("$.mainBoardId").value(""));
    mockMvc.perform(get(url)).andExpect(status().isNotFound());
    // No fallback to another public board, even if one exists.
    var entity = boardRepository.findById(id).orElseThrow();
    entity.setVisibility("public"); boardRepository.saveAndFlush(entity);
    mockMvc.perform(get("/api/users/" + user.getUsername() + "/main-board"))
        .andExpect(jsonPath("$.mainBoardId").value(""));
  }
}
