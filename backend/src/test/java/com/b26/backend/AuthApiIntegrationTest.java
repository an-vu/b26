package com.b26.backend;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthApiIntegrationTest extends ApiIntegrationTestSupport {
  @Test
  void signupCreatesAnOwnedPinnedBoardAndUsableSession() throws Exception {
    String email = "new-" + UUID.randomUUID() + "@example.com";
    var result = mockMvc.perform(post("/api/auth/signup")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(java.util.Map.of(
            "email", email, "password", "test-password-123", "displayName", "New Member"))))
        .andExpect(status().isCreated()).andReturn();
    var session = objectMapper.readTree(result.getResponse().getContentAsString());
    String token = "Bearer " + session.get("accessToken").asText();
    String userId = session.get("user").get("id").asText();
    String username = session.get("user").get("username").asText();
    var boards = boardRepository.findByOwnerUserIdOrderByUpdatedAtDescBoardNameAsc(userId);
    assertEquals(1, boards.size());
    var board = boards.get(0);
    assertEquals("New Member", board.getName());
    assertFalse(board.getBoardUrl().isBlank());
    mockMvc.perform(get(API_USERS_ME_PREFERENCES).header(AUTHORIZATION_HEADER, token))
        .andExpect(status().isOk()).andExpect(jsonPath("$.mainBoardId").value(board.getId()));
    mockMvc.perform(get("/api/users/" + username + "/main-board"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.mainBoardUrl").value(board.getBoardUrl()));
    mockMvc.perform(get(API_BOARD + "/" + board.getBoardUrl() + "/permissions")
        .header(AUTHORIZATION_HEADER, token))
        .andExpect(status().isOk()).andExpect(jsonPath("$.canEdit").value(true));
    mockMvc.perform(patch(API_BOARD + "/" + board.getBoardUrl() + "/meta")
        .header(AUTHORIZATION_HEADER, token).contentType(MediaType.APPLICATION_JSON)
        .content("{\"name\":\"My first board\",\"headline\":\"Hello!\"}"))
        .andExpect(status().isOk());
    mockMvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(java.util.Map.of("email", email, "password", "test-password-123"))))
        .andExpect(status().isOk());
    assertEquals(1, boardRepository.findByOwnerUserIdOrderByUpdatedAtDescBoardNameAsc(userId).size());
  }

  @Test
  void reservedUsernameIsRejectedWithoutCreatingAnAccount() throws Exception {
    String email = "reserved-" + UUID.randomUUID() + "@example.com";
    mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(java.util.Map.of(
            "email", email, "password", "test-password-123", "username", "settings"))))
        .andExpect(status().isBadRequest());
    assertFalse(appUserRepository.existsByEmailIgnoreCase(email));
  }

  @Test
  void derivedUsernameAvoidsSystemRoutes() throws Exception {
    mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"signin@example.com\",\"password\":\"test-password-123\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.user.username").value(org.hamcrest.Matchers.startsWith("signin-user")));
  }
}
