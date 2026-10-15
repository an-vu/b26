package com.b26.backend.widget.social;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.DriverManager;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InstagramCacheIntegrationTest {
  @Test void cachesResultsAndEnforcesSharedDailyBudget() throws Exception {
    String url = System.getenv("POSTGRES_TEST_URL"), user = System.getenv("POSTGRES_TEST_USER"), password = System.getenv("POSTGRES_TEST_PASSWORD");
    String schema = "ig_test_" + UUID.randomUUID().toString().replace("-", "");
    try (var connection = DriverManager.getConnection(url, user, password); var statement = connection.createStatement()) {
      statement.execute("CREATE SCHEMA " + schema);
      InstagramService service = null;
      try {
        var source = new DriverManagerDataSource(url, user, password);
        var properties = new Properties(); properties.setProperty("currentSchema", schema); source.setConnectionProperties(properties);
        var db = new JdbcTemplate(source);
        new org.springframework.jdbc.datasource.init.ResourceDatabasePopulator(
            new org.springframework.core.io.ClassPathResource("db/migration/V39__instagram_profile_cache.sql"))
            .execute(source);
        var provider = mock(InstagramProvider.class); when(provider.configured()).thenReturn(true);
        when(provider.fetch("instagram")).thenReturn(new InstagramProfile("ready", 99L, List.of()));
        service = new InstagramService(new InstagramCacheRepository(db, new ObjectMapper()), provider, 1);
        assertEquals("loading", service.get("instagram").status());
        InstagramProfile result = await(service, "instagram");
        assertEquals(99L, result.followersCount());
        for (int i = 0; i < 10; i++) assertEquals("ready", service.get("instagram").status());
        assertEquals("loading", service.get("another").status());
        assertEquals("unavailable", await(service, "another").status());
        verify(provider, times(1)).fetch("instagram"); verify(provider, never()).fetch("another");
        assertEquals(1, db.queryForObject("SELECT requests FROM instagram_fetch_budget", Integer.class));
      } finally { if (service != null) service.close(); statement.execute("DROP SCHEMA " + schema + " CASCADE"); }
    }
  }
  @Test void failedRefreshKeepsServingTheLastGoodProfile() throws Exception {
    String url = System.getenv("POSTGRES_TEST_URL"), user = System.getenv("POSTGRES_TEST_USER"), password = System.getenv("POSTGRES_TEST_PASSWORD");
    String schema = "ig_test_" + UUID.randomUUID().toString().replace("-", "");
    try (var connection = DriverManager.getConnection(url, user, password); var statement = connection.createStatement()) {
      statement.execute("CREATE SCHEMA " + schema);
      InstagramService service = null;
      try {
        var source = new DriverManagerDataSource(url, user, password);
        var properties = new Properties(); properties.setProperty("currentSchema", schema); source.setConnectionProperties(properties);
        var db = new JdbcTemplate(source);
        new org.springframework.jdbc.datasource.init.ResourceDatabasePopulator(
            new org.springframework.core.io.ClassPathResource("db/migration/V39__instagram_profile_cache.sql"))
            .execute(source);
        var provider = mock(InstagramProvider.class); when(provider.configured()).thenReturn(true);
        when(provider.fetch("instagram")).thenReturn(new InstagramProfile("ready", 99L, List.of()))
            .thenThrow(new IllegalStateException("Instagram provider unavailable"));
        var cache = spy(new InstagramCacheRepository(db, new ObjectMapper()));
        service = new InstagramService(cache, provider, 2);
        assertEquals("loading", service.get("instagram").status());
        assertEquals(99L, await(service, "instagram").followersCount());

        // Stale + failing provider: the good payload is served during and after the refresh.
        expire(db);
        assertEquals(99L, service.get("instagram").followersCount());
        verify(cache, timeout(2000).times(2)).save(eq("instagram"), any());
        verify(provider, times(2)).fetch("instagram");
        assertEquals(99L, service.get("instagram").followersCount());

        // Stale + exhausted daily budget: same, and the provider is not called again.
        expire(db);
        assertEquals("ready", service.get("instagram").status());
        verify(cache, timeout(2000).times(3)).save(eq("instagram"), any());
        verify(provider, times(2)).fetch("instagram");
        assertEquals(99L, service.get("instagram").followersCount());
        assertEquals(2, db.queryForObject("SELECT requests FROM instagram_fetch_budget", Integer.class));
      } finally { if (service != null) service.close(); statement.execute("DROP SCHEMA " + schema + " CASCADE"); }
    }
  }
  private void expire(JdbcTemplate db) {
    db.update("UPDATE instagram_profile_cache SET refresh_after = CURRENT_TIMESTAMP - INTERVAL '1 minute'");
  }
  private InstagramProfile await(InstagramService service, String name) throws Exception {
    for (int i = 0; i < 100; i++) { var value = service.get(name); if (!value.status().equals("loading")) return value; Thread.sleep(20); }
    fail("Refresh did not finish"); return null;
  }
}
