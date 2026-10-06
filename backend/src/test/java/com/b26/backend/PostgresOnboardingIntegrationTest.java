package com.b26.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.DriverManager;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("postgres")
@DirtiesContext
@EnabledIfEnvironmentVariable(named = "POSTGRES_TEST_URL", matches = ".+")
class PostgresOnboardingIntegrationTest {
  private static final String SCHEMA = "b26_app_" + UUID.randomUUID().toString().replace("-", "");
  private static final String URL = System.getenv("POSTGRES_TEST_URL");
  private static final String USER = System.getenv().getOrDefault("POSTGRES_TEST_USER", "postgres");
  private static final String PASSWORD = System.getenv().getOrDefault("POSTGRES_TEST_PASSWORD", "postgres");
  @Autowired MockMvc mockMvc;
  @Autowired ObjectMapper objectMapper;

  @DynamicPropertySource
  static void configureDatabase(DynamicPropertyRegistry properties) {
    properties.add("spring.datasource.url", () -> URL + (URL.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
    properties.add("spring.datasource.username", () -> USER);
    properties.add("spring.datasource.password", () -> PASSWORD);
    properties.add("spring.flyway.schemas", () -> SCHEMA);
    properties.add("spring.flyway.default-schema", () -> SCHEMA);
    properties.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
  }

  @AfterAll
  static void removeTestSchema() throws Exception {
    try (var connection = DriverManager.getConnection(URL, USER, PASSWORD);
         var statement = connection.createStatement()) {
      statement.execute("drop schema if exists " + SCHEMA + " cascade");
    }
  }

  @Test
  void migratedDatabaseServesSystemRoutesAndFirstBoard() throws Exception {
    // Exercises default creation under PostgreSQL transaction rules and JPA schema validation.
    mockMvc.perform(get("/api/system/routes"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.globalHomepageBoardUrl").value("home"));
    var result = mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"first@example.com\",\"password\":\"test-password-123\"}"))
        .andExpect(status().isCreated()).andReturn();
    var session = objectMapper.readTree(result.getResponse().getContentAsString());
    String token = "Bearer " + session.get("accessToken").asText();
    var preferenceResult = mockMvc.perform(get("/api/users/me/preferences").header("Authorization", token))
        .andExpect(status().isOk()).andExpect(jsonPath("$.mainBoardId").isNotEmpty()).andReturn();
    var preference = objectMapper.readTree(preferenceResult.getResponse().getContentAsString());
    String slug = preference.get("mainBoardUrl").asText();
    mockMvc.perform(get("/api/board/" + slug + "/permissions").header("Authorization", token))
        .andExpect(status().isOk()).andExpect(jsonPath("$.canEdit").value(true));
    mockMvc.perform(get("/api/users/first/main-board"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.mainBoardUrl").value(slug));
    var editorResult = mockMvc.perform(get("/api/board/" + slug + "/editor"))
        .andExpect(status().isOk()).andReturn();
    long version = objectMapper.readTree(editorResult.getResponse().getContentAsString())
        .get("board").get("version").asLong();
    String payload = "{\"version\":" + version + ",\"name\":\"Concurrent edit\",\"headline\":\"Saved once\",\"widgets\":[]}";
    var start = new java.util.concurrent.CountDownLatch(1);
    try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
      java.util.concurrent.Callable<Integer> save = () -> {
        start.await();
        return mockMvc.perform(put("/api/board/" + slug + "/editor")
            .header("Authorization", token).contentType(MediaType.APPLICATION_JSON).content(payload))
            .andReturn().getResponse().getStatus();
      };
      var first = executor.submit(save);
      var second = executor.submit(save);
      start.countDown();
      var statuses = java.util.List.of(first.get(15, java.util.concurrent.TimeUnit.SECONDS),
          second.get(15, java.util.concurrent.TimeUnit.SECONDS)).stream().sorted().toList();
      org.junit.jupiter.api.Assertions.assertEquals(java.util.List.of(200, 409), statuses);
    }
  }
}
