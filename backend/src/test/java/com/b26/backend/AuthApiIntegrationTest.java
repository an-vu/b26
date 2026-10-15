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
  void signupCreatesAnOwnedPrivateBoardAndUsableSession() throws Exception {
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
    assertEquals("private", board.getVisibility());
    assertFalse(board.getBoardUrl().isBlank());
    mockMvc.perform(get(API_USERS_ME_PREFERENCES).header(AUTHORIZATION_HEADER, token))
        .andExpect(status().isOk()).andExpect(jsonPath("$.mainBoardId").value(""));
    mockMvc.perform(get("/api/users/" + username + "/main-board"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.mainBoardUrl").value(""));
    mockMvc.perform(get(API_BOARD + "/" + board.getBoardUrl() + "/permissions")
        .header(AUTHORIZATION_HEADER, token))
        .andExpect(status().isOk()).andExpect(jsonPath("$.canEdit").value(true));
    mockMvc.perform(patch(API_BOARD + "/" + board.getBoardUrl() + "/identity")
        .header(AUTHORIZATION_HEADER, token).contentType(MediaType.APPLICATION_JSON)
        .content("{\"boardName\":\"My first board\",\"boardUrl\":\"" + board.getBoardUrl() + "\"}"))
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
  void signinResponsesDoNotRevealWhetherAnEmailIsRegistered() throws Exception {
    String known = signup();
    String unknown = "unknown-" + UUID.randomUUID() + "@example.com";
    for (String email : new String[]{known, unknown}) {
      mockMvc.perform(signin(email, "short")).andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.errors[0].message").value("password must be between 8 and 72 characters"));
      mockMvc.perform(signin(email, null)).andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.errors[0].message").value("password is required"));
      mockMvc.perform(signin(email, "wrong-password-123")).andExpect(status().isUnauthorized())
          .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }
  }

  @Test
  void repeatedFailedSigninsAreThrottledPerEmail() throws Exception {
    String email = signup();
    for (int i = 0; i < 5; i++) {
      mockMvc.perform(signin(email, "wrong-password-123")).andExpect(status().isUnauthorized());
    }
    mockMvc.perform(signin(email, "test-password-123")).andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.message").value("Too many sign-in attempts. Try again later."));
    // Other accounts from a different address are unaffected.
    String other = signup();
    mockMvc.perform(signin(other, "test-password-123").with(request -> {
      request.setRemoteAddr("198.51.100.20");
      return request;
    })).andExpect(status().isOk());
  }

  @Test
  void repeatedFailedSigninsAreThrottledPerAddress() throws Exception {
    String email = signup();
    for (int i = 0; i < 20; i++) {
      mockMvc.perform(signin("probe-" + i + "@example.com", "wrong-password-123")).andExpect(status().isUnauthorized());
    }
    mockMvc.perform(signin(email, "test-password-123")).andExpect(status().isTooManyRequests());
  }

  @org.springframework.beans.factory.annotation.Autowired
  com.b26.backend.auth.domain.AuthService authService;

  @Test
  void scheduledPurgeRemovesOnlyExpiredAndRevokedSessions() throws Exception {
    issueAuthTokenForUser("purge-user");
    issueAuthTokenForUser("purge-user");
    var sessions = authSessionRepository.findAll().stream()
        .filter(session -> session.getUserId().equals("purge-user")).toList();
    sessions.get(0).setExpiresAt(java.time.Instant.now().minusSeconds(1));
    sessions.get(1).setRevokedAt(java.time.Instant.now());
    authSessionRepository.saveAllAndFlush(sessions);
    String active = issueAuthTokenForUser("purge-user");
    authService.purgeInactiveSessions();
    assertEquals(1, authSessionRepository.findAll().stream()
        .filter(session -> session.getUserId().equals("purge-user")).count());
    mockMvc.perform(get("/api/auth/me").header(AUTHORIZATION_HEADER, active)).andExpect(status().isOk());
  }

  private String signup() throws Exception {
    String email = "signin-" + UUID.randomUUID() + "@example.com";
    mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(java.util.Map.of("email", email, "password", "test-password-123"))))
        .andExpect(status().isCreated());
    return email;
  }

  private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder signin(String email, String password)
      throws Exception {
    var body = new java.util.HashMap<String, String>();
    body.put("email", email);
    if (password != null) body.put("password", password);
    return post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body));
  }

  @Test
  void derivedUsernameAvoidsSystemRoutes() throws Exception {
    mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"signin@example.com\",\"password\":\"test-password-123\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.user.username").value(org.hamcrest.Matchers.startsWith("signin-user")));
  }
}
