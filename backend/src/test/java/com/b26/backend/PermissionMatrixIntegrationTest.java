package com.b26.backend;

import com.b26.backend.board.persistence.BoardEntity;
import com.b26.backend.common.config.ApiAccess;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.persistence.EntityManager;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Transactional
class PermissionMatrixIntegrationTest extends ApiIntegrationTestSupport {
  private static final String LINK = """
      {"type":"link","title":"Permission test","layout":"span-1",
       "config":{"url":"https://example.com"},"enabled":true,"order":0}
      """;
  private Actor owner;
  private Actor outsider;
  private Actor admin;
  private BoardEntity board;
  @Autowired @Qualifier("requestMappingHandlerMapping")
  private RequestMappingHandlerMapping mappings;
  @Autowired private EntityManager entityManager;

  @Test
  void everyApplicationEndpointDeclaresItsPermissionPolicy() {
    var endpoints = mappings.getHandlerMethods().entrySet().stream()
        .filter(entry -> {
          String packageName = entry.getValue().getBeanType().getPackageName();
          return packageName.equals("com.b26.backend") || packageName.startsWith("com.b26.backend.");
        })
        .toList();
    assertTrue(endpoints.size() > 20, "Inspect the running API mappings, not an empty registry");
    for (var entry : endpoints) {
      var method = entry.getValue();
      var policy = AnnotatedElementUtils.findMergedAnnotation(method.getMethod(), ApiAccess.class);
      if (policy == null) policy = AnnotatedElementUtils.findMergedAnnotation(method.getBeanType(), ApiAccess.class);
      assertNotNull(policy, () -> "Missing permission policy for " + entry.getKey());
      if (policy.value() == ApiAccess.Policy.BOARD_READ || policy.value() == ApiAccess.Policy.BOARD_OWNER_READ
          || policy.value() == ApiAccess.Policy.BOARD_WRITE) {
        String variable = "{" + policy.boardVariable() + "}";
        assertTrue(entry.getKey().getPatternValues().stream().allMatch(path -> path.contains(variable)),
            () -> "Board policy must use a declared route variable: " + entry.getKey());
      }
    }
  }

  @BeforeEach
  void createActorsAndPrivateBoard() throws Exception {
    owner = actor("USER");
    outsider = actor("USER");
    admin = actor("ADMIN");
    board = createBoard(owner);
    board.setBoardUrl("access-" + UUID.randomUUID());
    boardRepository.saveAndFlush(board);
  }

  @ParameterizedTest
  @ValueSource(strings = {"mine", "by-owner"})
  void reservedLookingSlugsCannotSkipPrivateBoardAuthorization(String slug) throws Exception {
    board.setBoardUrl(slug);
    boardRepository.saveAndFlush(board);
    // /board/mine is the library route; its board is reached through the owner-qualified route.
    for (String path : List.of(boardPath() + "/widgets", boardPath() + "/editor",
        boardPath() + "/permissions", API_BOARD + "/by-owner/" + owner.id() + "/" + slug)) {
      assertPrivateRead(path, "normal");
    }
    if (slug.equals("by-owner")) assertPrivateRead(boardPath(), "normal");
  }

  @ParameterizedTest
  @ValueSource(strings = {"normal", "context", "encoded", "matrix", "encoded-prefix", "matrix-prefix"})
  void authorizationUsesTheBoardResolvedByRouting(String variant) throws Exception {
    for (String suffix : List.of("", "/widgets", "/editor", "/permissions")) {
      assertPrivateRead(boardPath() + suffix, variant);
    }
    String path = boardPath() + "/meta";
    String payload = "{\"name\":\"Changed\",\"headline\":\"Only an owner can save\"}";
    mockMvc.perform(routed(HttpMethod.PATCH, path, variant).contentType(MediaType.APPLICATION_JSON)
        .content(payload)).andExpect(status().isUnauthorized());
    mockMvc.perform(routed(HttpMethod.PATCH, path, variant).header(AUTHORIZATION_HEADER, outsider.token())
        .contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isForbidden());
    mockMvc.perform(routed(HttpMethod.PATCH, path, variant).header(AUTHORIZATION_HEADER, owner.token())
        .contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isOk());
  }

  @ParameterizedTest(name = "{0} can {1}; visitors and other users cannot")
  @MethodSource("writeCases")
  void everyBoardAndWidgetWriteEnforcesOwnership(String role, String operation) throws Exception {
    createBoard(owner); // Keep deletion independent of the last-board protection.
    JsonNode before = snapshot();
    var mutation = mutation(operation, before);
    mockMvc.perform(mutation.request()).andExpect(status().isUnauthorized());
    mockMvc.perform(mutation.request().header(AUTHORIZATION_HEADER, outsider.token()))
        .andExpect(status().isForbidden());
    assertEquals(before, snapshot(), "Denied writes must leave metadata, revision and widgets intact");
    // Requests normally use separate persistence contexts; do not retain widgets across a board deletion.
    entityManager.flush();
    entityManager.clear();
    mockMvc.perform(mutation.request().header(AUTHORIZATION_HEADER,
        role.equals("owner") ? owner.token() : admin.token()))
        .andExpect(status().is(mutation.status()));
  }

  static Stream<Arguments> writeCases() {
    return Stream.of("owner", "admin").flatMap(role -> Stream.of("metadata", "url", "identity",
        "visibility", "editor", "create widget", "update widget", "sync widgets", "delete widget",
        "delete board").map(operation -> Arguments.of(role, operation)));
  }

  @Test
  void publicVisitorsCanReadButOnlyOwnerOrAdminCanReadEditingDataAndAnalytics() throws Exception {
    board.setVisibility("public");
    boardRepository.saveAndFlush(board);
    for (String token : List.of("", outsider.token(), owner.token(), admin.token())) {
      boolean canEdit = token.equals(owner.token()) || token.equals(admin.token());
      for (String path : List.of(boardPath(), boardPath() + "/widgets",
          API_BOARD + "/by-owner/" + owner.id() + "/" + board.getBoardUrl())) {
        mockMvc.perform(withToken(get(path), token)).andExpect(status().isOk());
        mockMvc.perform(withToken(head(path), token)).andExpect(status().isOk());
      }
      mockMvc.perform(withToken(get(boardPath() + "/permissions"), token))
          .andExpect(status().isOk()).andExpect(jsonPath("$.canEdit").value(canEdit));
      for (String path : List.of(boardPath() + "/editor", "/api/insights/" + board.getId(),
          "/api/insights/" + board.getId() + "/summary")) {
        mockMvc.perform(withToken(get(path), token)).andExpect(status().is(canEdit ? 200 : 404));
        mockMvc.perform(withToken(head(path), token)).andExpect(status().is(canEdit ? 200 : 404));
      }
    }
  }

  @ParameterizedTest
  @ValueSource(strings = {"expired", "revoked"})
  void inactiveOwnerSessionsCannotReadPrivateDataOrWrite(String state) throws Exception {
    JsonNode before = snapshot();
    var session = authSessionRepository.findAll().stream()
        .filter(candidate -> candidate.getUserId().equals(owner.id())).findFirst().orElseThrow();
    if (state.equals("expired")) session.setExpiresAt(Instant.now().minusSeconds(1));
    else session.setRevokedAt(Instant.now());
    authSessionRepository.saveAndFlush(session);

    mockMvc.perform(get(boardPath()).header(AUTHORIZATION_HEADER, owner.token()))
        .andExpect(status().isNotFound());
    mockMvc.perform(mutation("metadata", before).request().header(AUTHORIZATION_HEADER, owner.token()))
        .andExpect(status().isUnauthorized());
    for (String path : List.of("/api/auth/me", API_USERS_ME, API_USERS_ME_PREFERENCES,
        API_USERS_ME_PREFERENCES + "/home", API_BOARD + "/mine")) {
      mockMvc.perform(get(path).header(AUTHORIZATION_HEADER, owner.token()))
          .andExpect(status().isUnauthorized());
    }
    var after = objectMapper.readTree(mockMvc.perform(get(boardPath() + "/editor")
        .header(AUTHORIZATION_HEADER, admin.token())).andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString());
    assertEquals(before, after);
  }

  @Test
  void ownAccountEndpointsStayScopedToTheSessionEvenForAdmins() throws Exception {
    board.setVisibility("public");
    boardRepository.saveAndFlush(board);
    for (Actor actor : List.of(outsider, admin)) {
      mockMvc.perform(get(API_BOARD + "/mine").header(AUTHORIZATION_HEADER, actor.token()))
          .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
      mockMvc.perform(patch(API_USERS_ME_PREFERENCES).header(AUTHORIZATION_HEADER, actor.token())
          .contentType(MediaType.APPLICATION_JSON).content("{\"mainBoardId\":\"" + board.getId() + "\"}"))
          .andExpect(status().isBadRequest());
      mockMvc.perform(patch(API_USERS_ME).header(AUTHORIZATION_HEADER, actor.token())
          .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(java.util.Map.of(
              "userId", owner.id(), "displayName", "My own name", "username", actor.id(),
              "email", actor.id() + "@example.com", "role", "ADMIN"))))
          .andExpect(status().isOk()).andExpect(jsonPath("$.userId").value(actor.id()));
      mockMvc.perform(put(API_USERS_ME_PREFERENCES + "/home").header(AUTHORIZATION_HEADER, actor.token())
          .contentType(MediaType.APPLICATION_JSON).content("{\"radiusStep\":5,\"spacingStep\":3,\"userId\":\""
              + owner.id() + "\"}")).andExpect(status().isOk());
    }
    assertEquals("USER", appUserRepository.findById(outsider.id()).orElseThrow().getRole());
    mockMvc.perform(get(API_USERS_ME).header(AUTHORIZATION_HEADER, owner.token()))
        .andExpect(status().isOk()).andExpect(jsonPath("$.displayName").value(owner.id()));
    mockMvc.perform(get(API_USERS_ME_PREFERENCES + "/home").header(AUTHORIZATION_HEADER, owner.token()))
        .andExpect(status().isOk()).andExpect(jsonPath("$.radiusStep").value(2));
  }

  @Test
  void privateBoardAnalyticsEventsRejectAnUnrelatedSignedInUser() throws Exception {
    var result = mockMvc.perform(post(boardPath() + "/widgets").header(AUTHORIZATION_HEADER, owner.token())
        .contentType(MediaType.APPLICATION_JSON).content(LINK)).andExpect(status().isCreated()).andReturn();
    long widgetId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    for (String path : List.of("/api/insights/view", "/api/insights/widgets/" + widgetId + "/click")) {
      String payload = "{\"boardId\":\"" + board.getId() + "\",\"source\":\"direct\"}";
      mockMvc.perform(post(path).header(AUTHORIZATION_HEADER, outsider.token())
          .contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isNotFound());
      assertEquals(0, clickEventRepository.count());
      assertEquals(0, viewEventRepository.count());
    }
  }

  @Test
  void frameworkOptionsRequestsRemainAvailableWithoutRevealingPrivateData() throws Exception {
    mockMvc.perform(options(boardPath() + "/editor").header("Origin", "http://localhost:4200")
        .header("Access-Control-Request-Method", "PUT")
        .header("Access-Control-Request-Headers", "Authorization,Content-Type"))
        .andExpect(status().isOk())
        .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:4200"))
        .andExpect(content().string(""));
    mockMvc.perform(options(boardPath() + "/editor"))
        .andExpect(status().isOk()).andExpect(content().string(""));
  }

  private void assertPrivateRead(String path, String variant) throws Exception {
    for (HttpMethod method : List.of(HttpMethod.GET, HttpMethod.HEAD)) {
      mockMvc.perform(routed(method, path, variant)).andExpect(status().isNotFound());
      mockMvc.perform(routed(method, path, variant).header(AUTHORIZATION_HEADER, outsider.token()))
          .andExpect(status().isNotFound());
      mockMvc.perform(routed(method, path, variant).header(AUTHORIZATION_HEADER, owner.token()))
          .andExpect(status().isOk());
      mockMvc.perform(routed(method, path, variant).header(AUTHORIZATION_HEADER, admin.token()))
          .andExpect(status().isOk());
    }
  }

  private MockHttpServletRequestBuilder routed(HttpMethod method, String path, String variant) {
    return switch (variant) {
      case "context" -> request(method, URI.create("/blueberry" + path)).contextPath("/blueberry");
      case "encoded" -> request(method, URI.create(path.replace(board.getBoardUrl(),
          "%61" + board.getBoardUrl().substring(1))));
      case "matrix" -> request(method, URI.create(path.replace(board.getBoardUrl(),
          board.getBoardUrl() + ";preview=true")));
      case "encoded-prefix" -> request(method, URI.create(path.replaceFirst("/api/", "/%61pi/")));
      case "matrix-prefix" -> request(method, URI.create(path.replaceFirst("/api/", "/api;preview=true/")));
      default -> request(method, URI.create(path));
    };
  }

  private Mutation mutation(String operation, JsonNode snapshot) {
    String path = boardPath();
    long version = snapshot.get("board").get("version").asLong();
    long widgetId = snapshot.get("widgets").get(0).get("id").asLong();
    return switch (operation) {
      case "metadata" -> new Mutation(HttpMethod.PATCH, path + "/meta",
          "{\"name\":\"Saved\",\"headline\":\"Saved description\"}", 200);
      case "url" -> new Mutation(HttpMethod.PATCH, path + "/url",
          "{\"boardUrl\":\"renamed-" + UUID.randomUUID() + "\"}", 200);
      case "identity" -> new Mutation(HttpMethod.PATCH, path + "/identity",
          "{\"boardName\":\"Renamed\",\"boardUrl\":\"" + board.getBoardUrl() + "\",\"version\":" + version + "}", 200);
      case "visibility" -> new Mutation(HttpMethod.PATCH, path + "/visibility",
          "{\"visibility\":\"public\",\"version\":" + version + "}", 200);
      case "editor" -> {
        ObjectNode payload = objectMapper.createObjectNode().put("version", version)
            .put("name", "Saved").put("headline", "Saved description");
        payload.set("widgets", snapshot.get("widgets").deepCopy());
        yield new Mutation(HttpMethod.PUT, path + "/editor", payload.toString(), 200);
      }
      case "create widget" -> new Mutation(HttpMethod.POST, path + "/widgets", LINK, 201);
      case "update widget" -> new Mutation(HttpMethod.PUT, path + "/widgets/" + widgetId, LINK, 200);
      case "sync widgets" -> new Mutation(HttpMethod.PUT, path + "/widgets/sync", "{\"widgets\":[]}", 200);
      case "delete widget" -> new Mutation(HttpMethod.DELETE, path + "/widgets/" + widgetId, "", 204);
      case "delete board" -> new Mutation(HttpMethod.DELETE, path, "", 204);
      default -> throw new IllegalArgumentException(operation);
    };
  }

  private JsonNode snapshot() throws Exception {
    return objectMapper.readTree(mockMvc.perform(get(boardPath() + "/editor")
        .header(AUTHORIZATION_HEADER, owner.token())).andExpect(status().isOk())
        .andReturn().getResponse().getContentAsString());
  }

  private Actor actor(String role) {
    String id = "access-" + UUID.randomUUID();
    String token = issueAuthTokenForUser(id);
    var user = appUserRepository.findById(id).orElseThrow();
    user.setRole(role);
    appUserRepository.saveAndFlush(user);
    return new Actor(id, token);
  }

  private BoardEntity createBoard(Actor actor) throws Exception {
    var result = mockMvc.perform(post(API_BOARD).header(AUTHORIZATION_HEADER, actor.token()))
        .andExpect(status().isOk()).andReturn();
    String id = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
    return boardRepository.findById(id).orElseThrow();
  }

  private String boardPath() { return API_BOARD + "/" + board.getBoardUrl(); }

  private MockHttpServletRequestBuilder withToken(MockHttpServletRequestBuilder request, String token) {
    return token.isEmpty() ? request : request.header(AUTHORIZATION_HEADER, token);
  }

  private record Actor(String id, String token) {}

  private record Mutation(HttpMethod method, String path, String payload, int status) {
    MockHttpServletRequestBuilder request() {
      return org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request(method, path)
          .contentType(MediaType.APPLICATION_JSON).content(payload);
    }
  }
}
