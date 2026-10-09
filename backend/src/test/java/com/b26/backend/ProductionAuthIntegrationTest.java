package com.b26.backend;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Production guards and authentication, with an isolated test database. */
@org.springframework.test.context.TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:b26-production-auth;DB_CLOSE_DELAY=-1")
@ActiveProfiles(value = {"prod", "test"}, inheritProfiles = false)
class ProductionAuthIntegrationTest extends ApiIntegrationTestSupport {
  @Test
  void enforcesPasswordsAndRevokesSessions() throws Exception {
    String email = "production-auth-" + UUID.randomUUID() + "@example.com";
    String credentials = objectMapper.writeValueAsString(Map.of("email", email, "password", "correct-password-123"));
    mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content(credentials))
        .andExpect(status().isCreated());
    mockMvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(Map.of("email", email, "password", "incorrect-password-123"))))
        .andExpect(status().isUnauthorized());
    mockMvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(Map.of("email", email))))
        .andExpect(status().isBadRequest());
    var signin = mockMvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON).content(credentials))
        .andExpect(status().isOk()).andReturn();
    String token = "Bearer " + objectMapper.readTree(signin.getResponse().getContentAsString()).get("accessToken").asText();
    mockMvc.perform(get("/api/auth/me").header(AUTHORIZATION_HEADER, token)).andExpect(status().isOk());
    mockMvc.perform(post("/api/auth/signout").header(AUTHORIZATION_HEADER, token)).andExpect(status().isNoContent());
    mockMvc.perform(get("/api/auth/me").header(AUTHORIZATION_HEADER, token)).andExpect(status().isUnauthorized());
    mockMvc.perform(post(API_BOARD).header(AUTHORIZATION_HEADER, token)).andExpect(status().isUnauthorized());
  }

  @org.springframework.beans.factory.annotation.Autowired
  com.b26.backend.auth.persistence.AuthSessionRepository sessions;

  @Test
  void expiredSessionsCannotAuthenticateOrSignOut() throws Exception {
    String email = "expired-" + UUID.randomUUID() + "@example.com";
    var signup = mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(Map.of("email", email, "password", "correct-password-123"))))
        .andExpect(status().isCreated()).andReturn();
    var body = objectMapper.readTree(signup.getResponse().getContentAsString());
    String token = "Bearer " + body.get("accessToken").asText();
    String userId = body.get("user").get("id").asText();
    var session = sessions.findAll().stream().filter(item -> userId.equals(item.getUserId())).findFirst().orElseThrow();
    session.setExpiresAt(java.time.Instant.now().minusSeconds(60));
    sessions.saveAndFlush(session);

    mockMvc.perform(get("/api/auth/me").header(AUTHORIZATION_HEADER, token))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.message").value("Invalid or expired session"));
    mockMvc.perform(post("/api/auth/signout").header(AUTHORIZATION_HEADER, token))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.message").value("Invalid or expired session"));
  }

  @Test
  void passwordlessSeedAccountCannotSignInAndManagementDetailsStayPrivate() throws Exception {
    mockMvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"anvu@local\",\"password\":\"anything-123\"}"))
        .andExpect(status().isUnauthorized());
    mockMvc.perform(get("/actuator/health")).andExpect(status().isOk())
        .andExpect(jsonPath("$.components").doesNotExist());
    mockMvc.perform(get("/actuator/env")).andExpect(status().isNotFound());
    mockMvc.perform(get("/actuator/configprops")).andExpect(status().isNotFound());
    mockMvc.perform(get(API_BOARD + "/mine")).andExpect(status().isUnauthorized());
  }
}
