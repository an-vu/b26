package com.b26.backend;

import com.b26.backend.auth.persistence.AuthSessionEntity;
import com.b26.backend.auth.persistence.AuthSessionRepository;
import com.b26.backend.board.persistence.BoardRepository;
import com.b26.backend.insights.domain.ClickAbuseGuard;
import com.b26.backend.insights.persistence.ClickEventRepository;
import com.b26.backend.insights.persistence.ViewEventRepository;
import com.b26.backend.user.persistence.AppUserEntity;
import com.b26.backend.user.persistence.AppUserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
abstract class ApiIntegrationTestSupport {
  @Autowired protected MockMvc mockMvc;
  @Autowired protected ClickEventRepository clickEventRepository;
  @Autowired protected ViewEventRepository viewEventRepository;
  @Autowired protected ClickAbuseGuard clickAbuseGuard;
  @Autowired protected ObjectMapper objectMapper;
  @Autowired protected BoardRepository boardRepository;
  @Autowired protected AppUserRepository appUserRepository;
  @Autowired protected AuthSessionRepository authSessionRepository;

  protected static final String AUTHORIZATION_HEADER = "Authorization";
  protected static final String API_BOARD = "/api/board";
  protected static final String API_BOARD_DEFAULT = "/api/board/default";
  protected static final String API_BOARD_NOT_HERE = "/api/board/not-here";
  protected static final String API_BOARD_DEFAULT_WIDGETS = "/api/board/default/widgets";
  protected static final String API_SYSTEM_ROUTES = "/api/system/routes";
  protected static final String API_USERS_ME = "/api/users/me";
  protected static final String API_USERS_ME_PREFERENCES = "/api/users/me/preferences";
  protected static final String DEFAULT_CLICK_PAYLOAD =
      """
      { "boardId": "default" }
      """;
  protected static final String DEFAULT_VIEW_PAYLOAD =
      """
      { "boardId": "default", "source": "direct" }
      """;

  @BeforeEach
  void clearClicks() {
    clickEventRepository.deleteAll();
    viewEventRepository.deleteAll();
    clickAbuseGuard.clear();
  }

  protected String authAnvu() {
    return issueAuthTokenForUser("anvu");
  }

  protected MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder builder) {
    return builder.header(AUTHORIZATION_HEADER, authAnvu());
  }

  protected MockHttpServletRequestBuilder authJson(
      MockHttpServletRequestBuilder builder, String payload) {
    return auth(builder).contentType(MediaType.APPLICATION_JSON).content(payload);
  }

  protected long createWidgetAndReturnId() throws Exception {
    String payload =
        """
        {
          "type": "embed",
          "title": "Seeded in test",
          "layout": "span-1",
          "config": { "embedUrl": "https://example.com/embed" },
          "enabled": true,
          "order": 9
        }
        """;

    MvcResult result =
        mockMvc
            .perform(authJson(post(API_BOARD_DEFAULT_WIDGETS), payload))
            .andExpect(status().isCreated())
            .andReturn();

    JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
    return body.get("id").asLong();
  }

  protected String issueAuthTokenForUser(String userId) {
    appUserRepository
        .findById(userId)
        .orElseGet(
            () -> {
              AppUserEntity user = new AppUserEntity();
              user.setId(userId);
              user.setUsername(userId);
              user.setDisplayName(userId);
              user.setEmail(userId + "@local");
              user.setRole("ADMIN");
              return appUserRepository.save(user);
            });

    String token = UUID.randomUUID().toString();

    AuthSessionEntity session = new AuthSessionEntity();
    session.setId(UUID.randomUUID().toString());
    session.setUserId(userId);
    session.setTokenHash(sha256(token));
    session.setCreatedAt(Instant.now());
    session.setExpiresAt(Instant.now().plusSeconds(3600));

    authSessionRepository.save(session);
    return "Bearer " + token;
  }

  private static String sha256(String value) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
      StringBuilder builder = new StringBuilder(hash.length * 2);
      for (byte b : hash) {
        builder.append(String.format("%02x", b));
      }
      return builder.toString();
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 not available", exception);
    }
  }
}
